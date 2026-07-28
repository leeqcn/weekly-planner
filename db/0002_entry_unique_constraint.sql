-- 把 0001 里的部分唯一索引换成普通唯一约束。
--
-- 原来是：
--   create unique index ... on schedule_entries (template_id, date)
--     where template_id is not null;
-- 部分索引 Postgres 的 ON CONFLICT 推断不了，任何 upsert 都会报
--   42P10: there is no unique or exclusion constraint matching the ON CONFLICT specification
--
-- 换成普通唯一约束后行为不变：template_id 为 null 的临时条目，
-- 同一天照样可以加任意多条（Postgres 里 NULL 彼此不相等）。
--
-- 这一版应用代码已经改用普通 insert，不跑这个脚本也能正常用；
-- 跑一下是把 schema 收拾干净，免得以后再踩。可重复执行。

-- 万一之前留下重复行，先去重（保留最早的一条）
delete from public.schedule_entries a
using public.schedule_entries b
where a.template_id is not null
  and a.template_id = b.template_id
  and a.date = b.date
  and a.ctid > b.ctid;

drop index if exists public.schedule_entries_template_date_uniq;

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
