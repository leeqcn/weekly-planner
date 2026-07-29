import { format } from 'date-fns'
import { buildHabitRows, buildTodoRows } from '../lib/schedule'
import MiniCalendar from './MiniCalendar'
import WeeklyFocusPanel from './WeeklyFocusPanel'
import TodoGrid from './TodoGrid'
import WeekTimeline from './WeekTimeline'
import HabitGrid from './HabitGrid'

export default function WeekView({ planner, onOpenDay }) {
  const {
    days, monday, templates, entries, habitLogs, specialDays, focus,
    saveFocus, saveHabitLog, updateEntry, goToDate, shiftWeek, generateWeek, isCurrentWeek,
  } = planner

  const todoRows = buildTodoRows(templates, entries, days)
  const habitRows = buildHabitRows(templates, habitLogs, days)

  function toggleTodo(entry) {
    const stamp = new Date().toISOString()
    updateEntry(
      entry.id,
      entry.status === 'done'
        ? { status: 'planned', actual_start: null, actual_end: null }
        : { status: 'done', actual_start: stamp, actual_end: stamp },
    )
  }

  return (
    <div className="week-view">
      <div className="week-head">
        <div className="row-gap">
          <button className="ghost" onClick={() => shiftWeek(-1)}>‹ 上一周</button>
          <h1>{format(days[0], 'M 月 d 日')} – {format(days[6], 'M 月 d 日')}</h1>
          <button className="ghost" onClick={() => shiftWeek(1)}>下一周 ›</button>
          {isCurrentWeek ? (
            <span className="badge">本周</span>
          ) : (
            <button className="ghost" onClick={() => goToDate(new Date())}>回到本周</button>
          )}
        </div>
        <button onClick={generateWeek} title="按模板补齐这一周还没生成的安排">
          补齐这周的安排
        </button>
      </div>

      <div className="week-top">
        <WeeklyFocusPanel focus={focus} onSave={saveFocus} />
        <MiniCalendar monday={monday} onPick={goToDate} />
      </div>

      {/* 顺序：待办 -> 时间轴 -> 习惯 */}
      <TodoGrid rows={todoRows} days={days} onToggle={toggleTodo} />

      <WeekTimeline
        days={days}
        entries={entries}
        specialDays={specialDays}
        onOpenDay={onOpenDay}
      />

      <HabitGrid rows={habitRows} days={days} onSetHabit={saveHabitLog} />
    </div>
  )
}
