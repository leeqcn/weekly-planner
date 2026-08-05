import { pick } from './i18n'
/**
 * 时间输入：全部手打，不用 <input type="time"> 那个时钟控件。
 * 开始 / 结束 / 时长三个里填两个，第三个自动算出来。
 */

/**
 * 宽松解析时刻，返回从 0 点起的分钟数。
 *   9 → 09:00   930 → 09:30   0930 → 09:30
 *   9:30 / 9.30 / 9：30 都行
 */
export function parseClock(text) {
  const raw = String(text ?? '').trim()
  if (!raw) return null

  const sep = raw.match(/^(\d{1,2})\s*[:：.．\s]\s*(\d{1,2})$/)
  let h
  let m
  if (sep) {
    h = Number(sep[1])
    m = Number(sep[2])
  } else {
    const digits = raw.match(/^(\d{1,4})$/)
    if (!digits) return null
    const d = digits[1]
    if (d.length <= 2) {
      h = Number(d)
      m = 0
    } else {
      h = Number(d.slice(0, d.length - 2))
      m = Number(d.slice(-2))
    }
  }
  if (!Number.isInteger(h) || !Number.isInteger(m)) return null
  if (h === 24 && m === 0) return 24 * 60
  if (h < 0 || h > 23 || m < 0 || m > 59) return null
  return h * 60 + m
}

/**
 * 解析时长，返回分钟数。
 *   90 → 90 分   1:30 → 90 分   1.5h → 90 分   2h → 120 分   45m → 45 分
 */
export function parseDuration(text) {
  const raw = String(text ?? '').trim().toLowerCase()
  if (!raw) return null

  const hm = raw.match(/^(\d{1,2})\s*[:：]\s*(\d{1,2})$/)
  if (hm) {
    const m = Number(hm[2])
    if (m > 59) return null
    return Number(hm[1]) * 60 + m
  }

  const hours = raw.match(/^(\d+(?:\.\d+)?)\s*(?:h|小时|时)$/)
  if (hours) return Math.round(Number(hours[1]) * 60)

  const mins = raw.match(/^(\d+)\s*(?:m|min|分钟|分)$/)
  if (mins) return Number(mins[1])

  const plain = raw.match(/^\d+$/)
  if (plain) return Number(raw)

  return null
}

/** 分钟数 → 'HH:MM' */
export function formatClock(minutes) {
  if (minutes === null || minutes === undefined) return ''
  if (minutes === 1440) return '24:00' // 结束时间填 24 表示到当天结束
  const m = ((minutes % 1440) + 1440) % 1440
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

/** 分钟数 → '1:30'，时长输入框里用 */
export function formatDuration(minutes) {
  if (minutes === null || minutes === undefined) return ''
  const total = Math.max(0, Math.round(minutes))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

/** 时长的人话，'1 小时 30 分' */
export function describeDuration(minutes) {
  if (!minutes) return ''
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  // 这串会出现在容量提示、计时横幅和编辑器里，也得跟着语言走
  return pick(
    () => (h && m ? `${h} 小时 ${m} 分` : h ? `${h} 小时` : `${m} 分钟`),
    () => (h && m ? `${h}h ${m}m` : h ? `${h}h` : `${m} min`),
  )
}

/**
 * 三个值里改了一个，算出另一个。
 * 规则是固定的，不会让人猜：
 *   改开始 → 有时长就重算结束，否则有结束就重算时长
 *   改结束 → 有开始就重算时长，否则有时长就重算开始
 *   改时长 → 有开始就重算结束，否则有结束就重算开始
 * 返回 { start, end, duration }，都是分钟数或 null。
 */
export function reconcile(field, { start, end, duration }) {
  const has = (v) => v !== null && v !== undefined

  if (field === 'start' && has(start)) {
    if (has(duration)) return { start, end: start + duration, duration }
    if (has(end)) return { start, end, duration: Math.max(0, end - start) }
  }
  if (field === 'end' && has(end)) {
    if (has(start)) return { start, end, duration: Math.max(0, end - start) }
    if (has(duration)) return { start: Math.max(0, end - duration), end, duration }
  }
  if (field === 'duration' && has(duration)) {
    if (has(start)) return { start, end: start + duration, duration }
    if (has(end)) return { start: Math.max(0, end - duration), end, duration }
  }
  return { start, end, duration }
}
