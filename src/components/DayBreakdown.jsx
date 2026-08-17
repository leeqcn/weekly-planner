import { colorOf } from '../lib/colors'
import { categoryKey, makeCategoryLookup, makeCategoryResolver } from '../lib/categories'
import { fmtHm } from '../lib/stats'
import { minutesOfDay } from '../lib/dates'
import { pick, tr } from '../lib/i18n'

/**
 * 写得下字、也值得单列一行的门槛。
 *
 * 一小时在整条上不到 5%，标签塞进去要么被截要么小到看不清；
 * 而清单上一堆「12′」的行同样是噪音 —— 这一页要回答的是「大头在哪」，
 * 不是「每件小事各花了几分钟」。不到一小时的合并成一行「其他」：
 * 少了行，时间一分钟没丢，加起来还是 100%。
 */
const LABEL_MIN = 60

/**
 * 这一天的时间都花哪了：一条横的堆叠条 + 一份清单。
 *
 * 按**分类**汇总不按标题：一天十几件事，按标题列出来就是把时间轴又抄了
 * 一遍，看不出结构。分类只有几个，「今天睡了 7 小时、工作 4 小时」
 * 才是这一页要回答的问题。想看具体哪件事，上面时间轴里就是。
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
export default function DayBreakdown({ entries, templates, categories, elapsedMinutes }) {
  const resolve = makeCategoryResolver(templates)
  const lookup = makeCategoryLookup(categories)

  const byCat = new Map()
  for (const e of entries) {
    if (!e.actual_start || !e.actual_end) continue
    const from = minutesOfDay(e.actual_start)
    const to = minutesOfDay(e.actual_end) || (from > 0 ? 1440 : 0)
    const mins = Math.max(0, to - from)
    if (!mins) continue
    const key = categoryKey(resolve(e))
    const prev = byCat.get(key)
    if (prev) prev.minutes += mins
    else byCat.set(key, { key, minutes: mins, cat: lookup(key) })
  }

  const all = [...byCat.values()].sort((a, b) => b.minutes - a.minutes)
  const logged = all.reduce((s, r) => s + r.minutes, 0)
  if (!logged) return null

  // 记录超过「已经过去的时间」是可能的（两件事时间重叠），这时候就按记录的算
  const total = Math.max(logged, elapsedMinutes)
  const unlogged = Math.max(0, total - logged)
  const pct = (m) => (m / total) * 100

  // 条上照旧按大小画每一段（颜色是有用的），清单上小的并成一行
  const big = all.filter((r) => r.minutes >= LABEL_MIN)
  const restMinutes = all.filter((r) => r.minutes < LABEL_MIN).reduce((s, r) => s + r.minutes, 0)

  return (
    <section className="card">
      <h2>{tr('时间去哪了')}</h2>
      <div
        className="db-bar"
        role="img"
        aria-label={all.map((r) => `${r.cat.name} ${fmtHm(r.minutes)}`).join('，')}
      >
        {all.map((r) => (
          <span
            key={r.key}
            className="db-seg"
            style={{ width: `${pct(r.minutes)}%`, background: colorOf(r.cat.color).block }}
            title={`${r.cat.name} ${fmtHm(r.minutes)}`}
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

      <ul className="db-list">
        {big.map((r) => (
          <li key={r.key}>
            <span className="row-dot" style={{ background: colorOf(r.cat.color).dot }} aria-hidden="true" />
            <span className="db-name" title={r.cat.name}>{r.cat.name}</span>
            <span className="db-time">{fmtHm(r.minutes)}</span>
            <span className="db-share muted small">{Math.round(pct(r.minutes))}%</span>
          </li>
        ))}
        {restMinutes > 0 && (
          <li className="muted">
            <span className="row-dot db-dot-rest" aria-hidden="true" />
            <span className="db-name">{tr('不到一小时的')}</span>
            <span className="db-time">{fmtHm(restMinutes)}</span>
            <span className="db-share small">{Math.round(pct(restMinutes))}%</span>
          </li>
        )}
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
