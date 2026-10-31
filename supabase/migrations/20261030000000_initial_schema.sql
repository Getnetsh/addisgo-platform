-- AddisGo core data model. Run in the Supabase SQL Editor or using the Supabase CLI.
create type public.service_type as enum ('city', 'intercity');
create type public.booking_status as enum ('pending', 'confirmed', 'cancelled');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text, phone text,
  created_at timestamptz not null default now()
);
create table public.stops (
  id uuid primary key default gen_random_uuid(),
  name text not null, city text not null default 'Addis Ababa',
  latitude numeric(9,6), longitude numeric(9,6),
  created_at timestamptz not null default now(),
  unique (name, city)
);
create table public.routes (
  id uuid primary key default gen_random_uuid(),
  service_type public.service_type not null,
  public_code text not null unique,
  origin_stop_id uuid not null references public.stops(id),
  destination_stop_id uuid not null references public.stops(id),
  operator_name text not null, created_at timestamptz not null default now(),
  check (origin_stop_id <> destination_stop_id)
);
create table public.trips (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references public.routes(id) on delete cascade,
  departure_at timestamptz not null, arrival_at timestamptz not null,
  fare_etb numeric(10,2) not null check (fare_etb >= 0),
  coach_name text not null, capacity integer not null check (capacity > 0),
  is_bookable boolean not null default true, created_at timestamptz not null default now(),
  check (arrival_at > departure_at)
);
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  booking_reference text not null unique default upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
  passenger_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  trip_id uuid not null references public.trips(id), seat_number text not null,
  passenger_name text not null, passenger_phone text not null,
  total_amount numeric(10,2) not null check (total_amount >= 0),
  status public.booking_status not null default 'pending', created_at timestamptz not null default now(),
  unique (trip_id, seat_number)
);
create index trips_departure_at_idx on public.trips(departure_at);
create index trips_route_id_idx on public.trips(route_id);
create index bookings_passenger_id_idx on public.bookings(passenger_id);

alter table public.profiles enable row level security;
alter table public.stops enable row level security;
alter table public.routes enable row level security;
alter table public.trips enable row level security;
alter table public.bookings enable row level security;
create policy "public can view stops" on public.stops for select using (true);
create policy "public can view routes" on public.routes for select using (true);
create policy "public can view trips" on public.trips for select using (true);
create policy "riders can view own profile" on public.profiles for select to authenticated using (id = auth.uid());
create policy "riders can update own profile" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "riders can view own bookings" on public.bookings for select to authenticated using (passenger_id = auth.uid());
create policy "riders can create own bookings" on public.bookings for insert to authenticated with check (passenger_id = auth.uid());

create function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (new.id, new.raw_user_meta_data ->> 'full_name', new.phone);
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();
