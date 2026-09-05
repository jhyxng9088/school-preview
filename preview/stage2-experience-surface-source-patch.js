function replaceExact(source, marker, replacement, label) {
  const text = String(source || '')
  const count = text.split(marker).length - 1
  if (count !== 1) throw new Error(`Experience Surface Stage 2 patch drift (${label}): expected 1, found ${count}`)
  return text.replace(marker, replacement)
}

function patchMainSource(source) {
  let next = String(source || '')
  const importMarker = "import { ExperienceStateProvider } from './experience-state-react.jsx'\n"
  const surfaceImport = "import { ExperienceSurface } from './experience-surface.jsx'\n"
  if (!next.includes(surfaceImport)) {
    next = replaceExact(next, importMarker, `${importMarker}${surfaceImport}`, 'experience surface import')
  }

  next = replaceExact(
    next,
    '        <CurrentClassPreview schoolState={schoolState} now={now} />',
    '        <ExperienceSurface />',
    'home primary experience surface',
  )

  return next
}

export function patchExperienceSurfaceSource(source, id = '') {
  const cleanId = String(id || '').split('?')[0]
  if (cleanId.endsWith('/main.jsx')) return patchMainSource(source)
  return String(source || '')
}
