import { useCallback, useRef, useState } from 'react'

/** 拖动吸附到 5 分钟，免得拖出 14:07 这种时间。 */
const SNAP = 5
/** 长按多久算「打开编辑」。 */
const LONG_PRESS_MS = 480
/** 手指抖这么多像素之内还算长按，超过就当成拖动。 */
const LONG_PRESS_SLOP = 8

const snap = (m) => Math.round(m / SNAP) * SNAP

/**
 * 时间块的拖动 / 拉伸 / 长按。
 *
 * 用 Pointer Events 而不是 HTML5 drag-and-drop —— 后者在触摸屏上根本不触发。
 *
 * 手机上不能整块都能拖：整块 touch-action:none 的话，手指落在块上就没法
 * 滚页面了，而 24 小时的时间轴很长、块又多。所以只有块左边那道竖条
 * （移动）和底边那道横条（改时长）是拖动区。
 *
 * 一次拖动可以带动多个块：
 *  - 选中了好几个 -> 一起平移
 *  - 只拖一个而且开着「顺延」-> 它后面的块跟着挪同样的量
 * 拖动过程中只算本地位移，松手才写库。
 */
export function useDragBlock({ hourPx, onCommit, onLongPress }) {
  const [drag, setDrag] = useState(null) // { ids:Map<id,{startMin,endMin}>, mode }
  const origin = useRef(null)
  const timer = useRef(null)

  const clearTimer = () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
  }

  /**
   * @param members [{ id, startMin, endMin }] 这次要一起动的块（第一个是被抓住的）
   */
  const begin = useCallback((event, { mode, members }) => {
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture?.(event.pointerId)
    origin.current = {
      y: event.clientY,
      mode,
      members,
      moved: false,
      pressId: members[0]?.id,
    }
    setDrag({ mode, members })

    if (onLongPress) {
      clearTimer()
      timer.current = setTimeout(() => {
        const from = origin.current
        if (!from || from.moved) return
        origin.current = null
        setDrag(null)
        onLongPress(from.pressId)
      }, LONG_PRESS_MS)
    }
  }, [onLongPress])

  const move = useCallback(
    (event) => {
      const from = origin.current
      if (!from) return
      const dy = event.clientY - from.y
      if (!from.moved && Math.abs(dy) > LONG_PRESS_SLOP) {
        from.moved = true
        clearTimer()
      }
      if (!from.moved) return

      const deltaMin = snap((dy / hourPx) * 60)
      const members = from.members.map((m, i) =>
        from.mode === 'resize' && i === 0
          ? // 拉伸只动被抓住那个块的结束时间，至少留 5 分钟
            { ...m, endMin: Math.max(m.startMin + SNAP, m.endMin + deltaMin) }
          : // 平移：允许拖过 24 点，超过也没关系，自己再调
            { ...m, startMin: m.startMin + deltaMin, endMin: m.endMin + deltaMin },
      )
      setDrag({ mode: from.mode, members })
    },
    [hourPx],
  )

  const end = useCallback(() => {
    const from = origin.current
    const current = drag
    origin.current = null
    clearTimer()
    setDrag(null)
    if (!from || !current || !from.moved) return

    const changed = current.members.filter((m, i) => {
      const before = from.members[i]
      return m.startMin !== before.startMin || m.endMin !== before.endMin
    })
    if (changed.length) onCommit(changed, from.mode)
  }, [drag, onCommit])

  /** 拖动中的块用这个覆盖它的时间，其它块原样。 */
  const overlay = useCallback(
    (id) => drag?.members.find((m) => m.id === id) ?? null,
    [drag],
  )

  return {
    isDragging: Boolean(drag),
    overlay,
    handlers: { onPointerMove: move, onPointerUp: end, onPointerCancel: end },
    begin,
  }
}
