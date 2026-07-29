import { format, isSameDay } from 'date-fns'
import { dateKey, weekdayLabel } from '../lib/dates'
import { habitStatus } from '../lib/habits'

// 点一下在这三档之间循环，想写备注再进那一天
const PCT_CYCLE = [100, 50, 0]

/** 习惯：每天重复，格子颜色就是完成度，一眼看完整周。 */
export default function HabitGrid({ rows, days, onSetHabit }) {
  const today = new Date()

  function cycle(cell, templateId) {
    const current = cell.log?.completion_pct
    const next =
      current === null || current === undefined
        ? PCT_CYCLE[0]
        : PCT_CYCLE[(PCT_CYCLE.indexOf(current) + 1) % PCT_CYCLE.length]
    onSetHabit({
      template_id: templateId,
      date: cell.date,
      completion_pct: next,
      note: cell.log?.note ?? null,
    })
  }

  return (
    <section className="card">
      <h2>Habits</h2>
      {rows.length === 0 ? (
        <p className="muted">
          还没有习惯。在「设置」里建一个<b>习惯</b>模板（比如运动、早睡），
          它会每天重复，在这里按完成度打卡。
        </p>
      ) : (
        <>
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
                      const pct = cell.log?.completion_pct
                      const status = pct === null || pct === undefined ? null : habitStatus(pct)
                      return (
                        <td key={key} className="gt-cell">
                          <button
                            className={`gt-mark${status ? '' : ' empty'}`}
                            style={status ? { background: status.color } : undefined}
                            onClick={() => cycle(cell, row.templateId)}
                            title={
                              status
                                ? `${row.title} ${pct}% · ${status.label}（点一下切换）`
                                : `${row.title} 还没打卡（点一下标记完成）`
                            }
                          >
                            {status ? pct : ''}
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted small">
            点一下在 100 / 50 / 0 之间循环。要写当天备注就点进那一天。
          </p>
        </>
      )}
    </section>
  )
}
