export const ROLE_SURFACE_VERSION = 'role-surface-stage4-v1'

export const ROLE_SURFACE_CONTRACT = Object.freeze({
  home: Object.freeze({
    station: 'home',
    surface: 'status',
    purpose: 'current-context',
    density: 'hero',
  }),
  class: Object.freeze({
    station: 'class',
    surface: 'navigation',
    purpose: 'shared-class-context',
    density: 'compact',
  }),
  schedule: Object.freeze({
    station: 'schedule',
    surface: 'navigation',
    purpose: 'plan-switching',
    density: 'compact',
  }),
  study: Object.freeze({
    station: 'study',
    surface: 'action',
    purpose: 'focused-action',
    density: 'control',
  }),
  ai: Object.freeze({
    station: 'ai',
    surface: 'workspace',
    purpose: 'assisted-work',
    density: 'workspace',
  }),
})

export function roleSurfaceFor(station) {
  const key = String(station || '').trim().toLowerCase()
  return ROLE_SURFACE_CONTRACT[key] || null
}

export function roleSurfaceSummary() {
  return Object.values(ROLE_SURFACE_CONTRACT).map(({ station, surface, purpose, density }) => ({
    station,
    surface,
    purpose,
    density,
  }))
}
