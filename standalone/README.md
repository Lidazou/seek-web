# standalone/ · 单文件构建产物

本目录只包含**构建产物**，不包含源码。

## 产物说明

`seek-web.standalone.html` 将整个模块化前端内联为单个 HTML 文件：

- 页面结构（`index.html`）
- 9 个 CSS（`styles/*.css`）
- 19 个 ES Module（`js/**/*.js`）

| 适用 | 不适用 |
|---|---|
| 无需静态服务器直接打开（ES Modules 不通过 `file://` 协议加载，内联后不受此限制） | 直接编辑该文件 |
| 离线使用、分发、归档 | 作为源码提交修改 |
| 单文件传输 | 作为模块结构参考 |

## 源码与产物的关系

```text
源码（唯一维护对象）                          产物（自动生成）
index.html + styles/ + js/ + config/  →  standalone/seek-web.standalone.html
```

功能改动应落在源码，随后重新生成产物。

## 重新生成

```bash
node tools/build-standalone.mjs
```

打包流程：

1. 从 `js/main.js` 解析相对 `import`，拓扑排序
2. 剥离 `import` / `export` 语法，按依赖顺序拼接
3. 经 `vm.Script` 编译校验 —— 顶层命名冲突直接报错
4. 内联 CSS 与 JS，构建后自检（无残留外链、符号未被破坏）
5. 在产物头部插入「请勿直接修改」声明

## 与线上版本的关系

| 形态 | 入口 | 用途 |
|---|---|---|
| 模块化（源码） | 根目录 `index.html` | 开发、部署（GitHub Pages） |
| 单文件（产物） | `standalone/seek-web.standalone.html` | 查看、分发、归档 |

两者行为一致（产物由同一份源码打包），仅维护模块化版本。
