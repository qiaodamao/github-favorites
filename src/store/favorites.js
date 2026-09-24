import { reactive, computed } from 'vue'
import seed from '../data/seed.json'

const KEY = 'ghf:favorites:v1'
const DEL_KEY = 'ghf:deleted'

// 用户从未主动操作过数据（看到的只是默认/示例列表）时为 true
let userOwned = false

function loadDeleted() {
  try {
    const list = JSON.parse(localStorage.getItem(DEL_KEY))
    if (Array.isArray(list)) return list.filter((d) => d && d.fullName && d.deletedAt)
  } catch { /* ignore */ }
  return []
}

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw !== null) {
      const list = JSON.parse(raw)
      if (Array.isArray(list)) {
        userOwned = true
        return list
      }
    }
  } catch { /* corrupted storage falls back to seed */ }
  return seed.map((r) => ({ ...r, addedAt: null }))
}

const state = reactive({
  items: load(),
  deleted: loadDeleted(),
})

function persist() {
  userOwned = true
  localStorage.setItem(KEY, JSON.stringify(state.items))
  localStorage.setItem(DEL_KEY, JSON.stringify(state.deleted))
  persistListeners.forEach((fn) => fn())
}

const persistListeners = []
export function onPersist(fn) {
  persistListeners.push(fn)
}

export const favorites = {
  items: computed(() => state.items),
  isUserOwned() {
    return userOwned
  },
  getDeleted() {
    return state.deleted
  },
  // 仅供同步写入云端合并结果：持久化但不触发自动推送
  setDeleted(list) {
    state.deleted = Array.isArray(list) ? list.filter((d) => d && d.fullName && d.deletedAt) : []
    localStorage.setItem(DEL_KEY, JSON.stringify(state.deleted))
  },
  // 载入公共默认收藏：只改内存、不写 localStorage，用户第一次操作即成为自己的数据
  useDefault(list) {
    if (userOwned) return
    state.items = list
  },
  has(fullName) {
    return state.items.some((i) => i.fullName.toLowerCase() === fullName.toLowerCase())
  },
  add(repo) {
    const idx = state.items.findIndex((i) => i.fullName.toLowerCase() === repo.fullName.toLowerCase())
    const now = new Date().toISOString()
    if (idx >= 0) {
      const old = state.items[idx]
      // 重复收藏只刷新数据、绝不改动原收藏时间（哪怕是 null），保证卡片位置不变
      const category = repo.category ?? old.category
      const changed = category !== old.category
      state.items[idx] = {
        ...old, ...repo, category, addedAt: old.addedAt,
        catAt: changed ? (repo.catAt || now) : (old.catAt ?? repo.catAt),
      }
    } else {
      state.items.unshift({ ...repo, addedAt: now, ...(repo.category ? { catAt: repo.catAt || now } : {}) })
    }
    // 重新收藏即撤销该项目的删除记录
    const k = repo.fullName.toLowerCase()
    state.deleted = state.deleted.filter((d) => d.fullName.toLowerCase() !== k)
    persist()
    return idx < 0
  },
  remove(fullName) {
    const k = fullName.toLowerCase()
    state.items = state.items.filter((i) => i.fullName.toLowerCase() !== k)
    if (!state.deleted.some((d) => d.fullName.toLowerCase() === k)) {
      state.deleted.push({ fullName, deletedAt: new Date().toISOString() })
    }
    persist()
  },
  update(fullName, repo) {
    const rk = repo.fullName.toLowerCase()
    const idx = state.items.findIndex((i) => i.fullName.toLowerCase() === rk)
    if (idx >= 0) {
      const old = state.items[idx]
      const merged = { ...old, ...repo, addedAt: old.addedAt }
      if (merged.category !== old.category) merged.catAt = new Date().toISOString()
      state.items[idx] = merged
    }
    else if (fullName) this.add(repo)
    persist()
  },
  replaceAll(list) {
    state.items = list
    persist()
  },
  exportJSON() {
    return JSON.stringify(state.items, null, 2)
  },
  importJSON(text) {
    const list = JSON.parse(text)
    if (!Array.isArray(list)) throw new Error('格式不正确')
    const valid = list.filter((i) => i && i.fullName && i.htmlUrl)
    if (!valid.length) throw new Error('文件中没有有效的收藏项')
    this.replaceAll(valid)
    return valid.length
  },
  renameCategory(oldName, newName) {
    let n = 0
    const now = new Date().toISOString()
    for (const i of state.items) if (i.category === oldName) { i.category = newName; i.catAt = now; n++ }
    if (n) persist()
    return n
  },
  clearCategory(name) {
    let n = 0
    const now = new Date().toISOString()
    for (const i of state.items) if (i.category === name) { i.category = ''; i.catAt = now; n++ }
    if (n) persist()
    return n
  },
}
