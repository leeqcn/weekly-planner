export const DAY_MINUTES = 24 * 60

/**
 * 统计口径。
 *
 * 数据来源只有 daily_rollup（明细 28 天就清了），所以这里全是纯函数：
 * 给一批汇总行 + 一个窗口，算出所有指标。α 想换随时换，重算一遍就行 ——
 * 这正是当初选「存汇总」而不是「存一个 EWMA 数字」的理由。
 */

/** 这一天属于哪一周（周一）。 */
export function weekKeyOf(key) {
  const d = new Date(`${key}T00:00:00`)
  const wd = (d.getDay() + 6) % 7 // 周一 = 0
  d.setDate(d.getDate() - wd)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** 半衰期换算成 EWMA 的 α：H 周之前的一天，权重刚好剩一半。 */
export const alphaFor = (halfLifeWeeks) => 1 - 0.5 ** (1 / Math.max(0.5, halfLifeWeeks))

/**
 * 指数加权移动平均。按时间从旧到新推，用第一个值起头
 * （用 0 起头的话前几周会被一路拖低，看着像「最近在下滑」，其实是冷启动）。
 */
export function ewma(values, alpha) {
  if (!values.length) return null
  let s = values[0]
  for (let i = 1; i < values.length; i++) s = alpha * values[i] + (1 - alpha) * s
  return s
}

const dayList = (fromKey, toKey) => {
  const out = []
  const d = new Date(`${fromKey}T00:00:00`)
  const end = new Date(`${toKey}T00:00:00`)
  while (d <= end) {
    out.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
    )
    d.setDate(d.getDate() + 1)
  }
  return out
}

/**
 * 把汇总行折成各项指标。
 *
 * @param rollups  daily_rollup 的行
 * @param fromKey  统计起点（含）
 * @param toKey    统计终点（含，通常是今天）
 * @param halfLifeWeeks EWMA 半衰期
 */
export function summarize(rollups, { fromKey, toKey, halfLifeWeeks = 4 } = {}) {
  const rows = rollups.filter((r) => r.date >= fromKey && r.date <= toKey)
  const days = dayList(fromKey, toKey)
  const alpha = alphaFor(halfLifeWeeks)

  // 有任何一条记录的那些周才参与平均。整周没打开过 app 的，
  // 不能当成「那周睡了 0 小时」—— 那是没记录，不是没发生。
  const recordedWeeks = [...new Set(rows.map((r) => weekKeyOf(r.date)))].sort()

  const byCat = new Map()
  const perDay = new Map() // catKey -> Map(date -> minutes)
  for (const r of rows) {
    const k = r.category_key
    const c =
      byCat.get(k) ??
      { key: k, actual: 0, planned: 0, sessions: 0, weeks: new Map(), days: 0 }
    c.actual += r.actual_minutes
    c.planned += r.planned_minutes
    c.sessions += r.sessions
    const wk = weekKeyOf(r.date)
    c.weeks.set(wk, (c.weeks.get(wk) ?? 0) + r.actual_minutes)
    byCat.set(k, c)

    if (!perDay.has(k)) perDay.set(k, new Map())
    const dm = perDay.get(k)
    dm.set(r.date, (dm.get(r.date) ?? 0) + r.actual_minutes)
  }

  const categories = [...byCat.values()].map((c) => {
    // 「执行天数」只数真的做了的天。min 也只在这些天里取 ——
    // 不然只要有一天没做，min 永远是 0，这个数就废了。
    const dayValues = [...(perDay.get(c.key)?.values() ?? [])].filter((v) => v > 0)
    const weekSeries = recordedWeeks.map((w) => c.weeks.get(w) ?? 0)
    return {
      key: c.key,
      actual: c.actual,
      planned: c.planned,
      sessions: c.sessions,
      days: dayValues.length,
      avgPerDay: dayValues.length ? c.actual / dayValues.length : 0,
      min: dayValues.length ? Math.min(...dayValues) : 0,
      max: dayValues.length ? Math.max(...dayValues) : 0,
      share: c.actual / (days.length * DAY_MINUTES),
      diff: c.actual - c.planned,
      // 从来没排过计划的（临时事件），达成率没有意义
      rate: c.planned > 0 ? c.actual / c.planned : null,
      weekSeries,
      weekAvg: weekSeries.length
        ? weekSeries.reduce((a, b) => a + b, 0) / weekSeries.length
        : 0,
      ewma: ewma(weekSeries, alpha),
    }
  })
  categories.sort((a, b) => b.actual - a.actual)

  const totalActual = categories.reduce((s, c) => s + c.actual, 0)
  const totalPlanned = categories.reduce((s, c) => s + c.planned, 0)
  const capacity = days.length * DAY_MINUTES

  // 每周一根堆叠柱，含「未记录」—— 不画它的话占比永远加不到 100%，
  // 而且「一天到底记下了多少」本身就是所有数字可信度的前提
  const weeks = recordedWeeks.map((w) => {
    const inWeek = rows.filter((r) => weekKeyOf(r.date) === w)
    const daysInWeek = days.filter((d) => weekKeyOf(d) === w).length
    const parts = new Map()
    for (const r of inWeek) {
      parts.set(r.category_key, (parts.get(r.category_key) ?? 0) + r.actual_minutes)
    }
    const actual = [...parts.values()].reduce((a, b) => a + b, 0)
    return {
      week: w,
      days: daysInWeek,
      parts,
      actual,
      capacity: daysInWeek * DAY_MINUTES,
      unrecorded: Math.max(0, daysInWeek * DAY_MINUTES - actual),
    }
  })

  return {
    fromKey,
    toKey,
    dayCount: days.length,
    categories,
    weeks,
    totalActual,
    totalPlanned,
    capacity,
    unrecorded: Math.max(0, capacity - totalActual),
    recordRate: capacity ? totalActual / capacity : 0,
    hasData: rows.length > 0,
  }
}

/** 「本周 vs 前面几周的平均」—— 卡片上那个 ↑↓ 用的。 */
export function compareLatestWeek(cat) {
  const s = cat.weekSeries
  if (s.length < 2) return null
  const latest = s.at(-1)
  const before = s.slice(0, -1)
  const base = before.reduce((a, b) => a + b, 0) / before.length
  return { latest, base, diff: latest - base }
}

export const fmtHours = (minutes) => {
  const h = minutes / 60
  return h >= 10 ? h.toFixed(0) : h.toFixed(1)
}

export function fmtHm(minutes) {
  const m = Math.round(minutes)
  const h = Math.floor(m / 60)
  const rest = m % 60
  if (!h) return `${rest}′`
  return rest ? `${h}h${String(rest).padStart(2, '0')}` : `${h}h`
}

/**
 * 导出成 CSV。**长表**（一行一天一类）而不是宽表 ——
 * 长表在 Google Sheets 里能直接做数据透视表，宽表不行。
 *
 * 开头那个 ﻿ 是 UTF-8 BOM：不加的话中文在 Excel 里是乱码。
 */
export function toCsv(rollups, nameOf) {
  const head = ['日期', '周', '分类', '计划分钟', '实际分钟', '次数']
  const lines = [...rollups]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((r) => [
      r.date,
      weekKeyOf(r.date),
      nameOf(r.category_key),
      r.planned_minutes,
      r.actual_minutes,
      r.sessions,
    ])
  const esc = (v) => {
    const s = String(v ?? '')
    return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s
  }
  return '﻿' + [head, ...lines].map((row) => row.map(esc).join(',')).join('\n')
}
