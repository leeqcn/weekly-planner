-- Weekly Planner —— 从零建库，跑这一个就够了。
--
-- 谁该跑这个：**新装的人**。在 Supabase 项目的 SQL Editor 里整段贴进去执行一次。
-- 谁不该跑：已经按 0001–0009 一路迁移上来的库 —— 你已经是这个状态了，
--           跑不跑都一样（这个脚本可重复执行，不会弄坏数据），但没必要。
--
-- 这里是 db/0001–0009 九个迁移的**最终状态**，不是它们的叠加过程。
-- 那九个文件保留着，是为了让已经在用的库能一步步跟上，顺便留下每处改动的理由。
--
-- 建完之后：所有表都开了 RLS，策略是「只有登录用户，且只能碰 user_id 是自己的行」。
-- 匿名角色一条策略都没有，等于完全读不到。
--
-- 可重复执行：反复跑不会报错，也不会动已有数据。

-- ---------------------------------------------------------------- categories
-- 统计的维度。放在最前面，因为 templates 和 schedule_entries 都要引用它。
--
-- 为什么统计按分类而不按标题：「地铁上班」「打车回家」「开车去客户那」
-- 是三个标题、同一类。指望手打的标题一致是不成立的。
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  color text,
  sort_order int not null default 0,
  -- 分类删掉会让历史数据无处可归，所以界面上只给「停用」。
  -- 停用的不出现在选择器里，但已有条目照常解析、统计照常算。
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint categories_user_name_unique unique (user_id, name)
);

-- 默认的六个分类（Sleep / Work / Study / Daily life / Relax / Health）
-- 由 App 第一次打开时自动建，不在这里插 —— 免得和 src/lib/categories.js
-- 里的 DEFAULT_CATEGORIES 各说各话。

-- ----------------------------------------------------------------- templates
-- 每周重复的事。模板只写一次，之后每周自动生成条目。
create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  -- event：有起止时间，上时间轴；todo：只有事没时间；habit：每天重复的打卡项
  type text not null check (type in ('event', 'todo', 'habit')),
  priority text check (priority in ('must', 'high', 'optional')),
  min_duration_minutes int,
  max_duration_minutes int,
  recurrence text not null check (recurrence in ('weekly', 'monthly')),
  recurrence_days int[] not null default '{}',
  start_time time,
  end_time time,
  is_active boolean not null default true,
  color text,
  -- 勾上：排进时间轴后也继续留在 To do 列表里
  keep_in_todo boolean not null default false,
  category_id uuid references public.categories (id) on delete set null,
  created_at timestamptz not null default now(),
  -- priority 仅 todo 使用
  constraint templates_priority_only_for_todo check (type = 'todo' or priority is null)
);

create index if not exists templates_user_active_idx
  on public.templates (user_id, is_active);
create index if not exists templates_category_idx
  on public.templates (user_id, category_id);

-- ---------------------------------------------------------- schedule_entries
-- 每天的实际条目。明细只留最近 28 天，更早的进 daily_rollup。
create table if not exists public.schedule_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  template_id uuid references public.templates (id) on delete set null,
  category_id uuid references public.categories (id) on delete set null,
  date date not null,
  title text not null,
  planned_start timestamptz,
  planned_end timestamptz,
  actual_start timestamptz,
  actual_end timestamptz,
  status text not null default 'planned'
    check (status in ('planned', 'in_progress', 'done', 'skipped', 'rescheduled')),
  rescheduled_from timestamptz,
  completion_pct int check (completion_pct is null or completion_pct between 0 and 100),
  note text,
  -- 待办的时长区间放在条目上而不是只放模板上：临时加的待办没有模板，
  -- 但一样要能写「购物 30–60 分钟」
  min_duration_minutes int,
  max_duration_minutes int,
  color text,
  keep_in_todo boolean not null default false,
  -- 删除是打墓碑，不真删行。模板每次打开都会把「这一周还缺的」补生成出来，
  -- 判据是 (template_id, date) 在不在；行整个删掉，这个坑就空了，
  -- 下次刷新它自己又长回来。墓碑占着坑，生成器看得见、界面看不见。
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

-- 同一个 template 在同一天只生成一条，保证重复生成是幂等的。
--
-- 用普通唯一约束，不用 `where template_id is not null` 的部分唯一索引 ——
-- 部分索引 ON CONFLICT 推断不了，upsert 会报
--   42P10: there is no unique or exclusion constraint matching the ON CONFLICT specification
-- template_id 为 null 的临时条目不受影响：Postgres 里 NULL 彼此不相等，
-- 同一天可以加任意多条。
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.schedule_entries'::regclass
      and conname = 'schedule_entries_template_date_key'
  ) then
    alter table public.schedule_entries
      add constraint schedule_entries_template_date_key unique (template_id, date);
  end if;
end
$$;

create index if not exists schedule_entries_user_date_idx
  on public.schedule_entries (user_id, date);
-- 界面上的查询都是「这一段日期里没删的」，这个部分索引正好覆盖
create index if not exists schedule_entries_live_idx
  on public.schedule_entries (user_id, date)
  where deleted_at is null;

-- --------------------------------------------------------------- habits_log
-- 习惯打卡。一天一个习惯一行。
create table if not exists public.habits_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  template_id uuid not null references public.templates (id) on delete cascade,
  date date not null,
  completion_pct int not null default 0 check (completion_pct between 0 and 100),
  note text,
  created_at timestamptz not null default now(),
  unique (template_id, date)
);

create index if not exists habits_log_user_date_idx
  on public.habits_log (user_id, date);

-- ------------------------------------------------------------- weekly_focus
create table if not exists public.weekly_focus (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  week_start_date date not null,
  title text not null,
  priority_order int not null check (priority_order between 1 and 3),
  created_at timestamptz not null default now(),
  -- priority_order 限定 1..3 加上这条唯一约束 => 每周最多 3 行
  unique (user_id, week_start_date, priority_order)
);

-- ------------------------------------------------------------- special_days
create table if not exists public.special_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  label text not null,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

-- -------------------------------------------------------------- daily_rollup
-- 每日分类汇总。明细 28 天就清掉，这张表**永久保留**。
--
-- 为什么要汇总表而不是只存一个 EWMA 数字：min/max 是顺序统计量，EWMA 递推不出来；
-- n 周平均也不是 EWMA；而且 α 一旦选定就改不了了。汇总表一天 5–8 行、
-- 一年两千多行，比明细还小四倍，有了它 EWMA / n 周平均 / min / max / 导出
-- 全部是读的时候现算的。
create table if not exists public.daily_rollup (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  -- 分类 id 的字符串，未归类的存 'none'。
  --
  -- 故意用 text 而不是 uuid 外键：
  --   1. 可空的 uuid 做不出干净的唯一约束（NULL 互不相等），只能用部分唯一索引，
  --      而部分索引 ON CONFLICT 推断不了
  --   2. 汇总是「当时的事实」，不该被分类表的删除级联改写
  category_key text not null,
  planned_minutes int not null default 0,
  actual_minutes int not null default 0,
  sessions int not null default 0,
  updated_at timestamptz not null default now(),
  constraint daily_rollup_unique unique (user_id, date, category_key)
);

create index if not exists daily_rollup_user_date_idx
  on public.daily_rollup (user_id, date);

-- ---------------------------------------------------------------------- RLS
-- 每个用户只能读写自己的数据。
--
-- 策略给的是 authenticated 角色 —— 匿名角色一条策略都没有，
-- 而 RLS 默认拒绝，所以没登录的人什么都读不到。
-- 前端那个 anon key 本来就会被编进 JS 包里、谁都看得见，挡住人的是这里。
alter table public.categories       enable row level security;
alter table public.templates        enable row level security;
alter table public.schedule_entries enable row level security;
alter table public.habits_log       enable row level security;
alter table public.weekly_focus     enable row level security;
alter table public.special_days     enable row level security;
alter table public.daily_rollup     enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'categories', 'templates', 'schedule_entries',
    'habits_log', 'weekly_focus', 'special_days', 'daily_rollup'
  ] loop
    execute format('drop policy if exists %I on public.%I', t || '_owner_rw', t);
    execute format(
      'create policy %I on public.%I for all to authenticated
         using (user_id = (select auth.uid()))
         with check (user_id = (select auth.uid()))',
      t || '_owner_rw', t
    );
  end loop;
end
$$;
