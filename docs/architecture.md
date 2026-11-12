# Architecture

## Overview

Kaghaz Online is a single Next.js application. There is no separate backend
service: page rendering, authentication endpoints and data access all live in
the same deployment. Supabase provides Postgres, authentication and object
storage.

```
Browser
  |
  |  Server Components render pages, Client Components handle interaction
  v
Next.js App Router (app/)
  |            |
  |            |  Route Handlers under app/api/ talk to Supabase using the
  |            |  service role key and therefore bypass Row Level Security.
  |            |
  |            +--> lib/crypto.ts   encrypt/decrypt documents before they
  |            |                    reach the database
  |            |
  v            v
Supabase: Postgres (+ RLS), Auth, Storage
```

## Directory layout

| Path | Purpose |
| --- | --- |
| `app/` | App Router pages and API route handlers |
| `app/api/` | Route handlers; all privileged database work happens here |
| `components/` | React components, grouped by feature area |
| `components/ui/` | shadcn/ui primitives, generated and largely unmodified |
| `lib/` | Shared server-side utilities |
| `hooks/` | React hooks |
| `database/` | SQL to create the schema, sample data and admin queries |
| `docs/` | These documents |

## Routing

| Route | Access | Description |
| --- | --- | --- |
| `/` | Public | Sign-in and sign-up. Redirects to `/dashboard` when a session exists |
| `/dashboard` | Requires session | Document list, search, filtering, drag-to-reorder, document creation |
| `/editor/[id]` | Requires session | TipTap editor for one document, sharing controls, attachments |
| `/[username]` | Public | Public profile listing documents the user published |
| `/[username]/profile` | Public | Published documents plus, for the owner, editable profile tabs |
| `/[username]/[document_id]` | Public | A single public document, password prompt when the document is protected |
| `/auth/callback` | Public | OAuth redirect target; exchanges the code for a session |

`middleware.ts` refreshes the Supabase session on every request, redirects
unauthenticated users away from `/dashboard` and `/editor`, and redirects
authenticated users away from `/`.

## Data model

Seven tables, all defined in `database/01-schema.sql`.

| Table | Notes |
| --- | --- |
| `profiles` | One row per user, created by an `auth.users` trigger. Holds username, display name, bio, avatar URL |
| `documents` | Owned by a profile. `is_public` controls public visibility, `publish_to_profile` controls whether it appears on the profile page, `order_index` stores manual ordering |
| `document_files` | Attachments belonging to a document |
| `document_views` | One row per view, used for view counts |
| `document_likes` | One row per like |
| `document_comments` | Present in the schema, not yet surfaced in the UI |
| `user_follows` | Present in the schema, not yet surfaced in the UI |

Row Level Security is enabled on every table. Users can read and write their
own rows, everyone can read public documents, and the "published in profile"
policy additionally requires `publish_to_profile = true`.

## Access control, in two layers

The application relies on two independent mechanisms, and it is worth being
clear about which one protects what.

1. **Row Level Security in Postgres.** Enforced whenever Supabase is queried
   with the anon key. This is the layer that protects data from a malicious
   client. It is the security boundary.

2. **Privileged route handlers.** The handlers under `app/api/profile/` and
   `app/api/auth/` use `SUPABASE_SERVICE_ROLE_KEY`, which bypasses RLS. They
   must therefore do their own authorisation checks, and they do: they read the
   caller's session from cookies and confirm the caller owns the row before
   mutating it.

Because the service role key bypasses RLS entirely, it must never be exposed to
the browser. It is not a `NEXT_PUBLIC_` variable and has no client-side
consumer.

## Encryption at rest

`lib/crypto.ts` encrypts document titles, contents, per-document passwords and
attachment filenames with AES-256-CBC before they are written to Postgres. This
is a server-only module: it imports Node's built-in `crypto`, which does not
exist in a browser, and every call site is a route handler or a Server
Component. No key is ever sent to the client.

The key is the SHA-256 digest of `ENCRYPTION_KEY`. Hashing it is what allows a
key of any length to be used with a 256-bit cipher. The initialisation vector is
16 random bytes generated per value and stored prepended to the ciphertext,
separated by a colon, so encrypting the same text twice produces different
output.

Two deliberate properties:

- The key is read from `ENCRYPTION_KEY` at call time, and a missing key raises
  an error rather than falling back to a default. A committed default key would
  make the encryption worthless, since anyone with the repository could decrypt
  every document.
- `decrypt` returns its input unchanged when the value is not in encrypted
  form, or when decryption fails. Rows written before encryption was
  introduced, and values written under a rotated key, stay readable.

Note that `document.password` is encrypted and compared after decryption rather
than hashed. That is a defensible choice for a share link, but it means the
plaintext password is recoverable by anyone who holds the encryption key.

## Known gaps

- The icon files referenced by `app/layout.tsx` and `public/manifest.json` are
  not present in the repository. See `public/README.md`.
- `document_comments` and `user_follows` are defined but unused.
- Encryption keys are single-valued, so rotating `ENCRYPTION_KEY` requires
  re-encrypting existing rows; there is no migration tool for that yet.
- `/terms`, `/privacy` and `/about` are linked from the signup form and listed
  in `app/sitemap.ts`, but no pages exist for them yet. The links currently
  reach the 404 page.
- `app/api/analytics/track/route.ts` is a stub. Nothing calls it.
- `app/api/check-username/route.ts` works, but nothing calls it either. The
  signup form queries `profiles` directly through the browser client to check
  availability, so this route is a second implementation of the same check.

## A note on the Supabase packages

This application uses `@supabase/auth-helpers-nextjs`, which Supabase has
deprecated in favour of `@supabase/ssr`. The two are not drop-in compatible:
`@supabase/ssr` replaces `createServerComponentClient`, `createRouteHandlerClient`
and `createMiddlewareClient` with `createServerClient` plus an explicit cookie
adapter, so the migration touches every file that currently creates a client.

The helper packages are kept for now because they work. Two things are worth
knowing about them:

1. They must stay listed in `serverExternalPackages` in `next.config.mjs`. When
   webpack bundles them, their circular initialisation between
   `CookieAuthStorageAdapter` and its base class collapses and every affected
   route fails at runtime with
   `Class extends value undefined is not a constructor or null`. Required
   natively, both packages load correctly.
2. Because the packages are unmaintained, keep `@supabase/supabase-js` pinned to
   a range you have actually tested. Upgrading it across many minor versions is
   what broke this build once already; the helper packages were written against
   Supabase 2.39 and the caret range had drifted to 2.119.

Migrating to `@supabase/ssr` is the right long-term move and is the main piece
of outstanding technical debt in this codebase.
