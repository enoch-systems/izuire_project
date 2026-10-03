/**
 * One-off: looks at the profile page's type hierarchy (kickers, card heads,
 * label/value split, identity card) after the restyle, rather than guessing.
 * Not part of the app; safe to delete.
 *
 *   1. node tools/serve-dist.mjs 4300
 *   2. Chrome/Edge --headless=new --remote-debugging-port=9222
 *   3. node tools/shot-profile-hierarchy.mjs [base] [outdir]
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
  if (r.result?.exceptionDetails) console.error('eval error:', r.result.exceptionDetails.text);
  return r.result?.result?.value;
};

const viewport = (width, height = 1000, mobile = false) =>
  send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });

const session = JSON.stringify({
  name: 'Demo User',
  email: 'user1@gmail.com',
  phone: '+234 800 000 0000',
  company: 'Demo Trading Ltd.',
  memberTier: 'Verified',
  createdAt: '14 Mar 2026',
  shipping: {
    line1: 'Shop No. GFQ 53, Happy Baby Line',
    line2: 'Young Shall Grow Plaza, Main Market',
    city: 'Onitsha',
    state: 'Anambra',
    country: 'Nigeria',
    zip: '430211',
  },
  billing: {
    line1: '14A Allen Avenue, Ikeja',
    line2: '',
    city: 'Lagos',
    state: 'Lagos',
    country: 'Nigeria',
    zip: '100001',
  },
});

/** Sign the mock session in, then land on `path`. */
const go = async (path, wait = 2600) => {
  await send('Page.navigate', { url: base + path });
  await sleep(1500);
  await evaluate(`localStorage.setItem('izuire.session.v1', ${JSON.stringify(session)}); true`);
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

await send('Page.enable');

// --- Desktop: hero and first card ---
await viewport(1440, 980);
await go('/account/profile');
await shot('h1-profile-desktop-top');

// --- Desktop: the three cards with the identity aside beside them ---
await evaluate(`window.scrollTo(0, 560); true`);
await sleep(400);
await shot('h2-profile-desktop-cards');

// --- Desktop: the identity card further down ---
await evaluate(`window.scrollTo(0, document.body.scrollHeight * 0.55); true`);
await sleep(400);
await shot('h3-profile-desktop-lower');

// --- Desktop dark ---
await theme('dark');
await evaluate(`window.scrollTo(0, 560); true`);
await sleep(400);
await shot('h4-profile-desktop-dark');
await theme('light');

// --- Narrow: nav collapsed, cards stacked over the aside ---
await viewport(1024, 900);
await go('/account/profile');
await shot('h5-profile-narrow');

// --- Mobile ---
await viewport(390, 844, true);
await go('/account/profile');
await shot('h6-profile-mobile');
await evaluate(`window.scrollTo(0, 620); true`);
await sleep(400);
await shot('h7-profile-mobile-cards');

// --- Settings, which shares the card-head treatment ---
await viewport(1440, 980);
await go('/account/settings');
await evaluate(`window.scrollTo(0, 420); true`);
await sleep(400);
await shot('h8-settings-desktop');

console.log('done ->', out);
ws.close();
process.exit(0);
