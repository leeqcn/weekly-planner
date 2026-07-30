import { useEffect, useState } from 'react'
import { habitStatus } from '../lib/habits'
import { colorOf } from '../lib/colors'

/**
 * Day View 里 To do 和 Habits 共用的表格：一行一件事，
 * 完成度滑杆 + 状态色 + 备注。两块长得一样，不用记两套操作。
 *
 * rows: [{ id, title, pct, note }]
 * onOpen: 传了的话，标题可以点开去编辑（待办用）
 */
export default function ProgressTable({
  title,
  rows,
  onSave,
  onOpen,
  onPlace,
  onToggleKeep,
  emptyText,
}) {
  const [draft, setDraft] = useState({})

  useEffect(() => {
    setDraft(
      Object.fromEntries(
        // pct 为 null = 还没打过卡。滑杆得有个数值，所以显示 0，
        // 但状态列留「—」而不是红色的 keep going —— 没打卡不等于没做好。
        rows.map((r) => [
          r.id,
          { pct: r.pct ?? 0, note: r.note ?? '', unlogged: r.pct === null },
        ]),
      ),
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

  const set = (id, patch) =>
    setDraft((d) => ({ ...d, [id]: { ...d[id], ...patch, unlogged: false } }))

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
              {onToggleKeep && (
                <th className="keep-col" title="勾上：排进时间轴后也留在这里">留</th>
              )}
              <th>名称</th>
              {onPlace && <th>时长</th>}
              <th>完成度</th>
              <th>状态</th>
              <th>备注</th>
              {onPlace && <th />}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const row = draft[r.id] ?? { pct: 0, note: '' }
              const status = row.unlogged ? null : habitStatus(row.pct)
              return (
                <tr key={r.id}>
                  {onToggleKeep && (
                    <td className="keep-col">
                      <input
                        type="checkbox"
                        checked={Boolean(r.keep)}
                        onChange={(e) => onToggleKeep(r.id, e.target.checked)}
                        title="勾上：排进时间轴后也留在待办列表里"
                      />
                    </td>
                  )}
                  <td className="habit-name">
                    <span
                      className="row-dot"
                      style={{ background: colorOf(r.color).dot }}
                      aria-hidden="true"
                    />
                    {onOpen ? (
                      <button className="link-btn" onClick={() => onOpen(r.id)}>
                        {r.title}
                      </button>
                    ) : (
                      r.title
                    )}
                  </td>
                  {onPlace && <td className="small dur-cell">{r.duration || '—'}</td>}
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
                    {status ? (
                      <span className="status-pill" style={{ background: status.color }}>
                        {status.label}
                      </span>
                    ) : (
                      <span className="muted">—</span>
                    )}
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
                  {onPlace && (
                    <td>
                      {r.scheduled ? (
                        <span className="muted small">已排</span>
                      ) : (
                        <button
                          className="place-btn"
                          onClick={() => onPlace(r.id)}
                          title="排进时间轴：自动找第一个装得下的空档"
                        >
                          排入 →
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {onOpen && (
        <p className="muted small">
          点名称可以改标题、时长或删除。
          {onPlace &&
            '「排入」会自动找第一个装得下的空档，排不下也会排上去并标红。勾上「留」，排进时间轴后也继续留在这张表里。'}
        </p>
      )}
    </section>
  )
}
