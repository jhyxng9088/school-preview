import { useExperienceState } from './experience-state-react.jsx'
import {
  buildStage3ActionModel,
  buildStage3ContextModel,
  STAGE3_HOME_VERSION,
} from './stage3-home-flow-model.js'
import './stage3-home-flow.css'

export function Stage3ContextRail({ todos }) {
  const state = useExperienceState()
  const model = buildStage3ContextModel({ state, todos })

  return (
    <aside
      className="stage3-context-rail"
      data-stage3-home-version={STAGE3_HOME_VERSION}
      aria-label="현재 흐름 요약"
    >
      {model.segments.map((segment) => (
        <div className="stage3-context-segment" key={segment.label}>
          <small>{segment.label}</small>
          <strong>{segment.value}</strong>
          <span>{segment.meta}</span>
        </div>
      ))}
    </aside>
  )
}

export function Stage3ActionFocus({ todos, onNavigate }) {
  const state = useExperienceState()
  const model = buildStage3ActionModel({ state, todos })

  return (
    <button
      type="button"
      className="stage3-action-focus"
      data-stage3-action-tone={model.tone}
      data-stage3-home-version={STAGE3_HOME_VERSION}
      onClick={() => onNavigate?.('reminder')}
      aria-label="리마인더 열기"
    >
      <span className="stage3-action-indicator" aria-hidden="true" />
      <span className="stage3-action-copy">
        <small>{model.kicker}</small>
        <strong>{model.title}</strong>
        <span>{model.detail}</span>
      </span>
      <span className="stage3-action-chevron" aria-hidden="true">›</span>
    </button>
  )
}
