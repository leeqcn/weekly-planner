import { useState } from 'react'
import { dateKey, fromDateKey } from '../lib/dates'

const WEEK_LABELS = ['一', '二', '三', '四', '五', '六', '日']
const TYPE_LABELS = {
  fixed_event: '固定事件',
  task: '任务',
  habit: '习惯打卡',
}
const PRIORITY_LABELS = { must: '必须', high: '重要', optional: '可选' }

const BLANK = {
  title: '',
  type: 'fixed_event',
  priority: null,
  min_duration_minutes: null,
  max_duration_minutes: null,
  recurrence: 'weekly',
  recurrence_days: [],
  start_time: '',
  end_time: '',
  is_active: true,
}

export default function Settings({ planner, onBack }) {
  const [draft, setDraft] = useState(null)

  const startNew = () => setDraft({ ...BLANK })
  const startEdit = (t) =>
    setDraft({
      ...t,
      start_time: t.start_time?.slice(0, 5) ?? '',
      end_time: t.end_time?.slice(0, 5) ?? '',
      recurrence_days: t.recurrence_days ?? [],
    })

  async function save(e) {
    e.preventDefault()
    const isTask = draft.type === 'task'
    const payload = {
      title: draft.title.trim(),
      type: draft.type,
      priority: isTask ? (draft.priority ?? 'optional') : null,
      min_duration_minutes: isTask ? numOrNull(draft.min_duration_minutes) : null,
      max_duration_minutes: isTask ? numOrNull(draft.max_duration_minutes) : null,
      recurrence: draft.recurrence,
      recurrence_days: draft.recurrence_days,
      start_time: draft.start_time || null,
      end_time: draft.end_time || null,
      is_active: draft.is_active,
    }
    if (!payload.title || !payload.recurrence_days.length) return
    if (draft.id) await planner.updateTemplate(draft.id, payload)
    else await planner.createTemplate(payload)
    setDraft(null)
  }

  return (
    <div className="settings">
      <div className="day-head">
        <button className="ghost" onClick={onBack}>
          ‹ 回到周视图
        </button>
        <h1>设置</h1>
        <span className="spacer" />
        <button className="primary" onClick={startNew}>
          ＋ 新建模板
        </button>
      </div>

      <section className="card">
        <h2>重复模板</h2>
        {planner.templates.length === 0 ? (
          <p className="muted">还没有模板。建一个之后，每周的日程就会自动生成。</p>
        ) : (
          <div className="table-scroll">
          <table className="tpl-table">
            <thead>
              <tr>
                <th>标题</th>
                <th>类型</th>
                <th>重复</th>
                <th>时间</th>
                <th>状态</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {planner.templates.map((t) => (
                <tr key={t.id} className={t.is_active ? '' : 'inactive'}>
                  <td>{t.title}</td>
                  <td>
                    {TYPE_LABELS[t.type]}
                    {t.priority && (
                      <span className="muted small"> · {PRIORITY_LABELS[t.priority]}</span>
                    )}
                  </td>
                  <td className="small">{describeRecurrence(t)}</td>
                  <td className="small">
                    {t.start_time
                      ? `${t.start_time.slice(0, 5)}–${(t.end_time ?? '').slice(0, 5)}`
                      : '弹性'}
                  </td>
                  <td className="small">{t.is_active ? '启用' : '停用'}</td>
                  <td className="row-gap">
                    <button className="ghost" onClick={() => startEdit(t)}>
                      编辑
                    </button>
                    <button
                      className="ghost"
                      onClick={() =>
                        planner.updateTemplate(t.id, { is_active: !t.is_active })
                      }
                    >
                      {t.is_active ? '停用' : '启用'}
                    </button>
                    <button
                      className="ghost danger"
                      onClick={() => planner.deleteTemplate(t.id)}
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
        <p className="muted small">
          停用只是不再生成新日程，历史记录会保留。
        </p>
      </section>

      <SpecialDays planner={planner} />

      {draft && (
        <div className="modal-backdrop" onClick={() => setDraft(null)}>
          <form
            className="card modal wide"
            onClick={(e) => e.stopPropagation()}
            onSubmit={save}
          >
            <h2>{draft.id ? '编辑模板' : '新建模板'}</h2>

            <label htmlFor="tpl-title">标题</label>
            <input
              id="tpl-title"
              value={draft.title}
              autoFocus
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />

            <div className="field-row">
              <div>
                <label htmlFor="tpl-type">类型</label>
                <select
                  id="tpl-type"
                  value={draft.type}
                  onChange={(e) => setDraft({ ...draft, type: e.target.value })}
                >
                  {Object.entries(TYPE_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="tpl-rec">重复方式</label>
                <select
                  id="tpl-rec"
                  value={draft.recurrence}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      recurrence: e.target.value,
                      recurrence_days: [],
                    })
                  }
                >
                  <option value="weekly">每周</option>
                  <option value="monthly">每月</option>
                </select>
              </div>
            </div>

            <label>{draft.recurrence === 'weekly' ? '周几' : '每月几号'}</label>
            <div className="day-toggles">
              {(draft.recurrence === 'weekly'
                ? [1, 2, 3, 4, 5, 6, 7]
                : Array.from({ length: 31 }, (_, i) => i + 1)
              ).map((d) => (
                <button
                  type="button"
                  key={d}
                  className={`toggle${draft.recurrence_days.includes(d) ? ' on' : ''}`}
                  onClick={() =>
                    setDraft({
                      ...draft,
                      recurrence_days: draft.recurrence_days.includes(d)
                        ? draft.recurrence_days.filter((x) => x !== d)
                        : [...draft.recurrence_days, d].sort((a, b) => a - b),
                    })
                  }
                >
                  {draft.recurrence === 'weekly' ? WEEK_LABELS[d - 1] : d}
                </button>
              ))}
            </div>

            {draft.type !== 'habit' && (
              <div className="field-row">
                <div>
                  <label htmlFor="tpl-start">开始时间</label>
                  <input
                    id="tpl-start"
                    type="time"
                    value={draft.start_time}
                    onChange={(e) => setDraft({ ...draft, start_time: e.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor="tpl-end">结束时间</label>
                  <input
                    id="tpl-end"
                    type="time"
                    value={draft.end_time}
                    onChange={(e) => setDraft({ ...draft, end_time: e.target.value })}
                  />
                </div>
              </div>
            )}

            {draft.type === 'task' && (
              <div className="field-row">
                <div>
                  <label htmlFor="tpl-prio">优先级</label>
                  <select
                    id="tpl-prio"
                    value={draft.priority ?? 'optional'}
                    onChange={(e) => setDraft({ ...draft, priority: e.target.value })}
                  >
                    {Object.entries(PRIORITY_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="tpl-min">最短（分钟）</label>
                  <input
                    id="tpl-min"
                    type="number"
                    min="0"
                    value={draft.min_duration_minutes ?? ''}
                    onChange={(e) =>
                      setDraft({ ...draft, min_duration_minutes: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label htmlFor="tpl-max">最长（分钟）</label>
                  <input
                    id="tpl-max"
                    type="number"
                    min="0"
                    value={draft.max_duration_minutes ?? ''}
                    onChange={(e) =>
                      setDraft({ ...draft, max_duration_minutes: e.target.value })
                    }
                  />
                </div>
              </div>
            )}

            <p className="muted small">
              habit 不进时间轴，只在 Day View 的打卡区出现；task / fixed_event 留空时间就是「待安排」。
            </p>

            <div className="modal-actions">
              <span className="spacer" />
              <button type="button" className="ghost" onClick={() => setDraft(null)}>
                取消
              </button>
              <button type="submit" className="primary">
                保存
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

function SpecialDays({ planner }) {
  const [date, setDate] = useState(dateKey(new Date()))
  const [label, setLabel] = useState('')

  return (
    <section className="card">
      <h2>特殊日</h2>
      <div className="field-row">
        <div>
          <label htmlFor="sd-date">日期</label>
          <input
            id="sd-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="grow">
          <label htmlFor="sd-label">标记</label>
          <input
            id="sd-label"
            value={label}
            placeholder="专注学习 / 禅修 …"
            onChange={(e) => setLabel(e.target.value)}
          />
        </div>
        <button
          className="primary"
          onClick={async () => {
            if (!label.trim()) return
            await planner.setSpecialDay(date, label.trim())
            await planner.goToDate(fromDateKey(date))
            setLabel('')
          }}
        >
          标记
        </button>
      </div>
      {planner.specialDays.length > 0 && (
        <ul className="sd-list">
          {planner.specialDays.map((s) => (
            <li key={s.id}>
              <span>
                {s.date} · {s.label}
              </span>
              <button className="ghost" onClick={() => planner.setSpecialDay(s.date, '')}>
                取消
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="muted small">这里只列出当前这一周的标记。</p>
    </section>
  )
}

function describeRecurrence(t) {
  const days = t.recurrence_days ?? []
  if (!days.length) return '—'
  return t.recurrence === 'weekly'
    ? days.map((d) => `周${WEEK_LABELS[d - 1]}`).join(' ')
    : days.map((d) => `${d} 号`).join(' ')
}

function numOrNull(v) {
  if (v === '' || v === null || v === undefined) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}
