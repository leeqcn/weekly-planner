/**
 * 事项配色 —— 莫兰迪：低饱和、掺灰。
 *
 * 这一组是算出来的，不是挑出来的。上一版八个颜色两两之间的感知差异
 * （CIEDE2000）最小只有 **3.3** —— 块底那一档基本分不出来。原因有两条：
 * 色相全挤在一起（橙 / 砖红 / 赭黄差不到 40°，鼠尾草和青灰差不到 20°），
 * 而块底本身是接近白的淡色、彩度很低，色相差一压就没了。
 *
 * 这一版做了三件事：
 *   1. 色相按名字锁在 55 / 20 / 92 / 140 / 262 / 312，均匀铺开
 *   2. 去掉青灰 —— 它就是鼠尾草的孪生兄弟，删掉之后最小 ΔE 从 8.6 涨到 10.4
 *   3. 明度也拉开（砖红压到 82），不光靠色相区分
 *
 * 结果：块底最小 ΔE 10.4，圆点 13.5，块底压深色标题的对比度 ≥ 7.3。
 * 彩度上限卡在 17（块底）/ 27（圆点），保住莫兰迪那股掺灰的调子 ——
 * 放开彩度确实能把 ΔE 拉到 12 以上，但那就成糖果色了，不是这个调。
 *
 * 每个色三档：block 块的底色（上面要压深字）/ edge 描边 / dot 小圆点。
 */
export const COLORS = {
  default: { label: '陶土橙', block: '#fad6c3', edge: '#d1a187', dot: '#c39075' },
  clay: { label: '砖红', block: '#eec1c2', edge: '#c88b8d', dot: '#bb7a7c' },
  ochre: { label: '赭黄', block: '#e6d9ba', edge: '#b8a77b', dot: '#a89768' },
  sage: { label: '鼠尾草', block: '#c6dec2', edge: '#8daf88', dot: '#7b9f76' },
  mist: { label: '雾蓝', block: '#c5d9f1', edge: '#87a9cd', dot: '#6d9ac5' },
  lilac: { label: '丁香', block: '#e4d4f1', edge: '#b7a0c9', dot: '#a88fbc' },
  stone: { label: '灰', block: '#dcd6d2', edge: '#b2aaa5', dot: '#928a85' },
}

/** 删掉的旧色映射到最接近的一个，免得存过颜色的条目突然变回默认色。 */
const ALIASES = {
  teal: 'sage',
  green: 'sage',
  blue: 'mist',
  amber: 'ochre',
  rose: 'clay',
  violet: 'lilac',
  grey: 'stone',
}

export const COLOR_KEYS = Object.keys(COLORS)

export const colorOf = (key) => COLORS[key] ?? COLORS[ALIASES[key]] ?? COLORS.default

/**
 * 一条日程该用什么颜色。
 *
 * 颜色是表现层的东西，**不往条目上复制** —— 复制过就成了快照，
 * 之后改模板不会回头更新已经生成的条目（这正是之前那个 bug）。
 * 所以从具体到笼统一层层往上找：
 *
 *   条目自己填的  单独改过这一条
 *   模板填的      这个模板一直是这个色
 *   分类填的      整类一个色（睡觉一个色、工作一个色）
 *   默认色
 *
 * 加上分类这一层之后，「睡觉的颜色」和「睡觉这一类」不再是两套要手工对齐的
 * 东西了 —— 颜色成了分类的一个属性，统计图表和时间轴自动同色。
 *
 * @returns 传给 colorOf 的 key
 */
export function makeColorResolver(templates, categories = []) {
  const byTemplate = new Map(templates.map((t) => [t.id, t]))
  const byCategory = new Map(categories.map((c) => [c.id, c]))
  return (entry) => {
    if (entry?.color) return entry.color
    const tpl = byTemplate.get(entry?.template_id)
    if (tpl?.color) return tpl.color
    const catId = entry?.category_id ?? tpl?.category_id
    return byCategory.get(catId)?.color ?? null
  }
}
