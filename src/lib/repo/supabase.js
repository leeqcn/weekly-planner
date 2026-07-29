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
      const payload = rows.map(own)

      // 用普通 insert 而不是 upsert：0001 里的唯一索引是部分索引
      // （where template_id is not null），Postgres 的 ON CONFLICT 推断不了部分索引，
      // upsert 会直接报 42P10。调用方已经过滤掉存在的条目，幂等性由那里保证。
      const batch = await from('schedule_entries').insert(payload).select()
      if (!batch.error) return batch.data ?? []
      if (batch.error.code !== '23505') throw batch.error

      // 23505 = 撞上唯一索引。整批插入只要冲突一条就全部回滚，
      // 所以退回逐条插入，只跳过已经生成过的那几条。
      const inserted = []
      for (const row of payload) {
        const one = await from('schedule_entries').insert(row).select().single()
        if (one.error) {
          if (one.error.code !== '23505') throw one.error
          continue
        }
        inserted.push(one.data)
      }
      return inserted
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

    async deleteHabitLog(templateId, date) {
      unwrap(
        await from('habits_log').delete().eq('template_id', templateId).eq('date', date),
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
