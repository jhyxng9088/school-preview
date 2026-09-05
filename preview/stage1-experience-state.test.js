import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  EXPERIENCE_PRIMARY,
  EXPERIENCE_SECONDARY,
  EXPERIENCE_STATE_VERSION,
  academicEventRawDate,
  isAcademicDayOffEvent,
  officialHolidayForDate,
  resolveExperienceState,
} from '../src/experience-state.js'

function at(value) {
  return new Date(value)
}

function school(kind, extra = {}) {
  return {
    kind,
    configured: kind !== 'unconfigured',
    current: null,
    next: null,
    ...extra,
  }
}

test('Stage 1 model exposes the immutable version marker', () => {
  const state = resolveExperienceState()
  assert.equal(state.version, EXPERIENCE_STATE_VERSION)
  assert.equal(state.version, 'experience-state-stage1-v1')
})

test('before school', () => {
  const state = resolveExperienceState({ now: at('2026-09-07T08:30:00+09:00'), schoolState: school('before') })
  assert.equal(state.primary, EXPERIENCE_PRIMARY.BEFORE_SCHOOL)
})

test('class active', () => {
  const current = { number: 1, subject: '정보', start: '09:10', end: '10:00' }
  const state = resolveExperienceState({ now: at('2026-09-07T09:30:00+09:00'), schoolState: school('class', { current }) })
  assert.equal(state.primary, EXPERIENCE_PRIMARY.CLASS_ACTIVE)
  assert.equal(state.context.school.current, current)
})

test('break time', () => {
  const state = resolveExperienceState({ now: at('2026-09-07T10:05:00+09:00'), schoolState: school('break') })
  assert.equal(state.primary, EXPERIENCE_PRIMARY.BREAK_TIME)
})

test('lunch time', () => {
  const state = resolveExperienceState({ now: at('2026-09-07T13:30:00+09:00'), schoolState: school('lunch') })
  assert.equal(state.primary, EXPERIENCE_PRIMARY.LUNCH_TIME)
})

test('after school', () => {
  const state = resolveExperienceState({ now: at('2026-09-07T17:10:00+09:00'), schoolState: school('done') })
  assert.equal(state.primary, EXPERIENCE_PRIMARY.AFTER_SCHOOL)
})

test('weekend suppresses cached weekday school state', () => {
  const state = resolveExperienceState({ now: at('2026-09-05T10:00:00+09:00'), schoolState: school('class') })
  assert.equal(state.primary, EXPERIENCE_PRIMARY.NORMAL)
  assert.equal(state.context.school.kind, 'weekend')
  assert.ok(state.secondary.includes(EXPERIENCE_SECONDARY.WEEKEND))
})

test('canonical academic day-off helpers recognize NEIS date and day-off signals', () => {
  const now = at('2026-09-07T10:00:00+09:00')
  const publicHoliday = { rawDate: '20260907', name: '대체공휴일', dayOffType: '공휴일' }
  const discretionary = { rawDate: '20260907', name: '학교장 재량휴업일', dayOffType: '휴업일' }
  const normalDay = { rawDate: '20260907', name: '정상 수업', dayOffType: '해당없음' }

  assert.equal(academicEventRawDate(publicHoliday), '20260907')
  assert.equal(isAcademicDayOffEvent(publicHoliday), true)
  assert.equal(isAcademicDayOffEvent(discretionary), true)
  assert.equal(isAcademicDayOffEvent(normalDay), false)
  assert.equal(officialHolidayForDate([publicHoliday], now), publicHoliday)
  assert.equal(officialHolidayForDate([discretionary], now), discretionary)
  assert.equal(officialHolidayForDate([normalDay], now), null)
})

test('official holiday suppresses timetable class state', () => {
  const holiday = { rawDate: '20260907', name: '대체공휴일', dayOffType: '공휴일' }
  const state = resolveExperienceState({
    now: at('2026-09-07T10:00:00+09:00'),
    schoolState: school('class'),
    academicEvents: [holiday],
  })
  assert.equal(state.primary, EXPERIENCE_PRIMARY.NORMAL)
  assert.equal(state.context.school.kind, 'holiday')
  assert.equal(state.context.school.holiday, holiday)
  assert.ok(state.secondary.includes(EXPERIENCE_SECONDARY.HOLIDAY))
})

test('no timetable stays normal with explicit context', () => {
  const state = resolveExperienceState({ now: at('2026-09-07T10:00:00+09:00'), schoolState: school('unconfigured') })
  assert.equal(state.primary, EXPERIENCE_PRIMARY.NORMAL)
  assert.equal(state.context.school.kind, 'no-timetable')
  assert.ok(state.secondary.includes(EXPERIENCE_SECONDARY.NO_TIMETABLE))
})

test('Study active becomes primary', () => {
  const state = resolveExperienceState({
    now: at('2026-09-07T17:10:00+09:00'),
    schoolState: school('done'),
    studyActive: { subject: '수학', startedAt: 1000, isPaused: false },
  })
  assert.equal(state.primary, EXPERIENCE_PRIMARY.STUDY_ACTIVE)
  assert.ok(state.secondary.includes(EXPERIENCE_PRIMARY.AFTER_SCHOOL))
  assert.equal(state.context.study.subject, '수학')
})

test('Study + class active preserves class as secondary context', () => {
  const state = resolveExperienceState({
    now: at('2026-09-07T09:30:00+09:00'),
    schoolState: school('class'),
    studyActive: { subject: '영어', startedAt: 1000, isPaused: false },
  })
  assert.equal(state.primary, EXPERIENCE_PRIMARY.STUDY_ACTIVE)
  assert.ok(state.secondary.includes(EXPERIENCE_PRIMARY.CLASS_ACTIVE))
})

test('urgent reminder becomes primary outside a live class context', () => {
  const state = resolveExperienceState({
    now: at('2026-09-07T17:10:00+09:00'),
    schoolState: school('done'),
    todos: [{ id: 'urgent', title: '제출', dueDate: '2026-09-07', dueTime: '18:00', completed: false }],
  })
  assert.equal(state.primary, EXPERIENCE_PRIMARY.URGENT_REMINDER)
  assert.ok(state.secondary.includes(EXPERIENCE_PRIMARY.AFTER_SCHOOL))
  assert.equal(state.context.reminders.urgentCount, 1)
})

test('urgent reminder remains secondary during class', () => {
  const state = resolveExperienceState({
    now: at('2026-09-07T09:30:00+09:00'),
    schoolState: school('class'),
    todos: [{ id: 'urgent', title: '제출', dueDate: '2026-09-07', dueTime: '10:00', completed: false }],
  })
  assert.equal(state.primary, EXPERIENCE_PRIMARY.CLASS_ACTIVE)
  assert.ok(state.secondary.includes(EXPERIENCE_SECONDARY.URGENT_REMINDER))
})

test('offline is secondary and does not erase cached class state', () => {
  const state = resolveExperienceState({
    now: at('2026-09-07T09:30:00+09:00'),
    schoolState: school('class'),
    online: false,
  })
  assert.equal(state.primary, EXPERIENCE_PRIMARY.CLASS_ACTIVE)
  assert.ok(state.secondary.includes(EXPERIENCE_SECONDARY.OFFLINE))
  assert.equal(state.context.network.online, false)
})

test('Experience State owner remains data-neutral and UI-neutral', () => {
  const files = [
    'src/experience-state.js',
    'src/experience-state-study-bridge.js',
    'src/experience-state-react.jsx',
    'src/experience-state-source-patch.js',
  ].map((path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')).join('\n')

  assert.doesNotMatch(files, /\bfetch\s*\(/)
  assert.doesNotMatch(files, /MutationObserver/)
  assert.doesNotMatch(files, /createPortal/)
  assert.doesNotMatch(files, /UnifiedBottomSheet/)
  assert.doesNotMatch(files, /@keyframes/)
  assert.doesNotMatch(files, /preview-dark-ui|ia2-home|ia-home-primary/)
})
