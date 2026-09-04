from pathlib import Path
import sys

if len(sys.argv) != 3:
    raise SystemExit('usage: patch.py <production-source> <main-sha>')

root = Path(sys.argv[1])
baseline = sys.argv[2]

# 1) Preview-only home composition: group today's school flow into one hero surface,
# then keep reminders + lighter school info in a quieter secondary column.
main = root / 'src/main.jsx'
text = main.read_text()
old = '''      <div className="home-stack">
        <CurrentClassPreview schoolState={schoolState} now={now} />
        <TodoHomePreview todos={todoData.todos} categories={todoData.categories} now={now} />
        <TimetablePreview
          schedule={timetablePreviewSchedule}
          now={now}
          configured={schoolState.configured}
          title={showTomorrowTimetable ? '내일 시간표' : '오늘 시간표'}
          futureDay={showTomorrowTimetable}
        />
        <SharedAcademicPreview now={now} schoolData={schoolData} academicData={academicData} />
        <Stage3MealPreview now={now} schoolData={schoolData} />
      </div>'''
new = '''      <div className="preview-dashboard">
        <section className="preview-dashboard-school" aria-label="오늘 수업">
          <CurrentClassPreview schoolState={schoolState} now={now} />
          <TimetablePreview
            schedule={timetablePreviewSchedule}
            now={now}
            configured={schoolState.configured}
            title={showTomorrowTimetable ? '내일 시간표' : '오늘 시간표'}
            futureDay={showTomorrowTimetable}
          />
        </section>
        <section className="preview-dashboard-rest" aria-label="오늘 할 일과 학교 정보">
          <TodoHomePreview todos={todoData.todos} categories={todoData.categories} now={now} />
          <div className="preview-dashboard-mini">
            <SharedAcademicPreview now={now} schoolData={schoolData} academicData={academicData} />
            <Stage3MealPreview now={now} schoolData={schoolData} />
          </div>
        </section>
      </div>'''
if text.count(old) != 1:
    raise SystemExit('Home composition marker changed')
main.write_text(text.replace(old, new, 1))

# 2) Reduce home-only preview density. Full reminder / academic pages remain unchanged.
todo = root / 'src/todo.jsx'
text = todo.read_text()
marker = '  const visible = upcoming.slice(0, 3)'
if text.count(marker) != 1:
    raise SystemExit('Todo home preview marker changed')
todo.write_text(text.replace(marker, '  const visible = upcoming.slice(0, 2)', 1))

academic = root / 'src/academic-shared.jsx'
text = academic.read_text()
marker = '  const others = upcoming.filter((group) => group !== exam).slice(0, exam ? 2 : 3)'
if text.count(marker) != 1:
    raise SystemExit('Academic home preview marker changed')
academic.write_text(text.replace(marker, '  const others = upcoming.filter((group) => group !== exam).slice(0, exam ? 1 : 2)', 1))

# 3) Preview runtime isolation. Never let preview identities, local keys or SW cleanup
# collide with production.
for folder in (root / 'src', root / 'public'):
    for path in folder.rglob('*'):
        if path.is_file() and path.suffix in {'.js', '.jsx', '.mjs'}:
            source = path.read_text()
            source = source.replace("'school.", "'school.preview.").replace('"school.', '"school.preview.')
            source = source.replace("'school-sync'", "'school-sync-preview'").replace('"school-sync"', '"school-sync-preview"')
            path.write_text(source)

sync = root / 'src/school-sync.js'
text = sync.read_text()
identity = "return `${normalized.classNumber}|${normalized.studentNumber}|${compactName}`"
preview_identity = "return `preview|${normalized.classNumber}|${normalized.studentNumber}|${compactName}`"
class_key = "return normalized ? `class-${normalized.classNumber}` : ''"
preview_class_key = "return normalized ? `preview-class-${normalized.classNumber}` : ''"
if text.count(identity) != 1 or text.count(class_key) != 1:
    raise SystemExit('Firebase isolation markers changed')
sync.write_text(text.replace(identity, preview_identity, 1).replace(class_key, preview_class_key, 1))

sw = root / 'public/sw.js'
text = sw.read_text()
cache_line = next((line for line in text.splitlines() if line.startswith("const CACHE_NAME = 'school-shell-")), None)
tone_line = "const NOTIFICATION_PROFILE_CACHE = 'school-notification-profile-v1'"
cleanup = ".filter((key) => ![CACHE_NAME, NOTIFICATION_PROFILE_CACHE].includes(key))"
if not cache_line or tone_line not in text or cleanup not in text:
    raise SystemExit('Service worker markers changed')
text = text.replace(cache_line, "const CACHE_NAME = 'school-preview-shell-radical-v2'", 1)
text = text.replace(tone_line, "const NOTIFICATION_PROFILE_CACHE = 'school-preview-notification-profile-radical-v2'", 1)
text = text.replace(cleanup, ".filter((key) => key.startsWith('school-preview-') && ![CACHE_NAME, NOTIFICATION_PROFILE_CACHE].includes(key))", 1)
app_shell = "const APP_SHELL = ["
if text.count(app_shell) != 1:
    raise SystemExit('App shell marker changed')
text = text.replace(app_shell, "const APP_SHELL = ['./preview-dark-ui.css', ", 1)
sw.write_text(text)

# 4) GitHub Pages path + preview marker/style injection.
vite = root / 'vite.config.js'
text = vite.read_text()
base_marker = "base: '/school/',"
if text.count(base_marker) != 1:
    raise SystemExit('Vite base marker changed')
vite.write_text(text.replace(base_marker, "base: '/school-preview/',", 1))

index = root / 'index.html'
text = index.read_text()
if text.count('</head>') != 1:
    raise SystemExit('index head marker changed')
inject = (
    f'<meta name="s-hub-preview-baseline" content="{baseline}" />'
    '<meta name="s-hub-preview-layer" content="radical-dashboard-v2" />'
    '<link rel="stylesheet" href="./preview-dark-ui.css?v=12" />'
)
index.write_text(text.replace('</head>', inject + '</head>', 1))
