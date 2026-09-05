import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildStage3ActionModel,
  buildStage3ContextModel,
  STAGE3_HOME_VERSION,
} from '../src/stage3-home-flow-model.js'
import { patchStage3HomeSource } from '../src/stage3-home-source-patch.js'

function experienceState({
  primary = 'normal',
  dateKey = '2026-09-07',
  school = {},
  study = {},
  urgent = null,
  urgentCount = 0,
} = {}) {
  return {
    primary,
    context: {
      dateKey,
      school: { kind: 'normal', ...school },
      study: { active: false, paused: false, subject: '', ...study },
      reminders: {
        nearestUrgent: urgent,
        urgentCount,
      },
    },
  }
}

test('Stage 3 context rail exposes now, next, and remaining work', () => {
  const model = buildStage3ContextModel({
    state: experienceState({
      primary: 'class-active',
      school: {
        kind: 'class',
        current: { number: 2, subject: '수학', start: '10:10', end: '11:00' },
        next: { number: 3, subject: '영어', start: '11:10', end: '12:00' },
      },
    }),
    todos: [
      { id: 'a', title: '통계 포스터', dueDate: '2026-09-08' },
      { id: 'b', title: '영어 단어', dueDate: '2026-09-09' },
    ],
  })
  assert.equal(model.version, STAGE3_HOME_VERSION)
  assert.deepEqual(model.segments.map((item) => item.label), ['지금', '다음', '할 일'])
  assert.equal(model.segments[0].value, '수학')
  assert.equal(model.segments[1].value, '영어')
  assert.equal(model.segments[2].value, '2개 남음')
})

test('Stage 3 context rail uses polite off-day copy', () => {
  const model = buildStage3ContextModel({
    state: experienceState({ school: { kind: 'weekend' } }),
    todos: [],
  })
  assert.equal(model.segments[0].value, '주말')
  assert.equal(model.segments[0].meta, '정규 수업이 없어요.')
  assert.equal(model.segments[2].meta, '급한 리마인더가 없어요.')
})

test('Stage 3 action focus promotes the urgent reminder', () => {
  const urgent = { id: 'math', title: '수학 수행평가', dueDate: '2026-09-07', dueTime: '16:30' }
  const model = buildStage3ActionModel({
    state: experienceState({ urgent, urgentCount: 2 }),
    todos: [urgent, { id: 'eng', title: '영어 단어', dueDate: '2026-09-08', dueTime: '09:00' }],
  })
  assert.equal(model.version, STAGE3_HOME_VERSION)
  assert.equal(model.tone, 'urgent')
  assert.equal(model.title, '수학 수행평가')
  assert.match(model.detail, /오늘 · 16:30/)
  assert.match(model.detail, /2개/)
})

test('Stage 3 empty focus copy stays polite', () => {
  const model = buildStage3ActionModel({ state: experienceState(), todos: [] })
  assert.equal(model.title, '급한 할 일이 없어요.')
  assert.equal(model.detail, '새 리마인더가 생기면 여기에서 먼저 보여드려요.')
})

test('Stage 3 main patch replaces card order with the deeper live home hierarchy', () => {
  const source = `import { ExperienceSurface } from './experience-surface.jsx'\n\nfunction fixture() {\n  return (\n      <div ref={homeStackRef} className={\`home-stack \${mealPriority ? 'is-meal-priority' : ''}\`} data-home-lunch-ready="true">\n        <ExperienceSurface />\n        <PreviewHomeSignals profile={profile} presence={presence} todos={todoData.todos} onNavigate={onNavigate} />\n        <TodoHomePreview todos={todoData.todos} categories={todoData.categories} now={now} />\n        <TimetablePreview\n          schedule={timetablePreviewSchedule}\n          now={now}\n          configured={schoolState.configured}\n          title={showTomorrowTimetable ? '내일 시간표' : '오늘 시간표'}\n          futureDay={showTomorrowTimetable}\n        />\n        <SharedAcademicPreview now={now} schoolData={schoolData} academicData={academicData} />\n        <Stage3MealPreview now={now} schoolData={schoolData} />\n      </div>\n  )\n}`
  const next = patchStage3HomeSource(source, '/src/main.jsx')
  assert.match(next, /data-stage3-live-home="live-home-stage3-v2"/)
  assert.match(next, /<Stage3ContextRail todos=\{todoData.todos\} \/>/)
  assert.ok(next.indexOf('시간표 흐름') < next.indexOf('해야 할 것'))
  assert.ok(next.indexOf('해야 할 것') < next.indexOf('리마인더'))
  assert.ok(next.indexOf('지금 우리반') < next.indexOf('다가오는 것'))
})

test('Stage 3 class live region removes the duplicate reminder tile', () => {
  const source = `  return [\n    {\n      id: 'reminder',\n      label: '리마인더',\n      value: \`\${reminderCount}개\`,\n      detail: reminderCount > 0 ? '아직 남아 있어요' : '남은 리마인더 없음',\n      active: reminderCount > 0,\n    },\n  ]\n}\n\n<section aria-label="S-Hub 한눈에 보기">\n  <div>\n        <h2>한눈에 보기</h2>\n        <span>실시간</span>\n  </div>\n</section>`
  const next = patchStage3HomeSource(source, '/src/preview-home-signals.jsx')
  assert.doesNotMatch(next, /id: 'reminder'/)
  assert.match(next, /aria-label="지금 우리반"/)
  assert.match(next, /<h2>지금 우리반<\/h2>/)
})
