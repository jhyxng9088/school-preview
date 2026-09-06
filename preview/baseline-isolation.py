from pathlib import Path
import sys

if len(sys.argv) != 3:
    raise SystemExit('usage: baseline-isolation.py <production-source> <main-sha>')

root = Path(sys.argv[1])
baseline = str(sys.argv[2]).strip()
if not baseline:
    raise SystemExit('missing production main baseline sha')

# This file must never redesign the app. It only makes the current production
# source safe to host under /school-preview/ without sharing browser/Firebase
# namespaces with production.

vite = root / 'vite.config.js'
text = vite.read_text()
base_marker = "base: '/school/',"
if text.count(base_marker) != 1:
    raise SystemExit('Vite production base marker changed')
vite.write_text(text.replace(base_marker, "base: '/school-preview/',", 1))

# Separate local browser namespaces and Firebase app identity while preserving
# all current production UI/UX source exactly as cloned.
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
    raise SystemExit('Firebase preview isolation markers changed')
sync.write_text(text.replace(identity, preview_identity, 1).replace(class_key, preview_class_key, 1))

sw = root / 'public/sw.js'
text = sw.read_text()
cache_line = next((line for line in text.splitlines() if line.startswith("const CACHE_NAME = 'school-shell-")), None)
profile_line = "const NOTIFICATION_PROFILE_CACHE = 'school-notification-profile-v1'"
cleanup = ".filter((key) => ![CACHE_NAME, NOTIFICATION_PROFILE_CACHE].includes(key))"
if not cache_line or profile_line not in text or cleanup not in text:
    raise SystemExit('Service worker preview isolation markers changed')
text = text.replace(cache_line, "const CACHE_NAME = 'school-preview-shell-production-mirror-v1'", 1)
text = text.replace(profile_line, "const NOTIFICATION_PROFILE_CACHE = 'school-preview-notification-profile-production-mirror-v1'", 1)
text = text.replace(
    cleanup,
    ".filter((key) => key.startsWith('school-preview-') && ![CACHE_NAME, NOTIFICATION_PROFILE_CACHE].includes(key))",
    1,
)
sw.write_text(text)

index = root / 'index.html'
text = index.read_text()
if text.count('</head>') != 1:
    raise SystemExit('index head marker changed')
inject = (
    f'<meta name="s-hub-preview-baseline" content="{baseline}" />'
    '<meta name="s-hub-preview-layer" content="production-main-mirror-v1" />'
)
index.write_text(text.replace('</head>', inject + '</head>', 1))
