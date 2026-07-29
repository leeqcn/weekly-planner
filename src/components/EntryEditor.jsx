import { useState } from 'react'
import { combineDateTime, minutesOfDay } from '../lib/dates'
import { formatClock } from '../lib/time'
import TimeFields from './TimeFields'
import DayStrip from './DayStrip'

const empty = { start: null, end: null, duration: null }

function toGroup(startIso, endIso) {
  if (!startIso || !endIso) return { ...empty }
  const start = minutesOfDay(startIso)
  const endRaw = minutesOfDay(endIso)
  // 结束落到第二天 0 点时按 24:00 算
  const end = endRaw === 0 && start > 0 ? 1440 : endRaw
  return { start, end, duration: Math.max(0, end - start) }
}

const toIso = (date, minutes) =>
  minutes === null || minutes === undefined
    ? null
    : combineDateTime(date, formatClock(minutes === 1440 ? 1439 : minutes))

/**
 * 新建 / 修改一条安排。计划和实际分成两块单独填 ——
 * 之前只有一组时间输入，在「实际」那栏点开改时间，改的其实是计划。
 */
export default function EntryEditor({
  entry,
  actualOnly,
  date,
  dayEntries,
  onSave,
  onDelete,
  onClose,
}) {
  const isNew = !entry
  const [title, setTitle] = useState(entry?.title ?? '')
  const [minDur, setMinDur] = useState(entry?.min_duration_minutes ?? '')
  const [maxDur, setMaxDur] = useState(entry?.max_duration_minutes ?? '')
  const [plan, setPlan] = useState(() => toGroup(entry?.planned_start, entry?.planned_end))
  const [actual, setActual] = useState(() =>
    toGroup(entry?.actual_start, entry?.actual_end),
  )

  function submit(event) {
    event.preventDefault()
    if (!title.trim()) return

    const planned_start = toIso(date, plan.start)
    const planned_end = toIso(date, plan.end)
    const actual_start = toIso(date, actual.start)
    const actual_end = toIso(date, actual.end)
    const didIt = Boolean(actual_start && actual_end)

    const num = (v) => (v === '' || v === null ? null : Number(v))
    const durations = {
      min_duration_minutes: num(minDur),
      max_duration_minutes: num(maxDur),
    }

    if (isNew) {
      onSave({
        template_id: null,
        date,
        title: title.trim(),
        planned_start,
        planned_end,
        actual_start,
        actual_end,
        ...durations,
        status: didIt ? 'done' : 'planned',
        rescheduled_from: null,
      })
      return
    }

    const moved = planned_start !== entry.planned_start && entry.planned_start
    onSave({
      title: title.trim(),
      planned_start,
      planned_end,
      actual_start,
      actual_end,
      ...durations,
      status: didIt
        ? 'done'
        : entry.status === 'skipped'
          ? 'skipped'
          : moved
            ? 'rescheduled'
            : 'planned',
      ...(moved ? { rescheduled_from: entry.rescheduled_from ?? entry.planned_start } : {}),
    })
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="card modal wide" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h2>{actualOnly ? '记录实际做了什么' : isNew ? '新增一条安排' : '修改安排'}</h2>
        {actualOnly && (
          <p className="muted small">
            没排过计划、但确实做了的事 —— 只填「实际」就行，左边计划栏会留空。
          </p>
        )}

        <label htmlFor="entry-title">标题</label>
        <input
          id="entry-title"
          value={title}
          autoFocus
          onChange={(e) => setTitle(e.target.value)}
          placeholder="做什么"
        />

        <div className="editor-body">
          <div className="editor-fields">
            {!actualOnly && (
              <TimeFields
                id="plan"
                label="计划"
                value={plan}
                onChange={setPlan}
                hint="三个都留空就是一条待办，可以之后再「排入」时间轴。"
              />
            )}

            <fieldset className="time-fields">
              <legend>预计时长</legend>
              <div className="time-row">
                <div>
                  <label htmlFor="dur-min">最短（分钟）</label>
                  <input
                    id="dur-min"
                    inputMode="numeric"
                    value={minDur}
                    placeholder="30"
                    onChange={(e) => setMinDur(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="dur-max">最长（分钟）</label>
                  <input
                    id="dur-max"
                    inputMode="numeric"
                    value={maxDur}
                    placeholder="60"
                    onChange={(e) => setMaxDur(e.target.value)}
                  />
                </div>
              </div>
              <p className="muted small">
                「排入」按上限找空档。两个填不一样（比如购物 30–60）时，
                块会画成半透明，表示还没定死。
              </p>
            </fieldset>
            <TimeFields id="actual" label="实际" value={actual} onChange={setActual} />
            {(plan.start !== null || actual.start !== null) && (
              <button
                type="button"
                className="ghost small-btn"
                onClick={() => {
                  setPlan({ ...empty })
                  setActual({ ...empty })
                }}
              >
                清空时间（变成待办）
              </button>
            )}
            {entry?.rescheduled_from && (
              <p className="muted small">
                原计划 {formatClock(minutesOfDay(entry.rescheduled_from))}，已改期。
              </p>
            )}
          </div>

          <DayStrip
            entries={dayEntries ?? []}
            editingId={entry?.id}
            draft={{ start: plan.start, end: plan.end }}
          />
        </div>

        <div className="modal-actions">
          {!isNew && (
            <button type="button" className="danger" onClick={onDelete}>
              删除
            </button>
          )}
          <span className="spacer" />
          <button type="button" className="ghost" onClick={onClose}>
            取消
          </button>
          <button type="submit" className="primary">
            保存
          </button>
        </div>
      </form>
    </div>
  )
}
