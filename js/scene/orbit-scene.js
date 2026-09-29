/*
 * Seek 前端 · 首页 3D 唱片机与环绕唱片
 * ---------------------------------------------------------------------------
 * 负责：唱片盒构建、入场动画、环绕轨道、鼠标临近减速、选中 / 取消、
 *       键盘可达性、缩放、resize 与主渲染循环。
 *
 * 对外只暴露一个工厂，内部 DOM（.world / .fit / .viewport）不对外泄漏：
 *   const scene = createOrbitScene({ root, onSelect });
 *   scene.setAlbums(albums)   // 由 library 变化时调用
 *   scene.pause() / resume()
 *   scene.setSearchActive(true/false)
 *   scene.reveal()            // 重播入场
 *   scene.destroy()
 *
 * 依赖：shared/motion（缓动）、scene/artwork-generator（示例封面兜底）。
 * 注意：本模块不感知搜索业务，搜索态只通过 setSearchActive 切换视觉。
 */
export function createOrbitScene({ root, initialAlbums = [], onSelect = () => {}, generateArtwork }) {
  /* 搜索态标志：由 setSearchActive() 维护，替代旧的 window.seekSearchActive 全局 */
  let searchActive = false;
  const fit=document.querySelector('.fit'),info=document.querySelector('.info');
  let items=[],albums=initialAlbums.slice();function buildCases(){root.replaceChildren();items=albums.map((a,i)=>{let el=document.createElement('div');el.className='case';el.dataset.id=a.id||'';el.tabIndex=0;el.setAttribute('role','button');el.setAttribute('aria-label',a.title+' — '+a.artist);el.innerHTML='<div class="back"><img class="art" draggable="false" alt=""></div><div class="face"><img class="art" draggable="false" alt=""><div class="glass"></div></div><div class="edge"></div><div class="edge right"></div><div class="edge top"></div><div class="edge bottom"></div><div class="hinge"></div>';const cover=a.cover||generateArtwork(a,i);el.querySelectorAll('img').forEach(img=>img.src=cover);root.append(el);el.addEventListener('dblclick',e=>{e.stopPropagation();const id=a.id;if(id&&window.SeekSearch&&window.SeekSearch.editRecord)window.SeekSearch.editRecord(id)});el.addEventListener('focus',()=>{if(!pointerDown)select(i,'keyboard')});el.addEventListener('blur',()=>{if(mode==='keyboard')clear()});el.addEventListener('click',e=>{if(e.pointerType==='touch'||touch){selected===i?clear():select(i,'touch')}else if(!selectedValid())select(i,'mouse')});return {el,lift:0,rect:null,source:null};});}buildCases();
  let selected=-1,mode='',touch=false,pointerDown=false,pointer={x:-9999,y:-9999},scale=1,phase=0,spin=0,speed=1,paused=false,start=performance.now(),last=start,elapsed=0,hoverAway=0;const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;let intro=!reduced;
  function selectedValid(){return selected>=0}function select(i,m){if(intro)return;if(selected===i)return;selected=i;mode=m;items[i].source=items[i].el.getBoundingClientRect();document.querySelector('#title').textContent=albums[i].title;document.querySelector('#artist').textContent=albums[i].artist;document.querySelector('#meta').textContent=String(i+1).padStart(2,'0')+' / '+albums[i].genre+' / '+albums[i].year;info.classList.add('visible');hoverAway=0;}function clear(){selected=-1;mode='';info.classList.remove('visible')}
  function resize(){scale=Math.min(innerWidth/1370,innerHeight/1100,1.35)*Number(document.querySelector("#zoom").value)/100;fit.style.transform=`scale(${scale})`;clear()}addEventListener('resize',resize);resize();document.querySelector('#zoom').addEventListener('input',e=>{document.querySelector('#zoom-value').value=e.target.value+'%';resize()});
  addEventListener('pointermove',e=>{if(e.pointerType==='touch')return;touch=false;pointer={x:e.clientX,y:e.clientY}});document.documentElement.addEventListener('pointerleave',()=>{pointer={x:-9999,y:-9999};if(mode==='mouse')clear()});addEventListener('pointerdown',e=>{pointerDown=true;touch=e.pointerType==='touch';if(touch&&!e.target.closest('.case'))clear()});addEventListener('pointerup',()=>pointerDown=false);addEventListener('keydown',e=>{if(e.key==='Escape')clear();if((e.key==='Enter'||e.key===' ')&&document.activeElement.classList.contains('case')){e.preventDefault();let i=items.findIndex(t=>t.el===document.activeElement);selected===i?clear():select(i,'keyboard')}});
  document.querySelector('#replay').onclick=()=>{clear();phase=0;elapsed=0;intro=true;paused=false;speed=1;revealed=false;document.querySelector('.world').classList.remove('tilted');document.querySelector('.about').classList.remove('show');document.querySelector('.neon').classList.remove('show');document.querySelector('.neon').classList.remove('on');document.body.classList.remove('lit');document.querySelector('#pause').textContent='暂停运动 Ⅱ';document.querySelector('#pause').setAttribute('aria-pressed','false');document.querySelector('#progress').style.opacity='1'};
  document.querySelector('#pause').onclick=e=>{paused=!paused;e.currentTarget.textContent=paused?'继续运动 ▷':'暂停运动 Ⅱ';e.currentTarget.setAttribute('aria-pressed',String(paused))};
  let revealed=false;function reveal(){if(revealed)return;revealed=true;document.querySelector('.world').classList.add('tilted');document.querySelector('.fit').classList.add('down');document.querySelector('.about').classList.add('show');document.querySelector('.neon').classList.add('show');setTimeout(function(){document.querySelector('.neon').classList.add('on');document.body.classList.add('lit')},260)}if(reduced)setTimeout(reveal,500);
  // —— 缓动/插值工具 ——
  // mix   : 线性插值 a→b（t∈[0,1]）
  // clamp : 把数值夹到 [0,1]
  // smooth: smoothstep 平滑曲线（首尾缓、中间快）
  const mix=(a,b,t)=>a+(b-a)*t,clamp=v=>Math.max(0,Math.min(1,v)),smooth=t=>t*t*(3-2*t);
  // A single entry rail: covers streak in from the right close to the viewer,
  // hold their front art face-on as they cross screen centre for a clear read,
  // then turn outward and swing onto the clockwise orbit at the left tangent
  // (x=-443,z=0), settling into the ring.
  const entrySpeed=5.4,entryTravel=1/3; let orbitStep,entryGap,duration,orbitRadius; function syncGeometry(){orbitStep=Math.PI*2/albums.length;entryGap=orbitStep/entrySpeed;duration=(albums.length-1)*entryGap+entryTravel;orbitRadius=Math.max(443,albums.length*27)}syncGeometry();
  function cubic(a,b,c,d,t){let u=1-t;return a*u*u*u+3*b*u*u*t+3*c*u*t*t+d*t*t*t}
  
  // ============================================================================
  // 唱片机 · 轨道姿态计算（入场 / 环绕）
  // ============================================================================
  function sleevePose(i,time,anglePhase,entering){
   const age=time-i*entryGap,t=clamp(age/entryTravel);
   const theta=Math.PI*1.5-(anglePhase-entryTravel*entrySpeed)+i*orbitStep;
   if(entering&&age<entryTravel){
    const tail=1-smooth(t);
    // Face showcase: turn face-on (0°) approaching centre, hold it across the
    // middle so the artwork is readable, then turn outward (-90°) to enter.
    const t1=.35,t2=.65;
    const ry=t<t1?-40*(1-smooth(t/t1)):t<t2?0:-90*smooth((t-t2)/(1-t2));
    return {theta,age,
     x:cubic(800,363,-443,-443,t),
     y:cubic(-650,-422,-2,-2,t),
     z:cubic(240,156,266,0,t),
     ry,rx:18*tail,rz:-5*tail,s:1+tail};
   }
   return {theta,age,x:Math.sin(theta)*orbitRadius,y:-2,z:Math.cos(theta)*orbitRadius,
    ry:theta*180/Math.PI,rx:0,rz:0,s:1};
  }
  function inside(r,pad=0){return r&&pointer.x>=r.left-pad&&pointer.x<=r.right+pad&&pointer.y>=r.top-pad&&pointer.y<=r.bottom+pad}
  function distance(r){return Math.hypot(Math.max(r.left-pointer.x,0,pointer.x-r.right),Math.max(r.top-pointer.y,0,pointer.y-r.bottom))}
  
  // ============================================================================
  // 唱片机 · 主渲染循环
  // ============================================================================
  function frame(now){let dt=Math.min((now-last)/1000,.04);last=now;if(!paused)elapsed+=dt;let nearest=1e6;
  if(!intro&&!touch&&!searchActive){for(const item of items){if(item.rect)nearest=Math.min(nearest,distance(item.rect))}if(selected<0){let hit=document.elementFromPoint(pointer.x,pointer.y)?.closest('.case');if(hit){let i=items.findIndex(t=>t.el===hit);if(i>=0)select(i,'mouse')}}else if(mode==='mouse'){const it=items[selected];if(inside(it.source,20)||inside(it.rect,22)){hoverAway=0}else{hoverAway+=dt;if(hoverAway>.14)clear()}}}
  let target=searchActive?.06:selectedValid()?.045:mix(.13,1,smooth(clamp(nearest/(145*scale))));speed=mix(speed,target,1-Math.exp(-dt*8));if(!paused&&(intro||!reduced)){const orbitRate=intro?entrySpeed:mix(entrySpeed,.19,smooth(clamp((elapsed-duration)/0.4)));phase+=dt*orbitRate*(intro?1:speed);spin-=dt*26*(intro?1:speed)}
  if(intro&&elapsed>=duration){intro=false;setTimeout(reveal,120)}items.forEach((it,i)=>{let {theta,age,x,y,z,ry,rx,rz,s}=sleevePose(i,elapsed,phase,intro);it.el.style.visibility=intro&&age<0?'hidden':'visible';
  
  it.lift=mix(it.lift,selected===i?1:0,1-Math.exp(-dt*9));let l=it.lift;let facing=((ry+180)%360+360)%360-180;ry=mix(ry,ry-facing,l);x=mix(x,0,l);y=mix(y,-180,l);z=mix(z,170,l);s*=1+l*.72;it.el.style.transform=`translate3d(${x}px,${y}px,${z}px) rotateY(${ry}deg) rotateX(${mix(rx,45,l)}deg) rotateZ(${rz}deg) scale(${s})`;it.el.querySelectorAll('.art').forEach(img=>img.style.filter=`saturate(.84) brightness(${selectedValid()&&selected!==i?.44:mix(.8,1.13,(Math.cos(theta)+1)/2)})`);it.el.setAttribute('aria-expanded',String(selected===i));});
  document.querySelector('.record').style.transform=`rotate(${spin}deg)`;for(const it of items)it.rect=it.el.getBoundingClientRect();document.querySelector('#status').textContent=intro?'ASSEMBLING THE COLLECTION':paused?'MOTION PAUSED':selectedValid()?'SLEEVE NOTES / 专辑详情':speed<.8?'SLOW MOTION / 靠近聆听':albums.length+' RECORDS / IN ORBIT';document.querySelector('#progress').style.width=clamp(elapsed/duration)*100+'%';if(!intro)document.querySelector('#progress').style.opacity='0';requestAnimationFrame(frame)}requestAnimationFrame(frame);
  
  // ============================================================================
  return {
    setAlbums(next) { albums = next.slice(); syncGeometry(); buildCases(); },
    getAlbums() { return albums.slice(); },
    reveal,
    clear,
    pause() { paused = true; },
    resume() { paused = false; },
    setSearchActive(active) { searchActive = !!active; document.body.classList.toggle('search-active', !!active); },
    getSelected() { return selected; },
    destroy() { root.replaceChildren(); }
  };
}
