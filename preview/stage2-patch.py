from pathlib import Path
import sys

if len(sys.argv) != 4:
    raise SystemExit('usage: stage2-patch.py <production-source> <main-sha> <overlay|isolate>')

root = Path(sys.argv[1])
baseline = sys.argv[2]
phase = sys.argv[3]
if phase not in {'overlay', 'isolate'}:
    raise SystemExit(f'unknown Stage 2 patch phase: {phase}')

preview_dir = Path(__file__).resolve().parent

if phase == 'overlay':
    copies = {
        'stage2-experience-surface-model.js': root / 'src/experience-surface-model.js',
        'stage2-experience-surface.jsx': root / 'src/experience-surface.jsx',
        'stage2-experience-surface.css': root / 'src/experience-surface.css',
        'stage2-experience-surface-source-patch.js': root / 'src/experience-surface-source-patch.js',
        'stage2-experience-surface.test.js': root / 'tests/experience-surface-stage2.test.js',
    }
    for source_name, target in copies.items():
        source = preview_dir / source_name
        if not source.exists():
            raise SystemExit(f'missing Stage 2 control file: {source_name}')
        target.write_text(source.read_text())

    vite = root / 'vite.config.js'
    text = vite.read_text()
    import_marker = "import { patchExperienceStateSource } from './src/experience-state-source-patch.js'\n"
    surface_import = "import { patchExperienceSurfaceSource } from './src/experience-surface-source-patch.js'\n"
    owner_marker = "  next = patchExperienceStateSource(next, cleanId)\n  return next"
    if text.count(import_marker) != 1 or text.count(owner_marker) != 1:
        raise SystemExit('Stage 1 final owner marker changed before Stage 2')
    text = text.replace(import_marker, import_marker + surface_import, 1)
    text = text.replace(
        owner_marker,
        "  next = patchExperienceStateSource(next, cleanId)\n  next = patchExperienceSurfaceSource(next, cleanId)\n  return next",
        1,
    )
    vite.write_text(text)

if phase == 'isolate':
    sw = root / 'public/sw.js'
    text = sw.read_text()
    stage1_cache = "const CACHE_NAME = 'school-preview-shell-experience-stage1-v1'"
    stage1_profile = "const NOTIFICATION_PROFILE_CACHE = 'school-preview-notification-profile-experience-stage1-v1'"
    if text.count(stage1_cache) != 1 or text.count(stage1_profile) != 1:
        raise SystemExit('Stage 1 preview cache markers changed before Stage 2')
    text = text.replace(stage1_cache, "const CACHE_NAME = 'school-preview-shell-experience-stage2-v1'", 1)
    text = text.replace(stage1_profile, "const NOTIFICATION_PROFILE_CACHE = 'school-preview-notification-profile-experience-stage2-v1'", 1)
    sw.write_text(text)

    index = root / 'index.html'
    text = index.read_text()
    marker = '<meta name="s-hub-preview-layer" content="experience-state-stage1-v1" />'
    replacement = (
        '<meta name="s-hub-preview-foundation" content="experience-state-stage1-v1" />'
        '<meta name="s-hub-preview-layer" content="experience-surface-stage2-v1" />'
    )
    if text.count(marker) != 1:
        raise SystemExit('Stage 1 preview layer marker changed before Stage 2')
    index.write_text(text.replace(marker, replacement, 1))
