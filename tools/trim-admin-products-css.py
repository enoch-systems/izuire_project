import re
from pathlib import Path

p = Path('/Users/mac/Documents/OWEN/izuire_project/src/app/pages/admin/admin-products.ts')
t = p.read_text()
q1 = t.index('`', t.index('styles: [')) + 1
q2 = t.index('`', q1)
css = t[q1:q2]

subs = [
    # drop hover lift transitions, keep the color feedback
    ("transition:box-shadow 0.25s var(--ease),transform 0.25s var(--ease)}",
     "transition:box-shadow 0.25s var(--ease)}"),
    (".pcard:hover{box-shadow:0 18px 36px rgba(17,17,17,0.09);transform:translateY(-3px)}",
     ".pcard:hover{box-shadow:0 18px 36px rgba(17,17,17,0.09)}"),
    ("transition:transform 0.22s var(--ease),background 0.22s var(--ease),color 0.22s var(--ease)}",
     "transition:background 0.22s var(--ease),color 0.22s var(--ease)}"),
    (".btn-primary:hover:not(:disabled){background:var(--orange-deep);color:var(--white);transform:translateY(-1px)}",
     ".btn-primary:hover:not(:disabled){background:var(--orange-deep)}"),
    # shorter drawer animation
    ("animation:sheetIn 0.3s var(--ease)}", "animation:sheetIn 0.24s var(--ease)}"),
    ("@keyframes sheetIn{from{transform:translateX(48px);opacity:0}to{transform:none;opacity:1}}",
     "@keyframes sheetIn{from{transform:translateX(32px);opacity:0}}"),
    # drop redundant shadows/text-shadows and heavy filters
    ("box-shadow:0 2px 10px rgba(245,130,31,0.32);white-space:nowrap}", "white-space:nowrap}"),
    ("box-shadow:-24px 0 60px rgba(17,17,17,0.16);", "box-shadow:-16px 0 40px rgba(17,17,17,0.14);"),
    ("text-shadow:0 1px 6px rgba(255,255,255,0.9)}", "}"),
    ("filter:grayscale(0.55);opacity:0.82}", "opacity:0.82}"),
    ("box-shadow:0 0 0 4px rgba(245,130,31,0.14)}", "outline:2px solid var(--orange)}"),
    ("box-shadow:0 1px 0 rgba(0,0,0,0.08)}", "}"),
]
for old, new in subs:
    css = css.replace(old, new)

p.write_text(t[:q1] + css + t[q2:])
print('css chars:', len(css))
