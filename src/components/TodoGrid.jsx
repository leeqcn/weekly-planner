import { format, isSameDay } from 'date-fns'
import { dateKey, weekdayLabel } from '../lib/dates'

/** 待办：左边一列事，右边周一到周日打勾。只有事，没有时间。 */
export default function TodoGrid({ rows, days, onToggle }) {
  const today = new Date()

  return (
    <section className="card">
      <h2>To do</h2>
      {rows.length === 0 ? (
        <p className="muted">
          这周没有待办。在「设置」里建一个<b>待办</b>模板（比如交房租、倒垃圾），
          或者在某一天里直接加一条不填时间的安排。
        </p>
      ) : (
        <div className="grid-scroll">
          <table className="week-grid-table">
            <thead>
              <tr>
                <th className="gt-name" />
                {days.map((day) => (
                  <th key={dateKey(day)} className={isSameDay(day, today) ? 'today' : undefined}>
                    <span className="gt-wd">{weekdayLabel(day).slice(1)}</span>
                    <span className="gt-date">{format(day, 'd')}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key}>
                  <th scope="row" className="gt-name">{row.title}</th>
                  {row.cells.map((cell, i) => {
                    const key = `${row.key}|${i}`
                    if (!cell) return <td key={key} className="gt-cell na" />
                    const done = cell.entry.status === 'done'
                    return (
                      <td key={key} className="gt-cell">
                        <button
                          className={`gt-check${done ? ' done' : ''}`}
                          onClick={() => onToggle(cell.entry)}
                          title={`${row.title}（点一下${done ? '取消' : '完成'}）`}
                        >
                          {done ? '✓' : ''}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
