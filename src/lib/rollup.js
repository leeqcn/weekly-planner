import { categoryKey, makeCategoryResolver } from './categories'

/**
 * 明细 -> 每日分类汇总。
 *
 * 这是统计唯一的数据来源。明细 28 天就被清掉了，这张汇总永久保留，
 * 所以它必须**幂等**：每次打开 app 就拿现有明细把保留期内的每一天
 * 整个重算一遍覆盖上去。任何漏算错算下次自动修好，
 * 不需要「已经统计到哪一天」这种水位线（那种东西漏跑一次少一段、
 * 重跑一次多算一段，而且出了问题根本发现不了）。
 *
 * 顺序上必须**先重算汇总、再执行清理**：这样一天的数据在被删掉之前，
 * 已经被写进汇总二十多次了。
 */

/** 一条记录实际花了多少分钟。时间反了的算 0 —— 那是坏数据，不该污染统计。 */
export const minutesBetween = (startIso, endIso) => {
  if (!startIso || !endIso) return 0
  const m = (new Date(endIso) - new Date(startIso)) / 60000
  return m > 0 ? Math.round(m) : 0
}

/**
 * @param entries   一批 schedule_entries（可以跨多天）
 * @param templates 用来解析分类
 * @param dates     要重算的日期（dateKey 字符串）。**必须显式传** ——
 *                  某一天所有条目都被删光时，只看 entries 是推不出
 *                  「这一天要清零」的，那样旧汇总会永远留着一个幽灵数字。
 * @returns [{ date, category_key, planned_minutes, actual_minutes, sessions }]
 *          每个 (date, category) 一行；那一天没有任何条目就一行都不出
 */
export function buildRollups(entries, templates, dates) {
  const resolve = makeCategoryResolver(templates)
  const wanted = new Set(dates)
  const acc = new Map()

  for (const e of entries) {
    if (!wanted.has(e.date)) continue
    if (e.status === 'skipped') continue

    const planned = minutesBetween(e.planned_start, e.planned_end)
    const actual = minutesBetween(e.actual_start, e.actual_end)
    if (!planned && !actual) continue // 没时间的待办不进时间统计

    const key = `${e.date}|${categoryKey(resolve(e))}`
    const row =
      acc.get(key) ??
      {
        date: e.date,
        category_key: categoryKey(resolve(e)),
        planned_minutes: 0,
        actual_minutes: 0,
        sessions: 0,
      }
    row.planned_minutes += planned
    row.actual_minutes += actual
    // 「次数」只数真的做了的 —— 排了没做不算做过一次
    if (actual > 0) row.sessions += 1
    acc.set(key, row)
  }

  return [...acc.values()]
}

/**
 * 这一批日期里，哪些在汇总表里已经没有对应行了 —— 要把旧行删掉。
 * （比如某天的条目全删了，或者全改到了别的分类。）
 */
export function staleRollupKeys(existing, fresh, dates) {
  const wanted = new Set(dates)
  const alive = new Set(fresh.map((r) => `${r.date}|${r.category_key}`))
  return existing
    .filter((r) => wanted.has(r.date) && !alive.has(`${r.date}|${r.category_key}`))
    .map((r) => ({ date: r.date, category_key: r.category_key }))
}
