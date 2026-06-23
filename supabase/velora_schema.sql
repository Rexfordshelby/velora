-- Velora v1 Supabase schema.
-- Run this in the Supabase SQL editor for project kdaliffwucsefxdmixed.

create table if not exists public.velora_snapshots (
  id text primary key,
  city text not null default 'Mumbai',
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.velora_ride_requests (
  id uuid primary key default gen_random_uuid(),
  city text not null default 'Mumbai',
  vehicle_id text not null,
  ride jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.velora_applications (
  id text primary key,
  role text not null check (role in ('rider', 'driver')),
  name text not null,
  email text not null,
  phone text not null,
  vehicle text,
  license text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'denied', 'hold')),
  note text not null default '',
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.velora_pickup_requests (
  id text primary key,
  rider_name text not null,
  rider_user_id uuid references auth.users(id) on delete set null,
  pickup jsonb not null,
  dropoff jsonb not null,
  vehicle_id text not null,
  fare numeric not null,
  distance_km numeric not null,
  eta_minutes integer not null,
  status text not null default 'searching' check (status in ('searching', 'accepted', 'arriving', 'completed', 'cancelled')),
  driver_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.velora_snapshots enable row level security;
alter table public.velora_ride_requests enable row level security;
alter table public.velora_applications enable row level security;
alter table public.velora_pickup_requests enable row level security;

drop policy if exists "Public can read Velora snapshots" on public.velora_snapshots;
create policy "Public can read Velora snapshots"
on public.velora_snapshots
for select
to anon
using (true);

drop policy if exists "Public can create Velora ride requests" on public.velora_ride_requests;
create policy "Public can create Velora ride requests"
on public.velora_ride_requests
for insert
to anon
with check (true);

drop policy if exists "Authenticated can insert Velora applications" on public.velora_applications;
create policy "Authenticated can insert Velora applications"
on public.velora_applications
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Applicants and admin can read Velora applications" on public.velora_applications;
create policy "Applicants and admin can read Velora applications"
on public.velora_applications
for select
to authenticated
using (
  user_id = auth.uid()
  or lower(coalesce(auth.jwt() ->> 'email', '')) = 'raashifshaikh70@gmail.com'
);

drop policy if exists "Admin can update Velora applications" on public.velora_applications;
create policy "Admin can update Velora applications"
on public.velora_applications
for update
to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'raashifshaikh70@gmail.com')
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'raashifshaikh70@gmail.com');

drop policy if exists "Authenticated can insert pickup requests" on public.velora_pickup_requests;
create policy "Authenticated can insert pickup requests"
on public.velora_pickup_requests
for insert
to authenticated
with check (rider_user_id = auth.uid());

drop policy if exists "Authenticated can read pickup requests" on public.velora_pickup_requests;
create policy "Authenticated can read pickup requests"
on public.velora_pickup_requests
for select
to authenticated
using (true);

drop policy if exists "Authenticated can update pickup requests" on public.velora_pickup_requests;
create policy "Authenticated can update pickup requests"
on public.velora_pickup_requests
for update
to authenticated
using (true)
with check (true);

insert into public.velora_snapshots (id, city, data)
values (
  'mumbai-default',
  'Mumbai',
  '{
    "seed": "Use the frontend fallback Mumbai dataset until you normalize tables.",
    "note": "The app can read this JSON row and merge it with the local fallback shape."
  }'::jsonb
)
on conflict (id) do update
set city = excluded.city,
    data = excluded.data,
    updated_at = now();
