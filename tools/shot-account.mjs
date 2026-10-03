/**
 * One-off: looks at the signed-in identity blocks (header account menu, profile
 * aside, mobile drawer) rather than guessing at them. Not part of the app; safe
 * to delete.
 *
 *   1. npm start  (dev server on :4200)
 *   2. Chrome/Edge --headless=new --remote-debugging-port=9222
 *   3. node tools/shot-account.mjs [url] [outdir]
 */
import { mkdirSync, writeFileSync } from 'node:fs';

const base = process.argv[2] || 'http://localhost:4200';
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
  if (r.result?.exceptionDetails) console.error('eval error:', r.result.exceptionDetails.text);
  return r.result?.result?.value;
};

const viewport = (width, height = 1000, mobile = false) =>
  send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });

const session = (over) =>
  JSON.stringify({
    name: 'Demo User',
    email: 'user1@gmail.com',
    phone: '+234 800 000 0000',
    company: 'Demo Trading Ltd.',
    memberTier: 'Verified',
    createdAt: '14 Mar 2026',
    ...over,
  });

/** Sign the mock session in, then land on `path`. */
const go = async (path = '/', wait = 2600, who = session()) => {
  await send('Page.navigate', { url: base + path });
  await sleep(1500);
  await evaluate(
    who
      ? `localStorage.setItem('izuire.session.v1', ${JSON.stringify(who)}); true`
      : `localStorage.removeItem('izuire.session.v1'); true`,
  );
  await send('Page.navigate', { url: base + path });
  await sleep(wait);
  await evaluate(`document.querySelector('app-signature-loader')?.remove(); true`);
};

const theme = (mode) =>
  evaluate(`document.documentElement.setAttribute('data-theme', ${JSON.stringify(mode)}); true`);

const shot = async (name) => {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`${out}/${name}.png`, Buffer.from(r.result.data, 'base64'));
  console.log('shot', name);
};

const click = async (sel) => {
  const ok = await evaluate(
    `(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return false; el.click(); return true; })()`,
  );
  if (!ok) console.error('no element for', sel);
};

await send('Page.enable');

// --- Desktop: the header account menu (holds the identity head + tier chip) ---
await viewport(1440, 980);
await go('/');
await click('.account-menu-trigger');
await sleep(600);
await shot('a1-desktop-account-menu');

// --- Desktop: the profile page, whose aside is the identity card ---
await go('/account/profile');
await shot('a2-desktop-profile-top');
await evaluate(`window.scrollTo(0, 260); true`);
await sleep(400);
await shot('a3-desktop-profile-aside');

// --- Mobile: signed-in drawer ---
await viewport(390, 844, true);
await go('/');
await click('#menuToggle');
await sleep(800);
await shot('a4-mobile-drawer');

// --- Narrow desktop: where the nav has gone but the page is not a phone ---
await viewport(1024, 900);
await go('/account/profile');
await shot('a5-narrow-profile');

// --- Mobile: the same drawer in dark mode ---
await viewport(390, 844, true);
await go('/');
await theme('dark');
await click('#menuToggle');
await sleep(800);
await shot('a6-mobile-drawer-dark');

// --- Mobile: a long name and the longest tier, to prove they truncate rather
// --- than wrap the header into a paragraph ---
await go('/', 2600, session({ name: 'Chukwuemeka Okonkwo', memberTier: 'Enterprise' }));
await theme('dark');
await click('#menuToggle');
await sleep(800);
await shot('a7-mobile-drawer-longname');

// --- Mobile: signed out, so the other branch of the drawer is still checked ---
await go('/', 2600, null);
await click('#menuToggle');
await sleep(800);
await shot('a8-mobile-drawer-signed-out');

// --- Desktop: header panel and profile card in dark mode ---
await viewport(1440, 980);
await go('/');
await theme('dark');
await click('.account-menu-trigger');
await sleep(600);
await shot('a9-desktop-menu-dark');
await go('/account/profile');
await theme('dark');
await evaluate(`window.scrollTo(0, 260); true`);
await sleep(400);
await shot('a10-desktop-aside-dark');

// --- The smallest common phone, and a short (landscape-ish) one, to check the
// --- identity block neither overflows nor starves the scrolling link list ---
await viewport(320, 568, true);
await go('/');
await click('#menuToggle');
await sleep(800);
await shot('a11-mobile-320-drawer');

await viewport(390, 430, true);
await go('/');
await click('#menuToggle');
await sleep(800);
await shot('a12-mobile-short-drawer');

console.log('done ->', out);
ws.close();
process.exit(0);