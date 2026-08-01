import { useEffect, useState } from 'react'
import { colorOf } from '../lib/colors'
import { describeRange } from '../lib/schedule'
import { formatClock } from '../lib/time'
import { placementMinutes } from '../lib/place'
import CategoryPicker from './CategoryPicker'

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
        <h2>
          {formatClock(start)} 起，加到「{isActual ? '实际' : '计划'}」
        </h2>
        <p className="muted small">
          时间不对没关系，加上去之后拖块左边的竖条挪、拖底边改时长。
        </p>

        {now != null && now !== start && (
          <button type="button" className="ghost small-btn" onClick={() => setStart(now)}>
            改成现在 {formatClock(now)}
          </button>
        )}

        {candidates.length > 0 && (
          <div className="quick-group">
            <label>今天还没{isActual ? '记的' : '排的'}</label>
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
          <label htmlFor="quick-title">新加一件</label>
          <div className="quick-new">
            <div className="quick-title-cell">
              <input
                id="quick-title"
                value={title}
                // 有候选列表时不抢焦点：手机上键盘一弹就把列表盖住了
                autoFocus={candidates.length === 0}
                autoComplete="off"
                placeholder={isActual ? '做了什么' : '要做什么'}
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
              aria-label="时长（分钟）"
              onChange={(e) => setMinutes(e.target.value)}
            />
            <span className="muted small">分钟</span>
            <button type="submit" className="primary" disabled={!title.trim()}>
              加上
            </button>
          </div>
          <CategoryPicker
            value={categoryId}
            categories={categories}
            onChange={setCategoryId}
            label="归到哪一类（统计用）"
          />
        </form>

        <div className="modal-actions">
          <span className="spacer" />
          <button type="button" className="ghost" onClick={onClose}>
            取消
          </button>
        </div>
      </div>
    </div>
  )
}
