-- 把六个默认分类的颜色改成指定的那套。
--
-- 只是改数据，不动结构。新建的库会直接用 categories.js 里的 DEFAULT_CATEGORIES，
-- 这个脚本是给**已经建好分类**的库补一刀用的。
--
-- 按 name 匹配，改过名字的行不会被碰到。
-- 注意它会**覆盖**这六个分类现在的颜色 —— 跑一次就够了，
-- 之后想调颜色在「设置 → 分类 → 编辑」里改，别再跑这个。

update public.categories set color = 'stone'   where name = 'Sleep';       -- 灰
update public.categories set color = 'mist'    where name = 'Work';        -- 雾蓝
update public.categories set color = 'lilac'   where name = 'Study';       -- 丁香紫
update public.categories set color = 'sage'    where name = 'Health';      -- 鼠尾草绿
update public.categories set color = 'ochre'   where name = 'Daily life';  -- 赭黄
update public.categories set color = 'default' where name = 'Relax';       -- 陶土橙
