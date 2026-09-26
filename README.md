# BrandVault

Brand kit and asset library. Gemini tag suggestions run on the backend and are saved only after review in the library. The n8n workflow is not implemented yet.

## Stack

- React, TypeScript, Vite, Tailwind CSS
- Django, Django REST Framework
- PostgreSQL via Supabase
- Supabase Auth
- Supabase Storage (designed, not wired for uploads yet)
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

## Useful commands

```
python backend/manage.py check
python backend/manage.py test
cd backend && python -m pytest
cd frontend && npm run build
```
