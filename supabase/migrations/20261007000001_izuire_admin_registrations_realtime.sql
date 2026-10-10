-- Admins can read profiles for registration monitoring; other customers remain
-- limited to their own profile rows by profiles_owner_rw.
drop policy if exists profiles_admin_read on public.profiles;
create policy profiles_admin_read on public.profiles
  for select to authenticated
  using (public.is_admin());

do $$ begin
  alter publication supabase_realtime add table public.profiles;
exception when duplicate_object then null; end $$;