/*
 * Seek 前端 · 深空背景与星尘
 * ---------------------------------------------------------------------------
 * 首页氛围层，与搜索、唱片机互不依赖。
 *   · #deepsky  : canvas，绘制银河星带、倾斜旋涡星系、星云与密集星场
 *   · #stardust : DOM 星点，带 twinkle 动画
 * 导出 createDeepSky()，由 main.js 在启动时调用一次。
 * 想调节氛围：改 SOFT / 星点数量 / pal 调色板。
 */
export function createDeepSky() {
  /* ---- 星尘：静态、无网络资源，避免闪烁与额外请求 ---- */
  // Static, seeded starlight: no flicker or network assets.
  {const dust=document.querySelector('#stardust');let seed=4187;const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);for(let i=0;i<110;i++){let left,top;if(i%2===0){const x=random()*130-15;left=x;top=72-x*.42+(random()-.5)*26}else{left=random()*100;top=random()*100}const big=i%23===0,size=big?2:(i%5===0?1.2+random()*.5:.6+random()*.7),o=big?.62+random()*.34:.22+random()*.5,t=random(),col=t<.2?'#cfe0ff':t<.34?'#ffe6c4':'#d5d6c8',star=document.createElement('i');let css='left:'+left.toFixed(2)+'%;top:'+top.toFixed(2)+'%;width:'+size.toFixed(2)+'px;height:'+size.toFixed(2)+'px;background:'+col+';--o:'+o.toFixed(2)+';opacity:'+o.toFixed(2)+';box-shadow:0 0 '+(big?8:5)+'px '+(big?'#dfe6ff5c':'#d2c6a333');if(i%3===0)css+=';animation:twinkle '+(4+random()*6).toFixed(2)+'s ease-in-out '+(random()*6).toFixed(2)+'s infinite alternate';star.style.cssText=css;dust.append(star)}}

  /* ---- 深空画布 ---- */
  {const cvs=document.querySelector('#deepsky'),ctx=cvs.getContext('2d');let s2=90210;const rnd=()=>((s2=(s2*1664525+1013904223)>>>0)/4294967296),R=(a,b)=>a+rnd()*(b-a),RI=(a,b)=>Math.floor(a+rnd()*(b-a+1));let cache={};
  const soft=(c,a)=>{const k=c+'|'+a;let g=cache[k];if(!g){g=ctx.createRadialGradient(0,0,0,0,0,1);g.addColorStop(0,'rgba('+c+','+a+')');g.addColorStop(.45,'rgba('+c+','+(a*.38)+')');g.addColorStop(1,'rgba('+c+',0)');cache[k]=g}return g};
  const blob=(x,y,r,c,a)=>{a=Math.round(a*250)/250;ctx.save();ctx.translate(x,y);ctx.scale(r,r);ctx.fillStyle=soft(c,a);ctx.fillRect(-1,-1,2,2);ctx.restore()};
  const dot=(x,y,r,c,a)=>{ctx.globalAlpha=a;ctx.fillStyle=c;ctx.fillRect(x,y,r,r)};
  const drawSky=()=>{const w=innerWidth,h=innerHeight,dpr=Math.min(devicePixelRatio||1,1.5),m=Math.min(w,h);cvs.width=w*dpr;cvs.height=h*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);cache={};ctx.globalCompositeOperation='lighter';ctx.globalAlpha=1;
  blob(w*.20,h*.22,m*.95,'62,72,152',.042);blob(w*.82,h*.78,m*.88,'84,58,142',.032);blob(w*.60,h*.30,m*.72,'40,58,120',.02);blob(w*.16,h*.86,m*.68,'122,68,108',.02);
  const P=t=>[(-.10+t*1.20)*w,(.95-t*.88)*h+Math.sin(t*7.4+1.05)*h*.062+Math.sin(t*2.3-.6)*h*.03];
  const per=t=>{const a=P(Math.max(0,t-.01)),b=P(Math.min(1,t+.01));const dx=b[0]-a[0],dy=b[1]-a[1],L=Math.hypot(dx,dy)||1;return[-dy/L,dx/L]};
  const HW=t=>m*(.055+.085*Math.abs(Math.sin(t*3.4+.5)));
  const pal=['104,124,224','150,112,232','74,168,208','206,196,236','160,176,244'];
  for(let i=0;i<150;i++){const t=rnd(),p=P(t),n=per(t),o=(rnd()-.5)*2*HW(t);blob(p[0]+n[0]*o,p[1]+n[1]*o,m*R(.09,.30),pal[RI(0,pal.length-1)],R(.005,.016))}
  for(let i=0;i<12;i++){const t=rnd(),p=P(t),n=per(t),o=(rnd()-.5)*HW(t);blob(p[0]+n[0]*o,p[1]+n[1]*o,m*R(.03,.08),'208,218,255',R(.012,.028))}
  ctx.globalCompositeOperation='source-over';
  for(let i=0;i<46;i++){const t=rnd(),p=P(t),n=per(t),o=(rnd()-.5)*1.35*HW(t);blob(p[0]+n[0]*o,p[1]+n[1]*o,m*R(.025,.10),'2,3,7',R(.10,.26))}
  ctx.globalCompositeOperation='lighter';
  const gx=w*.755,gy=h*.245,gr=m*.17,rot=-.62,tilt=.44;
  ctx.save();ctx.translate(gx,gy);ctx.rotate(rot);ctx.scale(1,tilt);
  blob(0,0,gr*1.9,'96,108,190',.016);blob(0,0,gr*1.05,'170,182,246',.026);blob(0,0,gr*.38,'228,236,255',.08);blob(0,0,gr*.14,'255,253,246',.115);
  for(let arm=0;arm<2;arm++)for(let i=0;i<210;i++){const t=i/210,th=arm*Math.PI+t*3.5,rr=gr*(.16+t*.96);blob(Math.cos(th)*rr,Math.sin(th)*rr,gr*R(.02,.08),'196,208,255',R(.004,.012))}
  ctx.restore();
  const cosr=Math.cos(rot),sinr=Math.sin(rot);
  const gp=(rr,th)=>{const x0=Math.cos(th)*rr,y0=Math.sin(th)*rr*tilt;return[gx+x0*cosr-y0*sinr,gy+x0*sinr+y0*cosr]};
  for(let i=0;i<1000;i++){const t=Math.pow(rnd(),.75),th=RI(0,1)*Math.PI+t*3.5,rr=gr*(.16+t*.96),q=gp(rr+(rnd()-.5)*rr*.12,th+(rnd()-.5)*.16);dot(q[0],q[1],R(.3,.9),'218,228,255',R(.05,.26))}
  for(let i=0;i<3;i++){const x=rnd()*w,y=rnd()*h*.8,r=m*R(.018,.04);ctx.save();ctx.translate(x,y);ctx.rotate(rnd()*3.14);ctx.scale(1,R(.3,.6));blob(0,0,r,'200,210,255',.05);ctx.restore()}
  for(let i=0;i<820;i++){const x=rnd()*w,y=rnd()*h,c=rnd();dot(x,y,R(.35,1.25),c<.2?'#cfe0ff':c<.34?'#ffe6c4':'#dfe0d6',R(.16,.8))}
  for(let i=0;i<1500;i++){const t=rnd(),p=P(t),n=per(t),o=(rnd()-.5)*2*HW(t)*Math.pow(rnd(),.5),c=rnd();dot(p[0]+n[0]*o,p[1]+n[1]*o,R(.35,1.3),c<.22?'#cfe0ff':c<.36?'#ffe6c4':'#dfe0d6',R(.16,.85))}
  for(let i=0;i<11;i++){const t=rnd(),p=P(t),n=per(t),o=(rnd()-.5)*HW(t),cx=p[0]+n[0]*o,cy=p[1]+n[1]*o,cr=m*R(.02,.06);for(let j=0;j<26;j++){const a=rnd()*6.283,d=Math.pow(rnd(),.6)*cr;dot(cx+Math.cos(a)*d,cy+Math.sin(a)*d,R(.35,1.1),'#dfe6ff',R(.2,.9))}}
  ctx.globalAlpha=1;
  for(let i=0;i<13;i++){const onR=rnd()<.6,p=onR?P(rnd()):[rnd()*w,rnd()*h],x=p[0],y=p[1],f=R(16,34);blob(x,y,f*.5,'200,216,255',.2);const fg=ctx.createLinearGradient(x-f,0,x+f,0);fg.addColorStop(0,'rgba(214,228,255,0)');fg.addColorStop(.5,'rgba(236,243,255,.5)');fg.addColorStop(1,'rgba(214,228,255,0)');ctx.fillStyle=fg;ctx.fillRect(x-f,y-.35,f*2,.7);const fv=ctx.createLinearGradient(0,y-f,0,y+f);fv.addColorStop(0,'rgba(214,228,255,0)');fv.addColorStop(.5,'rgba(236,243,255,.36)');fv.addColorStop(1,'rgba(214,228,255,0)');ctx.fillStyle=fv;ctx.fillRect(x-.35,y-f,.7,f*2)}
  ctx.globalCompositeOperation='source-over'};
  drawSky();let rt;addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(drawSky,180)})}
  
  // Replace cover with a local path / data URL to use your own square album artwork.

  return {
    /* 重新按视口尺寸绘制一次 */
    redraw: () => { try { drawSky(); } catch {} },
    stop: () => {}
  };
}
