-- Run this SQL in Supabase SQL Editor after creating the project and applying Prisma migrations.

-- Sync auth.users -> public.users on new registration
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Lock down Prisma-managed public tables from Supabase Data API access.
-- The app reads and writes these tables through server-side Prisma after checking auth.
alter table public.users enable row level security;
alter table public.trips enable row level security;
alter table public.trip_days enable row level security;
alter table public.trip_events enable row level security;
alter table public.ai_generation_jobs enable row level security;
alter table public.trip_shares enable row level security;

revoke all on table
  public.users,
  public.trips,
  public.trip_days,
  public.trip_events,
  public.ai_generation_jobs,
  public.trip_shares
from anon;

revoke insert, update, delete on table
  public.users,
  public.trips,
  public.trip_days,
  public.trip_events,
  public.ai_generation_jobs,
  public.trip_shares
from authenticated;

grant select on table
  public.users,
  public.trips,
  public.trip_days,
  public.trip_events,
  public.ai_generation_jobs,
  public.trip_shares
to authenticated;

drop policy if exists "Users can read own profile" on public.users;
create policy "Users can read own profile"
  on public.users
  for select
  to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "Users can read own trips" on public.trips;
create policy "Users can read own trips"
  on public.trips
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can read own trip days" on public.trip_days;
create policy "Users can read own trip days"
  on public.trip_days
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.trips
      where trips.id = trip_days.trip_id
        and trips.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users can read own trip events" on public.trip_events;
create policy "Users can read own trip events"
  on public.trip_events
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.trip_days
      join public.trips on trips.id = trip_days.trip_id
      where trip_days.id = trip_events.trip_day_id
        and trips.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users can read own generation jobs" on public.ai_generation_jobs;
create policy "Users can read own generation jobs"
  on public.ai_generation_jobs
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can read own trip shares" on public.trip_shares;
create policy "Users can read own trip shares"
  on public.trip_shares
  for select
  to authenticated
  using (
    created_by = (select auth.uid())
    or exists (
      select 1
      from public.trips
      where trips.id = trip_shares.trip_id
        and trips.user_id = (select auth.uid())
    )
  );

-- Enable Realtime for trips table (run after Prisma migrate)
-- alter publication supabase_realtime add table trips;
-- alter publication supabase_realtime add table ai_generation_jobs;
