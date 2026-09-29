#!/usr/bin/env node
/*
 * 把模块化前端打包成「单文件 HTML」
 * ---------------------------------------------------------------------------
 * 产物：standalone/seek-web.standalone.html
 *
 * 它是什么：本仓库源码（index.html + styles/*.css + js/**.js）的构建产物，
 *          把 9 个 CSS 与 18 个 ES Module 内联进一个 HTML，
 *          可以双击直接打开（file:// 也能跑），也可以单独发给别人。
 *
 * 它不是什么：不是源码，不要直接编辑。改功能请改 js/ 与 styles/，
 *            然后重新运行本脚本。
 *
 * 用法：node tools/build-standalone.mjs
 *
 * 实现要点：
 *   1. 从 js/main.js 出发解析相对 import，得到依赖图并拓扑排序
 *   2. 剥掉 import/export 语法，按依赖顺序拼接
 *   3. 用「深度感知扫描」找出真正的顶层声明，重名直接报错
 *   4. 插入代码一律用「替换函数」而不是替换字符串
 *      —— String.replace 的替换串里 $$ / $& / $1 都是转义，会把代码改坏
 *   5. 构建后自检：确认没有残留 import/export、且代码里的 $$ 未被吞掉
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import vm from 'node:vm';
import { dirname, join, relative, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname ?? '.', '..');
const ENTRY = join(ROOT, 'js', 'main.js');
const OUT_DIR = join(ROOT, 'standalone');
const OUT_FILE = join(OUT_DIR, 'seek-web.standalone.html');

const rel = (file) => relative(ROOT, file).replace(/\\/g, '/');

/* ---------- 1. 依赖图 ---------- */

function parseImports(code) {
  const imports = [];
  const re = /^[ \t]*import\s+([^'";]+?)\s+from\s+['"]([^'"]+)['"];?[ \t]*$/gm;
  let match;
  while ((match = re.exec(code))) imports.push({ clause: match[1].trim(), spec: match[2] });
  return imports;
}

const modules = new Map();

async function walk(file) {
  if (modules.has(file)) return;
  const code = await readFile(file, 'utf8');
  const deps = [];
  for (const item of parseImports(code)) {
    if (!item.spec.startsWith('.')) {
      throw new Error(`${rel(file)} 引用了裸模块 "${item.spec}"，单文件版无法内联`);
    }
    if (/^[A-Za-z_$][\w$]*$/.test(item.clause)) {
      throw new Error(`${rel(file)} 使用了默认导入 "${item.clause}"，请改成具名导入`);
    }
    deps.push(resolve(dirname(file), item.spec));
  }
  modules.set(file, { code, deps });
  for (const dep of deps) await walk(dep);
}

function topoSort() {
  const sorted = [];
  const state = new Map();
  const visit = (file) => {
    if (state.get(file) === 1) return;
    if (state.get(file) === 0) throw new Error('检测到循环依赖：' + rel(file));
    state.set(file, 0);
    for (const dep of modules.get(file).deps) visit(dep);
    state.set(file, 1);
    sorted.push(file);
  };
  visit(ENTRY);
  return sorted;
}

/* ---------- 3. 剥离模块语法 ---------- */

function stripModuleSyntax(code) {
  return code
    .replace(/^[ \t]*import\s+[^'";]+?\s+from\s+['"][^'"]+['"];?[ \t]*$/gm, '')
    .replace(/^([ \t]*)export\s+default\s+/gm, '$1var __dropped_default__ = ')
    .replace(/^([ \t]*)export\s+/gm, '$1')
    .replace(/^[ \t]*export\s*\{[^}]*\};?[ \t]*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/* ---------- 4. 组装 ---------- */

async function build() {
  await walk(ENTRY);
  const order = topoSort();

  const bundle = order
    .map((file) => `/* ===== ${rel(file)} ===== */\n${stripModuleSyntax(modules.get(file).code)}`)
    .join('\n\n');

  /*
   * 冲突检测交给 JS 引擎本身：合并后如果出现同名顶层声明，
   * vm.Script 会直接抛 "Identifier 'x' has already been declared"。
   * 比手写扫描器可靠得多，也不会把函数内的局部变量误判成冲突。
   */
  try {
    new vm.Script(bundle, { filename: 'seek-web.bundle.js' });
  } catch (error) {
    throw new Error('合并后的代码无法编译（通常是顶层重名或语法问题）：\n  ' + error.message);
  }

  /* ---------- 内联 CSS 与 JS ---------- */
  let html = await readFile(join(ROOT, 'index.html'), 'utf8');

  const linkRe = /[ \t]*<link\s+rel="stylesheet"\s+href="\.\/styles\/([^"]+)"\s*>\s*\n?/g;
  const cssNames = [...html.matchAll(linkRe)].map((m) => m[1]);
  const cssChunks = [];
  for (const name of cssNames) {
    const css = await readFile(join(ROOT, 'styles', name), 'utf8');
    cssChunks.push(`/* ===== styles/${name} ===== */\n${css.trim()}`);
  }
  html = html.replace(linkRe, '');

  const entryRe = /[ \t]*<script\s+type="module"\s+src="\.\/js\/main\.js"\s*><\/script>/;
  if (!entryRe.test(html)) throw new Error('index.html 里找不到 module 入口');

  /*
   * 关键：全部用「替换函数」。如果直接把代码当替换字符串，
   * String.replace 会把 $$ 解释成一个 $，把代码改坏。
   */
  html = html.replace(entryRe, () => `<script>\n${bundle}\n</script>`);
  html = html.replace('</head>', () => `<style>\n${cssChunks.join('\n\n')}\n</style>\n</head>`);

  const banner = `<!--
  ============================================================================
  ⚠️  这是自动生成的文件，请勿直接修改！
  ----------------------------------------------------------------------------
  它是模块化源码的「单文件构建产物」：9 个 CSS 与 ${order.length} 个 ES Module 全部内联，
  好处是可以双击直接打开（file:// 也能跑），方便查看、分享、离线演示。

  源码在哪里（只维护这些）：
      index.html          页面结构
      styles/*.css        样式（9 个文件）
      js/**/*.js          逻辑（ES Module）
      config/             环境配置

  改了源码之后重新生成本文件：
      node tools/build-standalone.mjs

  仓库里同时存在两套东西是刻意的：
      · 根目录 index.html + styles/ + js/          → 正式源码，用于开发与部署
      · standalone/seek-web.standalone.html        → 构建产物，用于双击查看与分享
  两者行为一致，但只有源码需要维护。
  ============================================================================
-->
`;
  html = banner + html;

  /* ---------- 5. 构建后自检 ---------- */
  const scriptMatch = html.match(/<script>\r?\n([\s\S]*?)\r?\n<\/script>/);
  if (!scriptMatch) throw new Error('自检失败：找不到内联脚本');
  const inlined = scriptMatch[1];

  const problems = [];
  if (/^\s*import\s/m.test(inlined)) problems.push('仍残留 import 语句');
  if (/^\s*export\s/m.test(inlined)) problems.push('仍残留 export 语句');
  if (!inlined.includes('const $$ =')) problems.push('$$ 声明被破坏（替换串转义问题）');
  if (!inlined.includes('querySelectorAll')) problems.push('dom.js 内容不完整');
  if (!html.includes('createSearchApp')) problems.push('控制器未被打包');
  const scriptCount = (html.match(/<script>/g) || []).length;
  if (scriptCount !== 1) problems.push(`内联脚本块数量异常：${scriptCount}`);
  if (/<link rel="stylesheet"/.test(html)) problems.push('仍残留 CSS 外链');
  if (problems.length) throw new Error('自检未通过：\n  - ' + problems.join('\n  - '));

  if (!existsSync(OUT_DIR)) await mkdir(OUT_DIR, { recursive: true });
  await writeFile(OUT_FILE, html, 'utf8');

  console.log('单文件版已生成并通过自检');
  console.log('  输出   : ' + rel(OUT_FILE));
  console.log('  大小   : ' + (Buffer.byteLength(html, 'utf8') / 1024).toFixed(1) + ' KB');
  console.log('  模块数 : ' + order.length + ' 个 js（' + [...modules.keys()].length + ' 个文件入图）');
  console.log('  样式数 : ' + cssNames.length + ' 个 css');
  console.log('  编译校验: vm.Script 通过（无顶层重名）');
}

build().catch((error) => {
  console.error('打包失败：' + error.message);
  process.exit(1);
});
