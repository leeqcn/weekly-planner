# Weekly Planner

个人日程规划 App —— 在「喜欢做的事」和「该做但容易忽视的事」之间找平衡。

当前进度：**Step 1**（手动排程 + 打卡 + 复用模板，不做 AI 排程）。

## 跑起来

```bash
npm install
npm run dev
```

**不配 Supabase 也能直接跑。** 没有 `.env.local` 时 App 自动进入「本地模式」：
数据存在浏览器 localStorage，还会灌一份示例模板，用来确认 UI 布局。

## 接 Supabase

和日记 App 是**两个独立的 project**（独立仓库、独立 Vercel Project），
只是共用同一个 Supabase 实例。所以：

- 建表 SQL 归本仓库管（`db/0001_init.sql`），**不要放进日记 App 的仓库或它的 migrations 目录**。
- 表名都是本项目自己的（`templates` / `schedule_entries` / `habits_log` /
  `weekly_focus` / `special_days`），不碰日记 App 的任何表。

步骤：

1. 打开 Supabase 控制台 → SQL Editor，把 `db/0001_init.sql` 贴进去跑一次
   （脚本可重复执行）。它建 5 张表并打开 RLS。
2. 复制 `.env.local.example` 为 `.env.local`，填 URL 和 anon key。
3. 重启 `npm run dev`。这时会先要求邮箱登录（magic link）。

想在已经配好 `.env.local` 的情况下继续用假数据调 UI，
在 `.env.local` 里加一行 `VITE_USE_MOCK=1` 即可。

## 结构

```
db/0001_init.sql                    建表 + RLS（贴进 Supabase SQL Editor 跑）
src/lib/
  dates.js        日期 / 周 / 时间换算，date-fns 封装
  habits.js       打卡颜色规则（>=100 绿 / >=50 黄 / 其余红）
  generate.js     模板 -> 某天的 schedule_entries
  layout.js       时间轴上重叠块的并排排布
  schedule.js     短事项判定 + 周清单 n x 8 的行
  mockSeed.js     本地模式的示例数据
  supabaseClient.js
  repo/mock.js      localStorage 实现
  repo/supabase.js  Supabase 实现（接口与 mock 完全一致）
src/state/usePlanner.js   数据加载 / 写入，组件只管渲染
src/components/           WeekView / DayView / Settings / …
```

## 界面

- **Week View**：上半部分是 7 个并排的时间轴（完整 24 小时，默认从 6 点开始看，
  往上滑是 0–6 点的睡眠时段）；下半部分是一张 n × 8 的周清单，
  左边一列是项目，右边七列是周一到周日的完成情况，一眼看完整周状态。
- **Day View**：左 Plan / 中 24 小时刻度 / 右 Actually，下面是当天的打卡区。
- 窄屏（手机）下：时间块缩成色条只看分布，点日期进 Day View 看内容；
  周清单第一列吸边，横向滑动看后面几天。

## 几个约定

- **自动生成日程**：切到当前或未来的某一周时，按启用中的模板补齐这周的
  `schedule_entries`。`(template_id, date)` 上有唯一约束，重复生成是幂等的。
  过去的周不自动回填，需要的话点「补齐这周的安排」。
  订下周的计划就是切到下一周，模板会自动铺好，再手动调。
- **habit 不进时间轴**：出现在周清单和 Day View 的打卡区，写入 `habits_log`。
- **改时间就是 reschedule**：原计划时间记进 `rescheduled_from`，状态置 `rescheduled`。
- **完成不删计划**：左栏计划块变淡，右栏出现实际块，保留计划 vs 实际的对比。
- **短事项不上时间轴**：计划时长短于 20 分钟（`MIN_TIMELINE_MINUTES`）或者没定时间的
  安排，不画成时间块，落到周清单里当待办打勾 —— 比如量血压、交房租。
- **4 周保留**：App 挂载时清理一次 `schedule_entries` / `habits_log` 的过期数据
  （`RETENTION_DAYS = 28`），没有用 cron 或 Edge Function。
  `templates` / `weekly_focus` / `special_days` 是配置，永久保留。
  以后加统计功能时，统计结果单独落表，不受这个清理影响。

## 部署

Vercel 新建一个 Project 指向本仓库，framework 选 Vite，
环境变量填 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY`。
