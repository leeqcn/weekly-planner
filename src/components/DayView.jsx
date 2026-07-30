import { useCallback, useState } from 'react'
import { format, isSameDay } from 'date-fns'
import { dateKey, minutesOfDay, weekdayLabel } from '../lib/dates'
import { layoutBlocks } from '../lib/layout'
import { blockState, describeRange, habitsOfDay, isScheduled, todosOfDay } from '../lib/schedule'
import { anchorFor, findSlot, minutesToIso, placementMinutes } from '../lib/place'
import { formatClock } from '../lib/time'
import { colorOf } from '../lib/colors'
import EntryEditor from './EntryEditor'
import ProgressTable from './ProgressTable'
import { useDragBlock } from './useDragBlock'

// 完整 24 小时一次画完，不在卡片里再套滚动
const HOUR_PX = 44
const HOURS = Array.from({ length: 24 }, (_, i) => i)
/** 块矮于这个高度就只显示标题，不显示时间 —— 内容比时间重要。 */
const TIME_VISIBLE_PX = 34

export default function DayView({ planner, date, onBack }) {
  const key = dateKey(date)
  const now = new Date()
  const [picked, setPicked] = useState([]) // 选中的块，可多选
  const [editing, setEditing] = useState(null)
  const [cascade, setCascade] = useState(true) // 拖一个块，后面的跟着顺延

  const dayEntries = planner.entries.filter((e) => e.date === key)
  const planned = dayEntries.filter(isScheduled)
  const todos = todosOfDay(dayEntries, key)
  const actual = dayEntries.filter((e) => e.actual_start && e.actual_end)
  const habits = habitsOfDay(planner.templates, date)
  const special = planner.specialDays.find((s) => s.date === key)

  const isPicked = (id) => picked.includes(id)
  const togglePick = (id) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))

  /** 松手：一次拖动可能动了好几个块，合成一步撤销。 */
  const commitDrag = useCallback(
    (changed, mode) => {
      const updates = changed.map((m) => {
        if (m.field === 'actual') {
          return {
            id: m.id,
            patch: {
              actual_start: minutesToIso(key, m.startMin),
              actual_end: minutesToIso(key, m.endMin),
            },
          }
        }
        const length = m.endMin - m.startMin
        return {
          id: m.id,
          patch: {
            planned_start: minutesToIso(key, m.startMin),
            planned_end: minutesToIso(key, m.endMin),
            // 手动拉过长短 = 自己定了时长，区间收敛成定值（块随之变实心）
            ...(mode === 'resize'
              ? { min_duration_minutes: length, max_duration_minutes: length }
              : {}),
          },
        }
      })
      const verb = mode === 'resize' ? '调整时长' : '拖动'
      planner.updateEntries(
        updates,
        changed.length > 1 ? `${verb} ${changed.length} 项` : verb,
      )
    },
    [planner, key],
  )

  const drag = useDragBlock({
    hourPx: HOUR_PX,
    onCommit: commitDrag,
    onLongPress: (id) => setEditing({ entry: dayEntries.find((e) => e.id === id) }),
  })

  /** 一次拖动要带动哪些块。 */
  function membersFor(entry, field, mode) {
    const source = field === 'actual' ? actual : planned
    const at = (e) => ({
      id: e.id,
      field,
      startMin: minutesOfDay(field === 'actual' ? e.actual_start : e.planned_start),
      endMin:
        minutesOfDay(field === 'actual' ? e.actual_end : e.planned_end) ||
        (minutesOfDay(field === 'actual' ? e.actual_start : e.planned_start) > 0 ? 1440 : 0),
    })
    const self = at(entry)

    // 选了好几个就一起动，被抓住的那个排第一
    const multi = source.filter((e) => isPicked(e.id))
    if (multi.length > 1 && isPicked(entry.id)) {
      return [self, ...multi.filter((e) => e.id !== entry.id).map(at)]
    }
    // 顺延：只拖一个的时候，它之后的块跟着挪同样的量
    if (cascade && mode === 'move') {
      const later = source
        .map(at)
        .filter((m) => m.id !== self.id && m.startMin >= self.startMin)
        .sort((a, b) => a.startMin - b.startMin)
      return [self, ...later]
    }
    return [self]
  }

  function markDone(entry) {
    const stamp = new Date().toISOString()
    planner.updateEntry(entry.id, {
      status: 'done',
      actual_start: entry.actual_start ?? entry.planned_start ?? stamp,
      actual_end: entry.actual_end ?? entry.planned_end ?? stamp,
    })
  }

  function undoDone(entry) {
    planner.updateEntry(entry.id, { status: 'planned', actual_start: null, actual_end: null })
  }

  const saveTodo = (id, { pct, note }) =>
    planner.updateEntry(id, {
      completion_pct: pct,
      note,
      status: pct >= 100 ? 'done' : 'planned',
    })

  const saveHabit = (templateId, { pct, note }) =>
    planner.saveHabitLog({ template_id: templateId, date: key, completion_pct: pct, note })

  /** 待办排进时间轴：自动找第一个装得下的空档，装不下也照排、标红。 */
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

  async function saveEditor(payload) {
    if (editing?.entry) await planner.updateEntry(editing.entry.id, payload)
    else await planner.addEntry(payload)
    setEditing(null)
  }

  async function removeEntry(entry) {
    await planner.deleteEntry(entry.id)
    setPicked((p) => p.filter((x) => x !== entry.id))
    setEditing(null)
  }

  // 拖动中的块按临时位置参与冲突判断，松手之前就能看到变红
  const live = (list, field) =>
    list.map((e) => {
      const o = drag.overlay(e.id)
      if (!o) return e
      return field === 'actual'
        ? {
            ...e,
            actual_start: minutesToIso(key, o.startMin),
            actual_end: minutesToIso(key, o.endMin),
          }
        : {
            ...e,
            planned_start: minutesToIso(key, o.startMin),
            planned_end: minutesToIso(key, o.endMin),
          }
    })
  const livePlanned = live(planned, 'planned')

  const plannedLayout = layoutBlocks(
    planned.map((e) => ({ entry: e, start: e.planned_start, end: e.planned_end })),
  )
  const actualLayout = layoutBlocks(
    actual.map((e) => ({ entry: e, start: e.actual_start, end: e.actual_end })),
  )

  const renderBlock = (b, field) => {
    const entry = b.entry
    return (
      <EntryBlock
        key={entry.id}
        block={b}
        field={field}
        state={
          field === 'actual'
            ? 'solid'
            : blockState(livePlanned.find((e) => e.id === entry.id) ?? entry, livePlanned)
        }
        overlay={drag.overlay(entry.id)}
        faded={field === 'planned' && (entry.status === 'done' || entry.status === 'skipped')}
        picked={isPicked(entry.id)}
        onClick={() => togglePick(entry.id)}
        onDoubleClick={() => (field === 'actual' ? undoDone(entry) : markDone(entry))}
        onGrip={(event, mode) =>
          drag.begin(event, { mode, members: membersFor(entry, field, mode) })
        }
      />
    )
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

      {picked.length > 0 && (
        <div className="action-bar">
          <span className="selected-title">
            {picked.length === 1
              ? dayEntries.find((e) => e.id === picked[0])?.title
              : `选中 ${picked.length} 项`}
          </span>
          <span className="muted small">拖任一块的把手可以一起挪</span>
          <span className="spacer" />
          {picked.length === 1 && (
            <>
              <button onClick={() => setEditing({ entry: dayEntries.find((e) => e.id === picked[0]) })}>
                编辑
              </button>
              <button
                className="danger"
                onClick={() => removeEntry(dayEntries.find((e) => e.id === picked[0]))}
              >
                删除
              </button>
            </>
          )}
          <button className="ghost" onClick={() => setPicked([])}>取消选中</button>
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
          keep: e.keep_in_todo,
          scheduled: isScheduled(e),
          color: e.color,
        }))}
        onSave={saveTodo}
        onOpen={(id) => setEditing({ entry: todos.find((e) => e.id === id) })}
        onPlace={(id) => placeTodo(todos.find((e) => e.id === id))}
        onToggleKeep={(id, keep) =>
          planner.updateEntry(id, { keep_in_todo: keep }, keep ? '保留在待办' : '排入后移出待办')
        }
        emptyText="今天没有待办。"
      />

      <section className="card timeline-card">
        <div className="card-head">
          <h2>Time schedule</h2>
          <label className="inline-check">
            <input
              type="checkbox"
              checked={cascade}
              onChange={(e) => setCascade(e.target.checked)}
            />
            拖一个，后面的跟着顺延
          </label>
        </div>
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
            {plannedLayout.map((b) => renderBlock(b, 'planned'))}
          </div>

          <div className="timeline-axis">
            {HOURS.map((h) => (
              <div className="hour" key={h} style={{ height: HOUR_PX }}>
                <span>{String(h).padStart(2, '0')}</span>
              </div>
            ))}
          </div>

          <div className="timeline-col actually">
            {actualLayout.map((b) => renderBlock(b, 'actual'))}
          </div>
        </div>
        <p className="muted small">
          拖块左边的竖条挪时间，拖底边改时长。<b>长按</b>打开编辑，单击选中
          （可以点好几个一起拖），双击计划块 = 完成、双击右边的块 = 撤销。
          <b>半透明</b>是时长还没定死，<b>红色</b>是撞车。
        </p>
      </section>

      <ProgressTable
        title="Habits"
        rows={habits.map((h) => {
          const log = planner.habitLogs.find((l) => l.template_id === h.id && l.date === key)
          return {
            id: h.id,
            title: h.title,
            pct: log ? log.completion_pct : null,
            note: log?.note,
            color: h.color,
          }
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
  picked,
  onClick,
  onDoubleClick,
  onGrip,
}) {
  const { entry } = block
  // 拖动中用本地的临时时间画，松手才写库
  const startMin = overlay ? overlay.startMin : minutesOfDay(block.start)
  const endMin = overlay
    ? overlay.endMin
    : minutesOfDay(block.end) || (minutesOfDay(block.start) > 0 ? 1440 : 0)
  const height = Math.max(26, ((endMin - startMin) / 60) * HOUR_PX)
  const width = 100 / block.lanes
  const range = describeRange(entry)
  const tint = colorOf(entry.color)

  return (
    <div
      className={[
        'entry-block',
        `state-${state}`,
        `status-${entry.status}`,
        faded ? 'faded' : '',
        picked ? 'picked' : '',
        overlay ? 'dragging' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        top: (startMin / 60) * HOUR_PX,
        height,
        left: `calc(${block.lane * width}% + 4px)`,
        width: `calc(${width}% - 8px)`,
        // 撞车时统一用红底，颜色让位给警告
        ...(state === 'conflict' ? {} : { background: tint.block, borderColor: tint.edge }),
      }}
    >
      <span
        className="block-grip"
        title="拖我挪时间"
        onPointerDown={(e) => onGrip(e, 'move')}
      />
      <button className="block-body" onClick={onClick} onDoubleClick={onDoubleClick}>
        <span className="entry-title">{entry.title}</span>
        {/* 放不下就只留标题 —— 内容比时间重要 */}
        {height >= TIME_VISIBLE_PX && (
          <span className="entry-time">
            {formatClock(startMin % 1440)}–{formatClock(endMin % 1440)}
            {range && state === 'loose' ? ` · ${range}` : ''}
          </span>
        )}
      </button>
      <span
        className="block-resize"
        title="拖我改时长"
        onPointerDown={(e) => onGrip(e, 'resize')}
      />
    </div>
  )
}
