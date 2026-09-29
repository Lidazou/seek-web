/*
 * Seek 前端 · DOM 小工具
 * ---------------------------------------------------------------------------
 * 只放真正跨模块复用的 DOM / 存储访问函数。
 * 不要往这里继续塞业务逻辑（业务逻辑请放到所属领域模块）。
 */

/* 按 CSS 选择器取第一个元素 */
export const $ = (selector) => document.querySelector(selector);

/* 按 id 取元素 —— 页面里绝大多数 JS 钩子用 id */
export const el = (id) => document.getElementById(id);

/* 按选择器取全部元素（返回真数组，方便直接 forEach / map） */
export const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

/* Promise 版延时，配合 async/await 使用 */
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/* localStorage 读取：隐私模式 / 禁用存储时不抛错 */
export const safeRead = (key, backup = '') => {
  try { return localStorage.getItem(key) || backup; } catch { return backup; }
};

/* localStorage 写入：失败静默（不影响主流程） */
export const safeWrite = (key, value) => {
  try { localStorage.setItem(key, value); } catch {}
};

/* sessionStorage 读写，同样容错 */
export const safeSessionRead = (key, backup = null) => {
  try { return sessionStorage.getItem(key) || backup; } catch { return backup; }
};

export const safeSessionWrite = (key, value) => {
  try { sessionStorage.setItem(key, value); } catch {}
};

/* 显示 / 隐藏一组面板：只有列在 ids 里的面板可见 */
export const showOnlyPanels = (allIds, visibleIds) => {
  for (const id of allIds) {
    const node = el(id);
    if (node) node.hidden = !visibleIds.includes(id);
  }
};

/* 无副作用地设置文本（顺带防住 null 节点） */
export const setText = (id, text) => {
  const node = el(id);
  if (node) node.textContent = text;
};
