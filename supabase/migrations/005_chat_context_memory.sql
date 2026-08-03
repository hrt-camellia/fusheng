-- V1.12：为聊天线程增加长期摘要状态，用于跨设备保持上下文编排结果。
-- 可重复执行，不改变现有 RLS 策略。

alter table public.chat_threads
  add column if not exists summary text;

alter table public.chat_threads
  add column if not exists summarized_message_count integer not null default 0;

alter table public.chat_threads
  add column if not exists summary_updated_at timestamptz;

update public.chat_threads
set summarized_message_count = 0
where summarized_message_count is null;

alter table public.chat_threads
  drop constraint if exists chat_threads_summarized_message_count_check;

alter table public.chat_threads
  add constraint chat_threads_summarized_message_count_check
  check (summarized_message_count >= 0);
