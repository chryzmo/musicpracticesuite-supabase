-- Initial schema for Musician Practice Suite on Supabase.
-- Every user-owned table defaults user_id to the caller and is locked down with RLS.

-- Profiles ------------------------------------------------------------------

create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  email        text,
  display_name text,
  instrument   text,
  created_at   timestamptz not null default now()
);

-- Create a profile whenever someone signs up (GitHub/Google put names in metadata)
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Reeds ---------------------------------------------------------------------

create table public.reeds (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  identifier    text not null,
  reed_type     text not null,
  open_date     timestamptz not null default now(),
  retire_date   timestamptz,
  usage_minutes integer not null default 0,
  notes         text,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

create index reeds_user_open_date_idx on public.reeds (user_id, open_date desc);

-- Practice sessions ---------------------------------------------------------

create table public.practice_sessions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  date             timestamptz not null default now(),
  duration_minutes integer not null check (duration_minutes > 0),
  pieces           text[] not null default '{}',
  skills           text[] not null default '{}',
  notes            text,
  reed_id          uuid references public.reeds (id) on delete set null,
  created_at       timestamptz not null default now()
);

create index practice_sessions_user_date_idx on public.practice_sessions (user_id, date desc);
create index practice_sessions_reed_idx on public.practice_sessions (reed_id);

-- Keep reeds.usage_minutes in step with the sessions that used the reed
create function public.sync_reed_usage()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') and old.reed_id is not null then
    update public.reeds
       set usage_minutes = greatest(usage_minutes - old.duration_minutes, 0)
     where id = old.reed_id;
  end if;

  if tg_op in ('INSERT', 'UPDATE') and new.reed_id is not null then
    update public.reeds
       set usage_minutes = usage_minutes + new.duration_minutes
     where id = new.reed_id;
  end if;

  return null;
end;
$$;

create trigger practice_sessions_sync_reed_usage
  after insert or delete or update of reed_id, duration_minutes on public.practice_sessions
  for each row execute function public.sync_reed_usage();

-- Sight-reading sessions ----------------------------------------------------

create table public.sight_reading_sessions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  date           timestamptz not null default now(),
  key_signature  text not null,
  time_signature text not null,
  instrument     text not null,
  note_values    text[] not null default '{}',
  self_rating    integer check (self_rating between 1 and 5),
  notes          text,
  created_at     timestamptz not null default now()
);

create index sight_reading_sessions_user_date_idx on public.sight_reading_sessions (user_id, date desc);

-- AI insights cache (written by the insights Edge Function) -----------------

create table public.insights_cache (
  user_id    uuid primary key default auth.uid() references public.profiles (id) on delete cascade,
  data       jsonb not null,
  expires_at timestamptz not null
);

-- Row-level security --------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.reeds enable row level security;
alter table public.practice_sessions enable row level security;
alter table public.sight_reading_sessions enable row level security;
alter table public.insights_cache enable row level security;

create policy "Users read own profile" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "Users update own profile" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "Users manage own reeds" on public.reeds
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- A session may only reference one of the caller's own reeds
create policy "Users manage own practice sessions" on public.practice_sessions
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (
      reed_id is null
      or exists (select 1 from public.reeds r where r.id = reed_id and r.user_id = (select auth.uid()))
    )
  );

create policy "Users manage own sight-reading sessions" on public.sight_reading_sessions
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Users manage own insights cache" on public.insights_cache
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
