// Preview guard compatibility: Stage3HomeFrame homeStackRef is retired; the current frame is source-owned without an extra DOM ref.
function replaceExact(source, marker, replacement, label) {
  const text = String(source || '')
  const count = text.split(marker).length - 1
  if (count !== 1) throw new Error(`Live Home Stage 3 patch drift (${label}): expected 1, found ${count}`)
  return text.replace(marker, replacement)
}

function patchMainSource(source) {
  let next = String(source || '')
  const importMarker = "import { ExperienceSurface } from './experience-surface.jsx'\n"
  const stage3Import = "import { Stage3ActionFocus, Stage3ClassPulse, Stage3HomeFrame, Stage3ZoneHeading } from './stage3-home-flow.jsx'\n"
  if (!next.includes(stage3Import)) {
    next = replaceExact(next, importMarker, `${importMarker}${stage3Import}`, 'Stage 3 home import')
  }

  const timetableEmpty = "{futureDay ? '내일은 정규 수업이 없어.' : '오늘은 정규 수업이 없어.'}"
  const timetableEmptyPolite = "{futureDay ? '내일은 정규 수업이 없어요.' : '오늘은 정규 수업이 없어요.'}"
  if (next.includes(timetableEmpty)) {
    next = replaceExact(next, timetableEmpty, timetableEmptyPolite, 'polite timetable empty copy')
  }

  const titleMarker = `          <div className="home-title-row">
            <h1>홈</h1>`
  const titleReplacement = `          <div className="home-title-row stage3-home-title-row">
            <div>
              <h1>S-Hub</h1>
              <p className="stage3-home-greeting">오늘도, 좋은 하루가 될 거예요.</p>
            </div>`
  next = replaceExact(next, titleMarker, titleReplacement, 'home title identity')

  const periodCopy = `              <span>{period.number}</span>
              <strong>{period.subject.trim() || '—'}</strong>`
  const periodFlowCopy = `              <span>{visualState === 'current' ? '지금' : isNext ? '다음' : \`${'${period.number}'}교시\`}</span>
              <strong>{period.subject.trim() || '—'}</strong>
              <em>{visualState === 'current' ? \`${'${period.end}'} 종료\` : isNext ? \`${'${period.start}'} 시작\` : period.start}</em>`
  next = replaceExact(next, periodCopy, periodFlowCopy, 'timeline period copy')

  const currentStack = `      <div className="home-stack">
        <ExperienceSurface />
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
      </div>`

  const stage3Stack = `      <Stage3HomeFrame>
        <section className="stage3-home-zone stage3-home-hero" aria-label="현재 학교생활">
          <ExperienceSurface />
        </section>

        <section className="stage3-home-zone stage3-home-today" aria-labelledby="stage3-today-title">
          <Stage3ZoneHeading
            zone="timetable"
            id="stage3-today-title"
            actionLabel="전체 시간표 보기"
            onAction={() => onNavigate?.('timetable')}
          />
          <TimetablePreview
            schedule={timetablePreviewSchedule}
            now={now}
            configured={schoolState.configured}
            title={showTomorrowTimetable ? '내일 시간표' : '오늘 시간표'}
            futureDay={showTomorrowTimetable}
          />
        </section>

        <section className="stage3-home-zone stage3-home-focus" aria-labelledby="stage3-focus-title">
          <Stage3ZoneHeading
            zone="focus"
            id="stage3-focus-title"
            actionLabel="할 일 더 보기"
            onAction={() => onNavigate?.('todo')}
          />
          <Stage3ActionFocus todos={todoData.todos} onNavigate={onNavigate} />
        </section>

        <section className="stage3-home-zone stage3-home-reminders" aria-labelledby="stage3-reminder-title">
          <Stage3ZoneHeading
            zone="reminders"
            id="stage3-reminder-title"
            actionLabel="리마인더 더 보기"
            onAction={() => onNavigate?.('todo')}
          />
          <TodoHomePreview todos={todoData.todos} categories={todoData.categories} now={now} />
        </section>

        <section className="stage3-home-zone stage3-home-class" aria-label="지금 우리반">
          <Stage3ClassPulse presence={presence} />
        </section>

        <section className="stage3-home-zone stage3-home-upcoming" aria-labelledby="stage3-upcoming-title">
          <Stage3ZoneHeading
            zone="upcoming"
            id="stage3-upcoming-title"
            actionLabel="학사일정 보기"
            onAction={() => onNavigate?.('academic')}
          />
          <div className="stage3-upcoming-grid">
            <SharedAcademicPreview now={now} schoolData={schoolData} academicData={academicData} />
            <Stage3MealPreview now={now} schoolData={schoolData} />
          </div>
        </section>
      </Stage3HomeFrame>`

  return replaceExact(next, currentStack, stage3Stack, 'adaptive home information hierarchy')
}

function patchTodoSource(source) {
  const next = String(source || '')
  return replaceExact(
    next,
    '<div className="compact-empty">아직 등록된 리마인더가 없어.</div>',
    '<div className="compact-empty">아직 등록된 리마인더가 없어요.</div>',
    'polite reminder empty copy',
  )
}

export function patchStage3HomeSource(source, id = '') {
  const cleanId = String(id || '').split('?')[0]
  if (cleanId.endsWith('/main.jsx')) return patchMainSource(source)
  if (cleanId.endsWith('/todo.jsx')) return patchTodoSource(source)
  return String(source || '')
}
