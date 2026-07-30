import { format } from 'date-fns'
import { buildHabitRows, buildTodoRows } from '../lib/schedule'
import { buildEntriesFor } from '../lib/generate'
import MiniCalendar from './MiniCalendar'
import WeeklyFocusPanel from './WeeklyFocusPanel'
import WeekProgressGrid from './WeekProgressGrid'
import WeekTimeline from './WeekTimeline'

export default function WeekView({ planner, onOpenDay }) {
  const {
    days, monday, templates, entries, habitLogs, specialDays, focus,
    saveFocus, saveHabitLog, updateEntry, goToDate, shiftWeek, generateWeek, isCurrentWeek,
  } = planner

  const pendingCount = buildEntriesFor(templates, days, entries).length
  const todoRows = buildTodoRows(templates, entries, days)
  const habitRows = buildHabitRows(templates, habitLogs, days)

  const setTodoPct = (row, cell, pct) =>
    updateEntry(cell.entry.id, {
      completion_pct: pct,
      status: pct >= 100 ? 'done' : 'planned',
    })

  const setHabitPct = (row, cell, pct) =>
    saveHabitLog({
      template_id: row.templateId,
      date: cell.date,
      completion_pct: pct,
      note: cell.log?.note ?? null,
    })

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
        {/* 平时切到某一周会自动按模板生成，这个按钮只在真的还有东西可补时才出现
            （刚建完模板、或者在看过去的周 —— 那里故意不自动回填） */}
        {pendingCount > 0 && (
          <button onClick={generateWeek} title={`按模板补 ${pendingCount} 条还没生成的安排`}>
            按模板补 {pendingCount} 条
          </button>
        )}
      </div>

      <div className="week-top">
        <WeeklyFocusPanel focus={focus} onSave={saveFocus} />
        <MiniCalendar monday={monday} onPick={goToDate} onOpenDay={onOpenDay} />
      </div>

      {/* 顺序：待办 -> 时间轴 -> 习惯 */}
      <WeekProgressGrid
        title="To do"
        rows={todoRows}
        days={days}
        emptyStyle="zero"
        onSetPct={setTodoPct}
        hint="点一下在 100 / 50 / 0 之间循环。红色 = 那天有任务还没做。"
        emptyText="这周没有待办。在「设置」里建一个待办模板，或者在某一天里加一条不填时间的安排。"
      />

      <WeekTimeline
        days={days}
        entries={entries}
        templates={templates}
        specialDays={specialDays}
        onOpenDay={onOpenDay}
      />

      <WeekProgressGrid
        title="Habits"
        rows={habitRows}
        days={days}
        emptyStyle="blank"
        onSetPct={setHabitPct}
        hint="点一下在 100 / 50 / 0 之间循环。空白 = 还没打卡。"
        emptyText="还没有习惯。在「设置」里建一个习惯模板（比如运动、早睡），它会每天重复。"
      />
    </div>
  )
}
