/**
 * 「要改的那一行在库里找不到」。
 *
 * 两个仓库都得抛同一个东西，上层才只有一条处理路径 —— 不然本地模式抛
 * TypeError、线上抛 PostgREST 的英文原文，同一个毛病要写两遍处理。
 *
 * 出现它就说明**内存里那份数据过期了**：界面上还有这条，服务器上已经没了。
 * 上层的处理是重新读一次再把话说明白（见 usePlanner 的 act）。
 */
export function rowGone(table, id) {
  // 这种事很难复现，真出问题时得有据可查
  console.warn(`[weekly-planner] ${table} id=${id} 没匹配到任何行 —— 界面数据和数据库对不上`)
  const e = new Error(`${table} ${id} not found`)
  e.code = 'ROW_GONE'
  return e
}
