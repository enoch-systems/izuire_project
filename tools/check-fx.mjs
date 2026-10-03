/**
 * One-off: proves the display-currency pick does what it promises — NGN by
 * default on Payments, the dropdown swaps every figure, the choice persists,
 * and the marketplace, home, ticker and settings all re-read from it.
 * Not part of the app; safe to delete.
 *
 *   1. node tools/serve-dist.mjs 4300
 *   2. Chrome/Edge --headless=new --remote-debugging-port=9222
 *   3. node tools/check-fx.mjs [base] [outdir]
 */
import { mkdirSync, writeFileSync } from 'node:fs';

const base = process.argv[2] || 'http://127.0.0.1:4300';
const out = process.argv[3] || 'C:/Users/HP/Documents/OWENN/shots';
mkdirSync(out, { recursive: true });

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
  if (r.result?.exceptionDetails) {
    console.error('eval error:', JSON.stringify(r.result.exceptionDetails));
    return null;
  }
  return r.result?.result?.value;
};

const session = JSON.stringify({
  name: 'Demo User',
  email: 'user1@gmail.com',
  phone: '+234 800 000 0000',
  company: 'Demo Trading Ltd.',
  memberTier: 'Verified',
  createdAt: '14 Mar 2026',
});

/** Sign the mock session in, then land on `path` with a clean currency pick. */
const go = async (path, { fresh = false, wait = 2600 } = {}) => {
  await send('Page.navigate', { url: base + path });
  await sleep(1500);
  await evaluate(
    `localStorage.setItem('izuire.session.v1', ${JSON.stringify(session)});` +
      (fresh ? `localStorage.removeItem('izuire.currency.v1');` : '') +
      'true',
  );
  await send('Page.navigate', { url: base + path });
  await sleep(wait);
  await evaluate(`document.querySelector('app-signature-loader')?.remove(); true`);
};

/** Pick a currency the way a shopper does: set the select, fire change. */
const pick = async (sel, code) =>
  evaluate(`(() => {
    const s = document.querySelector(${JSON.stringify(sel)});
    if (!s) return false;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
    setter.call(s, ${JSON.stringify(code)});
    s.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  })()`);

const text = (sel) => evaluate(`document.querySelector(${JSON.stringify(sel)})?.textContent?.trim() ?? null`);
const value = (sel) => evaluate(`document.querySelector(${JSON.stringify(sel)})?.value ?? null`);
const stored = () => evaluate(`localStorage.getItem('izuire.currency.v1')`);

const shot = async (name) => {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`${out}/${name}.png`, Buffer.from(r.result.data, 'base64'));
  console.log('shot', name);
};

const results = [];
const check = (name, pass, detail) => {
  results.push({ name, pass });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}   (${detail})`);
};

await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', {
  width: 1440,
  height: 980,
  deviceScaleFactor: 1,
  mobile: false,
});

// --- Payments opens on NGN with no saved pick ---
await go('/account/payments', { fresh: true });
check('payments defaults to NGN', (await value('.pay-tools select')) === 'NGN', await value('.pay-tools select'));
check('paid-to-date reads in naira', (await text('.pay-card-value'))?.startsWith('₦') ?? false, await text('.pay-card-value'));
check('no pick is stored yet', (await stored()) === null, String(await stored()));
await shot('fx1-payments-ngn');

// --- Pick USD: every figure on the page swaps at once ---
await pick('.pay-tools select', 'USD');
await sleep(300);
check('paid-to-date converts with ≈', (await text('.pay-card-value'))?.includes('≈ $') ?? false, await text('.pay-card-value'));
check('row currency label follows', (await text('.pay-row-amount span')) === 'USD', await text('.pay-row-amount span'));
check('the pick is stored', (await stored()) === 'USD', String(await stored()));
await shot('fx2-payments-usd');

// --- The pick survives navigation: marketplace re-reads from it ---
await go('/marketplace');
check('marketplace select shows the saved pick', (await value('.mk-sheet select')) === 'USD', String(await value('.mk-sheet select')));
check('marketplace prices swap', (await text('.product-price'))?.includes('≈') ?? false, await text('.product-price'));
const activeCode = await evaluate(`document.querySelector('.rate-ticker__item.is-active .rate-ticker__code')?.textContent ?? null`);
check('ticker marks the picked currency', activeCode === 'USD', String(activeCode));
await shot('fx3-marketplace-usd');

// --- Home's featured rail answers it too ---
await go('/');
const featuredPrice = await text('.product-grid--featured .price-val');
check('home featured prices swap', featuredPrice?.includes('≈ $') ?? false, String(featuredPrice));
await shot('fx4-home-usd');

// --- Settings shows the same pick, not a private one ---
await go('/account/settings');
check('settings dropdown agrees', (await value('.fx-pick select')) === 'USD', String(await value('.fx-pick select')));
await shot('fx5-settings-usd');

// --- A fresh load keeps it: this is persistence, not session state ---
await send('Page.navigate', { url: base + '/marketplace' });
await sleep(2400);
await evaluate(`document.querySelector('app-signature-loader')?.remove(); true`);
check('the pick survives a reload', (await stored()) === 'USD', String(await stored()));
check('prices are still converted after reload', (await text('.product-price'))?.includes('≈') ?? false, await text('.product-price'));

// --- Hand the browser back on the default, so nothing is left changed ---
await evaluate(`localStorage.setItem('izuire.currency.v1', 'NGN'); true`);

const failed = results.filter((r) => !r.pass).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
ws.close();
process.exit(failed === 0 ? 0 : 1);
