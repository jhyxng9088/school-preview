import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  ROLE_SURFACE_CONTRACT,
  ROLE_SURFACE_VERSION,
  roleSurfaceFor,
  roleSurfaceSummary,
} from '../src/stage4-role-surface-model.js'
import { patchStage4RoleSurfaceSource } from '../src/stage4-role-surface-source-patch.js'

test('Stage 4 assigns one canonical surface role to each station', () => {
  assert.equal(ROLE_SURFACE_VERSION, 'role-surface-stage4-v1')
  assert.equal(roleSurfaceFor('home').surface, 'status')
  assert.equal(roleSurfaceFor('class').surface, 'navigation')
  assert.equal(roleSurfaceFor('schedule').surface, 'navigation')
  assert.equal(roleSurfaceFor('study').surface, 'action')
  assert.equal(roleSurfaceFor('ai').surface, 'workspace')
  assert.equal(roleSurfaceFor('unknown'), null)
  assert.deepEqual(roleSurfaceSummary().map((item) => item.station), ['home', 'class', 'schedule', 'study', 'ai'])
  assert.equal(Object.keys(ROLE_SURFACE_CONTRACT).length, 5)
})

test('Stage 4 tags the Home status and action owners without changing their behavior', () => {
  const experience = patchStage4RoleSurfaceSource(`export function X() {\n  return (\n    <section\n      className="experience-surface"\n      data-experience-primary={model.primary}\n    />\n  )\n}`, '/src/experience-surface.jsx')
  assert.match(experience, /data-role-surface="status"/)
  assert.match(experience, /data-role-station="home"/)

  const flow = patchStage4RoleSurfaceSource(`import './stage3-home-flow.css'\n\nexport function X() {\n  return (\n    <button\n      type="button"\n      className="stage3-action-focus"\n      data-stage3-action-tone={model.tone}\n    />\n  )\n}`, '/src/stage3-home-flow.jsx')
  assert.match(flow, /stage4-role-surface\.css/)
  assert.match(flow, /data-role-surface="action"/)
  assert.match(flow, /data-role-station="home"/)
})

test('Stage 4 makes Class and Schedule use the same navigation surface contract', () => {
  const source = `function A() {\n  return (\n    <section className="class-station-page">\n      <div ref={spring.containerRef} className="class-top-segment" role="group" aria-label="우리 반 메뉴" />\n    </section>\n  )\n}\nfunction B() {\n  return (\n    <section className="station-schedule-page">\n      <div ref={spring.containerRef} className="class-top-segment schedule-top-segment" role="group" aria-label="일정 세부 메뉴" />\n    </section>\n  )\n}`
  const next = patchStage4RoleSurfaceSource(source, '/src/main.jsx')
  assert.match(next, /data-role-surface="navigation" data-role-surface-version="role-surface-stage4-v1" data-role-station="class"/)
  assert.match(next, /data-role-surface="navigation" data-role-surface-version="role-surface-stage4-v1" data-role-station="schedule"/)
  assert.match(next, /class-station-page role-station-page/)
  assert.match(next, /station-schedule-page role-station-page/)
})

test('Stage 4 identifies Study as an action station while keeping live and ranking areas quieter', () => {
  const source = `function Control({ paused }) {\n  return <section className={\`preview-study-card preview-study-control-card\${paused ? ' is-paused' : ''}\`} />\n}\nfunction Live() { return <section className="preview-study-section" /> }\nfunction Rank() { return <section className="preview-study-section preview-study-ranking-section" /> }\nexport function Page() {\n  return (\n    <section className="preview-study-page">\n      <header className="page-header preview-study-header"><h1>스터디</h1></header>\n    </section>\n  )\n}`
  const next = patchStage4RoleSurfaceSource(source, '/src/preview-study.jsx')
  assert.match(next, /data-role-station="study"/)
  assert.match(next, /preview-study-header role-surface-heading/)
  assert.match(next, /data-role-surface="action"[^>]*data-role-station="study"/)
  assert.equal((next.match(/data-role-surface="collection"/g) || []).length, 2)
})

test('Stage 4 identifies the AI page as a workspace instead of another generic card', () => {
  const source = `return (\n  <section className="s-hub-ai-page" aria-label="S-Hub AI">\n    <header className="s-hub-ai-page-hero">AI</header>\n  </section>\n)`
  const next = patchStage4RoleSurfaceSource(source, '/src/s-hub-ai-sheet.jsx')
  assert.match(next, /s-hub-ai-page role-station-page/)
  assert.match(next, /data-role-surface="workspace"/)
  assert.match(next, /role-surface-heading/)
})

test('Stage 4 surface grammar stays declarative and does not add animation owners', () => {
  const css = readFileSync(new URL('../src/stage4-role-surface.css', import.meta.url), 'utf8')
  assert.match(css, /--role-surface-radius/)
  assert.match(css, /\[data-role-surface='status'\]/)
  assert.match(css, /\[data-role-surface='navigation'\]/)
  assert.match(css, /\[data-role-surface='action'\]/)
  assert.match(css, /\[data-role-surface='workspace'\]/)
  assert.doesNotMatch(css, /@keyframes/)
})
