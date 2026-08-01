import { useEffect, useRef, useState } from 'react'
import {
  describeDuration,
  formatClock,
  formatDuration,
  parseClock,
  parseDuration,
  reconcile,
} from '../lib/time'

/**
 * 开始 / 结束 / 时长三个输入框，填两个自动算第三个。
 * 全部手打，没有时钟控件 —— 手机上点那个转盘太慢。
 *
 * 输入框里存的是「你打的原文」，不是格式化后的值：正在打的那一格不去动它，
 * 只在失焦时补成 09:30 这种写法。不然打「930」在打完「9」的瞬间
 * 就被规范成「09:00」，光标也跟着跳，根本没法输入。
 *
 * value: { start, end, duration }，分钟数或 null
 * suggest: 分钟数。传了的话，点开始/结束会浮出「现在 15:42 · OK」，
 *          一下填好 —— 记实际时间时几乎总是「就是现在」，不该还要手打。
 * autoFocusField: 光标默认落在哪一格。计划落「开始」、实际落「结束」，
 *          因为改计划通常是挪起点，而记实际是补上「几点做完的」。
 *          聚焦那一下「现在」浮层就会跟着出来，等于少点一次。
 */
export default function TimeFields({
  id,
  label,
  value,
  onChange,
  hint,
  suggest,
  tone,
  /** 'start' | 'end' | null —— 光标默认落在哪一格 */
  autoFocusField,
}) {
  const [text, setText] = useState(() => ({
    start: formatClock(value.start),
    end: formatClock(value.end),
    duration: formatDuration(value.duration),
  }))
  const [focused, setFocused] = useState(null)
  const editing = useRef(null)

  // 外部值变了（联动算出来的、或换了一条记录），刷新没在编辑的那两格
  useEffect(() => {
    setText((prev) => ({
      start: editing.current === 'start' ? prev.start : formatClock(value.start),
      end: editing.current === 'end' ? prev.end : formatClock(value.end),
      duration:
        editing.current === 'duration' ? prev.duration : formatDuration(value.duration),
    }))
  }, [value.start, value.end, value.duration])

  const handle = (field) => (event) => {
    const raw = event.target.value
    editing.current = field
    setText((prev) => ({ ...prev, [field]: raw }))

    if (raw.trim() === '') {
      onChange({ ...value, [field]: null })
      return
    }
    const parsed = field === 'duration' ? parseDuration(raw) : parseClock(raw)
    if (parsed === null) return // 还没打完，先别动另外两格
    onChange(reconcile(field, { ...value, [field]: parsed }))
  }

  const blur = (field) => () => {
    editing.current = null
    setFocused((f) => (f === field ? null : f))
    setText((prev) => ({
      ...prev,
      [field]:
        field === 'duration' ? formatDuration(value.duration) : formatClock(value[field]),
    }))
  }

  /**
   * 「现在」一键填进这一格，另外两格跟着算。
   *
   * 这里不能直接套 reconcile 的默认偏好：它优先保住**时长**（手打计划时是对的，
   * 改开始时间等于整块平移），可在这儿会把另一头顶跑 ——
   * 实际做完 9:40–18:00 的事，点开始填「现在 19:42」，结束会被推到次日 04:02。
   * 「现在」是真实发生的时刻，另一头如果也填了，那也是真的，该保住的是它。
   */
  const fillNow = (field) => {
    const other = field === 'start' ? 'end' : 'start'
    const has = value[other] !== null && value[other] !== undefined
    // 另一头填了、而且和「现在」还构成一个正常的区间，就保住它、重算时长；
    // 反过来（比如给一条 9:40–18:00 的记录把开始改成 19:42）区间就颠倒了，
    // 与其存下 19:42–18:00 这种不可能的时间，不如把另一头清掉让人重填
    const sane = has && (field === 'start' ? suggest <= value.end : suggest >= value.start)
    setText((prev) => ({
      ...prev,
      [field]: formatClock(suggest),
      ...(has && !sane ? { [other]: '', duration: '' } : {}),
    }))
    onChange(
      sane
        ? reconcile(field, { ...value, [field]: suggest, duration: null })
        : { start: null, end: null, duration: null, [field]: suggest },
    )
  }

  const field = (name, labelText, placeholder, mode) => (
    <div className="time-cell">
      <label htmlFor={`${id}-${name}`}>{labelText}</label>
      <input
        id={`${id}-${name}`}
        inputMode={mode}
        autoComplete="off"
        autoFocus={autoFocusField === name}
        placeholder={placeholder}
        value={text[name]}
        onChange={handle(name)}
        onFocus={() => setFocused(name)}
        onBlur={blur(name)}
      />
      {suggest != null && name !== 'duration' && focused === name && (
        <div className="now-pop">
          <span>现在 {formatClock(suggest)}</span>
          {/* pointerdown 而不是 click：click 之前输入框会先失焦，
              手机上那一下会把浮层收掉，点不中 */}
          <button
            type="button"
            className="primary"
            onPointerDown={(e) => {
              e.preventDefault()
              fillNow(name)
            }}
          >
            OK
          </button>
        </div>
      )}
    </div>
  )

  return (
    <fieldset className={`time-fields${tone ? ` tone-${tone}` : ''}`}>
      <legend>{label}</legend>
      <div className="time-row">
        {/* 占位符故意写成 --:--：之前用「9:30」这种真时间，
            看一眼分不清是自己填的还是提示 */}
        {field('start', '开始', '--:--', 'numeric')}
        {field('end', '结束', '--:--', 'numeric')}
        {field('duration', '时长', '--:--', 'text')}
      </div>
      <p className="muted small">
        {value.duration ? `共 ${describeDuration(value.duration)}。` : ''}
        {hint ?? '填两个就行，第三个自动算。9 / 930 / 9:30 都认，时长可以写 90 或 1.5h。'}
      </p>
    </fieldset>
  )
}
