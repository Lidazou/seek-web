/*
 * Seek 前端 · 搜索主控（唯一的流程协调层）
 * ---------------------------------------------------------------------------
 * 数据流：
 *   用户事件 → Store → seek-api → candidate-mapper → Store → 粒子引擎 → View
 *
 * 职责：打开/关闭搜索、提交记忆、补充记忆、追问、排除、收藏、确认；
 *       业务状态机；请求取消与竞态（只有最新 token 能改 Store）。
 * 禁止：直接 fetch、直接操作 CD 编辑器 DOM、自己计算相似度。
 *
 * 依赖方向：controller → view / store / api / engine，绝不反向。
 */
import { $, el, sleep } from '../shared/dom.js';
import { motion } from '../shared/motion.js';
import { SearchFailure } from '../shared/errors.js';
import { loadImage } from '../shared/media.js';
import { createSearchView } from './search-view.js';
import { seekProvider, pingSeekService } from './seek-api.js';
import { BUSINESS_TO_LEGACY, PANEL_FOR_STATE, BUSINESS_STATE } from './search-state.js';

export function createSearchApp({ store, api, engine, library, scene, config, demoProvider: injectedDemo }) {
  const demoProviderRef = injectedDemo;
  /* 会话级可变状态：只在这里维护，视图与引擎都不持有 */
  let requestId = 0, visualId = 0, controller = null, lastOperation = 'search';
  let isOpen = false, overview = false, detailsBusy = false;

  const overlay = el('search-overlay');
  const trigger = $('.neon-body');
  const view = createSearchView({
    store,
    onPickTrack: (title) => finish(title)
  });

  /* SearchSessionStore, transport and presentation deliberately have separate responsibilities. */
  
  // ============================================================================
  // 搜索 · 会话状态
  // ============================================================================
  
  // ============================================================================
  // 搜索 · 错误类型
  // ============================================================================
  
  // ============================================================================
  // 搜索 · 网络适配（demo / 自定义接口 / Seek 后端）
  // ============================================================================
  
  // ============================================================================
  // 搜索 · 候选数据规范化
  // ============================================================================
  
  trigger.setAttribute('role','button');trigger.setAttribute('tabindex','0');trigger.setAttribute('aria-label','SEEK：从记忆寻找音乐');trigger.setAttribute('aria-haspopup','dialog');trigger.setAttribute('aria-expanded','false');$('.neon').removeAttribute('aria-hidden');
  
  function setState(state){store.state=state;overlay.dataset.state=state;document.body.dataset.seekState=state;try{scene.setSearchActive(isOpen)}catch{}overlay.setAttribute('aria-busy',String(['SEARCHING','RERANKING'].includes(state)));el('search-bottom').hidden=!store.query||['SEARCH_FOCUS','COMPOSING','MEMORY_DISSOLVE'].includes(state);el('add-memory').disabled=['MEMORY_DISSOLVE','SEARCHING','RERANKING'].includes(state);el('supplement-input').disabled=el('add-memory').disabled;el('supplement-form').querySelector('button').disabled=el('add-memory').disabled;updateMemory();}
  /* The remembered line never crosses the previous-cover button: the column is
     measured against that button, and the text breaks after commas so every line
     stays flush left inside it. */
  
  // ============================================================================
  // 搜索 · 记忆栏渲染
  // ============================================================================
  function updateMemory(){view.renderMemoryDraft();el('memory-anchor').hidden=false;el('memory-count').textContent=store.memories.length?`补充记忆 · ${store.memories.length}` : '';view.renderMemoryNotes();el('service-button').textContent=store.demo?'示例演示 · 非真实搜索':api.endpoint||api.provider?'搜索服务已连接':'连接搜索服务';store.save()}
  /* Memory 栏必须实时镜像输入框：view.memoryDraft() 取「当前正在键入的草稿」，
     而不是已提交的 store.query —— 这样边打字边同步，清空输入框也会回到占位文案。 */
  
  /* A search session owns its memories: leaving the search forgets them. */
  function forgetMemory(){store.query='';store.memories=[];store.answers=[];store.excluded.clear();store.candidates=[];store.index=0;store.question=null;store.sessionId=null;store.albumId=null;const q=el('query-input');if(q)q.value='';const s=el('supplement-input');if(s)s.value='';updateMemory()}
  function cancelRequest(){requestId++;controller?.abort();controller=null;visualId++;engine.cancel()}
  function open(){if(isOpen)return;isOpen=true;try{scene.clear()}catch{}try{scene.setSearchActive(true)}catch{}overlay.hidden=false;document.body.classList.add('search-active');$('.viewport').inert=true;trigger.setAttribute('aria-expanded','true');el('query-input').value=store.query;document.body.classList.remove('sign-lit');setTimeout(()=>{if(isOpen)document.body.classList.add('sign-lit')},540);edit();view.renderMemoryDraft();}
  function close(){cancelRequest();engine.stop();isOpen=false;try{scene.setSearchActive(false)}catch{}document.body.classList.remove('search-active');document.body.classList.remove('memory-compose');document.body.classList.remove('sign-lit');document.body.classList.remove('overview-open');overlay.hidden=true;$('.viewport').inert=false;trigger.setAttribute('aria-expanded','false');forgetMemory();setState('ORBIT');trigger.focus({preventScroll:true})}
  function edit(){cancelRequest();engine.stop();overview=false;el('service-settings').hidden=true;el('supplement-form').hidden=true;el('query-input').disabled=false;el('submit-search').disabled=false;el('query-input').value=store.query;setState('SEARCH_FOCUS');view.showPanels('query-composer');el('composer-notice').textContent=store.demo?'当前为交互演示：候选均为示例专辑，不会进行真实检索。':'';setTimeout(()=>el('query-input').focus(),80)}
  async function submit(event){event?.preventDefault();if(el('submit-search').disabled)return;let query=el('query-input').value.trim();if(!query){el('composer-notice').textContent='写一句你记得的，或点下面的示例试试。';el('query-input').focus();return}if(query!==store.query){store.memories=[];store.answers=[];store.excluded.clear();store.sessionId=null;store.albumId=null}store.query=query;el('submit-search').disabled=true;el('query-input').disabled=true;setState('SEARCH_SUBMITTED');el('query-composer').classList.add('jitter');setTimeout(()=>el('query-composer').classList.remove('jitter'),240);await run('search',query)}
  
  // ============================================================================
  // 搜索 · 主流程（发起检索 → 分发结果）
  // ============================================================================
  async function run(operation,particleText=''){
   cancelRequest();const id=requestId,oldTop=store.current()?.id;controller=new AbortController();lastOperation=operation;el('supplement-form').hidden=true;el('session-notice').textContent='';el('candidate-cover').classList.remove('ready');el('cover-slot').classList.remove('ready');setState(particleText?'MEMORY_DISSOLVE':operation==='search'?'SEARCHING':'RERANKING');
   const pending=api.request(store.payload(operation),controller.signal).then(value=>({value}),error=>({error}));
   if(particleText){const box=el('query-composer').hidden?{left:innerWidth*.25,top:innerHeight*.55,width:innerWidth*.5}:el('query-input').getBoundingClientRect(),cs=el('query-composer').hidden?null:getComputedStyle(el('query-input'));await engine.dissolve(particleText,box,cs?{size:parseFloat(cs.fontSize)||20,line:parseFloat(cs.lineHeight)||30,pad:parseFloat(cs.paddingTop)||0,color:cs.color,family:cs.fontFamily}:{size:22,color:'#f6d3a0'});if(id!==requestId)return}
   view.showPanels('search-status');setState(operation==='search'?'SEARCHING':'RERANKING');el('status-title').textContent=operation==='search'?'正在从这些记忆里寻找……':'重新理解你的记忆……';el('status-detail').textContent=store.demo?'示例演示正在返回预设数据，不代表真实检索。':'';engine.float();
   const result=await pending;if(id!==requestId||!isOpen)return;
   if(result.error){if(result.error.name!=='AbortError')showError(result.error);return}
   const data=result.value;store.sessionId=data.sessionId||store.sessionId;store.question=data.question&&typeof data.question.text==='string'?{id:String(data.question.id||''),text:data.question.text}:null;
   store.candidates=data.candidates.filter(c=>!store.excluded.has(c.id));store.index=0;store.save();
   if(!store.candidates.length){empty();return}
   if(operation!=='search'&&oldTop===store.candidates[0].id)el('session-notice').textContent='它依然是目前最接近的结果。';
   engine.attract(motion.matches?0:540);
   el('status-title').textContent='最像你记忆里的，可能是：';el('status-detail').textContent='';await sleep(motion.matches?80:460);if(id!==requestId)return;showCandidate(0,true)
  }
  function showError(error){engine.fade(620);view.showPanels('error-card');setState('ERROR');const names={unconnected:'搜索服务尚未连接',network:'连接暂时中断',timeout:'搜索等待超时',model:'模型暂时无法完成搜索',request:'搜索请求未被接受',service:'搜索服务暂时不可用'};el('error-title').textContent=names[error.kind]||'暂时无法完成搜索';el('error-message').textContent=error.message||'技术故障不代表没有匹配的音乐。你的描述已保留。';el('retry-search').hidden=error.kind==='unconnected';view.announce(el('error-title').textContent)}
  function empty(){view.showPanels('empty-card');setState('NO_RESULT');view.announce('这些记忆还没有拼出答案。');const id=++visualId;if(motion.matches){engine.stop();return}const targets=[];for(let i=0;i<360;i++){const side=Math.floor(i/90),t=(i%90)/90;let x=side===0?t:side===1?1:side===2?1-t:0,y=side===0?0:side===1?t:side===2?1:1-t;targets.push({x:innerWidth/2+(x-.5)*180+(Math.random()-.5)*18,y:innerHeight*.45+(y-.5)*180+(Math.random()-.5)*18,color:'#dac9ab',size:1.5,alpha:.1})}engine.morph(targets,600,100).then(()=>{if(id===visualId&&store.state==='NO_RESULT')engine.float()})}
  
  function loadImage(src,cors=true){return new Promise((resolve,reject)=>{const image=new Image();if(cors&&!src.startsWith('data:')&&!src.startsWith('file:'))image.crossOrigin='anonymous';const timer=setTimeout(()=>reject(new Error('封面加载超时')),10000);image.onload=()=>{clearTimeout(timer);resolve(image)};image.onerror=()=>{clearTimeout(timer);reject(new Error('封面无法加载'))};image.src=src})}
  
  // ============================================================================
  // 搜索 · 候选展示与粒子→封面手交
  // ============================================================================
  async function showCandidate(index,first=false){if(!store.candidates.length){empty();return}const id=++visualId;engine.cancel();store.index=(index+store.candidates.length)%store.candidates.length;const c=store.current();overview=false;view.showPanels('candidate-viewer');setState('CANDIDATE_FORMING');view.layoutMemory();view.paintCandidate(c);refreshFavorite(c);if(first){el('candidate-viewer').tabIndex=-1;el('candidate-viewer').focus({preventScroll:true})}el('cover-error').hidden=true;const cover=el('candidate-cover');let image,targets;
   try{image=await loadImage(c.cover);if(id!==visualId)return;try{targets=engine.sample(image,el('cover-slot').getBoundingClientRect())}catch{targets=null}}
   catch{try{image=await loadImage(c.cover,false)}catch{if(id!==visualId)return;el('cover-error').hidden=false;engine.stop();setState('CANDIDATE_VIEW');return}}
   if(id!==visualId||!isOpen)return;let done=true;
   if(targets?.length){
    if(cover.classList.contains('ready')&&cover.complete&&cover.naturalWidth){try{engine.capture(cover,el('cover-slot').getBoundingClientRect())}catch{}}
    cover.classList.add('particle-handoff');cover.classList.remove('ready');el('cover-slot').classList.remove('ready');
    done=await engine.morph(targets,1150,110,first);
   }else{cover.classList.remove('ready');el('cover-slot').classList.remove('ready');engine.stop();await sleep(180)}
   if(!done||id!==visualId||!isOpen)return;cover.classList.remove('particle-handoff');cover.alt=`${c.title} — ${c.artist} 专辑封面`;cover.src=c.cover;await cover.decode().catch(()=>{});if(id!==visualId||!isOpen)return;cover.classList.add('ready');el('cover-slot').classList.add('ready');setState('CANDIDATE_VIEW');view.announce(`${c.title}，${c.artist}，第 ${store.index+1} 张，共 ${store.candidates.length} 张`);await sleep(210);if(id===visualId)engine.fade(320)
  }
  function next(dir){if(!['CANDIDATE_VIEW','CANDIDATE_FORMING'].includes(store.state)||overview)return;showCandidate(store.index+dir)}
  function reject(){if(!store.current())return;store.excluded.add(store.current().id);store.candidates.splice(store.index,1);if(store.candidates.length)showCandidate(Math.min(store.index,store.candidates.length-1));else ask()}
  function ask(){visualId++;engine.float();setState('ASKING');view.showPanels('question-card');el('question-text').textContent=store.question?.text||'再告诉我一个你记得的细节。';el('question-note').textContent=store.question?'不确定也没关系，我们会保留这份不确定。':'封面、声音、听到它的地方，都可以。';el('question-choices').hidden=!store.question;if(!store.question)addMemory();view.announce(el('question-text').textContent)}
  function addMemory(){el('supplement-form').hidden=false;el('supplement-input').disabled=false;document.body.classList.add('memory-compose');setTimeout(()=>el('supplement-input').focus(),50)}
  function overviewShow(){visualId++;engine.stop();overview=true;view.showPanels('candidate-overview');setState('CANDIDATE_VIEW');el('overview-grid').replaceChildren();store.candidates.forEach((c,i)=>{const b=document.createElement('button'),img=document.createElement('img'),name=document.createElement('strong'),artist=document.createElement('small');img.src=c.cover;img.alt=c.title;img.loading='lazy';name.textContent=c.title;artist.textContent=c.artist;b.append(img,name,artist);b.onclick=()=>showCandidate(i);el('overview-grid').append(b)})}
  
  async function found(){visualId++;engine.float();const c=store.current();if(!c)return;store.albumId=c.id;setState('FOUND');el('candidate-cover').src=c.cover;el('candidate-cover').classList.add('ready');el('cover-slot').classList.add('ready');el('candidate-actions').hidden=el('candidate-position').hidden=true;el('previous-candidate').hidden=el('next-candidate').hidden=true;el('found-details').hidden=false;el('candidate-reasons').replaceChildren();view.renderTracks(c);
   if(c.tracks===null){detailsBusy=true;const id=++requestId;controller?.abort();controller=new AbortController();el('track-notice').textContent='正在读取曲目……';try{const data=await api.request(store.payload('details'),controller.signal);if(id!==requestId)return;if(!data.candidate){view.renderTracks(c);return}if(data.candidate.id!==c.id)throw new SearchFailure('service','详情与当前专辑不一致。');Object.assign(c,data.candidate);view.renderTracks(c)}catch(e){if(id===requestId&&e.name!=='AbortError')el('track-notice').textContent='曲目暂时无法读取。专辑信息和你的记忆已保留，可返回候选后重试。'}finally{detailsBusy=false}}
  }
  function finish(title=''){setState('COMPLETED');engine.stop();el('track-notice').textContent=title?`找到了：${title}`:'找到了。让这段记忆重新播放。';el('found-details').querySelector('.state-actions').hidden=true;view.announce(el('track-notice').textContent)}
  function settings(){el('endpoint-input').value=api.endpoint;el('service-settings').hidden=false;el('service-notice').textContent='';setTimeout(()=>el('endpoint-input').focus(),50)}
  function setDemo(){cancelRequest();store.demo=true;api.provider=demoProviderRef;store.query='封面偏蓝绿色，像夜里漂浮的光。';store.memories=[];store.answers=[];store.excluded.clear();store.sessionId=null;store.albumId=null;el('query-input').value=store.query;edit();el('composer-notice').textContent='示例演示已开启。点击「开始寻找」，体验完整交互；这些不是实际搜索结果。'}
  // Explicit opt-in fixture provider. Never used by normal requests or production adapters.
  
  trigger.addEventListener('click',open);trigger.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open()}});el('orbit-search').onclick=open;el('close-search').onclick=close;el('edit-memory').onclick=edit;el('query-composer').onsubmit=submit;el('query-input').addEventListener('input',()=>{if(store.state==='SEARCH_FOCUS')setState('COMPOSING');view.renderMemoryDraft()});
  /* 示例提示：点一下就自动录入并立即开始寻找。
     若当前没有连接任何搜索服务，自动切到明确标注的演示数据，保证「一键可用」。 */
  function useExample(text){if(!text)return;const input=el('query-input');if(!api.endpoint&&!api.provider){store.demo=true;api.provider=demoProviderRef}input.disabled=false;el('submit-search').disabled=false;input.value=text;view.renderMemoryDraft();el('composer-notice').textContent='';submit()}
  /* 示例库：这是全站唯一的示例来源 —— 输入框的 placeholder 与下方轮播按钮共用它，
     避免两处各自轮播、文字对不上。要改示例，只改这个数组。 */
  const EXAMPLE_HINTS=[
   '日语歌，封面好像有很多黑色的鞋',
   '封面偏蓝绿色，像夜里漂浮的光。',
   '封面可能是红色，但我不太确定',
   '在动画里听过，好像是摇滚',
   '女声，应该是十年前左右听到的',
   '副歌有一段弦乐，好像是二〇一九年前后听到的'
  ];
  let exampleIndex=0,exampleTimer=null;
  function currentExample(){return EXAMPLE_HINTS[exampleIndex%EXAMPLE_HINTS.length]}
  /* 同步两处显示：搜索框内的 placeholder + 可点击的轮播按钮 */
  function renderExampleHint(){const hint=currentExample(),node=el('example-roller-text'),input=el('query-input');if(node)node.textContent=hint;if(input&&!input.value)input.placeholder=hint}
  function startExampleRoller(){if(exampleTimer||motion.matches)return;exampleTimer=setInterval(()=>{const node=el('example-roller-text');if(!node)return;node.classList.add('is-rolling');setTimeout(()=>{exampleIndex++;renderExampleHint();node.classList.remove('is-rolling')},340)},3400)}
  renderExampleHint();startExampleRoller();
  el('example-roller').addEventListener('click',()=>useExample(currentExample()));el('query-input').addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter')submit(e)});
  el('previous-candidate').onclick=()=>next(-1);el('next-candidate').onclick=()=>next(1);el('reject-candidate').onclick=reject;el('reject-all').onclick=ask;el('accept-candidate').onclick=()=>{el('found-details').querySelector('.state-actions').hidden=false;found()};el('show-overview').onclick=overviewShow;el('close-overview').onclick=()=>showCandidate(store.index);el('add-memory').onclick=addMemory;el('empty-add').onclick=addMemory;el('rewrite-query').onclick=edit;el('error-edit').onclick=edit;el('relax-query').onclick=()=>run('relax');el('retry-search').onclick=()=>run(lastOperation);el('found-song').onclick=()=>finish();el('album-only').onclick=()=>{el('session-notice').textContent='已保留这张专辑。再补充一点歌曲的记忆。';addMemory()};el('back-candidates').onclick=()=>{cancelRequest();showCandidate(store.index)};
  /* Library: one-click favourite + custom entry. */
  function refreshFavorite(c){const a=el('favorite-candidate'),b=el('favorite-found');const fav=c?library.has(c.id):false;if(a){a.textContent=fav?'★ 已收藏':'★ 收藏';a.disabled=fav;a.classList.toggle('saved',fav)}if(b){b.textContent=fav?'★ 已收藏':'★ 收藏到唱片机';b.disabled=fav;b.classList.toggle('saved',fav)}}
  function favoriteCurrent(){const c=store.current();if(!c)return;if(library.has(c.id)){library.remove(c.id);el('session-notice').textContent='已从主页唱片机移除。';refreshFavorite(c);return}if(library.addFavorite(c)){el('session-notice').textContent='已收藏到主页唱片机，返回首页即可看到。';refreshFavorite(c)}}
  el('favorite-candidate').onclick=favoriteCurrent;
  el('favorite-found').onclick=favoriteCurrent;
  
  // ============================================================================
  // 编辑 CD 集 · 拖拽排序 / 详情弹窗
  // ============================================================================
  
  
  el('supplement-form').onsubmit=e=>{e.preventDefault();if(el('supplement-input').disabled)return;let text=el('supplement-input').value.trim();if(!text)return;store.memories.push(text);store.save();el('supplement-input').value='';el('session-notice').textContent='加入新的记忆';document.body.classList.remove('memory-compose');run('rerank',text)};
  el('question-choices').onclick=e=>{let value=e.target.dataset.answer;if(!value||store.state!=='ASKING')return;store.answers.push({questionId:store.question.id,value});run('answer',e.target.textContent)};
  ['service-button','error-service'].forEach(id=>el(id).onclick=settings);el('close-settings').onclick=()=>{el('service-settings').hidden=true;el('service-button').focus()};el('service-settings').onsubmit=e=>{e.preventDefault();try{const u=new URL(el('endpoint-input').value);if(!['http:','https:'].includes(u.protocol))throw 0;api.endpoint=u.href;api.provider=null;store.demo=false;try{localStorage.setItem('seek-endpoint',u.href)}catch{}el('service-settings').hidden=true;updateMemory();edit();el('composer-notice').textContent='服务地址已保存，下次提交将使用这个接口。'}catch{el('service-notice').textContent='请输入有效的 HTTP 或 HTTPS 地址。'}};
  const demoButton=document.createElement('button');demoButton.type='button';demoButton.className='text-button';demoButton.id='demo-search';demoButton.textContent='先用示例专辑体验完整流程';demoButton.onclick=()=>{setDemo();submit()};el('query-composer').append(demoButton);
  let touchStart=null,wheelTotal=0,lastWheel=0;el('cover-stage').addEventListener('pointerdown',e=>{if(e.pointerType==='touch')touchStart={x:e.clientX,y:e.clientY}});el('cover-stage').addEventListener('pointerup',e=>{if(!touchStart)return;let dx=e.clientX-touchStart.x,dy=e.clientY-touchStart.y;touchStart=null;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy))next(dx<0?1:-1)});el('cover-stage').addEventListener('wheel',e=>{if(Math.abs(e.deltaX)<=Math.abs(e.deltaY))return;e.preventDefault();if(performance.now()-lastWheel>220)wheelTotal=0;wheelTotal+=e.deltaX;lastWheel=performance.now();if(Math.abs(wheelTotal)>75){next(wheelTotal>0?1:-1);wheelTotal=0}},{passive:false});
  overlay.addEventListener('keydown',e=>{let input=e.target.matches('textarea,input')&&!e.target.disabled&&e.target.getClientRects().length>0;if(e.key==='Escape'){e.preventDefault();if(document.body.classList.contains('memory-compose')){document.body.classList.remove('memory-compose');el('supplement-form').hidden=true;return}if(!el('service-settings').hidden){el('service-settings').hidden=true}else close();return}if(!input&&['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();next(e.key==='ArrowLeft'?-1:1)}if(e.key==='Tab'){const list=[...overlay.querySelectorAll('button,input,textarea,[tabindex="0"]')].filter(n=>!n.disabled&&n.getClientRects().length);const a=list[0],b=list.at(-1);if(e.shiftKey&&document.activeElement===a){e.preventDefault();b?.focus()}else if(!e.shiftKey&&document.activeElement===b){e.preventDefault();a?.focus()}}});
  /* 旧的 placeholder 独立轮播已移除：统一由 startExampleRoller() 驱动
     （renderExampleHint 会同时更新 placeholder 与轮播按钮）。 */
  
  addEventListener('resize',()=>{if(isOpen&&['CANDIDATE_VIEW','CANDIDATE_FORMING'].includes(store.state)&&!overview)showCandidate(store.index)});motion.addEventListener('change',()=>{engine.stop();if(isOpen&&store.state==='CANDIDATE_FORMING')showCandidate(store.index)});
  
  // ============================================================================
  // 对外接口 · window.SeekSearch
  // ============================================================================
  /*
   * 三种接入方式（任选其一），接完 UI 里的「示例演示」标签会自动变回「搜索服务已连接」：
   *
   *   A. SeekSearch.connectSeek('http://127.0.0.1:8000');          // 接 seek 后端（推荐）
   *   B. SeekSearch.setEndpoint('http://127.0.0.1:8000/search');   // 接任意 HTTP 接口
   *   C. SeekSearch.setProvider(async (payload,{signal})=>({candidates:[…]}));  // 完全自定义
   *
   * 辅助：SeekSearch.health() 探活、SeekSearch.setTimeout(120000) 放宽等待上限、
   *       SeekSearch.getState() / getCurrentCandidate() 自检。
   */
  const apiFacade = {
    open: open,
    close: close,
    /* A. 接 seek 后端。传服务根地址，不要带 /search。
          返回 Promise（/health 探活结果）：失败只影响提示文案，不阻塞后续使用。 */
    connectSeek(baseUrl) {
      const url = new URL(baseUrl, location.href);
      if (!['http:', 'https:'].includes(url.protocol)) throw new TypeError('HTTP(S) endpoint required');
      const base = url.href.replace(/\/+$/, '');
      api.provider = seekProvider(base);
      api.endpoint = '';
      api.base = base;
      store.demo = false;
      updateMemory();
      return pingSeekService(base).then(function (info) {
        el('composer-notice').textContent =
          '已连接搜索服务，索引 ' + (info.index_count == null ? '?' : info.index_count) + ' 条。';
        return info;
      }).catch(function (error) {
        el('composer-notice').textContent =
          '无法确认搜索服务状态：' + (error && error.message ? error.message : error);
        throw error;
      });
    },
    /* B. 接任意 HTTP 接口：扁平 candidates（id/title/cover）或 seek 嵌套结构都能识别 */
    setEndpoint(url) {
      const target = new URL(url, location.href);
      if (!['http:', 'https:'].includes(target.protocol)) throw new TypeError('HTTP(S) endpoint required');
      api.endpoint = target.href;
      api.base = target.origin;
      api.provider = null;
      store.demo = false;
      updateMemory();
    },
    /* C. 完全自定义：fn(payload, { signal }) → { candidates, question, sessionId } */
    setProvider(fn) {
      if (typeof fn !== 'function') throw new TypeError('provider must be a function');
      api.provider = fn;
      api.endpoint = '';
      api.base = '';
      store.demo = false;
      updateMemory();
    },
    /* 探活：Promise<{ status, message, index_count, index_reused }> */
    health() {
      if (!api.base) return Promise.reject(new SearchFailure('unconnected', '尚未连接搜索服务。'));
      return pingSeekService(api.base);
    },
    /* 首次检索要加载模型，可能超过默认等待上限，用它调大（毫秒） */
    setTimeout(ms) {
      const value = Number(ms);
      if (!Number.isFinite(value) || value < 1000) throw new TypeError('timeout 需要 >= 1000 的毫秒数');
      api.timeout = value;
    },
    getState() {
      return {
        state: store.state, query: store.query, count: store.candidates.length,
        index: store.index, demo: store.demo, excluded: [...store.excluded]
      };
    },
    getCurrentCandidate() {
      const c = store.current();
      return c ? {
        id: c.id, title: c.title, artist: c.artist, cover: c.cover,
        year: c.year, genre: c.genre, language: c.language, tracks: (c.tracks || []).slice()
      } : null;
    },
    /* 双击唱片机上的唱片时，外部可调它打开该唱片的编辑弹窗 */
    editRecord(id) { if (id != null) library.openRecordEditor(id); },
    useDemo: setDemo
  };
  return apiFacade;
}
