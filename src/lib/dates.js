import {
  addDays,
  format,
  getDate,
  getISODay,
  parseISO,
  startOfWeek,
  subDays,
} from 'date-fns'
import { weekdayWord } from './i18n'

/** 'yyyy-MM-dd'，全项目统一用它作为 date 列的值和 React key。 */
export function dateKey(date) {
  return format(date, 'yyyy-MM-dd')
}

/** dateKey 字符串 -> 本地时区的 Date（避免 new Date('2026-07-28') 被当成 UTC）。 */
export function fromDateKey(key) {
  return parseISO(key)
}

/** 该日期所在周的周一。 */
export function weekStart(date) {
  return startOfWeek(date, { weekStartsOn: 1 })
}

/** 周一到周日的 7 个 Date。 */
export function weekDays(monday) {
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i))
}

/** 周一=1 … 周日=7，对应 templates.recurrence_days 的 weekly 取值。 */
export const isoWeekday = getISODay

/** 1..31，对应 templates.recurrence_days 的 monthly 取值。 */
export const monthDay = getDate

/** 模板在某一天是否生效。 */
export function templateOccursOn(template, date) {
  if (!template.is_active) return false
  const days = template.recurrence_days ?? []
  return template.recurrence === 'monthly'
    ? days.includes(monthDay(date))
    : days.includes(isoWeekday(date))
}

/** dateKey + 'HH:mm[:ss]' -> ISO 字符串（按本地时区解释）。 */
export function combineDateTime(key, time) {
  if (!time) return null
  const [h, m] = time.split(':')
  const d = fromDateKey(key)
  d.setHours(Number(h), Number(m ?? 0), 0, 0)
  return d.toISOString()
}

/** ISO 字符串 -> 'HH:mm'（本地时区）。 */
export function formatTime(iso) {
  return iso ? format(new Date(iso), 'HH:mm') : ''
}

/** ISO 字符串 -> 距当天 0 点的分钟数，用于时间轴定位。 */
export function minutesOfDay(iso) {
  const d = new Date(iso)
  return d.getHours() * 60 + d.getMinutes()
}

/** 'HH:mm' <- ISO，供 <input type="time"> 使用。 */
export function toTimeInput(iso) {
  return formatTime(iso)
}

// 星期的写法归 i18n 管：中文「周一」、英文「Mon」

/** '周一' … '周日'（date-fns 默认 locale 是英文，这里直接给中文）。 */
export function weekdayLabel(date) {
  return weekdayWord(isoWeekday(date))
}

/** 保留期边界：今天往前 days 天的 dateKey，早于它的流水数据会被清理。 */
export function retentionCutoff(days = 21, today = new Date()) {
  return dateKey(subDays(today, days))
}

export { addDays, format }
