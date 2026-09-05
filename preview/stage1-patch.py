from pathlib import Path
import sys

if len(sys.argv) not in {3, 4}:
    raise SystemExit('usage: stage1-patch.py <production-source> <main-sha> [all|overlay|isolate]')

root = Path(sys.argv[1])
baseline = sys.argv[2]
phase = sys.argv[3] if len(sys.argv) == 4 else 'all'
if phase not in {'all', 'overlay', 'isolate'}:
    raise SystemExit(f'unknown Stage 1 patch phase: {phase}')

preview_dir = Path(__file__).resolve().parent


def apply_overlay():
    copies = {
        'stage1-experience-state.js': root / 'src/experience-state.js',
        'stage1-experience-state-study-bridge.js': root / 'src/experience-state-study-bridge.js',
        'stage1-experience-state-react.jsx': root / 'src/experience-state-react.jsx',
        'stage1-experience-state-source-patch.js': root / 'src/experience-state-source-patch.js',
        'stage1-experience-state.test.js': root / 'tests/experience-state-stage1.test.js',
    }
    for source_name, target in copies.items():
        source = preview_dir / source_name
        if not source.exists():
            raise SystemExit(f'missing Stage 1 control file: {source_name}')
        target.write_text(source.read_text())

    # Production Vite remains the canonical owner for existing behavior. Stage 1 appends
    # one data-neutral Experience State transform after the current final source owner.
    vite = root / 'vite.config.js'
    text = vite.read_text()
    import_marker = "import { patchSharedIconOwnerSource } from './src/shared-icon-owner-patch.js'\n"
    experience_import = "import { patchExperienceStateSource } from './src/experience-state-source-patch.js'\n"
    if text.count(import_marker) != 1:
        raise SystemExit('Vite final owner import marker changed')
    text = text.replace(import_marker, import_marker + experience_import, 1)

    owner_marker = "  next = patchSharedIconOwnerSource(next, cleanId)\n  return next"
    owner_replacement = "  next = patchSharedIconOwnerSource(next, cleanId)\n  next = patchExperienceStateSource(next, cleanId)\n  return next"
    if text.count(owner_marker) != 1:
        raise SystemExit('Vite final owner chain marker changed')
    text = text.replace(owner_marker, owner_replacement, 1)
    vite.write_text(text)


def apply_isolation():
    # Preview route and runtime isolation are intentionally applied only after the
    # production regression suite has passed against the Stage 1 owner overlay.
    vite = root / 'vite.config.js'
    text = vite.read_text()
    base_marker = "base: '/school/',"
    if text.count(base_marker) != 1:
        raise SystemExit('Vite base marker changed')
    vite.write_text(text.replace(base_marker, "base: '/school-preview/',", 1))

    # Keep storage, Firebase identity and service-worker caches completely separate
    # from production without changing production source ownership.
    for folder in (root / 'src', root / 'public'):
        for path in folder.rglob('*'):
            if path.is_file() and path.suffix in {'.js', '.jsx', '.mjs'}:
                source = path.read_text()
                source = source.replace("'school.", "'school.preview.").replace('"school.', '"school.preview.')
                source = source.replace("'school-sync'", "'school-sync-preview'").replace('"school-sync"', '"school-sync-preview"')
                path.write_text(source)

    sync = root / 'src/school-sync.js'
    text = sync.read_text()
    identity = "return `${normalized.classNumber}|${normalized.studentNumber}|${compactName}`"
    preview_identity = "return `preview|${normalized.classNumber}|${normalized.studentNumber}|${compactName}`"
    class_key = "return normalized ? `class-${normalized.classNumber}` : ''"
    preview_class_key = "return normalized ? `preview-class-${normalized.classNumber}` : ''"
    if text.count(identity) != 1 or text.count(class_key) != 1:
        raise SystemExit('Firebase isolation markers changed')
    sync.write_text(text.replace(identity, preview_identity, 1).replace(class_key, preview_class_key, 1))

    sw = root / 'public/sw.js'
    text = sw.read_text()
    cache_line = next((line for line in text.splitlines() if line.startswith("const CACHE_NAME = 'school-shell-")), None)
    profile_line = "const NOTIFICATION_PROFILE_CACHE = 'school-notification-profile-v1'"
    cleanup = ".filter((key) => ![CACHE_NAME, NOTIFICATION_PROFILE_CACHE].includes(key))"
    if not cache_line or profile_line not in text or cleanup not in text:
        raise SystemExit('Service worker markers changed')
    text = text.replace(cache_line, "const CACHE_NAME = 'school-preview-shell-experience-stage1-v1'", 1)
    text = text.replace(profile_line, "const NOTIFICATION_PROFILE_CACHE = 'school-preview-notification-profile-experience-stage1-v1'", 1)
    text = text.replace(cleanup, ".filter((key) => key.startsWith('school-preview-') && ![CACHE_NAME, NOTIFICATION_PROFILE_CACHE].includes(key))", 1)
    sw.write_text(text)

    # Immutable artifact markers only. Stage 1 intentionally injects no CSS or visual shell.
    index = root / 'index.html'
    text = index.read_text()
    if text.count('</head>') != 1:
        raise SystemExit('index head marker changed')
    inject = (
        f'<meta name="s-hub-preview-baseline" content="{baseline}" />'
        '<meta name="s-hub-preview-layer" content="experience-state-stage1-v1" />'
    )
    index.write_text(text.replace('</head>', inject + '</head>', 1))


if phase in {'all', 'overlay'}:
    apply_overlay()
if phase in {'all', 'isolate'}:
    apply_isolation()
