-- Phase 1 (part 3a: rating trigger + settings + touch)
create or replace function public.refresh_product_rating()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.products p
  set rating = coalesce((select round(avg(r.rating)::numeric, 1)
        from public.reviews r where r.product_id = coalesce(new.product_id, old.product_id)), 4.5),
      rating_count = coalesce((select count(*) from public.reviews r
        where r.product_id = coalesce(new.product_id, old.product_id)), 0),
      updated_at = now()
  where p.id = coalesce(new.product_id, old.product_id);
  return coalesce(new, old);
end $$;
drop trigger if exists reviews_refresh_rating on public.reviews;
create trigger reviews_refresh_rating after insert or update or delete on public.reviews
  for each row execute function public.refresh_product_rating();

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  theme text not null default 'light' check (theme in ('light','dark')),
  currency text not null default 'NGN',
  notifications jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
drop trigger if exists products_touch on public.products;
create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();
drop trigger if exists orders_touch on public.orders;
create trigger orders_touch before update on public.orders
  for each row execute function public.touch_updated_at();
