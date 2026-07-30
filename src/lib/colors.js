/**
 * 事项配色 —— 莫兰迪：低饱和、掺灰的粉调，不刺眼。
 * 不选就是默认的莫兰迪橙（陶土色），选了就用这一组。
 *
 * 每个色三档：
 *   block 块的底色（很淡，上面要压深色的字）
 *   edge  描边
 *   dot   实心的小圆点 / 选色器
 */
export const COLORS = {
  default: { label: '陶土橙', block: '#f6e5d7', edge: '#dfbb9d', dot: '#c07a4b' },
  clay: { label: '砖红', block: '#efdfd9', edge: '#d6b3a8', dot: '#b57a6b' },
  ochre: { label: '赭黄', block: '#f2eada', edge: '#d8c79f', dot: '#bb9a56' },
  sage: { label: '鼠尾草', block: '#e2eae1', edge: '#b7c9b6', dot: '#7f9c81' },
  teal: { label: '青灰', block: '#dfe9e7', edge: '#b0c6c2', dot: '#78a09a' },
  mist: { label: '雾蓝', block: '#e3eaef', edge: '#b6c7d3', dot: '#7d9bad' },
  lilac: { label: '丁香', block: '#e8e4ee', edge: '#c3bbd2', dot: '#8b82a6' },
  stone: { label: '灰', block: '#e9e6e1', edge: '#c7c1b9', dot: '#97918a' },
}

export const COLOR_KEYS = Object.keys(COLORS)

export const colorOf = (key) => COLORS[key] ?? COLORS.default

/**
 * 一条日程该用什么颜色。
 *
 * 颜色是表现层的东西，**不往条目上复制** —— 复制过就成了快照，
 * 之后改模板不会回头更新已经生成的条目（这正是之前那个 bug）。
 * 所以：条目自己填了颜色算「单独改过这一条」，优先；否则跟着模板走。
 *
 * @returns 传给 colorOf 的 key
 */
export function makeColorResolver(templates) {
  const byId = new Map(templates.map((t) => [t.id, t]))
  return (entry) => entry?.color ?? byId.get(entry?.template_id)?.color ?? null
}
