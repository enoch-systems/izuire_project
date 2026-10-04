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

The app runs entirely on Supabase: auth, catalogue, orders, reviews and the
per-user settings. Nothing sensitive is committed — the anon key is public, and
the service_role key lives only in the git-ignored `.env`.

### One-time setup

1. Fill in `.env` (copy `.env.example`). At minimum set the real values for
   `NG_SUPABASE_URL`, `NG_SUPABASE_ANON_KEY`, `NG_ADMIN_EMAIL`,
   `NG_ADMIN_PASSWORD` and `SUPABASE_SERVICE_ROLE_KEY`.
2. Push the schema. The Supabase CLI needs either a personal access token
   (`supabase login`) **or** the database password:

   ```bash
   npm run db:link -- --password "<db-password>"   # or: export SUPABASE_ACCESS_TOKEN=sbp_...
   npm run db:push                                 # tables, RLS, triggers, seed rows, realtime
   ```

   Without a login you can push straight over a connection string:

   ```bash
   supabase db push --db-url "postgresql://postgres:<db-password>@db.pzjhjauzjljtigpgexdr.supabase.co:5432/postgres"
   ```
3. Create the admin and register the admin email:

   ```bash
   npm run db:seed
   ```

   That creates the admin auth user from `NG_ADMIN_EMAIL` / `NG_ADMIN_PASSWORD`
   (if missing) and adds the email to `public.app_admins`. Only emails in that
   table (or `NG_ADMIN_EMAIL`) can open `/admin`; every other signed-in user is
   bounced home.

### What is wired to the database

| Surface | Source of truth |
| --- | --- |
| Home featured rail, Marketplace grid, Search | `public.products` (realtime) |
| Product page gallery / thumbnails | `products.image` + `products.gallery` |
| Product rating + reviews | `public.reviews` (realtime), rating kept by a trigger |
| Payments / transaction history | `public.orders` for the signed-in `auth.uid()` (realtime) |
| Checkout (`/checkout`) | writes `orders` + `order_lines`, then settles the order |
| Profile, addresses, avatar | `public.profiles` + the private `avatars` bucket |
| Display currency | `public.user_settings` |

Prices settle in **integer kobo** (`products.price_kobo`), so a price typed in
cents is exact — display divides by 100 only for the reading.

Realtime requires the tables to be in the `supabase_realtime` publication; the
`20251003000007_izuire_realtime` migration adds `products`, `orders` and
`reviews` so the rails and histories move without a reload.

### Payment note

`OrderService.pay()` is the seam a gateway callback (Paystack, etc.) would sit
behind. With no live payment keys configured it marks the order `successful`
with a reference locally, so the checkout and history are fully exercised. Drop
a real callback in there and nothing else has to change.

