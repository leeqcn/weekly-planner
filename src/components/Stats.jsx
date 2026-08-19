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
import { pick, tr } from '../lib/i18n'

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
  const isFixed = (key) => Boolean(lookup(key).is_fixed)

  /**
   * 占比的分母可以换：全天，或者「自由时间」。
   *
   * 睡觉、上班、家务这些改不动 —— 看它们占全天百分之多少没什么用，
   * 真正想问的是**剩下那些自己说了算的时间里**，各项各占多少。
   * 睡 8 小时上班 9 小时的话，全天口径下所有爱好加起来也不到 20%，
   * 看着像「什么都没干」；按自由时间算才知道这 7 小时是怎么分掉的。
   *
   * 哪些算固定在设置里勾（分类上的 is_fixed），不按名字猜 —— 同样叫「学习」，
   * 对学生是固定开销，对上班族是自由时间。
   */
  const [freeMode, setFreeMode] = useState(false)
  const hasFixed = planner.categories.some((c) => c.is_fixed)
  const freeTotal = stats
    ? stats.categories.filter((c) => !isFixed(c.key)).reduce((s, c) => s + c.actual, 0)
    : 0
  // 固定分类在自由时间口径下没有占比可言，显示「—」而不是一个算得出来的假数
  const shareOf = (c) =>
    freeMode ? (isFixed(c.key) ? null : freeTotal ? c.actual / freeTotal : 0) : c.share

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
        <button className="ghost" onClick={onBack}>{tr('‹ 回到周视图')}</button>
        <h1>{tr('统计')}</h1>
        <span className="spacer" />
        <button onClick={exportCsv} disabled={!rollups?.length}>{tr('导出 CSV')}</button>
      </div>

      {!stats ? (
        <section className="card">
          <p className="muted">{tr('读取中…')}</p>
        </section>
      ) : !stats.hasData ? (
        <section className="card">
          <h2>{tr('还没有数据')}</h2>
          <p>{tr('统计从')}<b>{start}</b>{tr('开始算，那天之前的记录不计入。 等这一天到了、并且记了东西，这里就有数了。')}</p>
          <StartPicker start={start} setStart={setStart} />
        </section>
      ) : (
        <>
          <section className="card">
            <div className="card-head">
              <h2>{tr('概览')}</h2>
              <span className="row-gap">
                <Choice value={weeks} setValue={setWeeks} options={WEEK_CHOICES} suffix={tr('周')} />
              </span>
            </div>
            <p className="muted small">
              {stats.fromKey} → {stats.toKey}
              {pick(() => `，共 ${stats.dayCount} 天`, () => `, ${stats.dayCount} days`)}
            </p>
            <Note>
              {tr('日均、占比按天算，全都算进来；趋势和 EWMA 按周算，只用完整的周。')}
            </Note>

            <div className="stat-cards">
              <StatCard
                label={tr('记录率')}
                value={`${Math.round(stats.recordRate * 100)}%`}
                hint={pick(() => `未记录 ${fmtHours(stats.unrecorded)}h`, () => `${fmtHours(stats.unrecorded)}h unlogged`)}
                warn={stats.recordRate < 0.5}
              />
              {stats.categories.slice(0, 3).map((c) => {
                const cmp = compareLatestWeek(c)
                return (
                  <StatCard
                    key={c.key}
                    label={pick(() => `${nameOf(c.key)} 日均`, () => `${nameOf(c.key)} per day`)}
                    value={fmtHm(c.avgPerDay)}
                    color={colorFor(c.key)}
                    hint={
                      cmp
                        ? pick(() => `最近一整周 ${fmtHours(cmp.latest)}h，${cmp.diff >= 0 ? '↑' : '↓'} ${fmtHours(Math.abs(cmp.diff))}h vs 均值`, () => `${fmtHours(cmp.latest)}h last full week, ${cmp.diff >= 0 ? '↑' : '↓'} ${fmtHours(Math.abs(cmp.diff))}h vs average`)
                        : pick(() => `${c.days} 天做过`, () => `${c.days} days done`)
                    }
                  />
                )
              })}
            </div>
            {stats.recordRate < 0.5 && (
              <p className="muted small">{tr('记录率不到一半，下面的数都要打折看。')}</p>
            )}
          </section>

          <section className="card">
            <h2>{tr('每类花了多少（实际 vs 计划）')}</h2>
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
              <b>{tr('实心 = 实际')}</b>{tr('，')}<b>{tr('虚线 = 计划')}</b>{tr('。虚线更长 = 排了没做完。')}</p>
          </section>

          <section className="card">
            <h2>{tr('每周的时间去哪了')}</h2>
            <StackedWeeks weeks={stats.weeks} colorFor={colorFor} nameFor={nameOf} />
            <p className="muted small">
              {tr('灰色是')}<b>{tr('未记录')}</b>{tr('。')}
              {stats.partialWeeks > 0 &&
                pick(
                  () => `带 * 的那根是本周，只过了 ${stats.daysThisWeek} 天。`,
                  () => `The bar marked * is this week, ${stats.daysThisWeek} days in.`,
                )}
            </p>
            <Note>
              {tr('画出未记录，占比才加得到 100% —— 一天记下了多少，是别的数可信不可信的前提。每根柱子按自己那几天算比例，所以长短能比。')}
            </Note>
          </section>

          {focus && (
            <section className="card">
              <div className="card-head">
                <h2>{tr('趋势')}</h2>
                <Choice
                  value={halfLife}
                  setValue={setHalfLife}
                  options={HALF_LIFE_CHOICES}
                  suffix={tr('周半衰期')}
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
                labels={stats.fullWeekKeys}
              />
              <p className="muted small">
                {pick(
                  () =>
                    `${nameOf(focus.key)}：${focus.weekSeries.length} 个完整周平均 ${fmtHours(focus.weekAvg)}h/周，最近 EWMA ${focus.ewma == null ? '—' : `${fmtHours(focus.ewma)}h/周`}。${stats.partialWeeks ? '本周还没过完，不进这张图。' : ''}`,
                  () =>
                    `${nameOf(focus.key)}: ${fmtHours(focus.weekAvg)}h/week across ${focus.weekSeries.length} complete weeks, latest EWMA ${focus.ewma == null ? '—' : `${fmtHours(focus.ewma)}h/week`}.${stats.partialWeeks ? ' This week is not over, so it is left out.' : ''}`,
                )}
              </p>
            </section>
          )}

          <section className="card">
            <div className="card-head">
              <h2>{tr('明细')}</h2>
              {hasFixed && (
                <span className="row-gap">
                  <button
                    className={`chip${freeMode ? '' : ' selected'}`}
                    onClick={() => setFreeMode(false)}
                  >{tr('占全天')}</button>
                  <button
                    className={`chip${freeMode ? ' selected' : ''}`}
                    onClick={() => setFreeMode(true)}
                  >{tr('占自由时间')}</button>
                </span>
              )}
            </div>
            {freeMode && (
              <p className="muted small">
                {pick(
                  () => `自由时间 = 记录下来的时间里，去掉「固定」那几类之后剩的 ${fmtHours(freeTotal)}h。 固定的那几行占比显示「—」。`,
                  () => `Free time = ${fmtHours(freeTotal)}h — what is left after the categories marked fixed. Those rows show “—”.`,
                )}
              </p>
            )}
            <div className="table-scroll">
              <table className="habits-table stats-table">
                <thead>
                  <tr>
                    <th>{tr('分类')}</th>
                    <th>{tr('执行天数')}</th>
                    <th>{tr('总时间')}</th>
                    <th>{tr('日均')}</th>
                    <th>{tr('日最少')}</th>
                    <th>{tr('日最多')}</th>
                    <th>{tr('占比')}</th>
                    <th>{tr('计划')}</th>
                    <th>{tr('差值')}</th>
                    <th>{tr('达成率')}</th>
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
                      <td>
                        {shareOf(c) == null ? (
                          <span className="muted" title={tr('固定开销，不算进自由时间')}>—</span>
                        ) : (
                          `${(shareOf(c) * 100).toFixed(1)}%`
                        )}
                      </td>
                      <td>{fmtHours(c.planned)}h</td>
                      <td className={c.diff < 0 ? 'neg' : ''}>
                        {c.diff >= 0 ? '+' : ''}
                        {fmtHours(c.diff)}h
                      </td>
                      <td>{c.rate == null ? '—' : `${Math.round(c.rate * 100)}%`}</td>
                    </tr>
                  ))}
                  <tr className="stats-total">
                    <td>{tr('未记录')}</td>
                    <td>—</td>
                    <td>{fmtHours(stats.unrecorded)}h</td>
                    <td colSpan="3">—</td>
                    <td>
                      {freeMode ? '—' : `${((stats.unrecorded / stats.capacity) * 100).toFixed(1)}%`}
                    </td>
                    <td colSpan="3">—</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <Note>
              <b>{tr('日均 = 总时间 ÷ 执行天数')}</b>{tr('（不是除以日历天数）。 日最少/最多也只在做过的那些天里取 —— 不然只要有一天没做， 最少永远是 0，这个数就废了。')}<b>{tr('达成率')}</b>{tr('对从来没排过计划的显示「—」。')}</Note>
          </section>

          <TodoHabitStats planner={planner} />

          <section className="card">
            <h2>{tr('统计起点')}</h2>
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

/**
 * 「为什么这么算」这类说明一律收进折叠。
 *
 * 统计页原来有四段 60–90 字的小字，每张卡下面挂一段。第一次看有用，
 * 之后每次进来都得从它们中间跳过去找数字 —— 而这一页是来看数的。
 * 默认收起，点一下展开。
 */
function Note({ children }) {
  return (
    <details className="stat-note">
      <summary>{tr('怎么算的')}</summary>
      <p className="muted small">{children}</p>
    </details>
  )
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
      <label htmlFor="stats-start" className="grow">{tr('从哪天开始算')}</label>
      <input
        id="stats-start"
        type="date"
        value={start}
        onChange={(e) => e.target.value && setStart(e.target.value)}
      />
      <p className="muted small">{tr('这天之前的记录不计入。存在本机，换设备要再设一次。')}</p>
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

  /**
   * 只数到**今天**为止，后面几天不进分母。
   *
   * 这里的待办大多是每天重复的记录项（三餐这类），周一一早模板就把整周
   * 七天的都生成好了。全周进分母的话，周一看永远是 0/47 —— 那不是「没做」，
   * 是「还没到」。一个每周一都必然显示 0% 的数字，看一次就不会再看第二次。
   *
   * 看过去的周时 today 落在这一周之后，`<= today` 自然把整周都放进来，
   * 不用另写一套。
   */
  const today = dateKey(new Date())
  const pending = entries.filter((e) => !e.planned_start && !e.actual_start)
  const todos = pending.filter((e) => e.date <= today)
  const upcoming = pending.length - todos.length

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
      <h2>{tr('待办 / 习惯（本周）')}</h2>
      <Note>
        {pick(
          () => `这两块只看完成度、没有时间，所以和上面的时间统计分开。本周（${days.length} 天）只算到今天为止，后面没到的那几天不进分母。`,
          () =>
            `These two only track completion, with no times, so they are kept apart from the hours above. This week (${days.length} days), counted up to today — days that have not arrived stay out of the denominator.`,
        )}
      </Note>
      <div className="stat-cards">
        <StatCard
          label={tr('待办完成')}
          value={`${todoDone}/${todos.length}`}
          hint={
            todos.length
              ? pick(
                  () => `${Math.round((todoDone / todos.length) * 100)}%${upcoming ? `，后面还有 ${upcoming} 条` : ''}`,
                  () => `${Math.round((todoDone / todos.length) * 100)}%${upcoming ? `, ${upcoming} still to come` : ''}`,
                )
              : upcoming
                ? pick(() => `本周还有 ${upcoming} 条没到`, () => `${upcoming} coming later this week`)
                : tr('本周没有待办')
          }
        />
        {habitRows.map((h) => (
          <StatCard
            key={h.id}
            label={h.title}
            color={h.color}
            value={`${h.done}/${h.logged || 0}`}
            hint={h.logged ? pick(() => `平均 ${Math.round(h.avg)}%`, () => `${Math.round(h.avg)}% avg`) : tr('还没打卡')}
          />
        ))}
      </div>
    </section>
  )
}
