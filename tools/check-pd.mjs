/**
 * One-off checks after the "you may also like" fix and the services-page
 * responsive pass:
 *   1. Clicking a related card on a product page swaps to that product
 *      (URL + title + scroll-to-top), twice in a row.
 *   2. The three Services pages at 390px have no horizontal overflow,
 *      their journey paragraphs wrap, their [innerHTML] icons render,
 *      and their photo slots are present.
 * Not part of the app; safe to delete.
 *
 *   1. node tools/serve-dist.mjs 4300
 *   2. Chrome/Edge --headless=new --remote-debugging-port=9222
 *   3. node tools/check-pd.mjs [base]
 */
const base = process.argv[2] || 'http://127.0.0.1:4300';

const targets = await (await fetch('http://127.0.0.1:9222/json')).json();
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
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const evaluate = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true });
  if (r.result?.exceptionDetails) throw new Error('eval: ' + JSON.stringify(r.result.exceptionDetails));
  return r.result?.result?.value;
};

let pass = 0;
let fail = 0;
const ok = (cond, label) => {
  if (cond) { pass++; console.log('  PASS', label); }
  else { fail++; console.log('  FAIL', label); }
};

await send('Page.enable');
await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });

const go = async (path, wait = 3200) => {
  await send('Page.navigate', { url: base + path });
  await sleep(wait);
  await evaluate(`document.querySelector('app-signature-loader')?.remove(); true`);
};

/* ---- 1. Related product click swaps the dynamic page ---- */
console.log('product-detail related click:');
await go('/marketplace');
const firstHref = await evaluate(`document.querySelector('a[href^="/product/"]')?.getAttribute('href') ?? ''`);
if (!firstHref) {
  ok(false, 'found a product link on the marketplace');
} else {
  await go(firstHref);
  const start = await evaluate(`JSON.stringify({ path: location.pathname, title: document.querySelector('.pd-title')?.textContent?.trim() })`);
  const startObj = JSON.parse(start);
  ok(startObj.title, `loaded ${startObj.path} with a title`);

  for (let i = 0; i < 2; i++) {
    const hasCard = await evaluate(`document.querySelectorAll('.pd-also-card').length > 0`);
    ok(hasCard, `round ${i + 1}: also-like cards present`);
    const before = JSON.parse(await evaluate(`JSON.stringify({ path: location.pathname, title: document.querySelector('.pd-title')?.textContent?.trim() })`));
    await evaluate(`document.querySelector('.pd-also-card').click(); true`);
    await sleep(1100);
    const after = JSON.parse(await evaluate(`JSON.stringify({ path: location.pathname, title: document.querySelector('.pd-title')?.textContent?.trim(), y: window.scrollY })`));
    ok(after.path !== before.path && after.path.startsWith('/product/'), `round ${i + 1}: url moved ${before.path} -> ${after.path}`);
    ok(after.title && after.title !== before.title, `round ${i + 1}: title swapped "${before.title}" -> "${after.title}"`);
    ok(after.y < 5, `round ${i + 1}: scrolled to top (y=${after.y})`);
  }
}

/* ---- 2. Services pages at 390px ---- */
const PAGES = [
  { path: '/sourcing', shots: 6, iconSel: '.cluster-chip svg', iconMin: 11 },
  { path: '/shipping', shots: 4, iconSel: '.value-icon svg', iconMin: 5 },
  { path: '/business-solutions', shots: 4, iconSel: '.svc-shot__icon svg', iconMin: 4 },
];

for (const p of PAGES) {
  console.log(`services ${p.path} @390px:`);
  await go(p.path);
  const m = JSON.parse(await evaluate(`JSON.stringify({
    docW: document.documentElement.scrollWidth,
    bodyW: document.body.scrollWidth,
    winW: window.innerWidth,
    shots: document.querySelectorAll('.svc-shot').length,
    icons: document.querySelectorAll(${JSON.stringify(p.iconSel)}).length,
    h1: parseFloat(getComputedStyle(document.querySelector('.page-hero h1')).fontSize),
    journeyBad: [...document.querySelectorAll('.journey-step p')].filter(el => el.scrollWidth > el.clientWidth + 1).length,
    wrapOk: document.querySelector('main.svc-page') !== null,
  })`));
  ok(m.docW <= m.winW + 1 && m.bodyW <= m.winW + 1, `no horizontal overflow (doc=${m.docW}, body=${m.bodyW}, win=${m.winW})`);
  ok(m.shots === p.shots, `photo slots present (${m.shots}/${p.shots})`);
  ok(m.icons >= p.iconMin, `[innerHTML] icons render (${m.icons} >= ${p.iconMin})`);
  ok(m.h1 <= 30, `hero h1 mobile-sized (${m.h1}px)`);
  ok(m.journeyBad === 0, `journey paragraphs wrap (${m.journeyBad} overflowing)`);
  ok(m.wrapOk, 'main carries svc-page class');
}

console.log(`\n${pass} passed, ${fail} failed`);
ws.close();
process.exit(fail === 0 ? 0 : 1);
