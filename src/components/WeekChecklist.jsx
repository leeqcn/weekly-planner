import { format, isSameDay } from 'date-fns'
import { dateKey, weekdayLabel } from '../lib/dates'
import { habitStatus } from '../lib/habits'

// 点一下在这三档之间循环，想写备注再进 Day View。
const PCT_CYCLE = [100, 50, 0]

/**
 * n × 8 的周清单：左边是项目，右边是周一到周日的完成情况。
 * habit 每天重复看颜色；短事项 / 没定时间的安排当待办打勾。
 */
export default function WeekChecklist({ rows, days, onSetHabit, onToggleTask }) {
  if (!rows.length) {
    return (
      <section className="card">
        <h2>本周清单</h2>
        <p className="muted">
          这周还没有打卡项或短事项。<b>habit</b> 模板、以及时长不到 20 分钟或者
          没定时间的安排（量血压、交房租这种）会落到这张表里；
          有明确起止时间的安排在上面的时间轴上。
        </p>
      </section>
    )
  }

  const today = new Date()

  function cycleHabit(cell, templateId) {
    const current = cell.log?.completion_pct
    const next =
      current === undefined || current === null
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
      <h2>本周清单</h2>
      <div className="checklist-scroll">
        <table className="checklist">
          <thead>
            <tr>
              <th className="cl-name" />
              {days.map((day) => (
                <th
                  key={dateKey(day)}
                  className={isSameDay(day, today) ? 'today' : undefined}
                >
                  <span className="cl-wd">{weekdayLabel(day).slice(1)}</span>
                  <span className="cl-date">{format(day, 'd')}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className={`cl-row-${row.kind}`}>
                <th scope="row" className="cl-name">
                  {row.title}
                </th>
                {row.cells.map((cell, i) => {
                  const key = `${row.key}|${i}`
                  if (!cell) return <td key={key} className="cl-cell na" />

                  if (row.kind === 'habit') {
                    const pct = cell.log?.completion_pct
                    const status = pct === undefined || pct === null ? null : habitStatus(pct)
                    return (
                      <td key={key} className="cl-cell">
                        <button
                          className={`cl-mark${status ? '' : ' empty'}`}
                          style={status ? { background: status.color } : undefined}
                          onClick={() => cycleHabit(cell, row.templateId)}
                          title={
                            status
                              ? `${row.title} ${pct}% · ${status.label}（点击切换）`
                              : `${row.title} 还没打卡（点击标记完成）`
                          }
                        >
                          {status ? `${pct}` : ''}
                        </button>
                      </td>
                    )
                  }

                  const done = cell.entry.status === 'done'
                  const skipped = cell.entry.status === 'skipped'
                  return (
                    <td key={key} className="cl-cell">
                      <button
                        className={`cl-check${done ? ' done' : ''}${skipped ? ' skipped' : ''}`}
                        onClick={() => onToggleTask(cell.entry)}
                        title={`${row.title}（点击${done ? '取消完成' : '标记完成'}）`}
                      >
                        {done ? '✓' : skipped ? '–' : ''}
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
        彩色格是打卡（点一下在 100 / 50 / 0 之间切换），方框是待办（点一下打勾）。
        要写当天备注就点进那一天。
      </p>
    </section>
  )
}
