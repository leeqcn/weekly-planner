/**
 * 打卡颜色规则 —— 只在前端计算，数据库只存 completion_pct。
 *   >= 100 绿 "nice" / >= 50 黄 "okay" / < 50 红 "keep going"
 */
export function habitStatus(pct) {
  const value = Number(pct) || 0
  if (value >= 100) return { level: 'nice', label: 'nice', color: 'var(--ok)' }
  if (value >= 50) return { level: 'okay', label: 'okay', color: 'var(--warn)' }
  return { level: 'low', label: 'keep going', color: 'var(--bad)' }
}
