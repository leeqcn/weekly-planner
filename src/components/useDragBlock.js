import { useCallback, useRef, useState } from 'react'

/** 拖动吸附到 5 分钟，免得拖出 14:07 这种时间。 */
const SNAP = 5
/** 长按多久算「打开编辑」。 */
const LONG_PRESS_MS = 480
/** 手指抖这么多像素之内还算长按，超过就当成拖动。 */
const LONG_PRESS_SLOP = 8
/**
 * 松手时回头看：整个过程没超出这么多像素的，算「点了一下」，不算拖动。
 *
 * 和上面那个 8px 是两件事。8px 决定**块什么时候开始跟着手指走**（要跟手，
 * 所以小）；这个 12px 决定**松手之后算不算数**。把手才 13px 宽、底边那条
 * 才 8px 高，拇指点上去晃个十来像素是常事 —— 只按 8px 判的话，你只是想
 * 点一下，块被悄悄挪了 10 分钟，看起来就像「点了没反应」。
 *
 * 两边判错的代价不对等：误判成点击最多是多选中一下，误判成拖动是**改了数据
 * 而且没人告诉你**。所以这个值取得比 8 宽松。
 */
const TAP_SLOP = 12

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
      maxDy: 0,
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
      from.maxDy = Math.max(from.maxDy, Math.abs(dy))
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
     * 按下把手，没走远就松开了 —— 那就是「点了这个块」，不是拖动。
     *
     * 不这么判的话，把手和底边那两条是**点不动的死区**：pointerdown 里
     * preventDefault 了，浏览器不会再补一个 click，块身上的单击/双击
     * 一概收不到。半小时的块只有 26px 高，底边那条就占 8px —— 三成的
     * 面积按下去毫无反应。
     *
     * 而且只看「有没有超过 8px」也不够：把手才 13px 宽，拇指点上去晃个
     * 十来像素很正常，判成拖动就把块悄悄挪了 10 分钟 —— 用起来同样是
     * 「点了没反应」，只是这回还改了数据。所以按 TAP_SLOP 回头再判一次。
     */
    if (from.maxDy <= TAP_SLOP) {
      // 中途可能已经跟着手指挪了几像素，这里直接丢掉不写库 —— setDrag(null)
      // 上面已经做了，块自己弹回原位
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
