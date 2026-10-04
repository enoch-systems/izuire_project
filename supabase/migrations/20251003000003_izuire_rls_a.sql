-- Phase 1 (part 3b: RLS — owner-only rows, public products, admin gate)
alter table public.profiles enable row level security;
alter table public.app_admins enable row level security;
alter table public.products enable row level security;
alter table public.cart_lines enable row level security;
alter table public.orders enable row level security;
alter table public.order_lines enable row level security;
alter table public.reviews enable row level security;
alter table public.user_settings enable row level security;

drop policy if exists profiles_owner_rw on public.profiles;
create policy profiles_owner_rw on public.profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists admins_read on public.app_admins;
create policy admins_read on public.app_admins for select to authenticated using (true);
drop policy if exists admins_write on public.app_admins;
create policy admins_write on public.app_admins for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists products_public_read on public.products;
create policy products_public_read on public.products for select using (active = true);
drop policy if exists products_admin_rw on public.products;
create policy products_admin_rw on public.products for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists cart_owner_rw on public.cart_lines;
create policy cart_owner_rw on public.cart_lines
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists orders_owner_read on public.orders;
create policy orders_owner_read on public.orders for select using (auth.uid() = user_id);
drop policy if exists orders_owner_insert on public.orders;
create policy orders_owner_insert on public.orders for insert to authenticated
  with check (auth.uid() = user_id);
