-- Weekly Planner — Step 1 schema
-- 在日记 App 已有的 Supabase 项目里执行（新增表，不新建项目）。

-- ---------------------------------------------------------------- templates
create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  type text not null check (type in ('fixed_event', 'task', 'habit')),
  priority text check (priority in ('must', 'high', 'optional')),
  min_duration_minutes int,
  max_duration_minutes int,
  recurrence text not null check (recurrence in ('weekly', 'monthly')),
  recurrence_days int[] not null default '{}',
  start_time time,
  end_time time,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  -- priority 仅 task 使用
  constraint templates_priority_only_for_task check (type = 'task' or priority is null)
);

create index if not exists templates_user_active_idx
  on public.templates (user_id, is_active);

-- -------------------------------------------------------- schedule_entries
-- 流水数据，只保留最近 4 周。
create table if not exists public.schedule_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  template_id uuid references public.templates (id) on delete set null,
  date date not null,
  title text not null,
  planned_start timestamptz,
  planned_end timestamptz,
  actual_start timestamptz,
  actual_end timestamptz,
  status text not null default 'planned'
    check (status in ('planned', 'in_progress', 'done', 'skipped', 'rescheduled')),
  rescheduled_from timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists schedule_entries_user_date_idx
  on public.schedule_entries (user_id, date);

-- 同一个 template 在同一天只生成一条，保证重复生成是幂等的。
create unique index if not exists schedule_entries_template_date_uniq
  on public.schedule_entries (template_id, date)
  where template_id is not null;

-- --------------------------------------------------------------- habits_log
-- 流水数据，只保留最近 4 周。
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
  -- priority_order 限定 1..3 + 这条唯一约束 => 每周最多 3 行
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

-- ---------------------------------------------------------------------- RLS
-- 每个用户只能读写自己的数据。
alter table public.templates        enable row level security;
alter table public.schedule_entries enable row level security;
alter table public.habits_log       enable row level security;
alter table public.weekly_focus     enable row level security;
alter table public.special_days     enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'templates', 'schedule_entries', 'habits_log', 'weekly_focus', 'special_days'
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
