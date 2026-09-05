export const EXPERIENCE_SURFACE_VERSION = 'experience-surface-stage2-v1'

const hasSecondary = (state, value) => Array.isArray(state?.secondary) && state.secondary.includes(value)
const subjectOf = (period) => String(period?.subject || '').trim() || '과목 미설정'
const periodLabel = (period) => period?.number ? `${period.number}교시` : ''

function reminderTitle(todo) {
  return String(todo?.title || todo?.text || todo?.content || todo?.name || '').trim() || '리마인더 확인'
}

function timeRange(period) {
  if (!period) return ''
  const start = String(period.start || '').trim()
  const end = String(period.end || '').trim()
  return start && end ? `${start}–${end}` : start || end
}

function schoolSupport(state) {
  const school = state?.context?.school || {}
  if (school.kind === 'class' && school.current) {
    return `${periodLabel(school.current)} · ${subjectOf(school.current)} 진행 중`
  }
  if (school.next) return `다음 ${periodLabel(school.next)} · ${subjectOf(school.next)}`
  return ''
}

export function buildExperienceSurfaceModel(state = {}) {
  const primary = String(state?.primary || 'normal')
  const school = state?.context?.school || {}
  const study = state?.context?.study || {}
  const reminders = state?.context?.reminders || {}
  const badges = []

  if (hasSecondary(state, 'offline')) badges.push('오프라인')
  if (hasSecondary(state, 'urgent-reminder') && primary !== 'urgent-reminder') badges.push('곧 마감')

  let tone = 'calm'
  let eyebrow = '지금'
  let title = '오늘 학교생활'
  let detail = '현재 상태를 확인하고 있어요.'
  let support = ''

  if (primary === 'class-active') {
    tone = 'class'
    eyebrow = `${periodLabel(school.current)} · 진행 중`
    title = subjectOf(school.current)
    detail = timeRange(school.current) || '수업이 진행 중이에요.'
    support = school.next ? `다음 ${periodLabel(school.next)} · ${subjectOf(school.next)}` : '오늘 마지막 수업이에요.'
  } else if (primary === 'break-time') {
    tone = 'break'
    eyebrow = '쉬는 시간'
    title = school.next ? `다음 · ${subjectOf(school.next)}` : '잠깐 쉬어가세요.'
    detail = school.next ? `${periodLabel(school.next)} · ${school.next.start || ''} 시작` : '오늘 수업이 모두 끝났어요.'
    support = school.next ? '다음 수업을 준비할 시간이에요.' : ''
  } else if (primary === 'lunch-time') {
    tone = 'lunch'
    eyebrow = '점심시간'
    title = '점심 먹을 시간'
    detail = school.next ? `다음 ${periodLabel(school.next)} · ${subjectOf(school.next)}` : '오후 일정을 확인해 주세요.'
    support = '잠깐 쉬어가도 좋아요.'
  } else if (primary === 'before-school') {
    tone = 'before'
    eyebrow = '등교 전'
    title = school.next ? subjectOf(school.next) : '오늘 준비'
    detail = school.next ? `${periodLabel(school.next)} · ${school.next.start || ''} 시작` : '첫 수업을 확인해 주세요.'
    support = '하루가 시작되기 전이에요.'
  } else if (primary === 'after-school') {
    tone = 'after'
    eyebrow = '수업 종료'
    title = '오늘 수업 끝'
    detail = school.last ? `${periodLabel(school.last)} · ${subjectOf(school.last)}까지 완료` : '오늘 정규 수업이 끝났어요.'
    support = '남은 리마인더나 Study를 확인해 주세요.'
  } else if (primary === 'study-active') {
    tone = 'study'
    eyebrow = study.paused ? 'Study · 일시정지' : 'Study · 진행 중'
    title = String(study.subject || '').trim() || '집중 중'
    detail = study.paused ? '다시 시작하면 이어서 기록돼요.' : '지금의 집중 흐름을 유지하고 있어요.'
    support = schoolSupport(state)
  } else if (primary === 'urgent-reminder') {
    tone = 'urgent'
    eyebrow = '곧 마감'
    title = reminderTitle(reminders.nearestUrgent)
    detail = reminders.urgentCount > 1 ? `가까운 리마인더 ${reminders.urgentCount}개` : '가장 가까운 리마인더'
    support = schoolSupport(state)
  } else if (school.kind === 'holiday') {
    tone = 'holiday'
    eyebrow = '오늘은 쉬는 날'
    title = String(school.holiday?.name || school.holiday?.title || '').trim() || '휴업일'
    detail = String(school.holiday?.dayOffType || '').trim() || '정규 수업 없음'
    support = '학교 일정은 잠시 쉬어가요.'
  } else if (school.kind === 'weekend' || hasSecondary(state, 'weekend')) {
    tone = 'weekend'
    eyebrow = '주말'
    title = '학교는 잠시 쉬는 중'
    detail = '필요한 리마인더와 Study만 가볍게 확인해 주세요.'
  } else if (school.kind === 'no-timetable' || hasSecondary(state, 'no-timetable')) {
    tone = 'setup'
    eyebrow = '시간표 설정 전'
    title = '오늘 흐름을 아직 알 수 없어요.'
    detail = '시간표를 설정하면 현재 수업과 다음 흐름이 여기에 반영돼요.'
  }

  return {
    version: EXPERIENCE_SURFACE_VERSION,
    primary,
    tone,
    eyebrow,
    title,
    detail,
    support,
    badges,
  }
}
