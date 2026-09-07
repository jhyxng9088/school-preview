import { useExperienceState } from './experience-state-react.jsx'
import { openClassRoster } from './class-roster-ui-v2.js'
import {
  buildStage3ActionModel,
  buildStage3ContextModel,
  buildStage3HeadingModel,
  buildStage3LayoutModel,
  STAGE3_HOME_VERSION,
} from './stage3-home-flow-model.js'
import './stage3-home-flow.css'

export function Stage3HomeFrame({ children }) {
  const state = useExperienceState()
  const layout = buildStage3LayoutModel(state)

  return (
    <div
      className="home-stack stage3-live-home"
      data-home-lunch-ready="true"
      data-stage3-live-home={STAGE3_HOME_VERSION}
      data-stage3-mode={layout.mode}
      data-stage3-primary={layout.primary}
    >
      {children}
    </div>
  )
}

export function Stage3ZoneHeading({ zone, id, actionLabel = '', onAction }) {
  const state = useExperienceState()
  const model = buildStage3HeadingModel(zone, state)

  return (
    <div className="stage3-home-zone-heading" data-stage3-zone-heading={zone}>
      <div>
        {model.kicker ? <p>{model.kicker}</p> : null}
        <h2 id={id}>{model.title}</h2>
      </div>
      {actionLabel && onAction ? (
        <button type="button" className="stage3-zone-action" onClick={onAction}>
          {actionLabel}<span aria-hidden="true">›</span>
        </button>
      ) : null}
    </div>
  )
}

export function Stage3ContextRail({ todos }) {
  const state = useExperienceState()
  const model = buildStage3ContextModel({ state, todos })

  return (
    <aside
      className="stage3-context-rail"
      data-stage3-home-version={STAGE3_HOME_VERSION}
      data-stage3-mode={model.mode}
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
      onClick={() => onNavigate?.('todo')}
      aria-label="리마인더 열기"
    >
      <span className="stage3-action-icon" aria-hidden="true">✓</span>
      <span className="stage3-action-copy">
        <small>{model.kicker}</small>
        <strong>{model.title}</strong>
        <span>{model.detail}</span>
      </span>
      <span className="stage3-action-chevron" aria-hidden="true">›</span>
    </button>
  )
}

export function Stage3ClassPulse({ presence }) {
  const online = Math.max(0, Number(presence?.online || 0))
  const total = Math.max(0, Number(presence?.total || 0))
  const value = total > 0 ? `${online}/${total}명` : `${online}명`

  return (
    <section className="stage3-class-pulse" aria-label="지금 우리반">
      <div className="stage3-class-pulse-heading">
        <div>
          <p>실시간</p>
          <h2>지금 우리반</h2>
        </div>
        <span className={online > 0 ? 'is-live' : ''}>{online > 0 ? '접속 중' : '조용해요'}</span>
      </div>
      <button
        type="button"
        className="stage3-class-pulse-row"
        onClick={(event) => openClassRoster({ keyboard: event.detail === 0 })}
        aria-label="우리반 접속 현황 보기"
      >
        <span className="stage3-live-dot" aria-hidden="true" />
        <span>
          <strong>{value}</strong>
          <small>{online > 0 ? '현재 접속 중이에요.' : '현재 접속한 학생이 없어요.'}</small>
        </span>
        <span className="stage3-action-chevron" aria-hidden="true">›</span>
      </button>
    </section>
  )
}
