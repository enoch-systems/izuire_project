/**
 * Breadcrumb check: walks every route and reads the trail the page actually
 * renders — the label of each stop and the link it points at — so the
 * navigation is verified rather than assumed. The demo session is seeded before
 * the app boots, because the account pages keep their trail behind the gate.
 *
 *   node tools/check-breadcrumb.mjs [baseUrl]
 */
const base = process.argv[2] ?? 'http://127.0.0.1:4333';

/** [route, expected stops as [label, href]] — the last stop is never a link. */
const ROUTES = [
  ['/about', [['Home', '/'], ['About', null]]],
  ['/contact', [['Home', '/'], ['Contact', null]]],
  ['/insights', [['Home', '/'], ['Izuire Insights', null]]],
  ['/faq', [['Home', '/'], ['FAQ', null]]],
  ['/fax', [['Home', '/'], ['FAQ', null]]],
  ['/quote', [['Home', '/'], ['Request a Quote', null]]],
  ['/business-solutions', [['Home', '/'], ['Business Solutions', null]]],
  ['/shipping', [['Home', '/'], ['Shipping & Logistics', null]]],
  ['/sourcing', [['Home', '/'], ['Sourcing & Procurement', null]]],
  ['/marketplace', [['Home', '/'], ['Marketplace', null]]],
  ['/cart', [['Home', '/'], ['Cart', null]]],
  ['/legal', [['Home', '/'], ['Legal', null]]],
  [
    '/product/phone-screens-a-grade',
    [['Home', '/'], ['Marketplace', '/marketplace'], ['A-Grade Phone Screens (Assorted)', null]],
  ],
  ['/account/profile', [['Home', '/'], ['Account', '/account'], ['Profile', null]]],
  ['/account/payments', [['Home', '/'], ['Account', '/account'], ['Payments', null]]],
  ['/account/settings', [['Home', '/'], ['Account', '/account'], ['Settings', null]]],
  ['/account/password', [['Home', '/'], ['Account', '/account'], ['Change password', null]]],
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
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
const evaluate = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.result?.exceptionDetails) {
    throw new Error(r.result.exceptionDetails.exception?.description ?? 'eval failed');
  }
  return r.result?.result?.value;
};

const READ = `(() => {
  const nav = document.querySelector('app-breadcrumb .breadcrumb');
  const host = document.querySelector('app-breadcrumb');
  return JSON.stringify({
    found: !!nav,
    aria: nav && nav.getAttribute('aria-label'),
    variantProduct: !!(host && host.querySelector('.breadcrumb--product')),
    seps: nav ? nav.querySelectorAll('.breadcrumb-sep').length : 0,
    stops: nav
      ? [...nav.querySelectorAll('a, .breadcrumb-current')].map((el) => ({
          label: el.textContent.trim(),
          href: el.getAttribute('href'),
          tag: el.tagName.toLowerCase(),
        }))
      : [],
  });
})()`;

const results = [];
const add = (name, pass, detail) => results.push({ name, pass, detail: String(detail ?? '') });
const read = async () => JSON.parse(await evaluate(READ));
const visit = async (path) => {
  await send('Page.navigate', { url: base + path });
  await sleep(1100);
  await evaluate(`document.querySelector('app-signature-loader')?.remove(); true`);
  return read();
};

await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', {
  width: 1280,
  height: 900,
  deviceScaleFactor: 1,
  mobile: false,
});
await send('Page.navigate', { url: 'about:blank' });
await sleep(300);
// Seeded before the app boots, so AuthService restores a session on construction
// rather than the gate card standing in for the account pages.
await send('Page.addScriptToEvaluateOnNewDocument', {
  source: `try {
    localStorage.setItem('izuire.session.v1', JSON.stringify({ name: 'Demo User', email: 'user1@gmail.com' }));
  } catch (e) {}`,
});

for (const [route, expected] of ROUTES) {
  const got = await visit(route);
  const trail = got.stops.map((s) => [s.label, s.href]);
  add(
    `${route} trail is ${expected.map((e) => e[0]).join(' / ')}`,
    JSON.stringify(trail) === JSON.stringify(expected),
    JSON.stringify(trail),
  );
  add(`${route} marks the current stop as text, not a link`, got.stops.at(-1)?.tag === 'span', got.stops.at(-1)?.tag);
  add(`${route} counts ${expected.length - 1} divider(s)`, got.seps === expected.length - 1, got.seps);
  add(`${route} is a labelled nav`, got.aria === 'Breadcrumb', got.aria);
}

// The home page is the root of the trail, so it must not carry one.
const home = await visit('/');
add('the home page carries no breadcrumb', home.found === false, home.found);

// Only the product page takes the roomier variant.
const product = await visit('/product/phone-screens-a-grade');
add('the product page uses the product variant', product.variantProduct === true, product.variantProduct);

// Clicking a stop must actually move the app, and the page it lands on must draw
// its own trail — the whole point of reading the trail from the route.
await evaluate(`document.querySelectorAll('app-breadcrumb .breadcrumb a')[1].click(); true`);
await sleep(900);
const after = JSON.parse(await evaluate(`JSON.stringify({ path: location.pathname, trail: ${READ} })`));
const afterTrail = JSON.parse(after.trail);
add('clicking the Marketplace stop routes to /marketplace', after.path === '/marketplace', after.path);
add(
  'the marketplace trail then stands alone',
  JSON.stringify(afterTrail.stops.map((s) => [s.label, s.href])) ===
    JSON.stringify([['Home', '/'], ['Marketplace', null]]),
  JSON.stringify(afterTrail.stops.map((s) => s.label)),
);

let failed = 0;
for (const r of results) {
  if (!r.pass) failed++;
  console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? `   (${r.detail})` : ''}`);
}
console.log(`\n${results.length - failed}/${results.length} passed`);
ws.close();
process.exit(failed ? 1 : 0);