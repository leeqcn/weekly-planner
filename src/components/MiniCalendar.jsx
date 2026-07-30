import { useState } from 'react'
import {
  addDays,
  addMonths,
  endOfMonth,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
} from 'date-fns'
import { dateKey, weekStart } from '../lib/dates'

const WEEK_LABELS = ['一', '二', '三', '四', '五', '六', '日']

/** 角落的小月历：点某一天直接进那天的 Day View。 */
export default function MiniCalendar({ monday, onPick, onOpenDay }) {
  const [cursor, setCursor] = useState(() => startOfMonth(monday))

  const gridStart = weekStart(startOfMonth(cursor))
  const gridEnd = endOfMonth(cursor)
  const cells = []
  for (let d = gridStart; d <= gridEnd || cells.length % 7 !== 0; d = addDays(d, 1)) {
    cells.push(d)
    if (cells.length > 41) break
  }

  const weekEnd = addDays(monday, 6)
  const inShownWeek = (d) => d >= monday && d <= weekEnd

  return (
    <div className="mini-cal">
      <div className="mini-cal-head">
        <button className="ghost" onClick={() => setCursor(addMonths(cursor, -1))}>
          ‹
        </button>
        <span>{format(cursor, 'yyyy 年 M 月')}</span>
        <button className="ghost" onClick={() => setCursor(addMonths(cursor, 1))}>
          ›
        </button>
      </div>
      <div className="mini-cal-grid">
        {WEEK_LABELS.map((w) => (
          <span key={w} className="mini-cal-wd">
            {w}
          </span>
        ))}
        {cells.map((d) => (
          <button
            key={dateKey(d)}
            className={[
              'mini-cal-day',
              isSameMonth(d, cursor) ? '' : 'out',
              inShownWeek(d) ? 'in-week' : '',
              isSameDay(d, new Date()) ? 'today' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => {
              // 点某一天：既切到那一周，也直接进这天的 Day View
              onPick(d)
              onOpenDay?.(d)
            }}
          >
            {format(d, 'd')}
          </button>
        ))}
      </div>
    </div>
  )
}
