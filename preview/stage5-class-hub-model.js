export const LIVE_CLASS_HUB_VERSION = 'live-class-hub-stage5-v1'

function safeCount(value) {
  const number = Number(value || 0)
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0
}

function subjectOf(period) {
  return String(period?.subject || '').trim() || '과목 미설정'
}

function periodMeta(period) {
  if (!period) return ''
  const number = period.number ? `${period.number}교시` : ''
  const range = period.start && period.end ? `${period.start}–${period.end}` : String(period.start || period.end || '')
  return [number, range].filter(Boolean).join(' · ')
}

function classLabel(profile) {
  const classNumber = Number(profile?.classNumber || 0)
  return Number.isFinite(classNumber) && classNumber > 0 ? `${classNumber}반` : '우리 반'
}

function boardUnreadCount(boardUnread) {
  return safeCount(boardUnread?.sectionUnreadCount)
}

function primaryCopy(state) {
  const school = state?.context?.school || {}

  if (school.kind === 'class' && school.current) {
    return {
      tone: 'class',
      eyebrow: `${school.current.number || ''}교시 · 수업 중`.replace(/^교시 · /, ''),
      title: subjectOf(school.current),
      detail: periodMeta(school.current) || '현재 수업이 진행 중이에요.',
    }
  }
  if (school.kind === 'break') {
    return {
      tone: 'break',
      eyebrow: '쉬는 시간',
      title: school.next ? `${subjectOf(school.next)} 준비 중` : '오늘 수업이 끝났어요.',
      detail: school.next ? `${periodMeta(school.next)} 시작` : '남은 일정을 확인해 주세요.',
    }
  }
  if (school.kind === 'lunch') {
    return {
      tone: 'lunch',
      eyebrow: '점심시간',
      title: '지금은 잠깐 쉬어가요.',
      detail: school.next ? `다음은 ${subjectOf(school.next)} · ${periodMeta(school.next)}` : '오후 일정을 확인해 주세요.',
    }
  }
  if (school.kind === 'before') {
    return {
      tone: 'before',
      eyebrow: '등교 전',
      title: school.next ? `${subjectOf(school.next)}부터 시작해요.` : '첫 수업을 준비해 주세요.',
      detail: school.next ? periodMeta(school.next) : '시간표를 확인해 주세요.',
    }
  }
  if (school.kind === 'done') {
    return {
      tone: 'after',
      eyebrow: '수업 종료',
      title: '오늘 수업이 끝났어요.',
      detail: school.last ? `${subjectOf(school.last)}까지 완료했어요.` : '오늘 정규 수업이 끝났어요.',
    }
  }
  if (school.kind === 'holiday') {
    return {
      tone: 'rest',
      eyebrow: '오늘은 쉬는 날',
      title: String(school.holiday?.name || school.holiday?.title || '').trim() || '휴업일',
      detail: '정규 수업이 없어요.',
    }
  }
  if (school.kind === 'weekend') {
    return {
      tone: 'rest',
      eyebrow: '주말',
      title: '우리 반도 잠시 쉬는 중이에요.',
      detail: '새 게시글과 필요한 일정만 확인해 주세요.',
    }
  }
  if (school.kind === 'no-timetable') {
    return {
      tone: 'setup',
      eyebrow: '시간표 설정 전',
      title: '오늘 수업 흐름을 아직 알 수 없어요.',
      detail: '시간표를 설정하면 현재 수업과 다음 흐름이 여기에 반영돼요.',
    }
  }
  return {
    tone: 'calm',
    eyebrow: '지금 우리 반',
    title: '오늘의 반 흐름을 확인해요.',
    detail: '시간표와 게시판 상태를 한곳에서 보여드려요.',
  }
}

function nextSignal(state) {
  const school = state?.context?.school || {}
  if (school.next) {
    return {
      label: '다음',
      value: subjectOf(school.next),
      detail: periodMeta(school.next) || '다음 수업',
      active: true,
    }
  }
  if (school.kind === 'done') {
    return { label: '다음', value: '정규 수업 종료', detail: '남은 일정을 확인해 주세요.', active: false }
  }
  if (school.kind === 'weekend' || school.kind === 'holiday') {
    return { label: '다음', value: '다음 등교일', detail: '시간표에 맞춰 다시 이어져요.', active: false }
  }
  return { label: '다음', value: '시간표 확인', detail: '수업 흐름에 맞춰 바뀌어요.', active: false }
}

export function buildLiveClassHubModel({ state = {}, profile = {}, presence = {}, boardUnread = {} } = {}) {
  const primary = primaryCopy(state)
  const online = safeCount(presence?.online)
  const total = safeCount(presence?.total)
  const unread = boardUnreadCount(boardUnread)

  return {
    version: LIVE_CLASS_HUB_VERSION,
    classLabel: classLabel(profile),
    tone: primary.tone,
    eyebrow: primary.eyebrow,
    title: primary.title,
    detail: primary.detail,
    signals: [
      nextSignal(state),
      {
        label: '접속',
        value: total > 0 ? `${online}/${total}명` : `${online}명`,
        detail: online > 0 ? '현재 우리 반 접속 중' : '현재 접속한 학생이 없어요.',
        active: online > 0,
      },
      {
        label: '게시판',
        value: unread > 0 ? `새 소식 ${unread}개` : '새 소식 없음',
        detail: unread > 0 ? '읽지 않은 게시글이나 업데이트가 있어요.' : '모두 확인했어요.',
        active: unread > 0,
      },
    ],
  }
}
