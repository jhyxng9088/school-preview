from pathlib import Path
import sys

if len(sys.argv) != 3:
    raise SystemExit('usage: patch.py <production-source> <main-sha>')

root = Path(sys.argv[1])
baseline = sys.argv[2]
preview_dir = Path(__file__).resolve().parent

# Production Vite owns the canonical V2 source-transform chain. Keep it intact and append
# one preview-only final owner so the quiet-spatial composition runs after every production
# migration/recovery transform has settled.
quiet_patch = root / 'src/quiet-spatial-preview-patch.js'
quiet_patch.write_text((preview_dir / 'quiet-source-patch.js').read_text())

vite = root / 'vite.config.js'
text = vite.read_text()
import_marker = "import { patchSharedIconOwnerSource } from './src/shared-icon-owner-patch.js'\n"
quiet_import = "import { patchQuietSpatialPreviewSource } from './src/quiet-spatial-preview-patch.js'\n"
if text.count(import_marker) != 1:
    raise SystemExit('Vite final owner import marker changed')
text = text.replace(import_marker, import_marker + quiet_import, 1)

owner_marker = "  next = patchSharedIconOwnerSource(next, cleanId)\n  return next"
owner_replacement = "  next = patchSharedIconOwnerSource(next, cleanId)\n  next = patchQuietSpatialPreviewSource(next, cleanId)\n  return next"
if text.count(owner_marker) != 1:
    raise SystemExit('Vite final owner chain marker changed')
text = text.replace(owner_marker, owner_replacement, 1)

base_marker = "base: '/school/',"
if text.count(base_marker) != 1:
    raise SystemExit('Vite base marker changed')
text = text.replace(base_marker, "base: '/school-preview/',", 1)
vite.write_text(text)

# Preview runtime isolation. Never let preview identities, local keys or service-worker
# cleanup collide with production.
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
tone_line = "const NOTIFICATION_PROFILE_CACHE = 'school-notification-profile-v1'"
cleanup = ".filter((key) => ![CACHE_NAME, NOTIFICATION_PROFILE_CACHE].includes(key))"
if not cache_line or tone_line not in text or cleanup not in text:
    raise SystemExit('Service worker markers changed')
text = text.replace(cache_line, "const CACHE_NAME = 'school-preview-shell-quiet-spatial-v1'", 1)
text = text.replace(tone_line, "const NOTIFICATION_PROFILE_CACHE = 'school-preview-notification-profile-quiet-spatial-v1'", 1)
text = text.replace(cleanup, ".filter((key) => key.startsWith('school-preview-') && ![CACHE_NAME, NOTIFICATION_PROFILE_CACHE].includes(key))", 1)
app_shell = "const APP_SHELL = ["
if text.count(app_shell) != 1:
    raise SystemExit('App shell marker changed')
text = text.replace(app_shell, "const APP_SHELL = ['./preview-dark-ui.css', ", 1)
sw.write_text(text)

# GitHub Pages path + immutable preview markers.
index = root / 'index.html'
text = index.read_text()
if text.count('</head>') != 1:
    raise SystemExit('index head marker changed')
inject = (
    f'<meta name="s-hub-preview-baseline" content="{baseline}" />'
    '<meta name="s-hub-preview-layer" content="quiet-spatial-v1" />'
    '<link rel="stylesheet" href="./preview-dark-ui.css?v=13" />'
)
index.write_text(text.replace('</head>', inject + '</head>', 1))
