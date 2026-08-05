import { useState } from 'react'
import { dateKey, fromDateKey } from '../lib/dates'
import { TYPES } from '../lib/schedule'
import { formatClock, parseClock } from '../lib/time'
import TimeFields from './TimeFields'
import ColorPicker from './ColorPicker'
import CategoryPicker from './CategoryPicker'
import Uncategorized from './Uncategorized'
import { colorOf } from '../lib/colors'
import { sortCategories } from '../lib/categories'
import { LANGS, pick, tr, weekNameList, weekdayWord } from '../lib/i18n'
import { useLang } from '../state/LangContext'


const EVERY_DAY = [1, 2, 3, 4, 5, 6, 7]
/** 常用的重复预设 —— 三餐这种每天重复的，不用一个个点七下 */
const PRESETS = [
  { label: tr('每天'), days: EVERY_DAY },
  { label: tr('工作日'), days: [1, 2, 3, 4, 5] },
  { label: tr('周末'), days: [6, 7] },
]
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
  color: null,
  category_id: null,
  keep_in_todo: false,
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
      color: draft.color ?? null,
      category_id: draft.category_id ?? null,
      keep_in_todo: isTodo ? Boolean(draft.keep_in_todo) : false,
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
        <button className="ghost" onClick={onBack}>{tr('‹ 回到周视图')}</button>
        <h1>{tr('设置')}</h1>
        <span className="spacer" />
        <button className="primary" onClick={startNew}>{tr('＋ 新建模板')}</button>
      </div>

      <LanguageRow />

      <section className="card">
        <h2>{tr('重复模板')}</h2>
        {planner.templates.length === 0 ? (
          <p className="muted">{tr('还没有模板。建一个之后，每周的日程就会自动生成。')}</p>
        ) : (
          <div className="table-scroll">
          <table className="tpl-table">
            <thead>
              <tr>
                <th>{tr('标题')}</th>
                <th>{tr('类型')}</th>
                <th>{tr('重复')}</th>
                <th>{tr('时间')}</th>
                <th>{tr('状态')}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {planner.templates.map((t) => (
                <tr key={t.id} className={t.is_active ? '' : 'inactive'}>
                  <td>
                    <span
                      className="row-dot"
                      style={{ background: colorOf(t.color).dot }}
                      aria-hidden="true"
                    />
                    {t.title}
                  </td>
                  <td>
                    {tr(TYPE_LABELS[t.type])}
                    {t.priority && (
                      <span className="muted small"> · {tr(PRIORITY_LABELS[t.priority])}</span>
                    )}
                  </td>
                  <td className="small">{describeRecurrence(t)}</td>
                  <td className="small">
                    {t.start_time
                      ? `${t.start_time.slice(0, 5)}–${(t.end_time ?? '').slice(0, 5)}`
                      : '—'}
                  </td>
                  <td className="small">{t.is_active ? tr('启用') : tr('停用')}</td>
                  <td className="row-gap">
                    <button className="ghost" onClick={() => startEdit(t)}>{tr('编辑')}</button>
                    <button
                      className="ghost"
                      onClick={() =>
                        planner.updateTemplate(t.id, { is_active: !t.is_active })
                      }
                    >
                      {t.is_active ? tr('停用') : tr('启用')}
                    </button>
                    <button
                      className="ghost danger"
                      onClick={() => planner.deleteTemplate(t.id)}
                    >{tr('删除')}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
        <p className="muted small">{tr('停用只是不再生成新日程，历史记录会保留。')}</p>
      </section>

      <Categories planner={planner} />

      <Uncategorized planner={planner} />

      <SpecialDays planner={planner} />

      {draft && (
        <div className="modal-backdrop" onClick={() => setDraft(null)}>
          <form
            className="card modal wide"
            onClick={(e) => e.stopPropagation()}
            onSubmit={save}
          >
            <h2>{draft.id ? tr('编辑模板') : tr('新建模板')}</h2>

            <label htmlFor="tpl-title">{tr('标题')}</label>
            <input
              id="tpl-title"
              value={draft.title}
              autoFocus
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />

            <div className="field-row">
              <div>
                <label htmlFor="tpl-type">{tr('类型')}</label>
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
                <label htmlFor="tpl-rec">{tr('重复方式')}</label>
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
                  <option value="weekly">{tr('每周')}</option>
                  <option value="monthly">{tr('每月')}</option>
                </select>
              </div>
              )}
            </div>

            <p className="muted small">{tr(TYPES[draft.type].hint)}</p>

            {draft.type === 'habit' ? (
              <p className="muted small">{tr('习惯每天重复，不用选周几。')}</p>
            ) : (
            <>
            <label>{draft.recurrence === 'weekly' ? tr('周几') : tr('每月几号')}</label>
            {draft.recurrence === 'weekly' && (
              <div className="day-toggles presets">
                {PRESETS.map((p) => (
                  <button
                    type="button"
                    key={p.label}
                    className="toggle"
                    onClick={() => setDraft({ ...draft, recurrence_days: p.days })}
                  >
                    {p.label}
                  </button>
                ))}
                <button
                  type="button"
                  className="toggle"
                  onClick={() => setDraft({ ...draft, recurrence_days: [] })}
                >{tr('清空')}</button>
              </div>
            )}
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
                  {draft.recurrence === 'weekly' ? weekNameList()[d - 1] : d}
                </button>
              ))}
            </div>
            </>
            )}

            {draft.type === 'event' && (
              <TemplateTime draft={draft} setDraft={setDraft} />
            )}

            <CategoryPicker
              value={draft.category_id}
              categories={planner.categories}
              onChange={(category_id) => setDraft({ ...draft, category_id })}
              label={tr('分类（统计按它汇总）')}
            />

            <ColorPicker
              value={draft.color}
              onChange={(color) => setDraft({ ...draft, color })}
            />

            {draft.type === 'todo' && (
              <label className="inline-check">
                <input
                  type="checkbox"
                  checked={Boolean(draft.keep_in_todo)}
                  onChange={(e) => setDraft({ ...draft, keep_in_todo: e.target.checked })}
                />{tr('排进时间轴后，仍然留在 To do 列表里')}</label>
            )}

            {draft.type === 'todo' && (
              <div className="field-row">
                <div>
                  <label htmlFor="tpl-min">{tr('最短（分钟）')}</label>
                  <input
                    id="tpl-min"
                    inputMode="numeric"
                    value={draft.min_duration_minutes ?? ''}
                    placeholder="--"
                    onChange={(e) =>
                      setDraft({ ...draft, min_duration_minutes: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label htmlFor="tpl-max">{tr('最长（分钟）')}</label>
                  <input
                    id="tpl-max"
                    inputMode="numeric"
                    value={draft.max_duration_minutes ?? ''}
                    placeholder="--"
                    onChange={(e) =>
                      setDraft({ ...draft, max_duration_minutes: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label htmlFor="tpl-prio">{tr('优先级')}</label>
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
              <button type="button" className="ghost" onClick={() => setDraft(null)}>{tr('取消')}</button>
              <button type="submit" className="primary">{tr('保存')}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

/**
 * 分类管理。
 *
 * 只给「停用」不给「删除」：分类是统计的维度，删掉会让那段历史无处可归。
 * 停用之后不再出现在选择器里，但已有条目照常解析、统计照常算。
 */
function Categories({ planner }) {
  const [draft, setDraft] = useState(null)
  const list = sortCategories(planner.categories)

  async function save(e) {
    e.preventDefault()
    const name = draft.name.trim()
    if (!name) return
    const payload = { name, color: draft.color ?? null, sort_order: Number(draft.sort_order) || 0 }
    if (draft.id) await planner.updateCategory(draft.id, payload)
    else await planner.createCategory({ ...payload, is_active: true })
    setDraft(null)
  }

  return (
    <section className="card">
      <div className="card-head">
        <h2>{tr('分类')}</h2>
        <button
          onClick={() =>
            setDraft({ name: '', color: null, sort_order: (list.at(-1)?.sort_order ?? 0) + 10 })
          }
        >{tr('＋ 新建分类')}</button>
      </div>

      {list.length === 0 ? (
        <p className="muted">{tr('还没有分类。')}</p>
      ) : (
        <div className="table-scroll">
          <table className="tpl-table">
            <thead>
              <tr>
                <th>{tr('名称')}</th>
                <th>{tr('排序')}</th>
                <th>{tr('状态')}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.id} className={c.is_active ? '' : 'inactive'}>
                  <td>
                    <span
                      className="row-dot"
                      style={{ background: colorOf(c.color).dot }}
                      aria-hidden="true"
                    />
                    {c.name}
                  </td>
                  <td className="small">{c.sort_order}</td>
                  <td className="small">{c.is_active ? tr('启用') : tr('停用')}</td>
                  <td className="row-gap">
                    <button className="ghost" onClick={() => setDraft({ ...c })}>{tr('编辑')}</button>
                    <button
                      className="ghost"
                      onClick={() =>
                        planner.updateCategory(c.id, { is_active: !c.is_active })
                      }
                    >
                      {c.is_active ? tr('停用') : tr('启用')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="muted small">{tr('统计按分类汇总，不按标题 ——「地铁上班」和「打车回家」是两个标题、同一类。 分类的颜色会被模板和条目继承（自己另外选了就以自己的为准）。')}<b>{tr('只能停用不能删')}</b>{tr('：删掉会让那段历史无处可归。')}</p>

      {draft && (
        <div className="modal-backdrop" onClick={() => setDraft(null)}>
          <form className="card modal" onClick={(e) => e.stopPropagation()} onSubmit={save}>
            <h2>{draft.id ? tr('修改分类') : tr('新建分类')}</h2>
            <label htmlFor="cat-name">{tr('名称')}</label>
            <input
              id="cat-name"
              value={draft.name}
              autoFocus
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="Sleep / Work / …"
            />
            <label htmlFor="cat-sort">{tr('排序（小的在前）')}</label>
            <input
              id="cat-sort"
              inputMode="numeric"
              value={draft.sort_order}
              onChange={(e) => setDraft({ ...draft, sort_order: e.target.value })}
            />
            <ColorPicker
              value={draft.color}
              onChange={(color) => setDraft({ ...draft, color })}
            />
            <div className="modal-actions">
              <span className="spacer" />
              <button type="button" className="ghost" onClick={() => setDraft(null)}>{tr('取消')}</button>
              <button type="submit" className="primary">{tr('保存')}</button>
            </div>
          </form>
        </div>
      )}
    </section>
  )
}

function SpecialDays({ planner }) {
  const [date, setDate] = useState(dateKey(new Date()))
  const [label, setLabel] = useState('')

  return (
    <section className="card">
      <h2>{tr('特殊日')}</h2>
      <div className="field-row">
        <div>
          <label htmlFor="sd-date">{tr('日期')}</label>
          <input
            id="sd-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="grow">
          <label htmlFor="sd-label">{tr('标记')}</label>
          <input
            id="sd-label"
            value={label}
            placeholder={tr('专注学习 / 禅修 …')}
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
        >{tr('标记')}</button>
      </div>
      {planner.specialDays.length > 0 && (
        <ul className="sd-list">
          {planner.specialDays.map((s) => (
            <li key={s.id}>
              <span>
                {s.date} · {s.label}
              </span>
              <button className="ghost" onClick={() => planner.setSpecialDay(s.date, '')}>{tr('取消')}</button>
            </li>
          ))}
        </ul>
      )}
      <p className="muted small">{tr('这里只列出当前这一周的标记。')}</p>
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
      label={tr('时间')}
      value={value}
      onChange={apply}
      hint={tr('填两个就行。9 / 930 / 9:30 都认，时长可以写 90 或 1.5h。')}
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
    ? days.map((d) => weekdayWord(d)).join(' ')
    : days.map((d) => pick(() => `${d} 号`, () => `day ${d}`)).join(' ')
}


/**
 * 语言。默认跟浏览器走（非中文直接进英文），所以英文用户不会先撞见一屏中文；
 * 这里是给「浏览器是中文但想看英文」或者反过来的人用的。
 */
function LanguageRow() {
  const { lang, setLang } = useLang()
  return (
    <section className="card">
      <div className="card-head">
        <h2>{tr('语言')}</h2>
        <span className="row-gap">
          {Object.entries(LANGS).map(([code, label]) => (
            <button
              key={code}
              className={`chip${lang === code ? ' selected' : ''}`}
              onClick={() => setLang(code)}
            >
              {label}
            </button>
          ))}
        </span>
      </div>
    </section>
  )
}
