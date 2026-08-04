-- 把 type 从「固定事件 / 任务 / 习惯」改成明确的三个模块：
--   event —— 有起止时间，画在时间轴上
--   todo  —— 只有事，没有时间
--   habit —— 只有事，没有时间，每天重复，按完成度打卡
--
-- 之前用「时长短于 20 分钟就当待办」这种启发式规则来分流，结果是
-- 没填时间的 fixed_event 被判成了待办、habit 该出现的地方不出现。
-- 类型自己说清楚是什么，就不需要猜了。
--
-- 存量数据按「有没有填时间」迁移：填了时间的算 event，没填的算 todo。
-- 可重复执行。

alter table public.templates drop constraint if exists templates_type_check;
alter table public.templates
  add constraint templates_type_check
  check (type in ('event', 'todo', 'habit', 'fixed_event', 'task'));

update public.templates
   set type = case
     when type = 'habit' then 'habit'
     when start_time is not null and end_time is not null then 'event'
     else 'todo'
   end
 where type in ('fixed_event', 'task');

-- todo 没有时间可言，顺手清掉可能残留的时间字段
update public.templates set start_time = null, end_time = null
 where type in ('todo', 'habit');

-- habit 每天重复
update public.templates
   set recurrence = 'weekly', recurrence_days = '{1,2,3,4,5,6,7}'
 where type = 'habit';

-- 迁移完成后收紧约束，只允许新的三个值
alter table public.templates drop constraint if exists templates_type_check;
alter table public.templates
  add constraint templates_type_check check (type in ('event', 'todo', 'habit'));

-- priority 原来限定给 type='task'，现在归 todo。
-- 两个名字都要先 drop：旧库里叫 ..._for_task，而全新建的库（现在的 0001）
-- 已经带着 ..._for_todo 了 —— 只 drop 旧名字的话，新库跑到这里会直接报
-- 「constraint already exists」，从零按顺序跑迁移的人第一步就卡住。
alter table public.templates drop constraint if exists templates_priority_only_for_task;
alter table public.templates drop constraint if exists templates_priority_only_for_todo;
alter table public.templates
  add constraint templates_priority_only_for_todo
  check (type = 'todo' or priority is null);
