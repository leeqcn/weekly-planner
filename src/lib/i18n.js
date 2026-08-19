/**
 * 中英双语。
 *
 * 用**中文原文当 key**，不另起 `home.title` 这种编号：
 *   1. 代码里读得懂 —— `t('回到周视图')` 比 `t('nav.back')` 一眼就知道在说什么
 *   2. 漏翻不会炸 —— 字典里查不到就原样回落中文，页面不会出现空白或 key
 *   3. 加一句新文案不用先去字典里登记，先写中文，回头补英文
 *
 * 代价是改中文措辞时字典的 key 也要跟着改。这个项目里文案改动不算频繁，
 * 而且漏改的后果只是那句退回中文，不是崩。
 *
 * Help 页不走这里 —— 那是整页长文，逐句翻会翻得很生硬，
 * 中英各写一份（Help.jsx / HelpEn.jsx）。
 */

export const LANGS = { zh: '中文', en: 'English' }
const KEY = 'weekly-planner:lang'

/** 没选过就跟浏览器走：非中文一律进英文，免得英文用户先撞见一屏中文。 */
export function initialLang() {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved && LANGS[saved]) return saved
  } catch {
    // 隐私模式下 localStorage 会抛，退回按浏览器判断
  }
  const nav = (navigator.language || '').toLowerCase()
  return nav.startsWith('zh') ? 'zh' : 'en'
}

export function saveLang(lang) {
  try {
    localStorage.setItem(KEY, lang)
  } catch {
    // 存不下就只在这次会话里生效，不影响使用
  }
}

/** 星期表头。日历那七列很窄，只放得下一个字母；设置里的选择器有地方写全。 */
export const weekLetters = (lang) =>
  lang === 'en' ? ['M', 'T', 'W', 'T', 'F', 'S', 'S'] : ['一', '二', '三', '四', '五', '六', '日']

export const weekNames = (lang) =>
  lang === 'en'
    ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    : ['一', '二', '三', '四', '五', '六', '日']

/** date-fns 的格式串也要换：中文写「8 月 3 日」，英文写「Aug 3」。 */
export const DATE_FMT = {
  monthDay: { zh: 'M 月 d 日', en: 'MMM d' },
  monthYear: { zh: 'yyyy 年 M 月', en: 'MMMM yyyy' },
}

const EN = {
  // —— 登录
  '用 Google 登录': 'Sign in with Google',
  '邮箱登录链接': 'Email me a sign-in link',
  '发送': 'Send',
  '发送中…': 'Sending…',
  '跳转中…': 'Redirecting…',
  '或': 'or',
  '登录链接已发到邮箱。如果点开后跳到了别的站点，看下面那行说明。':
    'Check your inbox for the sign-in link. If it takes you somewhere else, see the note below.',

  // —— 顶栏 / 通用
  '统计': 'Stats',
  '设置': 'Settings',
  '帮助': 'Help',
  '退出': 'Sign out',
  '载入中…': 'Loading…',
  '读取中…': 'Loading…',
  '手势和功能说明': 'Gestures and features',
  '没有配置 .env.local，数据存在浏览器本地':
    'No .env.local — data lives in this browser only',
  '本地模式': 'Local mode',
  '语言': 'Language',
  '保存': 'Save',
  '取消': 'Cancel',
  '删除': 'Delete',
  '关闭': 'Close',
  '详情': 'Details',
  '怎么算的': 'How this is worked out',
  '日均、占比按天算，全都算进来；趋势和 EWMA 按周算，只用完整的周。':
    'Per-day figures (daily average, share) count every day; week-based ones (trend, EWMA) use complete weeks only.',
  '记录率不到一半，下面的数都要打折看。':
    'Under half the time is logged — take everything below with a pinch of salt.',
  '实心 = 实际': 'Solid = actual',
  '虚线 = 计划': 'Dashed = plan',
  '。虚线更长 = 排了没做完。': '. A longer dashed outline means you planned more than you did.',
  '画出未记录，占比才加得到 100% —— 一天记下了多少，是别的数可信不可信的前提。每根柱子按自己那几天算比例，所以长短能比。':
    'Drawing the unlogged part is what makes the shares add up to 100% — how much of a day you logged is what every other number rests on. Each bar is scaled to its own days, so their heights are comparable.',
  '一周一个点。纵轴': 'One dot per week. Y-axis',
  '，不从 0 开始 —— 看方向，别看斜率。':
    ', not starting at 0 — read the direction, not the steepness.',
  '天': 'days',
  '每周实际': 'Weekly actual',
  'EWMA（平滑）': 'EWMA (smoothed)',
  '一周一个点，两条线两个颜色：分类色是每周实际，深色是 EWMA。':
    'One dot per week; the two lines have two colours — the category colour is each week’s actual, the dark one is the EWMA. ',
  '纵轴不是从 0 开始': 'The y-axis does not start at 0',
  '（这里是': ' (here ',
  '）—— 从 0 起的话线会贴着顶端拉平，什么都看不出来；代价是波动被画得比实际大。':
    ') — from zero the line would sit flat against the top and show nothing; the cost is that the wobble looks bigger than it is.',
  '固定': 'fixed',
  '占全天': 'of the whole day',
  '占自由时间': 'of free time',
  '固定开销，不算进自由时间': 'Fixed — not counted as free time',
  '固定开销（睡眠、工作这类改不动的）': 'Fixed commitment (sleep, work — the ones you cannot move)',
  '勾上之后，统计的「明细」里可以切换成「占自由时间」—— 分母只算没勾的那几类。':
    'Once ticked, the stats table can switch to “of free time” — only the unticked categories count toward the total.',
  '时间去哪了': 'Where the time went',
  '没记录': 'unlogged',
  '不到一小时的': 'under an hour',
  '点标题改这条': 'Tap the title to edit',
  '点名字改这条': 'Tap the name to edit',
  '点标题就能改这条模板，不用横着滚到最后去找「编辑」。':
    'Tap a title to edit that template — no need to scroll right for the Edit button.',
  '撤销失败': 'Undo failed',
  '这条在服务器上已经没有了。页面刚刚重新读过，再试一次就好。':
    'That one no longer exists on the server. The page has just been reloaded — try again.',
  '登录状态过期了（页面在后台挂太久）。刷新一下页面重新登录，这次的改动没有保存。':
    'Your session expired (the page sat in the background too long). Reload the page to sign in again — this change was not saved.',
  '编辑': 'Edit',
  '完成': 'Done',
  '未完成': 'Not done',
  '新增': 'Add',
  '+ 新增': '+ Add',

  // —— 周视图
  '‹ 上一周': '‹ Prev week',
  '下一周 ›': 'Next week ›',
  '本周': 'This week',
  '回到本周': 'Back to this week',
  '点一下在 100 / 50 / 0 之间循环。红色 = 那天有任务还没做。':
    'Tap to cycle 100 / 50 / 0. Red = something planned that day is still undone.',
  '点一下在 100 / 50 / 0 之间循环。空白 = 还没打卡。':
    'Tap to cycle 100 / 50 / 0. Blank = not logged yet.',
  '这周没有待办。在「设置」里建一个待办模板，或者在某一天里加一条不填时间的安排。':
    'No to-dos this week. Add a to-do template in Settings, or add an entry without a time on any day.',
  '还没有习惯。在「设置」里建一个习惯模板（比如运动、早睡），它会每天重复。':
    'No habits yet. Create a habit template in Settings (exercise, early night…) and it repeats daily.',
  '打开这天': 'Open this day',
  '本周关注': 'This week',
  '最重要的一件事': 'The one thing that matters most',
  '（可留空）': '(optional)',
  '这周还没定关注点': 'Nothing set for this week',
  '这周还没定关注点。': 'Nothing set for this week.',

  // —— 日视图
  '‹ 回到周视图': '‹ Back to week',
  '标记特殊日（如 专注学习）': 'Mark this day (e.g. deep work)',
  '今天没有待办': 'Nothing to do today',
  '今天没有待办。': 'Nothing to do today.',
  '今天没有需要打卡的习惯。': 'No habits to log today.',
  '加一件要做的事': 'Add something to do',
  '记一件没排过计划、但确实做了的事': 'Log something you did without planning it',
  '调整时长': 'Adjust duration',
  '拖动': 'Drag',
  '记下': 'Log it',
  '排入': 'Schedule it',
  '拖我挪时间': 'Drag to move',
  '拖我改时长': 'Drag to resize',
  '装得下。': 'It fits.',
  '刚开始': 'just started',
  '结束': 'End', // 时间输入框那一格
  '结束计时': 'Stop', // 计时横幅上的按钮，和表格里的 ■ Stop 保持一致
  '开始': 'Start',
  '时长': 'Duration',
  '取消选中': 'Deselect',
  '保留在待办': 'Keep in to-do list',
  '排入后移出待办': 'Remove from to-do once scheduled',
  '和已排的时间重叠了': 'Overlaps something already scheduled',
  '这段是实际做的': 'What you actually did',
  '当天已排的时间': 'Already scheduled',
  '这段是空的': 'Free',

  // —— 编辑器
  '新增一条安排': 'New entry',
  '修改安排': 'Edit entry',
  '做什么': 'What',
  '标题': 'Title',
  '实际': 'Actual',
  '计划': 'Plan',
  '记录实际做了什么': 'Log what actually happened',
  '留在待办': 'Keep in to-do',
  '点开始或结束那一格，可以一下填「现在」。':
    'Tap the start or end field to fill in “now”.',
  '三个都留空就是一条待办，可以之后再「排入」时间轴。':
    'Leave all three empty and it becomes a to-do you can schedule later.',
  '预计时长': 'Expected duration',
  '最短（分钟）': 'Min (minutes)',
  '最长（分钟）': 'Max (minutes)',
  '填两个就行，第三个自动算。9 / 930 / 9:30 都认，时长可以写 90 或 1.5h。':
    'Fill any two — the third is worked out for you. 9 / 930 / 9:30 all work; duration can be 90 or 1.5h.',
  '填两个就行。9 / 930 / 9:30 都认，时长可以写 90 或 1.5h。':
    'Fill any two. 9 / 930 / 9:30 all work; duration can be 90 or 1.5h.',

  // —— 快速新增
  '做了什么': 'What did you do?',
  '要做什么': 'What needs doing?',
  '时长（分钟）': 'Duration (minutes)',
  '归到哪一类（统计用）': 'Category (used by stats)',
  '几点开始': 'Start at',
  '新加一件': 'Write a new one',
  '分钟': 'min',
  '改用刚才按下去的那个位置': 'Use the spot you pressed',
  '记的': 'log',
  '排的': 'plan',

  // —— 待办 / 习惯表
  '留': 'Keep',
  '名称': 'Name',
  '完成度': 'Progress',
  '状态': 'Status',
  '备注': 'Note',
  '已排': 'Scheduled',
  '一句话…': 'a line…',
  '勾上：排进时间轴后也留在这里': 'Tick to keep it here after scheduling',
  '勾上：排进时间轴后也留在待办列表里': 'Tick to keep it in the to-do list after scheduling',
  '排进时间轴：自动找第一个装得下的空档':
    'Schedule it: finds the first gap it fits in',
  '现在开始做，结束时再点一下 —— 猜不准时长就别猜':
    'Start now, tap again when you finish — no need to guess the duration',
  '「排入」会自动找第一个装得下的空档，排不下也会排上去并标红。勾上「留」，排进时间轴后也继续留在这张表里。':
    '“Schedule it” finds the first gap that fits; if nothing fits it still goes in, marked red. Tick “Keep” to leave it in this list after scheduling.',

  // —— 分类 / 颜色
  '分类': 'Category',
  '未分类': 'Uncategorised',
  '颜色': 'Colour',
  '这一周的东西都归好类了。': 'Everything this week is categorised.',
  '当前这一周': 'the current week',
  '模板还没设分类（设一次，它生成的所有条目都跟着走）':
    'Templates with no category (set it once and every entry it creates follows)',
  '临时加的条目（按标题成堆归）': 'One-off entries (grouped by title)',

  // —— 设置
  '重复模板': 'Repeating templates',
  '还没有模板。建一个之后，每周的日程就会自动生成。':
    'No templates yet. Create one and your week fills itself in.',
  '编辑模板': 'Edit template',
  '新建模板': 'New template',
  '类型': 'Type',
  '重复': 'Repeats',
  '重复方式': 'Repeat by',
  '每周': 'Weekly',
  '每月': 'Monthly',
  '周几': 'Days of week',
  '每月几号': 'Day of month',
  '习惯每天重复，不用选周几。': 'Habits repeat every day — no need to pick days.',
  '优先级': 'Priority',
  '必须': 'Must',
  '重要': 'Important',
  '可选': 'Optional',
  '启用': 'Active',
  '停用': 'Disabled',
  '每天': 'Every day',
  '工作日': 'Weekdays',
  '周末': 'Weekend',
  '时间': 'Time',
  '分类（统计按它汇总）': 'Categories (stats group by these)',
  '修改分类': 'Edit category',
  '新建分类': 'New category',
  '还没有分类。': 'No categories yet.',
  '排序': 'Order',
  '排序（小的在前）': 'Order (smaller first)',
  '只能停用不能删': 'can only be disabled, not deleted',
  '：删掉会让那段历史无处可归。': ' — deleting it would leave that history homeless.',
  '特殊日': 'Marked days',
  '日期': 'Date',
  '标记': 'Label',
  '专注学习 / 禅修 …': 'deep work / retreat …',
  '这里只列出当前这一周的标记。': 'Only this week’s marks are listed here.',

  // —— 统计
  '周': 'w',
  '周半衰期': 'w half-life',
  '记录率': 'Logged',
  '概览': 'Overview',
  '每类花了多少（实际 vs 计划）': 'Where the hours went (actual vs plan)',
  '实心色块 = 实际': 'Solid block = actual',
  '做了多少': '',
  '虚线框 = 当初计划': 'dashed outline = what you planned',
  '多少。 虚线框比色块长 = 排了没做完；短 = 做得比计划多。':
    '. Outline longer than the block = planned but not done; shorter = you did more than planned.',
  '每周的时间去哪了': 'Where each week went',
  '未记录': 'Unlogged',
  '。画出来占比才加得到 100%， 而「一天到底记下了多少」本身就是所有数字可信度的前提。':
    '. Drawing it is what makes the percentages add up to 100 — and how much of the day you actually logged is the ground every other number stands on.',
  '趋势': 'Trend',
  '明细': 'Breakdown',
  '执行天数': 'Days done',
  '总时间': 'Total',
  '日均': 'Daily avg',
  '日最少': 'Min/day',
  '日最多': 'Max/day',
  '占比': 'Share',
  '差值': 'Diff',
  '达成率': 'Hit rate',
  '日均 = 总时间 ÷ 执行天数': 'Daily avg = total ÷ days you did it',
  '（不是除以日历天数）。 日最少/最多也只在做过的那些天里取 —— 不然只要有一天没做， 最少永远是 0，这个数就废了。':
    ' (not calendar days). Min/max only count days you did it — otherwise one skipped day pins the minimum at 0 forever and the number is useless. ',
  '对从来没排过计划的显示「—」。': ' shows “—” for things you never planned.',
  '统计起点': 'Stats start',
  '待办 / 习惯（本周）': 'To-dos and habits (this week)',
  '待办完成': 'To-dos done',
  '本周没有待办': 'No to-dos this week',
  '还没打卡': 'not logged yet',
  '还没有数据': 'No data yet',
  '开始算，那天之前的记录不计入。 等这一天到了、并且记了东西，这里就有数了。':
    '. Anything before that date is left out. Once that day arrives and you log something, numbers show up here.',
  '导出': 'Export',
  '导出 CSV': 'Export CSV',
  '至少要两周数据才画得出趋势。': 'Two weeks of data are needed to draw a trend.',
  '不是从 0 开始': 'not from zero',
  '—— 这样才看得出变化，但也会把波动画得比实际大。':
    ' — that is what makes changes visible, but it also makes the wobble look bigger than it is.',
  // —— codemod 之后补齐的（长句、按钮、拼接片段）
  '■ 结束': '■ Stop',
  '▶ 开始': '▶ Start',
  '排入 →': 'Schedule →',
  '＋ 新增': '+ Add',
  '＋ 新建模板': '+ New template',
  '＋ 新建分类': '+ New category',
  '清空': 'Clear',
  '清空时间（变成待办）': 'Clear the times (turns it back into a to-do)',
  '加上': 'Add',
  '跟模板': 'Same as template',
  '从哪天开始算': 'Count from',
  '这天之前的记录不计入。存在本机，换设备要再设一次。':
    'Anything before this date is left out. Stored on this device, so set it again on a new one.',
  '统计从': 'Stats count from ',
  '做了多少，': ' — how much you did; ',
  '灰色是': 'The grey band is ',
  '显示的是': 'Showing ',
  '停用只是不再生成新日程，历史记录会保留。':
    'Disabling only stops new entries being generated — the history stays.',
  '排进时间轴后，仍然留在 To do 列表里': 'Stays in the to-do list even after it is scheduled',
  '拖一个，后面的跟着顺延': 'Shift later blocks too',
  '没排过计划、但确实做了的事 —— 只填「实际」就行，左边计划栏会留空。':
    'Something you did without planning it — fill in “actual” only; the plan column stays empty.',
  '9 / 930 / 9:30 都认。时长不对也没关系，加上去之后拖块底边就能改。':
    '9 / 930 / 9:30 all work. The duration need not be right — drag the bottom edge afterwards to fix it.',
  '「排入」按上限找空档。两个填不一样（比如购物 30–60）时， 块会画成半透明，表示还没定死。':
    '“Schedule it” looks for a gap using the upper bound. If the two differ (shopping 30–60, say) the block is drawn semi-transparent — the length is not settled yet.',
  '统计按分类汇总，不按标题 ——「地铁上班」和「打车回家」是两个标题、同一类。 分类的颜色会被模板和条目继承（自己另外选了就以自己的为准）。':
    'Stats group by category, not by title — “metro to work” and “taxi home” are two titles, one category. Templates and entries inherit the category colour unless they set their own.',
  '还没归类的。切到别的周会看到那一周的。 明细过了保留期就只剩汇总、改不动了，所以尽量趁早归。':
    'Still uncategorised. Switch weeks to see that week’s. Once details pass the retention window only the summary is left and it can no longer be changed — so do it early.',
  '记录率低于一半时，下面所有数字都要打折看 —— 没记下来的时间不知道去哪了。':
    'Below 50% logged, take every number here with a pinch of salt — the unlogged hours went somewhere.',
  '细线是每周实际，粗线是 EWMA（平滑掉单周的意外）。 纵轴是':
    'Thin line = each week’s actual, thick line = EWMA (smooths out one-off weeks). The y-axis is ',
  '点了登录链接却没回到这里？去 Supabase → Authentication → URL Configuration → Redirect URLs，把':
    'Clicked the sign-in link and did not come back here? In Supabase → Authentication → URL Configuration → Redirect URLs, add ',
  '加进白名单。 不在白名单里的地址会被静默忽略，直接退回 Site URL。':
    ' to the allow-list. Addresses that are not on it are silently ignored and you land on the Site URL instead.',
  '长按空白处': 'Long-press empty space',
  '（或点栏头的 ＋）在那个时间加一条：从今天还没安排的事里挑一件， 或者直接写一件新的。两栏都行 —— 加到右边就是「做了」，加到左边是「打算做」。 拖块左边的竖条挪时间，拖底边改时长。':
    ' (or tap the + in the column header) to add an entry at that time: pick something still unscheduled today, or write a new one. Either column works — on the right it means “did it”, on the left “plan to”. Drag the strip on a block’s left edge to move it, drag the bottom edge to resize. ',
  '长按块': 'Long-press a block',
  '打开编辑 —— 从哪一栏长按，编辑器就把哪一组时间放在最上面（计划是橙的、实际是绿的）， 记实际时间时点开始/结束那一格可以一下填「现在」。单击选中 （可以点好几个一起拖），双击计划块 = 完成、双击右边的块 = 撤销； 选中之后底下那条也有「完成」，点不准时用它。':
    ' to edit it. Whichever column you press from, the editor puts that set of times on top (plan is orange, actual is green); when logging actual times, tap the start or end field to fill in “now”. A single tap selects (you can select several and drag them together); double-tap a plan block to complete it, double-tap a block on the right to undo — or just select it and use the Done button on the bar at the bottom. ',
  '半透明': 'Semi-transparent',
  '是时长还没定死，': ' means the duration is not settled yet; ',
  '红色': 'red',
  '是撞车。': ' means a clash.',
  '撤销': 'Undo',
  '修改本周关注': 'Edit this week’s focus',
  '取消特殊日': 'Remove the day mark',

  // —— 颜色名 / 类型名（定义在 colors.js、schedule.js 里，那两处保持中文原文）
  '陶土橙': 'Clay orange',
  '砖红': 'Brick red',
  '赭黄': 'Ochre',
  '鼠尾草': 'Sage',
  '雾蓝': 'Mist blue',
  '丁香': 'Lilac',
  '灰': 'Stone grey',
  '时间安排': 'Event',
  '待办': 'To-do',
  '习惯': 'Habit',
  '有起止时间，画在时间轴上': 'Has a start and end; drawn on the timeline',
  '只有事，没有时间': 'Just the thing, no time',
  '每天重复，按完成度打卡': 'Repeats daily, logged as a percentage',

  // —— 示例数据（没配 Supabase 时的本地演示模板）
  '上班': 'Work',
  '写周报': 'Weekly report',
  '读书': 'Reading',
  '交房租': 'Pay rent',
  '购物': 'Shopping',
  '运动': 'Exercise',
  '早睡': 'Early night',
  '睡眠': 'Sleep',
  '专注学习': 'Deep work',
  '23:00 睡的': 'lights out at 23:00',
  '只走了 20 分钟': 'only walked 20 min',
  '剩下的时间还空着': 'Free time left: ',
  '点名称可以改标题、时长或删除。': 'Tap a name to rename it, change its length or delete it.',
  '更多设置': 'More',  '以后不再显示这些操作说明（右上角齿轮里可以打开）': 'Stop showing these how-to notes (turn them back on in the gear menu)',
  '操作提示': 'How-to notes',
  '显示「怎么用」那类说明。数据说明（日均怎么算之类）不受影响，一直都在。':
    'Show the how-to notes. Explanations of what the numbers mean are unaffected — those always stay.',
  '开': 'On',
  '关': 'Off',  '前一天': 'Previous day',
  '后一天': 'Next day',
}

/** 返回翻译函数。查不到就原样回落 —— 漏翻只是那句是中文，不会炸。 */
export function makeT(lang) {
  return (zh) => (lang === 'en' ? (EN[zh] ?? zh) : zh)
}

/**
 * 模块级的 t()：组件只 `import { t }`，不用每个组件都挂 hook。
 *
 * 之所以敢这么做：语言状态在 <LangProvider> 里，它在整棵树的最上面，
 * 一改语言整棵树重渲染，t() 下次调用自然读到新值。项目里没有用 React.memo
 * 把子树挡住，所以不存在「改了语言但某块没更新」的情况。
 * （真要加 memo 的那天，那个组件得自己 useLang() 订阅一下。）
 */
let active = initialLang()
export const setActiveLang = (lang) => {
  active = lang
}

// 叫 tr 不叫 t：项目里已经有七个文件把 t 当局部变量用（模板、标题、条目），
// 叫 t 会被就近作用域悄悄遮蔽 —— 不报错，只是那句永远不翻译
export const tr = (zh) => (active === 'en' ? (EN[zh] ?? zh) : zh)

/**
 * 带插值的串走这里：`pick(() => \`补 ${n} 条\`, () => \`Fill in ${n}\`)`。
 * 字典是「一句对一句」，塞不下变量在中间的写法。
 */
export const pick = (zh, en) => (active === 'en' ? en() : zh())

/** date-fns 的格式串，跟着当前语言走。 */
export const dateFmt = (name) => DATE_FMT[name][active === 'en' ? 'en' : 'zh']

/** 星期表头（窄：一个字母 / 宽：三个字母）。 */
export const weekLetterList = () => weekLetters(active)
export const weekNameList = () => weekNames(active)

/** 表头那种一格宽的：中文「一」，英文「M」。 */
export const weekdayShort = (isoDay) => weekLetters(active)[isoDay - 1]

/** 「周三」这种带前缀的写法英文里不存在，直接给 Wed。 */
export const weekdayWord = (isoDay) =>
  active === 'en' ? weekNames('en')[isoDay - 1] : `周${weekNames('zh')[isoDay - 1]}`
