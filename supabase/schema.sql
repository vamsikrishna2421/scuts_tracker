-- Scuts Tracker — shared workspace schema.
-- Run this once in your Supabase project: Dashboard → SQL Editor → New query → paste → Run.

-- ── Entity tables ─────────────────────────────────────────────────────────────
-- Each row stores the full object as JSON plus sync metadata (last-write-wins on updated_at).
create table if not exists public.partners (
  id         uuid primary key,
  data       jsonb       not null,
  deleted    boolean     not null default false,
  updated_at timestamptz not null default now(),
  created_by uuid        default auth.uid()
);
create table if not exists public.interactions (
  id         uuid primary key,
  data       jsonb       not null,
  deleted    boolean     not null default false,
  updated_at timestamptz not null default now(),
  created_by uuid        default auth.uid()
);
create table if not exists public.reminders (
  id         uuid primary key,
  data       jsonb       not null,
  deleted    boolean     not null default false,
  updated_at timestamptz not null default now(),
  created_by uuid        default auth.uid()
);
create table if not exists public.knowledge (
  id         uuid primary key,
  data       jsonb       not null,
  deleted    boolean     not null default false,
  updated_at timestamptz not null default now(),
  created_by uuid        default auth.uid()
);
-- Single shared row for the company profile.
create table if not exists public.workspace (
  id         text primary key default 'default',
  company    jsonb,
  updated_at timestamptz not null default now()
);

-- ── Row Level Security: any signed-in founder shares one workspace ─────────────
alter table public.partners     enable row level security;
alter table public.interactions enable row level security;
alter table public.reminders    enable row level security;
alter table public.knowledge    enable row level security;
alter table public.workspace    enable row level security;

do $$
declare t text;
begin
  foreach t in array array['partners','interactions','reminders','knowledge','workspace'] loop
    execute format('drop policy if exists "authenticated full access" on public.%I;', t);
    execute format('create policy "authenticated full access" on public.%I for all to authenticated using (true) with check (true);', t);
  end loop;
end $$;

-- ── Realtime (push changes to the other device) ───────────────────────────────
alter publication supabase_realtime add table
  public.partners, public.interactions, public.reminders, public.knowledge, public.workspace;

-- ── Storage bucket for original uploaded files (PDFs / images) ─────────────────
insert into storage.buckets (id, name, public) values ('documents', 'documents', false)
  on conflict (id) do nothing;

drop policy if exists "authenticated read documents"  on storage.objects;
create policy "authenticated read documents"  on storage.objects for select to authenticated using (bucket_id = 'documents');
drop policy if exists "authenticated write documents" on storage.objects;
create policy "authenticated write documents" on storage.objects for insert to authenticated with check (bucket_id = 'documents');
drop policy if exists "authenticated update documents" on storage.objects;
create policy "authenticated update documents" on storage.objects for update to authenticated using (bucket_id = 'documents');
