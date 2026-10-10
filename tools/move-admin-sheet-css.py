"""One-off: move the drawer/sheet/field-editor cluster from admin-products
component CSS (8 kB hard budget) into global styles.css, apply hover/zoom
fixes, and report the new sizes. Run once from the repo root."""
from pathlib import Path

root = Path('/Users/mac/Documents/OWEN/izuire_project')
ts = root / 'src/app/pages/admin/admin-products.ts'
styles = root / 'src/styles.css'

t = ts.read_text()
q1 = t.index('`', t.index('styles: [')) + 1
q2 = t.index('`', q1)
css = t[q1:q2]

# --- cut the overlay..sheet-actions block (it sits right before .empty) ---
start = css.index('.overlay{')
end = css.index('.empty{')
moved = css[start:end].rstrip()
assert moved.endswith('}'), moved[-80:]
rest = css[:start] + css[end:]

# --- component-side fixes -------------------------------------------------
reps = [
    # iOS zooms the viewport when a focused field is under 16px.
    ("input[type='text'],textarea,select{width:100%;padding:10px 12px;font-family:var(--font-d);font-weight:500;font-size:0.9rem;color:var(--ink);background:var(--white);border:1px solid var(--line);border-radius:7px;}",
     "input[type='text'],textarea{touch-action:manipulation;width:100%;padding:10px 12px;font-family:var(--font-d);font-weight:500;font-size:16px;color:var(--ink);background:var(--white);border:1px solid var(--line);border-radius:7px}"),
    # Back pill gets its own line above the kicker instead of sharing it.
    (".backbtn{display:inline-flex;", ".backbtn{display:flex;width:max-content;"),
    # Success flash reads off the mode-aware verify palette; failure flashes
    # get a dark-mode step (dark red on a dark plate otherwise).
    ("background:rgba(20,90,50,0.08);border:1px solid rgba(20,90,50,0.24);color:#14603a}",
     "background:var(--verify-tint);border:1px solid var(--verify-line);color:var(--verify)}"),
    (".flash--bad{background:rgba(180,40,40,0.07);border-color:rgba(180,40,40,0.24);color:#8a1c1c}",
     ".flash--bad{background:rgba(180,40,40,0.07);border-color:rgba(180,40,40,0.24);color:#8a1c1c}:root[data-theme='dark'] .flash--bad{background:rgba(255,110,110,.12);border-color:rgba(255,110,110,.3);color:#ff9d9d}"),
    # Cards lift like the dashboard's; the shadow is invisible on a dark plate.
    (".pcard:hover{box-shadow:0 18px 36px rgba(17,17,17,0.09)}",
     ".pcard:hover{box-shadow:0 18px 36px rgba(17,17,17,0.09);transform:translateY(-3px)}:root[data-theme='dark'] .pcard:hover{box-shadow:none}"),
    # The badge rows moved to the global sheet block; this alias is dead.
    ("button.is-on{background:var(--ink);color:var(--white)}", ""),
]
for old, new in reps:
    assert old in rest, 'missing: ' + old[:70]
    rest = rest.replace(old, new, 1)

# Primary buttons must not lose to the generic component button:hover.
rest += (".btn-primary:hover:not(:disabled){background:var(--orange-deep);color:var(--white)}"
         ".backbtn:hover:not(:disabled){border-color:var(--ink)}")

assert len(rest.encode()) < 8192, len(rest.encode())
print('component css ->', len(rest.encode()), 'bytes')

# --- rewrite the component styles template --------------------------------
t = t[:q1] + rest + t[q2:]
ts.write_text(t)

# --- append the lifted block + hover corrections to global styles.css -----
hovers = (
    "\n/* Hover corrections: the console's generic button:hover fills solid ink and\n"
    "   out-specifies bare class rules, so rows, pills and the selected badge row\n"
    "   each need an explicit winner. */\n"
    "button.editrow:hover:not(:disabled){background:rgba(245,130,31,.07);border-color:var(--line-strong);color:var(--ink)}\n"
    ".editrow:hover svg{stroke:var(--orange-deep)}\n"
    ".badgepick button:hover:not(.is-on){background:var(--paper);border-color:var(--line-strong);color:var(--ink)}\n"
    ".badgepick button.is-on:hover{background:var(--ink);color:var(--white);border-color:var(--ink)}\n"
    ".pick:hover{border-color:var(--orange);color:var(--ink)}\n"
    ".checks label:hover{color:var(--orange-deep)}\n"
    ".thumbs button:hover:not(:disabled){background:rgba(17,17,17,.92);color:#fff}\n"
)
section = (
    "\n/* ============ ADMIN CONSOLE ============ */\n"
    "/* Drawer, side sheet and field-editor styles lifted out of admin-products so\n"
    "   that component stays under its 8 kB style budget. Every class name here is\n"
    "   unique to the console templates (verified: overlay/sheet/editrow/badgepick/\n"
    "   rowtext/pick/thumbs/checks/flash/backbtn appear nowhere else in the app). */\n"
    + moved + hovers
)
with styles.open('a') as f:
    f.write(section)
print('styles.css +', len(section.encode()), 'bytes')
