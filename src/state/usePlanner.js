import { useCallback, useEffect, useRef, useState } from 'react'
import { buildEntriesFor } from '../lib/generate'
import { dateKey, retentionCutoff, weekDays, weekStart } from '../lib/dates'

/** 流水数据保留 4 周，超期删除，数据库不会一直变大。 */
export const RETENTION_DAYS = 28

const pick = (obj, keys) => Object.fromEntries(keys.map((k) => [k, obj?.[k] ?? null]))

/**
 * 全部数据加载 / 写入都收在这里，组件只管渲染。
 * 一次只加载当前显示这一周的流水数据，页面轻量。
 */
export function usePlanner(repo) {
  const [monday, setMonday] = useState(() => weekStart(new Date()))
  const [templates, setTemplates] = useState([])
  const [entries, setEntries] = useState([])
  const [habitLogs, setHabitLogs] = useState([])
  const [focus, setFocus] = useState([])
  const [specialDays, setSpecialDays] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [undoLabel, setUndoLabel] = useState(null)

  const days = weekDays(monday)
  const fromKey = dateKey(days[0])
  const toKey = dateKey(days[6])
  const purged = useRef(false)
  const undoStack = useRef([])

  const load = useCallback(async () => {
    setError(null)
    try {
      const [tpl, ent, logs, foc, sp] = await Promise.all([
        repo.listTemplates(),
        repo.listEntries(fromKey, toKey),
        repo.listHabitLogs(fromKey, toKey),
        repo.listWeeklyFocus(fromKey),
        repo.listSpecialDays(fromKey, toKey),
      ])
      setTemplates(tpl)
      setEntries(ent)
      setHabitLogs(logs)
      setFocus(foc)
      setSpecialDays(sp)
      return { templates: tpl, entries: ent }
    } catch (e) {
      setError(e.message ?? String(e))
      return null
    } finally {
      setLoading(false)
    }
  }, [repo, fromKey, toKey])

  // 保留 4 周流水：App 挂载时清理一次，不用 cron / Edge Function。
  useEffect(() => {
    if (purged.current) return
    purged.current = true
    repo.purgeOlderThan(retentionCutoff(RETENTION_DAYS)).catch(() => {})
  }, [repo])

  // 切周 / 首次进入：加载数据，并按模板补齐当周（及未来周）的日程。
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    ;(async () => {
      try {
        const loaded = await load()
        if (cancelled || !loaded) return
        if (toKey < dateKey(new Date())) return // 过去的周不回填，避免凭空造历史
        const rows = buildEntriesFor(loaded.templates, days, loaded.entries)
        if (!rows.length) return
        await repo.createEntries(rows)
        if (!cancelled) await load()
      } catch (e) {
        if (!cancelled) setError(`生成日程失败：${e.message ?? e}`)
      }
    })()
    return () => {
      cancelled = true
    }
    // days 每次渲染都是新数组，用 fromKey/toKey 作为真实依赖。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, repo, fromKey, toKey])

  const generateWeek = useCallback(async () => {
    try {
      const rows = buildEntriesFor(templates, days, entries)
      if (rows.length) await repo.createEntries(rows)
      await load()
      return rows.length
    } catch (e) {
      setError(`生成日程失败：${e.message ?? e}`)
      return 0
    }
  }, [repo, templates, entries, days, load])

  /**
   * 所有写操作都走这里：动手之前先把「怎么撤回」记下来。
   * 撤销栈只保留最近 30 步，按一次退一步。
   */
  const act = useCallback(
    async (label, run, inverse) => {
      try {
        const out = await run()
        if (inverse) {
          undoStack.current.push({ label, inverse: () => inverse(out) })
          if (undoStack.current.length > 30) undoStack.current.shift()
          setUndoLabel(label)
        }
        await load()
        return out
      } catch (e) {
        setError(e.message ?? String(e))
      }
    },
    [load],
  )

  const undo = useCallback(async () => {
    const op = undoStack.current.pop()
    setUndoLabel(undoStack.current.at(-1)?.label ?? null)
    if (!op) return
    try {
      await op.inverse()
    } catch (e) {
      setError(`撤销失败：${e.message ?? e}`)
    }
    await load()
  }, [load])

  const findEntry = (id) => entries.find((e) => e.id === id)

  return {
    mode: repo.mode,
    loading,
    error,
    clearError: () => setError(null),
    undo,
    undoLabel,
    canUndo: Boolean(undoLabel),
    monday,
    days,
    isCurrentWeek: fromKey === dateKey(weekStart(new Date())),
    goToDate: (date) => setMonday(weekStart(date)),
    shiftWeek: (delta) => setMonday((m) => addWeeks(m, delta)),
    templates,
    entries,
    habitLogs,
    focus,
    specialDays,
    reload: load,
    generateWeek,

    createTemplate: (data) =>
      act(`新建「${data.title}」`, () => repo.createTemplate(data), (created) =>
        repo.deleteTemplate(created.id),
      ),

    updateTemplate: (id, patch) => {
      const before = templates.find((t) => t.id === id)
      return act(
        `修改「${before?.title ?? ''}」`,
        () => repo.updateTemplate(id, patch),
        () => repo.updateTemplate(id, pick(before, Object.keys(patch))),
      )
    },

    deleteTemplate: (id) => {
      const before = templates.find((t) => t.id === id)
      return act(
        `删除「${before?.title ?? ''}」`,
        () => repo.deleteTemplate(id),
        // 连带删掉的打卡记录恢复不了，模板本身能原样回来
        () => repo.createTemplate(before),
      )
    },

    addEntry: (row) =>
      act(`新增「${row.title}」`, () => repo.createEntries([row]), (created) =>
        created?.[0] ? repo.deleteEntry(created[0].id) : undefined,
      ),

    /** 一次改多条，合成一步撤销 —— 拖动多个块时用。 */
    updateEntries: (updates, label) => {
      const before = updates.map(({ id, patch }) => ({
        id,
        patch: pick(findEntry(id), Object.keys(patch)),
      }))
      return act(
        label ?? `修改 ${updates.length} 项`,
        async () => {
          for (const { id, patch } of updates) await repo.updateEntry(id, patch)
        },
        async () => {
          for (const { id, patch } of before) await repo.updateEntry(id, patch)
        },
      )
    },

    updateEntry: (id, patch, label) => {
      const before = findEntry(id)
      return act(
        label ?? `修改「${before?.title ?? ''}」`,
        () => repo.updateEntry(id, patch),
        () => repo.updateEntry(id, pick(before, Object.keys(patch))),
      )
    },

    deleteEntry: (id) => {
      const before = findEntry(id)
      return act(
        `删除「${before?.title ?? ''}」`,
        () => repo.deleteEntry(id),
        () => repo.createEntries([before]), // 连 id 一起还原
      )
    },

    saveHabitLog: (log) => {
      const before = habitLogs.find(
        (l) => l.template_id === log.template_id && l.date === log.date,
      )
      const name = templates.find((t) => t.id === log.template_id)?.title ?? ''
      return act(
        `打卡「${name}」`,
        () => repo.upsertHabitLog(log),
        () =>
          before
            ? repo.upsertHabitLog(before)
            : repo.deleteHabitLog(log.template_id, log.date),
      )
    },

    saveFocus: (items) => {
      const before = focus.map((f) => f.title)
      return act(
        '修改本周关注',
        () => repo.saveWeeklyFocus(fromKey, items),
        () => repo.saveWeeklyFocus(fromKey, before),
      )
    },

    setSpecialDay: (date, label) => {
      const before = specialDays.find((s) => s.date === date)?.label ?? ''
      return act(
        label ? `标记「${label}」` : '取消特殊日',
        () => repo.setSpecialDay(date, label),
        () => repo.setSpecialDay(date, before),
      )
    },
  }
}

function addWeeks(date, delta) {
  const d = new Date(date)
  d.setDate(d.getDate() + delta * 7)
  return d
}
