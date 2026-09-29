/*
 * Seek 前端 · 搜索会话状态
 * ---------------------------------------------------------------------------
 * 只保存「数据状态」，绝不保存动画状态（动画由 particle-morph-engine 自己管）。
 * 一次搜索会话拥有自己的记忆：关闭搜索时 forgetMemory() 会清空。
 *
 * 关键字段：
 *   query        最初提交的记忆
 *   memories     后来补充的记忆（与 query 分开保存，便于后端结构化）
 *   answers      追问答案 [{ questionId, value }]，value ∈ yes|no|uncertain
 *   excluded     本轮前端排除的候选 id（后端不支持 rejection 时仅本地生效）
 *   candidates   后端返回并映射后的候选数组
 *   index        当前正在看的候选下标
 *   question     后端返回的追问（后端没有就是 null，前端不得伪造）
 *   sessionId    后端会话 id（后端未启用 session 时为 null）
 *   state        业务状态机（见 search-state.js）
 *   demo         是否处于「示例演示」模式（true 时严禁当作真实结果）
 */
class SearchSessionStore{
 constructor(){this.query='';this.memories=[];this.answers=[];this.excluded=new Set();this.candidates=[];this.index=0;this.question=null;this.sessionId=null;this.state='ORBIT';this.demo=false;this.albumId=null;try{const v=JSON.parse(sessionStorage.getItem('seek-memory')||'null');if(v){this.query=String(v.query||'');this.memories=Array.isArray(v.memories)?v.memories:[]}}catch{}}
 save(){try{sessionStorage.setItem('seek-memory',JSON.stringify({query:this.query,memories:this.memories}))}catch{}}
 payload(operation){return {operation,query:this.query,memories:this.memories.slice(),answers:this.answers.slice(),excludedIds:[...this.excluded],sessionId:this.sessionId,albumId:this.albumId}}
 current(){return this.candidates[this.index]||null}
}
export { SearchSessionStore };
