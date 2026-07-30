/**
 * 打卡颜色规则 —— 只在前端计算，数据库只存 completion_pct。
 *   >= 100 绿 "nice" / >= 50 黄 "okay" / < 50 红 "keep going"
 *
 * 配色是莫兰迪的，饱和度低，中间调压白字看不清 ——
 * 所以每档给「淡底 + 深字」一对，谁做背景谁做文字由调用方决定。
 */
export function habitStatus(pct) {
  const value = Number(pct) || 0
  if (value >= 100)
    return { level: 'nice', label: 'nice', bg: 'var(--ok-bg)', ink: 'var(--ok-ink)', edge: 'var(--ok)' }
  if (value >= 50)
    return { level: 'okay', label: 'okay', bg: 'var(--warn-bg)', ink: 'var(--warn-ink)', edge: 'var(--warn)' }
  return { level: 'low', label: 'keep going', bg: 'var(--bad-bg)', ink: 'var(--bad-ink)', edge: 'var(--bad)' }
}
