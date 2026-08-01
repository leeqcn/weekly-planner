/**
 * 本地 mock 仓库：数据存 localStorage，不需要 Supabase 也能把 UI 跑起来。
 * 接口与 supabase.js 完全一致，App 层感知不到差别。
 */
const KEY = 'weekly-planner:mock'

const EMPTY = {
  templates: [],
  schedule_entries: [],
  habits_log: [],
  weekly_focus: [],
  special_days: [],
  categories: [],
  daily_rollup: [],
}

function load() {
  try {
    return { ...EMPTY, ...JSON.parse(localStorage.getItem(KEY) || '{}') }
  } catch {
    return { ...EMPTY }
  }
}

function save(db) {
  localStorage.setItem(KEY, JSON.stringify(db))
  return db
}

function mutate(fn) {
  const db = load()
  const result = fn(db)
  save(db)
  return result
}

const uid = () => crypto.randomUUID()
const inRange = (row, from, to) => row.date >= from && row.date <= to

export function createMockRepo(seed) {
  if (!localStorage.getItem(KEY) && seed) save({ ...EMPTY, ...seed })

  return {
    mode: 'mock',

    async listTemplates() {
      return load().templates
    },

    async createTemplate(data) {
      return mutate((db) => {
        // 带 id 就沿用 —— 撤销「删除」时要把原来那一行原样放回去
        const row = { created_at: new Date().toISOString(), ...data, id: data.id ?? uid() }
        db.templates.push(row)
        return row
      })
    },

    async updateTemplate(id, patch) {
      return mutate((db) => {
        const row = db.templates.find((t) => t.id === id)
        Object.assign(row, patch)
        return row
      })
    },

    async deleteTemplate(id) {
      mutate((db) => {
        db.templates = db.templates.filter((t) => t.id !== id)
        db.habits_log = db.habits_log.filter((h) => h.template_id !== id)
        db.schedule_entries.forEach((e) => {
          if (e.template_id === id) e.template_id = null
        })
      })
    },

    async listEntries(from, to) {
      return load().schedule_entries.filter((e) => inRange(e, from, to))
    },

    async createEntries(rows) {
      return mutate((db) => {
        // (template_id, date) 唯一 —— 重复生成时跳过已存在的。
        const seen = new Set(
          db.schedule_entries
            .filter((e) => e.template_id)
            .map((e) => `${e.template_id}|${e.date}`),
        )
        const added = []
        for (const row of rows) {
          const k = `${row.template_id}|${row.date}`
          if (row.template_id && seen.has(k)) continue
          seen.add(k)
          const entry = { created_at: new Date().toISOString(), ...row, id: row.id ?? uid() }
          db.schedule_entries.push(entry)
          added.push(entry)
        }
        return added
      })
    },

    /** 改模板时把已经生成的条目一起改（只动 fromDate 之后的）。 */
    async updateEntriesByTemplate(templateId, patch, fromDate) {
      mutate((db) => {
        db.schedule_entries.forEach((e) => {
          if (e.template_id === templateId && e.date >= fromDate) Object.assign(e, patch)
        })
      })
    },

    async updateEntry(id, patch) {
      return mutate((db) => {
        const row = db.schedule_entries.find((e) => e.id === id)
        Object.assign(row, patch)
        return row
      })
    },

    async deleteEntry(id) {
      mutate((db) => {
        db.schedule_entries = db.schedule_entries.filter((e) => e.id !== id)
      })
    },

    async listHabitLogs(from, to) {
      return load().habits_log.filter((h) => inRange(h, from, to))
    },

    async upsertHabitLog({ template_id, date, completion_pct, note }) {
      return mutate((db) => {
        let row = db.habits_log.find(
          (h) => h.template_id === template_id && h.date === date,
        )
        if (!row) {
          row = { id: uid(), template_id, date, created_at: new Date().toISOString() }
          db.habits_log.push(row)
        }
        row.completion_pct = completion_pct
        row.note = note ?? null
        return row
      })
    },

    async deleteHabitLog(templateId, date) {
      mutate((db) => {
        db.habits_log = db.habits_log.filter(
          (h) => !(h.template_id === templateId && h.date === date),
        )
      })
    },

    async listWeeklyFocus(weekStartDate) {
      return load()
        .weekly_focus.filter((f) => f.week_start_date === weekStartDate)
        .sort((a, b) => a.priority_order - b.priority_order)
    },

    async saveWeeklyFocus(weekStartDate, items) {
      return mutate((db) => {
        db.weekly_focus = db.weekly_focus.filter(
          (f) => f.week_start_date !== weekStartDate,
        )
        const rows = items.map((title, i) => ({
          id: uid(),
          week_start_date: weekStartDate,
          title,
          priority_order: i + 1,
        }))
        db.weekly_focus.push(...rows)
        return rows
      })
    },

    async listSpecialDays(from, to) {
      return load().special_days.filter((d) => inRange(d, from, to))
    },

    async setSpecialDay(date, label) {
      return mutate((db) => {
        db.special_days = db.special_days.filter((d) => d.date !== date)
        if (!label) return null
        const row = { id: uid(), date, label }
        db.special_days.push(row)
        return row
      })
    },

    async listCategories() {
      return load().categories
    },

    async createCategory(data) {
      return mutate((db) => {
        const row = {
          created_at: new Date().toISOString(),
          color: null,
          sort_order: 0,
          is_active: true,
          ...data,
          id: data.id ?? uid(),
        }
        db.categories.push(row)
        return row
      })
    },

    async updateCategory(id, patch) {
      return mutate((db) => {
        const row = db.categories.find((c) => c.id === id)
        Object.assign(row, patch)
        return row
      })
    },

    async listRollups(from, to) {
      return load().daily_rollup.filter((r) => inRange(r, from, to))
    },

    /** 幂等覆盖：同一个 (date, category_key) 有就改、没有就加。 */
    async saveRollups(rows) {
      if (!rows.length) return []
      return mutate((db) => {
        for (const row of rows) {
          const found = db.daily_rollup.find(
            (r) => r.date === row.date && r.category_key === row.category_key,
          )
          if (found) Object.assign(found, row, { updated_at: new Date().toISOString() })
          else
            db.daily_rollup.push({
              id: uid(),
              updated_at: new Date().toISOString(),
              ...row,
            })
        }
        return rows
      })
    },

    async deleteRollups(keys) {
      if (!keys.length) return
      mutate((db) => {
        const drop = new Set(keys.map((k) => `${k.date}|${k.category_key}`))
        db.daily_rollup = db.daily_rollup.filter(
          (r) => !drop.has(`${r.date}|${r.category_key}`),
        )
      })
    },

    async purgeOlderThan(cutoff) {
      return mutate((db) => {
        const before = db.schedule_entries.length
        db.schedule_entries = db.schedule_entries.filter((e) => e.date >= cutoff)
        // habits_log 和 daily_rollup 都不清：
        //   前者本身就已经是汇总（一天一个习惯一行、一年才两千行），
        //   删掉等于把打卡历史丢了，而它是打卡统计仅有的来源；
        //   后者是明细被删之后时间统计仅有的来源。
        return before - db.schedule_entries.length
      })
    },
  }
}
