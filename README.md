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

## Start the web app

```powershell
cd D:\Project-bus
npm install
npm run dev:web
```

Open http://localhost:3000.

## Start the mobile app

```powershell
cd D:\Project-bus
npm install
npm run dev:mobile
```

Install **Expo Go** on an Android phone, then scan the QR code shown in the terminal. For the first run, install the mobile package dependencies with `npm install` from the project root.

## Connect Supabase later

Copy `apps/web/.env.example` to `apps/web/.env.local`, then add the Supabase URL and publishable key. Apply the SQL files in `supabase/` through the Supabase SQL Editor.

Never put the Supabase service-role key in the web or mobile app.
