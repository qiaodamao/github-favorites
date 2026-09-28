import { DEFAULT_GIST_RAW_URL } from '../config'

const LOCAL_FALLBACK_URL = '/defaults.json'
const FETCH_TIMEOUT = 8000

async function fetchList(url) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT)
  try {
    const res = await fetch(url, { signal: ctrl.signal })
    if (!res.ok) return null
    const data = JSON.parse(await res.text())
    // 兼容旧版纯数组与新版 { version, items, deleted, catOrder } 格式
    const arr = Array.isArray(data) ? data : (data && Array.isArray(data.items) ? data.items : null)
    if (!arr) return null
    return {
      items: arr.filter((i) => i && i.fullName && i.htmlUrl),
      catOrder: data && !Array.isArray(data) && Array.isArray(data.catOrder) ? data.catOrder : [],
    }
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

// 三级降级：Gist（最新）→ 本站 defaults.json（同域、网络友好、每日刷新）→ null（页面用内置示例）
export async function fetchDefaultFavorites() {
  if (DEFAULT_GIST_RAW_URL) {
    const fromGist = await fetchList(DEFAULT_GIST_RAW_URL)
    if (fromGist && fromGist.items.length) return fromGist
  }
  return fetchList(LOCAL_FALLBACK_URL)
}
