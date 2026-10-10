import { SUPABASE_URL } from '../../../environments/environment';

export interface EmailImage {
  name: string;
  path: string;
  url: string;
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

function trustedImageUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:'
      && url.origin === new URL(SUPABASE_URL).origin
      && url.pathname.startsWith('/storage/v1/object/public/admin-email-assets/');
  } catch {
    return false;
  }
}

export function renderEmailHtml(body: string, images: EmailImage[], subject = 'A note from Izuire'): string {
  const safeSubject = escapeHtml(subject.trim() || 'A note from Izuire');
  const paragraphs = body.trim().split(/\n{2,}/).filter(Boolean)
    .map((paragraph) => `<p style="margin:0 0 18px">${linkify(paragraph)}</p>`).join('');
  const imageMarkup = images.filter((image) => trustedImageUrl(image.url)).map((image) => {
    const name = escapeHtml(image.name);
    const url = escapeHtml(image.url);
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0"><tr><td align="center"><a href="${url}" target="_blank" rel="noopener noreferrer"><img src="${url}" alt="${name}" style="display:block;max-width:100%;height:auto;border:0;border-radius:4px"></a><p style="margin:8px 0 0;font:12px Arial,sans-serif;color:#68716b"><a href="${url}" target="_blank" rel="noopener noreferrer" style="color:#a84c12">IMG ${name}</a></p></td></tr></table>`;
  }).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#f1f3ef;color:#202720;font-family:Arial,Helvetica,sans-serif"><div style="display:none;max-height:0;overflow:hidden;opacity:0">${safeSubject} · A personal note from Izuire</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f3ef"><tr><td align="center" style="padding:32px 14px"><table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;border-collapse:collapse"><tr><td style="padding:22px 30px;background:#fff;border-top:4px solid #f5821f"><div style="font-size:22px;font-weight:700;letter-spacing:2px;color:#202720">IZUIRE</div><div style="margin-top:5px;font-size:10px;font-weight:700;letter-spacing:1.4px;color:#a84c12">SOURCING · INSPECTION · SHIPPING</div></td></tr><tr><td style="padding:30px;background:#fff;border-top:1px solid #e6e9e4"><div style="margin-bottom:10px;font-size:10px;font-weight:700;letter-spacing:1.5px;color:#a84c12">A NOTE FROM YOUR SOURCING TEAM</div><h1 style="margin:0 0 24px;font-size:25px;line-height:1.25;font-weight:700;color:#202720">${safeSubject}</h1><div style="font-size:15px;line-height:1.75;color:#3d463f">${paragraphs}${imageMarkup}</div></td></tr><tr><td style="padding:21px 30px;background:#f7f8f5;border-top:1px solid #e6e9e4"><div style="font-size:12px;font-weight:700;letter-spacing:1px;color:#202720">IZUIRE CO. LTD.</div><div style="margin-top:6px;font-size:12px;line-height:1.6;color:#68716b">Your trusted bridge from China to Africa<br><a href="https://izuire.com" style="color:#a84c12">izuire.com</a> &nbsp;·&nbsp; <a href="mailto:hello@izuire.com" style="color:#a84c12">hello@izuire.com</a></div></td></tr></table></td></tr></table></body></html>`;
}