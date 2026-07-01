-- Run this SQL in Supabase SQL Editor after creating the project

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

-- Enable Realtime for trips table (run after Prisma migrate)
-- alter publication supabase_realtime add table trips;
-- alter publication supabase_realtime add table ai_generation_jobs;
