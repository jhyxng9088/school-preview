export const ROLE_SURFACE_PATCH_VERSION = 'role-surface-stage4-v1'
export const ROLE_SURFACE_VISUAL_REVISION = 'stage4-visual-v2'

function replaceExact(source, marker, replacement, label) {
  const text = String(source || '')
  const count = text.split(marker).length - 1
  if (count !== 1) throw new Error(`Role Surface Stage 4 patch drift (${label}): expected 1, found ${count}`)
  return text.replace(marker, replacement)
}

function patchExperienceSurface(source) {
  let next = String(source || '')
  if (next.includes('data-role-surface="status"')) return next
  next = replaceExact(
    next,
    '      className="experience-surface"\n      data-experience-primary={model.primary}',
    '      className="experience-surface"\n      data-role-surface="status"\n      data-role-surface-version="role-surface-stage4-v1"\n      data-role-visual="stage4-visual-v2"\n      data-role-station="home"\n      data-experience-primary={model.primary}',
    'home status surface',
  )
  return next
}

function patchStage3Flow(source) {
  let next = String(source || '')
  const cssImport = "import './stage4-role-surface.css'\n"
  if (!next.includes(cssImport)) {
    next = replaceExact(
      next,
      "import './stage3-home-flow.css'\n",
      "import './stage3-home-flow.css'\nimport './stage4-role-surface.css'\n",
      'shared role surface css import',
    )
  }

  if (!next.includes('data-role-surface="action"')) {
    next = replaceExact(
      next,
      '      className="stage3-action-focus"\n      data-stage3-action-tone={model.tone}',
      '      className="stage3-action-focus"\n      data-role-surface="action"\n      data-role-surface-version="role-surface-stage4-v1"\n      data-role-visual="stage4-visual-v2"\n      data-role-station="home"\n      data-stage3-action-tone={model.tone}',
      'home action surface',
    )
  }
  return next
}

function stationMasthead({ kicker, title, detail, live = false }) {
  return `      <header className="role-station-masthead" data-role-visual="stage4-visual-v2">\n        <div className="role-station-masthead-copy">\n          <p>${kicker}</p>\n          <h1>${title}</h1>\n          <span>${detail}</span>\n        </div>\n        ${live ? '<span className="role-station-live"><i aria-hidden="true" />LIVE</span>' : '<span className="role-station-index" aria-hidden="true">S-Hub</span>'}\n      </header>\n`
}

function patchMainSource(source) {
  let next = String(source || '')

  if (!next.includes('data-role-station="class"')) {
    next = replaceExact(
      next,
      '<section className="class-station-page">',
      `<section className="class-station-page role-station-page" data-role-station="class" data-role-surface-version="role-surface-stage4-v1">\n${stationMasthead({ kicker: '우리 반', title: '함께 보는 공간', detail: '시간표와 게시판을 한 흐름에서 확인해요.', live: true }).trimEnd()}`,
      'class station owner',
    )
  }

  if (!next.includes('data-role-surface="navigation" data-role-surface-version="role-surface-stage4-v1" data-role-station="class"')) {
    next = replaceExact(
      next,
      'className="class-top-segment" role="group" aria-label="우리 반 메뉴"',
      'className="class-top-segment" data-role-surface="navigation" data-role-surface-version="role-surface-stage4-v1" data-role-visual="stage4-visual-v2" data-role-station="class" role="group" aria-label="우리 반 메뉴"',
      'class navigation surface',
    )
  }

  if (!next.includes('data-role-station="schedule"')) {
    next = replaceExact(
      next,
      '<section className="station-schedule-page">',
      `<section className="station-schedule-page role-station-page" data-role-station="schedule" data-role-surface-version="role-surface-stage4-v1">\n${stationMasthead({ kicker: '일정', title: '오늘과 앞으로의 흐름', detail: '리마인더, 학사일정, 급식을 같은 자리에서 확인해요.' }).trimEnd()}`,
      'schedule station owner',
    )
  }

  if (!next.includes('data-role-surface="navigation" data-role-surface-version="role-surface-stage4-v1" data-role-station="schedule"')) {
    next = replaceExact(
      next,
      'className="class-top-segment schedule-top-segment" role="group" aria-label="일정 세부 메뉴"',
      'className="class-top-segment schedule-top-segment" data-role-surface="navigation" data-role-surface-version="role-surface-stage4-v1" data-role-visual="stage4-visual-v2" data-role-station="schedule" role="group" aria-label="일정 세부 메뉴"',
      'schedule navigation surface',
    )
  }

  return next
}

function patchStudySource(source) {
  let next = String(source || '')

  if (!next.includes('data-role-station="study"')) {
    next = replaceExact(
      next,
      '<section className="preview-study-page">',
      '<section className="preview-study-page role-station-page" data-role-station="study" data-role-surface-version="role-surface-stage4-v1" data-role-visual="stage4-visual-v2">',
      'study station owner',
    )
  }

  if (!next.includes('preview-study-header role-surface-heading')) {
    next = replaceExact(
      next,
      '<header className="page-header preview-study-header">',
      '<header className="page-header preview-study-header role-surface-heading">',
      'study role heading',
    )
  }

  if (!next.includes('data-role-surface="action" data-role-surface-version="role-surface-stage4-v1" data-role-station="study"')) {
    next = replaceExact(
      next,
      '<section className={`preview-study-card preview-study-control-card${paused ? \' is-paused\' : \'\'}`}>',
      '<section className={`preview-study-card preview-study-control-card${paused ? \' is-paused\' : \'\'}`} data-role-surface="action" data-role-surface-version="role-surface-stage4-v1" data-role-station="study">',
      'study action surface',
    )
  }

  if (!next.includes('data-role-surface="collection"')) {
    next = replaceExact(
      next,
      '<section className="preview-study-section">',
      '<section className="preview-study-section" data-role-surface="collection" data-role-surface-version="role-surface-stage4-v1" data-role-station="study">',
      'study live collection surface',
    )
    next = replaceExact(
      next,
      '<section className="preview-study-section preview-study-ranking-section">',
      '<section className="preview-study-section preview-study-ranking-section" data-role-surface="collection" data-role-surface-version="role-surface-stage4-v1" data-role-station="study">',
      'study ranking collection surface',
    )
  }

  return next
}

function patchAISource(source) {
  let next = String(source || '')

  if (!next.includes('s-hub-ai-page role-station-page')) {
    next = replaceExact(
      next,
      '<section className="s-hub-ai-page" aria-label="S-Hub AI">',
      '<section className="s-hub-ai-page role-station-page" data-role-station="ai" data-role-surface-version="role-surface-stage4-v1" data-role-visual="stage4-visual-v2" aria-label="S-Hub AI">',
      'AI page workspace owner',
    )
  }

  if (!next.includes('data-role-surface="workspace"')) {
    next = replaceExact(
      next,
      "<header className={'s-hub-ai-page-hero ' + (working ? 'is-working' : 'is-idle')}>",
      "<header className={'s-hub-ai-page-hero role-surface-heading ' + (working ? 'is-working' : 'is-idle')} data-role-surface=\"workspace\" data-role-surface-version=\"role-surface-stage4-v1\" data-role-station=\"ai\">",
      'AI transformed workspace owner',
    )
  }

  return next
}

export function patchStage4RoleSurfaceSource(source, id = '') {
  const cleanId = String(id || '').split('?')[0]
  if (cleanId.endsWith('/experience-surface.jsx')) return patchExperienceSurface(source)
  if (cleanId.endsWith('/stage3-home-flow.jsx')) return patchStage3Flow(source)
  if (cleanId.endsWith('/main.jsx')) return patchMainSource(source)
  if (cleanId.endsWith('/preview-study.jsx')) return patchStudySource(source)
  if (cleanId.endsWith('/s-hub-ai-sheet.jsx')) return patchAISource(source)
  return String(source || '')
}
