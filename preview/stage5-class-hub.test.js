import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { buildLiveClassHubModel, LIVE_CLASS_HUB_VERSION } from '../src/stage5-class-hub-model.js'
import { patchStage5ClassHubSource } from '../src/stage5-class-hub-source-patch.js'

function state({ primary = 'normal', school = {}, study = {}, urgent = null } = {}) {
  return {
    primary,
    context: {
      school: { kind: 'normal', current: null, next: null, last: null, ...school },
      study: { active: false, subject: '', ...study },
      reminders: { nearestUrgent: urgent },
    },
  }
}

test('Stage 5 class hub turns current class state into the primary room context', () => {
  const model = buildLiveClassHubModel({
    state: state({
      primary: 'class-active',
      school: {
        kind: 'class',
        current: { number: 2, subject: '수학', start: '10:10', end: '11:00' },
        next: { number: 3, subject: '영어', start: '11:10', end: '12:00' },
      },
    }),
    profile: { classNumber: 11 },
    presence: { online: 5, total: 29 },
    boardUnread: { sectionUnreadCount: 2 },
  })

  assert.equal(model.version, LIVE_CLASS_HUB_VERSION)
  assert.equal(model.classLabel, '11반')
  assert.equal(model.tone, 'class')
  assert.equal(model.title, '수학')
  assert.equal(model.signals[0].value, '영어')
  assert.equal(model.signals[1].value, '5/29명')
  assert.equal(model.signals[2].value, '새 소식 2개')
})

test('Stage 5 class hub stays useful after school without pretending a class is active', () => {
  const model = buildLiveClassHubModel({
    state: state({
      primary: 'after-school',
      school: { kind: 'done', last: { number: 7, subject: '체육' } },
    }),
    presence: { online: 0, total: 28 },
    boardUnread: { sectionUnreadCount: 0 },
  })

  assert.equal(model.tone, 'after')
  assert.equal(model.title, '오늘 수업이 끝났어요.')
  assert.equal(model.signals[0].value, '정규 수업 종료')
  assert.equal(model.signals[1].detail, '현재 접속한 학생이 없어요.')
  assert.equal(model.signals[2].detail, '모두 확인했어요.')
})

test('Stage 5 class hub uses polite rest-day copy', () => {
  const model = buildLiveClassHubModel({
    state: state({ school: { kind: 'weekend' } }),
  })
  assert.equal(model.tone, 'rest')
  assert.equal(model.title, '우리 반도 잠시 쉬는 중이에요.')
  assert.match(model.detail, /확인해 주세요\./)
})

test('Stage 5 source patch replaces the static Stage 4 class masthead with live data', () => {
  const source = `import { SHubIcon } from './s-hub-icon.jsx'\n\nfunction ClassStationPage({ section, onSectionChange, timetablePage, boardPage }) {\n  return (\n    <section className="class-station-page role-station-page" data-role-station="class" data-role-surface-version="role-surface-stage4-v1">\n      <header className="role-station-masthead" data-role-visual="stage4-visual-v2">\n        <div className="role-station-masthead-copy">\n          <p>우리 반</p>\n          <h1>함께 보는 공간</h1>\n          <span>시간표와 게시판을 한 흐름에서 확인해요.</span>\n        </div>\n        <span className="role-station-live"><i aria-hidden="true" />LIVE</span>\n      </header>\n    </section>\n  )\n}\n\nconst content = {\n  class: (\n      <ClassStationPage\n        section={classSection}\n        onSectionChange={setClassSection}\n        boardPage={<PreviewBoardPage />}\n      />\n  ),\n}`
  const next = patchStage5ClassHubSource(source, '/src/main.jsx')
  assert.match(next, /Stage5LiveClassHub/)
  assert.match(next, /profile=\{profile\}/)
  assert.match(next, /presence=\{presence\}/)
  assert.match(next, /data-stage5-class-hub="live-class-hub-stage5-v1"/)
  assert.doesNotMatch(next, /<h1>함께 보는 공간<\/h1>/)
})

test('Stage 5 class hub CSS changes structure without creating another animation owner', () => {
  const css = readFileSync(new URL('../src/stage5-class-hub.css', import.meta.url), 'utf8')
  assert.match(css, /grid-template-columns: minmax\(0, 1\.3fr\)/)
  assert.match(css, /margin: -37px auto 24px/)
  assert.match(css, /stage5-class-hub-signals/)
  assert.doesNotMatch(css, /@keyframes/)
})
