/**
 * One-off screenshot helper for a single element: drives the headless Edge over
 * CDP and clips to the element's own box, so a breadcrumb (or any other strip)
 * can be looked at rather than guessed at. Not part of the app.
 *
 *   node tools/shot-top.mjs <url> <out.png> [selector] [width] [light|dark]
 */
import { writeFileSync } from 'node:fs';

const url = process.argv[2];
const out = process.argv[3];
const selector = process.argv[4] || 'app-breadcrumb';
const width = Number(process.argv[5] || 1280);
const theme = process.argv[6] || 'light';

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
await evaluate(`document.querySelector('app-signature-loader')?.remove(); true`);
if (theme === 'dark') await evaluate(`document.documentElement.setAttribute('data-theme','dark'); true`);
await sleep(700);

const box = JSON.parse(
  await evaluate(`(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    if (!el) return JSON.stringify(null);
    const r = el.getBoundingClientRect();
    return JSON.stringify({
      x: Math.max(0, Math.round(r.left) - 12),
      y: Math.round(r.top + window.scrollY) - 12,
      width: Math.round(r.width) + 24,
      height: Math.round(r.height) + 24,
      text: el.textContent.trim().replace(/\\s+/g, ' '),
    });
  })()`),
);
if (!box) throw new Error(`nothing matched ${selector}`);
console.log(`${selector}: ${box.text}  (${box.width}x${box.height})`);

const shot = await send('Page.captureScreenshot', {
  format: 'png',
  captureBeyondViewport: true,
  clip: { x: box.x, y: box.y, width: box.width, height: box.height, scale: 2 },
});
writeFileSync(out, Buffer.from(shot.result.data, 'base64'));
console.log('wrote', out);
ws.close();
process.exit(0);