// Production build of the frontend-safe Supabase config. Same rule as
// environment.ts: anon key only, never service_role. Real values come from
// environment.prod.local.ts / CI secrets; committed file keeps placeholders.
export const SUPABASE_URL = 'https://pzjhjauzjljtigpgexdr.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6amhqYXV6amxqdGlncGdleGRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEwNjE1NTYsImV4cCI6MjEwNjYzNzU1Nn0.1Mz1g_iSHbrLo-JIrBuwHUoRH2nSuccVDzP6wK7e1nQ';

// The bootstrap admin email. The authoritative list is public.app_admins, which
// AuthService checks at sign-in, so this is only a fallback. Keep it in step
// with NG_ADMIN_EMAIL in .env.
export const ADMIN_EMAIL = 'admin@izuire.com';
