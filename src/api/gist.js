import { getToken } from './github'

const FILE = 'github-favorites.json'

function headers() {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${getToken()}`,
  }
}

async function request(url, opts, what) {
  let res
  try {
    res = await fetch(url, opts)
  } catch {
    throw new Error('网络请求失败，请检查网络后重试')
  }
  if (!res.ok) {
    let msg = ''
    try { msg = (await res.json()).message } catch { /* ignore */ }
    if (res.status === 401 || res.status === 403) {
      throw new Error(`${what}失败：Token 无效或缺少 Gist 权限（classic PAT 需勾选 gist 作用域）`)
    }
    throw new Error(`${what}失败${msg ? '：' + msg : `（HTTP ${res.status}）`}`)
  }
  return res.json()
}

// v2 格式：{ version: 2, items, deleted }；旧格式为纯数组，读取时兼容
function toContent(items, deleted = []) {
  return JSON.stringify({ version: 2, items, deleted }, null, 2)
}

export async function createGist(items, deleted) {
  const j = await request(
    'https://api.github.com/gists',
    {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        description: 'GitHub Favorites 云端收藏同步',
        public: false,
        files: { [FILE]: { content: toContent(items, deleted) } },
      }),
    },
    '创建 Gist'
  )
  return j.id
}

// Find the user's existing sync gist by its filename (most recently updated wins)
export async function findGist() {
  const list = await request(
    'https://api.github.com/gists?per_page=100&sort=updated&direction=desc',
    { headers: headers() },
    '查询 Gist'
  )
  const hit = Array.isArray(list) && list.find((g) => g.files && g.files[FILE])
  return hit ? hit.id : null
}

export async function readGist(id) {
  const j = await request(`https://api.github.com/gists/${id}`, { headers: headers() }, '读取 Gist')
  const f = j.files && j.files[FILE]
  if (!f) throw new Error('该 Gist 中没有收藏文件 ' + FILE)
  let text = f.content
  if (f.truncated) {
    const raw = await fetch(f.raw_url, { headers: headers() })
    if (!raw.ok) throw new Error('下载收藏内容失败')
    text = await raw.text()
  }
  const data = JSON.parse(text)
  const arr = Array.isArray(data) ? data : (data && Array.isArray(data.items) ? data.items : null)
  if (!arr) throw new Error('云端数据格式不正确')
  const items = arr.filter((i) => i && i.fullName && i.htmlUrl)
  const deleted =
    data && !Array.isArray(data) && Array.isArray(data.deleted)
      ? data.deleted.filter((d) => d && d.fullName && d.deletedAt)
      : []
  return { items, deleted }
}

export async function writeGist(id, items, deleted) {
  await request(
    `https://api.github.com/gists/${id}`,
    {
      method: 'PATCH',
      headers: headers(),
      body: JSON.stringify({ files: { [FILE]: { content: toContent(items, deleted) } } }),
    },
    '推送 Gist'
  )
}
