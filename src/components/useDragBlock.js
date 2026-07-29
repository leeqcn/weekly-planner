import { useCallback, useRef, useState } from 'react'

/** 拖动吸附到 5 分钟，免得拖出 14:07 这种时间。 */
const SNAP = 5

const snap = (m) => Math.round(m / SNAP) * SNAP

/**
 * 时间块的拖动 / 拉伸。
 *
 * 用 Pointer Events 而不是 HTML5 drag-and-drop —— 后者在触摸屏上根本不触发。
 *
 * 手机上不能整块都能拖：整块 touch-action:none 的话，手指落在块上就没法
 * 滚页面了，而 24 小时的时间轴很长、块又多。所以只有块左边那道竖条
 * （移动）和底边那道横条（改时长）是拖动区，块的其余部分照常点击和滚动。
 *
 * 拖动过程中只改本地状态，松手才写库 —— 中途每帧都写数据库没有意义。
 */
export function useDragBlock({ hourPx, onCommit }) {
  const [drag, setDrag] = useState(null) // { id, mode, startMin, endMin }
  const origin = useRef(null)

  const begin = useCallback((event, { id, mode, startMin, endMin }) => {
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture?.(event.pointerId)
    origin.current = { y: event.clientY, startMin, endMin, id, mode }
    setDrag({ id, mode, startMin, endMin })
  }, [])

  const move = useCallback(
    (event) => {
      const from = origin.current
      if (!from) return
      const deltaMin = ((event.clientY - from.y) / hourPx) * 60
      const length = from.endMin - from.startMin

      if (from.mode === 'move') {
        // 允许拖过 24 点 —— 超过也没关系，自己再调
        const startMin = snap(from.startMin + deltaMin)
        setDrag({ id: from.id, mode: from.mode, startMin, endMin: startMin + length })
      } else {
        // 拉伸只动结束时间，至少留 5 分钟
        const endMin = Math.max(from.startMin + SNAP, snap(from.endMin + deltaMin))
        setDrag({ id: from.id, mode: from.mode, startMin: from.startMin, endMin })
      }
    },
    [hourPx],
  )

  const end = useCallback(() => {
    const from = origin.current
    const current = drag
    origin.current = null
    setDrag(null)
    if (!from || !current) return
    if (current.startMin === from.startMin && current.endMin === from.endMin) return
    onCommit(from.id, current.startMin, current.endMin)
  }, [drag, onCommit])

  /** 拖动中的块用这个覆盖它的时间，其它块原样。 */
  const overlay = useCallback((id) => (drag && drag.id === id ? drag : null), [drag])

  return {
    dragging: drag,
    isDragging: Boolean(drag),
    overlay,
    handlers: { onPointerMove: move, onPointerUp: end, onPointerCancel: end },
    begin,
  }
}
