-- Run this once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run

create table if not exists user_memory (
  user_id text primary key,
  column_settings jsonb not null default '{}'::jsonb,
  value_corrections jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  filename text,
  status text not null default 'uploaded',
  row_count int,
  correction_plan jsonb,
  cleaned_file_path text,
  data jsonb,
  created_at timestamptz not null default now()
);

-- Migration: if you created the jobs table before the `data` column existed,
-- run this once in the Supabase SQL Editor to add it:
--   alter table jobs add column if not exists data jsonb;

create index if not exists jobs_user_id_idx on jobs (user_id, created_at desc);

-- Note: these tables are only ever accessed through the server-side
-- Supabase client using the service_role key (see lib/supabaseAdmin.js),
-- which already bypasses row-level security. Access control happens in
-- the API routes themselves (checking the signed-in Clerk user), not in
-- Postgres policies. If you later add direct client-side Supabase access,
-- you'd need to enable RLS and write real policies at that point.

create table if not exists rules (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  field text not null,
  type text not null,
  action text not null default 'custom',
  expression text,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists rules_user_id_idx on rules (user_id, created_at);
