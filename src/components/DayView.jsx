import { useCallback, useState } from 'react'
import { format, isSameDay } from 'date-fns'
import { dateKey, formatTime, minutesOfDay, weekdayLabel } from '../lib/dates'
import { layoutBlocks } from '../lib/layout'
import {
  blockState,
  describeRange,
  habitsOfDay,
  isScheduled,
  todosOfDay,
} from '../lib/schedule'
import { anchorFor, findSlot, minutesToIso, placementMinutes } from '../lib/place'
import { formatClock } from '../lib/time'
import EntryEditor from './EntryEditor'
import ProgressTable from './ProgressTable'
import { useDragBlock } from './useDragBlock'

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
  // 从全部条目里取，不是从 planned 里取 ——
  // 「只记实际」的条目没有计划时间，从 planned 里挑永远挑不到它
  const actual = dayEntries.filter((e) => e.actual_start && e.actual_end)
  const habits = habitsOfDay(planner.templates, date)
  const special = planner.specialDays.find((s) => s.date === key)
  const selected = dayEntries.find((e) => e.id === selectedId) ?? null

  /** 拖完松手才写库。允许拖过 24 点，落到第二天的时间照样存。 */
  const commitDrag = useCallback(
    (id, startMin, endMin) => {
      const entry = planner.entries.find((e) => e.id === id)
      if (!entry) return
      const length = endMin - startMin
      const resized = length !== minutesOfDay(entry.planned_end) - minutesOfDay(entry.planned_start)
      planner.updateEntry(
        id,
        {
          planned_start: minutesToIso(key, startMin),
          planned_end: minutesToIso(key, endMin),
          // 手动拉过长短 = 你自己定了时长，区间就不再是区间（于是画成实心）
          ...(resized ? { min_duration_minutes: length, max_duration_minutes: length } : {}),
        },
        `${resized ? '调整' : '拖动'}「${entry.title}」`,
      )
    },
    [planner, key],
  )

  const drag = useDragBlock({ hourPx: HOUR_PX, onCommit: commitDrag })

  /** 待办排进时间轴：自动找第一个装得下的空档，装不下也照排，标红自己调。 */
  function placeTodo(entry) {
    const minutes = placementMinutes(entry)
    const at = findSlot(planned, minutes, { anchor: anchorFor(key) })
    planner.updateEntry(
      entry.id,
      {
        planned_start: minutesToIso(key, at),
        planned_end: minutesToIso(key, at + minutes),
      },
      `排入「${entry.title}」`,
    )
  }

  // 拖动中的块按临时位置参与冲突判断，这样松手之前就能看到变红
  const livePlanned = planned.map((e) => {
    const o = drag.overlay(e.id)
    return o
      ? {
          ...e,
          planned_start: minutesToIso(key, o.startMin),
          planned_end: minutesToIso(key, o.endMin),
        }
      : e
  })

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

  const saveTodo = (id, { pct, note }) =>
    planner.updateEntry(id, {
      completion_pct: pct,
      note,
      status: pct >= 100 ? 'done' : 'planned',
    })

  const saveHabit = (templateId, { pct, note }) =>
    planner.saveHabitLog({
      template_id: templateId,
      date: key,
      completion_pct: pct,
      note,
    })

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
      <ProgressTable
        title="To do"
        rows={todos.map((e) => ({
          id: e.id,
          title: e.title,
          pct: e.completion_pct ?? 0,
          note: e.note,
          duration: describeRange(e),
        }))}
        onSave={saveTodo}
        onOpen={(id) => setEditing({ entry: todos.find((e) => e.id === id) })}
        onPlace={(id) => placeTodo(todos.find((e) => e.id === id))}
        emptyText="今天没有待办。"
      />

      <section className="card timeline-card">
        <h2>Time schedule</h2>
        <div className="timeline-head">
          <span>Plan</span>
          <span />
          <span className="row-gap actually-head">
            Actually
            <button
              className="ghost small-btn"
              onClick={() => setEditing({ entry: null, actualOnly: true })}
              title="记一件没排过计划、但确实做了的事"
            >
              ＋ 只记实际
            </button>
          </span>
        </div>
        <div
          className={`timeline${drag.isDragging ? ' dragging' : ''}`}
          style={{ height: 24 * HOUR_PX, '--hour-px': `${HOUR_PX}px` }}
          {...drag.handlers}
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
                state={blockState(
                  livePlanned.find((e) => e.id === b.entry.id) ?? b.entry,
                  livePlanned,
                )}
                overlay={drag.overlay(b.entry.id)}
                faded={b.entry.status === 'done' || b.entry.status === 'skipped'}
                selected={selectedId === b.entry.id}
                onClick={() => setSelectedId(b.entry.id)}
                onDoubleClick={() => markDone(b.entry)}
                onGrip={drag.begin}
                hint="双击 = 完成，左边竖条拖动，底边拉长短"
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
                state="solid"
                selected={selectedId === b.entry.id}
                onClick={() => setSelectedId(b.entry.id)}
                onDoubleClick={() => undo(b.entry)}
                hint="双击 = 撤销完成"
              />
            ))}
          </div>
        </div>
        <p className="muted small">
          拖块左边的竖条挪时间，拖底边改时长。双击计划块 = 完成（搬到右边），
          双击右边的块 = 撤销。<b>半透明</b>表示时长还是个区间或者和别的块撞了，
          <b>红色</b>是撞车 —— 拖开就行。
        </p>
      </section>

      <ProgressTable
        title="Habits"
        rows={habits.map((h) => {
          const log = planner.habitLogs.find(
            (l) => l.template_id === h.id && l.date === key,
          )
          // null = 今天还没打卡，状态列显示「—」而不是红色
          return { id: h.id, title: h.title, pct: log ? log.completion_pct : null, note: log?.note }
        })}
        onSave={saveHabit}
        emptyText="今天没有需要打卡的习惯。"
      />

      {editing && (
        <EntryEditor
          entry={editing.entry}
          actualOnly={editing.actualOnly}
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

function EntryBlock({
  block,
  state = 'solid',
  overlay,
  faded,
  selected,
  onClick,
  onDoubleClick,
  onGrip,
  hint,
}) {
  const { entry } = block
  // 拖动中用本地的临时时间画，松手才写库
  const startMin = overlay ? overlay.startMin : minutesOfDay(block.start)
  const endMin = overlay
    ? overlay.endMin
    : minutesOfDay(block.end) || (minutesOfDay(block.start) > 0 ? 1440 : 0)
  const width = 100 / block.lanes
  const range = describeRange(entry)

  return (
    <div
      className={[
        'entry-block',
        `state-${state}`,
        `status-${entry.status}`,
        faded ? 'faded' : '',
        selected ? 'selected' : '',
        overlay ? 'dragging' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        top: (startMin / 60) * HOUR_PX,
        height: Math.max(26, ((endMin - startMin) / 60) * HOUR_PX),
        left: `calc(${block.lane * width}% + 4px)`,
        width: `calc(${width}% - 8px)`,
      }}
      title={`${entry.title}（${hint}）`}
    >
      {onGrip && (
        <span
          className="block-grip"
          title="拖我挪时间"
          onPointerDown={(e) => onGrip(e, { id: entry.id, mode: 'move', startMin, endMin })}
        />
      )}
      <button className="block-body" onClick={onClick} onDoubleClick={onDoubleClick}>
        <span className="entry-title">{entry.title}</span>
        <span className="entry-time">
          {formatClock(startMin % 1440)}–{formatClock(endMin % 1440)}
          {range && state === 'loose' ? ` · ${range}` : ''}
        </span>
      </button>
      {onGrip && (
        <span
          className="block-resize"
          title="拖我改时长"
          onPointerDown={(e) => onGrip(e, { id: entry.id, mode: 'resize', startMin, endMin })}
        />
      )}
    </div>
  )
}
