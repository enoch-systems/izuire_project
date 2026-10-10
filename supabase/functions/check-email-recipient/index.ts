import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function hasDnsRecord(domain: string, type: 'MX' | 'A' | 'AAAA'): Promise<boolean> {
  const response = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=${type}`, {
    headers: { accept: 'application/dns-json' },
  });
  if (!response.ok) throw new Error('Email domain lookup is temporarily unavailable. Try again.');
  const result = await response.json() as { Status?: number; Answer?: unknown[] };
  if (result.Status !== 0) return false;
  return Array.isArray(result.Answer) && result.Answer.length > 0;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405);

  const authorization = request.headers.get('Authorization');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!authorization?.startsWith('Bearer ') || !supabaseUrl || !anonKey) {
    return jsonResponse({ error: 'Sign in as an administrator to check an address.' }, 401);
  }

  const adminClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await adminClient.auth.getUser();
  if (authError || !authData.user?.email) return jsonResponse({ error: 'Your admin session is no longer valid.' }, 401);

  const { data: adminRow, error: adminError } = await adminClient
    .from('app_admins')
    .select('email')
    .ilike('email', authData.user.email)
    .maybeSingle();
  if (adminError || !adminRow) return jsonResponse({ error: 'Only administrators can check recipient addresses.' }, 403);

  let payload: { email?: unknown };
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid email check request.' }, 400);
  }

  const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonResponse({ error: 'Enter a valid email address.' }, 400);
  }

  const domain = email.slice(email.lastIndexOf('@') + 1);
  try {
    const hasMx = await hasDnsRecord(domain, 'MX');
    const hasAddressFallback = hasMx ? false : await hasDnsRecord(domain, 'A') || await hasDnsRecord(domain, 'AAAA');
    if (!hasMx && !hasAddressFallback) {
      return jsonResponse({ error: 'This domain has no mail-routing records, so it may not accept email.' }, 422);
    }
    return jsonResponse({ valid: true, mailDomain: true });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Could not check this email domain.' }, 503);
  }
});
