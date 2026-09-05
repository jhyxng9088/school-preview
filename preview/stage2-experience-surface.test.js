import test from 'node:test'
import assert from 'node:assert/strict'
import { buildExperienceSurfaceModel, EXPERIENCE_SURFACE_VERSION } from '../src/experience-surface-model.js'

const state = (primary, school = {}, extra = {}) => ({
  primary,
  secondary: [],
  context: {
    school: { kind: school.kind || 'normal', configured: true, ...school },
    study: { active: false, paused: false, subject: '', ...(extra.study || {}) },
    reminders: { urgentCount: 0, nearestUrgent: null, ...(extra.reminders || {}) },
    network: { online: true },
  },
  ...extra.state,
})

test('class state becomes the primary live surface', () => {
  const model = buildExperienceSurfaceModel(state('class-active', {
    kind: 'class',
    current: { number: 2, subject: '수학', start: '10:10', end: '11:00' },
    next: { number: 3, subject: '영어', start: '11:10', end: '12:00' },
  }))
  assert.equal(model.version, EXPERIENCE_SURFACE_VERSION)
  assert.equal(model.title, '수학')
  assert.match(model.support, /3교시/)
})

test('break state promotes the next class', () => {
  const model = buildExperienceSurfaceModel(state('break-time', {
    kind: 'break', next: { number: 3, subject: '영어', start: '11:10' },
  }))
  assert.equal(model.eyebrow, '쉬는 시간')
  assert.match(model.title, /영어/)
})

test('lunch state becomes a calm lunch surface', () => {
  const model = buildExperienceSurfaceModel(state('lunch-time', {
    kind: 'lunch', next: { number: 5, subject: '정보' },
  }))
  assert.equal(model.tone, 'lunch')
  assert.equal(model.title, '점심 먹을 시간')
})

test('after school state closes the school-day loop', () => {
  const model = buildExperienceSurfaceModel(state('after-school', {
    kind: 'done', last: { number: 7, subject: '체육' },
  }))
  assert.equal(model.title, '오늘 수업 끝')
  assert.match(model.detail, /체육/)
})

test('Study remains primary while current class stays as support context', () => {
  const model = buildExperienceSurfaceModel({
    ...state('study-active', {
      kind: 'class', current: { number: 4, subject: '국어' },
    }, { study: { active: true, subject: '영단어' } }),
    secondary: ['class-active'],
  })
  assert.equal(model.title, '영단어')
  assert.match(model.support, /국어/)
})

test('urgent reminder becomes the live surface outside class', () => {
  const model = buildExperienceSurfaceModel(state('urgent-reminder', { kind: 'done' }, {
    reminders: { urgentCount: 2, nearestUrgent: { title: '수학 수행평가' } },
  }))
  assert.equal(model.tone, 'urgent')
  assert.equal(model.title, '수학 수행평가')
  assert.match(model.detail, /2개/)
})

test('holiday uses the canonical academic event name', () => {
  const model = buildExperienceSurfaceModel({
    ...state('normal', { kind: 'holiday', holiday: { name: '학교장 재량휴업일', dayOffType: '휴업일' } }),
    secondary: ['holiday'],
  })
  assert.equal(model.tone, 'holiday')
  assert.equal(model.title, '학교장 재량휴업일')
})

test('offline remains secondary and visible without replacing the school state', () => {
  const model = buildExperienceSurfaceModel({
    ...state('class-active', { kind: 'class', current: { number: 1, subject: '정보' } }),
    secondary: ['offline'],
  })
  assert.equal(model.title, '정보')
  assert.deepEqual(model.badges, ['오프라인'])
})
