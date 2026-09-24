<script setup>
import { computed, reactive, ref, onMounted, onBeforeUnmount } from 'vue'
import { favorites } from '../store/favorites'

const emit = defineEmits(['toast', 'close'])

function onKey(e) {
  if (e.key === 'Escape') emit('close')
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

const counts = computed(() => {
  const m = new Map()
  for (const i of favorites.items.value) {
    if (!i.category) continue
    m.set(i.category, (m.get(i.category) || 0) + 1)
  }
  return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0], 'zh-CN'))
})

const editing = reactive({ name: '', value: '' })

function startRename(name) {
  editing.name = name
  editing.value = name
}
function cancelRename() {
  editing.name = ''
}
function saveRename(original) {
  const v = editing.value.trim()
  if (!v || v === original) return cancelRename()
  if (counts.value.some(([c]) => c === v)) {
    emit('toast', `分类「${v}」已存在，请换一个名字`, true)
    return
  }
  const n = favorites.renameCategory(original, v)
  emit('toast', `已将分类「${original}」重命名为「${v}」（${n} 个项目）`)
  cancelRename()
}
const armedDelete = ref('')
let armTimer = null
function armDelete(name) {
  armedDelete.value = name
  clearTimeout(armTimer)
  armTimer = setTimeout(() => { armedDelete.value = '' }, 3000)
}
function disarmDelete() {
  clearTimeout(armTimer)
  armedDelete.value = ''
}
onBeforeUnmount(() => clearTimeout(armTimer))

function removeCategory(name, count) {
  if (armedDelete.value !== name) return armDelete(name)
  disarmDelete()
  const n = favorites.clearCategory(name)
  if (editing.name === name) cancelRename()
  emit('toast', `已删除分类「${name}」（${n} 个项目变为未分类）`)
}
</script>

<template>
  <div class="modal-mask" @click.self="emit('close')">
    <div class="modal">
      <div class="modal-head">
        <h3>管理分类</h3>
        <button class="icon-btn" @click="emit('close')">✕</button>
      </div>

      <p class="hint" style="margin-top:16px">分类由项目上已使用的标签聚合而成。重命名会批量更新所有使用该分类的项目；删除会使这些项目变为未分类。改动会自动同步到云端。</p>

      <div v-if="!counts.length" class="empty" style="padding:32px 0">暂无分类，先在项目卡片上添加分类</div>

      <ul v-else class="cat-list">
        <li v-for="[name, count] in counts" :key="name" class="cat-row">
          <template v-if="editing.name === name">
            <input
              v-model="editing.value"
              class="cat-rename"
              type="text"
              @keydown.esc.stop
              @keyup.enter="saveRename(name)"
              @keyup.esc="cancelRename()"
            />
            <button class="btn" @click="saveRename(name)">保存</button>
            <button class="btn ghost" @click="cancelRename">取消</button>
          </template>
          <template v-else>
            <span class="cat-name">{{ name }}</span>
            <span class="cat-count">{{ count }} 个项目</span>
            <button class="btn" @click="startRename(name)">重命名</button>
            <button
              class="btn ghost"
              :class="{ 'danger-armed': armedDelete === name }"
              :title="armedDelete === name ? '再次点击确认：该分类下项目将变为未分类' : '删除分类'"
              @click="removeCategory(name, count)"
              @mouseleave="armedDelete === name && disarmDelete()"
            >{{ armedDelete === name ? '确认删除' : '删除' }}</button>
          </template>
        </li>
      </ul>
    </div>
  </div>
</template>
