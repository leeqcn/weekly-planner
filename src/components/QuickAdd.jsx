import { useEffect, useState } from 'react'
import { colorOf } from '../lib/colors'
import { describeRange } from '../lib/schedule'
import { formatClock, parseClock } from '../lib/time'
import { placementMinutes } from '../lib/place'
import CategoryPicker from './CategoryPicker'
import { pick, tr } from '../lib/i18n'
import Hint from './Hint'

const DEFAULT_MINUTES = 60
/** 自动补全最多给几条。给多了就成了另一个要读的列表。 */
const MAX_SUGGEST = 5

/**
 * 时间轴上「在这儿加一条」的快捷浮层。
 *
 * 走完整编辑器太慢：下班之后的活动本来就没计划，为了记一条「去超市了」
 * 要先点「＋ 只记实际」、再打标题、再填两个时间。这里两下就完：
 * 从今天还没安排的事里挑一件，或者直接写一个新的。
 *
 * 时长不准无所谓 —— 加上去之后拖块底边就能改，那本来就是这个 app 调时间的方式。
 *
 * @param field 'planned' | 'actual' —— 加到哪一栏
 * @param at    起始分钟数（长按的位置）
 * @param now   今天的第几分钟，没有就传 null
 */
export default function QuickAdd({
  field,
  at,
  /** 手指实际按下去的那个时间，和默认值不一定一样 —— 给一个「改用它」的按钮 */
  pressedAt,
  now,
  candidates,
  recent = [],
  categories = [],
  resolveColor,
  onPick,
  onCreate,
  onClose,
}) {
  const [start, setStart] = useState(at)
  // 输入框里存原文，只在失焦时规范成 09:30 —— 和 TimeFields 一个道理，
  // 边打边格式化的话打「930」在打完「9」的瞬间就被改成「09:00」了
  const [startText, setStartText] = useState(() => formatClock(at))
  const [title, setTitle] = useState('')
  const [minutes, setMinutes] = useState(String(DEFAULT_MINUTES))
  const [categoryId, setCategoryId] = useState(null)
  const [picking, setPicking] = useState(false)
  // 长按开出来的浮层：手指抬起那一下的 click 会落在背景上，
  // 不挡一下的话刚开就被自己关掉了
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setArmed(true), 350)
    return () => clearTimeout(t)
  }, [])

  const isActual = field === 'actual'
  const dur = Math.max(5, Number(minutes) || DEFAULT_MINUTES)

  // 自动补全而不是下拉框：用过的标题几十条，一次全列出来没法看。
  // 打两个字才开始筛 —— 一个字的候选太多，等于没筛。
  const query = title.trim().toLowerCase()
  const suggestions =
    query.length >= 2 && picking
      ? recent
          .filter((r) => r.title.toLowerCase().includes(query) && r.title !== title.trim())
          .slice(0, MAX_SUGGEST)
      : []

  const setStartBoth = (min) => {
    setStart(min)
    setStartText(formatClock(min))
  }

  const applySuggestion = (s) => {
    setTitle(s.title)
    if (s.minutes) setMinutes(String(s.minutes))
    if (s.categoryId) setCategoryId(s.categoryId)
    setPicking(false)
  }

  const submit = (event) => {
    event.preventDefault()
    if (title.trim()) onCreate(title.trim(), dur, start, categoryId)
  }

  return (
    <div className="modal-backdrop" onClick={() => armed && onClose()}>
      <div className="card modal quick-add" onClick={(e) => e.stopPropagation()}>
        <h2>{pick(() => `加到「${isActual ? '实际' : '计划'}」`, () => `Add to ${isActual ? 'Actually' : 'Plan'}`)}</h2>

        {/* 开始时间做成可以打的输入框。手指在手机上根本点不准，
            光靠按下去那个位置定时间太碰运气；默认值也不用手指位置，
            用**上一件事的结束时间**，因为绝大多数时候下一件就是接着上一件做的 */}
        <div className="quick-start">
          <label htmlFor="quick-start">{tr('几点开始')}</label>
          <input
            id="quick-start"
            inputMode="numeric"
            autoComplete="off"
            value={startText}
            onChange={(e) => {
              setStartText(e.target.value)
              const p = parseClock(e.target.value)
              if (p !== null) setStart(p)
            }}
            onBlur={() => setStartText(formatClock(start))}
          />
          {now != null && now !== start && (
            <button type="button" className="ghost small-btn" onClick={() => setStartBoth(now)}>
              {pick(() => `现在 ${formatClock(now)}`, () => `now ${formatClock(now)}`)}
            </button>
          )}
          {pressedAt != null && pressedAt !== start && (
            <button
              type="button"
              className="ghost small-btn"
              onClick={() => setStartBoth(pressedAt)}
              title={tr('改用刚才按下去的那个位置')}
            >
              {pick(() => `按的位置 ${formatClock(pressedAt)}`, () => `where you pressed: ${formatClock(pressedAt)}`)}
            </button>
          )}
        </div>
        <Hint>{tr('9 / 930 / 9:30 都认。时长不对也没关系，加上去之后拖块底边就能改。')}</Hint>

        {candidates.length > 0 && (
          <div className="quick-group">
            <label>
            {pick(
              () => `今天还没${isActual ? '记的' : '排的'}`,
              () => (isActual ? 'Not logged yet today' : 'Not scheduled yet today'),
            )}
          </label>
            <div className="quick-list">
              {candidates.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  className="quick-row"
                  onClick={() => onPick(e, start)}
                >
                  <span
                    className="row-dot"
                    style={{ background: colorOf(resolveColor(e)).dot }}
                    aria-hidden="true"
                  />
                  <span className="quick-title">{e.title}</span>
                  <span className="muted small">
                    {describeRange(e) || `${placementMinutes(e)}′`}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <form className="quick-group" onSubmit={submit}>
          <label htmlFor="quick-title">{tr('新加一件')}</label>
          <div className="quick-new">
            <div className="quick-title-cell">
              <input
                id="quick-title"
                value={title}
                // 有候选列表时不抢焦点：手机上键盘一弹就把列表盖住了
                autoFocus={candidates.length === 0}
                autoComplete="off"
                placeholder={isActual ? tr('做了什么') : tr('要做什么')}
                onChange={(e) => {
                  setTitle(e.target.value)
                  setPicking(true)
                }}
              />
              {suggestions.length > 0 && (
                <div className="suggest-pop">
                  {suggestions.map((s) => (
                    <button
                      key={s.title}
                      type="button"
                      className="suggest-row"
                      // pointerdown 而不是 click：click 之前输入框会先失焦，
                      // 手机上那一下会把浮层收掉，点不中
                      onPointerDown={(e) => {
                        e.preventDefault()
                        applySuggestion(s)
                      }}
                    >
                      <span className="quick-title">{s.title}</span>
                      {s.minutes ? <span className="muted small">{s.minutes}′</span> : null}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <input
              className="quick-dur"
              inputMode="numeric"
              value={minutes}
              aria-label={tr('时长（分钟）')}
              onChange={(e) => setMinutes(e.target.value)}
            />
            <span className="muted small">{tr('分钟')}</span>
            <button type="submit" className="primary" disabled={!title.trim()}>{tr('加上')}</button>
          </div>
          <CategoryPicker
            value={categoryId}
            categories={categories}
            onChange={setCategoryId}
            label={tr('归到哪一类（统计用）')}
          />
        </form>

        <div className="modal-actions">
          <span className="spacer" />
          <button type="button" className="ghost" onClick={onClose}>{tr('取消')}</button>
        </div>
      </div>
    </div>
  )
}
