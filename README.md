# Izuire

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 22.1.7.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

## Supabase backend

The app uses Supabase for Auth, products, orders, reviews and user settings. The
Angular environment files are compiled into the app; `.env` is used by local
CLI/seed scripts and is not read by Angular. Only the public anon key belongs in
the frontend. Keep `SUPABASE_SERVICE_ROLE_KEY` in the git-ignored `.env` only.

Product photos and videos upload directly to Cloudinary through the unsigned
`izuire_catalog_unsigned_v1` preset. Its name is public; the Cloudinary API
secret is never used by frontend code. Product media URLs are stored on product
rows. Account avatars stay in the private Supabase `avatars` bucket.

### One-time setup

1. Set these values in the git-ignored `.env`:
   `NG_SUPABASE_URL`, `NG_SUPABASE_ANON_KEY`, `NG_ADMIN_EMAIL`,
   `NG_ADMIN_PASSWORD` and `SUPABASE_SERVICE_ROLE_KEY`.
   The Angular client config is maintained in `src/environments/environment.ts`
   and `environment.prod.ts`; changing `.env` alone does not alter an Angular
   build. Only public values go in those files.
2. Link and push migrations with the project-local Supabase CLI:

   ```bash
   npm exec supabase -- login
   npm run db:link
   npm run db:status
   npm run db:push
   ```

3. Create the admin Auth account and register it in `public.app_admins`:

   ```bash
   npm run db:seed
   ```

   The script creates or updates the Auth user using `NG_ADMIN_EMAIL` /
   `NG_ADMIN_PASSWORD`, then adds it to `public.app_admins`. RLS requires the
   email to be in that table for admin database access. The catalog intentionally
   starts empty; add the first listing from `/admin/products`.

### What is wired to the database

| Surface | Source of truth |
| --- | --- |
| Home, Marketplace, Search | `public.products` only (realtime; no bundled product fallback) |
| Product page media | Cloudinary URLs in `products.image`, `products.gallery`, and `products.videos` |
| Product rating + reviews | `public.reviews` (realtime), rating kept by a trigger |
| Payments / transaction history | `public.orders` for the signed-in `auth.uid()` (realtime) |
| Checkout (`/checkout`) | calls `public.place_order`; Postgres validates current catalog prices and atomically writes pending `orders` + `order_lines` |
| Registration and profile | `auth.users` + `public.profiles`; a database trigger creates each profile |
| Profile avatar | `public.profiles` + the private `avatars` bucket |
| Display currency | `public.user_settings` |

Order prices come only from `products.price_kobo` inside the database RPC; the
browser submits product IDs and quantities, never authoritative prices. Amounts
remain integer kobo, with display divided by 100 only for the reading.

Realtime requires the tables to be in the `supabase_realtime` publication; the
`20251003000007_izuire_realtime` migration adds `products`, `orders` and
`reviews` so the rails and histories move without a reload.

`20261007000000_izuire_fresh_catalog.sql` adds product videos, creates profiles
for new Auth users, and removes the historical starter listings so a clean
migration reset does not populate demo products.

### Payment note

Checkout creates a `pending` order request only. It does not collect payment or
mark an order successful. Customer clients cannot insert orders directly or
change order status; enable payment only after adding a trusted payment-provider
verification callback.

