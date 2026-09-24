# BrandVault

Brand kit and asset library. This repository currently contains the project foundation: models, auth, API skeleton, and a React application shell. The full product UI, Gemini tagging, and n8n workflow are not implemented yet.

## Stack

- React, TypeScript, Vite, Tailwind CSS
- Django, Django REST Framework
- PostgreSQL via Supabase
- Supabase Auth
- Supabase Storage (designed, not wired for uploads yet)
- Gemini and n8n later, backend only

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

## Useful commands

```
python backend/manage.py check
python backend/manage.py test
cd backend && python -m pytest
cd frontend && npm run build
```
