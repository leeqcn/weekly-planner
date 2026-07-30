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
    if (!isTodoRow(entry)) continue
    const key = entry.template_id ? `tpl:${entry.template_id}` : `adhoc:${entry.title}`
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        title: entry.title,
        templateId: entry.template_id ?? null,
        color: entry.color ?? null,
        byDate: new Map(),
      })
    }
    groups.get(key).byDate.set(entry.date, entry)
  }

  const rows = [...groups.values()].map((g) => ({
    key: g.key,
    title: g.title,
    templateId: g.templateId,
    color: g.color,
    cells: keys.map((k) => {
      const entry = g.byDate.get(k)
      if (!entry) return null
      // 待办没打分时算 0（红），这样一眼能看出任务落在哪天
      return { date: k, pct: entry.completion_pct ?? 0, entry }
    }),
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
      color: t.color ?? null,
      cells: days.map((day, i) => {
        if (!templateOccursOn(t, day)) return null
        const log =
          habitLogs.find((l) => l.template_id === t.id && l.date === keys[i]) ?? null
        // 习惯没打卡就留空白 —— 默认全红看着太吓人
        return { date: keys[i], pct: log ? log.completion_pct : null, log }
      }),
    }))
  return sortRows(rows, templates)
}

/** 点一下在这三档之间循环，第一下就是「做完了」。 */
export const PCT_CYCLE = [100, 50, 0]

export function nextPct(current) {
  if (current === null || current === undefined) return PCT_CYCLE[0]
  const i = PCT_CYCLE.indexOf(current)
  return i === -1 ? PCT_CYCLE[0] : PCT_CYCLE[(i + 1) % PCT_CYCLE.length]
}

/**
 * 待办列表里该出现的条目。
 *
 *  - 没有计划时间的 —— 本来就是待办
 *  - 有计划时间但勾了 keep_in_todo 的 —— 排进时间轴了也继续留在列表里
 *  - 「只记实际」的（没计划但有实际）不算 —— 那是已完成的记录，只进 Actually 栏
 */
export function isTodoRow(entry) {
  if (entry.actual_start && entry.actual_end && !isScheduled(entry)) return false
  return !isScheduled(entry) || entry.keep_in_todo
}

export function todosOfDay(entries, key) {
  return entries.filter((e) => e.date === key && isTodoRow(e))
}

/** 某天该打卡的习惯。 */
export function habitsOfDay(templates, day) {
  return templates.filter((t) => t.type === 'habit' && templateOccursOn(t, day))
}

/**
 * 时间块画成什么样 —— 全部算出来，不存状态。
 *
 *   conflict 和别的块撞了            -> 半透明 + 红
 *   loose    时长还是个区间，没定死  -> 半透明
 *   solid    起止都定死且不冲突      -> 实心
 *
 * 撞车不阻止你排，只是显眼地告诉你，自己拖开就行。
 */
export function blockState(entry, dayEntries) {
  const from = new Date(entry.planned_start).getTime()
  const to = new Date(entry.planned_end).getTime()

  const clashes = dayEntries.some((other) => {
    if (other.id === entry.id || !isScheduled(other)) return false
    return (
      from < new Date(other.planned_end).getTime() &&
      to > new Date(other.planned_start).getTime()
    )
  })
  if (clashes) return 'conflict'

  const { min_duration_minutes: min, max_duration_minutes: max } = entry
  if (min !== null && min !== undefined && max !== null && max !== undefined && min !== max) {
    return 'loose'
  }
  return 'solid'
}

/** '30–60 分钟' / '1 小时'，块上和待办表里都用。 */
export function describeRange(entry) {
  const { min_duration_minutes: min, max_duration_minutes: max } = entry
  if (min == null && max == null) return ''
  if (min != null && max != null && min !== max) return `${min}–${max}′`
  return `${max ?? min}′`
}
