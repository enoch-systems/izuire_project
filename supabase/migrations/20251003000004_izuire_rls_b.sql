-- Phase 1 (part 3c: RLS lines/reviews/settings + storage buckets)
drop policy if exists orders_admin_rw on public.orders;
create policy orders_admin_rw on public.orders for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists lines_owner_read on public.order_lines;
create policy lines_owner_read on public.order_lines for select using (
  exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
drop policy if exists lines_owner_insert on public.order_lines;
create policy lines_owner_insert on public.order_lines for insert to authenticated with check (
  exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
drop policy if exists lines_admin_rw on public.order_lines;
create policy lines_admin_rw on public.order_lines for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists reviews_public_read on public.reviews;
create policy reviews_public_read on public.reviews for select using (true);
drop policy if exists reviews_owner_write on public.reviews;
create policy reviews_owner_write on public.reviews for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists settings_owner_rw on public.user_settings;
create policy settings_owner_rw on public.user_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', false), ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists avatars_owner_rw on storage.objects;
create policy avatars_owner_rw on storage.objects for all to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists product_images_public_read on storage.objects;
create policy product_images_public_read on storage.objects for select
  using (bucket_id = 'product-images');
drop policy if exists product_images_admin_write on storage.objects;
create policy product_images_admin_write on storage.objects for all to authenticated
  using (bucket_id = 'product-images' and public.is_admin())
  with check (bucket_id = 'product-images' and public.is_admin());
