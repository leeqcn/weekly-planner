import { supabase } from '../supabaseClient'

function unwrap({ data, error }) {
  if (error) throw error
  return data
}

/**
 * Supabase 仓库。RLS 已经保证只能读写自己的数据，
 * 但插入时仍要显式带上 user_id（with check 会校验）。
 */
export function createSupabaseRepo(userId) {
  const own = (row) => ({ ...row, user_id: userId })
  const from = (table) => supabase.from(table)

  return {
    mode: 'supabase',

    async listTemplates() {
      return unwrap(
        await from('templates').select('*').order('created_at', { ascending: true }),
      )
    },

    async createTemplate(data) {
      return unwrap(await from('templates').insert(own(data)).select().single())
    },

    async updateTemplate(id, patch) {
      return unwrap(
        await from('templates').update(patch).eq('id', id).select().single(),
      )
    },

    async deleteTemplate(id) {
      unwrap(await from('templates').delete().eq('id', id))
    },

    async listEntries(fromDate, toDate) {
      return unwrap(
        await from('schedule_entries')
          .select('*')
          .gte('date', fromDate)
          .lte('date', toDate)
          .order('planned_start', { ascending: true, nullsFirst: false }),
      )
    },

    async createEntries(rows) {
      if (!rows.length) return []
      // (template_id, date) 上有唯一索引 —— 重复生成时忽略冲突，天然幂等。
      return unwrap(
        await from('schedule_entries')
          .upsert(rows.map(own), {
            onConflict: 'template_id,date',
            ignoreDuplicates: true,
          })
          .select(),
      )
    },

    async updateEntry(id, patch) {
      return unwrap(
        await from('schedule_entries').update(patch).eq('id', id).select().single(),
      )
    },

    async deleteEntry(id) {
      unwrap(await from('schedule_entries').delete().eq('id', id))
    },

    async listHabitLogs(fromDate, toDate) {
      return unwrap(
        await from('habits_log').select('*').gte('date', fromDate).lte('date', toDate),
      )
    },

    async upsertHabitLog(log) {
      return unwrap(
        await from('habits_log')
          .upsert(own(log), { onConflict: 'template_id,date' })
          .select()
          .single(),
      )
    },

    async listWeeklyFocus(weekStartDate) {
      return unwrap(
        await from('weekly_focus')
          .select('*')
          .eq('week_start_date', weekStartDate)
          .order('priority_order'),
      )
    },

    async saveWeeklyFocus(weekStartDate, items) {
      unwrap(
        await from('weekly_focus').delete().eq('week_start_date', weekStartDate),
      )
      if (!items.length) return []
      return unwrap(
        await from('weekly_focus')
          .insert(
            items.map((title, i) =>
              own({ week_start_date: weekStartDate, title, priority_order: i + 1 }),
            ),
          )
          .select(),
      )
    },

    async listSpecialDays(fromDate, toDate) {
      return unwrap(
        await from('special_days')
          .select('*')
          .gte('date', fromDate)
          .lte('date', toDate),
      )
    },

    async setSpecialDay(date, label) {
      if (!label) {
        unwrap(await from('special_days').delete().eq('date', date))
        return null
      }
      return unwrap(
        await from('special_days')
          .upsert(own({ date, label }), { onConflict: 'user_id,date' })
          .select()
          .single(),
      )
    },

    async purgeOlderThan(cutoff) {
      unwrap(await from('schedule_entries').delete().lt('date', cutoff))
      unwrap(await from('habits_log').delete().lt('date', cutoff))
    },
  }
}
