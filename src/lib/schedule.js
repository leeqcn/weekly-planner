import { dateKey, templateOccursOn } from './dates'

/**
 * 三个模块，靠类型分，不靠猜：
 *   event —— 有起止时间，画在时间轴上
 *   todo  —— 只有事，没有时间
 *   habit —— 只有事，没有时间，每天重复，按完成度打卡
 *
 * 之前是按「时长短于 20 分钟」来分流的，所以没填时间的固定事件会掉进待办、
 * habit 该出现的地方不出现。现在类型自己说清楚是什么。
 */
export const TYPES = {
  event: { label: '时间安排', hint: '有起止时间，画在时间轴上' },
  todo: { label: '待办', hint: '只有事，没有时间' },
  habit: { label: '习惯', hint: '每天重复，按完成度打卡' },
}

/** 有计划时间的条目才上时间轴。 */
export const isScheduled = (entry) => Boolean(entry.planned_start && entry.planned_end)

export const entryMinutes = (entry) =>
  isScheduled(entry)
    ? (new Date(entry.planned_end) - new Date(entry.planned_start)) / 60000
    : null

/**
 * 行的排序必须稳定 —— 之前是按 entries 的返回顺序排的，
 * 数据一变行就会跳位置，正要点的那行突然换到别处，很容易点错。
 * 现在固定按「模板创建时间 → 标题」排，临时条目排在模板后面。
 */
function sortRows(rows, templates) {
  const order = new Map(templates.map((t, i) => [t.id, i]))
  return rows.sort((a, b) => {
    const ai = a.templateId ? (order.get(a.templateId) ?? 1e6) : 1e9
    const bi = b.templateId ? (order.get(b.templateId) ?? 1e6) : 1e9
    return ai - bi || a.title.localeCompare(b.title, 'zh-CN')
  })
}

/**
 * 待办的行：没有计划时间的条目。同一个模板归一行；
 * 手动加的按标题归行，所以连着几天加同一件事也会并成一行。
 */
export function buildTodoRows(templates, entries, days) {
  const keys = days.map(dateKey)
  const groups = new Map()

  for (const entry of entries) {
    if (isScheduled(entry)) continue
    const key = entry.template_id ? `tpl:${entry.template_id}` : `adhoc:${entry.title}`
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        title: entry.title,
        templateId: entry.template_id ?? null,
        byDate: new Map(),
      })
    }
    groups.get(key).byDate.set(entry.date, entry)
  }

  const rows = [...groups.values()].map((g) => ({
    key: g.key,
    title: g.title,
    templateId: g.templateId,
    cells: keys.map((k) => (g.byDate.has(k) ? { date: k, entry: g.byDate.get(k) } : null)),
  }))
  return sortRows(rows, templates)
}

/** 习惯的行：habit 模板，每天一格，颜色来自 habits_log。 */
export function buildHabitRows(templates, habitLogs, days) {
  const keys = days.map(dateKey)
  const rows = templates
    .filter((t) => t.type === 'habit' && t.is_active)
    .map((t) => ({
      key: `habit:${t.id}`,
      title: t.title,
      templateId: t.id,
      cells: days.map((day, i) =>
        templateOccursOn(t, day)
          ? {
              date: keys[i],
              log:
                habitLogs.find((l) => l.template_id === t.id && l.date === keys[i]) ??
                null,
            }
          : null,
      ),
    }))
  return sortRows(rows, templates)
}

/** 某天的待办，Day View 用。 */
export function todosOfDay(entries, key) {
  return entries.filter((e) => e.date === key && !isScheduled(e))
}

/** 某天该打卡的习惯。 */
export function habitsOfDay(templates, day) {
  return templates.filter((t) => t.type === 'habit' && templateOccursOn(t, day))
}
