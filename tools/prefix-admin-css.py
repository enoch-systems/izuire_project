"""One-off: raise the specificity of the admin rules lifted from
admin-products into global styles.css.

Component styles carry an extra [_ngcontent] attribute (class-level
specificity) and are injected after styles.css, so bare global rules like
`.editrow` would lose the tie against the component's generic `button {}` and
`button:hover {}` rules and the rows would render transparent. Prefixing the
interactive rules with `.sheet` (they all live inside the side sheet) makes
every winner deterministic.
"""
from pathlib import Path

styles = Path('/Users/mac/Documents/OWEN/izuire_project/src/styles.css')
text = styles.read_text()
marker = '/* ============ ADMIN CONSOLE ============ */'
head, tail = text.split(marker, 1)

hover_marker = '/* Hover corrections:'
moved, hovers = tail.split(hover_marker, 1)
hovers = hover_marker + hovers


def split_rules(block: str):
    """Yield top-level `selector{body}` chunks, keeping nested braces intact."""
    depth = 0
    start = 0
    for i, ch in enumerate(block):
        if ch == '{':
            depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0:
                yield block[start : i + 1]
                start = i + 1
    if block[start:].strip():
        yield block[start:]


PREFIX = ('.editrow', '.badgepick', '.pick', '.thumbs', '.checks', '.rowtext')

out = []
for rule in split_rules(moved):
    if rule.startswith('@keyframes'):
        out.append(rule)
        continue
    selectors, sep, rest = rule.partition('{')
    if not sep:
        out.append(rule)
        continue
    rewritten = []
    for sel in selectors.split(','):
        sel = sel.strip()
        if sel.startswith(PREFIX) and not sel.startswith('.sheet '):
            sel = '.sheet ' + sel
        rewritten.append(sel)
    out.append(','.join(rewritten) + '{' + rest)
moved = ''.join(out)

# Hover winners (written without the prefix in the previous step).
for old, new in (
    ('button.editrow:hover', '.sheet .editrow:hover'),
    ('.badgepick button', '.sheet .badgepick button'),
    ('.pick:hover', '.sheet .pick:hover'),
    ('.checks label', '.sheet .checks label'),
    ('.thumbs button', '.sheet .thumbs button'),
    ('.editrow:hover svg', '.sheet .editrow:hover svg'),
    ('.sheet .sheet ', '.sheet '),
):
    hovers = hovers.replace(old, new)

styles.write_text(head + marker + moved + hovers)
print('prefixed admin rules ok')
