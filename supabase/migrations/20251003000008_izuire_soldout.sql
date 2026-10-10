-- Sold-out flag, toggled from /admin/products and read by the storefront.
-- Sold out stays visible (with a pill + disabled cart button); hidden (active=false)
-- disappears entirely. No backfill needed: default false keeps every row available.
alter table public.products
  add column if not exists sold_out boolean not null default false;
