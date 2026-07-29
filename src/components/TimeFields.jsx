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
 */
export default function TimeFields({ id, label, value, onChange, hint }) {
  const [text, setText] = useState(() => ({
    start: formatClock(value.start),
    end: formatClock(value.end),
    duration: formatDuration(value.duration),
  }))
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
    setText((prev) => ({
      ...prev,
      [field]:
        field === 'duration' ? formatDuration(value.duration) : formatClock(value[field]),
    }))
  }

  const field = (name, labelText, placeholder, mode) => (
    <div>
      <label htmlFor={`${id}-${name}`}>{labelText}</label>
      <input
        id={`${id}-${name}`}
        inputMode={mode}
        autoComplete="off"
        placeholder={placeholder}
        value={text[name]}
        onChange={handle(name)}
        onBlur={blur(name)}
      />
    </div>
  )

  return (
    <fieldset className="time-fields">
      <legend>{label}</legend>
      <div className="time-row">
        {field('start', '开始', '9:30', 'numeric')}
        {field('end', '结束', '11:00', 'numeric')}
        {field('duration', '时长', '1:30', 'text')}
      </div>
      <p className="muted small">
        {value.duration ? `共 ${describeDuration(value.duration)}。` : ''}
        {hint ?? '填两个就行，第三个自动算。9 / 930 / 9:30 都认，时长可以写 90 或 1.5h。'}
      </p>
    </fieldset>
  )
}
