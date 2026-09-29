# SEEK · 记忆寻音 — Web 前端

> 用模糊的记忆，找回那首歌。
>
> 用户以自然语言描述记忆中的专辑（封面、曲风、语言、年代、场景），
> 前端将文字解构成粒子、检索期间悬浮、结果返回后汇聚为候选封面，
> 再通过浏览、排除、补充记忆与追问逐步收敛到答案。

项目可独立运行（示例演示模式，封面程序化生成）；
接入真实检索后端的方法见[第 6 节](#6-后端集成)。

[![Release](https://img.shields.io/github/v/release/Lidazou/seek-web?label=Release&color=b8a77d)](https://github.com/Lidazou/seek-web/releases/latest)
[![Pages](https://img.shields.io/badge/demo-GitHub%20Pages-b8a77d)](https://lidazou.github.io/seek-web/)

| 入口 | 链接 |
|---|---|
| **在线演示** | https://lidazou.github.io/seek-web/ |
| **单文件构建（在线）** | https://lidazou.github.io/seek-web/standalone/seek-web.standalone.html |
| **单文件构建（下载）** | [Releases → `seek-web.standalone.html`](https://github.com/Lidazou/seek-web/releases/latest) |
| **源码仓库** | https://github.com/Lidazou/seek-web |

---

## 目录

1. [简介](#1-简介)
2. [快速开始](#2-快速开始)
3. [单文件构建产物](#3-单文件构建产物)
4. [架构与目录结构](#4-架构与目录结构)
5. [前端部署（GitHub Pages）](#5-前端部署github-pages)
6. [后端集成](#6-后端集成)
7. [配置参考](#7-配置参考)
8. [开发指南](#8-开发指南)
9. [故障排查](#9-故障排查)
10. [法律与合规](#10-法律与合规)
11. [致谢](#11-致谢)

---

## 1. 简介

四个界面状态：

| 状态 | 内容 |
|---|---|
| **首页** | 深空星尘、3D 唱片机、环绕唱片轨道、SEEK 霓虹灯牌 |
| **搜索** | 记忆输入 → 文字粒子解构 → 粒子汇聚为候选封面（3D CD 盒） |
| **浏览** | 候选切换、候选总览、排除、「不是这张」、补充记忆、主动追问 |
| **收藏** | 「★ 收藏到唱片机」进入首页轨道；「编辑CD集」支持拖拽排序与信息编辑 |

设计原则：

- **粒子是记忆的可视化，不是加载装饰**。大规模粒子形变只出现在五个业务节点：
  首次提交、新候选形成、候选切换、补充记忆、追问重排；
  其余交互使用 180–320ms 的常规过渡。
- **动画失败不影响业务结果**。粒子采样因 CORS、Canvas 污染或内存限制失败时，
  自动降级为淡入淡出，搜索结果照常展示。
- **后端未提供的能力不做前端伪造**（见 [6.4 能力矩阵](#64-能力矩阵)）。
  例如真实检索路径尚不支持追问重排时，前端不会声称「已根据你的回答重新排序」。
- **Demo 与 Live 明确区分**。示例演示模式在界面中标注「示例演示 · 非真实搜索」，
  且真实 API 失败后不会静默回退到演示数据。

技术栈：原生 HTML + CSS + ES Modules，无框架、无构建步骤。

---

## 2. 快速开始

项目使用 ES Modules，模块脚本不通过 `file://` 协议加载，本地运行请使用静态服务器。
仓库自带零依赖服务器：

```bash
node serve.mjs            # 默认 http://127.0.0.1:8899
node serve.mjs 3000       # 指定端口
```

或使用任意静态服务器：

```bash
python -m http.server 8899
# 或
npx serve -l 8899
```

启动后：唱片依次入场排成环形轨道、SEEK 灯牌点亮；
点击 SEEK 进入搜索，输入任意描述提交，即可走通「示例演示」全流程。

> 未配置后端时，搜索会明确提示「尚未连接搜索服务」而不是返回伪造结果。
> 接入真实后端的步骤见 [第 6 节](#6-后端集成)。

---

## 3. 单文件构建产物

`standalone/seek-web.standalone.html` 是模块化源码的单文件构建产物：
9 个 CSS 与 19 个 ES Module 全部内联，可直接打开（不依赖静态服务器）、离线使用、作为存档分发。

> 它是**构建产物而非源码**：文件头部带「请勿直接修改」声明。
> 功能改动应落在 `index.html` / `styles/` / `js/`，随后重新生成：

```bash
node tools/build-standalone.mjs
```

打包器会：解析 `js/main.js` 的相对 import 并拓扑排序 → 剥离模块语法 →
用 `vm.Script` 编译校验（顶层重名直接报错）→ 内联 CSS 与 JS → 构建后自检
（无残留外链、无 `import`/`export`、符号未被破坏）。

| 形态 | 入口 | 用途 |
|---|---|---|
| 模块化（源码） | 根目录 `index.html` | 开发、部署 |
| 单文件（产物） | `standalone/seek-web.standalone.html` | 查看、分发、归档 |

两者行为一致，仅维护源码。详见 [`standalone/README.md`](./standalone/README.md)。

---

## 4. 架构与目录结构

```text
seek-web/
├─ index.html                    页面结构（约 230 行，不含任何内联 CSS/JS）
├─ config/
│  └─ seek-config.js             环境配置：apiBase、超时、粒子上限、开关
├─ styles/                       按组件分文件，加载顺序即层叠顺序
│  ├─ base.css                   reset、排版、CSS 变量、.sr-only
│  ├─ scene.css                  视口、氛围、星空、HUD、首页按钮
│  ├─ turntable.css              3D 唱片机与环绕唱片
│  ├─ neon.css                   SEEK 霓虹灯牌 + 搜索态光锥
│  ├─ library.css                编辑 CD 集页面与弹窗
│  ├─ search.css                 搜索 Overlay、记忆栏、输入区、候选展示
│  ├─ search-states.css          追问 / 空态 / 错误 / 总览 / 曲目 / 设置
│  ├─ cd-case.css                候选封面 3D CD 盒
│  └─ responsive.css             全部 @media（最后加载）
├─ js/
│  ├─ main.js                    唯一入口：装配模块、暴露 window.SeekSearch
│  ├─ shared/                    dom / errors / media / motion（通用工具）
│  ├─ scene/                     orbit-scene / deep-sky / artwork-generator
│  ├─ library/cd-library.js      收藏、编辑 CD 集、拖拽排序、localStorage
│  ├─ search/
│  │  ├─ search-controller.js    流程协调层（用户事件 → Store → API → View）
│  │  ├─ search-store.js         会话数据状态（不含动画状态）
│  │  ├─ search-state.js         业务状态 / 视觉状态 / 空结果原因
│  │  ├─ seek-api.js             后端通信唯一入口（全站唯一 fetch）
│  │  ├─ candidate-mapper.js     后端字段 → 前端 DTO
│  │  ├─ particle-morph-engine.js 粒子动画（纯视觉模块）
│  │  └─ search-view.js          DOM 渲染（不发 API、不算候选）
│  └─ demo/                      demo-data.js / demo-provider.js
├─ standalone/                   seek-web.standalone.html（构建产物）
├─ serve.mjs                     本地静态服务器（零依赖）
├─ tools/                        build-standalone.mjs / verify-modules.js / import-test.mjs
├─ README.md
└─ README-frontend.md            开发细则
```

**依赖方向（单向）**

```text
main
 └→ search-controller
     ├→ search-view / search-store / search-state
     ├→ seek-api → candidate-mapper
     ├→ particle-morph-engine
     └→ library / scene / demo
         └→ shared
```

约束：

- 全站唯一 `fetch` 位于 `js/search/seek-api.js`，其余模块不得直接发起请求。
- UI 不直接依赖后端原始响应结构，字段转换统一经 `candidate-mapper.js`。
- 动画引擎不读写业务状态、不决定搜索结果。
- 模块间禁止反向 import；除调试入口 `window.SeekSearch` 外无全局变量。

---

## 5. 前端部署（GitHub Pages）

纯静态站点、零构建。所有资源使用相对路径，可部署在任意子路径下，
仓库内无硬编码运行地址。

1. 将仓库推送到 GitHub（`main` 分支）。
2. 仓库 **Settings → Pages**：Source 选 `Deploy from a branch`，分支 `main`，目录 `/ (root)`。
3. 构建完成后访问 `https://<用户名>.github.io/<仓库名>/`。

`.nojekyll` 已配置，避免 Pages 对静态资源做 Jekyll 处理。
自定义域名：仓库根放置 `CNAME` 文件并配置 DNS 解析，随后在 Pages 设置中启用 HTTPS。

> GitHub Pages 仅托管静态文件。线上默认运行「示例演示」模式；
> 真实检索需要部署 seek 后端并接入（[第 6 节](#6-后端集成)）。

---

## 6. 后端集成

后端仓库：[Violet-Galaxy233/seek](https://github.com/Violet-Galaxy233/seek)
（FastAPI + Gradio + SQLite + FAISS + Qwen3-VL-Embedding-2B）。

### 6.1 部署 seek 后端

```bash
git clone https://github.com/Violet-Galaxy233/seek.git
cd seek
uv sync
uv run python -m app          # http://127.0.0.1:8000（含 Gradio 验证页）
```

模型、数据与索引不随 Git 分发，需在目标机器上准备：

```bash
# Qwen3-VL-Embedding-2B，约 4.0 GB，向量维度 2048
uv run python -m app.download_models --model qwen

# 小规模演示数据
uv run python -m app.import_music --limit 100
```

> `--limit` 导入的数据与原仓库作者本机的 366 条快照不完全一致
> （该快照经过多轮实验与人工清理）；可重复的数据快照方案见后端仓库的
> [`docs/data-strategy.md`](https://github.com/Violet-Galaxy233/seek/blob/main/docs/data-strategy.md)。

服务形态建议（详见后端仓库 [`docs/handoff.md`](https://github.com/Violet-Galaxy233/seek/blob/main/docs/handoff.md) 的 P3 路线）：

| 方案 | 适用场景 | 要点 |
|---|---|---|
| VPS / 云主机 | 长期在线 | 内存 ≥ 8GB（模型约 4GB）、磁盘 ≥ 20GB |
| Docker | 环境一致 | `models/`、`data/`、`indexes/` 挂载为 volume |
| 内网 + 隧道 | 临时演示 | `cloudflared tunnel` / `ngrok`，注意访问控制 |
| Serverless | 不适用 | 有状态索引 + 大模型冷启动 |

生产化要点：将 Gradio 与 API 运行模式分离（`mount_ui=False`）；
封面转对象存储 / CDN 并提供缩略图；经反向代理统一暴露 HTTP(S)，
并将 `/covers` 与 API 置于同一域名。

监听地址与健康检查：

```bash
uv run uvicorn app.api:app --host 0.0.0.0 --port 8000
curl http://127.0.0.1:8000/health
# {"status":"...","message":"...","index_count":366,"index_reused":true}
```

### 6.2 前端连接后端

**推荐同源部署**：将前端静态文件经后端反向代理（或 FastAPI `StaticFiles`）提供，
使页面、`/search`、`/covers` 同域，可同时规避 API CORS、Canvas 跨域污染、
Mixed Content、Cookie/Session 与 CSP 五类问题，也是封面参与 canvas 像素采样的前提。

```text
https://seek.example.com/            ← 前端
https://seek.example.com/search      ← API
https://seek.example.com/covers/...  ← 封面
```

**跨域部署**时，后端需显式启用 CORS。当前 `app/api.py` 未挂载 `CORSMiddleware`，
可用以下命令验证：

```bash
curl -i -X OPTIONS http://127.0.0.1:8000/search \
  -H "Origin: null" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type"
```

若响应头不含 `access-control-allow-origin`，在 `create_app()` 中补充：

```python
from fastapi.middleware.cors import CORSMiddleware

application.add_middleware(
    CORSMiddleware,
    allow_origins=["https://前端域名"],   # 不带 cookie 时可使用 ["*"]
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)
```

封面同样需要允许跨域，否则粒子采样会被 Canvas 安全策略拦截；
前端对此已降级（淡入淡出），不影响结果展示。

**声明后端地址**（三选一；生产环境建议写入 `config/seek-config.js` 而非控制台）：

```js
SeekSearch.connectSeek('https://seek.example.com');        // seek 后端（传根地址）
SeekSearch.setEndpoint('https://seek.example.com/search'); // 任意 HTTP 接口
SeekSearch.setProvider(async (payload, { signal }) => ({ candidates: [...] }));
```

```js
// config/seek-config.js
export const seekConfig = {
  apiBase: 'https://seek.example.com',
  requestTimeoutMs: 120000,   // 首次加载模型可能超过默认超时
};
```

首次真实检索需要加载约 4GB 模型，耗时可能超过默认超时，可调大等待上限：

```js
SeekSearch.setTimeout(120000);
```

### 6.3 API 契约

来源：[`app/api.py`](https://github.com/Violet-Galaxy233/seek/blob/main/app/api.py)（v0.2.0）

**`POST /search`**

```json
{
  "description": "日语摇滚，封面有很多黑色小皮鞋，背景颜色可能记错了",
  "answers": [
    { "question_id": "q1", "value": "yes" }
  ]
}
```

- `description`：1–1000 字符
- `answers[].value` ∈ `"yes" | "no" | "uncertain"`
- `SearchRequest` 声明了 `extra="forbid"`：请求体只允许以上两个字段，多传即 422

```json
{
  "raw_query": "...",
  "normalized_query": "...",
  "candidates": [
    {
      "album":   { "id": "...", "title": "...", "artist": "...",
                   "language": "ja", "first_release_year": 2001 },
      "release": { "id": "...", "release_date": "2001-03-01", "country": "JP" },
      "cover":   { "id": "...", "image_uri": "/covers/xxx.png" },
      "score": 0.6444,
      "matching_clues": ["..."],
      "conflicting_clues": ["..."]
    }
  ],
  "question": { "id": "q1", "text": "封面上有没有鞋子？", "answers": ["yes", "no", "uncertain"] }
}
```

其它接口：

| 接口 | 说明 |
|---|---|
| `GET /health` | `{ status, message, index_count, index_reused }` |
| `GET /covers/<file>` | 封面静态文件 |
| `GET /` | Gradio 验证页（生产环境建议 `mount_ui=False`） |

### 6.4 能力矩阵

已支持：

- 中英文封面描述检索，单次最多返回 20 个候选
- 专辑 / 发行 / 封面 / 相似度 / 匹配与冲突线索字段
- 模型缺失时明确报错，不静默调用在线 API

后端尚未实现、前端已做优雅降级（不伪造、不报错）的能力：

| 能力 | 现状 | 前端表现 |
|---|---|---|
| answer rerank | 真实 Qwen+FAISS 路径不支持非空 `answers` | 不声称「已根据回答重新排序」 |
| 曲目 / 详情接口 | `Track` 仅在 `domain.py`，无 API | 显示「服务未提供曲目列表」 |
| `genre` | API 响应无该字段 | 曲风栏留空，仅展示年份与语言 |
| 结构化冲突解释 | 仅向量相似度 | 只展示后端实际返回的线索 |
| 候选排除 | 无接口 | 仅本轮本地隐藏，文案为「已从本轮候选中移除」 |
| 确认 / 反馈 | 无接口 | 本地完成，不伪装为后端已记录 |
| 后端会话 | 无 `session_id` | 使用本地会话 |
| 缩略图封面 | 无，原图 1.7–2.7MB | 建议后端提供缩略图 |

> 关于追问：后端 `docs/frontend.md` 将「追问重排」列为目标协议。
> 当前状态是 API schema 已预留 `answers`；fixture / prototype 的 `SearchService`
> 支持追问；真实 `IndexedSearchService`（Qwen + FAISS）不支持非空 `answers`。
> 前端仅在后端实际返回 `question` 时展示追问卡，不会自行生成问题。

---

## 7. 配置参考

`config/seek-config.js`：

```js
export const seekConfig = {
  environment: 'development',        // 'development' | 'production'
  apiBase: '',                       // 后端根地址；留空表示同源
  requestTimeoutMs: 60000,           // 单次请求上限
  demoEnabled: true,                 // 是否允许进入示例演示
  enableServiceSettings: true,       // 是否显示手动配置接口地址的开发面板
  particle: { desktopLimit: 52000, mobileLimit: 22000 },
  seekBackend: { searchPath: '/search', healthPath: '/health', coversPath: '/covers' },
  frontendVersion: '0.2.0-modular'
};
```

`window.SeekSearch` 调试接口：

```js
SeekSearch.open() / close()               // 打开 / 关闭搜索界面
SeekSearch.useDemo()                      // 进入示例演示
SeekSearch.connectSeek(baseUrl)           // 接入 seek 后端（含 /health 探活）
SeekSearch.setEndpoint(url)               // 接入任意 HTTP 接口
SeekSearch.setProvider(fn)                // 自定义数据源
SeekSearch.health()                       // 探活，Promise<{status,index_count,...}>
SeekSearch.setTimeout(ms)                 // 调整请求超时
SeekSearch.getState()                     // { state, query, count, index, demo, excluded }
SeekSearch.getCurrentCandidate()          // 当前候选完整字段
SeekSearch.debug()                        // 前端版本 / 后端状态 / capabilities / sessionId
```

关键交互元素均带 `data-testid`（`search-input`、`candidate-cover`、`accept-candidate` 等 19 处），
自动化测试不应依赖复杂 CSS 选择器。

---

## 8. 开发指南

修改位置速查：

| 修改目标 | 文件 |
|---|---|
| 页面结构 / DOM | `index.html` |
| 视觉样式 | `styles/` 对应组件文件 |
| 搜索流程、状态机、交互 | `js/search/search-controller.js` |
| 后端通信 / 超时 / 探活 | `js/search/seek-api.js` |
| 后端字段映射 | `js/search/candidate-mapper.js` |
| 粒子动画 | `js/search/particle-morph-engine.js` |
| 收藏 / CD 集 / 拖拽排序 | `js/library/cd-library.js` |
| 3D 唱片机与轨道 | `js/scene/orbit-scene.js` |
| 星空与氛围 | `js/scene/deep-sky.js` |
| 示例数据 | `js/demo/` |
| 接口地址 / 环境开关 | `config/seek-config.js` |
| 单文件产物（自动生成） | `node tools/build-standalone.mjs` |

新增后端字段的步骤：

1. 在 `candidate-mapper.js` 中补充映射（后端嵌套结构 → 内部 DTO）。
2. 展示层在 `search-view.js` 中使用 `textContent` 渲染（禁止 `innerHTML` 插入后端文本）。
3. 流程层在 `search-controller.js` 消费；需要持久化则加入 `search-store.js`。
4. 运行 `node tools/verify-modules.js .` 校验模块依赖与 DOM id。

自检：

```bash
node tools/verify-modules.js .    # 依赖 / 导出 / DOM id / testid / 全局残留
node tools/import-test.mjs        # 逐模块导入与实例化冒烟
```

---

## 9. 故障排查

**搜索提示「尚未连接搜索服务」**
未配置后端时的预期行为。选择「先用示例专辑体验完整流程」或按 [第 6 节](#6-后端集成) 接入后端。

**连接后端时报「无法连接，请检查网络、接口地址与跨域设置」**
多数为 CORS 问题：按 [6.2](#62-前端连接后端) 验证 `OPTIONS` 响应头。

**首次搜索耗时很长**
后端正在加载约 4GB 模型。`SeekSearch.setTimeout(120000)` 放宽等待上限。

**候选封面破损或粒子动画缺失**
封面跨域被拦截：优先同源部署；跨域时需为 `/covers` 配置 CORS。
前端会自动降级为淡入淡出，不影响结果。

**GitHub Pages 上无法真实检索**
Pages 仅托管静态文件，无法运行 FastAPI。线上默认示例演示模式；
真实检索需将后端部署到独立服务并按 [第 6 节](#6-后端集成) 接入。

---

## 10. 法律与合规

公开部署前请注意（引用自后端仓库 [`docs/handoff.md`](https://github.com/Violet-Galaxy233/seek/blob/main/docs/handoff.md)）：

> 当前封面版权仅适合本地原型，公开展示方案未确定。
> 不把当前 `data/`、`models/` 或 `indexes/` 提交到公开 Git。

- 不要将 `data/`（第三方封面）、`models/`（模型权重）、`indexes/` 提交到公开仓库。
- 公开演示建议仅运行「示例演示」模式（封面由 `artwork-generator.js` 程序化生成）。
- 公开展示真实封面前，需确认封面授权与下架方案（后端仓库 P0 任务之一）。
- 后端 API 尚无公网鉴权、限流、匿名会话与反馈存储；直接暴露公网前至少增加
  反向代理与访问控制。

---

## 11. 致谢

- 后端与检索逻辑：[Violet-Galaxy233/seek](https://github.com/Violet-Galaxy233/seek)
- 代码规范参考：[doyoe/html-css-guide](https://github.com/doyoe/html-css-guide)
