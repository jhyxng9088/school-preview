import { useExperienceState } from './experience-state-react.jsx'
import { buildExperienceSurfaceModel } from './experience-surface-model.js'
import './experience-surface.css'

export function ExperienceSurface() {
  const state = useExperienceState()
  const model = buildExperienceSurfaceModel(state)

  return (
    <section
      className="experience-surface"
      data-experience-primary={model.primary}
      data-experience-tone={model.tone}
      aria-live="polite"
    >
      <div className="experience-surface-glow" aria-hidden="true" />
      <div className="experience-surface-topline">
        <p className="experience-surface-eyebrow">{model.eyebrow}</p>
        {model.badges.length ? (
          <div className="experience-surface-badges" aria-label="현재 상태 보조 정보">
            {model.badges.map((badge) => <span key={badge}>{badge}</span>)}
          </div>
        ) : null}
      </div>
      <div className="experience-surface-copy">
        <h2>{model.title}</h2>
        <p className="experience-surface-detail">{model.detail}</p>
      </div>
      {model.support ? <p className="experience-surface-support">{model.support}</p> : null}
    </section>
  )
}
