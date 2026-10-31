# AddisGo API

FastAPI service for booking operations that need a trusted server. It verifies a rider's Supabase access token before accessing their bookings, and uses the Supabase service-role key only on the server.

## Run locally

```powershell
cd D:\Project-bus\addisgo-platform\apps\api
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn app.main:app --reload --port 8000
```

Open `http://localhost:8000/docs` to test the API. Add a real Supabase project URL and service-role key to `.env` before calling booking endpoints.

## Client authentication

After a rider signs in through Supabase, the web or mobile client sends the session access token:

```text
Authorization: Bearer <supabase-access-token>
```

The API validates it with Supabase before using its server-only database client.
