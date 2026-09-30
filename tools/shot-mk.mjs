/**
 * One-off screenshot helper for the marketplace redesign: drives the headless
 * Edge already on this machine over CDP (Node 24 has a global WebSocket) so the
 * page can be looked at rather than guessed at. Not part of the app.
 *
 *   node tools/shot-mk.mjs <url> <out.png> [width] [light|dark] [height] [script]
 *
 * `script` is optional JS run in the page after load and before the capture —
 * used here to open the refine sheet and to scroll, so the states that only
 * exist after a press can be seen too.
 */
import { writeFileSync } from 'node:fs';

const url = process.argv[2];
const out = process.argv[3];
const width = Number(process.argv[4] || 1440);
const theme = process.argv[5] || 'light';
const height = Number(process.argv[6] || 1000);
const script = process.argv[7] || '';

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
await send('Emulation.setDeviceMetricsOverride', {
  width,
  height,
  deviceScaleFactor: 1,
  mobile: width < 700,
});
await send('Page.navigate', { url });
await sleep(5000);
// The signature loader is a full-bleed overlay on first paint; it has no place
// in a screenshot of anything below it.
await evaluate(`document.querySelector('app-signature-loader')?.remove(); true`);
if (theme === 'dark') {
  await evaluate(`document.documentElement.setAttribute('data-theme','dark'); true`);
}
if (script) {
  await evaluate(script);
}
await sleep(900);

// An optional selector clips the capture to that element's box on the page, which
// is how a section far down a long page is looked at: `captureBeyondViewport`
// ignores scroll, so scrolling and then capturing the window is the only way to
// see something below the fold.
const selector = process.argv[8] || '';
let clip = { x: 0, y: 0, width, height, scale: 1 };
if (selector) {
  // `captureBeyondViewport` is left on: it is what lets a clip reach past the fold,
  // which is the whole point of targeting an element deep in the page.
  const box = JSON.parse(
    await evaluate(`(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return JSON.stringify({ missing: true });
      const r = el.getBoundingClientRect();
      return JSON.stringify({ x: 0, y: Math.round(r.top + window.scrollY), width: ${width}, height: Math.round(r.height) });
    })()`),
  );
  if (box.missing) throw new Error(`no element matches ${selector}`);
  clip = { ...box, scale: 1 };
  console.log('clip:', box);
}

const shot = await send('Page.captureScreenshot', {
  format: 'png',
  captureBeyondViewport: true,
  clip,
});
writeFileSync(out, Buffer.from(shot.result.data, 'base64'));
console.log('wrote', out);
ws.close();
process.exit(0);
