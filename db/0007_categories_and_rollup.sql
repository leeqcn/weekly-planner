-- 统计的地基。两件事：
--
--   categories    分类（sleep / work / study / ...）。统计按它汇总，
--                 不按标题 —— 「地铁上班」和「打车回家」是两个标题、同一类。
--   daily_rollup  每日分类汇总。明细 28 天就清掉，这张表**永久保留**。
--
-- 为什么要汇总表而不是只存一个 EWMA 数字：min/max 是顺序统计量，
-- EWMA 递推不出来；n 周平均也不是 EWMA；而且 α 一旦选定就改不了了。
-- 汇总表一天 5–8 行、一年两千多行，比明细还小四倍，
-- 有了它 EWMA / n 周平均 / min / max / 导出全部是读的时候现算的。
--
-- 可重复执行。

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  color text,
  sort_order int not null default 0,
  -- 分类是统计的维度，删掉会让历史数据无处可归，所以界面上只给「停用」。
  -- 停用的分类不出现在选择器里，但已有条目照常解析、统计照常算。
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint categories_user_name_unique unique (user_id, name)
);

alter table public.templates
  add column if not exists category_id uuid references public.categories (id) on delete set null;

alter table public.schedule_entries
  add column if not exists category_id uuid references public.categories (id) on delete set null;

create index if not exists templates_category_idx
  on public.templates (user_id, category_id);

create table if not exists public.daily_rollup (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  -- 分类 id 的字符串，未归类的存 'none'。
  --
  -- 故意用 text 而不是 uuid 外键：
  --   1. 可空的 uuid 做不出干净的唯一约束（Postgres 里 NULL 互不相等），
  --      只能用部分唯一索引，而部分索引 ON CONFLICT 推断不了 —— 0002 就栽在这上面
  --   2. 汇总是「当时的事实」，不该被分类表的删除级联改写
  category_key text not null,
  planned_minutes int not null default 0,
  actual_minutes int not null default 0,
  sessions int not null default 0,
  updated_at timestamptz not null default now(),
  -- 普通唯一约束（不是部分索引），upsert 的 ON CONFLICT 才推断得出来
  constraint daily_rollup_unique unique (user_id, date, category_key)
);

create index if not exists daily_rollup_user_date_idx
  on public.daily_rollup (user_id, date);

alter table public.categories   enable row level security;
alter table public.daily_rollup enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['categories', 'daily_rollup'] loop
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
