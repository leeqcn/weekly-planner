/**
 * 「要改的那一行在库里找不到」。
 *
 * 两个仓库都得抛同一个东西，上层才只有一条处理路径 —— 不然本地模式抛
 * TypeError、线上抛 PostgREST 的英文原文，同一个毛病要写两遍处理。
 *
 * 出现它就说明**内存里那份数据过期了**：界面上还有这条，服务器上已经没了。
 * 上层的处理是重新读一次再把话说明白（见 usePlanner 的 act）。
 */
/**
 * 「这次请求没带上有效的身份」。
 *
 * 长成和 rowGone 一模一样的样子（写都影响 0 行），但原因完全不同：
 * 数据好好的，是登录状态过期了，RLS 把每一行都挡在外面。
 * 分开报，不然「这条没了」会把人往数据丢了的方向带。
 */
export function notSignedIn() {
  console.warn('[weekly-planner] 写入时没有有效的登录状态 —— 大概是挂在后台太久，token 过期了')
  const e = new Error('not signed in')
  e.code = 'NO_SESSION'
  return e
}

export function rowGone(table, id) {
  // 这种事很难复现，真出问题时得有据可查
  console.warn(`[weekly-planner] ${table} id=${id} 没匹配到任何行 —— 界面数据和数据库对不上`)
  const e = new Error(`${table} ${id} not found`)
  e.code = 'ROW_GONE'
  // 界面上那个「详情」要显示这两个 —— 手机上看 console 得接线，指望不上
  e.table = table
  e.rowId = id
  return e
}
