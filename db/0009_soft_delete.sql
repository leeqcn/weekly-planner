-- 删掉的条目改成「打墓碑」，不真的把行删掉。
--
-- 为什么：模板每次打开 app 都会把「这一周还缺的」补生成出来，判据是
-- (template_id, date) 在不在。把行整个删掉，这个坑就空了 —— 下次刷新
-- 它自己又长回来。用户在 Day View 里删掉的任务，刷新后又出现，就是这个。
--
-- 打墓碑之后那个坑还占着，生成器看得见、界面看不见，删掉就是删掉了。
-- 顺带撤销也更干净：不用连 id 一起重新插一行，把 deleted_at 清空就行。
--
-- 墓碑会跟着 28 天的清理一起消失，不会越积越多。
-- 可重复执行。

alter table public.schedule_entries
  add column if not exists deleted_at timestamptz;

-- 界面上的查询都是「这一段日期里没删的」，这个索引正好覆盖
create index if not exists schedule_entries_live_idx
  on public.schedule_entries (user_id, date)
  where deleted_at is null;
