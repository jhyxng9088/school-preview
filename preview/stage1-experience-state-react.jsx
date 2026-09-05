import { createContext, useContext, useMemo, useSyncExternalStore } from 'react'
import { resolveExperienceState } from './experience-state.js'
import {
  getExperienceStudySignal,
  subscribeExperienceStudySignal,
} from './experience-state-study-bridge.js'

const ExperienceStateContext = createContext(null)

export function ExperienceStateProvider({
  now,
  schoolState,
  academicEvents,
  todos,
  online,
  children,
}) {
  const studySignal = useSyncExternalStore(
    subscribeExperienceStudySignal,
    getExperienceStudySignal,
    getExperienceStudySignal,
  )

  const value = useMemo(() => resolveExperienceState({
    now,
    schoolState,
    academicEvents,
    todos,
    studyActive: studySignal.active,
    studyKnown: studySignal.known,
    online,
  }), [now, schoolState, academicEvents, todos, studySignal, online])

  return (
    <ExperienceStateContext.Provider value={value}>
      {children}
    </ExperienceStateContext.Provider>
  )
}

export function useExperienceState() {
  const value = useContext(ExperienceStateContext)
  if (!value) throw new Error('useExperienceState must be used inside ExperienceStateProvider')
  return value
}
