function replaceExact(source, marker, replacement, label) {
  const text = String(source || '')
  const count = text.split(marker).length - 1
  if (count !== 1) throw new Error(`Live Home Stage 3 patch drift (${label}): expected 1, found ${count}`)
  return text.replace(marker, replacement)
}

function patchMainSource(source) {
  let next = String(source || '')
  const importMarker = "import { ExperienceSurface } from './experience-surface.jsx'\n"
  const stage3Import = "import { Stage3ActionFocus, Stage3ContextRail, Stage3HomeFrame, Stage3ZoneHeading } from './stage3-home-flow.jsx'\n"
  if (!next.includes(stage3Import)) {
    next = replaceExact(next, importMarker, `${importMarker}${stage3Import}`, 'Stage 3 home import')
  }

  const timetableEmpty = "{futureDay ? '내일은 정규 수업이 없어.' : '오늘은 정규 수업이 없어.'}"
  const timetableEmptyPolite = "{futureDay ? '내일은 정규 수업이 없어요.' : '오늘은 정규 수업이 없어요.'}"
  if (next.includes(timetableEmpty)) {
    next = replaceExact(next, timetableEmpty, timetableEmptyPolite, 'polite timetable empty copy')
  }

  const currentStack = `      <div ref={homeStackRef} className={\`home-stack \${mealPriority ? 'is-meal-priority' : ''}\`} data-home-lunch-ready="true">
        <ExperienceSurface />
        <PreviewHomeSignals profile={profile} presence={presence} todos={todoData.todos} onNavigate={onNavigate} />
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

  const stage3Stack = `      <Stage3HomeFrame homeStackRef={homeStackRef} mealPriority={mealPriority}>
        <section className="stage3-home-zone stage3-home-hero" aria-label="현재 학교생활">
          <ExperienceSurface />
          <Stage3ContextRail todos={todoData.todos} />
        </section>

        <section className="stage3-home-zone stage3-home-today" aria-labelledby="stage3-today-title">
          <Stage3ZoneHeading zone="timetable" id="stage3-today-title" />
          <TimetablePreview
            schedule={timetablePreviewSchedule}
            now={now}
            configured={schoolState.configured}
            title={showTomorrowTimetable ? '내일 시간표' : '오늘 시간표'}
            futureDay={showTomorrowTimetable}
          />
        </section>

        <section className="stage3-home-zone stage3-home-focus" aria-labelledby="stage3-focus-title">
          <Stage3ZoneHeading zone="focus" id="stage3-focus-title" />
          <Stage3ActionFocus todos={todoData.todos} onNavigate={onNavigate} />
        </section>

        <section className="stage3-home-zone stage3-home-reminders" aria-labelledby="stage3-reminder-title">
          <Stage3ZoneHeading zone="reminders" id="stage3-reminder-title" />
          <TodoHomePreview todos={todoData.todos} categories={todoData.categories} now={now} />
        </section>

        <section className="stage3-home-zone stage3-home-class" aria-label="지금 우리반">
          <PreviewHomeSignals profile={profile} presence={presence} todos={todoData.todos} onNavigate={onNavigate} />
        </section>

        <section className="stage3-home-zone stage3-home-upcoming" aria-labelledby="stage3-upcoming-title">
          <Stage3ZoneHeading zone="upcoming" id="stage3-upcoming-title" />
          <div className="stage3-upcoming-grid">
            <SharedAcademicPreview now={now} schoolData={schoolData} academicData={academicData} />
            <Stage3MealPreview now={now} schoolData={schoolData} />
          </div>
        </section>
      </Stage3HomeFrame>`

  return replaceExact(next, currentStack, stage3Stack, 'adaptive home information hierarchy')
}

function patchHomeSignalsSource(source) {
  let next = String(source || '')
  const reminderSignal = `    {
      id: 'reminder',
      label: '리마인더',
      value: \`\${reminderCount}개\`,
      detail: reminderCount > 0 ? '아직 남아 있어요' : '남은 리마인더 없음',
      active: reminderCount > 0,
    },
`
  next = replaceExact(next, reminderSignal, '', 'remove duplicate reminder signal')
  next = replaceExact(next, 'aria-label="S-Hub 한눈에 보기"', 'aria-label="지금 우리반"', 'class live region label')
  next = replaceExact(
    next,
    '        <h2>한눈에 보기</h2>\n        <span>실시간</span>',
    '        <h2>지금 우리반</h2>\n        <span>실시간</span>',
    'class live region heading',
  )
  return next
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
  if (cleanId.endsWith('/preview-home-signals.jsx')) return patchHomeSignalsSource(source)
  if (cleanId.endsWith('/todo.jsx')) return patchTodoSource(source)
  return String(source || '')
}
