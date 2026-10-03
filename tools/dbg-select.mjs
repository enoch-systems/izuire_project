/** One-off debug: what does the select's DOM actually say? Safe to delete. */
const targets = await (await fetch('http://127.0.0.1:9222/json')).json();
const page = targets.find((t) => t.type === 'page');
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
await new Promise((res) => ws.addEventListener('open', res));
const send = (method, params = {}) =>
  new Promise((res) => {
    const i = ++id;
    pending.set(i, res);
    ws.send(JSON.stringify({ id: i, method, params }));
  });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const evaluate = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true })).result?.result?.value;

await send('Page.enable');
await send('Page.navigate', { url: 'http://127.0.0.1:4300/marketplace' });
await sleep(2000);
await evaluate(`localStorage.setItem('izuire.currency.v1', 'USD'); true`);
await send('Page.navigate', { url: 'http://127.0.0.1:4300/marketplace' });
await sleep(3000);
console.log('stored:', await evaluate(`localStorage.getItem('izuire.currency.v1')`));
console.log('value:', await evaluate(`document.querySelector('.mk-sheet select')?.value`));
console.log('html:', await evaluate(`document.querySelector('.mk-sheet select')?.outerHTML`));
console.log('first price:', await evaluate(`document.querySelector('.product-price')?.textContent.trim()`));
ws.close();
process.exit(0);
