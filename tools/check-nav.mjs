/**
 * Desktop nav geometry check. A nav is a single line that has to survive every
 * width between the hamburger breakpoint and the widest desktop, and the only
 * honest test is to measure it: does it wrap, does it overflow, and does Home
 * light up on exactly one route?
 *
 *   node tools/check-nav.mjs [baseUrl]
 */
const base = process.argv[2] || 'http://127.0.0.1:4300';

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

await send('Page.enable');

const out = [];
const add = (name, pass, detail) => out.push({ name, pass, detail: String(detail ?? '') });

// 1081px is where the desktop nav reappears; 1300px is where its tightened
// rhythm relaxes again. 1440 is the widest the container gets. Below 1081 the
// nav is meant to be gone, which is checked separately.
const WIDTHS = [1081, 1100, 1180, 1280, 1301, 1366, 1367, 1440, 1920];

for (const width of WIDTHS) {
  await send('Emulation.setDeviceMetricsOverride', {
    width,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await send('Page.navigate', { url: base + '/' });
  await sleep(2200);
  await evaluate(`document.querySelector('app-signature-loader')?.remove(); true`);

  const geo = JSON.parse(
    await evaluate(`(() => {
      const nav = document.querySelector('nav.main-nav');
      if (!nav) return JSON.stringify({ missing: true });
      const navR = nav.getBoundingClientRect();
      // A single-line link is 43px tall (11px padding either side of a ~21px
      // line). A row that has wrapped onto a second line is taller than that, and
      // that height is the only reliable signal: comparing the top offset of each
      // child reports the theme toggle and the absolutely-positioned dropdown
      // panels as separate rows, which they are not.
      const linkH = Math.round(
        nav.querySelector(':scope > a').getBoundingClientRect().height,
      );
      // Eight destinations, but two of them are dropdown triggers rather than
      // anchors, so this counts both shapes.
      const items = nav.querySelectorAll(':scope > a, :scope > .nav-dropdown');
      // The logo carries margin-right:auto, so the row's real demand is the sum
      // of what is there, not the right-hand edge: at a wide viewport the edge
      // is pinned by the container and tells you nothing about crowding.
      const cs = getComputedStyle(document.querySelector('.header-inner'));
      const kids = [...document.querySelector('.header-inner').children].filter(
        (e) => getComputedStyle(e).display !== 'none',
      );
      const demand = Math.round(
        kids.reduce((a, e) => a + e.getBoundingClientRect().width, 0) +
          (kids.length - 1) * parseFloat(cs.gap) +
          parseFloat(cs.paddingLeft) +
          parseFloat(cs.paddingRight),
      );
      return JSON.stringify({
        linkH,
        navH: Math.round(navR.height),
        demand,
        vw: window.innerWidth,
        fits: demand <= window.innerWidth,
        itemCount: items.length,
        firstItem: (items[0]?.textContent || '').trim().slice(0, 12),
      });
    })()`),
  );

  if (geo.missing) {
    add(`${width}px nav present`, false, 'no nav.main-nav');
    continue;
  }
  // The nav must not grow past the height of its own tallest single line, which
  // is what wrapping "Business Solutions" would do.
  add(`${width}px nav has not wrapped`, geo.navH <= geo.linkH, `nav ${geo.navH} vs link ${geo.linkH}`);
  add(`${width}px header fits the viewport`, geo.fits, `needs ${geo.demand}, has ${geo.vw}`);
  add(`${width}px Home leads`, geo.firstItem === 'Home', geo.firstItem);
  add(`${width}px eight nav items`, geo.itemCount === 8, geo.itemCount);
}

// Below the nav's own threshold the row is the hamburger, the cart and the
// icon-only search. Every one of those has to still be reachable, and the row
// still has to fit: this is the band that used to lose the search button.
for (const width of [360, 620, 980, 1000, 1080]) {
  await send('Emulation.setDeviceMetricsOverride', {
    width,
    height: 900,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await send('Page.navigate', { url: base + '/' });
  await sleep(2000);
  await evaluate(`document.querySelector('app-signature-loader')?.remove(); true`);

  const m = JSON.parse(
    await evaluate(`(() => {
      const vis = (sel) => {
        const el = document.querySelector(sel);
        if (!el) return false;
        return getComputedStyle(el).display !== 'none';
      };
      const inner = document.querySelector('.header-inner');
      const cs = getComputedStyle(inner);
      const kids = [...inner.children].filter((e) => getComputedStyle(e).display !== 'none');
      const demand = Math.round(
        kids.reduce((a, e) => a + e.getBoundingClientRect().width, 0) +
          (kids.length - 1) * parseFloat(cs.gap) +
          parseFloat(cs.paddingLeft) +
          parseFloat(cs.paddingRight),
      );
      return JSON.stringify({
        navHidden: !vis('nav.main-nav'),
        burger: vis('.menu-toggle'),
        iconSearch: vis('.header-icon-btn'),
        cart: vis('.cart-btn'),
        demand,
        vw: window.innerWidth,
      });
    })()`),
  );

  add(`${width}px desktop nav is gone`, m.navHidden, m.navHidden);
  add(`${width}px hamburger is there`, m.burger, m.burger);
  add(`${width}px search is still reachable`, m.iconSearch, m.iconSearch);
  add(`${width}px cart is still reachable`, m.cart, m.cart);
  add(`${width}px header fits`, m.demand <= m.vw, `needs ${m.demand}, has ${m.vw}`);
}

// Active state: Home is the one link that must not light up everywhere.
const ACTIVE = `(() => {
  const nav = document.querySelector('nav.main-nav');
  const on = [...nav.querySelectorAll(':scope > a')]
    .filter((a) => a.classList.contains('active'))
    .map((a) => a.textContent.trim());
  return JSON.stringify(on);
})()`;

for (const [route, expected] of [
  ['/', 'Home'],
  ['/marketplace', 'Marketplace'],
  ['/sourcing', 'Sourcing'],
  ['/contact', 'Contact'],
]) {
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await send('Page.navigate', { url: base + route });
  await sleep(2000);
  await evaluate(`document.querySelector('app-signature-loader')?.remove(); true`);
  const on = JSON.parse(await evaluate(ACTIVE));
  add(`on ${route} only "${expected}" is active`, on.length === 1 && on[0] === expected, on.join(',') || 'none');
}

let fail = 0;
for (const r of out) {
  if (!r.pass) fail++;
  console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.name}   (${r.detail})`);
}
console.log(`\n${out.length - fail}/${out.length} passed`);
ws.close();
process.exit(fail ? 1 : 0);
