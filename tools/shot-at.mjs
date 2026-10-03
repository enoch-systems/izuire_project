/**
 * One-off: captures a Services page at explicit scroll fractions, for the
 * spots that fall between shot-services.mjs's fixed stops.
 * Not part of the app; safe to delete.
 *
 *   node tools/shot-at.mjs <path> <frac,frac,...> <tag> [base] [width]
 *   e.g. node tools/shot-at.mjs /sourcing 0.4,0.68 svcafter
 */
import { writeFileSync } from 'node:fs';

const path = process.argv[2] || '/sourcing';
const fracs = (process.argv[3] || '0.5').split(',').map(Number);
const tag = process.argv[4] || 'at';
const base = process.argv[5] || 'http://127.0.0.1:4300';
const width = Number(process.argv[6] || 390);
const out = 'C:/Users/HP/Documents/OWENN/shots';

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
const evaluate = async (expression) =>
  (await send('Runtime.evaluate', { expression, returnByValue: true })).result?.result?.value;

await send('Page.enable');
await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 1, mobile: width < 700 });
await send('Page.navigate', { url: base + path });
await sleep(3200);
await evaluate(`document.querySelector('app-signature-loader')?.remove(); true`);

for (const [i, f] of fracs.entries()) {
  await evaluate(`window.scrollTo(0, Math.round(document.body.scrollHeight * ${f})); true`);
  await sleep(600);
  const r = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`${out}/${tag}-${i + 1}.png`, Buffer.from(r.result.data, 'base64'));
  console.log('shot', `${tag}-${i + 1}`);
}
ws.close();
process.exit(0);
