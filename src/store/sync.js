import { reactive } from 'vue'
import { createGist, findGist, readGist, writeGist } from '../api/gist'
import { getToken } from '../api/github'
import { favorites, onPersist } from './favorites'
import { mergeData } from './merge'

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
    let items = favorites.items.value
    let deleted = favorites.getDeleted()
    if (mergeFirst) {
      try {
        const remote = await readGist(sync.gistId)
        const merged = mergeData(items, deleted, remote.items, remote.deleted)
        items = merged.items
        deleted = merged.deleted
        replaceQuietly(items, deleted)
      } catch { /* remote unreadable, fall back to plain overwrite */ }
    }
    await writeGist(sync.gistId, items, deleted)
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

function replaceQuietly(list, deleted) {
  suppressAuto = true
  try {
    favorites.replaceAll(list)
    if (deleted) favorites.setDeleted(deleted)
  } finally {
    suppressAuto = false
  }
}

export async function pull() {
  return withLock(async () => {
    if (!sync.gistId) throw new Error('尚未开启云端同步')
    const remote = await readGist(sync.gistId)
    const merged = mergeData(favorites.items.value, favorites.getDeleted(), remote.items, remote.deleted)
    replaceQuietly(merged.items, merged.deleted)
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
      const merged = mergeData(favorites.items.value, favorites.getDeleted(), remote.items, remote.deleted)
      replaceQuietly(merged.items, merged.deleted)
      await writeGist(existing, merged.items, merged.deleted)
      toast('已关联云端收藏库并完成合并')
    } else {
      sync.gistId = await createGist(favorites.items.value, favorites.getDeleted())
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
