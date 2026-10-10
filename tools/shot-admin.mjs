/**
 * One-off: drives the headless Chromium on :9222 over CDP to look at
 * /admin/products (seeding an admin session first). Not part of the app.
 *
 *   node tools/shot-admin.mjs <tag> [width] [height] [url] [clickSelector]
 */
import { writeFileSync } from 'node:fs';

const tag = process.argv[2] || 'admin';
const width = Number(process.argv[3] || 1440);
const height = Number(process.argv[4] || 1000);
const url = process.argv[5] || 'http://localhost:4200/admin/products';
const clickSel = process.argv[6] || '';
const theme = process.argv[7] || ''; // 'dark' to capture dark mode
const clipArg = process.argv[8] || ''; // 'x,y,w,h' to capture a region

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
  return r.result?.result?.value;
};
const shot = async (name) => {
  const params = { format: 'png' };
  if (clipArg) {
    const [x, y, width, height] = clipArg.split(',').map(Number);
    params.clip = { x, y, width, height, scale: 3 };
  }
  const r = await send('Page.captureScreenshot', params);
  writeFileSync(`/tmp/izshots/${name}.png`, Buffer.from(r.result.data, 'base64'));
  console.log('shot ->', `/tmp/izshots/${name}.png`);
};

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 700 });

// Seed an admin session so the guard lets us through, then load the page.
await send('Page.navigate', { url: 'http://localhost:4200/admin/login' });
await sleep(2500);
await evaluate(
  `localStorage.setItem('izuire.admin.session.v1', JSON.stringify({email:'admin@izuire.test',name:'admin',since:new Date().toISOString()}))`,
);
// Theme is read before first paint, so it lands in the same origin's storage
// before the navigation that must reflect it.
await evaluate(
  theme === 'dark'
    ? `localStorage.setItem('izuire.theme.v1', 'dark')`
    : `localStorage.removeItem('izuire.theme.v1')`,
);
await send('Page.navigate', { url });
await sleep(4000);

if (clickSel) {
  for (const sel of clickSel.split('|')) {
    const clicked = await evaluate(
      `(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return 'no el'; el.click(); return 'ok'; })()`,
    );
    console.log('click', sel, clicked);
    await sleep(1200);
  }
}
if (process.env.PROBE) {
  const info = await evaluate(`(() => {
    const b = document.querySelector('.burger');
    if (!b) return 'no burger';
    const hits = [];
    for (const sheet of document.styleSheets) {
      let rules; try { rules = sheet.cssRules; } catch { continue; }
      const walk = (list) => {
        for (const r of list) {
          if (r.cssRules) { walk(r.cssRules); continue; }
          if (!r.selectorText || !r.style) continue;
          if (r.style.alignItems) {
            for (const sel of r.selectorText.split(',')) {
              try { if (b.matches(sel.trim())) hits.push({sel: sel.trim(), val: r.style.alignItems, href: (r.href || sheet.href || 'inline').slice(-60)}); } catch {}
            }
          }
        }
      };
      walk(rules);
    }
    return JSON.stringify(hits);
  })()`);
  console.log('probe ->', info);
}
await shot(tag);

ws.close();


