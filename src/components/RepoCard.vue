<script setup>
import { computed, ref, onBeforeUnmount } from 'vue'
import { fetchRepo } from '../api/github'
import { favorites } from '../store/favorites'
import { sortCategories, CAT_SUGGESTIONS } from '../store/catOrder'
import { sync } from '../store/sync'
import { formatNumber, timeAgo } from '../utils/format'

const props = defineProps({ repo: Object })
const emit = defineEmits(['toast'])

// 未开启云端同步时分类只读（与管理分类入口同一规则）
const canEditCat = computed(() => !!sync.gistId)

// 自定义分类选择面板（原生 datalist 只会显示与当前输入前缀匹配的选项，无法点选其他分类）
const pickerOpen = ref(false)
const usedCats = computed(() => {
  const set = new Set(favorites.items.value.map((i) => i.category).filter(Boolean))
  return sortCategories([...set])
})
const otherSuggestions = computed(() => CAT_SUGGESTIONS.filter((c) => !usedCats.value.includes(c)))

function pickCategory(cat) {
  pickerOpen.value = false
  if ((props.repo.category || '') === cat) return
  favorites.update(props.repo.fullName, { ...props.repo, category: cat })
  emit('toast', cat ? `已设置分类：${cat}` : '已清除分类')
}

const refreshing = ref(false)
const snapTitle = computed(() =>
  props.repo.refreshedAt
    ? `Star / Fork 数据获取于 ${props.repo.refreshedAt.slice(0, 10)}`
    : 'Star / Fork 数据快照时间未知，点刷新获取最新'
)

async function refresh() {
  if (refreshing.value) return
  refreshing.value = true
  try {
    const repo = await fetchRepo(props.repo.fullName)
    favorites.update(props.repo.fullName, repo)
    emit('toast', `已更新 ${repo.fullName} 的数据`)
  } catch (e) {
    emit('toast', e.message, true)
  } finally {
    refreshing.value = false
  }
}

const confirmDelete = ref(false)
let confirmTimer = null
function armDelete() {
  confirmDelete.value = true
  clearTimeout(confirmTimer)
  confirmTimer = setTimeout(() => { confirmDelete.value = false }, 3000)
}
function disarmDelete() {
  clearTimeout(confirmTimer)
  confirmDelete.value = false
}
onBeforeUnmount(() => clearTimeout(confirmTimer))

function remove() {
  if (!confirmDelete.value) return armDelete()
  disarmDelete()
  favorites.remove(props.repo.fullName)
  emit('toast', `已取消收藏 ${props.repo.fullName}`)
}

function setCategory(e) {
  const cat = e.target.value.trim()
  favorites.update(props.repo.fullName, { ...props.repo, category: cat })
  emit('toast', cat ? `已设置分类：${cat}` : '已清除分类')
}
</script>

<template>
  <div class="card">
    <a class="card-title" :href="repo.htmlUrl" target="_blank" rel="noopener">
      <img class="avatar" :src="repo.avatar" :alt="repo.owner" loading="lazy" />
      <div class="names">
        <span class="owner">{{ repo.owner }}</span>
        <span class="slash">/</span>
        <span class="name">{{ repo.name }}</span>
      </div>
    </a>

    <p class="desc">{{ repo.description || '暂无描述' }}</p>

    <!-- 占位也要渲染：虚拟滚动要求所有卡片等高 -->
    <div class="topics">
      <span v-for="t in (repo.topics || []).slice(0, 4)" :key="t" class="topic">{{ t }}</span>
    </div>

    <div class="meta">
      <span v-if="repo.language" class="lang">
        <i class="dot" :data-lang="repo.language"></i>{{ repo.language }}
      </span>
      <span :title="snapTitle">★ {{ formatNumber(repo.stargazers) }}</span>
      <span :title="snapTitle" class="fork">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="7" cy="5" r="2.5"/><circle cx="17" cy="5" r="2.5"/><path d="M7 7.5v2A3.5 3.5 0 0 0 10.5 13h3A3.5 3.5 0 0 0 17 9.5v-2M12 13v6"/></svg>
        {{ formatNumber(repo.forks) }}
      </span>
      <span v-if="repo.pushedAt" class="pushed" :title="'最近推送：' + repo.pushedAt">更新于 {{ timeAgo(repo.pushedAt) }}</span>
    </div>

    <div class="actions">
      <span v-if="canEditCat" class="cat-picker">
        <input
          class="cat-input"
          placeholder="＋ 分类"
          :value="repo.category || ''"
          title="点击选择或输入自定义分类"
          @focus="pickerOpen = true"
          @blur="pickerOpen = false"
          @change="setCategory"
          @keydown.esc="pickerOpen = false"
        />
        <div v-if="pickerOpen" class="cat-pop">
          <button
            v-for="c in usedCats"
            :key="c"
            class="cat-opt"
            :class="{ current: c === (repo.category || '') }"
            @mousedown.prevent="pickCategory(c)"
          >{{ c }}</button>
          <button
            v-for="c in otherSuggestions"
            :key="c"
            class="cat-opt faint"
            @mousedown.prevent="pickCategory(c)"
          >{{ c }}</button>
          <button v-if="repo.category" class="cat-opt clear" @mousedown.prevent="pickCategory('')">✕ 清除分类</button>
        </div>
      </span>
      <span v-else-if="repo.category" class="cat-tag readonly" title="开启云端同步后可编辑分类">{{ repo.category }}</span>
      <div class="action-icons">
        <button class="icon-sq" :disabled="refreshing" title="刷新项目数据" @click="refresh">
          <svg viewBox="0 0 24 24" :class="{ spinning: refreshing }" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-2.6-6.3M21 3v6h-6"/></svg>
        </button>
        <a
          v-if="repo.homepage"
          class="icon-sq"
          :href="repo.homepage"
          target="_blank"
          rel="noopener"
          title="项目官网"
        ><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M9 7h8v8"/></svg></a>
        <button
          class="icon-sq danger"
          :class="{ armed: confirmDelete }"
          :title="confirmDelete ? '再次点击确认取消收藏' : '取消收藏'"
          @click="remove"
          @mouseleave="disarmDelete"
        >
          <svg v-if="!confirmDelete" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6"/></svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
        </button>
      </div>
    </div>
  </div>
</template>
