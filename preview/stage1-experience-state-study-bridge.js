// Adapter only: canonical Study snapshot ownership stays in preview-study.jsx.
// This bridge publishes the already-owned `me.active` signal to the app-wide
// Experience State owner without another Study API call or persistence layer.
let snapshot = Object.freeze({ known: false, active: null, revision: 0 })
const listeners = new Set()

function activeKey(active) {
  if (!active || typeof active !== 'object') return ''
  return [
    String(active.subject || ''),
    Number(active.startedAt || 0),
    Number(active.segmentStartedAt || 0),
    Number(active.sessionSeconds || 0),
    active.isPaused === true ? 1 : 0,
    Number(active.pausedAt || 0),
  ].join('|')
}

export function getExperienceStudySignal() {
  return snapshot
}

export function subscribeExperienceStudySignal(listener) {
  if (typeof listener !== 'function') return () => {}
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function publishExperienceStudySignal(active, { known = true } = {}) {
  const nextActive = active && typeof active === 'object' ? active : null
  const nextKnown = known === true
  if (snapshot.known === nextKnown && activeKey(snapshot.active) === activeKey(nextActive)) return snapshot

  snapshot = Object.freeze({
    known: nextKnown,
    active: nextActive,
    revision: snapshot.revision + 1,
  })
  listeners.forEach((listener) => listener())
  return snapshot
}
