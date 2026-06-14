-- Farmaline farmer-only backend setup for a new Supabase project.
-- Run this once in the Supabase SQL Editor for project nqevyteyaouxnopoupai.

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('farmer', 'delivery');
  elsif not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'app_role' and e.enumlabel = 'delivery'
  ) then
    alter type public.app_role add value 'delivery';
  end if;
end $$;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  email text not null,
  name text not null,
  phone text,
  avatar_url text,
  is_verified boolean default true,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null default 'farmer',
  unique (user_id, role)
);

create table if not exists public.farms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  coordinates jsonb not null default '[]'::jsonb,
  area_acres numeric(10, 2) not null default 0,
  soil_type text,
  location_address text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  farmer_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  description text,
  category text not null default 'produce',
  price numeric(10, 2) not null default 0,
  quantity numeric(10, 2) not null default 0,
  unit text not null default 'kg',
  images jsonb default '[]'::jsonb,
  quality_score integer check (quality_score is null or (quality_score >= 0 and quality_score <= 100)),
  is_verified boolean default false,
  is_available boolean default true,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete set null,
  buyer_id uuid references auth.users(id) on delete set null,
  seller_id uuid references auth.users(id) on delete set null,
  delivery_partner_id uuid references auth.users(id) on delete set null,
  quantity numeric(10, 2) not null default 0,
  total_price numeric(10, 2) not null default 0,
  status text not null default 'pending',
  delivery_address text not null default '',
  delivery_coordinates jsonb,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table if not exists public.disease_detections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  farm_id uuid references public.farms(id) on delete set null,
  image_url text,
  disease_name text,
  confidence_score integer,
  severity text,
  ai_response jsonb,
  escalated_to_vet boolean default false,
  vet_id uuid references auth.users(id) on delete set null,
  created_at timestamptz default now() not null
);

create table if not exists public.crop_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  farm_id uuid references public.farms(id) on delete set null,
  weather_data jsonb,
  location_data jsonb,
  recommendations jsonb not null default '[]'::jsonb,
  created_at timestamptz default now() not null
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  body text not null,
  notification_type text not null default 'general',
  data jsonb default '{}'::jsonb,
  is_read boolean default false,
  created_at timestamptz default now() not null
);

create table if not exists public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  push_enabled boolean default true,
  smart_suggestions boolean default true,
  frequency text default 'daily',
  last_digest_at timestamptz,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table if not exists public.suggestion_interactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  notification_id uuid references public.notifications(id) on delete set null,
  suggestion_type text not null default 'general',
  title text,
  action text not null,
  score numeric,
  url text,
  created_at timestamptz default now() not null
);

create table if not exists public.equipment_rentals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  description text,
  category text not null default 'equipment',
  location_address text,
  daily_rate numeric(10, 2) not null default 0,
  images jsonb default '[]'::jsonb,
  is_available boolean default true,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table if not exists public.equipment_bookings (
  id uuid primary key default gen_random_uuid(),
  rental_id uuid references public.equipment_rentals(id) on delete cascade not null,
  renter_id uuid references auth.users(id) on delete cascade not null,
  start_date date not null,
  end_date date not null,
  total_cost numeric(10, 2) not null default 0,
  notes text,
  status text not null default 'pending',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table if not exists public.farmer_trades (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid references auth.users(id) on delete cascade not null,
  buyer_id uuid references auth.users(id) on delete set null,
  product_name text not null,
  description text,
  category text not null default 'Vegetables',
  quantity numeric(10, 2) not null default 0,
  unit text not null default 'kg',
  price_per_unit numeric(10, 2) not null default 0,
  total_price numeric(10, 2) not null default 0,
  notes text,
  status text not null default 'open',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table if not exists public.vet_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  license_number text unique,
  specialization text,
  experience_years integer not null default 0,
  consultation_fee numeric(10, 2) not null default 0,
  location_lat numeric,
  location_lng numeric,
  location_address text,
  certificate_url text,
  rating numeric default 4.5,
  total_consultations integer default 0,
  is_verified boolean default true,
  is_available boolean default true,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table if not exists public.consultations (
  id uuid primary key default gen_random_uuid(),
  farmer_id uuid references auth.users(id) on delete cascade not null,
  vet_id uuid references public.vet_profiles(id) on delete set null,
  disease_detection_id uuid references public.disease_detections(id) on delete set null,
  animal_type text,
  issue_description text,
  consultation_type text default 'in_person',
  status text not null default 'pending',
  scheduled_at timestamptz,
  notes text,
  fee_paid numeric(10, 2) not null default 0,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique (user_id, endpoint)
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade,
  buyer_id uuid references auth.users(id) on delete set null,
  seller_id uuid references auth.users(id) on delete set null,
  amount numeric(10, 2) not null default 0,
  status text not null default 'pending',
  invoice_data jsonb default '{}'::jsonb,
  created_at timestamptz default now() not null
);

create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, email, name, is_verified)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'name', split_part(coalesce(new.email, 'Farmer'), '@', 1)),
    true
  )
  on conflict (user_id) do update
    set email = excluded.email,
        name = excluded.name,
        is_verified = true,
        updated_at = now();

  insert into public.user_roles (user_id, role)
  values (new.id, 'farmer')
  on conflict do nothing;

  insert into public.notification_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'profiles',
    'user_roles',
    'farms',
    'products',
    'orders',
    'disease_detections',
    'crop_recommendations',
    'notifications',
    'notification_preferences',
    'suggestion_interactions',
    'equipment_rentals',
    'equipment_bookings',
    'farmer_trades',
    'vet_profiles',
    'consultations',
    'push_subscriptions',
    'invoices'
  ]
  loop
    execute format('alter table public.%I enable row level security', tbl);
  end loop;
end $$;

drop policy if exists "profiles owner read" on public.profiles;
create policy "profiles owner read" on public.profiles
  for select using (auth.uid() = user_id);
drop policy if exists "profiles owner write" on public.profiles;
create policy "profiles owner write" on public.profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "roles owner read" on public.user_roles;
create policy "roles owner read" on public.user_roles
  for select using (auth.uid() = user_id);

drop policy if exists "farms owner all" on public.farms;
create policy "farms owner all" on public.farms
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "products public read" on public.products;
create policy "products public read" on public.products
  for select using (is_available = true or auth.uid() = farmer_id);
drop policy if exists "products farmer all" on public.products;
create policy "products farmer all" on public.products
  for all using (auth.uid() = farmer_id) with check (auth.uid() = farmer_id);

drop policy if exists "orders farmer read" on public.orders;
create policy "orders farmer read" on public.orders
  for select using (auth.uid() = buyer_id or auth.uid() = seller_id);
drop policy if exists "orders farmer create" on public.orders;
create policy "orders farmer create" on public.orders
  for insert with check (auth.uid() = buyer_id or auth.uid() = seller_id);
drop policy if exists "orders farmer update" on public.orders;
create policy "orders farmer update" on public.orders
  for update using (auth.uid() = buyer_id or auth.uid() = seller_id);

drop policy if exists "disease owner all" on public.disease_detections;
create policy "disease owner all" on public.disease_detections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "crop rec owner all" on public.crop_recommendations;
create policy "crop rec owner all" on public.crop_recommendations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "notifications owner all" on public.notifications;
create policy "notifications owner all" on public.notifications
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "preferences owner all" on public.notification_preferences;
create policy "preferences owner all" on public.notification_preferences
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "suggestion owner all" on public.suggestion_interactions;
create policy "suggestion owner all" on public.suggestion_interactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "equipment public read" on public.equipment_rentals;
create policy "equipment public read" on public.equipment_rentals
  for select using (is_available = true or auth.uid() = owner_id);
drop policy if exists "equipment owner all" on public.equipment_rentals;
create policy "equipment owner all" on public.equipment_rentals
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists "equipment bookings farmer all" on public.equipment_bookings;
create policy "equipment bookings farmer all" on public.equipment_bookings
  for all using (auth.uid() = renter_id) with check (auth.uid() = renter_id);

drop policy if exists "trades public read" on public.farmer_trades;
create policy "trades public read" on public.farmer_trades
  for select using (status = 'open' or auth.uid() = seller_id or auth.uid() = buyer_id);
drop policy if exists "trades seller insert" on public.farmer_trades;
create policy "trades seller insert" on public.farmer_trades
  for insert with check (auth.uid() = seller_id);
drop policy if exists "trades participant update" on public.farmer_trades;
create policy "trades participant update" on public.farmer_trades
  for update using (auth.uid() = seller_id or auth.uid() = buyer_id);

drop policy if exists "vets public read" on public.vet_profiles;
create policy "vets public read" on public.vet_profiles
  for select using (is_verified = true);

drop policy if exists "consultations farmer all" on public.consultations;
create policy "consultations farmer all" on public.consultations
  for all using (auth.uid() = farmer_id) with check (auth.uid() = farmer_id);

drop policy if exists "push subscriptions owner all" on public.push_subscriptions;
create policy "push subscriptions owner all" on public.push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "invoices participant read" on public.invoices;
create policy "invoices participant read" on public.invoices
  for select using (auth.uid() = buyer_id or auth.uid() = seller_id);

insert into public.vet_profiles (
  license_number,
  specialization,
  experience_years,
  consultation_fee,
  location_lat,
  location_lng,
  location_address,
  rating,
  total_consultations,
  is_verified,
  is_available
)
values
  ('VET-DEMO-001', 'Cattle and dairy health', 12, 299, 18.5204, 73.8567, 'Pune Rural Veterinary Clinic', 4.8, 214, true, true),
  ('VET-DEMO-002', 'Goat and sheep care', 8, 249, 19.9975, 73.7898, 'Nashik Livestock Center', 4.6, 138, true, true),
  ('VET-DEMO-003', 'Poultry and farm animals', 10, 199, 19.0948, 74.7480, 'Ahmednagar Animal Care', 4.7, 176, true, true)
on conflict (license_number) do update set
  specialization = excluded.specialization,
  experience_years = excluded.experience_years,
  consultation_fee = excluded.consultation_fee,
  location_lat = excluded.location_lat,
  location_lng = excluded.location_lng,
  location_address = excluded.location_address,
  rating = excluded.rating,
  total_consultations = excluded.total_consultations,
  is_verified = excluded.is_verified,
  is_available = excluded.is_available,
  updated_at = now();
