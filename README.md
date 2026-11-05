# AddisGo

AddisGo is a unified Ethiopian bus-travel platform: a Next.js web experience, an Expo mobile app, shared design data, and a Supabase backend.

## Project map

```text
apps/web       Next.js passenger and operator web experience
apps/mobile    Expo app for Android and iPhone
packages/types Shared TypeScript booking and route models
packages/ui    Shared visual tokens and journey content
supabase       Database migrations and seed data
```

## Run AddisGo locally

Open separate PowerShell terminals for the services you need.

### 1. Start the API

```powershell
cd D:\Project-bus\addisgo-platform
python.exe -m uvicorn app.main:app --app-dir apps\api --reload --port 8000
```

Open http://127.0.0.1:8000/docs to check that the API is running.

### 2. Start the mobile app

```powershell
cd D:\Project-bus\addisgo-platform\apps\mobile
npx expo start --lan --clear --port 8081
```

Install **Expo Go** on an Android phone, connect the phone and computer to the same Wi-Fi, then scan the newest QR code shown in the terminal. If Expo Go shows an older screen, fully close it before scanning again.

### 3. Start the web app

```powershell
cd D:\Project-bus\addisgo-platform
npm run dev:web
```

Open http://localhost:3000.

### First-time setup

```powershell
cd D:\Project-bus\addisgo-platform
npm install
```

### Load current preview schedules into Supabase

With `apps\api\.env` configured, this safely adds current and next-day preview
departures to Supabase. It never deletes riders, bookings, or existing routes.

```powershell
cd D:\Project-bus\addisgo-platform
python.exe scripts\seed_live_preview.py
```

### Enable server-side seat locking

Seat locking protects a rider's selected seat for five minutes while payment is
being confirmed. Apply the repository migration to the linked Supabase project:

```powershell
cd D:\Project-bus\addisgo-platform
npx supabase db push
```

The migration is `supabase\migrations\20261105000000_seat_holds.sql`. If the
Supabase CLI is not linked on this computer, run that file once in the Supabase
SQL Editor instead.

### Use the operator portal

Open `http://localhost:3000/operator` after starting the web app. Enter the
private `OPERATOR_ACCESS_KEY` value from `apps\api\.env` to load and manage
live Supabase departures. The key is sent only to the local API and is not
stored in the website.

## Connect Supabase later

Copy `apps/web/.env.example` to `apps/web/.env.local`, then add the Supabase URL and publishable key. Apply the SQL files in `supabase/` through the Supabase SQL Editor.

Never put the Supabase service-role key in the web or mobile app.
