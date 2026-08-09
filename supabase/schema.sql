-- ============================================================
-- Elevate Basketball — database setup
--
-- Run this once, in the Supabase dashboard under SQL Editor.
-- Safe to run again later; it will not duplicate anything.
--
-- The shape of the rules below:
--   Anyone can READ the site content. That is the point of a website.
--   Only signed-in coaches can CHANGE it.
--   Anyone can SUBMIT a tryout request, but only coaches can read them.
--
-- "Signed in" means a user you added in Authentication → Users.
-- There is no public sign-up, so nobody can make themselves a coach.
-- ============================================================


-- ---------- teams ----------
-- One row per team. position sets the top-to-bottom order on the rail.
-- data holds the whole team record as JSON, which means adding a field
-- later (a team photo, a second coach) never needs a schema change.

create table if not exists public.teams (
  id          text primary key,
  position    integer     not null default 0,
  data        jsonb       not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

alter table public.teams enable row level security;

drop policy if exists "teams are public" on public.teams;
create policy "teams are public"
  on public.teams for select
  using (true);

drop policy if exists "coaches change teams" on public.teams;
create policy "coaches change teams"
  on public.teams for all
  to authenticated
  using (true)
  with check (true);


-- ---------- site ----------
-- A single row, id = 'main', holding everything that is not team
-- specific: announcements, gyms, headline copy, program blurbs.

create table if not exists public.site (
  id          text primary key,
  data        jsonb       not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

alter table public.site enable row level security;

drop policy if exists "site is public" on public.site;
create policy "site is public"
  on public.site for select
  using (true);

drop policy if exists "coaches change site" on public.site;
create policy "coaches change site"
  on public.site for all
  to authenticated
  using (true)
  with check (true);


-- ---------- leads ----------
-- Tryout requests from the join form.

create table if not exists public.leads (
  id            uuid        primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  name          text        not null,
  email         text        not null,
  phone         text,
  reason        text,
  player        text,
  grade         text,
  message       text,
  team_viewing  text,
  handled       boolean     not null default false
);

alter table public.leads enable row level security;

-- Parents are not signed in when they send the form, so anon needs
-- insert. It does NOT get select: without this split, anyone could
-- read every family's contact details straight out of the browser.
drop policy if exists "anyone can ask" on public.leads;
create policy "anyone can ask"
  on public.leads for insert
  to anon, authenticated
  with check (
    length(coalesce(name, '')) between 1 and 120
    and length(coalesce(email, '')) between 3 and 200
    and email like '%_@_%.__%'
    and length(coalesce(message, '')) <= 2000
    and length(coalesce(phone, '')) <= 40
    and handled = false
  );

drop policy if exists "coaches read requests" on public.leads;
create policy "coaches read requests"
  on public.leads for select
  to authenticated
  using (true);

drop policy if exists "coaches update requests" on public.leads;
create policy "coaches update requests"
  on public.leads for update
  to authenticated
  using (true)
  with check (true);

create index if not exists leads_created_at_idx on public.leads (created_at desc);


-- ---------- seed ----------
-- Gives you a site row so the first save has something to update.
-- Team rows are created the first time a coach saves in the console.

insert into public.site (id, data)
values ('main', '{}'::jsonb)
on conflict (id) do nothing;
