import { useEffect, useState } from 'react'
import { habitStatus } from '../lib/habits'
import { colorOf } from '../lib/colors'
import { tr } from '../lib/i18n'

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
  onStart,
  onStop,
  runningId,
  footer,
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
                <th className="keep-col" title={tr('勾上：排进时间轴后也留在这里')}>{tr('留')}</th>
              )}
              <th>{tr('名称')}</th>
              {/* 「排入」「开始」紧跟在时长后面 —— 放在最后一列的话，
                  窄屏上这张表要横向滚到底才够得着，每次都得先划一下 */}
              {onPlace && <th>{tr('时长')}</th>}
              {(onPlace || onStart) && <th />}
              <th>{tr('完成度')}</th>
              <th>{tr('状态')}</th>
              <th>{tr('备注')}</th>
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
                        title={tr('勾上：排进时间轴后也留在待办列表里')}
                      />
                    </td>
                  )}
                  <td className="habit-name">
                    {/* 名称不能想多宽就多宽 —— 它一撑，后面的完成度、状态、备注
                        就被挤出屏幕，每次都得横滑。截断，全称去编辑器里看 */}
                    <span className="hn-wrap">
                      <span
                        className="row-dot"
                        style={{ background: colorOf(r.color).dot }}
                        aria-hidden="true"
                      />
                      {onOpen ? (
                        <button className="link-btn hn-label" title={r.title} onClick={() => onOpen(r.id)}>
                          {r.title}
                        </button>
                      ) : (
                        <span className="hn-label" title={r.title}>
                          {r.title}
                        </span>
                      )}
                    </span>
                  </td>
                  {onPlace && <td className="small dur-cell">{r.duration || '—'}</td>}
                  {(onPlace || onStart) && (
                    <td className="act-cell">
                      {onPlace &&
                        (r.scheduled ? (
                          <span className="muted small">{tr('已排')}</span>
                        ) : (
                          <button
                            className="place-btn"
                            onClick={() => onPlace(r.id)}
                            title={tr('排进时间轴：自动找第一个装得下的空档')}
                          >{tr('排入 →')}</button>
                        ))}
                      {onStart &&
                        (runningId === r.id ? (
                          <button className="timer-btn on" onClick={() => onStop(r.id)}>{tr('■ 结束')}</button>
                        ) : (
                          <button
                            className="timer-btn"
                            onClick={() => onStart(r.id)}
                            title={tr('现在开始做，结束时再点一下 —— 猜不准时长就别猜')}
                            disabled={Boolean(runningId)}
                          >{tr('▶ 开始')}</button>
                        ))}
                    </td>
                  )}
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
                      <span
                        className="status-pill"
                        style={{
                          background: status.bg,
                          color: status.ink,
                          borderColor: status.edge,
                        }}
                      >
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
                      placeholder={tr('一句话…')}
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
      {footer}
      {onOpen && (
        <p className="muted small">
          点名称可以改标题、时长或删除。
          {onPlace &&
            tr('「排入」会自动找第一个装得下的空档，排不下也会排上去并标红。勾上「留」，排进时间轴后也继续留在这张表里。')}
        </p>
      )}
    </section>
  )
}
