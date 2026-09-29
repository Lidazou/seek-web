/*
 * Seek 前端 · 动效参数与缓动
 * ---------------------------------------------------------------------------
 * 只放缓动函数与「减少动画」偏好判断。不放任何 DOM 操作。
 *
 * 命名对应关系（沿用了页面里原有的短名，避免大范围改动）：
 *   mix   → 线性插值
 *   clamp → 夹到 [0,1]
 *   smooth→ smoothstep
 *   cubic → 三次贝塞尔
 */

/* 用户在系统里开启「减少动态效果」时，所有大动画都要退化成淡入淡出 */
export const motion = matchMedia('(prefers-reduced-motion: reduce)');

/* 该走降级路径吗？粒子形变、持续漂浮都要先问它 */
export const prefersReducedMotion = () => motion.matches;

export const mix = (a, b, t) => a + (b - a) * t;

export const lerp = mix;

export const clamp = (v) => Math.max(0, Math.min(1, v));

export const sat = clamp;

export const smooth = (t) => t * t * (3 - 2 * t);

/* 三次贝塞尔：cubic(x1,y1,x2,y2,t) 与 CSS 同名曲线一致 */
export const cubic = (a, b, c, d, t) => {
  const u = 1 - t;
  return a * u * u * u + 3 * b * u * u * t + 3 * c * u * t * t + d * t * t * t;
};

/* 五次缓入缓出，粒子汇聚阶段使用 */
export const easeInOutQuint = (x) => x * x * x * (x * (x * 6 - 15) + 10);

/* 时长常量：业务/视觉动效统一引用这里，避免散落魔法数字 */
export const DURATION = {
  fast: 180,
  normal: 320,
  slow: 620,
  morph: 1150,
  crossfade: 220
};
