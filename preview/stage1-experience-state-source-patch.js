function replaceExact(source, marker, replacement, label) {
  const text = String(source || '')
  const count = text.split(marker).length - 1
  if (count !== 1) throw new Error(`Experience State Stage 1 patch drift (${label}): expected 1, found ${count}`)
  return text.replace(marker, replacement)
}

function patchMainSource(source) {
  let next = String(source || '')
  const importMarker = "import { openClassRoster } from './class-roster-ui-v2.js'\n"
  const experienceImport = "import { ExperienceStateProvider } from './experience-state-react.jsx'\n"
  if (!next.includes(experienceImport)) {
    next = replaceExact(next, importMarker, `${importMarker}${experienceImport}`, 'main experience import')
  }

  next = replaceExact(
    next,
    'function Home({ profile, name, now, weeklySchedule, overrides, schoolData, todoData, presence, academicData, onOpenAI, onNavigate }) {',
    'function Home({ profile, name, now, weeklySchedule, overrides, schoolState, schoolData, todoData, presence, academicData, onOpenAI, onNavigate }) {',
    'home state prop',
  )
  next = replaceExact(
    next,
    '  const schoolState = getSchoolState(now, weeklySchedule, overrides)\n',
    '',
    'retire duplicate home school state calculation',
  )
  next = replaceExact(
    next,
    '  const { toast, requireOnline } = useNetworkGuard()\n',
    '  const { online, toast, requireOnline } = useNetworkGuard()\n',
    'network owner signal',
  )
  next = replaceExact(
    next,
    '  const activity = useClassActivity(profile)\n',
    `  const activity = useClassActivity(profile)\n  const experienceSchoolState = useMemo(\n    () => getSchoolState(now, weeklySchedule, overrides),\n    [now, weeklySchedule, overrides],\n  )\n`,
    'single app school state calculation',
  )
  next = replaceExact(
    next,
    '      <Home\n        profile={profile}\n        onNavigate={navigateHomeSignal}\n',
    '      <Home\n        profile={profile}\n        onNavigate={navigateHomeSignal}\n        schoolState={experienceSchoolState}\n',
    'home state wiring',
  )
  next = replaceExact(
    next,
    '  return (\n    <div className="app-shell">',
    `  return (\n    <ExperienceStateProvider\n      now={now}\n      schoolState={experienceSchoolState}\n      academicEvents={schoolData?.academicEvents || []}\n      todos={todoData.todos}\n      online={online}\n    >\n      <div className="app-shell">`,
    'experience provider open',
  )
  next = replaceExact(
    next,
    '      <OfflineToast toast={toast} />\n    </div>\n  )\n}\n\nfunction App()',
    '      <OfflineToast toast={toast} />\n      </div>\n    </ExperienceStateProvider>\n  )\n}\n\nfunction App()',
    'experience provider close',
  )
  return next
}

function patchStudySource(source) {
  let next = String(source || '')
  const cssImport = "import './preview-study.css'\n"
  const bridgeImport = "import { publishExperienceStudySignal } from './experience-state-study-bridge.js'\n"
  if (!next.includes(bridgeImport)) {
    next = replaceExact(next, cssImport, `${cssImport}${bridgeImport}`, 'study bridge import')
  }

  next = replaceExact(
    next,
    '  const myActive = me?.active || null\n',
    `  const myActive = me?.active || null\n\n  useEffect(() => {\n    publishExperienceStudySignal(myActive, { known: Boolean(snapshot) })\n  }, [myActive, snapshot])\n`,
    'canonical study signal bridge',
  )
  return next
}

export function patchExperienceStateSource(source, id = '') {
  const cleanId = String(id || '').split('?')[0]
  if (cleanId.endsWith('/main.jsx')) return patchMainSource(source)
  if (cleanId.endsWith('/preview-study.jsx')) return patchStudySource(source)
  return String(source || '')
}
