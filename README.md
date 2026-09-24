# GitHub 收藏（GitHub Favorites）

一个开源项目收藏网站：

- **添加收藏**：粘贴 GitHub 项目地址（`owner/repo` 或完整 URL），自动调用 GitHub API 解析项目介绍、Star、Fork、语言、标签、最近更新时间
- **查看/跳转**：点击卡片标题直达项目主页，有官网的项目显示「官网 ↗」
- **刷新数据**：每张卡片可一键重新拉取最新 Star/Fork 数据
- **搜索与筛选**：按名称/简介/标签搜索，按语言筛选，按收藏时间、Star、Fork、名称排序
- **分类管理**：每个项目可打自定义分类标签（卡片上直接输入，带常用分类联想），顶部按分类筛选（含"未分类"），分类随 Gist 一起同步
- **本地持久化**：收藏保存在浏览器 localStorage，内置 12 个示例项目开箱可见；支持导出/导入 JSON 备份
- **跨设备云同步**：收藏可同步到你自己 GitHub 账号下的一个 Secret Gist（文件 `github-favorites.json`）。任何设备填同一个 Token 点「开启云端同步」即自动关联，新增、修改、取消收藏都会自动同步（删除采用墓碑记录，90 天后自动清理），也支持手动拉取合并 / 推送覆盖（需要 token 具备 `gist` 作用域）
- **暗色模式**、移动端自适应
- **可选 Token**：GitHub API 匿名限 60 次/小时，在「设置」中填入 personal access token 可提升到 5000 次/小时（仅存本机）

## 技术栈

Vue 3 + Vite，纯静态站点，无后端。

## 本地开发

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # 产物输出到 dist/
```

## 部署

构建命令统一为 `npm run build`，输出目录 `dist`。任选其一：

### 1. 腾讯云 EdgeOne Pages

1. 将本目录推送到 GitHub 仓库
2. 登录 [EdgeOne Pages 控制台](https://edgeone.ai/zh/products/pages) → 新建项目 → 关联该仓库
3. Framework 选 **Vite**（自动识别构建命令 `npm run build`、输出目录 `dist`），保存后自动构建部署
4. 也可在控制台用「直接上传」方式上传本地 `dist/` 目录

### 2. Vercel

```bash
npx vercel        # 首次：关联项目，Framework 选 Vite，其余默认
npx vercel --prod # 部署到生产
```

或在 [vercel.com](https://vercel.com) 导入 GitHub 仓库，Vercel 会自动识别 Vite（Build Command `npm run build`，Output `dist`）。

### 3. Cloudflare Pages

```bash
npx wrangler pages deploy dist --project-name github-favorites
```

或在 Cloudflare Dashboard → Workers & Pages → 导入 GitHub 仓库，
Build command `npm run build`，Build output directory `dist`。

## 更新示例数据

内置收藏来自 `src/data/seed.json`（首次打开、localStorage 为空且未配置默认收藏时展示）。想刷新：

```bash
node scripts/fetch-seed.mjs   # 修改脚本里的仓库列表后重新生成 seed.json
```

## 默认公共收藏（可选）

让所有新访客看到你维护的一份公开收藏清单：

1. 打开 <https://gist.github.com/>，点右上角 **+** 新建 Gist；
2. **可见性选 Public**（Secret 匿名读不到）；文件名必须填 `github-favorites.json`；
3. 内容先填 `[]`（空数组），点 **Create public gist**；
4. 回到这个网站，填好你的 Token 并点「开启云端同步」——网站会找到这个 Gist 并把你的收藏写进去；
5. 打开你的 Gist 页面，点文件右上角的 **Raw**，复制地址栏链接，但**必须删掉中间那串提交哈希**，
   让它变成固定地址（否则永远读到旧数据）：
   `https://gist.githubusercontent.com/你的用户名/GistID/raw/github-favorites.json`；
6. 把固定链接填进 `src/config.js` 的 `DEFAULT_GIST_RAW_URL`，提交并重新部署。

生效后：你每次收藏/刷新数据都会自动同步进这个 Gist，访客看到的默认列表随之更新。

新访客数据三级降级（任何一层失败自动走下一层，页面永远不会开天窗）：

1. **Gist**（最新鲜，秒级更新）；
2. **本站 `/defaults.json`**（同域名兜底，大陆等受限网络也能加载；由 `.github/workflows/sync-defaults.yml` 每天自动从 Gist 同步进仓库并触发重新部署，最多滞后 1 天，无需任何密钥）；
3. **内置 `seed.json` 示例数据**（随代码打包，完全离线可用）。

注意：开启同步前需先在 config.js 里填好链接并部署，之后你 Gist 里的内容即为公开可见。

## 目录结构

```
├── index.html
├── src/
│   ├── App.vue                  # 页面主体：添加、搜索、筛选、排序、虚拟滚动列表
│   ├── config.js                # 默认公共收藏 Gist 链接等站点配置
│   ├── api/github.js            # GitHub API 封装、地址解析
│   ├── api/gist.js              # 云端同步：Gist 读写
│   ├── api/defaults.js          # 拉取默认公共收藏（Gist → 本站 defaults.json 降级）
│   ├── store/favorites.js       # 收藏状态 + localStorage 持久化（含删除墓碑记录）
│   ├── store/catOrder.js        # 分类显示顺序（本机偏好，保存在浏览器，不随 Gist 同步）
│   ├── store/merge.js           # 同步合并纯逻辑（收藏项 + 墓碑）
│   ├── store/sync.js            # 云端同步：开启/拉取合并/推送/自动同步
│   ├── components/
│   │   ├── RepoCard.vue         # 项目卡片（star/fork/刷新/删除）
│   │   ├── CategoryManager.vue  # 管理分类弹窗（排序/批量重命名/删除）
│   │   └── SettingsModal.vue    # Token 设置、导出/导入
│   ├── data/seed.json           # 内置示例收藏
│   └── style.css                # 全局样式（含暗色模式）
├── public/
│   ├── favicon.svg
│   └── defaults.json            # 同域兜底默认收藏（Actions 每日自动同步）
├── .github/workflows/sync-defaults.yml  # 定时：Gist → public/defaults.json
└── scripts/fetch-seed.mjs       # 重新生成示例数据
```
