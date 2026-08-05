import { format, isSameDay } from 'date-fns'
import { dateKey, isoWeekday } from '../lib/dates'
import { habitStatus } from '../lib/habits'
import { nextPct } from '../lib/schedule'
import { colorOf } from '../lib/colors'

/**
 * 周视图里 To do 和 Habits 共用的 n x 8 表格：左边一列事，右边周一到周日。
 * 点一格在 100 / 50 / 0 之间循环。
 *
 * emptyStyle 决定「还没打分」长什么样：
 *   'zero'  —— 待办用，直接按 0 显示成红色，一眼看出任务在哪天
 *   'blank' —— 习惯用，留空白，不然满屏红色
 */
import { useState } from 'react'
import { pick, weekdayShort } from '../lib/i18n'

export default function WeekProgressGrid({
  title,
  rows,
  days,
  emptyStyle,
  emptyText,
  hint,
  onSetPct,
}) {
  const today = new Date()
  // 点开名字看全称。手机上一行放不下 7 天 + 完整名字，名字截断是唯一
  // 不牺牲「周一到周日一眼看全」的办法；截断之后点一下展开成多行，
  // 列宽不变（max-width 还在），只是这一行变高，不会把整张表推得乱跳
  const [expanded, setExpanded] = useState(null)

  return (
    <section className="card">
      <h2>{title}</h2>
      {rows.length === 0 ? (
        <p className="muted">{emptyText}</p>
      ) : (
        <>
          <div className="grid-scroll">
            <table className="week-grid-table">
              <thead>
                <tr>
                  <th className="gt-name" />
                  {days.map((day) => (
                    <th
                      key={dateKey(day)}
                      className={isSameDay(day, today) ? 'today' : undefined}
                    >
                      <span className="gt-wd">{weekdayShort(isoWeekday(day))}</span>
                      <span className="gt-date">{format(day, 'd')}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.key}>
                    <th
                      scope="row"
                      className={`gt-name${expanded === row.key ? ' expanded' : ''}`}
                    >
                      <button
                        className="gt-name-btn"
                        title={row.title}
                        onClick={() =>
                          setExpanded((k) => (k === row.key ? null : row.key))
                        }
                      >
                        <span
                          className="row-dot"
                          style={{ background: colorOf(row.color).dot }}
                          aria-hidden="true"
                        />
                        <span className="gt-name-label">{row.title}</span>
                      </button>
                    </th>
                    {row.cells.map((cell, i) => {
                      const key = `${row.key}|${i}`
                      if (!cell) return <td key={key} className="gt-cell na" />

                      const blank = cell.pct === null && emptyStyle === 'blank'
                      const pct = cell.pct ?? 0
                      const status = habitStatus(pct)
                      return (
                        <td key={key} className="gt-cell">
                          <button
                            className={`gt-mark${blank ? ' empty' : ''}`}
                            style={
                              blank
                                ? undefined
                                : {
                                    background: status.bg,
                                    color: status.ink,
                                    borderColor: status.edge,
                                  }
                            }
                            onClick={() => onSetPct(row, cell, nextPct(cell.pct))}
                            title={
                              blank
                                ? pick(() => `${row.title} 还没打卡（点一下标记完成）`, () => `${row.title} — not logged (tap to mark done)`)
                                : pick(() => `${row.title} ${pct}% · ${status.label}（点一下切换）`, () => `${row.title} ${pct}% · ${status.label} (tap to change)`)
                            }
                          >
                            {blank ? '' : pct}
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted small">{hint}</p>
        </>
      )}
    </section>
  )
}
