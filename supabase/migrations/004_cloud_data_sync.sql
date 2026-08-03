-- V1.11：命盘、聊天和手串的账号云端迁移与跨设备同步。
-- 可重复执行；所有业务表均启用 RLS，用户只能访问自己的记录。

create extension if not exists pgcrypto;

create table if not exists public.bazi_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  birth_info jsonb not null,
  bazi_result jsonb not null,
  saved_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.bazi_records add column if not exists saved_at timestamptz not null default now();
alter table public.bazi_records add column if not exists updated_at timestamptz not null default now();

create table if not exists public.bracelet_designs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  theme text not null,
  wrist_size_mm integer not null check (wrist_size_mm between 100 and 260),
  design jsonb not null,
  preview_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '新的对话',
  bazi_record_id uuid references public.bazi_records(id) on delete set null,
  summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_threads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists bazi_records_user_saved_idx
  on public.bazi_records (user_id, saved_at desc);
create index if not exists bracelet_designs_user_updated_idx
  on public.bracelet_designs (user_id, updated_at desc);
create index if not exists chat_threads_user_updated_idx
  on public.chat_threads (user_id, updated_at desc);
create index if not exists chat_messages_thread_created_idx
  on public.chat_messages (thread_id, created_at asc);

alter table public.bazi_records enable row level security;
alter table public.bracelet_designs enable row level security;
alter table public.chat_threads enable row level security;
alter table public.chat_messages enable row level security;

-- 清理早期补丁中可能存在的宽泛策略。
drop policy if exists "bazi own rows" on public.bazi_records;
drop policy if exists "bracelet own rows" on public.bracelet_designs;
drop policy if exists "chat threads own rows" on public.chat_threads;
drop policy if exists "chat messages own rows" on public.chat_messages;

drop policy if exists "bazi_select_own" on public.bazi_records;
drop policy if exists "bazi_insert_own" on public.bazi_records;
drop policy if exists "bazi_update_own" on public.bazi_records;
drop policy if exists "bazi_delete_own" on public.bazi_records;
create policy "bazi_select_own" on public.bazi_records for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "bazi_insert_own" on public.bazi_records for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "bazi_update_own" on public.bazi_records for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "bazi_delete_own" on public.bazi_records for delete to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "bracelet_select_own" on public.bracelet_designs;
drop policy if exists "bracelet_insert_own" on public.bracelet_designs;
drop policy if exists "bracelet_update_own" on public.bracelet_designs;
drop policy if exists "bracelet_delete_own" on public.bracelet_designs;
create policy "bracelet_select_own" on public.bracelet_designs for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "bracelet_insert_own" on public.bracelet_designs for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "bracelet_update_own" on public.bracelet_designs for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "bracelet_delete_own" on public.bracelet_designs for delete to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "thread_select_own" on public.chat_threads;
drop policy if exists "thread_insert_own" on public.chat_threads;
drop policy if exists "thread_update_own" on public.chat_threads;
drop policy if exists "thread_delete_own" on public.chat_threads;
create policy "thread_select_own" on public.chat_threads for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "thread_insert_own" on public.chat_threads for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "thread_update_own" on public.chat_threads for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "thread_delete_own" on public.chat_threads for delete to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "message_select_own" on public.chat_messages;
drop policy if exists "message_insert_own" on public.chat_messages;
drop policy if exists "message_update_own" on public.chat_messages;
drop policy if exists "message_delete_own" on public.chat_messages;
create policy "message_select_own" on public.chat_messages for select to authenticated
  using (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.chat_threads t
      where t.id = thread_id and t.user_id = (select auth.uid())
    )
  );
create policy "message_insert_own" on public.chat_messages for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.chat_threads t
      where t.id = thread_id and t.user_id = (select auth.uid())
    )
  );
create policy "message_update_own" on public.chat_messages for update to authenticated
  using (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.chat_threads t
      where t.id = thread_id and t.user_id = (select auth.uid())
    )
  )
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.chat_threads t
      where t.id = thread_id and t.user_id = (select auth.uid())
    )
  );
create policy "message_delete_own" on public.chat_messages for delete to authenticated
  using (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.chat_threads t
      where t.id = thread_id and t.user_id = (select auth.uid())
    )
  );

grant select, insert, update, delete on
  public.bazi_records,
  public.bracelet_designs,
  public.chat_threads,
  public.chat_messages
  to authenticated;
