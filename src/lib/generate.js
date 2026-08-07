import { combineDateTime, dateKey, templateOccursOn } from './dates'

/**
 * 根据模板生成某几天的 schedule_entries —— 不用每周手动重新输入重复安排。
 *
 * event 生成带时间的条目（上时间轴），todo 生成不带时间的条目（进待办）。
 * habit 不进这张表，它走 habits_log 打卡。
 * 已经存在的 (template_id, date) 会被跳过，所以可以放心重复调用。
 * `notBefore`（dateKey）之前的日子一律不生成 —— 传今天进来，
 * 就不会在已经过去的那几天里凭空造出「没做完」的任务。
 *
 * `existingKeys` 必须包含**已经删掉的**那些（repo.listEntryKeys 就是干这个的）。
 * 只看还活着的条目，用户删掉的那条下次刷新就又长回来了 —— 界面上删了、
 * 一刷新又出现，就是这个原因。删除现在是打墓碑（见 db/0009），
 * 坑还占着，这里才看得见。
 */
export function buildEntriesFor(templates, days, existingKeys, notBefore) {
  const existing = new Set(
    existingKeys
      .filter((e) => e.template_id)
      .map((e) => `${e.template_id}|${e.date}`),
  )

  const rows = []
  for (const day of days) {
    const key = dateKey(day)
    // 已经过去的日子不生成。周三新建一个「每天」的待办，周一周二不该
    // 凭空冒出两条没做的任务 —— 那两天的历史已经定了，模板管不着。
    // （「过去的周整周不回填」是同一条原则，这里只是把粒度细到天。）
    if (notBefore && key < notBefore) continue
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
        min_duration_minutes: template.min_duration_minutes ?? null,
        max_duration_minutes: template.max_duration_minutes ?? null,
        keep_in_todo: template.keep_in_todo ?? false,
        status: 'planned',
        rescheduled_from: null,
      })
    }
  }
  return rows
}

