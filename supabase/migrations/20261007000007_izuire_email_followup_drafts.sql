create table if not exists public.email_followup_drafts (
  id uuid primary key default gen_random_uuid(),
  subject text not null check (length(subject) between 1 and 200),
  body text not null check (length(body) <= 20000),
  recipients jsonb not null default '[]'::jsonb check (jsonb_typeof(recipients) = 'array'),
  images jsonb not null default '[]'::jsonb check (jsonb_typeof(images) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.email_followup_drafts enable row level security;

drop policy if exists email_followup_drafts_admin_all on public.email_followup_drafts;
create policy email_followup_drafts_admin_all on public.email_followup_drafts
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'admin-email-assets',
  'admin-email-assets',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists admin_email_assets_insert on storage.objects;
create policy admin_email_assets_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'admin-email-assets' and public.is_admin());

drop policy if exists admin_email_assets_delete on storage.objects;
create policy admin_email_assets_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'admin-email-assets' and public.is_admin());