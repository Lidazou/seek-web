/*
 * Seek 前端 · 应用入口
 * ---------------------------------------------------------------------------
 * 只做「读取配置 → 装配模块 → 暴露调试接口」，不承担任何业务算法。
 *
 * 依赖方向（单向，禁止反向 import）：
 *   main → search-controller → search-view / search-store / seek-api / particles
 *        → scene / library / demo
 *        → shared
 *
 * 想改什么，先看这里：
 *   首页 3D 世界   → js/scene/orbit-scene.js
 *   深空与星尘     → js/scene/deep-sky.js
 *   唱片收藏       → js/library/cd-library.js
 *   搜索流程       → js/search/search-controller.js
 *   后端协议       → js/search/seek-api.js
 *   字段映射       → js/search/candidate-mapper.js
 *   粒子动画       → js/search/particle-morph-engine.js
 *   示例数据       → js/demo/
 *   接口地址/超时  → config/seek-config.js
 */
import { seekConfig } from '../config/seek-config.js';
import { el } from './shared/dom.js';
import { motion } from './shared/motion.js';
import { createDeepSky } from './scene/deep-sky.js';
import { createOrbitScene } from './scene/orbit-scene.js';
import { generateArtwork } from './scene/artwork-generator.js';
import { createCdLibrary } from './library/cd-library.js';
import { demoAlbums } from './demo/demo-data.js';
import { demoProvider } from './demo/demo-provider.js';
import { SearchSessionStore } from './search/search-store.js';
import { ParticleMorphEngine } from './search/particle-morph-engine.js';
import { createSeekApi } from './search/seek-api.js';
import { createSearchApp } from './search/search-controller.js';

/* ---------------------------------------------------------------------------
 * 1. 氛围层：深空画布 + 星尘（与搜索、唱片机无耦合）
 * ------------------------------------------------------------------------- */
const deepSky = createDeepSky();

/* ---------------------------------------------------------------------------
 * 2. 收藏层：演示唱片 + 用户收藏 + 手动新建，统一持久化
 *    候选不会自动进入这里，只有用户点「★ 收藏到唱片机」才会 addAlbum()
 * ------------------------------------------------------------------------- */
/* scene 在下一步创建；这里先声明，保证收藏变化回调始终可用 */
let scene = null;

const library = createCdLibrary({
  initialAlbums: demoAlbums.map((album, index) => ({
    id: `demo-${index}`,
    title: album.title,
    artist: album.artist,
    year: album.year,
    genre: album.genre,
    cover: album.cover,
    colors: album.colors,
    source: 'demo'
  })),
  storageKey: 'seek-collection-v1',
  onLibraryChange: (albums) => { if (scene) scene.setAlbums(albums); }
});

/* ---------------------------------------------------------------------------
 * 3. 场景层：3D 唱片机与环绕唱片
 *    搜索模块只允许通过 scene.setSearchActive() 影响场景，不得直接改内部 DOM
 * ------------------------------------------------------------------------- */
scene = createOrbitScene({
  root: document.querySelector('#albums'),
  initialAlbums: library.getAlbums(),
  generateArtwork,
  onSelect: () => {}
});

/* ---------------------------------------------------------------------------
 * 4. 搜索层：状态 / 通信 / 动画 / 视图 / 主控
 * ------------------------------------------------------------------------- */
const store = new SearchSessionStore();
const api = createSeekApi();
api.timeout = seekConfig.requestTimeoutMs;

const engine = new ParticleMorphEngine(el('search-particles'), {
  /* 引擎不认识视图：尺寸变化只通过回调通知外部重新排版记忆栏 */
  onResize: () => { window.dispatchEvent(new Event('seek:layout-memory')); },
  limits: seekConfig.particle
});

const app = createSearchApp({
  store,
  api,
  engine,
  library,
  scene,
  config: seekConfig,
  demoProvider
});

/* 引擎尺寸变化 → 让搜索视图重排记忆栏（保持单向依赖） */
window.addEventListener('seek:layout-memory', () => app.layoutMemory && app.layoutMemory());

/* ---------------------------------------------------------------------------
 * 5. 调试 / 对接 Facade：兼容旧的 window.SeekSearch
 *    生产环境不要把「随便改接口地址」当作主要功能
 * ------------------------------------------------------------------------- */
window.SeekSearch = Object.assign({}, app, {
  debug() {
    return {
      frontendVersion: seekConfig.frontendVersion,
      apiBase: api.endpoint || seekConfig.apiBase || '(same-origin /search)',
      backendState: store.backendStatus || 'unknown',
      sessionId: store.sessionId,
      capabilities: store.capabilities,
      demo: store.demo,
      businessState: store.state
    };
  }
});

/* 演示模式下不允许静默 fallback：这里只在用户主动调用 useDemo() 时生效 */
if (seekConfig.demoEnabled === false) {
  delete window.SeekSearch.useDemo;
}

/* 无障碍：尊重系统「减少动态效果」，动画降级但不影响搜索结果 */
motion.addEventListener('change', () => {
  if (motion.matches) engine.stop();
});

/* 首帧后补一次记忆栏排版（字体/布局稳定后计算更准） */
requestAnimationFrame(() => {
  if (app.layoutMemory) app.layoutMemory();
});
