-- 分类分成「固定」和「自由」两种。
--
-- 睡觉、上班、家务这些改不动 —— 看它们占全天百分之多少没什么用，
-- 真正想知道的是**剩下那些能自己支配的时间里**，各项各占多少。
-- 统计页因此需要一个「只按自由时间算」的口径，而哪些算固定只有本人知道，
-- 所以做成分类上的一个开关，而不是按名字猜。
--
-- 默认 false：不动的话所有分类都算自由时间，统计和以前一模一样。
alter table public.categories
  add column if not exists is_fixed boolean not null default false;

comment on column public.categories.is_fixed is
  '固定开销（睡眠/工作这类改不动的）。算「自由时间占比」时先把它们剔掉。';
