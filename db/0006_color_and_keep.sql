-- 两件事：
--   color        —— 每个事项可以选颜色（睡觉一个色、工作一个色），null = 默认色
--   keep_in_todo —— 勾了之后，排进时间轴也继续留在 To do 列表里
--
-- 模板和条目上都加：模板上设一次，生成的条目继承；也允许临时改单独一条。
-- 可重复执行。

alter table public.templates add column if not exists color text;
alter table public.templates
  add column if not exists keep_in_todo boolean not null default false;

alter table public.schedule_entries add column if not exists color text;
alter table public.schedule_entries
  add column if not exists keep_in_todo boolean not null default false;
