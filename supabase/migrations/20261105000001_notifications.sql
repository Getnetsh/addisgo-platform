-- Inbox records for riders and the protected operator portal.
-- Application writes use the Supabase service-role key only; clients may only
-- read their own rider notifications through row-level security.
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  audience text not null check (audience in ('rider', 'operator')),
  recipient_id uuid references public.profiles(id) on delete cascade,
  kind text not null check (
    kind in (
      'booking_confirmed',
      'new_booking',
      'departure_reminder',
      'trip_update',
      'seat_hold_expiring'
    )
  ),
  title text not null,
  body text not null,
  booking_id uuid references public.bookings(id) on delete set null,
  trip_id uuid references public.trips(id) on delete set null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  check (
    (audience = 'rider' and recipient_id is not null)
    or (audience = 'operator' and recipient_id is null)
  )
);

create index if not exists notifications_rider_inbox_idx
  on public.notifications (recipient_id, created_at desc)
  where audience = 'rider';

create index if not exists notifications_operator_inbox_idx
  on public.notifications (created_at desc)
  where audience = 'operator';

alter table public.notifications enable row level security;

drop policy if exists "riders can view own notifications" on public.notifications;
create policy "riders can view own notifications"
  on public.notifications
  for select
  to authenticated
  using (audience = 'rider' and recipient_id = auth.uid());

-- No insert, update, or delete policy is created for browser clients. The API
-- verifies the rider or operator before it writes with the service-role key.
