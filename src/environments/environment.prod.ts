// Production public config is compiled into Angular. Never put service-role or
// Cloudinary API secrets in frontend environment files.
export const SUPABASE_URL = 'https://pzjhjauzjljtigpgexdr.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6amhqYXV6amxqdGlncGdleGRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEwNjE1NTYsImV4cCI6MjEwNjYzNzU1Nn0.1Mz1g_iSHbrLo-JIrBuwHUoRH2nSuccVDzP6wK7e1nQ';

// Keep the bootstrap email in sync with NG_ADMIN_EMAIL. Database RLS still
// requires a matching public.app_admins row.
export const CLOUDINARY_CLOUD_NAME = 'dwry4zb9z';
export const CLOUDINARY_UPLOAD_PRESET = 'izuire_catalog_unsigned_v1';

export const ADMIN_EMAIL = 'admin@izuire.com';
