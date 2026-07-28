import { combineDateTime, dateKey, templateOccursOn } from './dates'

/**
 * 根据模板生成某几天的 schedule_entries —— Step1 最优先解决的痛点：
 * 不用每周手动重新输入重复安排。
 *
 * habit 类型不进 schedule_entries，它走 habits_log 打卡。
 * 已经存在的 (template_id, date) 会被跳过，所以可以放心重复调用。
 */
export function buildEntriesFor(templates, days, existingEntries) {
  const existing = new Set(
    existingEntries
      .filter((e) => e.template_id)
      .map((e) => `${e.template_id}|${e.date}`),
  )

  const rows = []
  for (const day of days) {
    const key = dateKey(day)
    for (const template of templates) {
      if (template.type === 'habit') continue
      if (!templateOccursOn(template, day)) continue
      if (existing.has(`${template.id}|${key}`)) continue

      rows.push({
        template_id: template.id,
        date: key,
        title: template.title,
        planned_start: combineDateTime(key, template.start_time),
        planned_end: combineDateTime(key, template.end_time),
        actual_start: null,
        actual_end: null,
        status: 'planned',
        rescheduled_from: null,
      })
    }
  }
  return rows
}

/** 某天生效的 habit 模板，Day View 的打卡区按它渲染。 */
export function habitsForDay(templates, day) {
  return templates.filter((t) => t.type === 'habit' && templateOccursOn(t, day))
}
