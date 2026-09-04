function replaceRequired(source, marker, replacement, label) {
  if (!source.includes(marker)) throw new Error(`Quiet spatial preview patch marker missing: ${label}`)
  return source.replace(marker, replacement)
}

export function patchQuietSpatialPreviewSource(source, id) {
  const cleanId = String(id || '').split('?')[0]
  let next = String(source || '')

  if (cleanId.endsWith('/main.jsx')) {
    const canonicalHome = `      <div className="home-stack">
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

    const quietHome = `      <div className="preview-spatial-home">
        <section className="preview-spatial-focus" aria-label="지금 수업과 시간표">
          <CurrentClassPreview schoolState={schoolState} now={now} />
          <TimetablePreview
            schedule={timetablePreviewSchedule}
            now={now}
            configured={schoolState.configured}
            title={showTomorrowTimetable ? '내일 시간표' : '오늘 시간표'}
            futureDay={showTomorrowTimetable}
          />
        </section>
        <PreviewHomeSignals profile={profile} presence={presence} todos={todoData.todos} onNavigate={onNavigate} />
        <section className="preview-spatial-brief" aria-label="오늘의 요약">
          <TodoHomePreview todos={todoData.todos} categories={todoData.categories} now={now} />
          <div className="preview-spatial-secondary">
            <SharedAcademicPreview now={now} schoolData={schoolData} academicData={academicData} />
            <Stage3MealPreview now={now} schoolData={schoolData} />
          </div>
        </section>
      </div>`

    next = replaceRequired(next, canonicalHome, quietHome, 'final home composition')
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
