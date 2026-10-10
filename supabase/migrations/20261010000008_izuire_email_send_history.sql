create table if not exists public.email_send_history (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references auth.users (id) on delete cascade,
  recipient_email text not null check (length(recipient_email) <= 254),
  recipient_name text not null check (length(recipient_name) between 1 and 160),
  email_type text not null check (email_type in ('welcome', 'newsletter', 'check-in', 'quote')),
  subject text not null check (length(subject) between 1 and 200),
  body text not null check (length(body) <= 20000),
  images jsonb not null default '[]'::jsonb check (jsonb_typeof(images) = 'array'),
  status text not null default 'sending' check (status in ('sending', 'sent', 'failed', 'unknown')),
  error_message text,
  provider_message_id text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists email_send_history_created_at_idx
  on public.email_send_history (created_at desc);
create index if not exists email_send_history_batch_lookup_idx
  on public.email_send_history (admin_user_id, created_at desc);

alter table public.email_send_history enable row level security;

drop policy if exists email_send_history_admin_select on public.email_send_history;
create policy email_send_history_admin_select on public.email_send_history
  for select to authenticated
  using (public.is_admin());

drop policy if exists email_send_history_admin_insert on public.email_send_history;
create policy email_send_history_admin_insert on public.email_send_history
  for insert to authenticated
  with check (public.is_admin() and admin_user_id = auth.uid());

grant select, insert on public.email_send_history to authenticated;
grant all on public.email_send_history to service_role;
