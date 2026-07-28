import { useState } from 'react'
import { combineDateTime, formatTime } from '../lib/dates'

/**
 * 新建 / 改一条日程。改时间就是 reschedule：
 * 记下原计划时间到 rescheduled_from，状态置为 rescheduled。
 */
export default function EntryEditor({ entry, date, onSave, onDelete, onClose }) {
  const isNew = !entry
  const [title, setTitle] = useState(entry?.title ?? '')
  const [start, setStart] = useState(formatTime(entry?.planned_start))
  const [end, setEnd] = useState(formatTime(entry?.planned_end))

  function submit(e) {
    e.preventDefault()
    if (!title.trim()) return

    const planned_start = combineDateTime(date, start)
    const planned_end = combineDateTime(date, end)

    if (isNew) {
      onSave({
        template_id: null,
        date,
        title: title.trim(),
        planned_start,
        planned_end,
        actual_start: null,
        actual_end: null,
        status: 'planned',
        rescheduled_from: null,
      })
      return
    }

    const moved = planned_start !== entry.planned_start
    onSave({
      title: title.trim(),
      planned_start,
      planned_end,
      ...(moved && entry.planned_start
        ? {
            rescheduled_from: entry.rescheduled_from ?? entry.planned_start,
            status: entry.status === 'done' ? entry.status : 'rescheduled',
          }
        : {}),
    })
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="card modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h2>{isNew ? '新增一条安排' : '修改安排'}</h2>

        <label htmlFor="entry-title">标题</label>
        <input
          id="entry-title"
          value={title}
          autoFocus
          onChange={(e) => setTitle(e.target.value)}
          placeholder="做什么"
        />

        <div className="field-row">
          <div>
            <label htmlFor="entry-start">开始</label>
            <input
              id="entry-start"
              type="time"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="entry-end">结束</label>
            <input
              id="entry-end"
              type="time"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </div>
        </div>
        <p className="muted small">留空表示时间灵活，会放在时间轴上方的「待安排」里。</p>

        {entry?.rescheduled_from && (
          <p className="muted small">
            原计划 {formatTime(entry.rescheduled_from)}，已改期。
          </p>
        )}

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
