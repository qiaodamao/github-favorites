import { readFileSync, writeFileSync } from 'fs'

const map = {
  '521xueweihan/HelloGitHub': '资源集合',
  'vinta/awesome-python': '资源集合',
  'sindresorhus/awesome': '资源集合',
  'ollama/ollama': 'AI',
  'langchain-ai/langchain': 'AI',
  'openclaw/openclaw': 'AI',
  'microsoft/vscode': '开发工具',
  'astral-sh/ruff': '开发工具',
  'yt-dlp/yt-dlp': '命令行工具',
  'junegunn/fzf': '命令行工具',
  'penpot/penpot': '设计创意',
  'GraphiteEditor/Graphite': '设计创意',
}

const path = new URL('../src/data/seed.json', import.meta.url)
const list = JSON.parse(readFileSync(path, 'utf8'))
for (const item of list) item.category = map[item.fullName] || ''
writeFileSync(path, JSON.stringify(list, null, 2) + '\n')
console.log('updated', list.length)
