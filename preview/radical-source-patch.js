function replaceRequired(source, marker, replacement, label) {
  if (!source.includes(marker)) throw new Error(`Radical preview patch marker missing: ${label}`)
  return source.replace(marker, replacement)
}

export function patchRadicalPreviewSource(source, id) {
  const cleanId = String(id || '').split('?')[0]
  let next = String(source || '')

  if (cleanId.endsWith('/main.jsx')) {
    const oldHome = `      <div className="home-stack">
        <CurrentClassPreview schoolState={schoolState} now={now} />
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

    const radicalHome = `      <div className="preview-dashboard">
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
          <PreviewHomeSignals profile={profile} presence={presence} todos={todoData.todos} onNavigate={onNavigate} />
        </section>
      </div>`

    next = replaceRequired(next, oldHome, radicalHome, 'final home composition')
  }

  if (cleanId.endsWith('/todo.jsx')) {
    next = replaceRequired(next, '  const visible = upcoming.slice(0, 3)', '  const visible = upcoming.slice(0, 2)', 'home reminder density')
  }

  if (cleanId.endsWith('/academic-shared.jsx')) {
    next = replaceRequired(
      next,
      '  const others = upcoming.filter((group) => group !== exam).slice(0, exam ? 2 : 3)',
      '  const others = upcoming.filter((group) => group !== exam).slice(0, exam ? 1 : 2)',
      'home academic density',
    )
  }

  return next
}
