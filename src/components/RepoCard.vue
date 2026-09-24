<script setup>
import { computed, ref, onBeforeUnmount } from 'vue'
import { fetchRepo } from '../api/github'
import { favorites } from '../store/favorites'
import { formatNumber, timeAgo } from '../utils/format'

const props = defineProps({ repo: Object })
const emit = defineEmits(['toast'])

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

    <div v-if="repo.topics?.length" class="topics">
      <span v-for="t in repo.topics.slice(0, 4)" :key="t" class="topic">{{ t }}</span>
    </div>

    <div class="meta">
      <span v-if="repo.language" class="lang">
        <i class="dot" :data-lang="repo.language"></i>{{ repo.language }}
      </span>
      <span :title="snapTitle">★ {{ formatNumber(repo.stargazers) }}</span>
      <span :title="snapTitle">⑂ {{ formatNumber(repo.forks) }}</span>
      <span v-if="repo.pushedAt" class="pushed" :title="'最近推送：' + repo.pushedAt">更新于 {{ timeAgo(repo.pushedAt) }}</span>
    </div>

    <div class="actions">
      <input
        class="cat-input"
        list="cat-list"
        placeholder="＋ 分类"
        :value="repo.category || ''"
        title="输入或选择分类，可自定义"
        @change="setCategory"
      />
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
