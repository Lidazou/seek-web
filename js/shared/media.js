/*
 * Seek 前端 · 图片加载
 * ---------------------------------------------------------------------------
 * 所有封面加载都要走这里，统一处理：
 *   · 协议白名单（http / https / blob / data:image）
 *   · crossOrigin='anonymous'（跨域封面要能进 canvas 采样，否则 canvas 会被污染）
 *   · 超时
 *   · 加载失败（Live 模式下不允许用假封面顶替）
 *
 * 动画模块拿到图片后只负责采样；采样失败由调用方走 crossfade 降级。
 */
import { CoverLoadError, SearchFailure } from './errors.js';

const ALLOWED_PROTOCOLS = ['http:', 'https:', 'blob:', 'data:', 'file:'];

/* 校验封面地址；Live 模式建议 allowData=false，避免后端塞 data URI 顶替真封面 */
export function validateImageUrl(url, { allowData = true } = {}) {
  if (typeof url !== 'string' || !url.trim()) {
    throw new SearchFailure('service', '封面地址为空。');
  }
  let parsed;
  try {
    parsed = new URL(url, location.href);
  } catch {
    throw new SearchFailure('service', '封面地址格式不受支持。');
  }
  if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) {
    throw new SearchFailure('service', '封面地址协议不受支持。');
  }
  if (parsed.protocol === 'data:') {
    if (!allowData) throw new SearchFailure('service', '封面地址不受支持（不允许 data URI）。');
    if (!parsed.href.startsWith('data:image/')) {
      throw new SearchFailure('service', '封面地址不是图片。');
    }
  }
  return parsed.href;
}

/* 加载一张图片。cors=true 时设置 crossOrigin，供 canvas 像素采样使用。 */
export function loadImage(src, cors = true, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    if (cors && !src.startsWith('data:') && !src.startsWith('file:')) {
      image.crossOrigin = 'anonymous';
    }
    const timer = setTimeout(() => reject(new CoverLoadError('封面加载超时。')), timeoutMs);
    image.onload = () => { clearTimeout(timer); resolve(image); };
    image.onerror = () => { clearTimeout(timer); reject(new CoverLoadError('封面无法加载。')); };
    image.src = src;
  });
}

/* 尝试加载，永远不抛错：动画路径用它，失败就走降级 */
export async function tryLoadImage(src, cors = true) {
  try { return await loadImage(src, cors); } catch { return null; }
}

/* 预加载但不需要 Image 对象，用于「当前候选前后各一张」 */
export function preloadImage(src) {
  if (!src) return Promise.resolve(false);
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(true);
    image.onerror = () => resolve(false);
    image.src = src;
  });
}
