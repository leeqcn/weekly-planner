import { combineDateTime, minutesOfDay } from './dates'
import { isScheduled } from './schedule'
import { formatClock } from './time'

const DAY_END = 24 * 60
/** 别的日子从早上 8 点开始找；今天从「现在」开始找。 */
const DEFAULT_ANCHOR = 8 * 60
/** 起始时间取整到 5 分钟，免得排出 14:07 这种。 */
const STEP = 5

const roundUp = (m) => Math.ceil(m / STEP) * STEP

/** 一条待办排进时间轴时占多长：有区间就按上限，宁可留富余。 */
export function placementMinutes(entry, fallback = 60) {
  return entry.max_duration_minutes ?? entry.min_duration_minutes ?? fallback
}

/**
 * 找当天第一个塞得下 minutes 的空档。
 *
 * 「之后的顺序加入」是自动的：上一条排进去之后就成了占用时段，
 * 下一条自然只能落在它后面。
 *
 * 塞不下也照样给个位置（接在最后一个块后面，哪怕过了 24 点）——
 * 拒绝排入只会逼人去别处手动填时间。排上去、标红、自己拖，比拒绝有用。
 *
 * @returns 起始分钟数，永远不为 null
 */
export function findSlot(dayEntries, minutes, { anchor = DEFAULT_ANCHOR } = {}) {
  if (!minutes || minutes <= 0) minutes = 60

  const busy = dayEntries
    .filter(isScheduled)
    .map((e) => ({
      from: minutesOfDay(e.planned_start),
      to: minutesOfDay(e.planned_end) || DAY_END, // 结束在第二天 0 点算 24:00
    }))
    .sort((a, b) => a.from - b.from)

  let cursor = roundUp(Math.max(0, anchor))
  for (const block of busy) {
    if (block.to <= cursor) continue
    if (block.from - cursor >= minutes) return cursor // 这个缝够大
    cursor = Math.max(cursor, roundUp(block.to))
  }
  return cursor
}

/** 今天的话从现在开始找，其它日子从默认锚点开始。 */
export function anchorFor(dateKey, now = new Date()) {
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  return dateKey === today
    ? Math.max(DEFAULT_ANCHOR - 24 * 60, now.getHours() * 60 + now.getMinutes())
    : DEFAULT_ANCHOR
}

/** 某天的第 n 分钟 -> ISO。超过 24 点算到第二天，拖过午夜也存得下。 */
export function minutesToIso(key, minutes) {
  const within = ((minutes % 1440) + 1440) % 1440
  const d = new Date(combineDateTime(key, formatClock(within)))
  d.setDate(d.getDate() + Math.floor(minutes / 1440))
  return d.toISOString()
}
