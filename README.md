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

1. 在日记 App 那个 Supabase 项目里执行 `supabase/migrations/0001_init.sql`
   （SQL Editor 里贴进去跑一次就行，脚本可重复执行）。它会建 5 张表并打开 RLS。
2. 复制 `.env.local.example` 为 `.env.local`，填上同一个项目的 URL 和 anon key。
3. 重启 `npm run dev`。这时会先要求邮箱登录（magic link）。

## 结构

```
supabase/migrations/0001_init.sql   建表 + RLS
src/lib/
  dates.js        日期 / 周 / 时间换算，date-fns 封装
  habits.js       打卡颜色规则（>=100 绿 / >=50 黄 / 其余红）
  generate.js     模板 -> 某天的 schedule_entries
  layout.js       时间轴上重叠块的并排排布
  mockSeed.js     本地模式的示例数据
  supabaseClient.js
  repo/mock.js      localStorage 实现
  repo/supabase.js  Supabase 实现（接口与 mock 完全一致）
src/state/usePlanner.js   数据加载 / 写入，组件只管渲染
src/components/           WeekView / DayView / Settings / …
```

## 几个约定

- **自动生成日程**：切到当前或未来的某一周时，按启用中的模板补齐这周的
  `schedule_entries`。`(template_id, date)` 上有唯一约束，重复生成是幂等的。
  过去的周不自动回填，需要的话点「生成本周安排」。
- **habit 不进时间轴**，只出现在 Day View 的打卡区，写入 `habits_log`。
- **改时间就是 reschedule**：原计划时间记进 `rescheduled_from`，状态置 `rescheduled`。
- **完成不删计划**：左栏计划块变淡，右栏出现实际块，保留计划 vs 实际的对比。
- **21 天保留**：App 挂载时清理一次 `schedule_entries` / `habits_log` 的过期数据，
  没有用 cron 或 Edge Function。`templates` / `weekly_focus` / `special_days` 永久保留。

## 部署

Vercel 新建一个 Project 指向本仓库，framework 选 Vite，
环境变量填 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY`。
