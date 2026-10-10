-- Start the new catalogue empty and store Cloudinary videos alongside images.
alter table public.products
  add column if not exists videos jsonb not null default '[]'::jsonb;

delete from public.products;

-- Create a real profile row for every new Supabase Auth account, including the
-- admin account provisioned by tools/seed-db.mjs.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    coalesce(new.email, '')
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();