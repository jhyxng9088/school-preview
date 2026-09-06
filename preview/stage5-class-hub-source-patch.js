export const LIVE_CLASS_HUB_PATCH_VERSION = 'live-class-hub-stage5-v1'

function replaceExact(source, marker, replacement, label) {
  const text = String(source || '')
  const count = text.split(marker).length - 1
  if (count !== 1) throw new Error(`Live Class Hub Stage 5 patch drift (${label}): expected 1, found ${count}`)
  return text.replace(marker, replacement)
}

function patchMainSource(source) {
  let next = String(source || '')

  const importMarker = "import { SHubIcon } from './s-hub-icon.jsx'\n"
  const stage5Import = "import { Stage5LiveClassHub } from './stage5-class-hub.jsx'\n"
  if (!next.includes(stage5Import)) {
    next = replaceExact(next, importMarker, `${importMarker}${stage5Import}`, 'Stage 5 class hub import')
  }

  if (!next.includes('data-stage5-class-hub="live-class-hub-stage5-v1"')) {
    next = replaceExact(
      next,
      '<section className="class-station-page role-station-page" data-role-station="class" data-role-surface-version="role-surface-stage4-v1">',
      '<section className="class-station-page role-station-page" data-role-station="class" data-role-surface-version="role-surface-stage4-v1" data-stage5-class-hub="live-class-hub-stage5-v1">',
      'class station Stage 5 marker',
    )
  }

  next = replaceExact(
    next,
    'function ClassStationPage({ section, onSectionChange, timetablePage, boardPage }) {',
    'function ClassStationPage({ section, onSectionChange, timetablePage, boardPage, profile, presence }) {',
    'class station live props',
  )

  const stage4Masthead = `      <header className="role-station-masthead" data-role-visual="stage4-visual-v2">
        <div className="role-station-masthead-copy">
          <p>우리 반</p>
          <h1>함께 보는 공간</h1>
          <span>시간표와 게시판을 한 흐름에서 확인해요.</span>
        </div>
        <span className="role-station-live"><i aria-hidden="true" />LIVE</span>
      </header>`

  next = replaceExact(
    next,
    stage4Masthead,
    '      <Stage5LiveClassHub profile={profile} presence={presence} />',
    'replace static class masthead with live hub',
  )

  const classCallMarker = `      <ClassStationPage
        section={classSection}
        onSectionChange={setClassSection}
        boardPage={<PreviewBoardPage />}`
  const classCallReplacement = `      <ClassStationPage
        section={classSection}
        onSectionChange={setClassSection}
        profile={profile}
        presence={presence}
        boardPage={<PreviewBoardPage />}`
  next = replaceExact(next, classCallMarker, classCallReplacement, 'class hub data wiring')

  return next
}

export function patchStage5ClassHubSource(source, id = '') {
  const cleanId = String(id || '').split('?')[0]
  if (cleanId.endsWith('/main.jsx')) return patchMainSource(source)
  return String(source || '')
}
