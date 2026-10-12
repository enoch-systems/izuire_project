begin;

do $$ begin
  if exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'reviews'
  ) then
    alter publication supabase_realtime drop table public.reviews;
  end if;
end $$;

drop trigger if exists reviews_refresh_rating on public.reviews;
drop function if exists public.refresh_product_rating();
drop table if exists public.reviews;

alter table public.products
  drop column if exists rating,
  drop column if exists rating_count;

commit;