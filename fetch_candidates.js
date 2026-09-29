/**
 * Throwaway helper: search Openverse for commercially-licensed photographs of each
 * catalogue product, then download the candidates for visual review.
 *
 * `category=photograph` is the important filter. Without it the search returns
 * engravings, woodblock prints and manuscript scans - the reason the first pass
 * came back with "Peasant Children Dancing" for a bale of children's clothing.
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

const QUERIES = {
  'phone-screens-a-grade': ['mobile phone display', 'smartphone screen', 'lcd display module', 'touchscreen glass'],
  'bluetooth-earbuds-oem': ['in-ear headphones', 'wireless earbuds', 'earphones', 'headphone product'],
  'okrika-mixed-bale-a': ['second-hand clothing', 'textile recycling', 'sorted clothes', 'charity shop clothing'],
  'okrika-childrens-wear-bale': ["children's clothing", 'kids clothes shop', 'childrens wear'],
  'pvc-ceiling-panels': ['ceiling tiles', 'suspended ceiling', 'pvc panel', 'ceiling grid'],
  'bathroom-fittings-set': ['bathroom taps', 'shower mixer', 'sanitary ware', 'bathroom showroom'],
  'raw-human-hair-bundles-20': ['hair extensions', 'human hair weave', 'hair bundles'],
  'lace-front-wig-24': ['wig hairpiece', 'lace front wig', 'human hair wig', 'wig mannequin'],
  '150w-solar-panel': ['photovoltaic module', 'solar panel array', 'solar panels roof'],
  '200ah-lithium-battery': ['lithium-ion battery', 'battery module', 'stationary battery', 'accumulator battery'],
  'ladies-sandals-assorted': ["women's sandals", 'shoes shop', 'flip-flops', 'footwear display'],
  'stainless-cookware-set-10pc': ['stainless steel cookware', 'pots and pans', 'cooking pots steel'],
};

const OUT = path.join(__dirname, 'candidates');

function get(url, binary) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': 'izuire-catalog/1.0' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return res.destroy();
        }
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error('HTTP ' + res.statusCode));
        }
        if (binary) {
          const chunks = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () => resolve(Buffer.concat(chunks)));
        } else {
          let body = '';
          res.on('data', (c) => (body += c));
          res.on('end', () => {
            try { resolve(JSON.parse(body)); } catch (e) { reject(e); }
          });
        }
      })
      .on('error', reject);
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const manifest = [];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  for (const [id, terms] of Object.entries(QUERIES)) {
    for (const term of terms) {
      const url =
        'https://api.openverse.org/v1/images/?q=' + encodeURIComponent(term) +
        '&license=cc0,pdm,by&category=photograph&page_size=8&mature=false';
      let r;
      try { r = await get(url); } catch { continue; }
      for (const it of r.results || []) {
        if (!/\.(jpe?g|png)$/i.test(it.url || '')) continue;
        const name = `${id}__${term.replace(/[^a-z0-9]+/gi, '-')}__${manifest.length}.jpg`;
        try {
          const buf = await get(it.url, true);
          if (buf.length < 12000) continue;
          fs.writeFileSync(path.join(OUT, name), buf);
          manifest.push({
            file: name, id, term, lic: it.license,
            title: (it.title || '').slice(0, 60),
            creator: (it.creator || '').slice(0, 40),
            source: it.foreign_landing_url, bytes: buf.length,
          });
          console.log(`${name}  [${it.license}] ${(it.title||'').slice(0,45)}`);
        } catch { /* candidate URL dead - skip */ }
        await sleep(120);
      }
    }
  }
  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log('\nTOTAL DOWNLOADED: ' + manifest.length);
})();
