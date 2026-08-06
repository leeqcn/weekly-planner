/**
 * 把「屏幕上真正看得见的那块」量出来，写成 CSS 变量。
 *
 * 为什么需要：手机上键盘弹出时，**布局视口不缩**（iOS 尤其如此）。
 * `position: fixed; inset: 0` 盖的是布局视口，于是弹窗照样按整屏居中，
 * 底下那条「保存」正好落在键盘后面 —— 每次改时间都得先收键盘才能存。
 *
 * visualViewport 量的才是可见区域：键盘一弹，它的 height 变小、
 * offsetTop 可能上移。把这两个值交给 CSS，弹窗就只在看得见的地方铺开。
 *
 * 没有 visualViewport 的浏览器（很老的）什么都不做，CSS 里有兜底值。
 */
export function trackVisualViewport() {
  const vv = window.visualViewport
  if (!vv) return () => {}

  const apply = () => {
    const s = document.documentElement.style
    s.setProperty('--vv-h', `${Math.round(vv.height)}px`)
    s.setProperty('--vv-top', `${Math.round(vv.offsetTop)}px`)
  }

  apply()
  vv.addEventListener('resize', apply)
  // 键盘弹出时页面常常跟着滚一段，offsetTop 会变，得一起跟
  vv.addEventListener('scroll', apply)
  return () => {
    vv.removeEventListener('resize', apply)
    vv.removeEventListener('scroll', apply)
  }
}
