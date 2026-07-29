-- 待办带时长区间，点一下排进时间轴。
--
-- 时长区间放在条目上而不是只放模板上：临时加的待办没有模板，
-- 但一样要能写「购物 30-60 分钟」。
--
-- 注意这里没有「是否已敲定」之类的字段 —— 实心还是半透明是算出来的，
-- 不是存出来的：起止时间都定死（min = max）且不和别的块冲突才画实心，
-- 否则半透明。少一个字段就少一处可能和现实对不上的状态。
-- 可重复执行。

alter table public.schedule_entries
  add column if not exists min_duration_minutes int;
alter table public.schedule_entries
  add column if not exists max_duration_minutes int;
