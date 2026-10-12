import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface MediaAsset {
  publicId: string;
  resourceType: 'image' | 'video' | 'raw';
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function cloudinaryAsset(src: string, cloudName: string): MediaAsset | null {
  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return null;
  }
  if (url.hostname !== 'res.cloudinary.com') return null;

  const parts = url.pathname.split('/').filter(Boolean).map((part) => decodeURIComponent(part));
  if (parts[0] !== cloudName) {
    throw new Error('This product has media in another Cloudinary account; its credentials must be configured before deletion.');
  }
  const uploadIndex = parts.indexOf('upload');
  if (uploadIndex < 2) throw new Error('Could not identify a Cloudinary upload URL for this product.');

  const resourceType = parts[uploadIndex - 1];
  if (!['image', 'video', 'raw'].includes(resourceType)) {
    throw new Error('This product has an unsupported Cloudinary media type.');
  }
  const versionIndex = parts.findIndex((part, index) => index > uploadIndex && /^v\d+$/.test(part));
  if (versionIndex < 0) throw new Error('Could not identify the Cloudinary asset version for this product.');

  const publicId = parts.slice(versionIndex + 1).join('/').replace(/\.[^/.]+$/, '');
  if (!publicId) throw new Error('Could not identify a Cloudinary public ID for this product.');
  return { publicId, resourceType: resourceType as MediaAsset['resourceType'] };
}

function productMedia(product: Record<string, unknown>, cloudName: string): MediaAsset[] {
  const sources: string[] = [];
  const cover = product['image'];
  if (typeof cover === 'string') sources.push(cover);
  else if (cover && typeof cover === 'object' && typeof (cover as { src?: unknown }).src === 'string') {
    sources.push((cover as { src: string }).src);
  }

  for (const field of ['gallery', 'videos']) {
    const media = product[field];
    if (!Array.isArray(media)) continue;
    for (const item of media) {
      const src = typeof item === 'string' ? item : (item as { src?: unknown } | null)?.src;
      if (typeof src === 'string') sources.push(src);
    }
  }

  const unique = new Map<string, MediaAsset>();
  for (const src of sources) {
    const asset = cloudinaryAsset(src, cloudName);
    if (asset) unique.set(`${asset.resourceType}:${asset.publicId}`, asset);
  }
  return [...unique.values()];
}

async function signatureFor(params: Record<string, string>, apiSecret: string): Promise<string> {
  const canonical = Object.entries(params)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
  const bytes = new TextEncoder().encode(`${canonical}${apiSecret}`);
  const digest = await crypto.subtle.digest('SHA-1', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function destroyCloudinaryAsset(
  asset: MediaAsset,
  cloudName: string,
  apiKey: string,
  apiSecret: string,
): Promise<void> {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = await signatureFor({ public_id: asset.publicId, timestamp }, apiSecret);
  const body = new URLSearchParams({
    public_id: asset.publicId,
    timestamp,
    api_key: apiKey,
    signature,
  });
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/${asset.resourceType}/destroy`,
    { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body },
  );
  const result = await response.json().catch(() => null) as { result?: string; error?: { message?: string } } | null;
  if (!response.ok || !['ok', 'not found'].includes(result?.result ?? '')) {
    throw new Error(result?.error?.message ?? `Cloudinary could not delete ${asset.publicId}.`);
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405);

  const authorization = request.headers.get('Authorization');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!authorization?.startsWith('Bearer ') || !supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse({ error: 'Sign in as an administrator to delete products.' }, 401);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user?.email) return jsonResponse({ error: 'Your admin session is no longer valid.' }, 401);

  const { data: adminRow, error: adminError } = await userClient
    .from('app_admins')
    .select('email')
    .ilike('email', authData.user.email)
    .maybeSingle();
  if (adminError || !adminRow) return jsonResponse({ error: 'Only administrators can delete products.' }, 403);

  let payload: { productId?: unknown };
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid delete request.' }, 400);
  }
  const productId = typeof payload.productId === 'string' ? payload.productId.trim() : '';
  if (!productId || productId.length > 160) return jsonResponse({ error: 'Choose a valid product.' }, 400);

  const cloudName = Deno.env.get('CLOUDINARY_CLOUD_NAME');
  const apiKey = Deno.env.get('CLOUDINARY_API_KEY');
  const apiSecret = Deno.env.get('CLOUDINARY_API_SECRET');
  if (!cloudName || !apiKey || !apiSecret) {
    return jsonResponse({ error: 'Cloudinary deletion is not configured on the server.' }, 503);
  }

  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: product, error: productError } = await serviceClient
    .from('products')
    .select('id,image,gallery,videos')
    .eq('id', productId)
    .maybeSingle();
  if (productError) return jsonResponse({ error: 'Could not load the product media.' }, 500);
  if (!product) return jsonResponse({ error: 'This product has already been deleted.' }, 404);

  let assets: MediaAsset[];
  let referencedByOtherProducts: Set<string>;
  try {
    assets = productMedia(product as Record<string, unknown>, cloudName);
    const { data: others, error: othersError } = await serviceClient
      .from('products')
      .select('image,gallery,videos')
      .neq('id', productId);
    if (othersError) return jsonResponse({ error: 'Could not verify product media references.' }, 500);
    referencedByOtherProducts = new Set(
      (others ?? []).flatMap((row) => productMedia(row as Record<string, unknown>, cloudName))
        .map((asset) => `${asset.resourceType}:${asset.publicId}`),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Cloudinary media could not be deleted.';
    return jsonResponse({ error: `${message} The product was not deleted.` }, 502);
  }

  const { error: deleteError } = await serviceClient.from('products').delete().eq('id', productId);
  if (deleteError) return jsonResponse({ error: 'Media was removed, but the product row could not be deleted.' }, 500);

  let cleanupComplete = true;
  for (const asset of assets) {
    if (referencedByOtherProducts.has(`${asset.resourceType}:${asset.publicId}`)) continue;
    try {
      await destroyCloudinaryAsset(asset, cloudName, apiKey, apiSecret);
    } catch {
      cleanupComplete = false;
    }
  }

  return jsonResponse({ deleted: true, cleanupComplete });
});
