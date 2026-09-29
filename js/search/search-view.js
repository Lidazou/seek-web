/*
 * Seek 前端 · 搜索界面渲染
 * ---------------------------------------------------------------------------
 * 只负责把 Store 里的数据画到 DOM 上：
 *   ✗ 不发 API  ✗ 不计算候选  ✗ 不维护会话  ✗ 不碰粒子动画业务
 * 收藏状态、选曲目等业务动作通过 deps 回调交回 controller。
 */
import { el } from '../shared/dom.js';

export function createSearchView({ store, onPickTrack = () => {} }) {
  const panelIds=['query-composer','search-status','candidate-viewer','question-card','empty-card','error-card','candidate-overview'];

  function announce(s){el('search-announcement').textContent=s}

  function showPanels(...ids){panelIds.forEach(id=>el(id).hidden=!ids.includes(id));document.body.classList.toggle('overview-open',ids.includes('candidate-overview'))}

  function layoutMemory(){
 const p=el('memory-text'),anchor=el('memory-anchor'),text=memoryDraft();
 if(!text||anchor.hidden){anchor.style.maxWidth='';return}
 p.textContent=text;
 const cs=getComputedStyle(p),padL=parseFloat(cs.paddingLeft)||0,btn=el('previous-candidate'),viewer=el('candidate-viewer');
 const limit0=(viewer&&!viewer.hidden&&btn)?btn.getBoundingClientRect().left:0;
 const limit=(limit0&&limit0>innerWidth*.18)?limit0:Math.min(innerWidth*.36,600);
 const left=p.getBoundingClientRect().left-padL;
 const maxW=Math.max(200,limit-left-44);
 anchor.style.maxWidth=(maxW+padL+6)+'px';
 const cv=layoutMemory.c||(layoutMemory.c=document.createElement('canvas').getContext('2d'));
 const setFont=s=>{cv.font=`${cs.fontStyle} ${cs.fontWeight} ${s}px ${cs.fontFamily}`};
 let fs=parseFloat(cs.fontSize)||30;
 setFont(fs);
 const parts=text.match(/[^，,、；;]+[，,、；;]?/g)||[text];
 /* Fit the column so every break can land on a comma: shrink the type rather
    than cutting a clause in half. */
 const widest=parts.reduce((m,s)=>Math.max(m,cv.measureText(s).width),0);
 const fitW=maxW*.93;/* canvas metrics can differ slightly from the rendered face */
 if(widest>fitW){fs=Math.max(20,Math.floor(fs*fitW/widest));setFont(fs);p.style.fontSize=fs+'px'}else p.style.fontSize='';
 const esc=s=>s.replace(/[&<>]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[ch]));
 const lines=[];let cur='';
 for(const part of parts){const test=cur+part;if(!cur||cv.measureText(test).width<=fitW)cur=test;else{lines.push(cur.trim());cur=part}}
 if(cur)lines.push(cur.trim());
 const out=[];
 for(const line of lines){if(cv.measureText(line).width<=fitW){out.push(line);continue}let buf='';for(const ch of line){if(buf&&cv.measureText(buf+ch).width>fitW){out.push(buf);buf=ch}else buf+=ch}if(buf)out.push(buf)}
 p.innerHTML=out.map(esc).join('<br>');
}

  function renderMemoryNotes(){
 const list=el('memory-additions'),key=JSON.stringify(store.memories);
 list.hidden=!store.memories.length;
 if(list.dataset.content===key)return;
 const previous=list.childElementCount;list.replaceChildren();
 store.memories.forEach(text=>{const note=document.createElement('li');note.textContent=String(text);list.append(note)});
 list.dataset.content=key;
 if(store.memories.length>previous)requestAnimationFrame(()=>{list.scrollTop=list.scrollHeight});
}

  function memoryDraft(){const input=el('query-input');return input?input.value.trim():String(store.query||'')}

  function renderMemoryDraft(){const draft=memoryDraft(),empty=!draft;el('memory-text').textContent=empty?'你的记忆将会保留在这里':draft;el('memory-text').classList.toggle('is-empty',empty);el('edit-memory').hidden=empty;layoutMemory()}

  function paintCandidate(c){el('candidate-title').textContent=c.title;el('candidate-artist').textContent=c.artist;el('candidate-meta').textContent=[c.year,c.genre].filter(Boolean).join(' / ');el('candidate-count').textContent=`${String(store.index+1).padStart(2,'0')} / ${String(store.candidates.length).padStart(2,'0')}`;el('candidate-reasons').replaceChildren();for(const [title,rows]of [[store.demo?'演示说明':'像的地方',c.matches],['和你的记忆不一样',c.conflicts]]){if(!rows.length)continue;const box=document.createElement('div'),label=document.createElement('b');label.textContent=title;box.append(label);rows.slice(0,2).forEach(row=>{const p=document.createElement('p');p.textContent=row;box.append(p)});el('candidate-reasons').append(box)}el('candidate-actions').hidden=false;el('candidate-position').hidden=false;el('found-details').hidden=true;el('previous-candidate').hidden=el('next-candidate').hidden=false;el('previous-candidate').disabled=el('next-candidate').disabled=store.candidates.length<2;}

  function renderTracks(c){el('found-meta').textContent=[c.year?c.year+' 年':'',c.language,c.genre].filter(Boolean).join(' · ');el('track-list').replaceChildren();el('track-notice').textContent=c.tracks?.length?'选择你记得的那首歌。':'服务未提供曲目列表。可以继续补充歌曲线索。';c.tracks?.forEach((track,i)=>{const li=document.createElement('li'),n=document.createElement('span'),title=document.createElement('span'),duration=document.createElement('small'),b=document.createElement('button');n.textContent=String(i+1).padStart(2,'0');title.textContent=track.title;duration.textContent=track.duration;b.textContent='是这首';b.onclick=()=>finish(track.title);li.append(n,title,duration,b);el('track-list').append(li)})}

  return {
    announce,
    showPanels,
    layoutMemory,
    renderMemoryNotes,
    renderMemory: renderMemoryDraft,
    memoryDraft,
    paintCandidate,
    renderTracks: (candidate) => renderTracks(candidate, onPickTrack)
  };
}
