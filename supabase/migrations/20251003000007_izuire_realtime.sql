-- Phase 1 (part 5: realtime).
-- Realtime only broadcasts row changes for tables that are members of the
-- supabase_realtime publication. Without this the app's channels connect but
-- never fire, so the home rail, the marketplace grid, the payments history and a
-- product's reviews would only move on a reload. Each add is wrapped so a table
-- already in the publication is a no-op rather than an error.
do $$ begin
  alter publication supabase_realtime add table public.products;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.orders;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.reviews;
exception when duplicate_object then null; end $$;
