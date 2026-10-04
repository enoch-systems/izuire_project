create index if not exists products_featured_idx
  on public.products (featured, featured_rank) where featured and active;

create table if not exists public.cart_lines (
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id text not null references public.products (id) on delete cascade,
  qty integer not null default 1 check (qty >= 1),
  unit_price_kobo integer not null default 0 check (unit_price_kobo >= 0),
  snapshot jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  number text not null unique,
  title text not null default '',
  items_summary text not null default '',
  subtotal_kobo integer not null default 0 check (subtotal_kobo >= 0),
  currency text not null default 'NGN' check (currency in ('NGN','CNY','USD')),
  status text not null default 'pending'
    check (status in ('pending','successful','failed','refunded')),
  method text not null default '',
  reference text default '',
  tracking text default '',
  eta text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists orders_user_idx on public.orders (user_id, created_at desc);

create table if not exists public.order_lines (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id text not null,
  title text not null default '',
  qty integer not null default 1 check (qty >= 1),
  unit_price_kobo integer not null default 0 check (unit_price_kobo >= 0),
  snapshot jsonb not null default '{}'::jsonb
);
create index if not exists order_lines_order_idx on public.order_lines (order_id);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id text not null references public.products (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  rating integer not null check (rating >= 1 and rating <= 5),
  title text not null default '',
  body text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, user_id)
);
create index if not exists reviews_product_idx on public.reviews (product_id, created_at desc);
