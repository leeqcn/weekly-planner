import { useCallback, useEffect, useRef, useState } from 'react'
import { buildEntriesFor } from '../lib/generate'
import { addDays, dateKey, retentionCutoff, weekDays, weekStart } from '../lib/dates'
import { DEFAULT_CATEGORIES } from '../lib/categories'
import { buildRollups, staleRollupKeys } from '../lib/rollup'

/**
 * 流水明细保留 4 周，超期删除，数据库不会一直变大。
 * 统计不受影响 —— 明细被删之前已经落进 daily_rollup 了（见下面的 syncRollups）。
 */
export const RETENTION_DAYS = 28

/**
 * 汇总往回看多久。比保留期长得多是有意的 —— 清理只在打开 app 时跑，
 * 隔很久没开就会积压一堆超期明细，它们必须先被汇总下来再删。
 * 稳态下这个范围里其实只有 28 天的数据，查起来不贵。
 */
const ROLLUP_LOOKBACK_DAYS = 400

const pick = (obj, keys) => Object.fromEntries(keys.map((k) => [k, obj?.[k] ?? null]))

/**
 * 全部数据加载 / 写入都收在这里，组件只管渲染。
 * 一次只加载当前显示这一周的流水数据，页面轻量。
 */
export function usePlanner(repo) {
  const [monday, setMonday] = useState(() => weekStart(new Date()))
  const [templates, setTemplates] = useState([])
  const [categories, setCategories] = useState([])
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
      const [tpl, cat, ent, logs, foc, sp] = await Promise.all([
        repo.listTemplates(),
        repo.listCategories(),
        repo.listEntries(fromKey, toKey),
        repo.listHabitLogs(fromKey, toKey),
        repo.listWeeklyFocus(fromKey),
        repo.listSpecialDays(fromKey, toKey),
      ])
      setTemplates(tpl)
      setCategories(cat)
      setEntries(ent)
      setHabitLogs(logs)
      setFocus(foc)
      setSpecialDays(sp)
      return { templates: tpl, entries: ent, categories: cat }
    } catch (e) {
      setError(e.message ?? String(e))
      return null
    } finally {
      setLoading(false)
    }
  }, [repo, fromKey, toKey])

  /**
   * App 挂载时跑一次，三件事**必须按这个顺序**：
   *
   *   1. 没有分类就建一套默认的（第一次进来）
   *   2. 把保留期内的每一天整个重算成汇总，覆盖写回
   *   3. 才轮到清理明细
   *
   * 2 在 3 前面是关键：一天的数据在被删掉之前，已经被写进汇总二十多次了。
   * 反过来的话，超过 28 天没打开 app，那段时间的统计就永远没了。
   *
   * 重算而不是增量：整段覆盖是幂等的，漏跑错跑下次自动修好。
   * 增量要维护「统计到哪天了」的水位线，漏一次少一段、重一次多一段，
   * 而且出了问题根本发现不了。
   */
  useEffect(() => {
    if (purged.current) return
    purged.current = true
    ;(async () => {
      try {
        const existing = await repo.listCategories()
        if (!existing.length) {
          for (const c of DEFAULT_CATEGORIES) await repo.createCategory(c)
          await load()
        }
      } catch { /* 建默认分类失败不该挡住 app */ }

      const cutoff = retentionCutoff(RETENTION_DAYS)
      try {
        await syncRollups(repo, cutoff, dateKey(new Date()))
      } catch (e) {
        setError(`统计汇总失败：${e.message ?? e}`)
        return // 汇总没成功就绝对不能往下删明细
      }
      await repo.purgeOlderThan(cutoff).catch(() => {})
    })()
    // load 每次切周都会变，但这段只跑一次（purged 挡着），不进依赖
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    categories,
    entries,
    habitLogs,
    focus,
    specialDays,
    reload: load,
    generateWeek,

    /**
     * 统计页打开时调一次：先把这次会话里改过的东西重算进汇总，再读回来。
     * 不在每次写入后都跑 —— 那是每一下拖动都多两次往返，而统计不看实时。
     */
    loadStats: async (weeks = 12) => {
      const today = dateKey(new Date())
      try {
        await syncRollups(repo, retentionCutoff(RETENTION_DAYS), today)
      } catch (e) {
        setError(`统计汇总失败：${e.message ?? e}`)
      }
      const from = dateKey(addDays(weekStart(new Date()), -7 * (weeks - 1)))
      return repo.listRollups(from, today)
    },

    createCategory: (data) =>
      act(`新建分类「${data.name}」`, () => repo.createCategory(data), (created) =>
        repo.updateCategory(created.id, { is_active: false }),
      ),

    updateCategory: (id, patch) => {
      const before = categories.find((c) => c.id === id)
      return act(
        `修改分类「${before?.name ?? ''}」`,
        () => repo.updateCategory(id, patch),
        () => repo.updateCategory(id, pick(before, Object.keys(patch))),
      )
    },

    createTemplate: (data) =>
      act(`新建「${data.title}」`, () => repo.createTemplate(data), (created) =>
        repo.deleteTemplate(created.id),
      ),

    updateTemplate: (id, patch) => {
      const before = templates.find((t) => t.id === id)

      // 标题和「留」这两样是数据，已经生成的条目里存的是当时的副本，
      // 改模板必须把它们一起改掉，否则周视图还显示旧标题。
      // （颜色不在这里 —— 它渲染时直接从模板取，不存副本。）
      const spread = Object.fromEntries(
        ['title', 'keep_in_todo'].filter((k) => k in patch).map((k) => [k, patch[k]]),
      )
      const today = dateKey(new Date())
      const affected = Object.keys(spread).length
        ? entries.filter((e) => e.template_id === id && e.date >= today)
        : []

      return act(
        `修改「${before?.title ?? ''}」`,
        async () => {
          await repo.updateTemplate(id, patch)
          if (affected.length) await repo.updateEntriesByTemplate(id, spread, today)
        },
        async () => {
          await repo.updateTemplate(id, pick(before, Object.keys(patch)))
          for (const e of affected) {
            await repo.updateEntry(e.id, pick(e, Object.keys(spread)))
          }
        },
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

/**
 * 把明细重算成汇总，覆盖写回，并删掉已经不该存在的行。
 *
 * 两个范围，故意不一样：
 *
 * **写**的范围要盖住**所有还存在的明细**，不能只盖保留期。清理只在打开 app
 * 时跑，所以完全可能积压：六周没开，那就有 42 天的明细堆着，
 * 其中最老的两周正要被删。只汇总保留期内的话，那两周直接蒸发。
 *
 * **删**的范围只能是保留期内。这一条是关键：一个日期在汇总里有行、
 * 明细里却没有，在保留期内意味着「那天的条目被删光了」（该清），
 * 在保留期外意味着「明细早就被清理掉了」（绝对不能删，那是仅存的历史）。
 * 同一个现象，两种完全相反的含义，只能靠日期分开。
 *
 * 只算到**今天**为止：未来那几天只有计划没有实际，先汇总进去的话
 * 「本周实际 0 小时、计划 40 小时」这种数字会一直挂着，等到那天再算就行。
 */
async function syncRollups(repo, cutoffKey, toKey) {
  const fromKey = dateKey(addDays(new Date(toKey), -ROLLUP_LOOKBACK_DAYS))
  if (fromKey > toKey) return

  const [entries, templates, existing] = await Promise.all([
    repo.listEntries(fromKey, toKey),
    repo.listTemplates(),
    repo.listRollups(cutoffKey, toKey),
  ])

  // 写：所有还有明细的日期
  const writeDates = [...new Set(entries.map((e) => e.date))]
  const fresh = buildRollups(entries, templates, writeDates)

  // 删：只在保留期内比对
  const keepDates = []
  for (let d = new Date(cutoffKey); dateKey(d) <= toKey; d = addDays(d, 1)) {
    keepDates.push(dateKey(d))
  }
  const stale = staleRollupKeys(existing, fresh, keepDates)

  if (fresh.length) await repo.saveRollups(fresh)
  if (stale.length) await repo.deleteRollups(stale)
  return { written: fresh.length, removed: stale.length }
}

function addWeeks(date, delta) {
  const d = new Date(date)
  d.setDate(d.getDate() + delta * 7)
  return d
}
