import { formatClock } from '../lib/time'
import { minutesOfDay } from '../lib/dates'
import { isScheduled } from '../lib/schedule'

const HOUR_PX = 15

/**
 * 编辑时间时旁边的一条当天缩略时间轴 —— 之前填时间根本看不到
 * 哪些时段是空的，只能凭记忆猜。灰块是已排的，彩块是正在编辑的这条。
 */
export default function DayStrip({ entries, editingId, draft }) {
  const blocks = entries
    .filter((e) => isScheduled(e) && e.id !== editingId)
    .map((e) => ({
      id: e.id,
      title: e.title,
      from: minutesOfDay(e.planned_start),
      to: minutesOfDay(e.planned_end),
    }))

  const hasDraft = draft.start !== null && draft.end !== null && draft.end > draft.start
  const clash =
    hasDraft && blocks.some((b) => draft.start < b.to && draft.end > b.from)

  return (
    <div className="day-strip">
      <div className="day-strip-body" style={{ height: 24 * HOUR_PX }}>
        {Array.from({ length: 24 }, (_, h) => (
          <div className="day-strip-hour" key={h} style={{ height: HOUR_PX }}>
            {h % 3 === 0 && <span>{String(h).padStart(2, '0')}</span>}
          </div>
        ))}
        {blocks.map((b) => (
          <div
            key={b.id}
            className="day-strip-block"
            title={`${b.title} ${formatClock(b.from)}–${formatClock(b.to)}`}
            style={{
              top: (b.from / 60) * HOUR_PX,
              height: Math.max(3, ((b.to - b.from) / 60) * HOUR_PX),
            }}
          />
        ))}
        {hasDraft && (
          <div
            className={`day-strip-block draft${clash ? ' clash' : ''}`}
            style={{
              top: (draft.start / 60) * HOUR_PX,
              height: Math.max(3, ((draft.end - draft.start) / 60) * HOUR_PX),
            }}
          />
        )}
      </div>
      <p className="muted small strip-note">
        {clash ? '和已排的时间重叠了' : hasDraft ? '这段是空的' : '当天已排的时间'}
      </p>
    </div>
  )
}
