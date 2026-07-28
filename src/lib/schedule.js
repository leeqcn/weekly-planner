import { dateKey, templateOccursOn } from './dates'

/**
 * 短于这个时长的事项不画在时间轴上（画出来也只是一条缝），
 * 改成周清单里打个勾就行 —— 比如量血压、交房租。
 * 想调整阈值改这一个常量。
 */
export const MIN_TIMELINE_MINUTES = 20

const toMinutes = (time) => {
  if (!time) return null
  const [h, m] = time.split(':')
  return Number(h) * 60 + Number(m ?? 0)
}

/** 一条日程的计划时长（分钟）；没定时间返回 null。 */
export function entryMinutes(entry) {
  if (!entry.planned_start || !entry.planned_end) return null
  return (new Date(entry.planned_end) - new Date(entry.planned_start)) / 60000
}

/** 值不值得在时间轴上占一格。 */
export function isTimelineEntry(entry) {
  const minutes = entryMinutes(entry)
  return minutes !== null && minutes >= MIN_TIMELINE_MINUTES
}

/** 模板层面的同一判断，用于提示用户这个模板会出现在哪儿。 */
export function isTimelineTemplate(template) {
  if (template.type === 'habit') return false
  const start = toMinutes(template.start_time)
  const end = toMinutes(template.end_time)
  if (start === null || end === null) return false
  return end - start >= MIN_TIMELINE_MINUTES
}

/**
 * 周清单（n × 8 表格）的行。
 *
 * 两类行：
 *  - habit：每天重复的打卡项，格子颜色来自 habits_log.completion_pct
 *  - task：短事项 / 没定时间的安排，当待办用，格子是完成勾
 *
 * 同一个模板生成的条目归到一行；手动加的临时条目按标题归行，
 * 所以连着几天加「量血压」也会并成一行。
 */
export function buildChecklistRows(templates, entries, habitLogs, days) {
  const keys = days.map(dateKey)
  const rows = []

  for (const template of templates) {
    if (template.type !== 'habit' || !template.is_active) continue
    rows.push({
      key: `habit:${template.id}`,
      kind: 'habit',
      title: template.title,
      templateId: template.id,
      cells: days.map((day, i) =>
        templateOccursOn(template, day)
          ? {
              date: keys[i],
              log:
                habitLogs.find(
                  (l) => l.template_id === template.id && l.date === keys[i],
                ) ?? null,
            }
          : null,
      ),
    })
  }

  const groups = new Map()
  for (const entry of entries) {
    if (isTimelineEntry(entry)) continue
    const key = entry.template_id ? `tpl:${entry.template_id}` : `adhoc:${entry.title}`
    if (!groups.has(key)) {
      groups.set(key, { key: `task:${key}`, kind: 'task', title: entry.title, byDate: new Map() })
    }
    groups.get(key).byDate.set(entry.date, entry)
  }

  for (const group of groups.values()) {
    rows.push({
      key: group.key,
      kind: 'task',
      title: group.title,
      cells: keys.map((k) =>
        group.byDate.has(k) ? { date: k, entry: group.byDate.get(k) } : null,
      ),
    })
  }

  return rows
}
