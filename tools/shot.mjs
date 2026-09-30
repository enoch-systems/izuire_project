/**
 * One-off screenshot helper: drives the headless Edge already on this machine
 * over CDP (Node 24 has a global WebSocket) so the footer can be looked at
 * rather than guessed at. Not part of the app; safe to delete.
 *
 *   node tools/shot.mjs <url> <out.png> [width] [light|dark]
 */
import { writeFileSync } from 'node:fs';

const url = process.argv[2];
const out = process.argv[3];
const width = Number(process.argv[4] || 1440);
const theme = process.argv[5] || 'light';

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
  return r.result?.result?.value;
};

await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', {
  width,
  height: 900,
  deviceScaleFactor: 1,
  mobile: width < 700,
});
await send('Page.navigate', { url });
await sleep(4500);
// The signature loader is a full-bleed overlay on first paint; it has no place
// in a footer screenshot.
await evaluate(`document.querySelector('app-signature-loader')?.remove(); true`);
if (theme === 'dark') {
  await evaluate(`document.documentElement.setAttribute('data-theme','dark'); true`);
}
await sleep(700);

const box = JSON.parse(
  await evaluate(`(() => {
    const f = document.querySelector('footer');
    const r = f.getBoundingClientRect();
    return JSON.stringify({ y: Math.round(r.top + window.scrollY), h: Math.round(r.height) });
  })()`),
);
console.log('footer box:', box);

const shot = await send('Page.captureScreenshot', {
  format: 'png',
  captureBeyondViewport: true,
  clip: { x: 0, y: box.y, width, height: box.h, scale: 1 },
});
writeFileSync(out, Buffer.from(shot.result.data, 'base64'));
console.log('wrote', out);
ws.close();
process.exit(0);
