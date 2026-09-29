/*
 * 运行时导入校验：在 Node 里真正 import 每个模块（除 main.js），
 * 用最小桩替代浏览器全局，验证模块可加载、可实例化、导出可用。
 * 用法：node _import_test.mjs
 */
const stubEl = () => ({
  hidden: false, textContent: '', value: '', placeholder: '', disabled: false,
  style: {}, dataset: {}, classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
  setAttribute() {}, getAttribute: () => null, removeAttribute() {},
  addEventListener() {}, append() {}, replaceChildren() {}, querySelector: () => null,
  querySelectorAll: () => [], focus() {}, getBoundingClientRect: () => ({ left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 }),
  getContext: () => ({ fillRect() {}, clearRect() {}, createImageData: () => ({ data: new Uint8ClampedArray(4) }), putImageData() {}, drawImage() {}, getImageData: () => ({ data: new Uint8ClampedArray(4) }), save() {}, restore() {}, translate() {}, rotate() {}, scale() {} })
});

globalThis.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.sessionStorage = { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.location = { href: 'http://127.0.0.1:8899/' };
globalThis.innerWidth = 1440;
globalThis.innerHeight = 900;
globalThis.addEventListener = () => {};
globalThis.document = {
  getElementById: stubEl, querySelector: stubEl, querySelectorAll: () => [],
  createElement: stubEl, addEventListener() {}, body: stubEl(), documentElement: stubEl()
};
globalThis.window = globalThis;
globalThis.requestAnimationFrame = () => 0;
globalThis.Image = class { set src(_v) { setTimeout(() => this.onerror && this.onerror(), 0); } };
globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => ({ candidates: [] }) });

const modules = [
  '../config/seek-config.js',
  '../js/shared/dom.js', '../js/shared/errors.js', '../js/shared/media.js', '../js/shared/motion.js',
  '../js/demo/demo-data.js', '../js/demo/demo-provider.js',
  '../js/scene/artwork-generator.js', '../js/scene/deep-sky.js', '../js/scene/orbit-scene.js',
  '../js/library/cd-library.js',
  '../js/search/search-store.js', '../js/search/search-state.js', '../js/search/candidate-mapper.js',
  '../js/search/seek-api.js', '../js/search/particle-morph-engine.js',
  '../js/search/search-view.js', '../js/search/search-controller.js'
];

let failed = 0;
for (const spec of modules) {
  try {
    const mod = await import(spec);
    const names = Object.keys(mod);
    console.log(`OK   ${spec.padEnd(46)} exports: ${names.length ? names.join(',') : '(none)'}`);
  } catch (error) {
    failed++;
    console.log(`FAIL ${spec.padEnd(46)} ${error.message}`);
  }
}

/* 关键导出可用性 + 实例化冒烟测试 */
try {
  const { createSeekApi } = await import('../js/search/seek-api.js');
  const api = createSeekApi();
  const okAdapter = typeof api.request === 'function' && typeof api.timeout === 'number';
  console.log(`${okAdapter ? 'OK  ' : 'FAIL'} SearchAdapter 实例化 (timeout=${api.timeout})`);
  if (!okAdapter) failed++;

  const { SearchSessionStore } = await import('../js/search/search-store.js');
  const store = new SearchSessionStore();
  console.log(`${typeof store.current === 'function' ? 'OK  ' : 'FAIL'} SearchSessionStore.current() 可用`);

  const { ParticleMorphEngine } = await import('../js/search/particle-morph-engine.js');
  const engine = new ParticleMorphEngine(stubEl(), { limits: { desktopLimit: 100, mobileLimit: 50 } });
  console.log(`${engine.mode === 'idle' ? 'OK  ' : 'FAIL'} ParticleMorphEngine 可构造 (mode=${engine.mode}, limit=${engine.limit})`);

  const { createSearchView } = await import('../js/search/search-view.js');
  const view = createSearchView({ store });
  console.log(`${typeof view.showPanels === 'function' && typeof view.paintCandidate === 'function' ? 'OK  ' : 'FAIL'} createSearchView() 返回渲染方法`);

  const { createOrbitScene } = await import('../js/scene/orbit-scene.js');
  console.log(`OK   createOrbitScene 类型 = ${typeof createOrbitScene}`);

  const { createCdLibrary } = await import('../js/library/cd-library.js');
  const lib = createCdLibrary({ initialAlbums: [], onLibraryChange: () => {} });
  console.log(`${typeof lib.getAlbums === 'function' && typeof lib.reorder === 'function' ? 'OK  ' : 'FAIL'} createCdLibrary() API 完整`);
} catch (error) {
  failed++;
  console.log('FAIL 冒烟测试: ' + error.message);
}

console.log(failed ? `\n${failed} 个模块导入失败` : '\n✓ 全部模块可正常导入 / 实例化');
process.exit(failed ? 1 : 0);
