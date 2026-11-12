# Deployment

## Prerequisites

- Node.js 20 or newer
- A Supabase project (the free tier is enough)
- npm

## 1. Install dependencies

```bash
npm install
```

## 2. Create the database schema

In the Supabase dashboard, open the SQL editor and run the files in order:

1. `database/01-schema.sql` — tables, indexes, Row Level Security policies,
   functions, triggers, storage buckets and the aggregate views.
2. `database/02-sample-data.sql` — optional. Inserts a handful of fake users
   and documents so the dashboard and profile pages have something to render.
   Do not run this against a production database.
3. `database/03-admin-queries.sql` — not a migration. A collection of queries
   for inspecting and maintaining an existing database.

If your project already has the schema and you are running an older version of
the app, note that the avatar cleanup triggers were removed from the schema
because they called `storage.delete_object()` from PL/pgSQL, which Supabase does
not expose as a SQL function. If you applied the schema before this change and
see `function storage.delete_object(...) does not exist` when a user changes
their avatar, drop the two triggers:

```sql
DROP TRIGGER IF EXISTS cleanup_old_avatars_trigger ON profiles;
DROP TRIGGER IF EXISTS cleanup_user_avatar_trigger ON profiles;
DROP FUNCTION IF EXISTS cleanup_old_avatars();
DROP FUNCTION IF EXISTS cleanup_user_avatar();
```

Avatar cleanup is handled in application code now.

## 3. Configure authentication

In the Supabase dashboard under Authentication:

- Enable the Email provider. If you keep email confirmation on, the app's signup
  flow will ask the user to confirm before the first sign-in.
- Enable any OAuth providers you want under Providers. For each one, add the
  redirect URL `${SITE_URL}/auth/callback`, where `SITE_URL` is
  `http://localhost:3000` in development and your real domain in production.
- Under URL Configuration, add both `SITE_URL` and `${SITE_URL}/auth/callback`
  to the allowed redirect list. A missing entry here is the most common cause of
  an OAuth sign-in that silently returns to the home page.

`app/auth/callback/route.ts` creates a `profiles` row for OAuth users that do
not have one yet. For email signups the `handle_new_user` trigger in the schema
does it instead.

## 4. Set environment variables

```bash
cp .env.example .env.local
```

Fill in every value. The two secrets must be random:

```bash
openssl rand -base64 32   # ENCRYPTION_KEY
openssl rand -base64 32   # JWT_SECRET
```

`SUPABASE_SERVICE_ROLE_KEY` bypasses Row Level Security. Keep it out of version
control and never reference it from a Client Component.

## 5. Run

```bash
npm run dev     # development on http://localhost:3000
npm run build   # production build
npm run start   # serve the production build
```

## Deploying to Vercel

1. Import the repository into Vercel. The framework is detected automatically.
2. Add the environment variables from `.env.local` in the project settings.
   Add them for the Production and Preview environments you actually use.
3. Deploy.
4. Update the Supabase authentication settings so that the production domain
   replaces or joins `http://localhost:3000` in the redirect allowlist.

Two things to remember on a redeploy:

- `ENCRYPTION_KEY` must stay the same across deployments. Changing it makes
  every previously encrypted document title, body and attachment filename
  undecryptable, and `decrypt` will hand back the raw ciphertext.
- `NEXT_PUBLIC_*` variables are inlined into the client bundle at build time.
  Changing one requires a rebuild, not just a restart.

## Other hosts

Any host that runs Next.js 15 works. The application needs Node.js and outbound
HTTPS access to Supabase; there is no filesystem state to persist.

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| OAuth returns to `/` with `?error=auth_callback_error` | Redirect URL not allowlisted in Supabase, or a provider key mismatch |
| `ENCRYPTION_KEY is not set` | `.env.local` is missing or `ENCRYPTION_KEY` was not set on the host |
| `JWT_SECRET is not set` | Same, for the token signing secret |
| Documents render as long hex strings | `ENCRYPTION_KEY` changed since those rows were written |
| Avatar upload fails with `storage.delete_object` errors | Old triggers still present; see step 2 |
| `new row violates row-level security policy` | The schema was not applied, or a handler is querying with the anon key where it needs the service role key |
| Build or runtime fails with `Class extends value undefined is not a constructor or null` | A package that must be required natively is being bundled. Check the `serverExternalPackages` list in `next.config.mjs` still contains `jsonwebtoken` and the `@supabase/auth-helpers-*` packages |
| Pages render but every Supabase call fails after a dependency update | `@supabase/supabase-js` was upgraded past what `@supabase/auth-helpers-nextjs` supports. See the note in `docs/architecture.md` |
