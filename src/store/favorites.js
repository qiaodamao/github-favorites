import { reactive, computed } from 'vue'
import seed from '../data/seed.json'

const KEY = 'ghf:favorites:v1'

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw !== null) {
      const list = JSON.parse(raw)
      if (Array.isArray(list)) return list
    }
  } catch { /* corrupted storage falls back to seed */ }
  return seed.map((r) => ({ ...r, addedAt: null }))
}

const state = reactive({
  items: load(),
})

function persist() {
  localStorage.setItem(KEY, JSON.stringify(state.items))
  persistListeners.forEach((fn) => fn())
}

const persistListeners = []
export function onPersist(fn) {
  persistListeners.push(fn)
}

export const favorites = {
  items: computed(() => state.items),
  has(fullName) {
    return state.items.some((i) => i.fullName.toLowerCase() === fullName.toLowerCase())
  },
  add(repo) {
    const idx = state.items.findIndex((i) => i.fullName.toLowerCase() === repo.fullName.toLowerCase())
    const item = { ...repo, addedAt: new Date().toISOString() }
    if (idx >= 0) {
      state.items[idx] = { ...item, addedAt: state.items[idx].addedAt || item.addedAt }
    } else {
      state.items.unshift(item)
    }
    persist()
    return idx < 0
  },
  remove(fullName) {
    state.items = state.items.filter((i) => i.fullName !== fullName)
    persist()
  },
  update(fullName, repo) {
    const idx = state.items.findIndex((i) => i.fullName === repo.fullName)
    if (idx >= 0) state.items[idx] = { ...state.items[idx], ...repo, addedAt: state.items[idx].addedAt }
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
    for (const i of state.items) if (i.category === oldName) { i.category = newName; n++ }
    if (n) persist()
    return n
  },
  clearCategory(name) {
    let n = 0
    for (const i of state.items) if (i.category === name) { i.category = ''; n++ }
    if (n) persist()
    return n
  },
}
