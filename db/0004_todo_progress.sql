-- 待办也要有完成度和备注，做成和 habit 一样的体验。
-- habits_log 是绑 habit 模板的，待办本身就是 schedule_entries 的一行，
-- 所以直接给这张表加两列，不另外建表。可重复执行。

alter table public.schedule_entries add column if not exists completion_pct int;
alter table public.schedule_entries add column if not exists note text;

alter table public.schedule_entries
  drop constraint if exists schedule_entries_completion_pct_check;
alter table public.schedule_entries
  add constraint schedule_entries_completion_pct_check
  check (completion_pct is null or completion_pct between 0 and 100);

-- 已经标记完成的补成 100，免得看起来像没做
update public.schedule_entries
   set completion_pct = 100
 where status = 'done' and completion_pct is null;
