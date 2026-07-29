import { useEffect, useState } from 'react'
import { habitStatus } from '../lib/habits'

/**
 * Day View 里 To do 和 Habits 共用的表格：一行一件事，
 * 完成度滑杆 + 状态色 + 备注。两块长得一样，不用记两套操作。
 *
 * rows: [{ id, title, pct, note }]
 * onOpen: 传了的话，标题可以点开去编辑（待办用）
 */
export default function ProgressTable({ title, rows, onSave, onOpen, emptyText }) {
  const [draft, setDraft] = useState({})

  useEffect(() => {
    setDraft(
      Object.fromEntries(rows.map((r) => [r.id, { pct: r.pct ?? 0, note: r.note ?? '' }])),
    )
  }, [rows])

  if (!rows.length) {
    return (
      <section className="card">
        <h2>{title}</h2>
        <p className="muted">{emptyText}</p>
      </section>
    )
  }

  const set = (id, patch) => setDraft((d) => ({ ...d, [id]: { ...d[id], ...patch } }))

  const commit = (id) => {
    const row = draft[id]
    if (!row) return
    onSave(id, {
      pct: Math.max(0, Math.min(100, Number(row.pct) || 0)),
      note: row.note?.trim() || null,
    })
  }

  return (
    <section className="card">
      <h2>{title}</h2>
      <div className="table-scroll">
        <table className="habits-table">
          <thead>
            <tr>
              <th>名称</th>
              <th>完成度</th>
              <th>状态</th>
              <th>备注</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const row = draft[r.id] ?? { pct: 0, note: '' }
              const status = habitStatus(row.pct)
              return (
                <tr key={r.id}>
                  <td className="habit-name">
                    {onOpen ? (
                      <button className="link-btn" onClick={() => onOpen(r.id)}>
                        {r.title}
                      </button>
                    ) : (
                      r.title
                    )}
                  </td>
                  <td>
                    <div className="pct-cell">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="10"
                        value={row.pct}
                        onChange={(e) => set(r.id, { pct: e.target.value })}
                        onMouseUp={() => commit(r.id)}
                        onKeyUp={() => commit(r.id)}
                        onTouchEnd={() => commit(r.id)}
                      />
                      <span className="pct-value">{row.pct}%</span>
                    </div>
                  </td>
                  <td>
                    <span className="status-pill" style={{ background: status.color }}>
                      {status.label}
                    </span>
                  </td>
                  <td>
                    <input
                      className="note-input"
                      value={row.note}
                      placeholder="一句话…"
                      onChange={(e) => set(r.id, { note: e.target.value })}
                      onBlur={() => commit(r.id)}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {onOpen && <p className="muted small">点名称可以改标题、加时间或删除。</p>}
    </section>
  )
}
