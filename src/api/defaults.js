import { DEFAULT_GIST_RAW_URL } from '../config'

const LOCAL_FALLBACK_URL = '/defaults.json'
const FETCH_TIMEOUT = 8000

async function fetchItems(url) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT)
  try {
    const res = await fetch(url, { signal: ctrl.signal })
    if (!res.ok) return null
    const data = JSON.parse(await res.text())
    // 兼容旧版纯数组与新版 { version, items, deleted } 格式
    const arr = Array.isArray(data) ? data : (data && Array.isArray(data.items) ? data.items : null)
    if (!arr) return null
    return arr.filter((i) => i && i.fullName && i.htmlUrl)
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

// 三级降级：Gist（最新）→ 本站 defaults.json（同域、网络友好、每日刷新）→ null（页面用内置示例）
export async function fetchDefaultFavorites() {
  if (DEFAULT_GIST_RAW_URL) {
    const fromGist = await fetchItems(DEFAULT_GIST_RAW_URL)
    if (fromGist && fromGist.length) return fromGist
  }
  return fetchItems(LOCAL_FALLBACK_URL)
}
