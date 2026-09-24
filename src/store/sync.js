import { reactive } from 'vue'
import { createGist, findGist, readGist, writeGist } from '../api/gist'
import { getToken } from '../api/github'
import { favorites, onPersist } from './favorites'

const ID_KEY = 'ghf:gistId'
const AUTO_KEY = 'ghf:autoSync'

export const sync = reactive({
  gistId: localStorage.getItem(ID_KEY) || '',
  autoSync: localStorage.getItem(AUTO_KEY) === '1',
  busy: false,
  lastSyncAt: '',
})

const toastHandlers = []
export function onSyncToast(fn) {
  toastHandlers.push(fn)
}
function toast(msg, isErr = false) {
  toastHandlers.forEach((fn) => fn(msg, isErr))
}

export function setAutoSync(v) {
  sync.autoSync = v
  localStorage.setItem(AUTO_KEY, v ? '1' : '0')
}

// Union merge by fullName; the entry with a newer addedAt wins, remote breaks ties
function mergeLists(local, remote) {
  const map = new Map()
  for (const item of [...local, ...remote]) {
    const k = item.fullName.toLowerCase()
    const prev = map.get(k)
    if (!prev || (item.addedAt || '') >= (prev.addedAt || '')) map.set(k, item)
  }
  return [...map.values()].sort((a, b) => (b.addedAt || '').localeCompare(a.addedAt || ''))
}

async function withLock(fn) {
  if (sync.busy) throw new Error('同步进行中，请稍候')
  sync.busy = true
  try {
    return await fn()
  } finally {
    sync.busy = false
  }
}

let suppressAuto = false

export async function push({ mergeFirst = false } = {}) {
  return withLock(async () => {
    if (!sync.gistId) throw new Error('尚未开启云端同步')
    let list = favorites.items.value
    if (mergeFirst) {
      try {
        list = mergeLists(list, await readGist(sync.gistId))
      } catch { /* remote unreadable, fall back to plain overwrite */ }
    }
    await writeGist(sync.gistId, list)
    sync.lastSyncAt = new Date().toLocaleTimeString()
  })
}

let pushTimer = null
function schedulePush() {
  if (suppressAuto || !sync.autoSync || !sync.gistId) return
  clearTimeout(pushTimer)
  pushTimer = setTimeout(() => {
    push({ mergeFirst: true })
      .then(() => toast('已自动同步到云端'))
      .catch((e) => toast('自动同步失败：' + e.message, true))
  }, 2000)
}

function replaceQuietly(list) {
  suppressAuto = true
  try {
    favorites.replaceAll(list)
  } finally {
    suppressAuto = false
  }
}

export async function pull() {
  return withLock(async () => {
    if (!sync.gistId) throw new Error('尚未开启云端同步')
    const remote = await readGist(sync.gistId)
    replaceQuietly(mergeLists(favorites.items.value, remote))
    sync.lastSyncAt = new Date().toLocaleTimeString()
  })
}

// First run on any device with the same token: creates or re-links the gist
export async function enableCloudSync() {
  return withLock(async () => {
    if (!getToken()) throw new Error('请先在「GitHub Token」处保存一个带 gist 权限的 Token')
    const existing = await findGist()
    if (existing) {
      sync.gistId = existing
      const remote = await readGist(existing)
      const merged = mergeLists(favorites.items.value, remote)
      replaceQuietly(merged)
      await writeGist(existing, merged)
      toast('已关联云端收藏库并完成合并')
    } else {
      sync.gistId = await createGist(favorites.items.value)
      toast('已创建云端收藏库（Secret Gist）')
    }
    localStorage.setItem(ID_KEY, sync.gistId)
    setAutoSync(true)
    sync.lastSyncAt = new Date().toLocaleTimeString()
  })
}

export function disableCloudSync() {
  sync.gistId = ''
  setAutoSync(false)
  localStorage.removeItem(ID_KEY)
  toast('已关闭云端同步（云端 Gist 数据仍保留）')
}

export async function initSync() {
  onPersist(schedulePush)
  if (sync.autoSync && sync.gistId && getToken()) {
    try {
      await pull()
      toast('已从云端同步最新收藏')
    } catch (e) {
      toast('云端自动拉取失败：' + e.message, true)
    }
  }
}
