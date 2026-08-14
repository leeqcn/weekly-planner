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
export function useDragBlock({ hourPx, onCommit, onLongPress, onTap }) {
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
      pressField: members[0]?.field,
    }
    setDrag({ mode, members })

    if (onLongPress) {
      clearTimer()
      timer.current = setTimeout(() => {
        const from = origin.current
        if (!from || from.moved) return
        origin.current = null
        setDrag(null)
        // 带上是哪一栏：编辑器要把对应那组时间放到最上面
        onLongPress(from.pressId, from.pressField)
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
    if (!from) return

    /**
     * 按下把手又马上松开 —— 没拖动，也没按住不放。那就是「点了这个块」。
     *
     * 不这么做的话，把手和底边那两条是**点不动的死区**：pointerdown 里
     * preventDefault 了，浏览器不会再补一个 click，块身上的单击/双击
     * 一概收不到。半小时的块只有 26px 高，底边那条就占 8px —— 三成的
     * 面积按下去毫无反应。手指两下里有一下落进死区，看到的就是
     * 「双击第一次不行，第二次才成功」。
     */
    if (!from.moved) {
      onTap?.(from.pressId, from.pressField)
      return
    }
    if (!current) return

    const changed = current.members.filter((m, i) => {
      const before = from.members[i]
      return m.startMin !== before.startMin || m.endMin !== before.endMin
    })
    if (changed.length) onCommit(changed, from.mode)
  }, [drag, onCommit, onTap])

  /**
   * 拖动中的块用这个覆盖它的时间，其它块原样。
   *
   * 必须按 (id, 哪一栏) 一起找，光按 id 不行 ——
   * 同一条日程在 Plan 和 Actually 两栏各有一个块、id 相同，
   * 只按 id 匹配的话拖右边那个，左边的计划块会跟着一起动。
   */
  const overlay = useCallback(
    (id, field) => drag?.members.find((m) => m.id === id && m.field === field) ?? null,
    [drag],
  )

  return {
    isDragging: Boolean(drag),
    overlay,
    handlers: { onPointerMove: move, onPointerUp: end, onPointerCancel: end },
    begin,
  }
}
