import { useMemo } from 'react'
import { useExperienceState } from './experience-state-react.jsx'
import { usePreviewBoardUnread } from './preview-board-unread.js'
import { buildLiveClassHubModel, LIVE_CLASS_HUB_VERSION } from './stage5-class-hub-model.js'
import './stage5-class-hub.css'

export function Stage5LiveClassHub({ profile, presence }) {
  const state = useExperienceState()
  const boardUnread = usePreviewBoardUnread(profile)
  const model = useMemo(
    () => buildLiveClassHubModel({ state, profile, presence, boardUnread }),
    [state, profile, presence, boardUnread],
  )

  return (
    <header
      className="stage5-class-hub"
      data-stage5-class-hub={LIVE_CLASS_HUB_VERSION}
      data-stage5-class-tone={model.tone}
      aria-label={`${model.classLabel} 현재 상태`}
    >
      <div className="stage5-class-hub-primary">
        <div className="stage5-class-hub-meta">
          <span>{model.classLabel}</span>
          <span className="stage5-class-live"><i aria-hidden="true" />LIVE</span>
        </div>
        <div className="stage5-class-hub-copy">
          <p>{model.eyebrow}</p>
          <h1>{model.title}</h1>
          <span>{model.detail}</span>
        </div>
      </div>

      <div className="stage5-class-hub-signals" aria-label="우리 반 실시간 요약">
        {model.signals.map((signal) => (
          <div
            className={`stage5-class-hub-signal ${signal.active ? 'is-active' : ''}`}
            key={signal.label}
          >
            <small>{signal.label}</small>
            <strong>{signal.value}</strong>
            <span>{signal.detail}</span>
          </div>
        ))}
      </div>
    </header>
  )
}
