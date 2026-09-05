function replaceRequired(source, marker, replacement, label) {
  if (!source.includes(marker)) throw new Error(`IA preview marker missing: ${label}`)
  return source.replace(marker, replacement)
}

function spliceInclusiveRequired(source, startMarker, endMarker, replacement, label) {
  const start = source.indexOf(startMarker)
  const end = source.indexOf(endMarker, start + startMarker.length)
  if (start < 0 || end < 0) throw new Error(`IA preview range missing: ${label}`)
  return `${source.slice(0, start)}${replacement}${source.slice(end + endMarker.length)}`
}

function patchMainSource(source) {
  let next = String(source || '')

  next = replaceRequired(
    next,
    '            <h1>홈</h1>',
    `            <h1><span>{name}</span>님의 오늘</h1>\n            <p className="ia-home-subtitle">지금 필요한 것부터, 나머지는 가볍게 확인해요.</p>`,
    'home heading',
  )

  next = spliceInclusiveRequired(
    next,
    '        <CurrentClassPreview schoolState={schoolState} now={now} />',
    '        <Stage3MealPreview now={now} schoolData={schoolData} />',
    `        <section className="ia-home-primary" aria-label="오늘 핵심">\n          <CurrentClassPreview schoolState={schoolState} now={now} />\n          <div className="ia-home-today-flow">\n            <TodoHomePreview todos={todoData.todos} categories={todoData.categories} now={now} />\n            <TimetablePreview\n              schedule={timetablePreviewSchedule}\n              now={now}\n              configured={schoolState.configured}\n              title={showTomorrowTimetable ? '내일 시간표' : '오늘 시간표'}\n              futureDay={showTomorrowTimetable}\n            />\n          </div>\n        </section>\n        <section className="ia-home-overview" aria-label="한눈에 보기">\n          <PreviewHomeSignals profile={profile} presence={presence} todos={todoData.todos} onNavigate={onNavigate} />\n        </section>\n        <section className="ia-home-coming" aria-label="곧 다가오는 정보">\n          <SharedAcademicPreview now={now} schoolData={schoolData} academicData={academicData} />\n          <Stage3MealPreview now={now} schoolData={schoolData} />\n        </section>`,
    'home information architecture',
  )

  next = replaceRequired(
    next,
    `function ClassStationPage({ section, onSectionChange, timetablePage, boardPage, hasBoardUnread = false }) {\n  return (\n    <section className="class-station-page">\n      <ClassTopSegment section={section} onSectionChange={onSectionChange} hasBoardUnread={hasBoardUnread} />\n      <div className="class-station-content">\n        <div\n          key={section}\n          className={'class-station-panel ' + (section === 'board' ? 'is-board' : 'is-timetable')}\n        >\n          {section === 'board' ? boardPage : timetablePage}\n        </div>\n      </div>\n    </section>\n  )\n}`,
    `function ClassStationPage({ section, onSectionChange, timetablePage, boardPage, hasBoardUnread = false, profile, presence }) {\n  const onlineLabel = presence?.total > 0\n    ? presence.online + '/' + presence.total\n    : presence?.online > 0 ? presence.online + '명' : '—'\n  return (\n    <section className="class-station-page ia-class-hub">\n      <header className="ia-station-header ia-class-header">\n        <div>\n          <p className="eyebrow">우리반</p>\n          <h1>{profile?.classNumber ? profile.classNumber + '반' : '우리반'}</h1>\n          <p>시간표와 게시판을 한 공간에서 이어서 확인해요.</p>\n        </div>\n        <div className="ia-class-presence" aria-label={'현재 접속 ' + onlineLabel}>\n          <strong>{onlineLabel}</strong>\n          <span>접속 중</span>\n        </div>\n      </header>\n      <div className="ia-class-overview" aria-label="우리반 빠른 상태">\n        <span><b>{section === 'board' ? '게시판' : '시간표'}</b><small>현재 보고 있는 화면</small></span>\n        <span><b>실시간</b><small>반 정보 동기화</small></span>\n      </div>\n      <ClassTopSegment section={section} onSectionChange={onSectionChange} hasBoardUnread={hasBoardUnread} />\n      <div className="class-station-content ia-class-content" data-section={section}>\n        <div\n          key={section}\n          className={'class-station-panel ' + (section === 'board' ? 'is-board' : 'is-timetable')}\n        >\n          {section === 'board' ? boardPage : timetablePage}\n        </div>\n      </div>\n    </section>\n  )\n}`,
    'class hub composition',
  )

  next = replaceRequired(
    next,
    `      <ClassStationPage\n        section={classSection}`,
    `      <ClassStationPage\n        profile={profile}\n        presence={presence}\n        section={classSection}`,
    'class hub data wiring',
  )

  next = replaceRequired(
    next,
    `function ScheduleStationPage({ section, onSectionChange, todoPage, academicPage, mealPage }) {\n  return (\n    <section className="station-schedule-page">\n      <ScheduleTopSegment section={section} onSectionChange={onSectionChange} />\n      <div className="station-schedule-content">\n        {section === 'academic' ? academicPage : section === 'meal' ? mealPage : todoPage}\n      </div>\n    </section>\n  )\n}`,
    `function ScheduleStationPage({ section, onSectionChange, todoPage, academicPage, mealPage }) {\n  const sectionLabel = section === 'academic' ? '학사일정' : section === 'meal' ? '급식' : '리마인더'\n  return (\n    <section className="station-schedule-page ia-schedule-hub">\n      <header className="ia-station-header ia-schedule-header">\n        <div>\n          <p className="eyebrow">일정</p>\n          <h1>이번 주</h1>\n          <p>종류보다 시간의 흐름을 먼저 보고, 필요한 정보만 골라봐요.</p>\n        </div>\n        <span className="ia-schedule-current">{sectionLabel}</span>\n      </header>\n      <div className="ia-schedule-filter">\n        <ScheduleTopSegment section={section} onSectionChange={onSectionChange} />\n      </div>\n      <div className="station-schedule-content ia-schedule-content" data-section={section}>\n        {section === 'academic' ? academicPage : section === 'meal' ? mealPage : todoPage}\n      </div>\n    </section>\n  )\n}`,
    'schedule flow composition',
  )

  return next
}

function patchAIPageSource(source) {
  let next = String(source || '')
  next = replaceRequired(
    next,
    '<section className="s-hub-ai-page" aria-label="S-Hub AI">',
    '<section className="s-hub-ai-page ia-ai-workspace" aria-label="S-Hub AI">',
    'AI workspace class',
  )

  const capabilities = `        {!working && state.mode === 'compose' ? (\n          <div className="s-hub-ai-page-capabilities" aria-label="S-Hub AI 기능">`
  const contentMarker = `        {content}`
  const start = next.indexOf(capabilities)
  const contentIndex = next.indexOf(contentMarker, start)
  if (start < 0 || contentIndex < 0) throw new Error('IA preview range missing: AI input-first composition')
  const block = next.slice(start, contentIndex)
  next = `${next.slice(0, start)}        {content}\n\n${block}${next.slice(contentIndex + contentMarker.length)}`
  return next
}

function patchStudySource(source) {
  let next = String(source || '')
  next = replaceRequired(
    next,
    '<section className="preview-study-page">',
    '<section className="preview-study-page ia-study-page">',
    'study workspace class',
  )
  next = replaceRequired(
    next,
    '<div className="preview-study-stack">',
    '<div className="preview-study-stack ia-study-workspace">',
    'study workspace grid',
  )
  return next
}

export function patchIARedesignSource(source, id = '') {
  const cleanId = String(id || '').split('?')[0]
  if (cleanId.endsWith('/main.jsx')) return patchMainSource(source)
  if (cleanId.endsWith('/s-hub-ai-sheet.jsx')) return patchAIPageSource(source)
  if (cleanId.endsWith('/preview-study.jsx')) return patchStudySource(source)
  return String(source || '')
}
