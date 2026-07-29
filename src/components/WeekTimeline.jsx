import { format, isSameDay } from 'date-fns'
import { dateKey, formatTime, minutesOfDay, weekdayLabel } from '../lib/dates'
import { layoutBlocks } from '../lib/layout'
import { isScheduled } from '../lib/schedule'

// 完整 24 小时一次画完，不在卡片里再套一层滚动 ——
// 里面套滚动会看不到全天，还老是滚错那一层。页面自己滚就够了。
const HOUR_PX = 26
const HOURS = Array.from({ length: 24 }, (_, i) => i)

/** 7 个并排的时间轴。保留完整 24 小时，往上滑能看到 0–6 点的睡眠。 */
export default function WeekTimeline({ days, entries, specialDays, onOpenDay }) {
  const now = new Date()
  const specialByDate = new Map(specialDays.map((s) => [s.date, s]))

  return (
    <section className="card week-timeline-card">
      <h2>Time schedule</h2>
      <div className="week-timeline-scroll-x">
        <div className="week-timeline">
          <div className="wt-headrow">
            <div className="wt-axis-head" />
            {days.map((day) => {
              const key = dateKey(day)
              const special = specialByDate.get(key)
              return (
                <button
                  key={key}
                  className={[
                    'wt-dayhead',
                    special ? 'special' : '',
                    isSameDay(day, now) ? 'today' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => onOpenDay(day)}
                  title={special ? special.label : '打开这天'}
                >
                  <span className="wt-wd">{weekdayLabel(day)}</span>
                  <span className="wt-date">{format(day, 'd')}</span>
                  {special && <span className="wt-special">{special.label}</span>}
                </button>
              )
            })}
          </div>

          <div className="wt-scroll">
            <div
              className="wt-body"
              style={{ height: 24 * HOUR_PX, '--hour-px': `${HOUR_PX}px` }}
            >
              <div className="wt-axis">
                {HOURS.map((h) => (
                  <div className="wt-hour" key={h} style={{ height: HOUR_PX }}>
                    <span>{String(h).padStart(2, '0')}</span>
                  </div>
                ))}
              </div>

              {days.map((day) => {
                const key = dateKey(day)
                const dayEntries = entries.filter((e) => e.date === key && isScheduled(e))
                const blocks = layoutBlocks(
                  dayEntries.map((e) => ({
                    entry: e,
                    start: e.planned_start,
                    end: e.planned_end,
                  })),
                )
                return (
                  <div className="wt-col" key={key}>
                    {isSameDay(day, now) && (
                      <div
                        className="now-line"
                        style={{ top: (minutesOfDay(now.toISOString()) / 60) * HOUR_PX }}
                      />
                    )}
                    {blocks.map((b) => {
                      const width = 100 / b.lanes
                      const minutes = Math.max(15, (b.to - b.from) / 60000)
                      return (
                        <button
                          key={b.entry.id}
                          className={`wt-block status-${b.entry.status}`}
                          style={{
                            top: (minutesOfDay(b.start) / 60) * HOUR_PX,
                            height: Math.max(12, (minutes / 60) * HOUR_PX),
                            left: `calc(${b.lane * width}% + 2px)`,
                            width: `calc(${width}% - 4px)`,
                          }}
                          onClick={() => onOpenDay(day)}
                          title={`${b.entry.title} ${formatTime(b.start)}–${formatTime(b.end)}`}
                        >
                          <span>{b.entry.title}</span>
                        </button>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
