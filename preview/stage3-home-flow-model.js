export const STAGE3_HOME_VERSION = 'live-home-stage3-v1'

function cleanTitle(todo) {
  return String(todo?.title || todo?.text || todo?.content || todo?.name || '').trim() || '리마인더 확인'
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

export function buildStage3ActionModel({ state = {}, todos = [] } = {}) {
  const list = activeTodos(todos).sort((a, b) => dueAt(a) - dueAt(b))
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
