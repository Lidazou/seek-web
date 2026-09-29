# SEEK 前端 · 开发与对接说明

> 面向真实后端接入的模块化前端。Vanilla HTML + CSS + ES Modules，无框架、无构建步骤。

---

## 1. 项目结构

```text
SEEK_Frontend/
├─ index.html                 # 只描述页面结构（~220 行）
├─ config/
│  └─ seek-config.js          # 环境配置：接口地址 / 超时 / 粒子上限 / 开关
├─ styles/                    # 按组件分文件；加载顺序即层叠顺序
│  ├─ base.css                # reset、排版、变量、.sr-only
│  ├─ scene.css               # 视口、氛围、星空、HUD、首页按钮
│  ├─ turntable.css           # 3D 唱片机与环绕唱片
│  ├─ neon.css                # SEEK 霓虹灯牌 + 搜索态光锥
│  ├─ library.css             # 编辑 CD 集页面与弹窗
│  ├─ search.css              # 搜索 Overlay、记忆栏、输入区、候选展示
│  ├─ search-states.css       # 追问 / 空态 / 错误 / 总览 / 曲目 / 设置
│  ├─ cd-case.css             # 候选封面 3D CD 盒
│  └─ responsive.css          # 全部 @media（必须最后加载）
└─ js/
   ├─ main.js                 # 唯一入口：装配模块 + window.SeekSearch
   ├─ shared/                 # 通用工具（不掺业务）
   │  ├─ dom.js               # $ / el / sleep / safeRead / showOnlyPanels
   │  ├─ errors.js            # 错误类型与错误类别
   │  ├─ media.js             # loadImage / validateImageUrl / preloadImage
   │  └─ motion.js            # 缓动函数、reduced-motion、时长常量
   ├─ scene/
   │  ├─ orbit-scene.js       # 唱片机、环绕轨道、入场动画、选中
   │  ├─ deep-sky.js          # 深空画布 + 星尘
   │  └─ artwork-generator.js # 示例封面程序化生成（仅 Demo）
   ├─ library/
   │  └─ cd-library.js        # 收藏、编辑 CD 集、拖拽排序、持久化
   ├─ search/
   │  ├─ search-controller.js # 唯一的流程协调层
   │  ├─ search-store.js      # 会话数据状态（不含动画状态）
   │  ├─ search-state.js      # 业务状态 / 视觉状态 / 空结果原因
   │  ├─ seek-api.js          # 后端通信唯一入口（全站唯一 fetch）
   │  ├─ candidate-mapper.js  # 后端字段 → 前端 DTO
   │  ├─ particle-morph-engine.js # 粒子动画（纯视觉）
   │  └─ search-view.js       # 只负责把 Store 画到 DOM
   └─ demo/
      ├─ demo-data.js         # 演示唱片数据
      └─ demo-provider.js     # 演示数据源（仅主动开启时使用）
```

**依赖方向（单向，禁止反向 import）**

```text
main
 └→ search-controller
     ├→ search-view / search-store / search-state
     ├→ seek-api → candidate-mapper
     ├→ particle-morph-engine
     └→ library / scene / demo
         └→ shared
```

---

## 2. 各模块职责（一句话版）

| 文件 | 只负责 |
|---|---|
| `index.html` | 页面结构 + `<link>` + 一个 module 入口 |
| `styles/*` | 视觉；不含任何逻辑 |
| `scene/orbit-scene.js` | 首页 3D 世界；不感知搜索业务 |
| `scene/deep-sky.js` | 氛围背景 |
| `scene/artwork-generator.js` | 示例封面（Live 模式禁止使用） |
| `library/cd-library.js` | 收藏与 CD 集编辑；不感知搜索流程 |
| `search/search-store.js` | 数据状态 |
| `search/search-state.js` | 状态枚举与映射 |
| `search/seek-api.js` | 与后端通信 |
| `search/candidate-mapper.js` | 协议转换 |
| `search/particle-morph-engine.js` | 动画 |
| `search/search-view.js` | DOM 渲染 |
| `search/search-controller.js` | 流程协调 |
| `demo/*` | 演示数据 |

---

## 3. 本地启动（重要）

**为什么不能直接双击 `index.html`：**
这个版本用 ES Module 把代码拆成了 19 个 js 文件 + 9 个 css 文件。
浏览器出于安全策略，**禁止 `file://` 页面用 import 加载本地模块**，
所以双击打开会白屏 / 只有结构没有样式。这不是坏了，是必须走 HTTP。

**最简单的启动方式**（仓库自带、零依赖、跨平台）：`node serve.mjs`

手动启动：

```bash
cd SEEK_Frontend
python -m http.server 8899        # 或 npx serve -l 8899
# 浏览器打开 http://127.0.0.1:8899/
```

**只是想看效果、不想开服务器？** 直接双击上一层的
`seek_search.html`（重构前的单文件版，功能完全一样）。

> ⚠️ 注意：`seek_search.html` 是重构前的快照，之后的修改只会进 `SEEK_Frontend/`，
> 两者会逐渐分叉。要长期维护请用模块化版本。

### 自检命令

```bash
cd SEEK_Frontend
node tools/verify-modules.js .    # 模块依赖 / 导出 / DOM id / 全局残留
node tools/import-test.mjs        # 真实 import 每个模块并实例化
```

---

## 4. Demo Mode

- 入口：搜索框下方「先用示例专辑体验完整流程」，或控制台 `SeekSearch.useDemo()`。
- 数据源：`js/demo/demo-data.js`，封面由 `artwork-generator.js` 程序化生成。
- 标记：`store.demo === true`，界面提示「示例演示 · 非真实搜索」。
- **生产环境禁止在真实 API 失败后自动切到 Demo**；API 失败一律显示 Error，由用户主动选择体验示例。

## 5. Live Search

```js
SeekSearch.connectSeek('http://127.0.0.1:8000');   // 推荐：接 seek 后端
SeekSearch.setEndpoint('http://127.0.0.1:8000/search'); // 任意 HTTP 接口
SeekSearch.setProvider(async (payload, { signal }) => ({ candidates: [...] }));
```

- `connectSeek` 会异步探活 `GET /health`，返回值 `{ status, message, index_count, index_reused }`。
- Live 模式下 `store.demo === false`，界面显示「搜索服务已连接」。

## 6. API 地址

全部集中在 `config/seek-config.js`：

```js
apiBase: ''            // 留空 = 同源；建议生产走同源 /api/v1
requestTimeoutMs: 60000
seekBackend: { searchPath: '/search', healthPath: '/health', coversPath: '/covers' }
```

> 当前为兼容 `Violet-Galaxy233/seek` 现有实现，仍调用根路径 `/search`。
> 后端加上 `/api/v1` 前缀后，只需改这个文件。

## 7. Capability 机制

后端未来可通过 `/health` 或 `/capabilities` 返回能力表，前端存入 `store.capabilities`：

```json
{ "active_questioning": false, "answer_rerank": false, "structured_explanations": false,
  "genres": false, "tracks": false, "sessions": false, "candidate_rejection": false,
  "confirmation": false, "feedback": false, "thumbnail_covers": false }
```

UI 必须据此降级，**不允许假实现**：

| capability | 为 false 时的行为 |
|---|---|
| `active_questioning` | 不显示追问卡（后端没返回 question 就不问） |
| `answer_rerank` | 禁止向真实后端发送非空 `answers`，并隐藏追问模块 |
| `tracks` | 「就是它」之后显示「服务未提供曲目列表」 |
| `candidate_rejection` | 「不是这张」仅在本轮前端隐藏，文案为「已从本轮候选中移除」 |
| `confirmation` | 本地进入 Completed，但标记 `confirmationPersisted = false` |
| `feedback` | 不发送反馈 |
| `sessions` | 不使用后端 sessionId |

## 8. Candidate DTO

`candidate-mapper.js` 是唯一转换点，UI 不得直接依赖后端结构。

```js
{
  id: '', title: '', artist: '',
  year: null,
  genre: '',            // TODO 第二阶段 → genres: []
  language: '',         // TODO 第二阶段 → languages: []
  cover: '',            // TODO 第二阶段 → { small, medium, original }
  matches: [], conflicts: [],
  tracks: null,         // null = 尚未请求详情；[] = 请求过但没有曲目
  source: null          // 'demo' | 'live'
}
```

`tracks` 的三态语义必须保持，不得再用 `[]` 同时表达「没加载」和「没有歌曲」。

## 9. Search Store

`search-store.js`（`SearchSessionStore`）保存：`query / memories / answers / excluded /
candidates / index / question / sessionId / state / demo / albumId`。
**不保存任何动画状态**；离开搜索时 `forgetMemory()` 清空。

## 10. Business State

```text
idle · composing · searching · results · asking ·
found-album · found-track · no-result · all-rejected · error
```

定义在 `search-state.js` 的 `BUSINESS_STATE`。业务状态**不依赖动画是否播完**。

## 11. Visual State

```text
stable · dissolving · floating · attracting · morphing · crossfading
```

定义在 `VISUAL_STATE`。视觉可以失败：粒子 morph 失败时直接 crossfade，业务结果照常展示。

## 12. Particle fallback

```js
try { await engine.morph(targets, 1150, 110, first); }
catch { /* 直接显示封面 */ }
```

图片采样可能因 CORS、canvas 污染、内存、移动端性能、reduced-motion 失败。
动画失败**绝不允许**让搜索报错。`prefers-reduced-motion: reduce` 时使用 150–250ms 淡入淡出。

## 13. CORS 注意事项

1. **优先同源部署**（前端与 `/search`、`/covers` 同一个域名端口），可一次性规避 API CORS、Canvas 跨域污染、Mixed Content。
2. 后端跨域时必须显式挂 `CORSMiddleware`，否则 `/search` 不会返回 `access-control-allow-origin`。
3. 封面要参与 canvas 像素采样，因此 `loadImage()` 会设置 `crossOrigin='anonymous'` —— 跨域封面必须允许带 CORS 头返回，否则采样失败（此时自动 crossfade，不报错）。
4. 自检命令：

```bash
curl -i -X OPTIONS http://127.0.0.1:8000/search \
  -H "Origin: null" -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type"
```

## 14. 后端当前支持的能力

| 能力 | 状态 |
|---|---|
| `POST /search`（description + answers） | ✅ 已实现 |
| `GET /health`（status / index_count） | ✅ 已实现 |
| `GET /covers/<file>` 静态封面 | ✅ 已实现 |
| 候选的 album / release / cover / score | ✅ 已实现 |
| `matching_clues` / `conflicting_clues` | ✅ 已实现（字段存在） |
| 单条追问 `question` | ✅ schema 已预留，fixture/prototype 支持 |
| 请求体 `answers` 字段 | ✅ schema 已预留 |

## 15. 后端尚未支持的能力（前端已优雅降级）

| 能力 | 现状 | 前端表现 |
|---|---|---|
| **answer rerank** | 真实 `IndexedSearchService`（Qwen+FAISS）**尚未实现非空 answers** | 不得宣称「已根据你的回答重新排序」 |
| 曲目 / 详情接口 | `Track` 只存在于 `domain.py`，无 API | 显示「服务未提供曲目列表」 |
| `genre` | `AlbumResponse` 无该字段 | 曲风为空，只显示「年份 · 语言」 |
| 结构化冲突解释 | 目前只有向量相似度 | 只展示后端实际返回的线索，不编造 AI 推理 |
| candidate rejection | 无接口 | 仅本轮前端隐藏 |
| confirmation / feedback | 无接口 | 本地完成，不伪装成后端已记录 |
| 后端 session | 无 `session_id` | 使用本地会话，`sessionId = null` |
| 缩略图封面 | 无，原图 1.7–2.7MB | 建议后端补缩略图，否则首屏多张会慢 |

> **已修正的旧文档错误**：早前注释写过「回答追问靠重新 POST /search，把 answers 一起带上，这条链路是通的」——这不准确。
> 准确说法是：**API schema 已预留 `answers`；fixture/prototype SearchService 支持追问；真实 `IndexedSearchService` 当前不支持非空 `answers`。**

## 16. 如何添加新 API 字段

1. 在 `candidate-mapper.js` 的映射里加上新字段（后端嵌套结构 → 内部 DTO）。
2. 若字段影响展示，在 `search-view.js` 里用 `textContent` 渲染（**禁止 innerHTML**）。
3. 若字段影响流程，在 `search-controller.js` 里消费；`search-store.js` 需要保存就加字段。
4. 新增 capability 时：`config` → `store.capabilities` → UI 门控，三处同步。
5. 跑校验：`node _verify_modules.js SEEK_Frontend`（保证导入/DOM id 不出错）。

## 17. 如何添加新的 Search State

1. 在 `search-state.js` 的 `BUSINESS_STATE` 加常量，并在 `BUSINESS_TO_LEGACY` 与 `PANEL_FOR_STATE` 补齐映射。
2. 在 `styles/search-states.css` 里为新面板写样式（状态类选择器集中在 `responsive.css` 之外的文件）。
3. 在 `search-view.js` 加一个渲染方法，`search-controller.js` 在状态迁移处调用。
4. 若状态互斥，加入 `PANEL_FOR_STATE` 并确认 `showPanels()` 白名单。
5. 状态迁移必须写在 controller，**不要**在 view 或 engine 里改状态。

---

## 验收自检清单

```bash
node _verify_modules.js SEEK_Frontend     # 模块依赖 / 导出 / DOM id / 全局残留
```

- [ ] 首页：唱片入场、环绕、鼠标临近减速、hover、SEEK 灯牌、resize
- [ ] 搜索：打开、输入、粒子解体、候选成型、左右切换、键盘、总览、排除、补充、空态、错误、重试、关闭
- [ ] Demo：明确标注 Demo；API 失败不自动进入 Demo
- [ ] Live：`/health` 可检测、响应可 map、封面可显示、canvas 失败自动 crossfade
- [ ] 无障碍：Tab / Enter / Space / Escape、焦点返回 SEEK、aria-live、reduced-motion
- [ ] 状态一致：UI 显示的候选 == Store 当前候选；旧请求不覆盖新请求；关闭搜索后异步结果不重开页面

---

## 已知遗留（下一阶段）

1. **第二阶段（数据模型）**：`genres[]` / `languages[]` / `cover{s,m,o}` / `tracks` 三态 / `source` / capabilities 门控。
2. **第三阶段（接入加固）**：`apiBase` 相对路径、request token、禁止静默截断 1000 字、图片 CORS 降级、错误码标准化、服务状态机（unknown/checking/starting/ready/busy/degraded/error）。
3. **第四阶段**：按 capabilities 逐步启用后端能力。
4. **第五阶段**：删除旧压缩注释、重复 CSS、死代码与不再使用的 id。
5. `search-controller.js` 仍保留少量旧压缩函数体（未逐行展开），对照旧文件 `seek_search.html` 可审计。

---

## 18. 部署到 GitHub Pages

### 18.1 要不要一起上传单文件版 `seek_search.html`？

**不需要。** 模块化版本是自包含的：

- `index.html` 里所有资源都是**相对路径**（`./styles/...`、`./js/main.js`），
  js 内部的 import 也全是相对路径 —— 所以放在仓库子目录下（`https://user.github.io/repo/`）
  也能正常工作，不会因为路径前缀而 404。
- 全仓库**没有任何硬编码的运行地址**（`127.0.0.1` 只出现在注释示例里）。

单文件版的定位建议：

| 做法 | 说明 |
|---|---|
| **推荐**：不上传 | 部署只需要 `SEEK_Frontend/` |
| 想留个"零依赖单文件"演示 | 放进 `legacy/seek_search.html`，**不要**叫 `index.html`，避免两套入口分叉 |
| 想留开发历史 | 交给 git 历史 + 一个 tag（如 `v1-single-file`），不必把备份文件塞进仓库 |

### 18.2 目录放哪一层

**方案 A（URL 最干净）**：把 `SEEK_Frontend/` 里的内容**直接作为仓库根目录**

```text
仓库根/
├─ index.html          ← 站点入口变成 https://user.github.io/repo/
├─ styles/  js/  config/  tools/
├─ README-frontend.md
└─ .nojekyll
```

**方案 B（保留目录名）**：整个 `SEEK_Frontend/` 上传，站点在
`https://user.github.io/repo/SEEK_Frontend/`（相对路径仍然能用）。

### 18.3 开启 Pages

1. 推到 GitHub（`main` 分支）。
2. 仓库 **Settings → Pages**。
3. **Source** 选 `Deploy from a branch`；**Branch** 选 `main`，
   目录选 `/ (root)`（方案 A）或 `/SEEK_Frontend`（方案 B，部分界面需用 Actions 方式）。
4. 等 1–2 分钟，访问给出的地址。

> 不需要任何构建步骤：这是纯静态站点。

### 18.4 上传前请排除这些

```text
album_orbit_turntable_*.html          ← 早期原型，与 SEEK 无关
seek_search (2).html                  ← 历史副本
*.before-*.html / *.pre-refactor-backup.html   ← 备份
seek-adapter.test.js / seek-endpoint.test.js   ← 测的是旧单文件，已不适用
```

`SEEK_Frontend/.gitignore` 已经帮你挡掉了临时文件（`_*`）与编辑器产物。

### 18.5 部署后搜索能不能用？

GitHub Pages **只能托管静态文件**，跑不了 seek 的 FastAPI 后端。所以线上会有两种状态：

| 状态 | 表现 |
|---|---|
| 默认 | 走「示例演示」，界面明确标注 **示例演示 · 非真实搜索** |
| 想接真后端 | 后端另找地方部署，然后在页面里执行 `SeekSearch.connectSeek('https://你的后端')`；或改 `config/seek-config.js` 的 `apiBase` |

后端与前端**不同源**时，记得后端要开 CORS（见第 13 节），
并且封面要允许跨域，否则粒子的 canvas 采样会失败（会自动降级成淡入淡出，不报错）。

### 18.6 建议的提交节奏

```text
chore: scaffold SEEK_Frontend structure
refactor(styles): split single-file css into 9 modules
refactor(scene): extract orbit scene and deep sky
refactor(search): extract store, state, api, mapper, particle engine
refactor(search): split view and controller
refactor(library): move cd editor into cd-library
fix(search): wire cd editor from library instead of controller
docs: add README-frontend and deploy notes
```