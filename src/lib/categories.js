/**
 * 分类 —— 统计的维度。
 *
 * 为什么不按标题统计：「地铁上班」「打车回家」「开车去客户那」是三个标题、
 * 同一类。指望手打的标题一致是不成立的，就算一致也解决不了这个。
 *
 * 分类挂在**模板**上，临时条目自己带一个。解析方式和颜色完全一样
 * （见 colors.js 的 makeColorResolver）：条目自己填了算「单独改过这一条」，
 * 否则跟着模板走。**不往条目上复制** —— 复制过就成了快照，
 * 之后改分类不会回头更新已经生成的条目。
 *
 * 这条选择有个直接后果，而且是我们要的：把「读书」从学习改到休闲，
 * 历史统计整体跟着变。个人工具改分类通常是因为想通了它本来就该属于那一类，
 * 希望历史一起纠正，而不是留一半在旧类里。
 */

/** 未归类的桶。汇总表里存这个字符串，不存 null。 */
export const NO_CATEGORY = 'none'

/** 第一次进来自动建这几个，颜色一人一个，正好用满调色板。 */
export const DEFAULT_CATEGORIES = [
  { name: 'Sleep', color: 'lilac', sort_order: 10 },
  { name: 'Work', color: 'mist', sort_order: 20 },
  { name: 'Study', color: 'sage', sort_order: 30 },
  { name: 'Daily life', color: 'ochre', sort_order: 40 },
  { name: 'Relax', color: 'default', sort_order: 50 },
  { name: 'Health', color: 'clay', sort_order: 60 },
]

export const sortCategories = (categories) =>
  [...categories].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))

/** 选择器里只列还在用的；停用的仍然能解析出来，只是不给新选。 */
export const activeCategories = (categories) =>
  sortCategories(categories.filter((c) => c.is_active))

/**
 * 一条日程归哪一类。
 * @returns category id，未归类返回 null
 */
export function makeCategoryResolver(templates) {
  const byId = new Map(templates.map((t) => [t.id, t]))
  return (entry) => entry?.category_id ?? byId.get(entry?.template_id)?.category_id ?? null
}

/** 汇总表里的 key：未归类统一存 'none'，不存 null。 */
export const categoryKey = (id) => id ?? NO_CATEGORY

export function makeCategoryLookup(categories) {
  const byId = new Map(categories.map((c) => [c.id, c]))
  return (key) =>
    key === NO_CATEGORY || key == null
      ? { id: null, name: '未分类', color: 'stone', is_active: true }
      : (byId.get(key) ?? { id: key, name: '（已删除）', color: 'stone', is_active: false })
}
