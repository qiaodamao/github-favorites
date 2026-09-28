import { ref } from 'vue'

const KEY = 'ghf:catOrder'

export const CAT_SUGGESTIONS = ['AI', '开发工具', '命令行工具', '设计创意', '资源集合', '前端', '学习资源', '效率工具']

function read() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY))
    // 旧格式：纯数组（无时间戳）
    if (Array.isArray(v)) return { order: v.filter((s) => typeof s === 'string'), at: '' }
    if (v && Array.isArray(v.order)) return { order: v.order.filter((s) => typeof s === 'string'), at: v.at || '' }
  } catch { /* ignore */ }
  return { order: [], at: '' }
}

const init = read()
export const catOrder = ref(init.order)
export const catOrderAt = ref(init.at)

const listeners = []
export function onCatOrderChange(fn) {
  listeners.push(fn)
}

function persist() {
  localStorage.setItem(KEY, JSON.stringify({ order: catOrder.value, at: catOrderAt.value }))
}

// 用户手动调整顺序（含重命名/删除时的顺序落盘）：盖新时间戳并通知自动同步
export function saveOrder(list) {
  catOrder.value = [...list]
  catOrderAt.value = new Date().toISOString()
  persist()
  listeners.forEach((fn) => fn())
}

// 采纳云端合并结果：不盖时间戳、不触发自动推送
export function setCatOrder(list, at) {
  catOrder.value = Array.isArray(list) ? list.filter((s) => typeof s === 'string') : []
  catOrderAt.value = at || ''
  persist()
}

// 新访客预览云端顺序：只改内存、不写 localStorage（保持默认态零写入）
export function applyCatOrderDisplay(list) {
  if (catOrder.value.length || !Array.isArray(list)) return
  catOrder.value = list.filter((s) => typeof s === 'string')
}

export function getCatOrderState() {
  return { order: [...catOrder.value], at: catOrderAt.value }
}

// 建议列表中的位置；不在列表里的自定义分类排在已知分类之后（而不是 indexOf=-1 跳到最前）
function suggestionRank(c) {
  const i = CAT_SUGGESTIONS.indexOf(c)
  return i < 0 ? CAT_SUGGESTIONS.length : i
}

export function sortCategories(names) {
  const idx = new Map(catOrder.value.map((c, i) => [c, i]))
  const tail = catOrder.value.length
  return [...names].sort((a, b) => {
    const ai = idx.has(a) ? idx.get(a) : tail
    const bi = idx.has(b) ? idx.get(b) : tail
    return ai - bi || suggestionRank(a) - suggestionRank(b) || a.localeCompare(b)
  })
}
