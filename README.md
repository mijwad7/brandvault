# BrandVault

Brand kit and asset library. Gemini tag suggestions run on the backend and are saved only after review in the library. Optional n8n notifications are off unless `N8N_WEBHOOK_URL` is set.

## Live demo

Public URL: add the Vercel URL here after the first deploy.

Demo login: `demo@brandvault.dev` / `Demo1234!`

## Stack

- React, TypeScript, Vite, Tailwind CSS
- Django, Django REST Framework
- PostgreSQL via Supabase
- Supabase Auth
- Supabase Storage for asset files and the brand logo. Bytes go from the browser to Storage. Django stores the path and the public URL.
- Gemini tagging on the backend, reviewed in the library before save
- Optional n8n webhook (`n8n/brandvault-webhook.json`). Empty `N8N_WEBHOOK_URL` disables it.

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

## Production

API on Railway. Frontend on Vercel. Auth, Postgres, and Storage stay on the existing Supabase project. n8n is optional and stays off until `N8N_WEBHOOK_URL` is set on the API.

`GET /api/health` stays public. Railway healthcheck path: `/api/health`.

### Railway (Django)

Create a service from this repo.

| Railway UI field | Value |
| --- | --- |
| Root Directory | `backend` |
| Builder | Railpack (the default). Leave Nixpacks alone; it is deprecated. |
| Start command | leave empty to use `railway.toml`, or `python manage.py collectstatic --noinput && gunicorn config.wsgi:application --bind 0.0.0.0:$PORT` |
| Healthcheck path | `/api/health` |
| Watch paths | leave default |

`backend/runtime.txt` and `backend/.python-version` pin Python 3.12 for Railpack. Local dev can stay on 3.14. `backend/Procfile` matches the start command. Before each deploy, Railway runs `python manage.py migrate --noinput` (`preDeployCommand` in `backend/railway.toml`). The start command runs `collectstatic` in the web process so WhiteNoise can serve `/static/` (admin). The API itself is JSON. If the service settings do not pick up `railway.toml`, set the start command and healthcheck path in the table below by hand.

Set variables on the Railway service before the first deploy. `DEBUG=False` requires `DJANGO_SECRET_KEY` and `DATABASE_URL`.

| Variable | Production value |
| --- | --- |
| `DEBUG` | `False` |
| `DJANGO_SECRET_KEY` | long random string (generate locally; do not commit) |
| `DATABASE_URL` | Supabase **session** pooler URI. Host looks like `aws-0-<region>.pooler.supabase.com`, user `postgres.<project-ref>`, port **5432**. Do not use the transaction pooler (port 6543). |
| `DATABASE_SSLMODE` | `require` |
| `ALLOWED_HOSTS` | the Railway hostname, e.g. `brandvault-api.up.railway.app` (no scheme). `RAILWAY_PUBLIC_DOMAIN` is appended automatically when Railway sets it. |
| `CORS_ALLOWED_ORIGINS` | the Vercel origin, e.g. `https://brandvault.vercel.app` (scheme required, no trailing slash) |
| `CSRF_TRUSTED_ORIGINS` | same https origin as CORS |
| `SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `SUPABASE_JWT_SECRET` | leave **empty** so JWTs verify with the project JWKS (ES256/RS256) |
| `SUPABASE_STORAGE_BUCKET` | `assets` |
| `SUPABASE_SERVICE_ROLE_KEY` | leave empty (uploads use the user JWT in the browser) |
| `GEMINI_API_KEY` | optional |
| `N8N_WEBHOOK_URL` | leave **empty** to disable notifications. To turn them on, paste the n8n production webhook URL (see below). Django only. |
| `USE_X_FORWARDED_PROTO` | omit it; it turns on when `DEBUG=False` |

Generate a secret locally if you need one: `python -c "import secrets; print(secrets.token_urlsafe(48))"`.

Manual migrate (Railway shell, working directory is `backend`): `python manage.py migrate`.

### Vercel (Vite)

Create a project from this repo.

| Vercel UI field | Value |
| --- | --- |
| Framework Preset | Vite |
| Root Directory | `frontend` |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | `npm install` |

`frontend/vercel.json` rewrites every path to `/index.html`, so refreshing `/brand`, `/library`, `/trash`, or `/login` stays on the SPA.

Set these **before** the production build. Vite reads them at build time. A later env change needs a new deployment.

| Variable | Production value |
| --- | --- |
| `VITE_API_URL` | Railway public origin, e.g. `https://brandvault-api.up.railway.app` (no trailing slash) |
| `VITE_SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon (public) key |
| `VITE_STORAGE_BUCKET` | `assets` |

### Order (CORS)

The browser origin does not exist until Vercel finishes, and the API origin does not exist until Railway finishes.

1. Deploy the API on Railway with the variables above. For the first boot, `CORS_ALLOWED_ORIGINS` can be `http://localhost:5173` if the Vercel URL is not known yet.
2. Deploy the frontend on Vercel with `VITE_API_URL` set to the Railway `https://…` origin.
3. Set Railway `CORS_ALLOWED_ORIGINS` and `CSRF_TRUSTED_ORIGINS` to that exact Vercel origin (`https://…`, no path).
4. Redeploy the API (changing Railway variables restarts the service). Changing a `VITE_*` value needs a Vercel redeploy.

### Supabase Auth URLs

Supabase → Authentication → URL Configuration:

- Site URL: the Vercel origin.
- Redirect URLs: that origin, plus `http://localhost:5173` and `http://localhost:5173/**`.

Demo login on the live site: `demo@brandvault.dev` / `Demo1234!`.

## Optional n8n bonus

Django POSTs a JSON webhook after the database commit when one of these happens. A down n8n does not fail the save, restore, or brand update. Leave `N8N_WEBHOOK_URL` empty and nothing is sent.

| Event | When |
| --- | --- |
| `brand.updated` | Brand kit PATCH succeeds |
| `asset.restored` | Asset is restored from trash |
| `asset.ai_tags_saved` | Reviewed AI tags are saved |

```json
{
  "event": "asset.ai_tags_saved",
  "timestamp": "2026-09-27T17:00:00+00:00",
  "asset_id": "11111111-1111-1111-1111-111111111111",
  "user_email": "demo@brandvault.dev"
}
```

`brand.updated` sends `brand_id` instead of `asset_id`. The other two fields stay the same.

Workflow file: `n8n/brandvault-webhook.json`.

It is Webhook (POST) → Log event (no-op; the n8n execution list is the log) → Respond to Webhook (`ok`) → Send Email. Send Email is disabled and uses placeholder addresses only. No SMTP secret is in the file. Leave that node off unless you attach your own SMTP credential in n8n.

`N8N_WEBHOOK_URL` belongs on Django (local `backend/.env` or the Railway service). Do not put it on Vercel. Empty means disabled. Examples in `.env.example` and `backend/.env.example` stay empty.

Import and activate on n8n Cloud:

1. Open [n8n Cloud](https://app.n8n.cloud/) and sign in.
2. Left nav: **Workflows**.
3. Top right: **Create workflow** (the canvas can be blank).
4. Top right: the **⋯** menu → **Import from file**.
5. Choose `n8n/brandvault-webhook.json` from this repo.
6. Top right: **Save**.
7. Top right: switch **Inactive** to **Active**. Confirm if n8n asks.
8. Open the **Webhook** node. Copy the **Production URL** (`https://<your-instance>.app.n8n.cloud/webhook/brandvault`). Do not use the Test URL.
9. Railway → the Django service → **Variables** → set `N8N_WEBHOOK_URL` to that production URL. Redeploy or restart if Railway does not reload env on its own.
10. To turn notifications off again, clear `N8N_WEBHOOK_URL` on Railway. Do not commit the URL.

Check a run: n8n → **Executions**. A successful brand save, trash restore, or AI-tag save shows the event, id, email, and timestamp on **Log event**.

## Useful commands

```
python backend/manage.py check
python backend/manage.py test
cd backend && python -m pytest
cd frontend && npm run build
```
