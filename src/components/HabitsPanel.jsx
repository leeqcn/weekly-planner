import { useEffect, useState } from 'react'
import { habitStatus } from '../lib/habits'

/** 时间轴下方的打卡区：一行一个 habit。 */
export default function HabitsPanel({ habits, logs, date, onSave }) {
  const [draft, setDraft] = useState({})

  useEffect(() => {
    const next = {}
    for (const h of habits) {
      const log = logs.find((l) => l.template_id === h.id && l.date === date)
      next[h.id] = { pct: log?.completion_pct ?? 0, note: log?.note ?? '' }
    }
    setDraft(next)
  }, [habits, logs, date])

  if (!habits.length) {
    return (
      <section className="card">
        <h2>打卡</h2>
        <p className="muted">这天没有需要打卡的习惯。可以在「设置」里加一个 habit 模板。</p>
      </section>
    )
  }

  const set = (id, patch) =>
    setDraft((d) => ({ ...d, [id]: { ...d[id], ...patch } }))

  const commit = (id) => {
    const row = draft[id]
    if (!row) return
    const pct = Math.max(0, Math.min(100, Number(row.pct) || 0))
    onSave({
      template_id: id,
      date,
      completion_pct: pct,
      note: row.note?.trim() || null,
    })
  }

  return (
    <section className="card">
      <h2>打卡</h2>
      <div className="table-scroll">
      <table className="habits-table">
        <thead>
          <tr>
            <th>习惯</th>
            <th>完成度</th>
            <th>状态</th>
            <th>备注</th>
          </tr>
        </thead>
        <tbody>
          {habits.map((h) => {
            const row = draft[h.id] ?? { pct: 0, note: '' }
            const status = habitStatus(row.pct)
            return (
              <tr key={h.id}>
                <td className="habit-name">{h.title}</td>
                <td>
                  <div className="pct-cell">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="10"
                      value={row.pct}
                      onChange={(e) => set(h.id, { pct: e.target.value })}
                      onMouseUp={() => commit(h.id)}
                      onKeyUp={() => commit(h.id)}
                      onTouchEnd={() => commit(h.id)}
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
                    placeholder="今天的一句话…"
                    onChange={(e) => set(h.id, { note: e.target.value })}
                    onBlur={() => commit(h.id)}
                  />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      </div>
    </section>
  )
}
