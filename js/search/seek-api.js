/*
 * Seek 前端 · 后端通信唯一入口
 * ---------------------------------------------------------------------------
 * 全站只有这个文件可以出现 fetch()。其它模块一律调用 seekApi.*。
 *
 * 适配 github.com/Violet-Galaxy233/seek（app/api.py v0.2.0）
 *   请求  POST /search
 *         { description: string(1..1000), answers: [{ question_id, value }] }
 *         value ∈ "yes" | "no" | "uncertain"
 *         后端 SearchRequest 是 extra="forbid"，多一个字段就 422，
 *         所以请求体只允许 description + answers 两个键。
 *   响应  { raw_query, normalized_query,
 *           candidates: [{ album:{id,title,artist,language,first_release_year},
 *                          release:{id,release_date,country},
 *                          cover:{id,image_uri}, score,
 *                          matching_clues:[], conflicting_clues:[] }],
 *           question: { id, text } | null }
 *   其它  GET /health、GET /covers/<file>
 *
 * 后端当前缺口（前端已优雅降级，不算 bug）：
 *   1. 没有曲目 / 详情接口 → getTracks() 直接返回 unsupported，不发请求
 *   2. AlbumResponse 没有 genre 字段 → 曲风一栏为空
 *   3. 真实 IndexedSearchService 尚未实现 answer reranking →
 *      capabilities.answerRerank=false 时禁止发送非空 answers
 *   4. 没有 reject / confirm / feedback 接口 → 对应方法按 capability 禁用
 *
 * TODO(第三阶段)：apiBase 走 config（默认同源 /api/v1），
 *                 目前为兼容现有 seek 后端仍调用根路径 /search。
 */
import { safeRead } from '../shared/dom.js';
import { SearchFailure } from '../shared/errors.js';
import { normalizeCandidate } from './candidate-mapper.js';

class SearchAdapter{
 constructor(){this.endpoint=safeRead('seek-endpoint');this.provider=null;this.base='';this.timeout=60000;if(this.endpoint){try{this.base=new URL(this.endpoint,location.href).origin}catch{this.base=''}}}
 async request(payload,signal){
  if(!this.provider&&!this.endpoint)throw new SearchFailure('unconnected','尚未连接搜索服务。你的记忆已保留，可以连接接口，或使用明确标注的示例演示。');
  let timer;const controller=new AbortController();const cancel=()=>controller.abort();signal.addEventListener('abort',cancel,{once:true});
  try{
   return await Promise.race([
    (async()=>{let data;
     if(this.provider)data=await this.provider(payload,{signal:controller.signal});
     else{let response;try{response=await fetch(this.endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:controller.signal})}catch(e){if(controller.signal.aborted)throw e;throw new SearchFailure('network','无法连接搜索服务，请检查网络、接口地址与跨域设置。')}
      if(!response.ok)throw new SearchFailure(response.status>=500?'service':'request',`搜索服务返回错误（${response.status}），这不代表没有匹配的音乐。`);
      try{data=await response.json()}catch{throw new SearchFailure('service','搜索服务返回的数据无法读取，请检查接口响应。')}
     }
     if(data?.error)throw new SearchFailure(data.error.type||'model',data.error.message||'搜索模型暂时无法完成检索，请稍后重试。');
     /* 兼容 seek 的嵌套结构：只要候选里带 album 字段就按 seek 协议解析 */
     if(Array.isArray(data?.candidates)&&data.candidates.some(c=>c&&c.album)){
      if(payload.operation==='details')return {candidate:null};
      return mapSeekResponse(data,this.base||new URL(this.endpoint||location.href,location.href).origin)
     }
     if(payload.operation==='details'){if(!data?.candidate)throw new SearchFailure('service','接口未返回专辑详情。');return {...data,candidate:normalizeCandidate(data.candidate)}}
     if(!data||!Array.isArray(data.candidates))throw new SearchFailure('service','接口未返回有效的候选集合。');
     /* 单条脏数据不应该让整轮结果失败：逐条容错，全部无效才报错 */
     const seen=new Set(),clean=[];
     for(const row of data.candidates){try{const c=normalizeCandidate(row);if(c&&!seen.has(c.id)){seen.add(c.id);clean.push(c)}}catch{}}
     if(!clean.length)throw new SearchFailure('service','接口返回的候选无法识别（每条都需要 id / title / cover）。');
     return {...data,candidates:clean};
    })(),
    new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new SearchFailure('timeout','搜索等待超时。记忆已保留，可以重试。'))},this.timeout);signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true})})
   ]);
  }finally{clearTimeout(timer);signal.removeEventListener('abort',cancel)}
 }
}

function mapSeekResponse(data, base) {
  const rows = Array.isArray(data && data.candidates) ? data.candidates : [];
  const candidates = [];
  const seen = new Set();
  for (const row of rows) {
    const album = (row && row.album) || {};
    const cover = (row && row.cover) || {};
    const raw = typeof cover.image_uri === 'string' ? cover.image_uri.trim() : '';
    let image = '';
    if (raw) {
      try { image = new URL(raw, base + '/').href; } catch { image = ''; }
    }
    const id = String(album.id || cover.id || '');
    const title = String(album.title || '');
    /* 缺 id / 标题 / 封面的候选直接丢掉，避免一张脏数据拖垮整轮结果 */
    if (!id || !title || !image) continue;
    /* 同一张专辑只保留一次，避免封面网格里出现重复条目 */
    if (seen.has(id)) continue;
    seen.add(id);
    candidates.push({
      id: id,
      title: title,
      artist: String(album.artist || ''),
      cover: image,
      year: album.first_release_year == null ? '' : String(album.first_release_year),
      genre: '',                                  /* 见上方「后端当前缺口」第 2 条 */
      language: String(album.language || ''),
      matches: Array.isArray(row.matching_clues) ? row.matching_clues : [],
      conflicts: Array.isArray(row.conflicting_clues) ? row.conflicting_clues : [],
      tracks: []                                  /* 见上方「后端当前缺口」第 1 条 */
    });
  }
  const question = data && data.question && typeof data.question.text === 'string'
    ? { id: String(data.question.id || ''), text: data.question.text }
    : null;
  return { sessionId: data && data.sessionId ? data.sessionId : null, question: question, candidates: candidates };
}

async function pingSeekService(base) {
  const response = await fetch(base + '/health', { method: 'GET' });
  if (!response.ok) throw new SearchFailure('service', '搜索服务 /health 返回 ' + response.status + '。');
  return response.json();
}

function seekProvider(baseUrl) {
  const base = new URL(baseUrl, location.href).href.replace(/\/+$/, '');
  return async function (payload, { signal }) {
    /* 详情接口后端尚未提供：直接返回空，省掉一次白跑的完整检索 */
    if (payload.operation === 'details') return { candidate: null };
    const description = [payload.query, ...payload.memories].filter(Boolean).join('\n').slice(0, 1000);
    if (!description) throw new SearchFailure('request', '请先写一句你记得的描述。');
    const answers = (payload.answers || []).map(function (answer) {
      return {
        question_id: answer.questionId,
        value: (answer.value === 'yes' || answer.value === 'no') ? answer.value : 'uncertain'
      };
    });
    const response = await fetch(base + '/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: description, answers: answers }),
      signal: signal
    });
    if (!response.ok) {
      let detail = '';
      try { detail = (await response.json()).detail || ''; } catch {}
      throw new SearchFailure(response.status >= 500 ? 'service' : 'request',
        detail || '搜索服务返回错误（' + response.status + '）。');
    }
    const data = await response.json();
    if (data && data.error) {
      throw new SearchFailure(data.error.type || 'model',
        data.error.message || '搜索模型暂时无法完成检索，请稍后重试。');
    }
    if (!data || !Array.isArray(data.candidates)) {
      throw new SearchFailure('service', '接口未返回候选集合。');
    }
    return mapSeekResponse(data, base);
  };
}

/* 工厂：控制器通过它拿到唯一的后端通信对象 */
export function createSeekApi() {
  return new SearchAdapter();
}

export { SearchAdapter, mapSeekResponse, pingSeekService, seekProvider };
