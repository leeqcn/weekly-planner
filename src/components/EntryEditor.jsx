import { useState } from 'react'
import { combineDateTime, minutesOfDay } from '../lib/dates'
import { formatClock } from '../lib/time'
import TimeFields from './TimeFields'
import DayStrip from './DayStrip'
import ColorPicker from './ColorPicker'
import CategoryPicker from './CategoryPicker'
import { colorOf } from '../lib/colors'
import { pick, tr } from '../lib/i18n'
import Hint from './Hint'
import ModalBackdrop from './ModalBackdrop'

const empty = { start: null, end: null, duration: null }

function toGroup(startIso, endIso) {
  if (!startIso || !endIso) return { ...empty }
  const start = minutesOfDay(startIso)
  const endRaw = minutesOfDay(endIso)
  // 结束落到第二天 0 点时按 24:00 算
  const end = endRaw === 0 && start > 0 ? 1440 : endRaw
  return { start, end, duration: Math.max(0, end - start) }
}

const toIso = (date, minutes) =>
  minutes === null || minutes === undefined
    ? null
    : combineDateTime(date, formatClock(minutes === 1440 ? 1439 : minutes))

/**
 * 新建 / 修改一条安排。计划和实际分成两块单独填 ——
 * 之前只有一组时间输入，在「实际」那栏点开改时间，改的其实是计划。
 *
 * 分开之后还是会填错：两块长得一模一样，计划永远在上面，
 * 从 Actually 那栏长按进来的人照着习惯往第一格里打。所以再补两件事：
 *   - **从哪一栏进来的，那一块就排在最上面**，并且直接把光标放进去
 *   - 两块颜色跟着时间轴走：计划是橙的、实际是绿的，扫一眼就知道在改哪个
 *
 * @param focus 'plan' | 'actual' —— 从哪一栏点进来的
 * @param now   今天的第几分钟；传了的话实际那两格点一下就能填「现在」
 */
export default function EntryEditor({
  entry,
  actualOnly,
  focus = 'plan',
  now = null,
  date,
  dayEntries,
  categories = [],
  templates = [],
  onSave,
  onDelete,
  onClose,
}) {
  const actualFirst = actualOnly || focus === 'actual'
  const isNew = !entry
  const [title, setTitle] = useState(entry?.title ?? '')
  const [minDur, setMinDur] = useState(entry?.min_duration_minutes ?? '')
  const [maxDur, setMaxDur] = useState(entry?.max_duration_minutes ?? '')
  const [color, setColor] = useState(entry?.color ?? null)
  const [categoryId, setCategoryId] = useState(entry?.category_id ?? null)
  const [keep, setKeep] = useState(Boolean(entry?.keep_in_todo))
  // 新建时摊开（要设分类），改已有的收起来（十有八九只是改时间）
  const [showMore, setShowMore] = useState(isNew)
  const [plan, setPlan] = useState(() => toGroup(entry?.planned_start, entry?.planned_end))
  const [actual, setActual] = useState(() =>
    toGroup(entry?.actual_start, entry?.actual_end),
  )

  const moreSummary = [
    categories.find((c) => c.id === categoryId)?.name,
    minDur || maxDur ? `${minDur || maxDur}–${maxDur || minDur}′` : null,
    color ? colorOf(color).label : null,
    keep ? tr('留在待办') : null,
  ]
    .filter(Boolean)
    .join(' · ')

  function submit(event) {
    event.preventDefault()
    if (!title.trim()) return

    const planned_start = toIso(date, plan.start)
    const planned_end = toIso(date, plan.end)
    const actual_start = toIso(date, actual.start)
    const actual_end = toIso(date, actual.end)
    const didIt = Boolean(actual_start && actual_end)

    const num = (v) => (v === '' || v === null ? null : Number(v))
    const durations = {
      min_duration_minutes: num(minDur),
      max_duration_minutes: num(maxDur),
      color,
      category_id: categoryId,
      keep_in_todo: keep,
    }

    if (isNew) {
      onSave({
        template_id: null,
        date,
        title: title.trim(),
        planned_start,
        planned_end,
        actual_start,
        actual_end,
        ...durations,
        status: didIt ? 'done' : 'planned',
        rescheduled_from: null,
      })
      return
    }

    const moved = planned_start !== entry.planned_start && entry.planned_start
    onSave({
      title: title.trim(),
      planned_start,
      planned_end,
      actual_start,
      actual_end,
      ...durations,
      status: didIt
        ? 'done'
        : entry.status === 'skipped'
          ? 'skipped'
          : moved
            ? 'rescheduled'
            : 'planned',
      ...(moved ? { rescheduled_from: entry.rescheduled_from ?? entry.planned_start } : {}),
    })
  }

  return (
    <ModalBackdrop onClose={onClose}>
      <form className="card modal wide" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h2>{actualOnly ? tr('记录实际做了什么') : isNew ? tr('新增一条安排') : tr('修改安排')}</h2>
        {actualOnly && (
          <Hint>{tr('没排过计划、但确实做了的事 —— 只填「实际」就行，左边计划栏会留空。')}</Hint>
        )}

        <label htmlFor="entry-title">{tr('标题')}</label>
        <input
          id="entry-title"
          value={title}
          autoFocus={isNew}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={tr('做什么')}
        />

        <div className="editor-body">
          <div className="editor-fields">
            {actualFirst && (
              <TimeFields
                id="actual"
                label={tr('实际')}
                tone="actual"
                value={actual}
                onChange={setActual}
                suggest={now}
                // 实际那组光标落在**结束**：从 Actually 栏进来通常就是
                // 「刚做完，补一下几点结束的」。聚焦那一下「现在」浮层跟着弹出来
                autoFocusField={!isNew ? 'end' : null}
                hint={now != null ? tr('点开始或结束那一格，可以一下填「现在」。') : undefined}
              />
            )}

            {!actualOnly && (
              <TimeFields
                id="plan"
                label={tr('计划')}
                tone="plan"
                value={plan}
                onChange={setPlan}
                // 计划那组落在**开始**：改计划多半是把它挪个起点
                autoFocusField={!isNew && !actualFirst ? 'start' : null}
                hint={tr('三个都留空就是一条待办，可以之后再「排入」时间轴。')}
              />
            )}

            {!actualFirst && (
              <TimeFields
                id="actual"
                label={tr('实际')}
                tone="actual"
                value={actual}
                onChange={setActual}
                suggest={now}
                hint={now != null ? tr('点开始或结束那一格，可以一下填「现在」。') : undefined}
              />
            )}

            {/* 常用的只有时间。时长区间 / 分类 / 颜色 / 「留」这几样基本是
                在模板上设一次就不动的，摊开来只会把保存按钮挤到屏幕外面去。
                收起来之后整个弹窗一屏放得下，改时间不用滚。
                摘要那一行让人不用展开也知道里面是什么 */}
            <details
              className="more-fields"
              open={showMore}
              onToggle={(e) => setShowMore(e.currentTarget.open)}
            >
              <summary>
                {tr('更多设置')}
                {!showMore && moreSummary && (
                  <span className="muted small">（{moreSummary}）</span>
                )}
              </summary>

            <fieldset className="time-fields">
              <legend>{tr('预计时长')}</legend>
              <div className="time-row">
                <div>
                  <label htmlFor="dur-min">{tr('最短（分钟）')}</label>
                  <input
                    id="dur-min"
                    inputMode="numeric"
                    value={minDur}
                    placeholder="--"
                    onChange={(e) => setMinDur(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="dur-max">{tr('最长（分钟）')}</label>
                  <input
                    id="dur-max"
                    inputMode="numeric"
                    value={maxDur}
                    placeholder="--"
                    onChange={(e) => setMaxDur(e.target.value)}
                  />
                </div>
              </div>
              <Hint>{tr('「排入」按上限找空档。两个填不一样（比如购物 30–60）时， 块会画成半透明，表示还没定死。')}</Hint>
            </fieldset>

            <CategoryPicker
              value={categoryId}
              categories={categories}
              onChange={setCategoryId}
              inherited={templates.find((t) => t.id === entry?.template_id)?.category_id}
            />

            <ColorPicker value={color} onChange={setColor} />

            <label className="inline-check">
              <input
                type="checkbox"
                checked={keep}
                onChange={(e) => setKeep(e.target.checked)}
              />{tr('排进时间轴后，仍然留在 To do 列表里')}</label>
            {(plan.start !== null || actual.start !== null) && (
              <button
                type="button"
                className="ghost small-btn"
                onClick={() => {
                  setPlan({ ...empty })
                  setActual({ ...empty })
                }}
              >{tr('清空时间（变成待办）')}</button>
            )}
            </details>
            {entry?.rescheduled_from && (
              <p className="muted small">
                {pick(
                () => `原计划 ${formatClock(minutesOfDay(entry.rescheduled_from))}，已改期。`,
                () => `Originally planned for ${formatClock(minutesOfDay(entry.rescheduled_from))}; rescheduled.`,
              )}
              </p>
            )}
          </div>

          {/* 缩略时间轴画的是正在改的那一组，不然改实际时间时旁边一动不动 */}
          <DayStrip
            entries={dayEntries ?? []}
            editingId={entry?.id}
            kind={actualFirst ? 'actual' : 'plan'}
            draft={
              actualFirst
                ? { start: actual.start, end: actual.end }
                : { start: plan.start, end: plan.end }
            }
          />
        </div>

        <div className="modal-actions">
          {!isNew && (
            <button type="button" className="danger" onClick={onDelete}>{tr('删除')}</button>
          )}
          <span className="spacer" />
          <button type="button" className="ghost" onClick={onClose}>{tr('取消')}</button>
          <button type="submit" className="primary">{tr('保存')}</button>
        </div>
      </form>
    </ModalBackdrop>
  )
}
