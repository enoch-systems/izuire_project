create table if not exists public.newsletter_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  created_at timestamptz not null default now(),
  constraint newsletter_signups_email_format check (
    length(email) <= 254 and email = lower(btrim(email)) and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  )
);

create unique index if not exists newsletter_signups_email_lower_idx
  on public.newsletter_signups (lower(email));

alter table public.newsletter_signups enable row level security;

drop policy if exists newsletter_signups_public_insert on public.newsletter_signups;
create policy newsletter_signups_public_insert on public.newsletter_signups
  for insert to anon, authenticated
  with check (
    length(email) <= 254 and email = lower(btrim(email)) and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  );

drop policy if exists newsletter_signups_admin_read on public.newsletter_signups;
create policy newsletter_signups_admin_read on public.newsletter_signups
  for select to authenticated
  using (public.is_admin());