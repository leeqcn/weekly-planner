/**
 * 时间轴上重叠的块并排放，不互相挡住。
 * 输入 [{ id, start, end }]（start/end 是 ISO 字符串），
 * 输出每个块所在的列 lane 和这一簇重叠块的总列数 lanes。
 */
export function layoutBlocks(items) {
  const sorted = items
    .map((it) => ({ ...it, from: new Date(it.start).getTime(), to: new Date(it.end).getTime() }))
    .sort((a, b) => a.from - b.from || a.to - b.to)

  const out = []
  let cluster = []
  let clusterEnd = -Infinity

  function flush() {
    if (!cluster.length) return
    const laneEnds = []
    for (const it of cluster) {
      let lane = laneEnds.findIndex((end) => end <= it.from)
      if (lane === -1) {
        laneEnds.push(it.to)
        lane = laneEnds.length - 1
      } else {
        laneEnds[lane] = it.to
      }
      it.lane = lane
    }
    for (const it of cluster) out.push({ ...it, lanes: laneEnds.length })
    cluster = []
    clusterEnd = -Infinity
  }

  for (const it of sorted) {
    if (it.from >= clusterEnd) flush()
    cluster.push(it)
    clusterEnd = Math.max(clusterEnd, it.to)
  }
  flush()
  return out
}
