/**
 * Throwaway screenshot helper for the Request a Quote page: drives the headless
 * browser already listening on CDP (see tools/shot.mjs) so the hero and the new
 * dropdown can be looked at rather than guessed at. Safe to delete.
 *
 *   node tools/shot-quote.mjs <out.png> [light|dark] [openCategory]
 */
import { writeFileSync } from 'node:fs';

const out = process.argv[2];
const theme = process.argv[3] || 'light';
const openCategory = process.argv[4] === 'open';

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
  const r = await send('Runtime.evaluate', { expression, returnByValue: true });
  if (r.result?.exceptionDetails) console.log('eval error', r.result.exceptionDetails.text);
  return r.result?.result?.value;
};

await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', {
  width: 1440,
  height: 1000,
  deviceScaleFactor: 1,
  mobile: false,
});
await send('Page.navigate', { url: 'http://localhost:4200/quote' });
await sleep(5000);
await evaluate(`document.querySelector('app-signature-loader')?.remove(); true`);
if (theme === 'dark') {
  await evaluate(`document.documentElement.setAttribute('data-theme','dark'); true`);
}
await sleep(600);

if (openCategory) {
  const info = await evaluate(`(() => {
    const t = document.getElementById('rfqCategory');
    if (!t) return 'NO TRIGGER';
    t.click();
    return 'clicked';
  })()`);
  console.log('open step:', info);
  await sleep(900);
  const state = await evaluate(`(() => {
    const f = document.querySelector('app-select-field');
    const host = f?.querySelector('.sselect');
    return JSON.stringify({
      open: host?.classList.contains('is-open') ?? null,
      panelRows: host ? getComputedStyle(host.querySelector('.sselect__panel')).gridTemplateRows : null,
      optCount: document.querySelectorAll('.sselect__opt').length,
      panelHeight: host?.querySelector('.sselect__panel')?.getBoundingClientRect().height ?? null,
    });
  })()`);
  console.log('state:', state);
}

const box = JSON.parse(
  await evaluate(`(() => {
    const h = document.documentElement.scrollHeight;
    return JSON.stringify({ h: Math.min(h, 2400) });
  })()`),
);
console.log('page height:', box.h);

const shot = await send('Page.captureScreenshot', {
  format: 'png',
  captureBeyondViewport: true,
  clip: { x: 0, y: 0, width: 1440, height: box.h, scale: 1 },
});
writeFileSync(out, Buffer.from(shot.result.data, 'base64'));
console.log('wrote', out);
ws.close();
process.exit(0);
