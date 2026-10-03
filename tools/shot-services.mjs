/**
 * One-off: looks at the three Services nav pages (sourcing, shipping,
 * business solutions) at mobile + desktop after the responsive restyle,
 * rather than guessing. Not part of the app; safe to delete.
 *
 *   1. node tools/serve-dist.mjs 4300
 *   2. Chrome/Edge --headless=new --remote-debugging-port=9222
 *   3. node tools/shot-services.mjs [base] [outdir] [tag]
 *
 * Screenshots are named <tag>-<page>-m<d|desktop>.png.
 */
import { mkdirSync, writeFileSync } from 'node:fs';

const base = process.argv[2] || 'http://127.0.0.1:4300';
const out = process.argv[3] || 'C:/Users/HP/Documents/OWENN/shots';
const tag = process.argv[4] || 'svc';
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

const go = async (path, wait = 3000) => {
  await send('Page.navigate', { url: base + path });
  await sleep(wait);
  await evaluate(`document.querySelector('app-signature-loader')?.remove(); true`);
  await evaluate(`window.scrollTo(0, 0); true`);
  await sleep(500);
};

const shot = async (name) => {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`${out}/${name}.png`, Buffer.from(r.result.data, 'base64'));
  console.log('shot', name);
};

const PAGES = [
  ['sourcing', '/sourcing'],
  ['shipping', '/shipping'],
  ['biz', '/business-solutions'],
];

await send('Page.enable');

for (const [key, path] of PAGES) {
  // --- Mobile: several scroll stops down the page ---
  await viewport(390, 844, true);
  await go(path);
  await shot(`${tag}-${key}-m1`);
  for (const [i, frac] of [0.28, 0.55, 0.8].entries()) {
    await evaluate(`window.scrollTo(0, Math.round(document.body.scrollHeight * ${frac})); true`);
    await sleep(600);
    await shot(`${tag}-${key}-m${i + 2}`);
  }

  // --- Desktop: hero + first section ---
  await viewport(1440, 980);
  await go(path);
  await shot(`${tag}-${key}-d1`);
}

console.log('done ->', out);
ws.close();
process.exit(0);
