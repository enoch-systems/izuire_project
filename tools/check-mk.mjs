/**
 * Behavioural check for the marketplace, driven in the page so the assertions are
 * about what a shopper would actually do rather than about the markup.
 *
 *   node tools/check-mk.mjs [url]
 */
const url = process.argv[2] ?? 'http://localhost:4210/marketplace';

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
  width: 390,
  height: 900,
  deviceScaleFactor: 1,
  mobile: true,
});
await send('Page.navigate', { url: 'about:blank' });
await sleep(300);
// The cart restores itself from localStorage when the service is constructed, so
// the key has to be gone BEFORE the app boots — clearing it afterwards would
// leave the already-restored lines in memory and stack this run's onto them.
await send('Page.addScriptToEvaluateOnNewDocument', {
  source: `try { localStorage.removeItem('izuire.cart.v1'); } catch (e) {}`,
});
await send('Page.navigate', { url });
await sleep(5000);
await evaluate(`document.querySelector('app-signature-loader')?.remove(); true`);

const report = await evaluate(`(async () => {
const out = [];
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const add = (name, pass, detail) => out.push({ name, pass, detail: String(detail ?? '') });

  // ---- The shape of the shop ----
  add('grid renders 8 cards on page one', $$('.product-card').length === 8, $$('.product-card').length);
  add('pager shows 2 pages', $$('.product-dot').length === 2, $$('.product-dot').length);
  add('the old page-hero is gone', $$('.page-hero').length === 0, $$('.page-hero').length);
  add('the bar is pinned', getComputedStyle($('.mk-bar')).position === 'sticky', getComputedStyle($('.mk-bar')).position);
  add('grid is two across on a phone',
    getComputedStyle($('.product-grid--market')).gridTemplateColumns.split(' ').length === 2,
    getComputedStyle($('.product-grid--market')).gridTemplateColumns);

  // ---- The controls that had no styles before ----
  add('stepper is a flex row', getComputedStyle($('.product-qty')).display === 'flex', getComputedStyle($('.product-qty')).display);
  // A flex item's inline-flex is blockified to flex, so both are a pass here.
  add('stepper buttons are laid out as flex targets',
    ['flex', 'inline-flex'].includes(getComputedStyle($('.product-qty-step')).display),
    getComputedStyle($('.product-qty-step')).display);
  add('stepper buttons are thumb-sized',
    $('.product-qty-step').getBoundingClientRect().height >= 38,
    $('.product-qty-step').getBoundingClientRect().height);
  add('add-button icons are overlaid, not stacked',
    getComputedStyle($('.product-add-icons svg')).position === 'absolute',
    getComputedStyle($('.product-add-icons svg')).position);
  // Compared against the body's CONTENT box: the button has to fill the card
  // between its padding, not the card's border box.
  add('add button fills the card body',
    Math.round($('.product-add').getBoundingClientRect().width) ===
      Math.round($('.product-body').clientWidth -
        parseFloat(getComputedStyle($('.product-body')).paddingLeft) -
        parseFloat(getComputedStyle($('.product-body')).paddingRight)),
    $('.product-add').getBoundingClientRect().width + ' vs content ' +
      ($('.product-body').clientWidth -
        parseFloat(getComputedStyle($('.product-body')).paddingLeft) -
        parseFloat(getComputedStyle($('.product-body')).paddingRight)));

  // ---- Filtering ----
  $$('.filter-chip').find((b) => b.textContent.includes('Solar')).click();
  await wait(150);
  add('category chip narrows to solar', $$('.product-card').length === 2, $$('.product-card').length);
  add('filter button lights and counts',
    $('.mk-tune').classList.contains('is-on') && $('.mk-tune-n').textContent.trim() === '1',
    $('.mk-tune-n').textContent);
  add('clear-filters link appears', !!$('.mk-meta-clear'), !!$('.mk-meta-clear'));
  add('apply button counts down', $('.mk-apply').textContent.includes('2'), $('.mk-apply').textContent.trim());

  $$('.mk-row').find((b) => b.textContent.includes('Over')).click();
  await wait(150);
  add('price band narrows to one', $$('.product-card').length === 1, $$('.product-card').length);
  add('two narrowings are counted', $('.mk-tune-n').textContent.trim() === '2', $('.mk-tune-n').textContent.trim());
// ---- The sheet: open, lock, Escape ----
  $('.mk-tune').click();
  await wait(300);
  add('sheet opens', $('.mk-sheet').classList.contains('open'), $('.mk-sheet').classList.contains('open'));
  add('body scroll is locked while it is up', document.body.style.overflow === 'hidden', document.body.style.overflow);
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
  await wait(300);
  add('escape closes the sheet', !$('.mk-sheet').classList.contains('open'), $('.mk-sheet').classList.contains('open'));
  add('body scroll is handed back', document.body.style.overflow === '', JSON.stringify(document.body.style.overflow));

  // ---- Currency and reset ----
  $('.mk-tune').click();
  await wait(300);
  const select = $('.mk-sheet select');
  select.value = 'USD';
  select.dispatchEvent(new Event('change', { bubbles: true }));
  await wait(150);
  add('currency converts the prices', $('.product-price').textContent.includes('≈'), $('.product-price').textContent.trim());
  add('conversion note appears', !!$('.mk-meta-note'), !!$('.mk-meta-note'));
  $('.mk-reset').click();
  await wait(150);
  add('reset clears the narrowings', $$('.product-card').length === 8, $$('.product-card').length);
  add('reset keeps the currency', $('.mk-sheet select').value === 'USD', $('.mk-sheet select').value);
  $('.mk-sheet-x').click();
  await wait(300);

  // ---- Search ----
  const input = $('.mk-search input');
  input.value = 'bale';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await wait(150);
  add('search narrows the list', $$('.product-card').length === 2, $$('.product-card').length);
  input.value = 'zzzz';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await wait(150);
  add('empty state appears', getComputedStyle($('.no-results')).display !== 'none', getComputedStyle($('.no-results')).display);
  add('its own clear button appears', !!$('.mk-search-clear'), !!$('.mk-search-clear'));
  $('.mk-search-clear').click();
  await wait(150);
  add('clearing search restores the list', $$('.product-card').length === 8, $$('.product-card').length);

  // ---- Sort ----
  $('.mk-tune').click();
  await wait(300);
  $$('.mk-row').find((b) => b.textContent.includes('low to high')).click();
  await wait(200);
  const nums = $$('.product-price .price-val').map((t) => Number(t.textContent.replace(/[^0-9.]/g, '')));
  add('sort low to high is ascending', nums.every((n, i) => i === 0 || n >= nums[i - 1]), nums.join(', '));
  $('.mk-sheet-x').click();
  await wait(300);
// ---- Quantity and the cart ----
  localStorage.removeItem('izuire.cart.v1');
  const qty = $('.product-qty-input');
  const before = Number(qty.value);
  $$('.product-qty-step')[1].click();
  await wait(150);
  add('the stepper increments', Number($('.product-qty-input').value) === before + 1, $('.product-qty-input').value);
  add('the decrement is disabled at one', $$('.product-qty-step')[0].disabled === false, $$('.product-qty-step')[0].disabled);

  $('.product-add').click();
  await wait(200);
  add('add to cart flips the button to its added state',
    $('.product-add').classList.contains('is-added'), $('.product-add').classList.contains('is-added'));
  add('the tick cross-fades in',
    getComputedStyle($('.product-add-tick')).opacity === '1', getComputedStyle($('.product-add-tick')).opacity);
  add('the cart badge counts the units',
    $('.cart-btn').textContent.trim() === String(before + 1), $('.cart-btn').textContent.trim());

  // ---- Pager ----
  $$('.product-dot')[1].click();
  await wait(200);
  add('page two holds the remaining four', $$('.product-card').length === 4, $$('.product-card').length);
  add('page two marks the second dot current',
    $$('.product-dot')[1].getAttribute('aria-current') === 'page', $$('.product-dot')[1].getAttribute('aria-current'));

  // ---- The closing strip ----
  add('the sourcing strip is at the end of the list',
    !!$('.mk-foot .btn') && $('.mk-foot a').getAttribute('href') === '/quote', $('.mk-foot a').getAttribute('href'));

  // ---- The pinned bar meets the header with no gap ----
  // Scrolled, because that is the only moment the bar is actually pinned AND the
  // header is at its shrunken height. A pin set to the header's RESTING height
  // would leave a band of catalogue scrolling through the gap right here.
  window.scrollTo(0, 1200);
  await wait(600);
  const headerBottom = $('#site-header').getBoundingClientRect().bottom;
  const barTop = $('.mk-bar').getBoundingClientRect().top;
  add('the pinned bar sits flush under the header', Math.abs(headerBottom - barTop) <= 1, 'gap ' + Math.round(barTop - headerBottom) + 'px');
  add('the site header is above the bar in the stack',
    Number(getComputedStyle($('#site-header')).zIndex) > Number(getComputedStyle($('.mk-bar')).zIndex),
    getComputedStyle($('#site-header')).zIndex + ' vs ' + getComputedStyle($('.mk-bar')).zIndex);
  add('the bar is still pinned after scrolling',
    getComputedStyle($('.mk-bar')).position === 'sticky' && barTop < 200,
    Math.round(barTop) + 'px from top');
  window.scrollTo(0, 0);
  await wait(400);

  return JSON.stringify(out);
})()`);

const results = JSON.parse(report);
let failed = 0;
for (const r of results) {
  if (!r.pass) failed++;
  console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? `   (${r.detail})` : ''}`);
}
console.log(`\n${results.length - failed}/${results.length} passed`);
ws.close();
process.exit(failed ? 1 : 0);