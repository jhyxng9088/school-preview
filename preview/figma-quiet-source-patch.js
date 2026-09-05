function replaceRequired(source, marker, replacement, label) {
  if (!source.includes(marker)) throw new Error(`Showcase preview patch marker missing: ${label}`)
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

    const showcaseHome = `      <div className="preview-showcase-home">
        <section className="preview-showcase-hero" aria-label="현재 수업">
          <CurrentClassPreview schoolState={schoolState} now={now} />
        </section>

        <PreviewHomeSignals profile={profile} presence={presence} todos={todoData.todos} onNavigate={onNavigate} />

        <div className="preview-showcase-quote" aria-label="오늘의 한마디">
          <strong>오늘도 수고했어요.</strong>
          <span>꾸준함이, 큰 변화를 만들어요.</span>
        </div>

        <section className="preview-showcase-support" aria-label="오늘의 학교 정보">
          <TodoHomePreview todos={todoData.todos} categories={todoData.categories} now={now} />
          <TimetablePreview
            schedule={timetablePreviewSchedule}
            now={now}
            configured={schoolState.configured}
            title={showTomorrowTimetable ? '내일 시간표' : '오늘 시간표'}
            futureDay={showTomorrowTimetable}
          />
          <div className="preview-showcase-mini-grid">
            <SharedAcademicPreview now={now} schoolData={schoolData} academicData={academicData} />
            <Stage3MealPreview now={now} schoolData={schoolData} />
          </div>
        </section>
      </div>`

    next = replaceRequired(next, canonicalHome, showcaseHome, 'approved showcase home composition')
    next = replaceRequired(
      next,
      '            <h1>홈</h1>',
      `            <h1>좋은 하루예요,<br />{name || '학생'}님! <span className="preview-showcase-wave" aria-hidden="true">👋</span></h1>\n            <p className="preview-showcase-greeting-note">오늘 학교 생활의 흐름을 한눈에 확인해요.</p>`,
      'showcase greeting',
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
