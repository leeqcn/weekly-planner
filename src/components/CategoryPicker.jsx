import { activeCategories } from '../lib/categories'
import { colorOf } from '../lib/colors'

/**
 * 一排芯片选分类。做成点选而不是手打 —— 分类是统计的维度，
 * 手打的话「transport」和「Transport」就是两类，统计立刻裂开。
 *
 * @param inherited 没选的时候实际会落到哪一类（模板带的），只用来显示提示
 */
export default function CategoryPicker({
  value,
  categories,
  onChange,
  label = '分类',
  inherited = null,
}) {
  const list = activeCategories(categories)
  if (!list.length) return null

  const inheritedName = inherited
    ? categories.find((c) => c.id === inherited)?.name
    : null

  return (
    <div className="cat-picker">
      <label>{label}</label>
      <div className="cat-row">
        <button
          type="button"
          className={`cat-chip${value == null ? ' on' : ''}`}
          onClick={() => onChange(null)}
        >
          {inheritedName ? `跟模板（${inheritedName}）` : '未分类'}
        </button>
        {list.map((c) => (
          <button
            type="button"
            key={c.id}
            className={`cat-chip${value === c.id ? ' on' : ''}`}
            onClick={() => onChange(c.id)}
          >
            <span
              className="row-dot"
              style={{ background: colorOf(c.color).dot }}
              aria-hidden="true"
            />
            {c.name}
          </button>
        ))}
      </div>
    </div>
  )
}
