/**
 * Drives the built site over CDP to look at the auth, account and search work
 * rather than guess at it. One-off; safe to delete.
 *
 *   1. node tools/serve-dist.mjs 4300 &
 *   2. Google Chrome --headless=new --remote-debugging-port=9222 &
 *   3. node tools/shot-flow.mjs [outdir]
 */
import { mkdirSync, writeFileSync } from 'node:fs';

const out = process.argv[2] || '/tmp/izuire-shots';
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
  if (r.result?.exceptionDetails) console.error('eval error:', r.result.exceptionDetails.text);
  return r.result?.result?.value;
};

const viewport = (width, height = 1000, mobile = false) =>
  send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });

const go = async (url, wait = 2600) => {
  await send('Page.navigate', { url });
  await sleep(wait);
  await evaluate(`document.querySelector('app-signature-loader')?.remove(); true`);
};

const shot = async (name) => {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`${out}/${name}.png`, Buffer.from(r.result.data, 'base64'));
  console.log('shot', name);
};

const click = async (sel) => {
  const ok = await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return false; el.click(); return true; })()`);
  if (!ok) console.error('no element for', sel);
};

const type = async (sel, value) => {
  await evaluate(`(() => {
    const el = document.querySelector(${JSON.stringify(sel)});
    if (!el) return false;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(el, ${JSON.stringify(value)});
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  })()`);
};

await send('Page.enable');

// --- Desktop: home, signed out ---
await viewport(1440, 980);
await go('http://127.0.0.1:4300/');
await shot('01-home-signed-out');

// --- Search panel ---
await click('#searchOpenBtn');
await sleep(700);
await shot('02-search-open');
await type('#searchInput', 'solar');
await sleep(500);
await shot('03-search-query');
await evaluate(`document.querySelector('#searchCloseBtn')?.click(); true`);
await sleep(400);

// --- Log in through the modal ---
await click('.header-login-btn');
await sleep(600);
await type('#authTitle ~ * input, input[type=email]', 'user1@gmail.com');
await type('input[type=password]', '123456');
await click('.auth-form button[type=submit]');
await sleep(900);
await shot('04-auth-loader');
await sleep(4200);
await shot('05-home-signed-in');

// --- Account menu ---
await click('.account-menu-trigger');
await sleep(500);
await shot('06-account-menu');
await evaluate(`document.querySelector('.account-menu-trigger')?.click(); true`);
await sleep(300);

// --- Payments, reached by clicking the menu link rather than reloading, so the
// --- session (and the router) behave as they do for a real shopper ---
await click('.account-menu-links a[href="/account/payments"]');
await sleep(1200);
await shot('07-payments-all');
await click('.pay-tabs button:nth-child(2)');
await sleep(300);
await shot('08-payments-pending');
await click('.pay-row-toggle');
await sleep(300);
await shot('09-payments-open');

// --- The rail across the other account pages ---
await click('.account-nav-links a[href="/account/profile"]');
await sleep(1000);
await shot('10-profile');
await click('.account-nav-links a[href="/account/settings"]');
await sleep(1000);
await shot('11-settings');
await click('.account-nav-links a[href="/account/password"]');
await sleep(1000);
await shot('12-password');

// --- MD: search row under the nav, nav gone to the drawer ---
await viewport(900, 980);
await go('http://127.0.0.1:4300/');
await shot('13-md-home');

// --- Mobile: drawer with account links ---
await viewport(390, 844, true);
await go('http://127.0.0.1:4300/');
await shot('14-mobile-home');
await click('#menuToggle');
await sleep(700);
await shot('15-mobile-drawer');

// --- Logout: confirm + signing-out loader ---
await viewport(1440, 980);
await go('http://127.0.0.1:4300/');
await click('.account-menu-trigger');
await sleep(400);
await click('.account-menu-out');
await sleep(600);
await shot('16-logout-confirm');
await click('.confirm-go');
await sleep(900);
await shot('17-signing-out');
await sleep(2600);
await shot('18-after-logout');

console.log('done ->', out);
ws.close();
process.exit(0);
