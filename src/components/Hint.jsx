import { useSyncExternalStore } from 'react'
import { getHints, setHints, subscribeHints } from '../lib/prefs'
import { tr } from '../lib/i18n'

/**
 * 「怎么用」那一类说明。头几天有用，熟了就是占地方 —— 一个开关全部收起，
 * 每段右边也直接给个「不再显示」，不用先想起来去设置里找。
 *
 * **只包操作教学，不包数据说明。** 「日均 = 总时间 ÷ 执行天数」
 * 「灰色是未记录」「纵轴不从 0 开始」这些不是教学，是防止把数字看错的注解，
 * 用一年也还需要，关掉反而有害。
 */
export default function Hint({ children }) {
  const on = useSyncExternalStore(subscribeHints, getHints, getHints)
  if (!on) return null
  return (
    <p className="muted small hint">
      <button
        className="hint-x"
        onClick={() => setHints(false)}
        title={tr('以后不再显示这些操作说明（右上角齿轮里可以打开）')}
      >
        ×
      </button>
      {children}
    </p>
  )
}
