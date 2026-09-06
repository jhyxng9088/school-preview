from pathlib import Path
import json
import sys

if len(sys.argv) != 4:
    raise SystemExit('usage: stage5-patch.py <production-source> <main-sha> <overlay|isolate>')

root = Path(sys.argv[1])
baseline = sys.argv[2]
phase = sys.argv[3]
if phase not in {'overlay', 'isolate'}:
    raise SystemExit(f'unknown Stage 5 patch phase: {phase}')

preview_dir = Path(__file__).resolve().parent

if phase == 'overlay':
    copies = {
        'stage5-class-hub-model.js': root / 'src/stage5-class-hub-model.js',
        'stage5-class-hub.jsx': root / 'src/stage5-class-hub.jsx',
        'stage5-class-hub.css': root / 'src/stage5-class-hub.css',
        'stage5-class-hub-source-patch.js': root / 'src/stage5-class-hub-source-patch.js',
        'stage5-class-hub.test.js': root / 'tests/stage5-class-hub.test.js',
    }
    for source_name, target in copies.items():
        source = preview_dir / source_name
        if not source.exists():
            raise SystemExit(f'missing Stage 5 control file: {source_name}')
        target.write_text(source.read_text())

    vite = root / 'vite.config.js'
    text = vite.read_text()
    import_marker = "import { patchStage4RoleSurfaceSource } from './src/stage4-role-surface-source-patch.js'\n"
    stage5_import = "import { patchStage5ClassHubSource } from './src/stage5-class-hub-source-patch.js'\n"
    owner_marker = (
        "  next = patchExperienceStateSource(next, cleanId)\n"
        "  next = patchExperienceSurfaceSource(next, cleanId)\n"
        "  next = patchStage3HomeSource(next, cleanId)\n"
        "  next = patchStage4RoleSurfaceSource(next, cleanId)\n"
        "  return next"
    )
    if text.count(import_marker) != 1 or text.count(owner_marker) != 1:
        raise SystemExit('Stage 4 final owner marker changed before Stage 5')
    text = text.replace(import_marker, import_marker + stage5_import, 1)
    text = text.replace(
        owner_marker,
        "  next = patchExperienceStateSource(next, cleanId)\n"
        "  next = patchExperienceSurfaceSource(next, cleanId)\n"
        "  next = patchStage3HomeSource(next, cleanId)\n"
        "  next = patchStage4RoleSurfaceSource(next, cleanId)\n"
        "  next = patchStage5ClassHubSource(next, cleanId)\n"
        "  return next",
        1,
    )
    vite.write_text(text)

if phase == 'isolate':
    sw = root / 'public/sw.js'
    text = sw.read_text()
    marker = "const PREVIEW_ROLE_SURFACE_REVISION = 'stage4-visual-v2'"
    stage5_marker = "const PREVIEW_LIVE_CLASS_HUB_LAYER = 'live-class-hub-stage5-v1'"
    if text.count(marker) != 1:
        raise SystemExit('Stage 4 service worker marker changed before Stage 5')
    if stage5_marker not in text:
        text = text.replace(marker, marker + "\n" + stage5_marker, 1)
    sw.write_text(text)

    index = root / 'index.html'
    text = index.read_text()
    marker = '<meta name="s-hub-preview-layer" content="role-surface-stage4-v1" />'
    replacement = (
        '<meta name="s-hub-preview-role-surface" content="role-surface-stage4-v1" />'
        '<meta name="s-hub-preview-layer" content="live-class-hub-stage5-v1" />'
    )
    if text.count(marker) != 1:
        raise SystemExit('Stage 4 preview layer marker changed before Stage 5')
    index.write_text(text.replace(marker, replacement, 1))

    smoke = {
        'version': 'live-class-hub-stage5-v1',
        'baseline': baseline,
        'surface': 'class-hub',
        'signals': ['current-class-state', 'next-class', 'class-presence', 'board-unread'],
        'navigation': ['timetable', 'board'],
        'principle': 'class-state-is-the-room',
    }
    (root / 'public/stage5-smoke.json').write_text(json.dumps(smoke, ensure_ascii=False, indent=2) + '\n')
