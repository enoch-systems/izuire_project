/**
 * Seeds the Izuire Supabase project from .env using the service_role key.
 *
 *   1. Confirms the schema is in place (the migrations must be pushed first).
 *   2. Creates the admin auth user (email + password) if it does not exist.
 *   3. Adds that email to public.app_admins, which is what unlocks /admin.
 *
 * The product rows are written by the seed migration, so this script only
 * touches auth + app_admins. Run it after `supabase db push`.
 *
 *   node tools/seed-db.mjs
 */
import { readFileSync } from 'node:fs';

const env = loadEnv();
const url = env['NG_SUPABASE_URL'];
const serviceKey = env['SUPABASE_SERVICE_ROLE_KEY'];
const adminEmail = (env['NG_ADMIN_EMAIL'] || '').trim().toLowerCase();
const adminPassword = env['NG_ADMIN_PASSWORD'] || '';
const projectRef = 'pzjhjauzjljtigpgexdr';

if (!url || !serviceKey) fail('NG_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env');
if (!adminEmail || adminEmail === 'admin@example.com') fail('Set NG_ADMIN_EMAIL in .env to the real admin email first.');
if (adminPassword.length < 6) fail('Set NG_ADMIN_PASSWORD in .env (6+ characters).');

const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
/** True once the migrations have been pushed (products table exists). */
let schemaReady = false;

await checkSchema();
await ensureAdminUser();
await upsertAdminRow();
console.log(`\nDone. ${adminEmail} can sign in and open /admin.`);

function loadEnv() {
  const out = {};
  let text = '';
  try {
    text = readFileSync(new URL('../.env', import.meta.url), 'utf8');
  } catch {
    return out;
  }
  for (const line of text.split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (!m) continue;
    out[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return out;
}

function fail(message) {
  console.error('x ' + message);
  process.exit(1);
}

async function checkSchema() {
  const res = await fetch(`${url}/rest/v1/products?select=id&limit=1`, { headers });
  if (res.status === 404) {
    console.warn('- schema not pushed yet: products table missing.');
    console.warn('  Push it with:  supabase db push   (needs supabase login or --db-url)');
    console.warn('  The admin account is still created below; re-run this after the push.');
    schemaReady = false;
    return;
  }
  const rows = await res.json().catch(() => []);
  console.log(`- schema ok; products rows: ${Array.isArray(rows) ? rows.length : '?'}`);
  schemaReady = true;
}

async function ensureAdminUser() {
  const listRes = await fetch(`${url}/auth/v1/admin/users?per_page=200`, { headers });
  const list = await listRes.json().catch(() => ({}));
  const users = Array.isArray(list?.users) ? list.users : [];
  const existing = users.find((u) => (u.email || '').toLowerCase() === adminEmail);
  if (existing) {
    // Re-set the password too, so the .env value always works.
    const upd = await fetch(`${url}/auth/v1/admin/users/${existing.id}`, {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: adminPassword, email_confirm: true }),
    });
    if (!upd.ok) console.warn(`- could not refresh the admin password: ${upd.status}`);
    else console.log(`- admin auth user already existed; password re-applied (${adminEmail})`);
    return;
  }
  const createRes = await fetch(`${url}/auth/v1/admin/users`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: adminEmail, password: adminPassword, email_confirm: true }),
  });
  if (!createRes.ok) fail(`could not create the admin user: ${createRes.status} ${await createRes.text()}`);
  console.log(`- created admin auth user (${adminEmail})`);
}

async function upsertAdminRow() {
  if (!schemaReady) {
    console.warn('- app_admins row skipped (schema not pushed yet)');
    return;
  }
  const res = await fetch(`${url}/rest/v1/app_admins`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify({ email: adminEmail }),
  });
  if (!res.ok) fail(`could not add ${adminEmail} to app_admins: ${res.status} ${await res.text()}`);
  console.log(`- app_admins now lists ${adminEmail}`);
}
