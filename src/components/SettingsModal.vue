<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { getToken, setToken } from '../api/github'
import { favorites } from '../store/favorites'
import { sync, enableCloudSync, pull, push, disableCloudSync, setAutoSync } from '../store/sync'

const emit = defineEmits(['toast', 'close'])

function onKey(e) {
  if (e.key === 'Escape') emit('close')
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
const token = ref(getToken())
const fileInput = ref(null)

async function run(fn, okMsg) {
  try {
    await fn()
    if (okMsg) emit('toast', okMsg)
  } catch (e) {
    emit('toast', e.message, true)
  }
}

function saveToken() {
  setToken(token.value)
  emit('toast', token.value.trim() ? 'Token 已保存' : 'Token 已清除')
}

function exportFile() {
  const blob = new Blob([favorites.exportJSON()], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `github-favorites-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(a.href)
  emit('toast', '已导出收藏文件')
}

async function importFile(e) {
  const file = e.target.files?.[0]
  if (!file) return
  try {
    const n = favorites.importJSON(await file.text())
    emit('toast', `导入成功，共 ${n} 个项目`)
  } catch (err) {
    emit('toast', '导入失败：' + err.message, true)
  }
  e.target.value = ''
}
</script>

<template>
  <div class="modal-mask" @click.self="emit('close')">
    <div class="modal">
      <div class="modal-head">
        <h3>设置与数据</h3>
        <button class="icon-btn" @click="emit('close')">✕</button>
      </div>

      <section>
        <h4>云端同步（GitHub Gist）</h4>
        <p class="hint">收藏会同步到你 GitHub 账号下的一个 Secret Gist（文件 <code>github-favorites.json</code>）。在任何设备填同一个 Token 并点「开启云端同步」，即可自动关联同一份收藏。使用的 Token 需具备 <b>gist</b> 权限。</p>
        <p class="hint">
          <template v-if="sync.gistId">
            已关联：
            <a :href="`https://gist.github.com/${sync.gistId}`" target="_blank" rel="noopener">{{ sync.gistId.slice(0, 12) }}…</a>
            <span v-if="sync.lastSyncAt"> · 上次同步 {{ sync.lastSyncAt }}</span>
          </template>
          <template v-else>当前：未开启，数据仅保存在本浏览器</template>
        </p>
        <div class="row wrap">
          <button v-if="!sync.gistId" class="btn primary" :disabled="sync.busy" @click="run(enableCloudSync)">
            {{ sync.busy ? '同步中…' : '开启云端同步' }}
          </button>
          <template v-else>
            <label class="switch">
              <input type="checkbox" :checked="sync.autoSync" @change="setAutoSync($event.target.checked)" />
              变更后自动推送
            </label>
            <button class="btn" :disabled="sync.busy" @click="run(pull, '已从云端拉取并合并')">拉取合并</button>
            <button class="btn" :disabled="sync.busy" @click="run(push, '已推送本地收藏到云端（覆盖云端）')">推送到云端</button>
            <button class="btn ghost" @click="disableCloudSync()">关闭同步</button>
          </template>
        </div>
        <p class="hint">说明：自动同步会先读取云端、合并后再写回，多设备并发修改基本不会互相覆盖；新增、修改、取消收藏都会自动同步（删除记录保留 90 天，删除后仍可重新收藏，不会复活旧数据）。「拉取合并」主动与云端合并一次；手动「推送到云端」则整体覆盖，用于以本地数据重置云端。</p>
      </section>

      <section>
        <h4>GitHub Token（必填，用于云端同步；解析项目可选）</h4>
        <p class="hint">GitHub API 匿名限 60 次/小时；填写 personal access token 提升到 5000 次/小时，云端同步还要求它勾选 <b>gist</b> 作用域。Token 仅保存在本机浏览器。</p>
        <div class="row">
          <input v-model="token" type="password" placeholder="ghp_xxx…" autocomplete="off" />
          <button class="btn" @click="saveToken">保存</button>
        </div>
      </section>

      <section>
        <h4>备份与恢复</h4>
        <div class="row wrap">
          <button class="btn" @click="exportFile">导出收藏 JSON</button>
          <button class="btn" @click="fileInput.click()">导入 JSON</button>
        </div>
        <input ref="fileInput" type="file" accept=".json,application/json" hidden @change="importFile" />
      </section>

      <section>
        <h4>关于</h4>
        <p class="hint">收藏数据保存在浏览器 localStorage 中，清除浏览器数据会丢失，请定期导出备份，或者使用 GitHub Gist 同步数据。</p>
      </section>
    </div>
  </div>
</template>
