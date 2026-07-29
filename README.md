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

1. 打开 Supabase 控制台 → SQL Editor，按顺序跑 `db/` 下的脚本（都可重复执行）：
   - `0001_init.sql` — 建 5 张表并打开 RLS
   - `0002_entry_unique_constraint.sql` — 唯一约束修正（可选）
   - `0003_task_types.sql` — **必须跑**。类型从 `fixed_event/task/habit`
     改成 `event/todo/habit`，同时按「有没有填时间」修正存量数据。
     不跑的话新建模板会被数据库的 check 约束挡下来。
   - `0004_todo_progress.sql` — **必须跑**。给 `schedule_entries` 加
     `completion_pct` 和 `note`，待办才有完成度和备注。
   - `0005_flexible_blocks.sql` — **必须跑**。给 `schedule_entries` 加
     `min_duration_minutes` / `max_duration_minutes`，待办才有时长区间。
2. 复制 `.env.local.example` 为 `.env.local`，填 URL 和 anon key。
3. 重启 `npm run dev`。这时会先要求登录。

### 登录 / Redirect URL（重要）

登录方式是 **Google 登录**，邮箱 magic link 作为兜底。Google provider 在共用的
Supabase 实例里已经开好了（日记 App 在用），本项目不用再配。

但有个坑：**Supabase 只接受白名单里的回跳地址**。不在白名单里的 `redirectTo`
会被静默忽略，直接退回 Site URL —— 而 Site URL 是日记 App 的地址，
所以登录链接会把你送到日记 App 去。

去 Supabase → Authentication → URL Configuration → **Redirect URLs**，
把本项目的地址都加进去（Site URL 保持日记 App 的不动）：

```
http://localhost:5173/**
https://<本项目的 Vercel 域名>/**
https://<本项目>-*.vercel.app/**    # 预览部署，可选
```

两个 App 共用同一份 `auth.users`，用同一个 Google 账号登录，两边就是同一个
`user_id`；各自的表靠 RLS 隔离，互相看不到对方的数据。

想在已经配好 `.env.local` 的情况下继续用假数据调 UI，
在 `.env.local` 里加一行 `VITE_USE_MOCK=1` 即可。

## 结构

```
db/0001_init.sql                    建表 + RLS（贴进 Supabase SQL Editor 跑）
db/0002_entry_unique_constraint.sql 把部分唯一索引换成普通唯一约束
db/0003_task_types.sql              类型改成 event / todo / habit（必须跑）
db/0004_todo_progress.sql           待办加完成度和备注（必须跑）
db/0005_flexible_blocks.sql         待办加时长区间（必须跑）
src/lib/
  dates.js        日期 / 周 / 时间换算，date-fns 封装
  habits.js       打卡颜色规则（>=100 绿 / >=50 黄 / 其余红）
  generate.js     模板 -> 某天的 schedule_entries
  layout.js       时间轴上重叠块的并排排布
  schedule.js     三种类型 + To do / Habits 的 n x 8 行
  time.js         时刻/时长解析，开始-结束-时长三者联动
  place.js        「排入」找空档 + 分钟与 ISO 互转
  mockSeed.js     本地模式的示例数据
  supabaseClient.js
  repo/mock.js      localStorage 实现
  repo/supabase.js  Supabase 实现（接口与 mock 完全一致）
src/state/usePlanner.js   数据加载 / 写入，组件只管渲染
src/components/           WeekView / DayView / Settings / …
```

## 三个模块

界面就是三块，互不混淆，两个视图里顺序都一样：**To do → Time schedule → Habits**。

模板的 `type` 决定它归哪一块，不靠猜：

| type | 含义 | 出现在 |
|---|---|---|
| `event` | 有起止时间 | Time schedule（时间轴） |
| `todo` | 只有事，没有时间 | To do |
| `habit` | 只有事，没有时间，每天重复 | Habits |

> 早先的版本是按「时长短于 20 分钟就算待办」来分流的。结果是没填时间的固定事件
> 被判成待办、habit 该出现的地方不出现。类型自己说清楚是什么，就不用猜了。

- **Week View**：To do 的 n×8 表格 → 7 个并排时间轴 → Habits 的 n×8 表格。
- **Day View**：当天待办表格 → 左 Plan / 中刻度 / 右 Actually → 当天打卡表格。
- **To do 和 Habits 用同一套组件**（`WeekProgressGrid` / `ProgressTable`），
  长得一样、操作一样，不用记两套。都是完成度 + 备注，点一格在 100 / 50 / 0 之间循环。
- 两者只有「还没打分时长什么样」不同：
  **待办按 0 显示成红色**（一眼看出任务落在哪天），**习惯留空白**（不然满屏红）。
- **时间轴完整 24 小时**，卡片里不再套一层滚动 —— 套滚动会看不到全天，还老滚错层。
- 表格的行按「模板创建顺序 → 标题」稳定排序。之前跟着数据返回顺序走，
  数据一变行就跳位置，正要点的那行换到别处去了。
- 窄屏（手机）下：时间块缩成色条只看分布，点日期进 Day View 看内容。

## 时间输入

不用 `<input type="time">` 那个时钟控件，全部手打（手机上点转盘太慢）。

- **开始 / 结束 / 时长填两个，第三个自动算**（`src/lib/time.js` 的 `reconcile`）。
- 写法很宽松：`9` / `930` / `0930` / `9:30` 都认；时长可以写 `90` / `1:30` / `1.5h` / `45m`。
- 输入框里存的是原文，只在失焦时规范成 `09:30`。不然打「930」在打完「9」的
  瞬间就被改写成「09:00」，光标也跟着跳。
- 编辑时右边有一条当天的**缩略时间轴**，能看到哪些时段是空的、有没有撞车。
- **计划和实际是两组独立的输入**。之前只有一组，在 Actually 那栏点「改时间」，
  改的其实是计划。

## 弹性任务：时长区间 + 排入

很多事「知道要多久，但不知道几点开始」——购物 30–60 分钟、晚餐 1 小时。
它们既不是固定日程，也不该只是一条没时长的待办。

- 待办可以写**时长区间**（最短 / 最长）。
- 点「排入 →」把它放到时间轴上：**自动找当天第一个装得下的空档**，
  按时长上限算。再排下一个自然接在后面，所以「下班后购物、晚餐、洗澡」
  点三下就依次排好了。
- **装不下也照排**（接在最后一个块后面，哪怕过了 24 点），只是标红。
  拒绝排入只会逼人跑去别处手动填时间；排上去、标红、自己拖，更有用。

## 块画成什么样，是算出来的

没有「是否已敲定」这类字段 —— 少一个字段就少一处可能和现实对不上的状态：

| 样子 | 什么时候 |
|---|---|
| 实心 | 起止都定死（min = max）且不和别的块冲突 |
| 半透明 + 虚线 | 时长还是个区间，没定死 |
| 半透明 + 红 | 和别的块撞了 |

手动拉过长短就等于你自己定了时长，区间收敛成定值，块随之变实心。

## 交互

- 拖块**左边的竖条**挪时间，拖**底边**改时长。吸附到 5 分钟。
  拖动过程中就实时判冲突 —— 松手之前就能看到变红。
- 手机上只有这两道窄条是拖动区（`touch-action: none`），块的其余部分
  照常点击和滚页面。整块都能拖的话，手指落在块上就滚不动 24 小时的时间轴了。
- **双击**左边的计划块 = 完成（搬到右边，左边变淡）；**双击**右边的块 = 撤销。
- Actually 栏上方的「＋ 只记实际」：没排过计划、但确实做了的事，只填实际就行。
  这类条目只出现在 Actually 栏，不会跑到待办里。

## 撤销

顶栏的「↩ 撤销」（或 Ctrl/Cmd + Z）退回上一步操作，按住可以连着退，最多 30 步。

实现方式是**每个写操作在动手之前先把「怎么撤回」记下来**（`usePlanner` 的 `act`），
而不是给整个状态做快照 —— 快照在多设备/多标签页下会把别人的改动一起冲掉。
唯一撤不干净的是「删除模板」：模板本身能原样回来，被连带删掉的打卡记录回不来。

## 几个约定

- **自动生成日程**：切到当前或未来的某一周时，按启用中的模板补齐这周的
  `schedule_entries`。`(template_id, date)` 上有唯一约束，重复生成是幂等的。
  过去的周不自动回填，需要的话点「补齐这周的安排」。
  订下周的计划就是切到下一周，模板会自动铺好，再手动调。
- **habit 不进时间轴**：出现在 Habits 模块和 Day View 的打卡区，写入 `habits_log`。
- **改时间就是 reschedule**：原计划时间记进 `rescheduled_from`，状态置 `rescheduled`。
- **完成不删计划**：左栏计划块变淡，右栏出现实际块，保留计划 vs 实际的对比。
- **有没有计划时间决定去哪**：有时间的条目上时间轴，没时间的进 To do。
- **4 周保留**：App 挂载时清理一次 `schedule_entries` / `habits_log` 的过期数据
  （`RETENTION_DAYS = 28`），没有用 cron 或 Edge Function。
  `templates` / `weekly_focus` / `special_days` 是配置，永久保留。
  以后加统计功能时，统计结果单独落表，不受这个清理影响。

## PWA

可以直接「添加到主屏幕 / 安装」，装完是独立窗口，断网也能打开（数据仍需联网）。

- `public/manifest.webmanifest` — 名称、图标、独立窗口、主题色
- `public/sw.js` — 手写的 service worker，没引 vite-plugin-pwa
- `vite.config.js` 里的 `precacheServiceWorker` 插件在打包后把产物清单写进
  `dist/sw.js`。**这一步不能省**：service worker 要到页面 load 之后才注册，
  首次访问的那批 JS/CSS 不经过它，只靠运行时缓存的话装完当场断网就是白屏。
  清单的哈希同时当缓存版本号，资源一变旧缓存自动清掉。
- Supabase 的请求（跨域）一律不拦截不缓存 —— 缓存登录态和接口数据只会出怪问题。
- 查缓存用 `caches.match(..., { ignoreVary: true })`：静态服务器会回
  `Vary: Origin`，而预缓存请求不带 Origin、页面上 crossorigin 的请求带，
  不加这个参数缓存明明有也读不到。

图标是一张手画风格的 to-do list —— 点 + 横线，第一条打了绿勾，
线条故意画歪（`wob()`），儿童画的味道。缩到 32px 仍然认得出。
改图标改 `scripts/gen-icons.mjs` 后重新生成即可
（要先 `npm i -D playwright`，它不在项目依赖里）。

## 下一步

- 每周统计（Step 2）。
- 视图状态放进 URL：现在刷新会回到周视图。

## 部署

Vercel 新建一个 Project 指向本仓库，framework 选 Vite，
环境变量填 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY`。
