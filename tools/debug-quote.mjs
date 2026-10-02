/** Throwaway CDP probe for the quote dropdown. Safe to delete. */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
const ev = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true });
  if (r.result?.exceptionDetails) console.log('EXC', r.result.exceptionDetails.text);
  return r.result?.result?.value;
};

await send('Page.enable');
await send('Runtime.enable');
const errors = [];
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.method === 'Runtime.exceptionThrown') {
    errors.push(m.params.exceptionDetails.text + ' :: ' + (m.params.exceptionDetails.exception?.description || ''));
  }
});
await send('Page.navigate', { url: 'http://localhost:4200/quote' });
await sleep(5000);

const probe = () =>
  ev(
    `(()=>{const h=document.querySelector('.sselect');const t=document.getElementById('rfqCategory');return JSON.stringify({open:h.classList.contains('is-open'),aria:t.getAttribute('aria-expanded'),h:Math.round(h.querySelector('.sselect__panel').getBoundingClientRect().height),dupIds:document.querySelectorAll('#rfqCategory').length});})()`,
  );

console.log('before:', await probe());

await ev(`document.getElementById('rfqCategory').click(); 1`);
await sleep(700);
console.log('after click:', await probe());

await ev(`(()=>{const t=document.getElementById('rfqCategory');t.focus();t.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}));return 1;})()`);
await sleep(700);
console.log('after ArrowDown:', await probe());

console.log('errors:', errors.length ? errors : 'none');

ws.close();
process.exit(0);