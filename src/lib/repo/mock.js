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
        const row = { ...data, id: uid(), created_at: new Date().toISOString() }
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
          const entry = { ...row, id: uid(), created_at: new Date().toISOString() }
          db.schedule_entries.push(entry)
          added.push(entry)
        }
        return added
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

    async purgeOlderThan(cutoff) {
      return mutate((db) => {
        const before =
          db.schedule_entries.length + db.habits_log.length
        db.schedule_entries = db.schedule_entries.filter((e) => e.date >= cutoff)
        db.habits_log = db.habits_log.filter((h) => h.date >= cutoff)
        return before - (db.schedule_entries.length + db.habits_log.length)
      })
    },
  }
}
