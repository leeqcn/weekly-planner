import { useState } from 'react'
import { format, isSameDay } from 'date-fns'
import { dateKey, formatTime, minutesOfDay, weekdayLabel } from '../lib/dates'
import { layoutBlocks } from '../lib/layout'
import { habitsOfDay, isScheduled, todosOfDay } from '../lib/schedule'
import EntryEditor from './EntryEditor'
import HabitsPanel from './HabitsPanel'

// 完整 24 小时一次画完，不在卡片里再套滚动
const HOUR_PX = 44
const HOURS = Array.from({ length: 24 }, (_, i) => i)

export default function DayView({ planner, date, onBack }) {
  const key = dateKey(date)
  const now = new Date()
  const [selectedId, setSelectedId] = useState(null)
  const [editing, setEditing] = useState(null)

  const dayEntries = planner.entries.filter((e) => e.date === key)
  const planned = dayEntries.filter(isScheduled)
  const todos = todosOfDay(dayEntries, key)
  const actual = planned.filter((e) => e.actual_start && e.actual_end)
  const habits = habitsOfDay(planner.templates, date)
  const special = planner.specialDays.find((s) => s.date === key)
  const selected = dayEntries.find((e) => e.id === selectedId) ?? null

  const plannedLayout = layoutBlocks(
    planned.map((e) => ({ entry: e, start: e.planned_start, end: e.planned_end })),
  )
  const actualLayout = layoutBlocks(
    actual.map((e) => ({ entry: e, start: e.actual_start, end: e.actual_end })),
  )

  /** 双击计划块 = 做完了，实际时间照抄计划。 */
  function markDone(entry) {
    const stamp = new Date().toISOString()
    planner.updateEntry(entry.id, {
      status: 'done',
      actual_start: entry.planned_start ?? stamp,
      actual_end: entry.planned_end ?? stamp,
    })
  }

  /** 双击实际块 = 撤销完成。 */
  function undo(entry) {
    planner.updateEntry(entry.id, {
      status: 'planned',
      actual_start: null,
      actual_end: null,
    })
  }

  function toggleTodo(entry) {
    if (entry.status === 'done') undo(entry)
    else markDone(entry)
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
          <button className="ghost" onClick={onBack}>‹ 回到周视图</button>
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
            {isScheduled(selected)
              ? `${formatTime(selected.planned_start)}–${formatTime(selected.planned_end)}`
              : '待办'}
          </span>
          <span className="spacer" />
          {selected.status === 'done' ? (
            <button onClick={() => undo(selected)}>撤销完成</button>
          ) : (
            <button onClick={() => markDone(selected)}>标记完成</button>
          )}
          <button
            onClick={() =>
              planner.updateEntry(selected.id, {
                status: 'skipped',
                actual_start: null,
                actual_end: null,
              })
            }
          >
            跳过
          </button>
          <button onClick={() => setEditing({ entry: selected })}>改时间</button>
          <button className="danger" onClick={() => removeEntry(selected)}>删除</button>
          <button className="ghost" onClick={() => setSelectedId(null)}>✕</button>
        </div>
      )}

      {/* 顺序：待办 -> 时间轴 -> 习惯 */}
      <section className="card">
        <h2>To do</h2>
        {todos.length === 0 ? (
          <p className="muted">今天没有待办。</p>
        ) : (
          <ul className="todo-list">
            {todos.map((e) => (
              <li key={e.id}>
                <button
                  className={`todo-check${e.status === 'done' ? ' done' : ''}`}
                  onClick={() => toggleTodo(e)}
                  title={e.status === 'done' ? '点一下取消完成' : '点一下标记完成'}
                >
                  {e.status === 'done' ? '✓' : ''}
                </button>
                <button
                  className={`todo-title${e.status === 'done' ? ' done' : ''}`}
                  onClick={() => setSelectedId(e.id)}
                >
                  {e.title}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card timeline-card">
        <h2>Time schedule</h2>
        <div className="timeline-head">
          <span>Plan</span>
          <span />
          <span>Actually</span>
        </div>
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
                block={b}
                faded={b.entry.status === 'done' || b.entry.status === 'skipped'}
                selected={selectedId === b.entry.id}
                onClick={() => setSelectedId(b.entry.id)}
                onDoubleClick={() => markDone(b.entry)}
                hint="双击 = 完成"
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
                block={b}
                selected={selectedId === b.entry.id}
                onClick={() => setSelectedId(b.entry.id)}
                onDoubleClick={() => undo(b.entry)}
                hint="双击 = 撤销完成"
              />
            ))}
          </div>
        </div>
        <p className="muted small">
          双击左边的计划块就搬到右边（完成），双击右边的块撤销。单击是选中，可以改时间。
        </p>
      </section>

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
          dayEntries={dayEntries}
          onSave={saveEditor}
          onDelete={() => removeEntry(editing.entry)}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}

function EntryBlock({ block, faded, selected, onClick, onDoubleClick, hint }) {
  const { entry, start, end, lane, lanes } = block
  const top = (minutesOfDay(start) / 60) * HOUR_PX
  const minutes = Math.max(15, (new Date(end) - new Date(start)) / 60000)
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
        height: Math.max(26, (minutes / 60) * HOUR_PX),
        left: `calc(${lane * width}% + 4px)`,
        width: `calc(${width}% - 8px)`,
      }}
      title={`${entry.title}（${hint}）`}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
    >
      <span className="entry-title">{entry.title}</span>
      <span className="entry-time">
        {formatTime(start)}–{formatTime(end)}
      </span>
    </button>
  )
}
