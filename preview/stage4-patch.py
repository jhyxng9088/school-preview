from pathlib import Path
import json
import sys

if len(sys.argv) != 4:
    raise SystemExit('usage: stage4-patch.py <production-source> <main-sha> <overlay|isolate>')

root = Path(sys.argv[1])
baseline = sys.argv[2]
phase = sys.argv[3]
if phase not in {'overlay', 'isolate'}:
    raise SystemExit(f'unknown Stage 4 patch phase: {phase}')

preview_dir = Path(__file__).resolve().parent

if phase == 'overlay':
    copies = {
        'stage4-role-surface-model.js': root / 'src/stage4-role-surface-model.js',
        'stage4-role-surface.css': root / 'src/stage4-role-surface.css',
        'stage4-role-surface-source-patch.js': root / 'src/stage4-role-surface-source-patch.js',
        'stage4-role-surface.test.js': root / 'tests/stage4-role-surface.test.js',
    }
    for source_name, target in copies.items():
        source = preview_dir / source_name
        if not source.exists():
            raise SystemExit(f'missing Stage 4 control file: {source_name}')
        target.write_text(source.read_text())

    vite = root / 'vite.config.js'
    text = vite.read_text()
    import_marker = "import { patchStage3HomeSource } from './src/stage3-home-source-patch.js'\n"
    stage4_import = "import { patchStage4RoleSurfaceSource } from './src/stage4-role-surface-source-patch.js'\n"
    owner_marker = (
        "  next = patchExperienceStateSource(next, cleanId)\n"
        "  next = patchExperienceSurfaceSource(next, cleanId)\n"
        "  next = patchStage3HomeSource(next, cleanId)\n"
        "  return next"
    )
    if text.count(import_marker) != 1 or text.count(owner_marker) != 1:
        raise SystemExit('Stage 3 final owner marker changed before Stage 4')
    text = text.replace(import_marker, import_marker + stage4_import, 1)
    text = text.replace(
        owner_marker,
        "  next = patchExperienceStateSource(next, cleanId)\n"
        "  next = patchExperienceSurfaceSource(next, cleanId)\n"
        "  next = patchStage3HomeSource(next, cleanId)\n"
        "  next = patchStage4RoleSurfaceSource(next, cleanId)\n"
        "  return next",
        1,
    )
    vite.write_text(text)

if phase == 'isolate':
    sw = root / 'public/sw.js'
    text = sw.read_text()
    marker = "const PREVIEW_LIVE_HOME_LAYER = 'live-home-stage3-v3'"
    stage4_marker = "const PREVIEW_ROLE_SURFACE_LAYER = 'role-surface-stage4-v1'"
    if text.count(marker) != 1:
        raise SystemExit('Stage 3 service worker marker changed before Stage 4')
    if stage4_marker not in text:
        text = text.replace(marker, marker + "\n" + stage4_marker, 1)
    sw.write_text(text)

    index = root / 'index.html'
    text = index.read_text()
    marker = '<meta name="s-hub-preview-layer" content="live-home-stage3-v3" />'
    replacement = (
        '<meta name="s-hub-preview-live-home" content="live-home-stage3-v3" />'
        '<meta name="s-hub-preview-layer" content="role-surface-stage4-v1" />'
    )
    if text.count(marker) != 1:
        raise SystemExit('Stage 3 preview layer marker changed before Stage 4')
    index.write_text(text.replace(marker, replacement, 1))

    smoke = {
        'version': 'role-surface-stage4-v1',
        'baseline': baseline,
        'stations': {
            'home': 'status',
            'class': 'navigation',
            'schedule': 'navigation',
            'study': 'action',
            'ai': 'workspace',
        },
        'principle': 'same-role-same-surface',
    }
    (root / 'public/stage4-smoke.json').write_text(json.dumps(smoke, ensure_ascii=False, indent=2) + '\n')
