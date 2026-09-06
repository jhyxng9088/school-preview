from pathlib import Path
import re

OWNER_START = '/* S-HUB PREVIEW EXPERIENCE OWNER START */'
OWNER_END = '/* S-HUB PREVIEW EXPERIENCE OWNER END */'
VITE_START = '// S-HUB PREVIEW EXPERIENCE PIPELINE START'
VITE_END = '// S-HUB PREVIEW EXPERIENCE PIPELINE END'


def _strip_block(text, start_marker, end_marker, label):
    start_count = text.count(start_marker)
    end_count = text.count(end_marker)
    if start_count == 0 and end_count == 0:
        return text
    if start_count != 1 or end_count != 1:
        raise SystemExit(f'{label} marker drift')
    start = text.index(start_marker)
    end = text.index(end_marker, start) + len(end_marker)
    return (text[:start].rstrip() + '\n' + text[end:].lstrip()).rstrip() + '\n'


def _stage_source(preview_dir, filename, entry_name, replacements):
    path = preview_dir / filename
    if not path.exists():
        raise SystemExit(f'missing Preview owner source: {filename}')
    text = path.read_text()
    export_marker = f'export function {entry_name}'
    if text.count(export_marker) != 1:
        raise SystemExit(f'{filename} export marker drift')
    text = text.replace(export_marker, f'function {entry_name}', 1)
    for old, new in replacements:
        text = text.replace(old, new)
    return text.strip()


def _owner_block(preview_dir, stage):
    parts = []
    exports = []

    parts.append(_stage_source(
        preview_dir,
        'stage1-experience-state-source-patch.js',
        'patchExperienceStateSource',
        [
            ('replaceExact', 'stage1ReplaceExact'),
            ('patchMainSource', 'stage1PatchMainSource'),
            ('patchStudySource', 'stage1PatchStudySource'),
        ],
    ))
    exports.append('patchExperienceStateSource')

    if stage >= 2:
        parts.append(_stage_source(
            preview_dir,
            'stage2-experience-surface-source-patch.js',
            'patchExperienceSurfaceSource',
            [
                ('replaceExact', 'stage2ReplaceExact'),
                ('patchMainSource', 'stage2PatchMainSource'),
            ],
        ))
        exports.append('patchExperienceSurfaceSource')

    if stage >= 3:
        parts.append(_stage_source(
            preview_dir,
            'stage3-home-source-patch.js',
            'patchStage3HomeSource',
            [
                ('replaceExact', 'stage3ReplaceExact'),
                ('patchMainSource', 'stage3PatchMainSource'),
                ('patchHomeSignalsSource', 'stage3PatchHomeSignalsSource'),
                ('patchTodoSource', 'stage3PatchTodoSource'),
            ],
        ))
        exports.append('patchStage3HomeSource')

    return (
        f'{OWNER_START}\n'
        + '\n\n'.join(parts)
        + f"\n\nexport {{ {', '.join(exports)} }}\n"
        + f'{OWNER_END}\n'
    )


def _vite_pipeline(stage):
    calls = ['  next = patchExperienceStateSource(next, cleanId)']
    if stage >= 2:
        calls.append('  next = patchExperienceSurfaceSource(next, cleanId)')
    if stage >= 3:
        calls.append('  next = patchStage3HomeSource(next, cleanId)')
    return (
        f'{VITE_START}\n'
        'function applyPreviewExperienceSource(source, cleanId) {\n'
        '  let next = String(source || \'\')\n'
        + '\n'.join(calls)
        + '\n  return next\n'
        '}\n'
        f'{VITE_END}\n\n'
    )


def apply_experience_owner(root, preview_dir, stage):
    if stage not in {1, 2, 3}:
        raise SystemExit(f'unsupported Preview experience stage: {stage}')

    owner = root / 'src/shared-segment-spring-owner-patch.js'
    if not owner.exists():
        raise SystemExit('canonical shared segment owner is missing')
    owner_text = _strip_block(owner.read_text(), OWNER_START, OWNER_END, 'Preview owner')
    owner.write_text(owner_text.rstrip() + '\n\n' + _owner_block(preview_dir, stage))

    vite = root / 'vite.config.js'
    vite_text = _strip_block(vite.read_text(), VITE_START, VITE_END, 'Preview Vite pipeline')

    import_pattern = re.compile(
        r"import \{ [^\n]*patchSharedSegmentSpringOwnerSource[^\n]* \} from './src/shared-segment-spring-owner-patch\.js'\n"
    )
    matches = import_pattern.findall(vite_text)
    if len(matches) != 1:
        raise SystemExit('shared segment owner import marker changed')

    imports = ['patchExperienceStateSource']
    if stage >= 2:
        imports.append('patchExperienceSurfaceSource')
    imports.append('patchSharedSegmentSpringOwnerSource')
    if stage >= 3:
        imports.append('patchStage3HomeSource')
    owner_import = f"import {{ {', '.join(imports)} }} from './src/shared-segment-spring-owner-patch.js'\n"
    vite_text = import_pattern.sub(owner_import, vite_text, count=1)

    function_marker = 'function replaceV2Source(source, id) {\n'
    if vite_text.count(function_marker) != 1:
        raise SystemExit('Vite replaceV2Source marker changed')
    vite_text = vite_text.replace(function_marker, _vite_pipeline(stage) + function_marker, 1)

    call_marker = '  next = patchSharedSegmentSpringOwnerSource(next, cleanId)\n  return next'
    call_with_preview = (
        '  next = patchSharedSegmentSpringOwnerSource(next, cleanId)\n'
        '  next = applyPreviewExperienceSource(next, cleanId)\n'
        '  return next'
    )
    if call_with_preview in vite_text:
        pass
    elif vite_text.count(call_marker) == 1:
        vite_text = vite_text.replace(call_marker, call_with_preview, 1)
    else:
        raise SystemExit('Vite final owner call marker changed')

    vite.write_text(vite_text)
