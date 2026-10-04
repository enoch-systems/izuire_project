-- Izuire Supabase schema — Phase 1 (part 1: tables + gallery/kobo notes)
-- Run: supabase db push  (linked) — or paste parts 1-3 into SQL editor.
-- Prices are INTEGER kobo (NGN minor units): display divides by 100, so
-- "price changes when set in cents" stay exact — no float drift.
-- Every per-user row carries user_id = auth.uid(); RLS keeps user data separate.
create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  email text not null default '',
  phone text default '',
  company text default '',
  avatar_url text default '',
  member_tier text not null default 'Standard'
    check (member_tier in ('Standard', 'Verified', 'Enterprise')),
  shipping jsonb not null default '{}'::jsonb,
  billing jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_admins (
  email text primary key,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.app_admins a
  where lower(a.email) = lower(coalesce((auth.jwt() ->> 'email'), ''))) $$;

create table if not exists public.products (
  id text primary key,
  icon text not null default 'box'
    check (icon in ('screen','earbuds','bale','building','hair','sun','battery','sandal','pot','box')),
  badge text check (badge in ('Popular','Hot Deal','New','Best Selling')),
  cat text not null default 'general',
  name text not null default '',
  title text not null default '',
  ngn text not null default '',
  rmb text not null default '',
  unit text not null default '/ unit',
  specs text not null default '',
  moq text not null default '',
  price_kobo integer not null default 0 check (price_kobo >= 0),
  price_fen integer not null default 0 check (price_fen >= 0),
  unit_price integer not null default 0 check (unit_price >= 0),
  min_qty integer not null default 1 check (min_qty >= 1),
  featured boolean not null default false,
  featured_rank integer not null default 0,
  sort_rank integer not null default 0,
  active boolean not null default true,
  image jsonb,
  gallery jsonb not null default '[]'::jsonb,
  rating numeric(2,1) not null default 4.5 check (rating >= 0 and rating <= 5),
  rating_count integer not null default 0 check (rating_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists products_cat_idx on public.products (cat);
