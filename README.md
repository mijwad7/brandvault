# BrandVault

Brand kit and asset library. Gemini tag suggestions run on the backend and are saved only after review in the library. The n8n workflow is not implemented yet.

## Stack

- React, TypeScript, Vite, Tailwind CSS
- Django, Django REST Framework
- PostgreSQL via Supabase
- Supabase Auth
- Supabase Storage for asset files and the brand logo. Bytes go from the browser to Storage. Django stores the path and the public URL.
- Gemini tagging on the backend, reviewed in the library before save
- n8n later, backend only

## Local setup

1. Create `backend/.env` from `backend/.env.example`.
2. Create `frontend/.env` from `frontend/.env.example`.
3. Activate the existing virtualenv (`venv\Scripts\activate` on Windows).
4. `pip install -r backend/requirements.txt`
5. `python backend/manage.py migrate`
6. `python backend/manage.py runserver`
7. `cd frontend && npm install && npm run dev`

Without `DATABASE_URL`, Django uses local SQLite in `DEBUG` only so the API can start. Point `DATABASE_URL` at Supabase Postgres before any real demo.

Without Supabase URL/JWT settings, the API starts but authenticated routes return 401. There is no placeholder auth bypass.

Gemini is backend-only and optional at boot. Leave `GEMINI_API_KEY` empty and the API still starts.

## File uploads (Supabase Storage)

The browser uploads bytes with the signed-in user's Supabase JWT and the anon key. Django never sees the file bytes and never uses the service role key for this.

Paths (the second folder is the Supabase Auth user id, `auth.uid()`, not the Django workspace id):

```
workspaces/{supabase_user_id}/assets/{asset_id}/{filename}
workspaces/{supabase_user_id}/brand/logo.{ext}
```

Asset rows are still scoped by workspace in Postgres. `GET /api/me` returns `workspace_id`, `supabase_user_id`, `storage_bucket`, and `storage_prefix`.

1. Supabase → Storage → New bucket.
2. Name: `assets` (same value as `SUPABASE_STORAGE_BUCKET` and `VITE_STORAGE_BUCKET`).
3. Public bucket: on, so image previews can use the public URL.
4. File size limit: 20 MB.
5. Allowed MIME types: leave empty, or restrict to the types you want in the forms (`image/*`, `video/*`, pdf, fonts).
6. Supabase → SQL Editor. Run the policies below. If the bucket already exists, the insert updates it.

```sql
insert into storage.buckets (id, name, public, file_size_limit)
values ('assets', 'assets', true, 20971520)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit;

drop policy if exists "brandvault_assets_select_own" on storage.objects;
drop policy if exists "brandvault_assets_insert_own" on storage.objects;
drop policy if exists "brandvault_assets_update_own" on storage.objects;
drop policy if exists "brandvault_assets_delete_own" on storage.objects;

create policy "brandvault_assets_select_own"
on storage.objects for select
to authenticated
using (
  bucket_id = 'assets'
  and (storage.foldername(name))[1] = 'workspaces'
  and (storage.foldername(name))[2] = auth.uid()::text
);

create policy "brandvault_assets_insert_own"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'assets'
  and (storage.foldername(name))[1] = 'workspaces'
  and (storage.foldername(name))[2] = auth.uid()::text
);

create policy "brandvault_assets_update_own"
on storage.objects for update
to authenticated
using (
  bucket_id = 'assets'
  and (storage.foldername(name))[1] = 'workspaces'
  and (storage.foldername(name))[2] = auth.uid()::text
)
with check (
  bucket_id = 'assets'
  and (storage.foldername(name))[1] = 'workspaces'
  and (storage.foldername(name))[2] = auth.uid()::text
);

create policy "brandvault_assets_delete_own"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'assets'
  and (storage.foldername(name))[1] = 'workspaces'
  and (storage.foldername(name))[2] = auth.uid()::text
);
```

A public bucket serves `getPublicUrl` without a SELECT policy. The SELECT policy is what lets the signed-in user list their own prefix. Writes still require the insert/update policies. Upsert needs both insert and update.

If those policies are missing, the asset form shows a 403 and tells you to create the bucket and run this SQL. Django will not store a silent broken row: a failed create-upload is moved to trash.

Pasting an HTTPS URL still creates an asset with no `storage_path`. Django rejects any client `storage_path` that it did not mint, and another workspace's asset id returns 404.

## Demo sign-in

The login page includes **Continue as demo**. It signs in through Supabase as `demo@brandvault.dev` with the assignment password `Demo1234!`. Django still checks the JWT. This is not an API bypass.

## Google sign-in

**Continue with Google** is optional. No other providers are used. If Google is not enabled in Supabase, the button shows the error on the login form.

1. Supabase → Authentication → Providers → Google. Enable it and paste the Google OAuth client ID and secret.
2. In Google Cloud, set the authorized redirect URI to `https://<project-ref>.supabase.co/auth/v1/callback`.
3. Supabase → Authentication → URL Configuration. Add the deployed site URL and `http://localhost:5173` to the site URL and redirect allow list.

## Useful commands

```
python backend/manage.py check
python backend/manage.py test
cd backend && python -m pytest
cd frontend && npm run build
```
