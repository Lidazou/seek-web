/*
 * Seek 前端 · 状态定义（业务状态 / 视觉状态分离）
 * ---------------------------------------------------------------------------
 * 为什么分两层：
 *   业务状态回答「用户在流程的哪一步」，它**不能**依赖动画是否播完；
 *   视觉状态回答「粒子在做什么」，它可以失败、可以降级，且不影响业务。
 *
 * 正确顺序：
 *   候选已经存在 → 尝试 morph → 成功显示动画 / 失败直接 crossfade
 * 错误顺序：
 *   粒子 morph 成功 → 才认为候选存在
 *
 * 阶段说明：CSS 目前仍以 data-state="…" 的旧值作为层叠契约
 * （[data-state="MEMORY_DISSOLVE"] .composer 等），
 * 因此这里额外提供 LEGACY_* 映射，第二阶段统一次命名后再移除。
 */

/* 业务状态：用户可见的流程位置 */
export const BUSINESS_STATE = {
  IDLE: 'idle',                 // 尚未开始
  COMPOSING: 'composing',       // 正在写记忆
  SEARCHING: 'searching',       // 已提交，等待后端
  RESULTS: 'results',           // 有候选，可浏览
  ASKING: 'asking',             // 后端返回追问，等用户回答
  FOUND_ALBUM: 'found-album',   // 用户确认专辑
  FOUND_TRACK: 'found-track',   // 用户确认曲目
  NO_RESULT: 'no-result',       // 后端认为没有匹配
  ALL_REJECTED: 'all-rejected', // 本轮候选被用户全部排除（≠ 后端没有答案）
  ERROR: 'error'                // 失败
};

/* 视觉状态：粒子引擎在做什么，与业务成败无关 */
export const VISUAL_STATE = {
  STABLE: 'stable',
  DISSOLVING: 'dissolving',
  FLOATING: 'floating',
  ATTRACTING: 'attracting',
  MORPHING: 'morphing',
  CROSSFADING: 'crossfading'
};

/* CSS 当前使用的 data-state 值（层叠契约，勿轻易改动） */
export const LEGACY_STATE = {
  ORBIT: 'ORBIT',
  SEARCH_FOCUS: 'SEARCH_FOCUS',
  COMPOSING: 'COMPOSING',
  SEARCH_SUBMITTED: 'SEARCH_SUBMITTED',
  SEARCHING: 'SEARCHING',
  RERANKING: 'RERANKING',
  MEMORY_DISSOLVE: 'MEMORY_DISSOLVE',
  CANDIDATE_FORMING: 'CANDIDATE_FORMING',
  CANDIDATE_VIEW: 'CANDIDATE_VIEW',
  ASKING: 'ASKING',
  FOUND: 'FOUND',
  COMPLETED: 'COMPLETED',
  NO_RESULT: 'NO_RESULT',
  ERROR: 'ERROR'
};

/* 业务状态 → 旧 CSS 状态（第二阶段把 CSS 改成新名字后即可删除） */
export const BUSINESS_TO_LEGACY = {
  [BUSINESS_STATE.IDLE]: LEGACY_STATE.ORBIT,
  [BUSINESS_STATE.COMPOSING]: LEGACY_STATE.COMPOSING,
  [BUSINESS_STATE.SEARCHING]: LEGACY_STATE.SEARCHING,
  [BUSINESS_STATE.RESULTS]: LEGACY_STATE.CANDIDATE_VIEW,
  [BUSINESS_STATE.ASKING]: LEGACY_STATE.ASKING,
  [BUSINESS_STATE.FOUND_ALBUM]: LEGACY_STATE.FOUND,
  [BUSINESS_STATE.FOUND_TRACK]: LEGACY_STATE.COMPLETED,
  [BUSINESS_STATE.NO_RESULT]: LEGACY_STATE.NO_RESULT,
  [BUSINESS_STATE.ALL_REJECTED]: LEGACY_STATE.NO_RESULT,
  [BUSINESS_STATE.ERROR]: LEGACY_STATE.ERROR
};

/* 业务状态 → 应该显示哪个面板（搜索界面是单面板互斥结构） */
export const PANEL_FOR_STATE = {
  [BUSINESS_STATE.IDLE]: 'query-composer',
  [BUSINESS_STATE.COMPOSING]: 'query-composer',
  [BUSINESS_STATE.SEARCHING]: 'search-status',
  [BUSINESS_STATE.RESULTS]: 'candidate-viewer',
  [BUSINESS_STATE.ASKING]: 'question-card',
  [BUSINESS_STATE.FOUND_ALBUM]: 'candidate-viewer',
  [BUSINESS_STATE.FOUND_TRACK]: 'candidate-viewer',
  [BUSINESS_STATE.NO_RESULT]: 'empty-card',
  [BUSINESS_STATE.ALL_REJECTED]: 'empty-card',
  [BUSINESS_STATE.ERROR]: 'error-card'
};

/* 视觉状态是否属于「长时间粒子动画」——reduced-motion 时全部降级 */
export const HEAVY_VISUAL_STATES = [VISUAL_STATE.DISSOLVING, VISUAL_STATE.MORPHING, VISUAL_STATE.ATTRACTING];

/* 空结果区分的四种原因（禁止把「用户全排除了」当成「后端没有答案」） */
export const NO_RESULT_REASON = {
  NO_MATCH: 'NO_MATCH',
  ALL_REJECTED: 'ALL_REJECTED',
  LOW_CONFIDENCE: 'LOW_CONFIDENCE',
  EMPTY_RESPONSE: 'EMPTY_RESPONSE'
};

export const NO_RESULT_TEXT = {
  [NO_RESULT_REASON.NO_MATCH]: '不是你记错了，也可能是我们还没有收录。',
  [NO_RESULT_REASON.ALL_REJECTED]: '本轮候选都被你排除了。可以补充一点记忆，重新找找。',
  [NO_RESULT_REASON.LOW_CONFIDENCE]: '目前没有足够接近的候选，再补充一点细节会更准。',
  [NO_RESULT_REASON.EMPTY_RESPONSE]: '搜索服务这次没有返回候选，可以重试或补充记忆。'
};
