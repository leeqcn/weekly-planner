import { format, isSameDay } from 'date-fns'
import { dateKey, weekdayLabel } from '../lib/dates'
import { habitsForDay } from '../lib/generate'
import { habitStatus } from '../lib/habits'
import MiniCalendar from './MiniCalendar'
import WeeklyFocusPanel from './WeeklyFocusPanel'

export default function WeekView({ planner, onOpenDay }) {
  const {
    days,
    monday,
    templates,
    entries,
    habitLogs,
    specialDays,
    focus,
    saveFocus,
    goToDate,
    shiftWeek,
    generateWeek,
  } = planner

  const logByKey = new Map(habitLogs.map((l) => [`${l.template_id}|${l.date}`, l]))
  const specialByDate = new Map(specialDays.map((s) => [s.date, s]))
  const entriesByDate = entries.reduce((acc, e) => {
    acc.set(e.date, (acc.get(e.date) ?? 0) + 1)
    return acc
  }, new Map())

  return (
    <div className="week-view">
      <div className="week-main">
        <div className="week-head">
          <div className="row-gap">
            <button className="ghost" onClick={() => shiftWeek(-1)}>
              ‹ 上一周
            </button>
            <h1>
              {format(days[0], 'M 月 d 日')} – {format(days[6], 'M 月 d 日')}
            </h1>
            <button className="ghost" onClick={() => shiftWeek(1)}>
              下一周 ›
            </button>
          </div>
          <div className="row-gap">
            <button onClick={() => goToDate(new Date())}>回到本周</button>
            <button onClick={generateWeek} title="按模板补齐这周还没生成的日程">
              生成本周安排
            </button>
          </div>
        </div>

        <div className="week-grid">
          {days.map((day) => {
            const key = dateKey(day)
            const special = specialByDate.get(key)
            const habits = habitsForDay(templates, day)
            const today = isSameDay(day, new Date())
            return (
              <button
                key={key}
                className={`day-cell${special ? ' special' : ''}${today ? ' today' : ''}`}
                onClick={() => onOpenDay(day)}
              >
                <span className="day-cell-wd">{weekdayLabel(day)}</span>
                <span className="day-cell-date">{format(day, 'd')}</span>
                {special && <span className="day-cell-special">{special.label}</span>}
                <span className="dots">
                  {habits.map((h) => {
                    const log = logByKey.get(`${h.id}|${key}`)
                    const style = log
                      ? { background: habitStatus(log.completion_pct).color }
                      : undefined
                    return (
                      <i
                        key={h.id}
                        className={`dot${log ? '' : ' empty'}`}
                        style={style}
                        title={h.title}
                      />
                    )
                  })}
                </span>
                <span className="day-cell-count">
                  {entriesByDate.get(key) ? `${entriesByDate.get(key)} 项安排` : ' '}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <aside className="week-side">
        <MiniCalendar monday={monday} onPick={goToDate} />
        <WeeklyFocusPanel focus={focus} onSave={saveFocus} />
      </aside>
    </div>
  )
}
