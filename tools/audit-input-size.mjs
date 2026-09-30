/**
 * Form-control font-size audit. iOS Safari zooms the page on focus when a
 * field computes under 16px, so this walks every page at a phone width and
 * reports anything below the floor. One-off; safe to delete.
 *
 *   node tools/audit-input-size.mjs [baseUrl] [port]
 */
const base = process.argv[2] || 'http://127.0.0.1:4300';
const cdpPort = process.argv[3] || 9222;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const targets = await (await fetch(`http://127.0.0.1:${cdpPort}/json`)).json();
const page = targets.find((t) => t.type === 'page');
if (!page) throw new Error('no CDP page target');

const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
ws.addEventListener('message', (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
  }
});
await new Promise((res, rej) => {
  ws.addEventListener('open', res);
  ws.addEventListener('error', rej);
});
const send = (method, params = {}) =>
  new Promise((res) => {
    const i = ++id;
    pending.set(i, res);
    ws.send(JSON.stringify({ id: i, method, params }));
  });

const evaluate = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true });
  if (r.result?.exceptionDetails) {
    throw new Error(r.result.exceptionDetails.text + ' :: ' + expression.slice(0, 90));
  }
  return r.result?.result?.value;
};

await send('Page.enable');

// iPhone 14 Pro logical width. The floor is a CSS-pixel rule, so the exact
// device matters less than landing under the 620px breakpoint.
await send('Emulation.setDeviceMetricsOverride', {
  width: 393,
  height: 852,
  deviceScaleFactor: 3,
  mobile: true,
});

const PATHS = [
  '/',
  '/marketplace',
  '/contact',
  '/quote',
  '/shipping',
  '/about',
  '/sourcing',
  '/business-solutions',
  '/insights',
];

const PROBE = `(() => {
  const out = [];
  for (const el of document.querySelectorAll('input,select,textarea')) {
    if (el.type === 'hidden') continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue; // not rendered on this page
    const cs = getComputedStyle(el);
    out.push({
      tag: el.tagName.toLowerCase(),
      type: el.type || '',
      cls: (el.className || '').toString().slice(0, 40),
      id: el.id || '',
      px: Math.round(parseFloat(cs.fontSize) * 100) / 100,
    });
  }
  return JSON.stringify(out);
})()`;

let fails = 0;
let checked = 0;

for (const width of [393, 360]) {
  await send('Emulation.setDeviceMetricsOverride', {
    width,
    height: 852,
    deviceScaleFactor: 2,
    mobile: true,
  });
  console.log(`\n=== viewport ${width}px ===`);

  for (const p of PATHS) {
    await send('Page.navigate', { url: base + p });
    await sleep(2600);
    await evaluate(`document.querySelector('app-signature-loader')?.remove(); true`);

    const raw = await evaluate(PROBE);
    if (!raw) {
      console.log(`  ${p.padEnd(22)} (no controls rendered)`);
      continue;
    }
    const list = JSON.parse(raw);
    checked += list.length;
    const bad = list.filter((c) => c.px < 16);
    if (bad.length) {
      fails += bad.length;
      console.log(`  ${p.padEnd(22)} FAIL`);
      for (const b of bad) {
        console.log(`      ${b.px}px  ${b.tag}[${b.type}] .${b.cls} #${b.id}`);
      }
    } else if (list.length) {
      const sizes = [...new Set(list.map((c) => c.px))].sort((a, b) => a - b);
      console.log(`  ${p.padEnd(22)} ok  ${list.length} control(s) @ ${sizes.join('/')}px`);
    } else {
      console.log(`  ${p.padEnd(22)} (no controls rendered)`);
    }
  }
}

console.log(`\n==== ${checked} control(s) measured, ${fails} under 16px ====`);
ws.close();
process.exit(fails ? 1 : 0);
