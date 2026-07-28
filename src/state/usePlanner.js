import { useCallback, useEffect, useRef, useState } from 'react'
import { buildEntriesFor } from '../lib/generate'
import { dateKey, retentionCutoff, weekDays, weekStart } from '../lib/dates'

/** 流水数据保留 4 周，超期删除，数据库不会一直变大。 */
export const RETENTION_DAYS = 28

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

  const days = weekDays(monday)
  const fromKey = dateKey(days[0])
  const toKey = dateKey(days[6])
  const purged = useRef(false)

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
  // 以后加统计功能时，统计结果单独落表，不受这里影响。
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
      const loaded = await load()
      if (cancelled || !loaded) return
      if (toKey < dateKey(new Date())) return // 过去的周不回填，避免凭空造历史
      const rows = buildEntriesFor(loaded.templates, days, loaded.entries)
      if (!rows.length) return
      await repo.createEntries(rows)
      if (!cancelled) await load()
    })()
    return () => {
      cancelled = true
    }
    // days 每次渲染都是新数组，用 fromKey/toKey 作为真实依赖。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, repo, fromKey, toKey])

  /** 手动补齐当周日程（新建模板后、或想给过去的周补数据时用）。 */
  const generateWeek = useCallback(async () => {
    const rows = buildEntriesFor(templates, days, entries)
    if (rows.length) await repo.createEntries(rows)
    await load()
    return rows.length
  }, [repo, templates, entries, days, load])

  const wrap = useCallback(
    (fn) =>
      async (...args) => {
        try {
          const out = await fn(...args)
          await load()
          return out
        } catch (e) {
          setError(e.message ?? String(e))
        }
      },
    [load],
  )

  return {
    mode: repo.mode,
    loading,
    error,
    clearError: () => setError(null),
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
    createTemplate: wrap((data) => repo.createTemplate(data)),
    updateTemplate: wrap((id, patch) => repo.updateTemplate(id, patch)),
    deleteTemplate: wrap((id) => repo.deleteTemplate(id)),
    addEntry: wrap((row) => repo.createEntries([row])),
    updateEntry: wrap((id, patch) => repo.updateEntry(id, patch)),
    deleteEntry: wrap((id) => repo.deleteEntry(id)),
    saveHabitLog: wrap((log) => repo.upsertHabitLog(log)),
    saveFocus: wrap((items) => repo.saveWeeklyFocus(fromKey, items)),
    setSpecialDay: wrap((date, label) => repo.setSpecialDay(date, label)),
  }
}

function addWeeks(date, delta) {
  const d = new Date(date)
  d.setDate(d.getDate() + delta * 7)
  return d
}
