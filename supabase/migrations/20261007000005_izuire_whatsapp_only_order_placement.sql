-- Only the WhatsApp wrapper may be called by a signed-in customer. The wrapper
-- invokes place_order as its owner after applying the canonical price checks.
revoke all on function public.place_order(text, jsonb) from public, anon, authenticated;
