/*
 * Seek 前端 · 环境配置
 * ---------------------------------------------------------------------------
 * 所有环境差异集中在这里，业务代码不得写死域名或端口。
 *
 * environment        : 'development' | 'production'
 *                     决定是否显示「服务设置」等开发工具。
 * apiBase            : 后端 API 前缀。默认走同源 /api/v1，避免 CORS。
 *                     本地直连 FastAPI 时可临时改成 'http://127.0.0.1:8000'。
 * requestTimeoutMs   : 单次请求等待上限。真实检索首次要加载模型，建议放宽。
 * demoEnabled        : 是否允许用户主动进入「示例演示」。
 * enableServiceSettings : 是否显示手动填写接口地址的开发面板。
 * particle           : 粒子数量上限（桌面 / 移动）。
 * seekBackend.searchPath : 兼容旧版 seek 后端（无 /api/v1 前缀）时的路径。
 */
export const seekConfig = {
  environment: 'development',

  apiBase: '',

  requestTimeoutMs: 60000,

  demoEnabled: true,

  enableServiceSettings: true,

  particle: {
    desktopLimit: 52000,
    mobileLimit: 22000
  },

  /* 兼容 github.com/Violet-Galaxy233/seek 现有实现：
     它的 /search、/health、/covers 都挂在根路径，没有 /api/v1 前缀。 */
  seekBackend: {
    searchPath: '/search',
    healthPath: '/health',
    coversPath: '/covers'
  },

  /* 前端版本号，仅用于 SeekSearch.debug() 输出 */
  frontendVersion: '0.2.0-modular'
};

export default seekConfig;
