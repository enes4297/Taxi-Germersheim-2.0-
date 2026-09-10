from pathlib import Path
import re

root = Path(r'C:\Users\enesc\Documents\GitHub\Taxi-Germersheim-2.0-\admin')
standard = [
    '<script src="supabase-config.js"></script>',
    '<script src="supabase-auth.js"></script>',
    '<script src="auth.js"></script>',
]

for path in sorted(root.glob('*.html')):
    if path.name == 'login.html':
        continue
    text = path.read_text(encoding='utf-8')
    text = text.replace('`r`n', '').replace('`r`n', '')
    if 'auth.js' not in text:
        continue

    head_match = re.search(r'(?is)<head\b.*?</head>', text)
    if not head_match:
        continue

    head = head_match.group(0)
    script_pattern = re.compile(r'(?is)<script\b[^>]*>.*?</script>')
    script_tags = script_pattern.findall(head)
    other_scripts = []
    for tag in script_tags:
        src_match = re.search(r'(?is)src=(?:["\']([^"\']+)["\']|([^\s>]+))', tag)
        if src_match:
            src = (src_match.group(1) or src_match.group(2) or '').strip().lower()
            if src in {'supabase-config.js', 'supabase-auth.js', 'auth.js'}:
                continue
        if tag.strip():
            other_scripts.append(tag.strip())

    head_without_scripts = script_pattern.sub('\n', head)
    # Remove duplicate malformed markers left from earlier edits.
    head_without_scripts = head_without_scripts.replace('`r`n', '').replace('`r`n', '')
    head_without_scripts = re.sub(r'(?is)\n{3,}', '\n\n', head_without_scripts)

    insert_before = '<link' if '<link' in head_without_scripts.lower() else '</head>'
    ix = head_without_scripts.lower().find(insert_before.lower()) if insert_before != '</head>' else head_without_scripts.rfind('</head>')

    if insert_before == '</head>':
        before = head_without_scripts[:ix]
        after = head_without_scripts[ix:]
    else:
        before = head_without_scripts[:ix]
        after = head_without_scripts[ix:]

    insert = '\n  ' + '\n  '.join(standard + other_scripts) + '\n'
    new_head = before.rstrip() + insert + after.lstrip()
    new_text = text[:head_match.start()] + new_head + text[head_match.end():]
    path.write_text(new_text, encoding='utf-8')
    print(f'updated {path.name}')
