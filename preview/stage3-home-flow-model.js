export const STAGE3_HOME_VERSION = 'live-home-stage3-v3'

function cleanTitle(todo) {
  return String(todo?.title || todo?.text || todo?.content || todo?.name || '').trim() || '리마인더 확인'
}

function subjectOf(period) {
  return String(period?.subject || '').trim() || '과목 미설정'
}

function periodMeta(period) {
  if (!period) return ''
  const number = period.number ? `${period.number}교시` : ''
  const start = String(period.start || '').trim()
  return [number, start ? `${start} 시작` : ''].filter(Boolean).join(' · ')
}

function activeTodos(todos) {
  return (Array.isArray(todos) ? todos : []).filter((todo) => todo && !todo.completed && !todo.hidden)
}

function dueAt(todo) {
  const date = String(todo?.dueDate || '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return Number.POSITIVE_INFINITY
  const rawTime = String(todo?.dueTime || '').trim()
  const time = /^([01]\d|2[0-3]):[0-5]\d$/.test(rawTime) ? rawTime : '23:59'
  const value = Date.parse(`${date}T${time}:00+09:00`)
  return Number.isFinite(value) ? value : Number.POSITIVE_INFINITY
}

function sortedActiveTodos(todos) {
  return activeTodos(todos).sort((a, b) => dueAt(a) - dueAt(b))
}

function dueLabel(todo, dateKey) {
  const date = String(todo?.dueDate || '').trim()
  const time = String(todo?.dueTime || '').trim()
  if (!date) return '기한 미설정'
  const datePart = date === dateKey ? '오늘' : date
  return time ? `${datePart} · ${time}` : datePart
}

function sameTodo(left, right) {
  if (!left || !right) return false
  if (left.id && right.id) return String(left.id) === String(right.id)
  return cleanTitle(left) === cleanTitle(right)
}

export function buildStage3LayoutModel(state = {}) {
  const primary = String(state?.primary || 'normal')
  const school = state?.context?.school || {}
  const schoolKind = String(school.kind || 'normal')

  if (schoolKind === 'holiday' || schoolKind === 'weekend') {
    return {
      version: STAGE3_HOME_VERSION,
      mode: 'rest',
      primary,
      timetableVisible: false,
      timetableKicker: '다음 등교 전',
      timetableTitle: '시간표',
    }
  }

  if (schoolKind === 'no-timetable') {
    return {
      version: STAGE3_HOME_VERSION,
      mode: 'setup',
      primary,
      timetableVisible: false,
      timetableKicker: '설정 후',
      timetableTitle: '시간표',
    }
  }

  if (primary === 'urgent-reminder' || primary === 'after-school' || schoolKind === 'done') {
    return {
      version: STAGE3_HOME_VERSION,
      mode: 'focus',
      primary,
      timetableVisible: true,
      timetableKicker: schoolKind === 'done' ? '다음' : '오늘',
      timetableTitle: schoolKind === 'done' ? '내일 시간표' : '수업 흐름',
    }
  }

  return {
    version: STAGE3_HOME_VERSION,
    mode: 'school',
    primary,
    timetableVisible: true,
    timetableKicker: '오늘',
    timetableTitle: '수업 흐름',
  }
}

function currentContext(state) {
  const primary = String(state?.primary || 'normal')
  const school = state?.context?.school || {}
  const study = state?.context?.study || {}
  const reminders = state?.context?.reminders || {}

  if (primary === 'class-active' && school.current) {
    return { label: '지금', value: subjectOf(school.current), meta: `${school.current.number || ''}교시 · 수업 중`.replace(/^교시 · /, '') }
  }
  if (primary === 'break-time') {
    return { label: '지금', value: '쉬는 시간', meta: school.next ? `${subjectOf(school.next)} 준비 중` : '오늘 수업이 끝났어요.' }
  }
  if (primary === 'lunch-time') {
    return { label: '지금', value: '점심시간', meta: school.next ? `다음 ${subjectOf(school.next)}` : '오후 일정을 확인해 주세요.' }
  }
  if (primary === 'before-school') {
    return { label: '지금', value: '등교 전', meta: school.next ? `${subjectOf(school.next)} · ${periodMeta(school.next)}` : '첫 수업을 준비해 주세요.' }
  }
  if (primary === 'after-school') {
    return { label: '지금', value: '수업 종료', meta: school.last ? `${subjectOf(school.last)}까지 완료` : '정규 수업이 끝났어요.' }
  }
  if (primary === 'study-active') {
    return { label: '지금', value: String(study.subject || '').trim() || 'Study 진행 중', meta: study.paused ? '일시정지 상태예요.' : '집중 시간이 기록되고 있어요.' }
  }
  if (primary === 'urgent-reminder' && reminders.nearestUrgent) {
    return { label: '지금', value: cleanTitle(reminders.nearestUrgent), meta: '마감이 가까운 일정이에요.' }
  }
  if (school.kind === 'holiday') {
    return { label: '오늘', value: String(school.holiday?.name || school.holiday?.title || '').trim() || '휴업일', meta: '정규 수업이 없어요.' }
  }
  if (school.kind === 'weekend') {
    return { label: '오늘', value: '주말', meta: '정규 수업이 없어요.' }
  }
  if (school.kind === 'no-timetable') {
    return { label: '지금', value: '시간표 설정 전', meta: '시간표를 설정하면 흐름이 표시돼요.' }
  }
  return { label: '지금', value: '학교생활 확인 중', meta: '현재 상태를 정리하고 있어요.' }
}

function nextContext(state) {
  const school = state?.context?.school || {}
  if (school.next) {
    return { label: '다음', value: subjectOf(school.next), meta: periodMeta(school.next) || '다음 수업' }
  }
  if (school.kind === 'class' && school.current) {
    return { label: '다음', value: '정규 수업 종료', meta: '현재 수업이 마지막 수업이에요.' }
  }
  if (school.kind === 'done') {
    return { label: '다음', value: '개인 일정', meta: '리마인더와 Study를 확인해 주세요.' }
  }
  if (school.kind === 'holiday' || school.kind === 'weekend') {
    return { label: '다음', value: '남은 하루', meta: '필요한 일정만 가볍게 확인해 주세요.' }
  }
  return { label: '다음', value: '일정 확인', meta: '시간표에 맞춰 자동으로 바뀌어요.' }
}

export function buildStage3ContextModel({ state = {}, todos = [] } = {}) {
  const list = sortedActiveTodos(todos)
  const nearest = list[0] || null
  const layout = buildStage3LayoutModel(state)
  return {
    version: STAGE3_HOME_VERSION,
    mode: layout.mode,
    segments: [
      currentContext(state),
      nextContext(state),
      {
        label: '할 일',
        value: list.length ? `${list.length}개 남음` : '여유 있음',
        meta: nearest ? cleanTitle(nearest) : '급한 리마인더가 없어요.',
      },
    ],
  }
}

export function buildStage3HeadingModel(zone, state = {}) {
  const layout = buildStage3LayoutModel(state)
  if (zone === 'timetable') {
    return { kicker: layout.timetableKicker, title: layout.timetableTitle }
  }
  if (zone === 'focus') {
    return layout.primary === 'urgent-reminder'
      ? { kicker: '우선 확인', title: '마감이 가까운 일정' }
      : { kicker: '우선순위', title: '해야 할 것' }
  }
  if (zone === 'reminders') return { kicker: '남은 일정', title: '리마인더' }
  if (zone === 'upcoming') return { kicker: '다가오는 것', title: '학사일정과 급식' }
  return { kicker: '', title: '' }
}

export function buildStage3ActionModel({ state = {}, todos = [] } = {}) {
  const list = sortedActiveTodos(todos)
  const reminders = state?.context?.reminders || {}
  const dateKey = String(state?.context?.dateKey || '')
  const urgent = reminders.nearestUrgent || null
  const target = urgent || list[0] || null
  const urgentTarget = Boolean(target && urgent && sameTodo(target, urgent))

  if (!target) {
    return {
      version: STAGE3_HOME_VERSION,
      tone: 'quiet',
      kicker: '지금',
      title: '급한 할 일이 없어요.',
      detail: '새 리마인더가 생기면 여기에서 먼저 보여드려요.',
      count: 0,
    }
  }

  const count = Math.max(list.length, Number(reminders.urgentCount || 0))
  return {
    version: STAGE3_HOME_VERSION,
    tone: urgentTarget ? 'urgent' : 'normal',
    kicker: urgentTarget ? '곧 마감' : '가장 가까운 일정',
    title: cleanTitle(target),
    detail: `${dueLabel(target, dateKey)}${count > 1 ? ` · 남은 리마인더 ${count}개` : ''}`,
    count,
  }
}
