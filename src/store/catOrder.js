import { ref } from 'vue'

const KEY = 'ghf:catOrder'

export const CAT_SUGGESTIONS = ['AI', '开发工具', '命令行工具', '设计创意', '资源集合', '前端', '学习资源', '效率工具']

function load() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY))
    return Array.isArray(v) ? v.filter((s) => typeof s === 'string') : []
  } catch {
    return []
  }
}

export const catOrder = ref(load())

export function saveOrder(list) {
  catOrder.value = [...list]
  localStorage.setItem(KEY, JSON.stringify(catOrder.value))
}

export function sortCategories(names) {
  const idx = new Map(catOrder.value.map((c, i) => [c, i]))
  const tail = catOrder.value.length
  return [...names].sort((a, b) => {
    const ai = idx.has(a) ? idx.get(a) : tail
    const bi = idx.has(b) ? idx.get(b) : tail
    return (
      ai - bi ||
      CAT_SUGGESTIONS.indexOf(a) - CAT_SUGGESTIONS.indexOf(b) ||
      a.localeCompare(b)
    )
  })
}
