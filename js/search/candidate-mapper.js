/*
 * Seek 前端 · 候选数据规范化
 * ---------------------------------------------------------------------------
 * 所有后端字段变化都必须经过这里，UI 不得直接依赖后端原始结构。
 *
 * 内部统一 DTO（见 README「Candidate DTO」一节）：
 *   { id, title, artist, year, genre, language, cover, matches, conflicts, tracks }
 * 其中 tracks === null 表示「尚未请求详情」，[] 表示「请求过但没有曲目」。
 *
 * TODO(第二阶段)：genre → genres[]、language → languages[]、
 *                  cover → { small, medium, original }。
 */
import { SearchFailure } from '../shared/errors.js';

function normalizeCandidate(v){if(!v||typeof v.id!=='string'||typeof v.title!=='string'||typeof v.cover!=='string')throw new SearchFailure('service','候选数据缺少 id、title 或 cover。');let url;try{url=new URL(v.cover,location.href);if(!['http:','https:','file:','data:','blob:'].includes(url.protocol)||url.protocol==='data:'&&!url.href.startsWith('data:image/'))throw 0}catch{throw new SearchFailure('service','封面地址格式不受支持。')}
 const list=a=>Array.isArray(a)?a.filter(x=>typeof x==='string').slice(0,2):[];
 return {id:v.id,title:v.title,artist:typeof v.artist==='string'?v.artist:'艺人信息未提供',cover:url.href,year:v.year==null?'':String(v.year),genre:Array.isArray(v.genre)?v.genre.join(' / '):String(v.genre||''),language:String(v.language||''),matches:list(v.matches),conflicts:list(v.conflicts),tracks:Array.isArray(v.tracks)?v.tracks.filter(t=>t&&typeof t.title==='string').map(t=>({id:String(t.id||t.title),title:t.title,duration:String(t.duration||'')})):null};
}
export { normalizeCandidate };
