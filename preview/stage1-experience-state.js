export const EXPERIENCE_STATE_VERSION = 'experience-state-stage1-v1'
export const DEFAULT_URGENT_WINDOW_MS = 90 * 60 * 1000

export const EXPERIENCE_PRIMARY = Object.freeze({
  BEFORE_SCHOOL: 'before-school',
  CLASS_ACTIVE: 'class-active',
  BREAK_TIME: 'break-time',
  LUNCH_TIME: 'lunch-time',
  AFTER_SCHOOL: 'after-school',
  STUDY_ACTIVE: 'study-active',
  URGENT_REMINDER: 'urgent-reminder',
  NORMAL: 'normal',
})

export const EXPERIENCE_SECONDARY = Object.freeze({
  OFFLINE: 'offline',
  URGENT_REMINDER: 'urgent-reminder',
  WEEKEND: 'weekend',
  HOLIDAY: 'holiday',
  NO_TIMETABLE: 'no-timetable',
})

const KST_OFFSET_MS = 9 * 60 * 60 * 1000
const NOT_DAY_OFF = /^(?:해당\s*없음|수업일|정상수업|정상)$/
const DAY_OFF_SIGNAL = /공휴일|대체\s*공휴일|휴업일|재량\s*휴업|개교기념|설날|추석|어린이날|현충일|광복절|개천절|한글날|성탄절|부처님\s*오신\s*날/

function kstParts(value) {
  const date = value instanceof Date ? value : new Date(value)
  const shifted = new Date(date.getTime() + KST_OFFSET_MS)
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    weekday: shifted.getUTCDay(),
  }
}

function pad(value) {
  return String(value).padStart(2, '0')
}

export function experienceDateKey(now = new Date()) {
  const parts = kstParts(now)
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`
}

function experienceRawDate(now = new Date()) {
  return experienceDateKey(now).replaceAll('-', '')
}

export function academicEventRawDate(event) {
  const raw = String(event?.rawDate ?? '').trim().replace(/[^0-9]/g, '')
  if (/^\d{8}$/.test(raw)) return raw
  const date = event?.date instanceof Date ? event.date : null
  return date && !Number.isNaN(date.getTime()) ? experienceRawDate(date) : ''
}

export function isAcademicDayOffEvent(event) {
  const dayOffType = String(event?.dayOffType ?? '').trim()
  const name = String(event?.name ?? event?.title ?? '').trim()
  if (dayOffType && NOT_DAY_OFF.test(dayOffType)) return false
  return DAY_OFF_SIGNAL.test(`${dayOffType} ${name}`)
}

export function officialHolidayForDate(academicEvents, now = new Date()) {
  const today = experienceRawDate(now)
  for (const event of Array.isArray(academicEvents) ? academicEvents : []) {
    if (academicEventRawDate(event) !== today) continue
    if (isAcademicDayOffEvent(event)) return event
  }
  return null
}

function reminderDueMs(todo) {
  const dueDate = String(todo?.dueDate || '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return Number.POSITIVE_INFINITY
  const dueTime = String(todo?.dueTime || '').trim()
  const time = /^([01]\d|2[0-3]):[0-5]\d$/.test(dueTime) ? `${dueTime}:00.000` : '23:59:59.000'
  const due = Date.parse(`${dueDate}T${time}+09:00`)
  return Number.isFinite(due) ? due : Number.POSITIVE_INFINITY
}

export function urgentReminders(todos, now = new Date(), urgentWindowMs = DEFAULT_URGENT_WINDOW_MS) {
  const nowMs = now instanceof Date ? now.getTime() : Number(now)
  const safeWindow = Math.max(0, Number(urgentWindowMs || 0))
  return (Array.isArray(todos) ? todos : [])
    .filter((todo) => todo && !todo.completed && !todo.hidden)
    .map((todo) => ({ todo, dueAt: reminderDueMs(todo) }))
    .filter(({ dueAt }) => Number.isFinite(dueAt) && dueAt > nowMs && dueAt - nowMs <= safeWindow)
    .sort((a, b) => a.dueAt - b.dueAt)
}

function baseSchoolPrimary(schoolState, { weekend, holiday }) {
  if (weekend || holiday) return EXPERIENCE_PRIMARY.NORMAL
  switch (schoolState?.kind) {
    case 'before': return EXPERIENCE_PRIMARY.BEFORE_SCHOOL
    case 'class': return EXPERIENCE_PRIMARY.CLASS_ACTIVE
    case 'break': return EXPERIENCE_PRIMARY.BREAK_TIME
    case 'lunch': return EXPERIENCE_PRIMARY.LUNCH_TIME
    case 'done': return EXPERIENCE_PRIMARY.AFTER_SCHOOL
    default: return EXPERIENCE_PRIMARY.NORMAL
  }
}

function schoolContextKind(schoolState, { weekend, holiday, noTimetable }) {
  if (weekend) return 'weekend'
  if (holiday) return 'holiday'
  if (noTimetable) return 'no-timetable'
  return String(schoolState?.kind || 'normal')
}

function appendUnique(list, value) {
  if (value && !list.includes(value)) list.push(value)
}

export function resolveExperienceState({
  now = new Date(),
  schoolState = null,
  academicEvents = [],
  todos = [],
  studyActive = null,
  studyKnown = true,
  online = true,
  urgentWindowMs = DEFAULT_URGENT_WINDOW_MS,
} = {}) {
  const currentNow = now instanceof Date ? now : new Date(now)
  const parts = kstParts(currentNow)
  const weekend = parts.weekday === 0 || parts.weekday === 6
  const holidayEvent = weekend ? null : officialHolidayForDate(academicEvents, currentNow)
  const holiday = Boolean(holidayEvent)
  const noTimetable = !weekend && !holiday && (
    schoolState?.kind === 'unconfigured' || schoolState?.configured === false
  )
  const basePrimary = baseSchoolPrimary(schoolState, { weekend, holiday })
  const urgent = urgentReminders(todos, currentNow, urgentWindowMs)
  const hasUrgent = urgent.length > 0
  const hasStudy = Boolean(studyActive && typeof studyActive === 'object')

  let primary = basePrimary
  const secondary = []

  if (hasStudy) {
    primary = EXPERIENCE_PRIMARY.STUDY_ACTIVE
    if (basePrimary !== EXPERIENCE_PRIMARY.NORMAL) appendUnique(secondary, basePrimary)
  } else if (hasUrgent && ![
    EXPERIENCE_PRIMARY.CLASS_ACTIVE,
    EXPERIENCE_PRIMARY.BREAK_TIME,
    EXPERIENCE_PRIMARY.LUNCH_TIME,
  ].includes(basePrimary)) {
    primary = EXPERIENCE_PRIMARY.URGENT_REMINDER
    if (basePrimary !== EXPERIENCE_PRIMARY.NORMAL) appendUnique(secondary, basePrimary)
  }

  if (hasUrgent && primary !== EXPERIENCE_PRIMARY.URGENT_REMINDER) {
    appendUnique(secondary, EXPERIENCE_SECONDARY.URGENT_REMINDER)
  }
  if (online === false) appendUnique(secondary, EXPERIENCE_SECONDARY.OFFLINE)
  if (weekend) appendUnique(secondary, EXPERIENCE_SECONDARY.WEEKEND)
  else if (holiday) appendUnique(secondary, EXPERIENCE_SECONDARY.HOLIDAY)
  else if (noTimetable) appendUnique(secondary, EXPERIENCE_SECONDARY.NO_TIMETABLE)

  return {
    version: EXPERIENCE_STATE_VERSION,
    primary,
    secondary,
    context: {
      at: currentNow.getTime(),
      dateKey: experienceDateKey(currentNow),
      school: {
        kind: schoolContextKind(schoolState, { weekend, holiday, noTimetable }),
        sourceKind: String(schoolState?.kind || 'normal'),
        configured: schoolState?.configured !== false,
        current: schoolState?.current || null,
        next: schoolState?.next || null,
        last: schoolState?.last || null,
        weekend,
        holiday: holidayEvent,
      },
      study: {
        known: studyKnown === true,
        active: hasStudy,
        paused: Boolean(studyActive?.isPaused),
        subject: hasStudy ? String(studyActive?.subject || '') : '',
        startedAt: hasStudy ? Number(studyActive?.startedAt || 0) : 0,
      },
      reminders: {
        urgentCount: urgent.length,
        nearestUrgent: urgent[0]?.todo || null,
        nearestUrgentDueAt: urgent[0]?.dueAt || 0,
        urgentWindowMs: Math.max(0, Number(urgentWindowMs || 0)),
      },
      network: {
        online: online !== false,
      },
    },
  }
}
