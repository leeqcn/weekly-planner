import { colorOf } from '../lib/colors'
import { tr } from '../lib/i18n'

/**
 * 手写 SVG，不引图表库。要的图就三种，加个库要多背一百多 KB，
 * 而且默认配色和这套莫兰迪对不上，最后还是得一个个覆盖。
 * 颜色一律从分类来 —— 图表和时间轴自动同色。
 *
 * 一条通用规矩：**SVG 里只放形状，文字一律用 HTML 放在外面。**
 * 图要横向铺满容器，只能用 `preserveAspectRatio="none"`，
 * 而那会把 viewBox 横向拉伸八九倍 —— 文字跟着糊成一片、圆点变成椭圆。
 * 线宽用 `vector-effect="non-scaling-stroke"` 挡掉同样的问题。
 */

const shortWeek = (key) => key.slice(5).replace('-', '/')

/** 一类一行的横条：实际（实心色块）+ 计划（虚线框叠在上面）。 */
export function CompareBars({ rows, max }) {
  const top = max || Math.max(1, ...rows.map((r) => Math.max(r.actual, r.planned)))
  return (
    <div className="bars">
      {rows.map((r) => {
        const tint = colorOf(r.color)
        return (
          <div className="bar-row" key={r.key}>
            <span className="bar-name">{r.name}</span>
            <span className="bar-track">
              <span
                className="bar-actual"
                style={{ width: `${(r.actual / top) * 100}%`, background: tint.dot }}
              />
              {r.planned > 0 && (
                <span
                  className="bar-planned"
                  style={{
                    width: `${(r.planned / top) * 100}%`,
                    // 边框要同时压得住两种底：左半截叠在实心条上，右半截落在浅色轨道上。
                    // 原来用 tint.edge，对实心条的对比度只有 1.21（1.0 就是看不见）——
                    // 「做得比计划多」的行里虚线框整个是隐形的。
                    // 掺墨之后是 1.9–2.1 / 5.5–6.2，两种底上都看得见。
                    borderColor: `color-mix(in srgb, ${tint.dot} 45%, var(--ink))`,
                  }}
                />
              )}
            </span>
            <span className="bar-value">{r.label}</span>
          </div>
        )
      })}
    </div>
  )
}

/** 每周一根堆叠柱，最上面一段是「未记录」。 */
export function StackedWeeks({ weeks, colorFor, nameFor }) {
  const H = 100
  const w = 100 / Math.max(1, weeks.length)
  const pad = Math.min(1.5, w * 0.12)

  // 层序必须**全窗口统一**，按各类的总时长排（多的在下面）。
  // 之前是每根柱子按自己那周的大小排，于是 Sleep 和 Work 谁在下面
  // 每周都在换 —— 柱子之间就没法比了，堆叠图的意义正好在这。
  const totals = new Map()
  for (const wk of weeks) {
    for (const [key, minutes] of wk.parts) totals.set(key, (totals.get(key) ?? 0) + minutes)
  }
  const order = [...totals.entries()].sort((a, b) => b[1] - a[1]).map(([key]) => key)

  return (
    <div className="chart-wrap">
      <svg className="chart" viewBox={`0 0 100 ${H}`} preserveAspectRatio="none">
        {weeks.map((wk, i) => {
          let y = H
          const scale = H / Math.max(1, wk.capacity)
          const parts = order.map((key) => [key, wk.parts.get(key) ?? 0]).filter(([, m]) => m > 0)
          return (
            <g key={wk.week}>
              {parts.map(([key, minutes]) => {
                const h = minutes * scale
                y -= h
                return (
                  <rect
                    key={key}
                    x={i * w + pad}
                    y={y}
                    width={w - pad * 2}
                    height={Math.max(0.3, h)}
                    fill={colorOf(colorFor(key)).dot}
                  >
                    <title>{`${wk.week} ${nameFor(key)} ${(minutes / 60).toFixed(1)}h`}</title>
                  </rect>
                )
              })}
              <rect
                x={i * w + pad}
                y={0}
                width={w - pad * 2}
                height={Math.max(0, y)}
                fill="var(--rule)"
              >
                <title>{`${wk.week} ${tr('未记录')} ${(wk.unrecorded / 60).toFixed(1)}h`}</title>
              </rect>
            </g>
          )
        })}
      </svg>
      <div className="chart-axis">
        {weeks.map((wk) => (
          <span key={wk.week}>{shortWeek(wk.week)}</span>
        ))}
      </div>
    </div>
  )
}

/**
 * 一条折线（每周实际）+ 一条 EWMA 平滑线。
 * EWMA 那条的意思是「排除掉某一周的意外，我最近到底是什么水平」。
 */
export function TrendLine({ series, smooth, color, labels }) {
  if (series.length < 2) {
    return <p className="muted small">{tr('至少要两周数据才画得出趋势。')}</p>
  }
  const W = 100
  const H = 60
  // 纵轴不从 0 起：每周睡 50 小时上下的曲线，从 0 起会贴着顶端拉成一条直线，
  // 什么都看不出来。代价是波动被放大，所以把上下界直接标在图上。
  const all = [...series, ...smooth]
  const lo = Math.min(...all)
  const hi = Math.max(...all)
  const padY = Math.max(1, (hi - lo) * 0.15)
  const bottom = Math.max(0, lo - padY)
  const top = hi + padY
  const span = Math.max(1, top - bottom)
  const x = (i) => (i / (series.length - 1)) * W
  const y = (v) => H - ((v - bottom) / span) * H
  const path = (arr) => arr.map((v, i) => `${i ? 'L' : 'M'}${x(i)} ${y(v)}`).join(' ')
  const tint = colorOf(color)
  const band = W / series.length
  const hours = (v) => (v / 60).toFixed(1)

  return (
    <div className="trend">
      {/* 两条线**用两个颜色**，不靠粗细区分。
          原来是同一个色系一粗一细、细的还压到 0.5 透明度 —— 淡到要眯着眼找。
          现在：每周实际 = 分类色，EWMA = 深墨色。
          深墨色是量过的：和七个分类色的 CIEDE2000 最小 30.7（灰那一类），
          远高于「一眼分得开」的 10。用 --ink-soft 的话灰那一类只有 9.0，
          正好是看不出差别的那一档。 */}
      <div className="trend-legend">
        <span className="trend-key">
          <svg width="22" height="10" aria-hidden="true">
            <line x1="0" y1="5" x2="22" y2="5" stroke={tint.dot} strokeWidth="3" />
          </svg>
          {tr('每周实际')}
        </span>
        <span className="trend-key">
          <svg width="22" height="10" aria-hidden="true">
            <line x1="0" y1="5" x2="22" y2="5" stroke="var(--ink)" strokeWidth="4" />
          </svg>
          {tr('EWMA（平滑）')}
        </span>
      </div>

      {/* 刻度**不压在图上**：叠着画的话，最后一周那个数正好落在下界那个数上，
          两串数字糊成一团。左右各留一条窄栏，谁也碰不到谁 */}
      <div className="trend-chart">
        <div className="trend-yaxis">
          <span className="trend-y trend-y-top">{hours(top)}h</span>
          <span className="trend-y trend-y-bottom">{hours(bottom)}h</span>
        </div>
        <div className="trend-mid">
        <div className="trend-plot">
          <svg className="chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
            {/* 上下两条参考线，对应右边标的那两个数 */}
            <line x1="0" y1="0.5" x2={W} y2="0.5" stroke="var(--rule)" strokeWidth="1"
              strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
            <line x1="0" y1={H - 0.5} x2={W} y2={H - 0.5} stroke="var(--rule)" strokeWidth="1"
              strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
            <path
              d={path(series)}
              fill="none"
              stroke={tint.dot}
              strokeWidth="3"
              vectorEffect="non-scaling-stroke"
              strokeLinejoin="round"
            />
            <path
              d={path(smooth)}
              fill="none"
              stroke="var(--ink)"
              strokeWidth="4"
              vectorEffect="non-scaling-stroke"
              strokeLinejoin="round"
            />
            {/* 透明的感应条，鼠标悬停看那一周的数 */}
            {series.map((v, i) => (
              <rect key={i} x={x(i) - band / 2} y={0} width={band} height={H} fill="transparent">
                <title>{`${labels[i]} ${hours(v)}h`}</title>
              </rect>
            ))}
          </svg>

          {/* 数据点用 HTML 画不用 SVG：preserveAspectRatio="none" 会把圆拉成椭圆
              （这个项目里已经栽过一次，见 README 的「圆点变椭圆」）。
              绝对定位的方块自己不变形，摆在百分比位置上正好对齐。 */}
          {series.map((v, i) => (
            <span
              key={i}
              className="trend-dot"
              style={{ left: `${x(i)}%`, top: `${(y(v) / H) * 100}%`, background: tint.dot }}
              title={`${labels[i]} ${hours(v)}h`}
            />
          ))}

        </div>
        <div className="chart-axis ends">
          <span>{shortWeek(labels[0])}</span>
          <span>{shortWeek(labels.at(-1))}</span>
        </div>
        </div>
        {/* 最后一周的数单独占一栏 —— 这张图最常被问的就是它 */}
        <div className="trend-yaxis">
          <span className="trend-now" style={{ top: `${(y(series.at(-1)) / H) * 100}%` }}>
            {hours(series.at(-1))}h
          </span>
        </div>
      </div>

      <p className="muted small">{tr('一周一个点，两条线两个颜色：分类色是每周实际，深色是 EWMA。')}<b>{tr('纵轴不是从 0 开始')}</b>{tr('（这里是')} <b>{hours(bottom)}–{hours(top)}h</b>{tr('）—— 从 0 起的话线会贴着顶端拉平，什么都看不出来；代价是波动被画得比实际大。')}</p>
    </div>
  )
}
