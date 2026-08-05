import { addDays, dateKey, weekStart } from './dates'
import { tr } from './i18n'

/** 第一次以 mock 模式启动时灌入的示例数据，方便直接看 UI 效果。 */
export function buildSeed() {
  const t = (data) => ({
    id: crypto.randomUUID(),
    priority: null,
    min_duration_minutes: null,
    max_duration_minutes: null,
    start_time: null,
    end_time: null,
    is_active: true,
    created_at: new Date().toISOString(),
    ...data,
  })

  const templates = [
    t({
      title: tr('上班'),
      type: 'event',
      recurrence: 'weekly',
      recurrence_days: [1, 2, 3, 4, 5],
      start_time: '09:30',
      end_time: '18:30',
    }),
    t({
      title: tr('写周报'),
      type: 'event',
      recurrence: 'weekly',
      recurrence_days: [5],
      start_time: '17:00',
      end_time: '18:00',
    }),
    t({
      title: tr('读书'),
      type: 'event',
      recurrence: 'weekly',
      recurrence_days: [2, 4, 6],
      start_time: '21:00',
      end_time: '22:00',
    }),
    t({
      title: tr('交房租'),
      type: 'todo',
      priority: 'must',
      min_duration_minutes: 15,
      max_duration_minutes: 15,
      recurrence: 'monthly',
      recurrence_days: [1],
    }),
    t({
      title: tr('购物'),
      type: 'todo',
      priority: 'optional',
      min_duration_minutes: 30,
      max_duration_minutes: 60,
      recurrence: 'weekly',
      recurrence_days: [2, 5],
    }),
    // 习惯每天重复
    t({
      title: tr('运动'),
      type: 'habit',
      recurrence: 'weekly',
      recurrence_days: [1, 2, 3, 4, 5, 6, 7],
    }),
    t({
      title: tr('早睡'),
      type: 'habit',
      recurrence: 'weekly',
      recurrence_days: [1, 2, 3, 4, 5, 6, 7],
    }),
  ]

  const monday = weekStart(new Date())
  // 按标题找会跟着语言变，翻成英文之后就找不着了（→ undefined.id 直接崩）。
  // 用位置找：这两条就是上面数组里的最后两个 habit
  const sleep = templates.find((x) => x.title === tr('早睡'))
  const sport = templates.find((x) => x.title === tr('运动'))

  return {
    templates,
    habits_log: [
      { id: crypto.randomUUID(), template_id: sleep.id, date: dateKey(monday), completion_pct: 100, note: tr('23:00 睡的') },
      { id: crypto.randomUUID(), template_id: sleep.id, date: dateKey(addDays(monday, 1)), completion_pct: 60, note: null },
      { id: crypto.randomUUID(), template_id: sport.id, date: dateKey(monday), completion_pct: 40, note: tr('只走了 20 分钟') },
    ],
    weekly_focus: [
      { id: crypto.randomUUID(), week_start_date: dateKey(monday), title: tr('睡眠'), priority_order: 1 },
      { id: crypto.randomUUID(), week_start_date: dateKey(monday), title: tr('运动'), priority_order: 2 },
    ],
    special_days: [
      { id: crypto.randomUUID(), date: dateKey(addDays(monday, 6)), label: tr('专注学习') },
    ],
  }
}
