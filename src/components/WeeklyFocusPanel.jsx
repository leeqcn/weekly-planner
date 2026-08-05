import { useEffect, useState } from 'react'
import { tr } from '../lib/i18n'

/** 本周关注点：最多 3 条，顺序即优先级（第 1 条最重要）。 */
export default function WeeklyFocusPanel({ focus, onSave }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(['', '', ''])

  useEffect(() => {
    setDraft([0, 1, 2].map((i) => focus[i]?.title ?? ''))
  }, [focus])

  async function save() {
    await onSave(draft.map((t) => t.trim()).filter(Boolean))
    setEditing(false)
  }

  return (
    <section className="card focus-card">
      <div className="card-head">
        <h2>{tr('本周关注')}</h2>
        {editing ? (
          <div className="row-gap">
            <button className="ghost" onClick={() => setEditing(false)}>{tr('取消')}</button>
            <button className="primary" onClick={save}>{tr('保存')}</button>
          </div>
        ) : (
          <button className="ghost" onClick={() => setEditing(true)}>{tr('编辑')}</button>
        )}
      </div>

      {editing ? (
        <ol className="focus-list">
          {draft.map((value, i) => (
            <li key={i}>
              <span className="focus-rank">{i + 1}</span>
              <input
                value={value}
                placeholder={i === 0 ? tr('最重要的一件事') : tr('（可留空）')}
                onChange={(e) =>
                  setDraft((d) => d.map((v, j) => (j === i ? e.target.value : v)))
                }
              />
            </li>
          ))}
        </ol>
      ) : focus.length ? (
        <ol className="focus-list">
          {focus.map((f) => (
            <li key={f.id}>
              <span className="focus-rank">{f.priority_order}</span>
              <span className="focus-title">{f.title}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="muted">{tr('这周还没定关注点。')}</p>
      )}
    </section>
  )
}
