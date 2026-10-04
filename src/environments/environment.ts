// Frontend-safe Supabase config. These values are bundled into the app, so
// only the anon (public) key may live here — NEVER the service_role key.
//
// Source of truth is the environment files:
//   src/environments/environment.ts             (dev, committed with placeholders)
//   src/environments/environment.prod.ts        (prod, committed with placeholders)
// Override on your machine via local files that are git-ignored:
//   src/environments/environment.local.ts       (dev overrides, optional)
//   src/environments/environment.prod.local.ts  (prod overrides, optional)
// or via NG_SUPABASE_URL / NG_SUPABASE_ANON_KEY / NG_ADMIN_EMAIL in .env,
// which scripts copy into the local files.
export const SUPABASE_URL = 'https://pzjhjauzjljtigpgexdr.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6amhqYXV6amxqdGlncGdleGRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEwNjE1NTYsImV4cCI6MjEwNjYzNzU1Nn0.1Mz1g_iSHbrLo-JIrBuwHUoRH2nSuccVDzP6wK7e1nQ';

// The email allowed into /admin by default. The authoritative list lives in
// public.app_admins (checked at sign-in), so an admin can also be added there in
// Supabase without a rebuild - this bundled value is only the bootstrap fallback
// and must match NG_ADMIN_EMAIL in .env.
export const ADMIN_EMAIL = 'admin@izuire.com';
