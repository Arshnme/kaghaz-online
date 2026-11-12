# Database

SQL for the Supabase Postgres instance. Run these files in the Supabase SQL
editor, in order.

| File | Purpose |
| --- | --- |
| `01-schema.sql` | Complete schema. Safe on a fresh project, and drops and recreates everything if run against an existing one |
| `02-sample-data.sql` | Optional fake users and documents for local testing. Never run against production |
| `03-admin-queries.sql` | Read-only queries for inspection and maintenance. Not a migration |

## What 01-schema.sql creates

- **Tables:** `profiles`, `documents`, `document_files`, `document_views`,
  `document_likes`, `document_comments`, `user_follows`
- **Indexes** on the columns used for lookup, filtering and ordering, including
  a partial index on `(user_id, publish_to_profile)` for profile pages
- **Row Level Security** enabled on every table, with policies for owner access,
  public document access, and published-in-profile access
- **Storage buckets:** `document-files` (private) and `avatars` (public), each
  with policies restricting writes to a folder named after the owner's user id
- **Functions:** `handle_new_user` (creates a profile when a user signs up),
  `update_updated_at_column`, `update_document_stats`, `search_documents`,
  `get_user_published_documents`
- **Views:** `public_stats`

## Notes on specific decisions

**Username assignment.** `handle_new_user` chooses a username in this order:
`username` from signup metadata, then `preferred_username`, then `user_name`,
then the part of the email before the `@`, then a random suffix derived from the
user's id. The result is lowercased and stripped to `[a-z0-9_]`. The first
candidate is not necessarily used: if it collides with an existing profile, a
numeric suffix is appended until it is unique. Putting `username` first matters
because the signup form asks for one, and deriving it from the email address
instead silently discards the user's choice.

**Avatar cleanup triggers are intentionally absent.** Earlier versions created
`cleanup_old_avatars` and `cleanup_user_avatar` triggers that called
`storage.delete_object()` from PL/pgSQL. Supabase does not expose that function
to SQL, so every avatar update failed with
`function storage.delete_object(...) does not exist`. Deleting the previous
avatar is handled in application code now, in
`app/api/profile/avatar/route.ts`.

**Aggregate counters.** `view_count` and `like_count` on `documents` are
maintained by triggers on `document_views` and `document_likes` rather than
counted on read. Reading a popular document is therefore cheap, at the cost of
the counters drifting if rows are ever inserted or deleted outside those
triggers.

## Changing the schema

There is no migration framework. To change the schema:

1. Edit `01-schema.sql` so a fresh install produces the new shape.
2. Write the `ALTER` statements needed to bring an existing database to that
   shape, and run them by hand in the SQL editor.
3. Confirm the application still builds and that RLS policies still admit the
   queries the route handlers make.

## Resetting a database

`01-schema.sql` begins by dropping the tables and functions it manages, so
running it again rebuilds the schema from scratch. This deletes all documents
and profiles, and the storage buckets are left in place but not emptied.

## Backups

Supabase takes daily backups on paid plans. For anything you care about, make
your own dump as well:

```bash
pg_dump -h <host> -U postgres -d postgres > backup.sql
psql -h <host> -U postgres -d postgres < backup.sql
```

Note that documents are encrypted at rest with `ENCRYPTION_KEY`. A dump alone
is not enough to read them; you need the matching key too.
