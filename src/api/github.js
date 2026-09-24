const API = 'https://api.github.com'

export function getToken() {
  return localStorage.getItem('ghf:token') || ''
}

export function setToken(token) {
  if (token) localStorage.setItem('ghf:token', token.trim())
  else localStorage.removeItem('ghf:token')
}

// Accept "owner/repo", "github.com/owner/repo", or a full URL with extras
export function parseRepoInput(input) {
  let s = (input || '').trim().replace(/\.git$/, '')
  if (!s) return null
  s = s.replace(/^https?:\/\/(www\.)?github\.com\//i, '')
  s = s.replace(/^git@github\.com:/i, '')
  s = s.split(/[?#]/)[0].replace(/\/+$/, '')
  const parts = s.split('/').filter(Boolean)
  if (parts.length < 2) return null
  const [owner, name] = parts
  if (!/^[\w.-]+$/.test(owner) || !/^[\w.-]+$/.test(name)) return null
  return `${owner}/${name}`
}

export async function fetchRepo(fullName) {
  const headers = { Accept: 'application/vnd.github+json' }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  let res
  try {
    res = await fetch(`${API}/repos/${fullName}`, { headers })
  } catch {
    throw new Error('网络请求失败，请检查网络后重试')
  }
  if (res.status === 404) throw new Error(`未找到项目 ${fullName}，请检查地址是否正确`)
  if (res.status === 403 || res.status === 429) {
    throw new Error('GitHub API 访问频率超限，可点击右上角设置添加 Token 以提高限额')
  }
  if (!res.ok) throw new Error(`获取项目信息失败（HTTP ${res.status}）`)
  const j = await res.json()
  return {
    fullName: j.full_name,
    owner: j.owner.login,
    name: j.name,
    avatar: j.owner.avatar_url,
    description: j.description,
    stargazers: j.stargazers_count,
    forks: j.forks_count,
    language: j.language,
    topics: (j.topics || []).slice(0, 6),
    homepage: j.homepage || null,
    pushedAt: j.pushed_at,
    htmlUrl: j.html_url,
    refreshedAt: new Date().toISOString(),
  }
}
