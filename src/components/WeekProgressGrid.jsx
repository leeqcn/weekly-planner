import { format, isSameDay } from 'date-fns'
import { dateKey, weekdayLabel } from '../lib/dates'
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
                      <span className="gt-wd">{weekdayLabel(day).slice(1)}</span>
                      <span className="gt-date">{format(day, 'd')}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.key}>
                    <th scope="row" className="gt-name">
                      <span
                        className="row-dot"
                        style={{ background: colorOf(row.color).dot }}
                        aria-hidden="true"
                      />
                      {row.title}
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
                                ? `${row.title} 还没打卡（点一下标记完成）`
                                : `${row.title} ${pct}% · ${status.label}（点一下切换）`
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
