# Kaghaz Online

[فارسی](README.fa.md)

A web app for writing and sharing documents, built Persian-first. The interface
is right-to-left, the editor ships with Vazirmatn, and the typography and
alignment handling assume Persian text as the default case rather than
something bolted on afterwards.

People use it to draft a document in a rich text editor, decide who can see it,
and hand out a link. Documents can be public, private, or public behind a
password, and a user can publish a selection of them onto a profile page under
their own username.

## Demo

Live instance: <https://kaghaz-online.vercel.app>

Source: <https://github.com/Arshnme/kaghaz-online>

## What it does

**Accounts.** Email and password sign-up with optional email confirmation, plus
OAuth. Users pick a username at signup; it is validated on both the client and
the server, checked for availability before the account is created, and rejected
against a reserved list in `reserved-usernames.json` so that names like `admin`
or `dashboard` cannot be taken and used to impersonate the site.

**Writing.** A TipTap editor with headings, lists, quotes, code blocks, links,
images, file attachments, bold, italic, underline, strikethrough, text colour,
highlight, font family, font size, and left/centre/right alignment. Documents
save themselves as you type, on a debounce.

**Sharing.** Per-document visibility (public or private), an optional password
gate on public documents, and a separate "publish to profile" flag for
documents that should appear on the author's profile page but not be listed
anywhere else.

**Attachments.** Files can be attached to a document and are stored in a
private Supabase Storage bucket, reachable only through an API route that
checks document access first. Filenames are encrypted along with the document.

**Dashboard.** Grid and list views, search, filtering by visibility, and
drag-to-reorder that persists.

**Profiles.** A public page per user at `/[username]` listing their published
documents with per-document view and like counts, plus totals across the
profile. Owners get a tabbed editor for their display name, bio, website,
location, avatar (uploaded with a cropping step), username and password.

**At rest.** Document titles, bodies, per-document passwords and attachment
filenames are encrypted server-side before they reach the database. Details in
[Encryption](#encryption).

## Encryption

Encryption happens entirely on the server, in `lib/crypto.ts`. That module uses
Node's built-in `crypto`, which does not exist in a browser, and every call site
is a route handler or a Server Component. No key is ever sent to the client.

| | |
| --- | --- |
| Algorithm | AES-256-CBC |
| Key | SHA-256 of the `ENCRYPTION_KEY` environment variable |
| Initialisation vector | 16 random bytes, generated fresh for every value |
| Stored format | `<iv>:<ciphertext>`, both hex |

Because the IV is random per value, encrypting the same text twice produces
different ciphertext.

Encrypted:

- Document title (`documents.title`)
- Document body (`documents.content`)
- Per-document password (`documents.password`)
- Attachment filename (`document_files.original_filename`)

This runs in four places: creating a document, updating one, uploading an
attachment, and reading a document back. A document's text is never written to
the database in the clear.

Not encrypted, which is worth knowing before you rely on this:

- Profile fields: username, email, display name, bio, website, location
- Document metadata: visibility, the profile-publish flag, ordering, view and
  like counts, timestamps
- The public document slug (`document_id`) that appears in URLs
- Attachment contents. The files themselves sit in a private Storage bucket;
  only their filenames are encrypted.

So the text of a document is protected, its metadata is not. Encrypting the
metadata as well would have to be added separately.

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 15, App Router |
| UI | React 19, Tailwind CSS, shadcn/ui on Radix primitives |
| Editor | TipTap 2 |
| Backend | Supabase — Postgres, Auth, Storage |
| Language | TypeScript, strict mode |
| Hosting | Anything that runs Next.js; Vercel is the path of least resistance |

There is no separate API service. Server Components render pages, Client
Components handle interaction, and the privileged work lives in the route
handlers under `app/api/`.

## Getting started

You need Node.js 20 or newer and a Supabase project. The free tier is
sufficient.

```bash
git clone https://github.com/Arshnme/kaghaz-online.git
cd kaghaz-online
npm install
```

Create the database by running `database/01-schema.sql` in the Supabase SQL
editor. It creates the tables, indexes, Row Level Security policies, functions,
triggers and storage buckets. Optionally run `database/02-sample-data.sql`
afterwards to get some fake users and documents to look at.

Then set up your environment:

```bash
cp .env.example .env.local
openssl rand -base64 32   # ENCRYPTION_KEY
openssl rand -base64 32   # JWT_SECRET
```

Fill in the Supabase URL and keys, then:

```bash
npm run dev
```

The app is at `http://localhost:3000`.

The full walkthrough, including the Supabase authentication settings that are
easy to get wrong, is in [docs/deployment.md](docs/deployment.md).

## Environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | `https://<project-ref>.supabase.co`. Also used to allow images from your Supabase project |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Public. Exposed to the browser by design; Row Level Security is what protects the data |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server only. Bypasses Row Level Security, so it must never be sent to the browser |
| `ENCRYPTION_KEY` | Yes | Encrypts document data at rest. Losing or changing it makes existing documents unreadable |
| `JWT_SECRET` | Yes | Signs session tokens |
| `GOOGLE_SITE_VERIFICATION` | No | Rendered as a meta tag when set |
| `YANDEX_SITE_VERIFICATION` | No | Same |

## Scripts

```bash
npm run dev        # development server
npm run build      # production build
npm run start      # serve the production build
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
```

## Project layout

```
app/                    App Router pages and API route handlers
  api/                  Privileged data access
  dashboard/            Document list
  editor/[id]/          The editor
  [username]/           Public profile and public documents
components/
  ui/                   shadcn/ui primitives
  auth/ dashboard/ editor/ public/
lib/                    Server-side helpers: encryption, tokens, caching, validation
database/               SQL for schema, sample data and admin queries
docs/                   Architecture and deployment notes
hooks/                  React hooks
public/                 Static assets and the web app manifest
```

[Architecture](docs/architecture.md) describes the data model, the routing
table and how the two access-control layers divide responsibility.

## Security notes

Three things are worth knowing before you deploy this.

**The service role key bypasses Row Level Security completely.** It is used by
the handlers under `app/api/auth/`, `app/api/profile/`, `app/api/documents/`
and `app/api/files/`, which is why those handlers do their own ownership checks
rather than leaning on RLS. Keep the key server-side.

**`ENCRYPTION_KEY` is not rotatable without a migration.** Changing it leaves
every previously written document title, body and attachment filename
undecryptable, and `decrypt` will return the raw ciphertext instead of failing,
by design, so that one bad row does not take down a whole page. Back the key up
somewhere you will still have it in a year.

**Document passwords are encrypted, not hashed.** They are decrypted and
compared when a visitor unlocks a shared document. This is deliberate, since the
plaintext is needed for comparison, but it means anyone holding
`ENCRYPTION_KEY` can recover the password on any shared document. Do not let
users reuse an important password for this.

`JWT_SECRET` and `ENCRYPTION_KEY` have no fallback values. If either is unset,
the operations that need it raise an error instead of quietly using a default,
because a default committed to a public repository is not a secret.

## Status

Working, and used. Some parts are honest about being unfinished:

- The icon files referenced by `app/layout.tsx` and `public/manifest.json` are
  not in the repository. See [public/README.md](public/README.md) for the list.
- `/terms`, `/privacy` and `/about` are linked from the signup form and listed
  in the sitemap, but the pages do not exist yet.
- `app/api/analytics/track/route.ts` is a stub that logs and returns success, and
  `app/api/check-username/route.ts` works but nothing calls it. The signup form
  checks availability against Supabase directly instead.
- The `document_comments` and `user_follows` tables exist in the schema but
  have no UI.
- Supabase has deprecated `@supabase/auth-helpers-nextjs`, which this project
  uses, in favour of `@supabase/ssr`. Migrating is the main outstanding piece of
  work. [Architecture](docs/architecture.md) explains what is involved.
- There are no automated tests. CI runs lint, typecheck and build only.

## Contributing

Issues and pull requests are welcome. Run `npm run lint` and
`npm run typecheck` before opening a pull request, and keep the existing code
style: no semicolons, double quotes, two-space indent.

## License

[AGPL-3.0](LICENSE). If you run a modified version of this as a network
service, you are required to publish your source.
