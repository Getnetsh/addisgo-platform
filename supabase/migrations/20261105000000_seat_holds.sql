-- Temporary server-side seat locks for the payment window.
create table if not exists public.seat_holds (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  seat_number text not null,
  passenger_id uuid not null references public.profiles(id) on delete cascade,
  hold_token uuid not null unique default gen_random_uuid(),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (trip_id, seat_number)
);

create index if not exists seat_holds_expiry_idx on public.seat_holds(expires_at);
alter table public.seat_holds enable row level security;

-- Called only by the trusted API service key. The advisory lock prevents two
-- requests from claiming the same seat at the same time.
create or replace function public.hold_seat(
  p_trip_id uuid,
  p_seat_number text,
  p_passenger_id uuid
)
returns table (hold_token uuid, expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_seat text := upper(trim(p_seat_number));
begin
  delete from public.seat_holds where expires_at <= now();
  perform pg_advisory_xact_lock(hashtext(p_trip_id::text || ':' || normalized_seat));

  if exists (
    select 1 from public.bookings
    where trip_id = p_trip_id
      and seat_number = normalized_seat
      and status in ('pending', 'confirmed')
  ) then
    raise exception 'This seat has already been booked';
  end if;

  insert into public.seat_holds (trip_id, seat_number, passenger_id, expires_at)
  values (p_trip_id, normalized_seat, p_passenger_id, now() + interval '5 minutes')
  on conflict (trip_id, seat_number) do update
    set passenger_id = excluded.passenger_id,
        expires_at = excluded.expires_at
    where public.seat_holds.expires_at <= now()
       or public.seat_holds.passenger_id = excluded.passenger_id
  returning public.seat_holds.hold_token, public.seat_holds.expires_at
  into hold_token, expires_at;

  if hold_token is null then
    raise exception 'This seat is being held by another rider';
  end if;

  return next;
end;
$$;
