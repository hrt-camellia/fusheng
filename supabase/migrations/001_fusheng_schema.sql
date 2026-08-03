create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.bazi_records (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  birth_info jsonb not null, bazi_result jsonb not null, created_at timestamptz not null default now()
);
create table if not exists public.analysis_results (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  bazi_record_id uuid references public.bazi_records(id) on delete set null,
  question text, analysis_content text not null, model text, created_at timestamptz not null default now()
);
create table if not exists public.bracelet_designs (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  name text not null, theme text not null, wrist_size_mm integer not null check (wrist_size_mm between 100 and 260),
  design jsonb not null, preview_url text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.bazi_records enable row level security;
alter table public.analysis_results enable row level security;
alter table public.bracelet_designs enable row level security;

create policy "profiles own rows" on public.profiles for all using (auth.uid()=id) with check (auth.uid()=id);
create policy "bazi own rows" on public.bazi_records for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "analysis own rows" on public.analysis_results for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "bracelet own rows" on public.bracelet_designs for all using (auth.uid()=user_id) with check (auth.uid()=user_id);

grant select, insert, update, delete on public.profiles, public.bazi_records, public.analysis_results, public.bracelet_designs to authenticated;
