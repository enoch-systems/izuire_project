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

interface EmailRecipient {
  email: string;
  name: string;
  manual: boolean;
}

type EmailType = 'welcome' | 'newsletter' | 'check-in' | 'quote';

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

function firstName(value: string): string {
  const clean = value.trim();
  if (!clean || clean === 'Newsletter subscriber' || clean === 'New customer') return 'there';
  return clean.replace(/[\r\n\t]/g, ' ').split(/\s+/)[0]?.slice(0, 80) || 'there';
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

  let payload: { recipients?: unknown; subject?: unknown; body?: unknown; emailType?: unknown; images?: unknown };
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid email request.' }, 400);
  }

  const recipientsByEmail = new Map<string, EmailRecipient>();
  if (Array.isArray(payload.recipients)) {
    for (const value of payload.recipients) {
      if (typeof value === 'string') {
        const email = value.trim().toLowerCase();
        if (email) recipientsByEmail.set(email, { email, name: '', manual: false });
      } else if (value && typeof value === 'object') {
        const item = value as { email?: unknown; name?: unknown };
        if (typeof item.email !== 'string') continue;
        const email = item.email.trim().toLowerCase();
        const name = typeof item.name === 'string' ? item.name : '';
        const manual = item.manual === true;
        if (email) recipientsByEmail.set(email, { email, name, manual });
      }
    }
  }
  const recipients = [...recipientsByEmail.values()];
  const subject = typeof payload.subject === 'string' ? payload.subject.trim().replace(/[\r\n]+/g, ' ') : '';
  const body = typeof payload.body === 'string' ? payload.body.trim() : '';
  const emailType = payload.emailType as EmailType;
  const images = Array.isArray(payload.images) ? payload.images as EmailImage[] : [];
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (recipients.length !== 1 || recipients[0].email.length > 254 || !emailPattern.test(recipients[0].email)) {
    return jsonResponse({ error: 'Send one valid email recipient per request.' }, 400);
  }
  if (!['welcome', 'newsletter', 'check-in', 'quote'].includes(emailType)) {
    return jsonResponse({ error: 'Choose a valid email type.' }, 400);
  }
  if (recipients[0].manual && (!recipients[0].name.trim() || recipients[0].name.trim().length > 160)) {
    return jsonResponse({ error: 'Enter a recipient name of no more than 160 characters.' }, 400);
  }
  const listedRecipients = recipients.filter((recipient) => !recipient.manual);
  if (listedRecipients.length) {
    const emails = listedRecipients.map((recipient) => recipient.email);
    const [profilesResult, newsletterResult] = await Promise.all([
      adminClient.from('profiles').select('email').in('email', emails),
      adminClient.from('newsletter_signups').select('email').in('email', emails),
    ]);
    if (profilesResult.error || newsletterResult.error) {
      return jsonResponse({ error: 'Could not confirm selected recipients.' }, 500);
    }
    const knownEmails = new Set([
      ...(profilesResult.data ?? []).map((row) => (row.email as string).toLowerCase()),
      ...(newsletterResult.data ?? []).map((row) => (row.email as string).toLowerCase()),
    ]);
    if (listedRecipients.some((recipient) => !knownEmails.has(recipient.email))) {
      return jsonResponse({ error: 'Recipients must be registered users, newsletter subscribers, or verified manual addresses.' }, 403);
    }
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

  const imageMarkup = images.map((image) => {
    const name = escapeHtml(image.name.slice(0, 120));
    const url = escapeHtml(image.url);
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0"><tr><td align="center"><a href="${url}"><img src="${url}" alt="${name}" style="display:block;max-width:100%;height:auto;border:0;border-radius:4px"></a><p style="margin:8px 0 0;font:12px Arial,sans-serif;color:#68716b"><a href="${url}" style="color:#a84c12">IMG ${name}</a></p></td></tr></table>`;
  }).join('');
  const recipient = recipients[0];
  const greetingName = firstName(recipient.name);
  const personalizedSubject = subject.replace(/\{\{\s*first_name\s*\}\}/gi, greetingName);
  const personalizedBody = body.replace(/\{\{\s*first_name\s*\}\}/gi, greetingName);
  const safeSubject = escapeHtml(personalizedSubject);
  const paragraphs = personalizedBody.split(/\n{2,}/).filter(Boolean)
    .map((paragraph) => `<p style="margin:0 0 18px">${linkify(paragraph)}</p>`).join('');
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#f1f3ef;color:#202720;font-family:Arial,Helvetica,sans-serif"><div style="display:none;max-height:0;overflow:hidden;opacity:0">${safeSubject} · A personal note from Izuire</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f3ef"><tr><td align="center" style="padding:32px 14px"><table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;border-collapse:collapse"><tr><td style="padding:22px 30px;background:#fff;border-top:4px solid #f5821f"><div style="font-size:22px;font-weight:700;letter-spacing:2px;color:#202720">IZUIRE</div><div style="margin-top:5px;font-size:10px;font-weight:700;letter-spacing:1.4px;color:#a84c12">SOURCING · INSPECTION · SHIPPING</div></td></tr><tr><td style="padding:30px;background:#fff;border-top:1px solid #e6e9e4"><div style="margin-bottom:10px;font-size:10px;font-weight:700;letter-spacing:1.5px;color:#a84c12">A NOTE FROM YOUR SOURCING TEAM</div><h1 style="margin:0 0 24px;font-size:25px;line-height:1.25;font-weight:700;color:#202720">${safeSubject}</h1><div style="font-size:15px;line-height:1.75;color:#3d463f">${paragraphs}${imageMarkup}</div></td></tr><tr><td style="padding:21px 30px;background:#f7f8f5;border-top:1px solid #e6e9e4"><div style="font-size:12px;font-weight:700;letter-spacing:1px;color:#202720">IZUIRE CO. LTD.</div><div style="margin-top:6px;font-size:12px;line-height:1.6;color:#68716b">Your trusted bridge from China to Africa<br><a href="https://izuire.com" style="color:#a84c12">izuire.com</a> &nbsp;·&nbsp; <a href="mailto:hello@izuire.com" style="color:#a84c12">hello@izuire.com</a></div></td></tr></table></td></tr></table></body></html>`;

  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!serviceRoleKey) return jsonResponse({ error: 'Email history storage is not configured.' }, 503);
  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: history, error: historyError } = await serviceClient
    .from('email_send_history')
    .insert({
      admin_user_id: authData.user.id,
      recipient_email: recipient.email,
      recipient_name: recipient.name || 'there',
      email_type: emailType,
      subject: personalizedSubject,
      body: personalizedBody,
      images,
      status: 'sending',
    })
    .select('id')
    .single();
  if (historyError || !history) return jsonResponse({ error: 'Could not save the email to send history, so it was not sent.' }, 500);

  let deliveryStatus: 'sent' | 'failed' | 'unknown' = 'sent';
  let deliveryError: string | null = null;
  let providerMessageId: string | null = null;
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [recipient.email], reply_to: authData.user.email, subject: personalizedSubject, html }),
    });
    const providerResult = await response.json().catch(() => null) as { id?: string; message?: string; name?: string } | null;
    if (!response.ok) {
      deliveryStatus = 'failed';
      deliveryError = providerResult?.message ?? `Email provider rejected the message (HTTP ${response.status}).`;
    } else {
      providerMessageId = providerResult?.id ?? null;
    }
  } catch (error) {
    deliveryStatus = 'unknown';
    deliveryError = error instanceof Error ? `Could not confirm provider delivery: ${error.message}` : 'Could not confirm provider delivery.';
  }

  await serviceClient.from('email_send_history').update({
    status: deliveryStatus,
    error_message: deliveryError,
    provider_message_id: providerMessageId,
    completed_at: new Date().toISOString(),
  }).eq('id', history.id);

  return jsonResponse({ sent: deliveryStatus === 'sent', status: deliveryStatus, error: deliveryError, historyId: history.id });
});
