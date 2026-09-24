// 纯函数合并逻辑：收藏项 + 删除墓碑（tombstone）
// 墓碑记录了「某项目在某时刻被删除」，合并时云端/本地任何一方已删的项目不会再复活；
// 若项目在删除之后又被重新收藏（addedAt > deletedAt），墓碑自动失效。

const TOMB_TTL = 90 * 24 * 3600 * 1000 // 墓碑保留 90 天，超期视为所有设备都已同步

export function mergeLists(local, remote) {
  const map = new Map()
  for (const item of [...local, ...remote]) {
    const k = item.fullName.toLowerCase()
    const prev = map.get(k)
    if (!prev) {
      map.set(k, item)
      continue
    }
    const [winner, loser] = (item.addedAt || '') >= (prev.addedAt || '') ? [item, prev] : [prev, item]
    map.set(k, winner.category === undefined && loser.category !== undefined
      ? { ...winner, category: loser.category }
      : winner)
  }
  return [...map.values()].sort((a, b) => (b.addedAt || '').localeCompare(a.addedAt || ''))
}

// 按 fullName 去重，保留更晚的删除时间
export function mergeDeleted(a, b) {
  const map = new Map()
  for (const d of [...a, ...b]) {
    if (!d || !d.fullName || !d.deletedAt) continue
    const k = d.fullName.toLowerCase()
    const prev = map.get(k)
    if (!prev || d.deletedAt > prev.deletedAt) map.set(k, d)
  }
  return [...map.values()]
}

// 清理：超过 TTL、或任意一侧存在"删除后又重新收藏"的项目
export function pruneDeleted(deleted, ...itemLists) {
  const now = Date.now()
  return deleted.filter((d) => {
    if (now - new Date(d.deletedAt).getTime() > TOMB_TTL) return false
    const k = d.fullName.toLowerCase()
    return !itemLists.some((list) =>
      list.some((i) => i.fullName.toLowerCase() === k && (i.addedAt || '') > d.deletedAt)
    )
  })
}

export function filterAlive(items, deleted) {
  if (!deleted.length) return items
  return items.filter((i) => {
    const k = i.fullName.toLowerCase()
    const tomb = deleted.find((d) => d.fullName.toLowerCase() === k)
    return !tomb || (i.addedAt || '') > tomb.deletedAt
  })
}

export function mergeData(localItems, localDeleted, remoteItems, remoteDeleted) {
  const deleted = pruneDeleted(mergeDeleted(localDeleted, remoteDeleted), localItems, remoteItems)
  const items = mergeLists(filterAlive(localItems, deleted), filterAlive(remoteItems, deleted))
  return { items, deleted }
}
