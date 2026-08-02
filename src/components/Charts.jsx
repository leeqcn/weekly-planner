import { colorOf } from '../lib/colors'

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

/** 一类一行的横条：实际（粗）+ 计划（细框叠在上面）。 */
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
                  style={{ width: `${(r.planned / top) * 100}%`, borderColor: tint.edge }}
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
                <title>{`${wk.week} 未记录 ${(wk.unrecorded / 60).toFixed(1)}h`}</title>
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
    return <p className="muted small">至少要两周数据才画得出趋势。</p>
  }
  const W = 100
  const H = 60
  // 纵轴不从 0 起：每周睡 50 小时上下的曲线，从 0 起会贴着顶端拉成一条直线，
  // 什么都看不出来。代价是波动被放大，所以下面把范围明写出来。
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

  return (
    <div className="trend">
      <div className="chart-wrap">
        <svg className="chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
          <path
            d={path(series)}
            fill="none"
            stroke={tint.edge}
            strokeWidth="1"
            opacity="0.5"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={path(smooth)}
            fill="none"
            stroke={tint.dot}
            strokeWidth="2.5"
            vectorEffect="non-scaling-stroke"
            strokeLinejoin="round"
          />
          {/* 透明的感应条，鼠标悬停看那一周的数。圆点会被拉成椭圆，所以不画点 */}
          {series.map((v, i) => (
            <rect key={i} x={x(i) - band / 2} y={0} width={band} height={H} fill="transparent">
              <title>{`${labels[i]} ${(v / 60).toFixed(1)}h`}</title>
            </rect>
          ))}
        </svg>
        <div className="chart-axis ends">
          <span>{shortWeek(labels[0])}</span>
          <span>{shortWeek(labels.at(-1))}</span>
        </div>
      </div>
      <p className="muted small">
        细线是每周实际，粗线是 EWMA（平滑掉单周的意外）。
        纵轴是 <b>{(bottom / 60).toFixed(1)}–{(top / 60).toFixed(1)}h</b>，
        <b>不是从 0 开始</b> —— 这样才看得出变化，但也会把波动画得比实际大。
      </p>
    </div>
  )
}
