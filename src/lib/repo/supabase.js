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

    /** 改模板时把已经生成的条目一起改（只动 fromDate 之后的）。 */
    async updateEntriesByTemplate(templateId, patch, fromDate) {
      unwrap(
        await from('schedule_entries')
          .update(patch)
          .eq('template_id', templateId)
          .gte('date', fromDate),
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

    async listCategories() {
      return unwrap(
        await from('categories').select('*').order('sort_order', { ascending: true }),
      )
    },

    async createCategory(data) {
      return unwrap(await from('categories').insert(own(data)).select().single())
    },

    async updateCategory(id, patch) {
      return unwrap(
        await from('categories').update(patch).eq('id', id).select().single(),
      )
    },

    async listRollups(fromDate, toDate) {
      return unwrap(
        await from('daily_rollup')
          .select('*')
          .gte('date', fromDate)
          .lte('date', toDate)
          .order('date', { ascending: true }),
      )
    },

    /**
     * 幂等覆盖。0007 里 (user_id, date, category_key) 是**普通唯一约束**
     * 而不是部分索引，所以这里的 upsert 推断得出来 —— 0002 那次 42P10
     * 就是栽在部分索引上的。
     */
    async saveRollups(rows) {
      if (!rows.length) return []
      return unwrap(
        await from('daily_rollup')
          .upsert(
            rows.map((r) => own({ ...r, updated_at: new Date().toISOString() })),
            { onConflict: 'user_id,date,category_key' },
          )
          .select(),
      )
    },

    async deleteRollups(keys) {
      for (const k of keys) {
        unwrap(
          await from('daily_rollup')
            .delete()
            .eq('date', k.date)
            .eq('category_key', k.category_key),
        )
      }
    },

    async purgeOlderThan(cutoff) {
      unwrap(await from('schedule_entries').delete().lt('date', cutoff))
      // habits_log 和 daily_rollup 都不清：
      //   前者本身就已经是汇总（一天一个习惯一行、一年才两千行），
      //   删掉等于把打卡历史丢了，而它是打卡统计仅有的来源；
      //   后者是明细被删之后时间统计仅有的来源。
    },
  }
}
