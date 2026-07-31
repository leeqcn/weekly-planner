import { useCallback, useEffect, useRef, useState } from 'react'

/** 长按多久算「在这儿加一条」。比块上的长按稍长一点，误开的代价更大。 */
const HOLD_MS = 520
/** 按到这个时候先画一道提示线 —— 不然这个手势完全看不见，按着不知道有没有反应。 */
const HINT_MS = 200
/** 手指抖这么多像素之内还算长按，超过就当成在滚页面。 */
const SLOP = 8
const SNAP = 5

/**
 * 时间轴**空白处**长按 = 「在这儿加一条」。
 *
 * 不做成单击：24 小时的时间轴很长，手机上滚页面时手指落在时间轴上是常事，
 * 单击会一路误开。长按 520ms 才认，中途手一动就取消。
 *
 * 不碰 touch-action，也不 preventDefault —— 空白处必须能照常滚页面，
 * 这是块上那两道窄拖动条存在的同一个理由。
 */
export function useEmptyPress({ hourPx, onOpen }) {
  const [hint, setHint] = useState(null) // { field, at }
  const press = useRef(null)

  const cancel = useCallback(() => {
    if (press.current) {
      clearTimeout(press.current.hold)
      clearTimeout(press.current.hintTimer)
      press.current = null
    }
    setHint(null)
  }, [])

  useEffect(() => cancel, [cancel])

  const begin = useCallback(
    (event, field) => {
      // 只认落在空白列上的按压；落在块上的由块自己的把手处理
      if (event.target !== event.currentTarget) return
      const rect = event.currentTarget.getBoundingClientRect()
      const raw = ((event.clientY - rect.top) / hourPx) * 60
      const at = Math.min(1440 - SNAP, Math.max(0, Math.round(raw / SNAP) * SNAP))
      cancel()
      press.current = {
        y: event.clientY,
        hintTimer: setTimeout(() => setHint({ field, at }), HINT_MS),
        hold: setTimeout(() => {
          cancel()
          onOpen(field, at)
        }, HOLD_MS),
      }
    },
    [hourPx, cancel, onOpen],
  )

  const move = useCallback(
    (event) => {
      if (press.current && Math.abs(event.clientY - press.current.y) > SLOP) cancel()
    },
    [cancel],
  )

  return { hint, begin, move, cancel }
}
