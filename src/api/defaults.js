import { DEFAULT_GIST_RAW_URL } from '../config'

export async function fetchDefaultFavorites() {
  if (!DEFAULT_GIST_RAW_URL) return null
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 8000)
  try {
    const res = await fetch(DEFAULT_GIST_RAW_URL, { signal: ctrl.signal })
    if (!res.ok) return null
    const list = JSON.parse(await res.text())
    if (!Array.isArray(list)) return null
    return list.filter((i) => i && i.fullName && i.htmlUrl)
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}
