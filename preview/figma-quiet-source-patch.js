function replaceRequired(source, marker, replacement, label) {
  if (!source.includes(marker)) throw new Error(`Figma quiet preview patch marker missing: ${label}`)
  return source.replace(marker, replacement)
}

export function patchFigmaQuietPreviewSource(source, id) {
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

    const figmaHome = `      <div className="preview-spatial-home preview-figma-home">
        <section className="preview-spatial-focus preview-figma-focus" aria-label="지금 수업과 시간표">
          <CurrentClassPreview schoolState={schoolState} now={now} />
          <TimetablePreview
            schedule={timetablePreviewSchedule}
            now={now}
            configured={schoolState.configured}
            title={showTomorrowTimetable ? '내일 시간표' : '오늘 시간표'}
            futureDay={showTomorrowTimetable}
          />
        </section>
        <section className="preview-spatial-brief preview-figma-tasks" aria-label="지금 할 것">
          <TodoHomePreview todos={todoData.todos} categories={todoData.categories} now={now} />
        </section>
        <section className="preview-figma-glance" aria-label="한눈에 보기">
          <div className="preview-spatial-secondary preview-figma-secondary">
            <SharedAcademicPreview now={now} schoolData={schoolData} academicData={academicData} />
            <Stage3MealPreview now={now} schoolData={schoolData} />
          </div>
          <PreviewHomeSignals profile={profile} presence={presence} todos={todoData.todos} onNavigate={onNavigate} />
        </section>
      </div>`

    next = replaceRequired(next, canonicalHome, figmaHome, 'final home composition')
    next = replaceRequired(
      next,
      '            <h1>홈</h1>',
      `            <h1>{now.getHours() < 11 ? '좋은 아침이에요' : now.getHours() < 18 ? '좋은 오후예요' : '좋은 저녁이에요'}</h1>\n            <p className="preview-figma-greeting-note">오늘 필요한 것만 빠르게 확인해요.</p>`,
      'home greeting',
    )
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
