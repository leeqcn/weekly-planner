import { useEffect, useRef, useState } from 'react'
import { format, isSameDay } from 'date-fns'
import { dateKey, formatTime, minutesOfDay, weekdayLabel } from '../lib/dates'
import { habitsForDay } from '../lib/generate'
import { layoutBlocks } from '../lib/layout'
import EntryEditor from './EntryEditor'
import HabitsPanel from './HabitsPanel'

const HOUR_PX = 46
const HOURS = Array.from({ length: 24 }, (_, i) => i)

export default function DayView({ planner, date, onBack }) {
  const key = dateKey(date)
  const now = new Date()
  const scroller = useRef(null)
  const [selectedId, setSelectedId] = useState(null)
  const [editing, setEditing] = useState(null) // {entry} | {entry: null} | null

  const dayEntries = planner.entries.filter((e) => e.date === key)
  const planned = dayEntries.filter((e) => e.planned_start && e.planned_end)
  const untimed = dayEntries.filter((e) => !e.planned_start || !e.planned_end)
  const actual = dayEntries.filter((e) => e.actual_start && e.actual_end)
  const plannedLayout = layoutBlocks(
    planned.map((e) => ({ entry: e, start: e.planned_start, end: e.planned_end })),
  )
  const actualLayout = layoutBlocks(
    actual.map((e) => ({ entry: e, start: e.actual_start, end: e.actual_end })),
  )
  const habits = habitsForDay(planner.templates, date)
  const special = planner.specialDays.find((s) => s.date === key)
  const selected = dayEntries.find((e) => e.id === selectedId) ?? null

  // 默认滚到早上 7 点，省得每次手动往下拖。
  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = 7 * HOUR_PX
  }, [key])

  function markDone(entry) {
    // 没有计划时间的任务（弹性 task），完成时就按当前时间记一小段。
    const stamp = new Date().toISOString()
    planner.updateEntry(entry.id, {
      status: 'done',
      actual_start: entry.actual_start ?? entry.planned_start ?? stamp,
      actual_end: entry.actual_end ?? entry.planned_end ?? stamp,
    })
  }

  function markSkipped(entry) {
    planner.updateEntry(entry.id, {
      status: 'skipped',
      actual_start: null,
      actual_end: null,
    })
  }

  function reopen(entry) {
    planner.updateEntry(entry.id, {
      status: 'planned',
      actual_start: null,
      actual_end: null,
    })
  }

  async function saveEditor(payload) {
    if (editing?.entry) await planner.updateEntry(editing.entry.id, payload)
    else await planner.addEntry(payload)
    setEditing(null)
  }

  async function removeEntry(entry) {
    await planner.deleteEntry(entry.id)
    setSelectedId(null)
    setEditing(null)
  }

  return (
    <div className="day-view">
      <div className="day-head">
        <div className="row-gap">
          <button className="ghost" onClick={onBack}>
            ‹ 回到周视图
          </button>
          <h1>
            {format(date, 'M 月 d 日')} <span className="muted">{weekdayLabel(date)}</span>
          </h1>
          {special && <span className="special-badge">{special.label}</span>}
        </div>
        <div className="row-gap">
          <input
            className="special-input"
            placeholder="标记特殊日（如 专注学习）"
            defaultValue={special?.label ?? ''}
            key={special?.label ?? key}
            onBlur={(e) => {
              const label = e.target.value.trim()
              if (label !== (special?.label ?? '')) planner.setSpecialDay(key, label)
            }}
          />
          <button className="primary" onClick={() => setEditing({ entry: null })}>
            ＋ 新增
          </button>
        </div>
      </div>

      {selected && (
        <div className="action-bar">
          <span className="selected-title">{selected.title}</span>
          <span className="muted small">
            {selected.planned_start
              ? `${formatTime(selected.planned_start)}–${formatTime(selected.planned_end)}`
              : '待安排'}
          </span>
          <span className="spacer" />
          {selected.status === 'done' ? (
            <button onClick={() => reopen(selected)}>撤销完成</button>
          ) : (
            <button onClick={() => markDone(selected)}>标记完成</button>
          )}
          <button onClick={() => markSkipped(selected)}>跳过</button>
          <button onClick={() => setEditing({ entry: selected })}>改时间</button>
          <button className="danger" onClick={() => removeEntry(selected)}>
            删除
          </button>
          <button className="ghost" onClick={() => setSelectedId(null)}>
            ✕
          </button>
        </div>
      )}

      {untimed.length > 0 && (
        <div className="untimed">
          <span className="untimed-label">待安排</span>
          {untimed.map((e) => (
            <button
              key={e.id}
              className={`chip status-${e.status}${selectedId === e.id ? ' selected' : ''}`}
              onClick={() => setSelectedId(e.id)}
            >
              {e.title}
            </button>
          ))}
        </div>
      )}

      <div className="card timeline-card">
        <div className="timeline-head">
          <span>Plan</span>
          <span />
          <span>Actually</span>
        </div>
        <div className="timeline-scroll" ref={scroller}>
          <div
            className="timeline"
            style={{ height: 24 * HOUR_PX, '--hour-px': `${HOUR_PX}px` }}
          >
            {isSameDay(date, now) && (
              <div
                className="now-line"
                style={{ top: (minutesOfDay(now.toISOString()) / 60) * HOUR_PX }}
              />
            )}

            <div className="timeline-col plan">
              {plannedLayout.map((b) => (
                <EntryBlock
                  key={b.entry.id}
                  entry={b.entry}
                  start={b.start}
                  end={b.end}
                  lane={b.lane}
                  lanes={b.lanes}
                  faded={
                    b.entry.status === 'done' || b.entry.status === 'skipped'
                  }
                  selected={selectedId === b.entry.id}
                  onClick={() => setSelectedId(b.entry.id)}
                />
              ))}
            </div>

            <div className="timeline-axis">
              {HOURS.map((h) => (
                <div className="hour" key={h} style={{ height: HOUR_PX }}>
                  <span>{String(h).padStart(2, '0')}</span>
                </div>
              ))}
            </div>

            <div className="timeline-col actually">
              {actualLayout.map((b) => (
                <EntryBlock
                  key={b.entry.id}
                  entry={b.entry}
                  start={b.start}
                  end={b.end}
                  lane={b.lane}
                  lanes={b.lanes}
                  selected={selectedId === b.entry.id}
                  onClick={() => setSelectedId(b.entry.id)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <HabitsPanel
        habits={habits}
        logs={planner.habitLogs}
        date={key}
        onSave={planner.saveHabitLog}
      />

      {editing && (
        <EntryEditor
          entry={editing.entry}
          date={key}
          onSave={saveEditor}
          onDelete={() => removeEntry(editing.entry)}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}

function EntryBlock({ entry, start, end, lane, lanes, faded, selected, onClick }) {
  const top = (minutesOfDay(start) / 60) * HOUR_PX
  const minutes = Math.max(15, (new Date(end) - new Date(start)) / 60000)
  const height = Math.max(26, (minutes / 60) * HOUR_PX)
  // 同一时段重叠的块并排放
  const width = 100 / lanes

  return (
    <button
      className={[
        'entry-block',
        `status-${entry.status}`,
        faded ? 'faded' : '',
        selected ? 'selected' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        top,
        height,
        left: `calc(${lane * width}% + 4px)`,
        width: `calc(${width}% - 8px)`,
      }}
      onClick={onClick}
    >
      <span className="entry-title">{entry.title}</span>
      <span className="entry-time">
        {formatTime(start)}–{formatTime(end)}
      </span>
    </button>
  )
}
