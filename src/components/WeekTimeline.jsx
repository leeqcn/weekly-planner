import { format, isSameDay } from 'date-fns'
import { dateKey, formatTime, minutesOfDay, weekdayLabel } from '../lib/dates'
import { layoutBlocks } from '../lib/layout'
import { blockToShow } from '../lib/schedule'
import { colorOf, makeColorResolver } from '../lib/colors'
import { tr } from '../lib/i18n'

// 完整 24 小时一次画完，不在卡片里再套一层滚动 ——
// 里面套滚动会看不到全天，还老是滚错那一层。页面自己滚就够了。
const HOUR_PX = 26
const HOURS = Array.from({ length: 24 }, (_, i) => i)

/** 7 个并排的时间轴。保留完整 24 小时，往上滑能看到 0–6 点的睡眠。 */
export default function WeekTimeline({
  days,
  entries,
  templates,
  categories,
  specialDays,
  onOpenDay,
}) {
  const now = new Date()
  const resolveColor = makeColorResolver(templates, categories)
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
                  title={special ? special.label : tr('打开这天')}
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
                // 做完的画实际、没做的画计划（见 schedule.js 的 blockToShow）。
                // 顺带把「只记实际」那类条目也带进来了 —— 以前只画 planned_*，
                // 临时去趟超市在周视图上是完全隐身的
                const blocks = layoutBlocks(
                  entries
                    .filter((e) => e.date === key)
                    .map((e) => {
                      const shown = blockToShow(e, now)
                      return shown ? { entry: e, ...shown } : null
                    })
                    .filter(Boolean),
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
                      const tint = colorOf(resolveColor(b.entry))
                      return (
                        <button
                          key={b.entry.id}
                          className={`wt-block status-${b.entry.status} is-${b.kind}`}
                          style={{
                            top: (minutesOfDay(b.start) / 60) * HOUR_PX,
                            height: Math.max(12, (minutes / 60) * HOUR_PX),
                            left: `calc(${b.lane * width}% + 2px)`,
                            width: `calc(${width}% - 4px)`,
                            // 还没发生的把**底色**掺白压淡，字和边框不动 ——
                            // 见 app.css 里 .wt-block.is-planned 那段的说明
                            background:
                              b.kind === 'planned'
                                ? `color-mix(in srgb, ${tint.block} 45%, var(--paper-2))`
                                : tint.block,
                            borderColor: tint.edge,
                          }}
                          onClick={() => onOpenDay(day)}
                          title={`${b.entry.title} ${formatTime(b.start)}–${formatTime(b.end)}（${b.kind === 'actual' ? tr('实际') : tr('计划')}）`}
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
