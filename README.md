# SEEK · 记忆寻音（Web 前端）

> 用模糊的记忆，找回那首歌。
>
> 一个把「记忆」变成粒子的音乐检索前端：你描述封面、曲风、年代或场景，
> 文字先解体成粒子，搜索进行时粒子悬浮，最后汇聚成最可能的那张唱片封面。

## 🔗 在线查看

[![Release](https://img.shields.io/github/v/release/Lidazou/seek-web?label=Release&color=b8a77d)](https://github.com/Lidazou/seek-web/releases/latest)
[![Pages](https://img.shields.io/badge/demo-GitHub%20Pages-b8a77d)](https://lidazou.github.io/seek-web/)

| 看什么 | 链接 | 说明 |
|---|---|---|
| **🌐 完整应用** | **https://lidazou.github.io/seek-web/** | 模块化正式版，部署在 GitHub Pages |
| **📄 单文件版（在线看）** | **https://lidazou.github.io/seek-web/standalone/seek-web.standalone.html** | 整个前端压成一个 HTML，打开即用 |
| **⬇️ 单文件版（下载存档）** | **[Releases → seek-web.standalone.html](https://github.com/Lidazou/seek-web/releases/latest)** | 永久下载按钮，约 199 KB，可离线收藏 |
| 📦 源码仓库 | https://github.com/Lidazou/seek-web | 本页面 |

> **单文件版是什么**：把 9 个 CSS 与 19 个 ES Module 全部内联进一个 HTML（约 200 KB），
> 不需要服务器、不需要构建、可以直接下载收藏或发给别人。
> 它是**构建产物**，源码仍然在 `index.html` + `styles/` + `js/`；
> 改完源码跑 `node tools/build-standalone.mjs` 重新生成。详见 [`standalone/README.md`](./standalone/README.md)。

---

本仓库是 **[Violet-Galaxy233/seek](https://github.com/Violet-Galaxy233/seek)** 的
**Web 前端**。它既能独立以「示例演示」模式离线运行，也能通过 HTTP 直连 seek 的 FastAPI 后端。

---

## 目录

- [1. 它长什么样](#1-它长什么样)
- [2. 快速开始（前端单独跑）](#2-快速开始前端单独跑)
- [2.5 只想看一眼？用单文件版](#25-只想看一眼用单文件版)
- [3. 前端部署到 GitHub Pages](#3-前端部署到-github-pages)
- [4. 部署 seek 后端](#4-部署-seek-后端)
- [5. 把前端接到后端](#5-把前端接到后端跨域是重点)
- [6. 后端接口契约](#6-后端接口契约)
- [7. 后端当前能力与缺口](#7-后端当前能力与缺口)
- [8. 项目结构](#8-项目结构)
- [9. 修改指引](#9-修改指引)
- [10. 自检与调试](#10-自检与调试)
- [11. 常见问题](#11-常见问题)
- [12. 版权与合规提醒](#12-版权与合规提醒)

---

## 1. 它长什么样

四个界面状态：

| 状态 | 内容 |
|---|---|
| **首页** | 深空星尘 + 3D 唱片机 + 环绕唱片轨道 + SEEK 霓虹灯牌 |
| **搜索** | 记忆输入 → 文字粒子解体 → 粒子汇聚成候选封面（3D CD 盒） |
| **浏览** | 左右切换候选、候选总览、排除、补充记忆、主动追问 |
| **收藏** | 「★ 收藏到唱片机」→ 进入首页轨道；「编辑CD集」可拖拽排序、改封面与信息 |

关键设计：**粒子不是 Loading 装饰**。粒子代表「用户记忆在系统中的重新组织」，
所以只在五个节点使用大规模粒子动画：首次提交、新候选形成、切换候选、补充记忆、追问重排。
其余按钮与弹窗一律 180–320ms 普通过渡。

---

## 2. 快速开始（前端单独跑）

### 2.1 不能直接双击 `index.html`

这个版本用 **ES Module** 把代码拆成了 19 个 js 文件 + 9 个 css 文件。
浏览器出于安全策略，**禁止 `file://` 页面用 `import` 加载本地模块**，
双击打开只会看到没有样式、没有逻辑的骨架。

**这不是坏了，是必须走 HTTP。**

### 2.2 三种启动方式

**Node（推荐，仓库自带、零依赖、跨平台）**：

```bash
node serve.mjs          # 默认 http://127.0.0.1:8899
node serve.mjs 3000     # 也可指定端口
```

**Python**：

```bash
python -m http.server 8899
# 打开 http://127.0.0.1:8899/
```

**Node**：

```bash
npx serve -l 8899
# 打开 http://127.0.0.1:8899/
```

启动后在页面里应当看到：唱片依次入场排成环形轨道、SEEK 灯牌点亮。
点击 SEEK 打开搜索，输入任意描述点「开始寻找」，会走**示例演示**数据。

---

## 2.5 只想看一眼？用单文件版

如果你不想开服务器，仓库里有一份**构建产物**可以直接双击打开：

```text
standalone/seek-web.standalone.html
```

它是把 9 个 CSS 与 19 个 ES Module 全部内联后的**单文件 HTML**，
`file://` 也能跑，适合本地查看、分享、离线演示。

**两种获取方式：**

- 在线看：`https://lidazou.github.io/seek-web/standalone/seek-web.standalone.html`
- 下载存档：[Releases 页面](https://github.com/Lidazou/seek-web/releases/latest) → 附件 `seek-web.standalone.html`（永久链接，适合收藏或发给别人）

> ⚠️ **它是自动生成的，不要直接改。**
> 源码仍然在 `index.html` + `styles/` + `js/`；改完源码后重新生成：
>
> ```bash
> node tools/build-standalone.mjs
> ```
>
> 打包器会做拓扑排序、剥掉模块语法、用 `vm.Script` 编译校验（顶层重名直接报错），
> 并在文件顶部插入「请勿直接修改」的警示。

两套东西的关系：

| 版本 | 入口 | 用途 |
|---|---|---|
| 模块化（源码） | 根目录 `index.html` | **开发 + 部署到 GitHub Pages** |
| 单文件（产物） | `standalone/seek-web.standalone.html` | 双击查看、分享、归档 |

两者行为一致，但**只有源码需要维护**。

---

## 3. 前端部署到 GitHub Pages

### 3.1 好消息：不需要任何构建

纯静态站点，所有资源都是**相对路径**（`./styles/...`、`./js/main.js`，js 之间的 import 也是相对路径），
所以放在仓库子路径下（`https://用户名.github.io/仓库名/`）也能正常工作。
全仓库**没有任何硬编码的运行地址**。

### 3.2 上传哪些文件

上传本目录的全部内容：

```text
index.html
styles/  (9 个 css)
js/      (18 个模块)
config/  (seek-config.js)
tools/   (两个自检脚本，可选)
README.md  README-frontend.md
.nojekyll  .gitignore  启动预览.bat
```

**不要上传**（`.gitignore` 已挡掉一部分）：

```text
album_orbit_turntable_*.html     早期原型，与本项目无关
*.before-*.html                  备份
*pre-refactor-backup.html        备份
seek-adapter.test.js             测的是重构前的单文件版，已不适用
seek-endpoint.test.js            同上
_probe*.html / _*.png            临时调试产物
```

### 3.3 两种目录方案

**方案 A · URL 更干净** —— 把本目录内容**直接放到仓库根**：

```text
仓库根/
├─ index.html
├─ styles/  js/  config/  tools/
├─ README.md
└─ .nojekyll
```

站点地址：`https://用户名.github.io/仓库名/`

**方案 B · 保留目录名** —— 把整个文件夹上传：

站点地址：`https://用户名.github.io/仓库名/SEEK_Frontend/`（相对路径仍然能用）

### 3.4 开启 Pages

1. 推送到 GitHub（`main` 分支）。
2. 仓库 **Settings → Pages**。
3. **Source** 选 `Deploy from a branch`，**Branch** 选 `main`，
   目录选 `/ (root)`（方案 A）。
4. 等 1–2 分钟，访问给出的地址。

`.nojekyll` 已就位，避免 GitHub Pages 用 Jekyll 处理静态资源。

### 3.5 想要分享卡片 / 自定义域名

在仓库根加 `CNAME` 文件写入你的域名，并在域名服务商配置 CNAME 解析到
`用户名.github.io`，然后在 Pages 设置里填自定义域名并开启 HTTPS。

---

## 4. 部署 seek 后端

后端仓库：[**Violet-Galaxy233/seek**](https://github.com/Violet-Galaxy233/seek)
（FastAPI + Gradio + SQLite + FAISS + Qwen3-VL-Embedding-2B）

### 4.1 本地跑起来（先验证再上服务器）

```bash
git clone https://github.com/Violet-Galaxy233/seek.git
cd seek
uv sync
uv run python -m app
```

打开 `http://127.0.0.1:8000` —— 这是它自带的 Gradio 验证页面。
首次加载本地模型需要等待；已有索引会直接复用。停止用 `Ctrl-C`。

### 4.2 准备模型（Git 里没有）

`models/`、`data/`、`indexes/`、`.env` 都在 `.gitignore` 里，
**只执行 `git push` 不会把约 4GB 的模型传上去**，需要在服务器上重新拉：

```bash
# Qwen3-VL-Embedding-2B，约 4.0 GB，向量维度 2048
uv run python -m app.download_models --model qwen

# 或者下载 CLIP 图像/文本模型
uv run python -m app.download_models --model clip
```

也可以从本机用安全文件传输复制 `models/qwen3-vl-embedding-2b/`。

### 4.3 准备数据

小规模演示（最快，几分钟）：

```bash
uv run python -m app.import_music --limit 100
```

> 注意：这**不会**得到与原仓库作者本机完全相同的 366 条数据
> （那 366 条是多轮实验 + 人工清理后的状态，无法靠一次 `--limit` 精确复现）。

完整数据请照 [`docs/data-strategy.md`](https://github.com/Violet-Galaxy233/seek/blob/main/docs/data-strategy.md)
用 MusicBrainz 官方转储做可重复快照。

### 4.4 部署到服务器

后端是**有状态的**（本地模型 + 本地索引 + 本地封面目录），所以：

| 方案 | 适合 | 要点 |
|---|---|---|
| **VPS / 云主机** | 长期在线、给公网访问 | 内存建议 ≥ 8GB（模型约 4GB）；磁盘 ≥ 20GB |
| **Docker** | 环境一致 | 镜像里跑 `uv run python -m app`，把 `models/ data/ indexes/` 挂成 volume |
| **内网 / 本地机器 + 隧道** | 只想演示给别人看 | `cloudflared tunnel` 或 `ngrok` 暴露出去，注意鉴权 |
| **Serverless** | ✗ 不推荐 | 有状态索引 + 大模型冷启动，冷启动时间不可接受 |

生产化建议（来自原项目 [`docs/handoff.md`](https://github.com/Violet-Galaxy233/seek/blob/main/docs/handoff.md)
的 P3 路线）：

1. 把 **Gradio 与 API 拆开**运行（Gradio 只是后端验证工具，生产不需要）。
2. 用常驻进程跑 Qwen 文本向量服务 + 只读索引服务。
3. 封面走**对象存储 / CDN** 并压成缩略图（原图单张 1.7–2.7MB，前端首屏多张会慢）。
4. 反向代理（Nginx / Caddy）挂 HTTPS，并把 `/covers` 一起代理到同一域名。

### 4.5 启动命令与端口

后端默认监听 **127.0.0.1:8000**（见 `app/__main__.py`）。
要让外部访问，改成 `0.0.0.0`：

```bash
uv run uvicorn app.api:app --host 0.0.0.0 --port 8000
```

自检：

```bash
curl http://127.0.0.1:8000/health
# {"status":"...","message":"...","index_count":366,"index_reused":true}
```

---

## 5. 把前端接到后端（跨域是重点）

### 5.1 最推荐：前后端同源

把编译好的前端静态文件交给后端的反向代理（或 FastAPI 的 `StaticFiles`）一起提供：

```text
https://seek.example.com/            ← 前端 index.html
https://seek.example.com/search      ← 后端 API
https://seek.example.com/covers/...  ← 封面
```

同源可以一次性规避 **API CORS、Canvas 跨域污染、Mixed Content、Cookie/Session、CSP** 五类问题。
这也是封面能进 canvas 做粒子采样的前提。

### 5.2 不同源：后端必须开 CORS

`app/api.py` 目前**没有显式挂 `CORSMiddleware`**。先实测：

```bash
curl -i -X OPTIONS http://127.0.0.1:8000/search \
  -H "Origin: null" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type"
```

返回头里**没有** `access-control-allow-origin` 就说明跨域会被浏览器拦掉。
在 `create_app()` 里补一段：

```python
from fastapi.middleware.cors import CORSMiddleware

application.add_middleware(
    CORSMiddleware,
    allow_origins=["https://你的前端域名"],   # 或 ["*"]（不带 cookie 时可用）
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)
```

> 封面同样需要允许跨域，否则粒子采样会被 canvas 安全策略拦掉。
> 前端对此**已做降级**：采样失败会自动改用淡入淡出，搜索结果照常显示，不会报错。

### 5.3 在前端声明后端地址

三种方式，任选其一（浏览器控制台执行即可，刷新后失效）：

```js
// A. 接 seek 后端（推荐，传服务根地址，不要带 /search）
SeekSearch.connectSeek('https://seek.example.com');

// B. 接任意 HTTP 接口（扁平 candidates 或 seek 嵌套结构都能识别）
SeekSearch.setEndpoint('https://seek.example.com/search');

// C. 完全自定义
SeekSearch.setProvider(async (payload, { signal }) => ({ candidates: [...] }));
```

要**固化**下来（推荐生产环境）：

```js
// config/seek-config.js
export const seekConfig = {
  apiBase: 'https://seek.example.com',   // ← 改这里
  requestTimeoutMs: 120000,              // 首次加载模型可能超 60s
  demoEnabled: true,
  ...
};
```

或在 `index.html` 末尾、`main.js` 之后追加一段：

```html
<script type="module">
  import './js/main.js';
  SeekSearch.connectSeek('https://seek.example.com')
    .then(info => console.log('已连接，索引条目', info.index_count))
    .catch(err => console.warn('连接失败，将停留在示例演示模式：', err.message));
</script>
```

连上之后，界面标签会从「示例演示 · 非真实搜索」变回「搜索服务已连接」。

### 5.4 首次请求慢是正常的

真实检索第一次要加载 Qwen 模型（约 4GB），可能超过默认超时。
调大等待上限：

```js
SeekSearch.setTimeout(120000);   // 单位毫秒
```

---

## 6. 后端接口契约

来源：[`app/api.py`](https://github.com/Violet-Galaxy233/seek/blob/main/app/api.py)（v0.2.0）

### `POST /search`

请求：

```json
{
  "description": "日语摇滚，封面有很多黑色小皮鞋，背景颜色可能记错了",
  "answers": [
    { "question_id": "q1", "value": "yes" }
  ]
}
```

- `description`：长度 1–1000
- `answers[].value` ∈ `"yes" | "no" | "uncertain"`
- ⚠️ 后端 `SearchRequest` 是 **`extra="forbid"`** —— 多传一个字段就 **422**，
  所以请求体里**只能**有 `description` 和 `answers` 两个键。

响应：

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
  "question": { "id": "q1", "text": "封面上有没有鞋子？", "answers": ["yes","no","uncertain"] }
}
```

### 其它

| 接口 | 说明 |
|---|---|
| `GET /health` | `{ status, message, index_count, index_reused }` |
| `GET /covers/<file>` | 封面静态文件 |
| `GET /` | Gradio 验证页面（生产可关闭 `mount_ui=False`） |

---

## 7. 后端当前能力与缺口

### 已经能用的

- 中文 / 英文封面描述检索
- 最多返回 20 个候选
- 封面、专辑、艺人、年份、语言
- `matching_clues` / `conflicting_clues` 字段
- 模型不存在时明确报错，不偷偷调在线 API

### 还不能用的（前端已优雅降级，不会崩）

| 能力 | 现状 | 前端的表现 |
|---|---|---|
| **answer rerank** | 真实 Qwen+FAISS 路径**尚未实现非空 answers** | 不会宣称「已根据你的回答重新排序」 |
| 曲目 / 详情接口 | `Track` 只存在于 `domain.py`，无 API | 显示「服务未提供曲目列表」 |
| `genre` | API 响应里没有该字段 | 曲风一栏为空，只显示「年份 · 语言」 |
| 结构化冲突解释 | 目前只有向量相似度 | 只展示后端真正返回的线索，不编造 AI 推理 |
| 候选排除 | 无接口 | 仅本轮前端隐藏，文案是「已从本轮候选中移除」 |
| 确认 / 反馈 | 无接口 | 本地完成，不伪装成后端已记录 |
| 后端 session | 无 `session_id` | 使用本地会话 |
| 缩略图封面 | 无，原图 1.7–2.7MB | 建议后端补缩略图 |

> **关于追问的重要说明**
> `docs/frontend.md` 把「追问重排」列为**最终需要**的协议。
> 现状是：**API schema 已预留 `answers` 字段；fixture/prototype 的 `SearchService` 支持追问；
> 真实 `IndexedSearchService`（Qwen + FAISS）当前不支持非空 `answers`。**
> 因此本前端只有在后端真的返回 `question` 时才显示追问卡，不会自己编问题。

---

## 8. 项目结构

```text
SEEK_Frontend/
├─ index.html                    只描述页面结构（约 220 行）
├─ config/seek-config.js         环境配置：接口地址 / 超时 / 粒子上限 / 开关
├─ styles/                       按组件分文件，加载顺序即层叠顺序
│  ├─ base.css                    reset、排版、CSS 变量、.sr-only
│  ├─ scene.css                   视口、氛围、星空、HUD、首页按钮
│  ├─ turntable.css               3D 唱片机与环绕唱片
│  ├─ neon.css                    SEEK 霓虹灯牌 + 搜索态光锥
│  ├─ library.css                 编辑 CD 集页面与弹窗
│  ├─ search.css                  搜索 Overlay、记忆栏、输入区、候选展示
│  ├─ search-states.css           追问 / 空态 / 错误 / 总览 / 曲目 / 设置
│  ├─ cd-case.css                 候选封面 3D CD 盒
│  └─ responsive.css              全部 @media（必须最后加载）
├─ js/
│  ├─ main.js                     唯一入口：装配模块 + window.SeekSearch
│  ├─ shared/                     dom / errors / media / motion
│  ├─ scene/                      orbit-scene / deep-sky / artwork-generator
│  ├─ library/cd-library.js       收藏、编辑 CD 集、拖拽排序、持久化
│  ├─ search/
│  │  ├─ search-controller.js     唯一的流程协调层
│  │  ├─ search-store.js          会话数据状态（不含动画状态）
│  │  ├─ search-state.js          业务状态 / 视觉状态 / 空结果原因
│  │  ├─ seek-api.js              后端通信唯一入口（全站唯一 fetch）
│  │  ├─ candidate-mapper.js      后端字段 → 前端 DTO
│  │  ├─ particle-morph-engine.js 粒子动画（纯视觉）
│  │  └─ search-view.js           只负责把 Store 画到 DOM
│  └─ demo/                       demo-data.js / demo-provider.js
├─ standalone/                    seek-web.standalone.html（构建产物）+ 说明
├─ serve.mjs                      本地预览服务器（零依赖，跨平台）
├─ tools/                         build-standalone.mjs / verify-modules.js / import-test.mjs
├─ README.md                      本文件
└─ README-frontend.md             更详细的开发与对接说明（17 节）
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

## 9. 修改指引

| 你想改 | 去哪儿 |
|---|---|
| 页面结构 / 加减 DOM | `index.html` |
| 视觉效果 | `styles/` 对应文件 |
| 搜索流程、状态机、交互 | `js/search/search-controller.js` |
| 后端接口 / 超时 / 探活 | `js/search/seek-api.js` |
| 后端字段映射 | `js/search/candidate-mapper.js` |
| 粒子动画 | `js/search/particle-morph-engine.js` |
| 收藏 / CD 集 / 拖拽排序 | `js/library/cd-library.js` |
| 3D 唱片机与轨道 | `js/scene/orbit-scene.js` |
| 星空与氛围 | `js/scene/deep-sky.js` |
| 示例数据 | `js/demo/` |
| 接口地址 / 环境开关 | `config/seek-config.js` |
| 单文件版（只读，自动生成） | `standalone/seek-web.standalone.html`，改完源码跑 `node tools/build-standalone.mjs` |

**加一个新后端字段的步骤**

1. 在 `candidate-mapper.js` 的映射里加上它（后端嵌套结构 → 内部 DTO）。
2. 要展示就在 `search-view.js` 里用 `textContent` 渲染（**禁止 innerHTML**）。
3. 要影响流程就在 `search-controller.js` 里消费，需要持久化就加进 `search-store.js`。
4. 跑一次 `node tools/verify-modules.js .` 确认导入链没坏。

---

## 10. 自检与调试

```bash
cd SEEK_Frontend
node tools/verify-modules.js .    # 模块依赖 / 导出 / DOM id / testid / 全局残留
node tools/import-test.mjs        # 真实 import 每个模块并实例化
```

浏览器控制台：

```js
SeekSearch.open();                 // 打开搜索界面
SeekSearch.useDemo();              // 进入示例演示
SeekSearch.health();               // 探活后端，返回 Promise
SeekSearch.getState();             // { state, query, count, index, demo, excluded }
SeekSearch.getCurrentCandidate();  // 当前候选的完整字段
SeekSearch.debug();                // 前端版本 / 后端状态 / capabilities / sessionId
SeekSearch.setTimeout(120000);     // 放宽等待上限
```

关键交互元素都带 `data-testid`（`search-input`、`candidate-cover`、`accept-candidate` 等 19 个），
写自动化测试时不要依赖复杂 CSS 选择器。

---

## 11. 常见问题

**Q：双击 `index.html` 白屏？**
A：ES Module 在 `file://` 下不允许加载。用 HTTP 打开（见第 2 节）。

**Q：页面能打开，搜索一直说「尚未连接搜索服务」？**
A：这是**正确行为**。没有配置后端时不会伪造结果。要么点「先用示例专辑体验完整流程」，
要么按第 5 节接后端。

**Q：接后端时提示「无法连接，请检查网络、接口地址与跨域设置」？**
A：90% 是 CORS。按第 5.2 节实测 `OPTIONS` 响应头。

**Q：第一次搜索很久没反应？**
A：后端在加载约 4GB 的模型。`SeekSearch.setTimeout(120000)` 放宽上限。

**Q：候选封面是破图 / 没有粒子动画？**
A：封面跨域被拦。同源部署可解决；跨域时后端需要给 `/covers` 加 CORS 头。
前端会自动降级成淡入淡出，不影响搜索结果。

**Q：GitHub Pages 上能搜索吗？**
A：Pages 只能托管静态文件，跑不了 FastAPI。线上默认走示例演示（界面会明确标注），
想用真实检索需要把后端部署到别处再按第 5 节连上。

---

## 12. 版权与合规提醒

⚠️ **这一条请务必先看清楚再公开部署。**

原项目 [`docs/handoff.md`](https://github.com/Violet-Galaxy233/seek/blob/main/docs/handoff.md) 明确写着：

> 当前封面版权仅适合本地原型，公开展示方案未确定。
> 不把当前 `data/`、`models/` 或 `indexes/` 提交到公开 Git。

也就是说：

- **不要把 `data/`、`models/`、`indexes/` 推到公开仓库** —— 里面有第三方封面图与模型权重。
- **公开的 GitHub Pages 演示建议只跑「示例演示」模式** —— 封面由
  `js/scene/artwork-generator.js` 程序化生成，不涉及第三方版权。
- 真要公开展示真实封面，需要先确认**封面授权与下架方案**（原项目 P0 任务之一）。
- 后端 API 目前**没有公网鉴权、限流、匿名会话与反馈存储**，直接暴露公网有风险，
  上线前请至少加一层反向代理 + 访问控制。

---

## 致谢

- 后端与检索逻辑：[Violet-Galaxy233/seek](https://github.com/Violet-Galaxy233/seek)
- 代码规范参考：[doyoe/html-css-guide](https://github.com/doyoe/html-css-guide)
