import { colorOf } from '../lib/colors'
import { fmtHm } from '../lib/stats'
import { minutesOfDay } from '../lib/dates'
import { pick, tr } from '../lib/i18n'

/** 段子里写得下字的门槛。低于一小时的只留颜色 —— 一小时在整条上不到 5%，
    塞进去的字要么被截，要么小到看不清，还不如干净一点，名字去下面的清单看。 */
const LABEL_MIN = 60

/**
 * 这一天的时间都花哪了：一条横的堆叠条 + 一份清单。
 *
 * 用横条不用饼图，三个理由：
 *   1. 手机是竖的，横条吃满宽度，饼图只能占一个正方形，同样面积信息少一半；
 *   2. 要在段上标时间 —— 横条顺着排就行，饼图得画引线，几个小块一挤就乱；
 *   3. app 里已经有堆叠条（统计页的「每周的时间去哪了」），再来一套图形语言
 *      等于让人学两遍怎么看同一种数据。
 *
 * 底数不是 24 小时，是**已经过去的那部分**：今天下午三点看，分母就是 15 小时。
 * 拿 24 小时当分母的话，早上看什么都显得「占比很小」，纯属自欺。
 * 没记下来的那段画成灰色 —— 不画的话各段加起来是 100%，会以为一天全记全了。
 */
export default function DayBreakdown({ entries, resolveColor, elapsedMinutes }) {
  const byTitle = new Map()
  for (const e of entries) {
    if (!e.actual_start || !e.actual_end) continue
    const from = minutesOfDay(e.actual_start)
    const to = minutesOfDay(e.actual_end) || (from > 0 ? 1440 : 0)
    const mins = Math.max(0, to - from)
    if (!mins) continue
    const prev = byTitle.get(e.title)
    if (prev) prev.minutes += mins
    else byTitle.set(e.title, { title: e.title, minutes: mins, color: resolveColor(e) })
  }

  const rows = [...byTitle.values()].sort((a, b) => b.minutes - a.minutes)
  const logged = rows.reduce((s, r) => s + r.minutes, 0)
  if (!logged) return null

  // 记录超过「已经过去的时间」是可能的（两件事时间重叠），这时候就按记录的算
  const total = Math.max(logged, elapsedMinutes)
  const unlogged = Math.max(0, total - logged)
  const pct = (m) => (m / total) * 100

  return (
    <section className="card">
      <h2>{tr('时间去哪了')}</h2>
      <div
        className="db-bar"
        role="img"
        aria-label={rows.map((r) => `${r.title} ${fmtHm(r.minutes)}`).join('，')}
      >
        {rows.map((r) => (
          <span
            key={r.title}
            className="db-seg"
            style={{ width: `${pct(r.minutes)}%`, background: colorOf(r.color).block }}
            title={`${r.title} ${fmtHm(r.minutes)}`}
          >
            {r.minutes >= LABEL_MIN && <span className="db-seg-label">{fmtHm(r.minutes)}</span>}
          </span>
        ))}
        {unlogged > 0 && (
          <span
            className="db-seg db-unlogged"
            style={{ width: `${pct(unlogged)}%` }}
            title={pick(() => `没记录 ${fmtHm(unlogged)}`, () => `unlogged ${fmtHm(unlogged)}`)}
          />
        )}
      </div>

      {/* 清单：条上写不下的小块在这里才看得见名字和时长 */}
      <ul className="db-list">
        {rows.map((r) => (
          <li key={r.title}>
            <span className="row-dot" style={{ background: colorOf(r.color).dot }} aria-hidden="true" />
            <span className="db-name" title={r.title}>{r.title}</span>
            <span className="db-time">{fmtHm(r.minutes)}</span>
            <span className="db-share muted small">{Math.round(pct(r.minutes))}%</span>
          </li>
        ))}
        {unlogged > 0 && (
          <li className="muted">
            <span className="row-dot db-dot-unlogged" aria-hidden="true" />
            <span className="db-name">{tr('没记录')}</span>
            <span className="db-time">{fmtHm(unlogged)}</span>
            <span className="db-share small">{Math.round(pct(unlogged))}%</span>
          </li>
        )}
      </ul>
    </section>
  )
}
