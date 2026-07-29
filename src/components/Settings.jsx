import { useState } from 'react'
import { dateKey, fromDateKey } from '../lib/dates'
import { TYPES } from '../lib/schedule'
import { formatClock, parseClock } from '../lib/time'
import TimeFields from './TimeFields'

const WEEK_LABELS = ['一', '二', '三', '四', '五', '六', '日']
const EVERY_DAY = [1, 2, 3, 4, 5, 6, 7]
const TYPE_LABELS = Object.fromEntries(
  Object.entries(TYPES).map(([k, v]) => [k, v.label]),
)
const PRIORITY_LABELS = { must: '必须', high: '重要', optional: '可选' }

const BLANK = {
  title: '',
  type: 'event',
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
    const isTodo = draft.type === 'todo'
    const isEvent = draft.type === 'event'
    const payload = {
      title: draft.title.trim(),
      type: draft.type,
      priority: isTodo ? (draft.priority ?? 'optional') : null,
      min_duration_minutes: isTodo ? numOrNull(draft.min_duration_minutes) : null,
      max_duration_minutes: isTodo ? numOrNull(draft.max_duration_minutes) : null,
      recurrence: draft.type === 'habit' ? 'weekly' : draft.recurrence,
      // habit 每天重复，不给选周几
      recurrence_days: draft.type === 'habit' ? EVERY_DAY : draft.recurrence_days,
      start_time: isEvent ? draft.start_time || null : null,
      end_time: isEvent ? draft.end_time || null : null,
      is_active: draft.is_active,
    }
    if (!payload.title || !payload.recurrence_days.length) return
    if (isEvent && !(payload.start_time && payload.end_time)) return
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
                      : '—'}
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
                  onChange={(e) => {
                    const type = e.target.value
                    setDraft({
                      ...draft,
                      type,
                      recurrence_days:
                        type === 'habit' ? EVERY_DAY : draft.recurrence_days,
                      start_time: type === 'event' ? draft.start_time : '',
                      end_time: type === 'event' ? draft.end_time : '',
                    })
                  }}
                >
                  {Object.entries(TYPE_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
              {draft.type !== 'habit' && (
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
              )}
            </div>

            <p className="muted small">{TYPES[draft.type].hint}</p>

            {draft.type === 'habit' ? (
              <p className="muted small">习惯每天重复，不用选周几。</p>
            ) : (
            <>
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
            </>
            )}

            {draft.type === 'event' && (
              <TemplateTime draft={draft} setDraft={setDraft} />
            )}

            {draft.type === 'todo' && (
              <div className="field-row">
                <div>
                  <label htmlFor="tpl-min">最短（分钟）</label>
                  <input
                    id="tpl-min"
                    inputMode="numeric"
                    value={draft.min_duration_minutes ?? ''}
                    placeholder="30"
                    onChange={(e) =>
                      setDraft({ ...draft, min_duration_minutes: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label htmlFor="tpl-max">最长（分钟）</label>
                  <input
                    id="tpl-max"
                    inputMode="numeric"
                    value={draft.max_duration_minutes ?? ''}
                    placeholder="60"
                    onChange={(e) =>
                      setDraft({ ...draft, max_duration_minutes: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label htmlFor="tpl-prio">优先级</label>
                  <select
                    id="tpl-prio"
                    value={draft.priority ?? 'optional'}
                    onChange={(e) => setDraft({ ...draft, priority: e.target.value })}
                  >
                    {Object.entries(PRIORITY_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

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

/** 模板上的时间也用手打 + 时长联动，跟条目编辑保持一致。 */
function TemplateTime({ draft, setDraft }) {
  const value = {
    start: parseClock(draft.start_time),
    end: parseClock(draft.end_time),
    duration:
      parseClock(draft.start_time) !== null && parseClock(draft.end_time) !== null
        ? parseClock(draft.end_time) - parseClock(draft.start_time)
        : null,
  }
  const apply = (next) =>
    setDraft({
      ...draft,
      start_time: next.start === null ? '' : formatClock(next.start),
      end_time: next.end === null ? '' : formatClock(next.end),
    })

  return (
    <TimeFields
      id="tpl"
      label="时间"
      value={value}
      onChange={apply}
      hint="填两个就行。9 / 930 / 9:30 都认，时长可以写 90 或 1.5h。"
    />
  )
}

function numOrNull(v) {
  if (v === '' || v === null || v === undefined) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function describeRecurrence(t) {
  const days = t.recurrence_days ?? []
  if (!days.length) return '—'
  return t.recurrence === 'weekly'
    ? days.map((d) => `周${WEEK_LABELS[d - 1]}`).join(' ')
    : days.map((d) => `${d} 号`).join(' ')
}

