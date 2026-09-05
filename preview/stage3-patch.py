from pathlib import Path
import json
import sys

if len(sys.argv) != 4:
    raise SystemExit('usage: stage3-patch.py <production-source> <main-sha> <overlay|isolate>')

root = Path(sys.argv[1])
baseline = sys.argv[2]
phase = sys.argv[3]
if phase not in {'overlay', 'isolate'}:
    raise SystemExit(f'unknown Stage 3 patch phase: {phase}')

preview_dir = Path(__file__).resolve().parent

if phase == 'overlay':
    copies = {
        'stage3-home-flow-model.js': root / 'src/stage3-home-flow-model.js',
        'stage3-home-flow.jsx': root / 'src/stage3-home-flow.jsx',
        'stage3-home-flow.css': root / 'src/stage3-home-flow.css',
        'stage3-home-source-patch.js': root / 'src/stage3-home-source-patch.js',
        'stage3-home-flow.test.js': root / 'tests/stage3-home-flow.test.js',
    }
    for source_name, target in copies.items():
        source = preview_dir / source_name
        if not source.exists():
            raise SystemExit(f'missing Stage 3 control file: {source_name}')
        target.write_text(source.read_text())

    vite = root / 'vite.config.js'
    text = vite.read_text()
    import_marker = "import { patchExperienceSurfaceSource } from './src/experience-surface-source-patch.js'\n"
    stage3_import = "import { patchStage3HomeSource } from './src/stage3-home-source-patch.js'\n"
    owner_marker = (
        "  next = patchExperienceStateSource(next, cleanId)\n"
        "  next = patchExperienceSurfaceSource(next, cleanId)\n"
        "  return next"
    )
    if text.count(import_marker) != 1 or text.count(owner_marker) != 1:
        raise SystemExit('Stage 2 final owner marker changed before Stage 3')
    text = text.replace(import_marker, import_marker + stage3_import, 1)
    text = text.replace(
        owner_marker,
        "  next = patchExperienceStateSource(next, cleanId)\n"
        "  next = patchExperienceSurfaceSource(next, cleanId)\n"
        "  next = patchStage3HomeSource(next, cleanId)\n"
        "  return next",
        1,
    )
    vite.write_text(text)

if phase == 'isolate':
    sw = root / 'public/sw.js'
    text = sw.read_text()
    marker = "const NOTIFICATION_PROFILE_CACHE = 'school-preview-notification-profile-experience-stage2-v1'"
    stage3_marker = "const PREVIEW_LIVE_HOME_LAYER = 'live-home-stage3-v2'"
    if text.count(marker) != 1:
        raise SystemExit('Stage 2 service worker marker changed before Stage 3')
    if stage3_marker not in text:
        text = text.replace(marker, marker + "\n" + stage3_marker, 1)
    sw.write_text(text)

    index = root / 'index.html'
    text = index.read_text()
    marker = '<meta name="s-hub-preview-layer" content="experience-surface-stage2-v1" />'
    replacement = (
        '<meta name="s-hub-preview-surface" content="experience-surface-stage2-v1" />'
        '<meta name="s-hub-preview-layer" content="live-home-stage3-v2" />'
    )
    if text.count(marker) != 1:
        raise SystemExit('Stage 2 preview layer marker changed before Stage 3')
    index.write_text(text.replace(marker, replacement, 1))

    smoke = {
        'version': 'live-home-stage3-v2',
        'baseline': baseline,
        'sequence': ['adaptive-hero', 'context-rail', 'timetable-flow', 'action-focus', 'reminders', 'class-live', 'upcoming'],
    }
    (root / 'public/stage3-smoke.json').write_text(json.dumps(smoke, ensure_ascii=False, indent=2) + '\n')
