import { useEffect, useState } from 'react'
import { habitStatus } from '../lib/habits'
import { colorOf } from '../lib/colors'
import { nextPct } from '../lib/schedule'
import { pick, tr } from '../lib/i18n'
import Hint from './Hint'

/**
 * Day View 里 To do 和 Habits 共用的表格：一行一件事，
 * 完成度（点一下 100 / 50 / 0 循环，底色就是状态）+ 备注。
 * 两块长得一样，不用记两套操作。
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
  onAdd,
  flashId,
}) {
  const [draft, setDraft] = useState({})

  useEffect(() => {
    setDraft(
      Object.fromEntries(
        // pct 为 null = 还没打过卡。显示「—」而不是红色的 0 ——
        // 没打卡不等于没做好，一屏红字只会让人不想看。
        rows.map((r) => [
          r.id,
          { pct: r.pct ?? 0, note: r.note ?? '', unlogged: r.pct === null },
        ]),
      ),
    )
  }, [rows])

  const cardHead = (
    <div className="card-head">
      <h2>{title}</h2>
      {onAdd && (
        <button className="add-btn" onClick={onAdd} title={tr('加一件要做的事')} aria-label={tr('加一件要做的事')}>
          ＋
        </button>
      )}
    </div>
  )

  if (!rows.length) {
    return (
      <section className="card">
        {cardHead}
        <p className="muted">{emptyText}</p>
      </section>
    )
  }

  const set = (id, patch) =>
    setDraft((d) => ({ ...d, [id]: { ...d[id], ...patch, unlogged: false } }))

  /** 点一下：没打过卡的从 100 开始，打过的按 100 -> 50 -> 0 转。 */
  const bump = (id, pct, unlogged) => {
    const next = nextPct(unlogged ? null : Number(pct))
    setDraft((d) => ({ ...d, [id]: { ...d[id], pct: next, unlogged: false } }))
    onSave(id, { pct: next, note: draft[id]?.note?.trim() || null })
  }

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
      {cardHead}
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
              {/* 「完成度」和「状态」合成一列：数字上的底色说的就是状态 */}
              <th>{tr('完成度')}</th>
              <th>{tr('备注')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const row = draft[r.id] ?? { pct: 0, note: '' }
              const status = row.unlogged ? null : habitStatus(row.pct)
              return (
                // data-entry-id：刚加完的那条要能被找到，滚过去闪一下
                <tr key={r.id} data-entry-id={r.id} className={r.id === flashId ? 'flash' : ''}>
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
                    {/* 点一下在 100 / 50 / 0 之间循环，和周视图一格一个道理。
                        原来是滑杆 + 数字框：手机上要拖准很费劲，而记录本来就
                        只分「做完了 / 做了一半 / 没做」三档，精确到 70% 既拿不准
                        也没人回头看。顺带把「状态」那一列并进来 —— 数字上的
                        底色说的就是状态，两列讲同一件事，窄屏上却要多滚一截 */}
                    <button
                      className="pct-cycle"
                      onClick={() => bump(r.id, row.pct, row.unlogged)}
                      style={
                        status
                          ? { background: status.bg, color: status.ink, borderColor: status.edge }
                          : undefined
                      }
                      title={
                        row.unlogged
                          ? pick(() => `${r.title} 还没打卡（点一下标记完成）`, () => `${r.title} — not logged (tap to mark done)`)
                          : pick(() => `${r.title} ${row.pct}% · ${status.label}（点一下切换）`, () => `${r.title} ${row.pct}% · ${status.label} (tap to change)`)
                      }
                    >
                      {row.unlogged ? '—' : row.pct}
                    </button>
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
        <Hint>
          {tr('点名称可以改标题、时长或删除。')}{' '}
          {onPlace &&
            tr('「排入」会自动找第一个装得下的空档，排不下也会排上去并标红。勾上「留」，排进时间轴后也继续留在这张表里。')}
        </Hint>
      )}
    </section>
  )
}
