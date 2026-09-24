<script setup>
import { computed, onMounted, ref } from 'vue'
import { fetchRepo, parseRepoInput } from './api/github'
import { favorites } from './store/favorites'
import { formatNumber } from './utils/format'
import RepoCard from './components/RepoCard.vue'
import SettingsModal from './components/SettingsModal.vue'
import CategoryManager from './components/CategoryManager.vue'
import { initSync, onSyncToast } from './store/sync'

const input = ref('')
const adding = ref(false)
const query = ref('')
const lang = ref('')
const cat = ref('')
const sort = ref('added')
const showSettings = ref(false)
const showCatManager = ref(false)
const dark = ref(false)

const toastMsg = ref('')
const toastErr = ref(false)
let toastTimer = null
function toast(msg, isErr = false) {
  toastMsg.value = msg
  toastErr.value = isErr
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toastMsg.value = ''), 3200)
}

const items = favorites.items

const totalStars = computed(() => items.value.reduce((s, i) => s + (i.stargazers || 0), 0))

const languages = computed(() => {
  const set = new Set(items.value.map((i) => i.language).filter(Boolean))
  return [...set].sort()
})

const CAT_SUGGESTIONS = ['AI', '开发工具', '命令行工具', '设计创意', '资源集合', '前端', '学习资源', '效率工具']

const categories = computed(() => {
  const set = new Set(items.value.map((i) => i.category).filter(Boolean))
  const known = [...set].sort((a, b) => CAT_SUGGESTIONS.indexOf(a) - CAT_SUGGESTIONS.indexOf(b) || a.localeCompare(b))
  return { list: known, datalist: [...new Set([...CAT_SUGGESTIONS, ...known])] }
})

const filtered = computed(() => {
  let list = items.value
  const kw = query.value.trim().toLowerCase()
  if (kw) {
    list = list.filter((i) =>
      [i.fullName, i.description, ...(i.topics || [])]
        .filter(Boolean)
        .some((s) => s.toLowerCase().includes(kw))
    )
  }
  if (lang.value) list = list.filter((i) => i.language === lang.value)
  if (cat.value === '__none__') list = list.filter((i) => !i.category)
  else if (cat.value) list = list.filter((i) => i.category === cat.value)
  const sorted = [...list]
  if (sort.value === 'stars') sorted.sort((a, b) => b.stargazers - a.stargazers)
  else if (sort.value === 'forks') sorted.sort((a, b) => b.forks - a.forks)
  else if (sort.value === 'name') sorted.sort((a, b) => a.fullName.localeCompare(b.fullName))
  else sorted.sort((a, b) => (b.addedAt || '').localeCompare(a.addedAt || ''))
  return sorted
})

const STALE_MS = 7 * 24 * 3600 * 1000
const refreshingAll = ref(null)

async function refreshRepos(list, label) {
  if (!list.length) return
  if (!navigator.onLine) return
  let done = 0
  let ok = 0
  refreshingAll.value = { done, total: list.length }
  const queue = [...list]
  const worker = async () => {
    while (queue.length) {
      const item = queue.shift()
      try {
        favorites.update(item.fullName, await fetchRepo(item.fullName))
        ok++
      } catch { /* keep the old snapshot on failure */ }
      refreshingAll.value = { done: ++done, total: list.length }
    }
  }
  await Promise.all(Array.from({ length: 3 }, worker))
  refreshingAll.value = null
  if (ok) toast(`${label}：已更新 ${ok}/${list.length} 个项目数据`)
}

function staleList() {
  const now = Date.now()
  return items.value.filter(
    (i) => !i.refreshedAt || now - new Date(i.refreshedAt).getTime() > STALE_MS
  )
}

function refreshStale() {
  const list = staleList()
  if (list.length) refreshRepos(list, '自动刷新过期数据')
}

function refreshAllNow() {
  refreshRepos(items.value, '全部刷新')
}

async function addRepo() {
  if (adding.value) return
  const fullName = parseRepoInput(input.value)
  if (!fullName) {
    toast('请输入正确的 GitHub 项目地址，如 https://github.com/qiaodamao/pixlite', true)
    return
  }
  adding.value = true
  try {
    const repo = await fetchRepo(fullName)
    const isNew = favorites.add(repo)
    input.value = ''
    toast(isNew ? `已收藏 ${repo.fullName} ★${formatNumber(repo.stargazers)}` : `已更新 ${repo.fullName} 的数据`)
  } catch (e) {
    toast(e.message, true)
  } finally {
    adding.value = false
  }
}

function toggleDark() {
  dark.value = !dark.value
  document.documentElement.classList.toggle('dark', dark.value)
  localStorage.setItem('ghf:dark', dark.value ? '1' : '0')
}

onMounted(() => {
  if (localStorage.getItem('ghf:dark') === '1') {
    dark.value = true
    document.documentElement.classList.add('dark')
  }
  onSyncToast(toast)
  initSync().then(refreshStale)
})
</script>

<template>
  <header class="header">
    <div class="header-inner">
      <div class="brand">
        <img src="/favicon.svg" alt="logo" width="32" height="32" />
        <div>
          <h1>GitHub 收藏</h1>
          <p class="tagline">/favorites.open-source</p>
        </div>
      </div>
      <div class="header-right">
        <div class="stat"><b>{{ items.length }}</b><span>Favorites</span></div>
        <div class="stat"><b>{{ formatNumber(totalStars) }}</b><span>Stars</span></div>
        <button class="icon-btn" :title="dark ? '切换浅色' : '切换深色'" @click="toggleDark">
          <svg v-if="dark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg>
        </button>
        <button class="icon-btn" title="设置" @click="showSettings = true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.9 2.9l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.9-2.9l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.9-2.9l.1.1a1.7 1.7 0 0 0 1.9.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 1 1.5h.1a1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.9 2.9l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.2a1.7 1.7 0 0 0-1.5 1Z"/></svg>
        </button>
      </div>
    </div>
  </header>

  <main class="main">
    <section class="hero">
      <h2>收藏有趣的开源项目</h2>
      <p class="lead">粘贴一个 GitHub 地址，自动解析项目介绍与 Star / Fork 数据。数据本地保存，可经 Gist 跨设备同步。</p>
      <div class="add-box">
        <input
          v-model="input"
          class="add-input"
          type="text"
          placeholder="https://github.com/qiaodamao/pixlite 或 qiaodamao/pixlite"
          @keyup.enter="addRepo"
        />
        <button class="btn primary" :disabled="adding" @click="addRepo">
          {{ adding ? '解析中…' : '收藏项目 →' }}
        </button>
      </div>
      <p class="hero-hint">auto-parsed description · stars · forks · cross-device sync</p>
    </section>

    <section class="toolbar">
      <input v-model="query" class="search" type="search" placeholder="搜索名称、简介或标签…" />
      <select v-model="lang" class="select">
        <option value="">全部语言</option>
        <option v-for="l in languages" :key="l" :value="l">{{ l }}</option>
      </select>
      <select v-model="sort" class="select">
        <option value="added">按收藏时间</option>
        <option value="stars">按 Star 数</option>
        <option value="forks">按 Fork 数</option>
        <option value="name">按名称</option>
      </select>
      <span class="count">{{ filtered.length }} 个项目</span>
      <button class="btn-sm" :disabled="!!refreshingAll" @click="refreshAllNow">
        {{ refreshingAll ? `刷新中 ${refreshingAll.done}/${refreshingAll.total}` : '全部刷新' }}
      </button>
    </section>

    <nav class="chips">
      <button class="chip" :class="{ active: cat === '' }" @click="cat = ''">全部</button>
      <button
        v-for="c in categories.list"
        :key="c"
        class="chip"
        :class="{ active: cat === c }"
        @click="cat = cat === c ? '' : c"
      >{{ c }}</button>
      <button
        v-if="items.some((i) => !i.category)"
        class="chip"
        :class="{ active: cat === '__none__' }"
        @click="cat = cat === '__none__' ? '' : '__none__'"
      >未分类</button>
      <button class="chip manage" @click="showCatManager = true">管理分类</button>
    </nav>
    <datalist id="cat-list">
      <option v-for="c in categories.datalist" :key="c" :value="c" />
    </datalist>

    <section v-if="filtered.length" class="grid">
      <RepoCard v-for="r in filtered" :key="r.fullName" :repo="r" @toast="toast" />
    </section>
    <section v-else class="empty">
      <p>{{ items.length ? '没有匹配的项目，换个关键词试试' : '还没有收藏，粘贴一个 GitHub 项目地址开始吧' }}</p>
    </section>

    <SettingsModal v-if="showSettings" @close="showSettings = false" @toast="toast" />
    <CategoryManager v-if="showCatManager" @close="showCatManager = false" @toast="toast" />
  </main>

  <footer class="footer">
    <div class="foot-mono">Built with Vue 3 + Vite · Deploy on EdgeOne / Vercel / Cloudflare</div>
    <div style="margin-top:8px">数据来自 GitHub API · 收藏保存在你的浏览器本地</div>
  </footer>

  <Transition name="fade">
    <div v-if="toastMsg" class="toast" :class="{ error: toastErr }">{{ toastMsg }}</div>
  </Transition>
</template>
