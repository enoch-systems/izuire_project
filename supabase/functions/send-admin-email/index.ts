import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface EmailImage {
  name: string;
  url: string;
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] ?? character);
}

function linkify(text: string): string {
  const pattern = /https?:\/\/[^\s<>"']+|www\.[^\s<>"']+/gi;
  let result = '';
  let cursor = 0;
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    let visible = match[0];
    const trailing = visible.match(/[.,!?;:)\]]+$/)?.[0] ?? '';
    visible = visible.slice(0, visible.length - trailing.length);
    if (!visible) continue;
    const href = visible.startsWith('www.') ? `https://${visible}` : visible;
    result += escapeHtml(text.slice(cursor, index));
    result += `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" style="color:#a84c12;text-decoration:underline">${escapeHtml(visible)}</a>`;
    result += escapeHtml(trailing);
    cursor = index + match[0].length;
  }
  return (result + escapeHtml(text.slice(cursor))).replace(/\r?\n/g, '<br>');
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405);

  const authorization = request.headers.get('Authorization');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!authorization?.startsWith('Bearer ') || !supabaseUrl || !anonKey) {
    return jsonResponse({ error: 'Sign in as an administrator to send email.' }, 401);
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
  if (adminError || !adminRow) return jsonResponse({ error: 'Only administrators can send follow-up email.' }, 403);

  const apiKey = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('EMAIL_FROM');
  if (!apiKey || !from) {
    return jsonResponse({ error: 'Email delivery is not configured. Add RESEND_API_KEY and EMAIL_FROM to Supabase secrets.' }, 503);
  }

  let payload: { recipients?: unknown; subject?: unknown; body?: unknown; images?: unknown };
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid email request.' }, 400);
  }

  const recipients = Array.isArray(payload.recipients)
    ? [...new Set(payload.recipients.filter((value): value is string => typeof value === 'string').map((value) => value.trim().toLowerCase()))]
    : [];
  const subject = typeof payload.subject === 'string' ? payload.subject.trim().replace(/[\r\n]+/g, ' ') : '';
  const body = typeof payload.body === 'string' ? payload.body.trim() : '';
  const images = Array.isArray(payload.images) ? payload.images as EmailImage[] : [];
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (recipients.length < 1 || recipients.length > 50 || recipients.some((email) => !emailPattern.test(email))) {
    return jsonResponse({ error: 'Select between 1 and 50 valid email recipients.' }, 400);
  }
  if (!subject || subject.length > 200 || (!body && images.length === 0) || body.length > 20000) {
    return jsonResponse({ error: 'Add a subject and message. Subject is limited to 200 characters.' }, 400);
  }

  const publicAssetPrefix = `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/admin-email-assets/`;
  if (images.length > 10 || images.some((image) =>
    !image || typeof image.name !== 'string' || typeof image.url !== 'string' || !image.url.startsWith(publicAssetPrefix)
  )) {
    return jsonResponse({ error: 'One or more email images are invalid.' }, 400);
  }

  const safeSubject = escapeHtml(subject);
  const paragraphs = body.split(/\n{2,}/).filter(Boolean)
    .map((paragraph) => `<p style="margin:0 0 18px">${linkify(paragraph)}</p>`).join('');
  const imageMarkup = images.map((image) => {
    const name = escapeHtml(image.name.slice(0, 120));
    const url = escapeHtml(image.url);
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0"><tr><td align="center"><a href="${url}"><img src="${url}" alt="${name}" style="display:block;max-width:100%;height:auto;border:0;border-radius:4px"></a><p style="margin:8px 0 0;font:12px Arial,sans-serif;color:#68716b"><a href="${url}" style="color:#a84c12">IMG ${name}</a></p></td></tr></table>`;
  }).join('');
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#f1f3ef;color:#202720;font-family:Arial,Helvetica,sans-serif"><div style="display:none;max-height:0;overflow:hidden;opacity:0">${safeSubject} · A personal note from Izuire</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f3ef"><tr><td align="center" style="padding:32px 14px"><table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;border-collapse:collapse"><tr><td style="padding:22px 30px;background:#fff;border-top:4px solid #f5821f"><div style="font-size:22px;font-weight:700;letter-spacing:2px;color:#202720">IZUIRE</div><div style="margin-top:5px;font-size:10px;font-weight:700;letter-spacing:1.4px;color:#a84c12">SOURCING · INSPECTION · SHIPPING</div></td></tr><tr><td style="padding:30px;background:#fff;border-top:1px solid #e6e9e4"><div style="margin-bottom:10px;font-size:10px;font-weight:700;letter-spacing:1.5px;color:#a84c12">A NOTE FROM YOUR SOURCING TEAM</div><h1 style="margin:0 0 24px;font-size:25px;line-height:1.25;font-weight:700;color:#202720">${safeSubject}</h1><div style="font-size:15px;line-height:1.75;color:#3d463f">${paragraphs}${imageMarkup}</div></td></tr><tr><td style="padding:21px 30px;background:#f7f8f5;border-top:1px solid #e6e9e4"><div style="font-size:12px;font-weight:700;letter-spacing:1px;color:#202720">IZUIRE CO. LTD.</div><div style="margin-top:6px;font-size:12px;line-height:1.6;color:#68716b">Your trusted bridge from China to Africa<br><a href="https://izuire.com" style="color:#a84c12">izuire.com</a> &nbsp;·&nbsp; <a href="mailto:hello@izuire.com" style="color:#a84c12">hello@izuire.com</a></div></td></tr></table></td></tr></table></body></html>`;

  let sent = 0;
  for (const recipient of recipients) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [recipient], reply_to: authData.user.email, subject, html }),
    });
    if (!response.ok) {
      return jsonResponse({ error: `Delivery stopped after ${sent} of ${recipients.length} emails. Check the Resend response and retry remaining recipients.` }, 502);
    }
    sent += 1;
  }

  return jsonResponse({ sent });
});