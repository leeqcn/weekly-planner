import { activeCategories, makeCategoryResolver } from '../lib/categories'
import { colorOf } from '../lib/colors'

/**
 * 未分类收纳箱。
 *
 * 加分类之前的数据全部落在「未分类」里，一条条去归太痛苦。
 * 这里**按标题聚成一堆**，「去超市 ×7」点一下整堆归好。
 *
 * 只处理还留着的明细（保留期内）—— 更早的已经被清掉了，只剩汇总，改不动。
 * 所以归类要趁早，这也是为什么把它放在设置里显眼的位置。
 *
 * 有模板的条目不列在这儿：那种去模板上设一次就够了，
 * 一条条归反而会在条目上留下一堆本可以不要的覆盖值。
 */
export default function Uncategorized({ planner }) {
  const resolve = makeCategoryResolver(planner.templates)
  const cats = activeCategories(planner.categories)

  const groups = new Map()
  for (const e of planner.entries) {
    if (resolve(e)) continue
    if (e.template_id) continue
    const t = e.title?.trim()
    if (!t) continue
    if (!groups.has(t)) groups.set(t, [])
    groups.get(t).push(e)
  }
  const rows = [...groups.entries()].sort((a, b) => b[1].length - a[1].length)

  // 模板里还没归类的单独列一行，一次改一个模板就覆盖了它生成的所有条目
  const looseTemplates = planner.templates.filter((t) => t.is_active && !t.category_id)

  if (!rows.length && !looseTemplates.length) {
    return (
      <section className="card">
        <h2>未分类</h2>
        <p className="muted">这一周的东西都归好类了。</p>
      </section>
    )
  }

  const assign = (entries, categoryId) =>
    planner.updateEntries(
      entries.map((e) => ({ id: e.id, patch: { category_id: categoryId } })),
      `归类「${entries[0].title}」${entries.length > 1 ? ` ×${entries.length}` : ''}`,
    )

  return (
    <section className="card">
      <h2>未分类</h2>
      <p className="muted small">
        显示的是<b>当前这一周</b>还没归类的。切到别的周会看到那一周的。
        明细过了保留期就只剩汇总、改不动了，所以尽量趁早归。
      </p>

      {looseTemplates.length > 0 && (
        <div className="uncat-group">
          <label>模板还没设分类（设一次，它生成的所有条目都跟着走）</label>
          {looseTemplates.map((t) => (
            <div className="uncat-row" key={t.id}>
              <span className="uncat-title">
                <span
                  className="row-dot"
                  style={{ background: colorOf(t.color).dot }}
                  aria-hidden="true"
                />
                {t.title}
              </span>
              <span className="uncat-chips">
                {cats.map((c) => (
                  <button
                    key={c.id}
                    className="cat-chip"
                    onClick={() => planner.updateTemplate(t.id, { category_id: c.id })}
                  >
                    {c.name}
                  </button>
                ))}
              </span>
            </div>
          ))}
        </div>
      )}

      {rows.length > 0 && (
        <div className="uncat-group">
          <label>临时加的条目（按标题成堆归）</label>
          {rows.map(([title, entries]) => (
            <div className="uncat-row" key={title}>
              <span className="uncat-title">
                {title}
                {entries.length > 1 && (
                  <span className="muted small"> ×{entries.length}</span>
                )}
              </span>
              <span className="uncat-chips">
                {cats.map((c) => (
                  <button key={c.id} className="cat-chip" onClick={() => assign(entries, c.id)}>
                    {c.name}
                  </button>
                ))}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
