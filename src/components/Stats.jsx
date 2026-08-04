import { useEffect, useMemo, useState } from 'react'
import { dateKey, weekStart } from '../lib/dates'
import { makeCategoryLookup } from '../lib/categories'
import { colorOf } from '../lib/colors'
import {
  compareLatestWeek,
  fmtHm,
  fmtHours,
  summarize,
  toCsv,
} from '../lib/stats'
import { CompareBars, StackedWeeks, TrendLine } from './Charts'

const START_KEY = 'weekly-planner:stats-start'
const WEEK_CHOICES = [4, 8, 12, 26]
const HALF_LIFE_CHOICES = [2, 4, 8]

/** 默认从下周一开始 —— 刚开始用的那几天数据总是乱的，不值得算进去。 */
function defaultStart() {
  const monday = weekStart(new Date())
  const next = new Date(monday)
  next.setDate(next.getDate() + 7)
  return dateKey(next)
}

/**
 * 统计页。
 *
 * 数据只来自 daily_rollup —— 明细 28 天就清了，汇总永久留着，
 * 所以这一页看多久的历史都行，而所有指标都是现算的。
 */
export default function Stats({ planner, onBack }) {
  const [rollups, setRollups] = useState(null)
  const [weeks, setWeeks] = useState(12)
  const [halfLife, setHalfLife] = useState(4)
  const [focusCat, setFocusCat] = useState(null)
  // 起点存在本机：它是「我从哪天开始认真记」的个人判断，
  // 为一个设置单开一张表不值当
  const [start, setStart] = useState(
    () => localStorage.getItem(START_KEY) ?? defaultStart(),
  )

  useEffect(() => {
    localStorage.setItem(START_KEY, start)
  }, [start])

  useEffect(() => {
    let alive = true
    planner.loadStats(weeks).then((rows) => alive && setRollups(rows ?? []))
    return () => {
      alive = false
    }
  }, [planner, weeks])

  const lookup = useMemo(
    () => makeCategoryLookup(planner.categories),
    [planner.categories],
  )
  const today = dateKey(new Date())
  const windowFrom = useMemo(() => {
    const back = new Date(weekStart(new Date()))
    back.setDate(back.getDate() - 7 * (weeks - 1))
    const key = dateKey(back)
    return key > start ? key : start
  }, [weeks, start])

  const stats = useMemo(
    () =>
      rollups
        ? summarize(rollups, { fromKey: windowFrom, toKey: today, halfLifeWeeks: halfLife })
        : null,
    [rollups, windowFrom, today, halfLife],
  )

  const nameOf = (key) => lookup(key).name
  const colorFor = (key) => lookup(key).color

  function exportCsv() {
    const rows = rollups.filter((r) => r.date >= start && r.date <= today)
    const blob = new Blob([toCsv(rows, nameOf)], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `weekly-planner-${start}-${today}.csv`
    // 必须先挂进 DOM 再点：游离的 <a> 在部分浏览器里点了不下载，什么反应都没有
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(a.href)
  }

  const focus =
    stats?.categories.find((c) => c.key === focusCat) ?? stats?.categories[0] ?? null

  return (
    <div className="stats-view">
      <div className="day-head">
        <button className="ghost" onClick={onBack}>
          ‹ 回到周视图
        </button>
        <h1>统计</h1>
        <span className="spacer" />
        <button onClick={exportCsv} disabled={!rollups?.length}>
          导出 CSV
        </button>
      </div>

      {!stats ? (
        <section className="card">
          <p className="muted">读取中…</p>
        </section>
      ) : !stats.hasData ? (
        <section className="card">
          <h2>还没有数据</h2>
          <p>
            统计从 <b>{start}</b> 开始算，那天之前的记录不计入。
            等这一天到了、并且记了东西，这里就有数了。
          </p>
          <StartPicker start={start} setStart={setStart} />
        </section>
      ) : (
        <>
          <section className="card">
            <div className="card-head">
              <h2>概览</h2>
              <span className="row-gap">
                <Choice value={weeks} setValue={setWeeks} options={WEEK_CHOICES} suffix="周" />
              </span>
            </div>
            <p className="muted small">
              {stats.fromKey} → {stats.toKey}，共 {stats.dayCount} 天。
              本周还没过完，最后一根柱子天生短一截。
            </p>

            <div className="stat-cards">
              <StatCard
                label="记录率"
                value={`${Math.round(stats.recordRate * 100)}%`}
                hint={`未记录 ${fmtHours(stats.unrecorded)}h`}
                warn={stats.recordRate < 0.5}
              />
              {stats.categories.slice(0, 3).map((c) => {
                const cmp = compareLatestWeek(c)
                return (
                  <StatCard
                    key={c.key}
                    label={`${nameOf(c.key)} 日均`}
                    value={fmtHm(c.avgPerDay)}
                    color={colorFor(c.key)}
                    hint={
                      cmp
                        ? `本周 ${fmtHours(cmp.latest)}h，${cmp.diff >= 0 ? '↑' : '↓'} ${fmtHours(Math.abs(cmp.diff))}h vs 均值`
                        : `${c.days} 天做过`
                    }
                  />
                )
              })}
            </div>
            {stats.recordRate < 0.5 && (
              <p className="muted small">
                记录率低于一半时，下面所有数字都要打折看 —— 没记下来的时间不知道去哪了。
              </p>
            )}
          </section>

          <section className="card">
            <h2>每类花了多少（实际 vs 计划）</h2>
            <CompareBars
              rows={stats.categories.map((c) => ({
                key: c.key,
                name: nameOf(c.key),
                color: colorFor(c.key),
                actual: c.actual,
                planned: c.planned,
                label: `${fmtHours(c.actual)}h`,
              }))}
            />
            {/* 说明得照着眼睛看到的说。原来写「粗条 / 细框」——
                可你看到的是「实心 / 虚线」，对不上就只能靠猜 */}
            <p className="muted small">
              <b>实心色块 = 实际</b>做了多少，<b>虚线框 = 当初计划</b>多少。
              虚线框比色块长 = 排了没做完；短 = 做得比计划多。
            </p>
          </section>

          <section className="card">
            <h2>每周的时间去哪了</h2>
            <StackedWeeks weeks={stats.weeks} colorFor={colorFor} nameFor={nameOf} />
            <p className="muted small">
              灰色是<b>未记录</b>。画出来占比才加得到 100%，
              而「一天到底记下了多少」本身就是所有数字可信度的前提。
            </p>
          </section>

          {focus && (
            <section className="card">
              <div className="card-head">
                <h2>趋势</h2>
                <Choice
                  value={halfLife}
                  setValue={setHalfLife}
                  options={HALF_LIFE_CHOICES}
                  suffix="周半衰期"
                />
              </div>
              <div className="cat-row">
                {stats.categories.map((c) => (
                  <button
                    key={c.key}
                    className={`cat-chip${focus.key === c.key ? ' on' : ''}`}
                    onClick={() => setFocusCat(c.key)}
                  >
                    <span
                      className="row-dot"
                      style={{ background: colorOf(colorFor(c.key)).dot }}
                      aria-hidden="true"
                    />
                    {nameOf(c.key)}
                  </button>
                ))}
              </div>
              <TrendLine
                series={focus.weekSeries}
                smooth={smoothOf(focus, halfLife)}
                color={colorFor(focus.key)}
                labels={stats.weeks.map((w) => w.week)}
              />
              <p className="muted small">
                {nameOf(focus.key)}：n 周平均 {fmtHours(focus.weekAvg)}h/周，
                EWMA {focus.ewma == null ? '—' : `${fmtHours(focus.ewma)}h/周`}。
              </p>
            </section>
          )}

          <section className="card">
            <h2>明细</h2>
            <div className="table-scroll">
              <table className="habits-table stats-table">
                <thead>
                  <tr>
                    <th>分类</th>
                    <th>执行天数</th>
                    <th>总时间</th>
                    <th>日均</th>
                    <th>日最少</th>
                    <th>日最多</th>
                    <th>占比</th>
                    <th>计划</th>
                    <th>差值</th>
                    <th>达成率</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.categories.map((c) => (
                    <tr key={c.key}>
                      <td className="habit-name">
                        <span
                          className="row-dot"
                          style={{ background: colorOf(colorFor(c.key)).dot }}
                          aria-hidden="true"
                        />
                        {nameOf(c.key)}
                      </td>
                      <td>{c.days}</td>
                      <td>{fmtHours(c.actual)}h</td>
                      <td>{fmtHm(c.avgPerDay)}</td>
                      <td>{fmtHm(c.min)}</td>
                      <td>{fmtHm(c.max)}</td>
                      <td>{(c.share * 100).toFixed(1)}%</td>
                      <td>{fmtHours(c.planned)}h</td>
                      <td className={c.diff < 0 ? 'neg' : ''}>
                        {c.diff >= 0 ? '+' : ''}
                        {fmtHours(c.diff)}h
                      </td>
                      <td>{c.rate == null ? '—' : `${Math.round(c.rate * 100)}%`}</td>
                    </tr>
                  ))}
                  <tr className="stats-total">
                    <td>未记录</td>
                    <td>—</td>
                    <td>{fmtHours(stats.unrecorded)}h</td>
                    <td colSpan="3">—</td>
                    <td>{((stats.unrecorded / stats.capacity) * 100).toFixed(1)}%</td>
                    <td colSpan="3">—</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="muted small">
              <b>日均 = 总时间 ÷ 执行天数</b>（不是除以日历天数）。
              日最少/最多也只在做过的那些天里取 —— 不然只要有一天没做，
              最少永远是 0，这个数就废了。<b>达成率</b>对从来没排过计划的显示「—」。
            </p>
          </section>

          <TodoHabitStats planner={planner} />

          <section className="card">
            <h2>统计起点</h2>
            <StartPicker start={start} setStart={setStart} />
          </section>
        </>
      )}
    </div>
  )
}

/** EWMA 的整条曲线（表格里只用最后一个值，图上要全程）。 */
function smoothOf(cat, halfLife) {
  const alpha = 1 - 0.5 ** (1 / Math.max(0.5, halfLife))
  const out = []
  let s = cat.weekSeries[0] ?? 0
  for (const v of cat.weekSeries) {
    s = out.length ? alpha * v + (1 - alpha) * s : v
    out.push(s)
  }
  return out
}

function StatCard({ label, value, hint, color, warn }) {
  return (
    <div className={`stat-card${warn ? ' warn' : ''}`}>
      <span className="stat-label">
        {color && (
          <span
            className="row-dot"
            style={{ background: colorOf(color).dot }}
            aria-hidden="true"
          />
        )}
        {label}
      </span>
      <span className="stat-value">{value}</span>
      <span className="muted small">{hint}</span>
    </div>
  )
}

function Choice({ value, setValue, options, suffix }) {
  return (
    <span className="cat-row">
      {options.map((o) => (
        <button
          key={o}
          className={`cat-chip${value === o ? ' on' : ''}`}
          onClick={() => setValue(o)}
        >
          {o}
          {suffix}
        </button>
      ))}
    </span>
  )
}

function StartPicker({ start, setStart }) {
  return (
    <div className="row-gap">
      <label htmlFor="stats-start" className="grow">
        从哪天开始算
      </label>
      <input
        id="stats-start"
        type="date"
        value={start}
        onChange={(e) => e.target.value && setStart(e.target.value)}
      />
      <p className="muted small">
        这天之前的记录不计入。存在本机，换设备要再设一次。
      </p>
    </div>
  )
}

/**
 * 待办和习惯没有时间信息，只统计完成度，和时间轴那块分开。
 *
 * 现在只看**当前这一周** —— planner 一次只加载显示中那一周的流水。
 * 打卡历史本身是留全的（habits_log 已经不参与清理了），
 * 要看长期趋势得再加一次跨周加载，那个还没做。
 */
function TodoHabitStats({ planner }) {
  const { entries, habitLogs, templates, days } = planner
  const habits = templates.filter((t) => t.type === 'habit' && t.is_active)
  const todos = entries.filter((e) => !e.planned_start && !e.actual_start)

  const habitRows = habits.map((h) => {
    const logs = habitLogs.filter((l) => l.template_id === h.id)
    const done = logs.filter((l) => l.completion_pct >= 100).length
    const avg = logs.length
      ? logs.reduce((s, l) => s + l.completion_pct, 0) / logs.length
      : 0
    return { id: h.id, title: h.title, color: h.color, done, logged: logs.length, avg }
  })

  const todoDone = todos.filter((t) => (t.completion_pct ?? 0) >= 100).length

  return (
    <section className="card">
      <h2>待办 / 习惯（本周）</h2>
      <p className="muted small">
        这两块没有时间信息，只看完成度，和上面的时间统计分开。
        这里看的是当前这一周（{days.length} 天）。
      </p>
      <div className="stat-cards">
        <StatCard
          label="待办完成"
          value={`${todoDone}/${todos.length}`}
          hint={todos.length ? `${Math.round((todoDone / todos.length) * 100)}%` : '本周没有待办'}
        />
        {habitRows.map((h) => (
          <StatCard
            key={h.id}
            label={h.title}
            color={h.color}
            value={`${h.done}/${h.logged || 0}`}
            hint={h.logged ? `平均 ${Math.round(h.avg)}%` : '还没打卡'}
          />
        ))}
      </div>
    </section>
  )
}
