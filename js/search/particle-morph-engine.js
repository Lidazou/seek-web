/*
 * Seek 前端 · 粒子形变引擎
 * ---------------------------------------------------------------------------
 * 纯粹的可视化模块。它只做：文字采样、图片采样、seed、dissolve、float、
 * attract、capture、morph、fade、stop、draw、resize。
 *
 * 严格禁止（保持单向依赖）：
 *   ✗ 发 API 请求      ✗ 读写 Search Store     ✗ 决定候选或结果状态
 *   ✗ 访问后端          ✗ 决定搜索成功还是失败
 *
 * 输出只有 Promise（动画是否走完）。动画失败由调用方降级成 crossfade，
 * 绝不允许因为动画失败而让搜索结果失败。
 */
import { motion } from '../shared/motion.js';

class ParticleMorphEngine{
 constructor(canvas,{onResize=()=>{},limits={}}={}){this.onResize=onResize;this.limits=limits;this.canvas=canvas;this.ctx=canvas.getContext('2d');this.mode='idle';this.points=[];this.resolve=null;this.last=performance.now();this.resize();addEventListener('resize',()=>{this.resize();clearTimeout(this.lt);this.lt=setTimeout(()=>{try{this.onResize()}catch{}},150)});requestAnimationFrame(t=>this.draw(t))}
 // Particles are composited into an ImageData buffer (additive), then blitted once per frame.
 // That keeps ~50k live particles affordable, where per-particle fillRect could not.
 resize(){this.width=innerWidth;this.height=innerHeight;this.canvas.width=this.width;this.canvas.height=this.height;this.img=this.ctx.createImageData(this.width,this.height);this.buf=new Uint32Array(this.img.data.buffer);this.limit=this.width<650?((this.limits&&this.limits.mobileLimit)||22000):((this.limits&&this.limits.desktopLimit)||52000)}
 cancel(){if(this.resolve){this.resolve(false);this.resolve=null}if(this.mode==='morph')this.mode='hold'}
 seed(n){while(this.points.length<n){const i=this.points.length;this.points.push({x:Math.random()*this.width,y:Math.random()*this.height,rgb:[237,196,139],size:1.3,alpha:.55,bright:1,seed:i*1.618})}this.points.length=n}
 one(c){if(Array.isArray(c))return c;if(typeof c==='string'&&c[0]==='#'){const v=parseInt(c.slice(1),16);return[(v>>16)&255,(v>>8)&255,v&255]}const m=String(c).match(/\d+/g)||[237,196,139];return[+m[0],+m[1],+m[2]]}
 sample(image,rect){const side=Math.max(24,Math.ceil(Math.sqrt(this.limit))),c=document.createElement('canvas');c.width=c.height=side;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(image,0,0,side,side);const data=x.getImageData(0,0,side,side).data,out=[],step=rect.width/side;for(let y=0;y<side;y++)for(let col=0;col<side;col++){const i=(y*side+col)*4;if(data[i+3]<28)continue;out.push({x:rect.left+(col+.5)*step,y:rect.top+(y+.5)*step,rgb:[data[i],data[i+1],data[i+2]],size:Math.max(1,step+.6),alpha:data[i+3]/255})}return out}
 text(text,rect,style){const st=style||{},fs=st.size||22,lh=st.line||Math.round(fs*1.5),pad=st.pad||0,ink=this.one(st.color||'#f6d3a0'),fam=st.family||'Arial';const c=document.createElement('canvas');c.width=Math.max(250,Math.floor(rect.width));c.height=Math.max(150,Math.ceil((Math.ceil(text.length/8)+2)*lh));const x=c.getContext('2d',{willReadFrequently:true});x.fillStyle=st.color||'#f6d3a0';x.font=fs+'px '+fam;let row=lh,line='';for(const ch of text.slice(0,200)){if(x.measureText(line+ch).width>c.width-pad*2-6){x.fillText(line,pad,row);row+=lh;line=''}line+=ch;if(row>c.height-lh)break}x.fillText(line,pad,row);const d=x.getImageData(0,0,c.width,c.height).data,out=[];for(let y=0;y<c.height;y+=2)for(let cx=0;cx<c.width;cx+=2){const i=(y*c.width+cx)*4;if(d[i+3]>70)out.push({x:rect.left+cx,y:rect.top+y,rgb:ink,size:1.4,alpha:.92})}return out}
 dissolve(text,rect,style){this.cancel();if(motion.matches){this.stop();return sleep(160)}const target=this.text(text,rect,style);this.seed(Math.min(this.limit,target.length||3200));this.points.forEach((p,i)=>{const t=target[i%target.length];if(t){p.x=t.x;p.y=t.y;p.rgb=t.rgb.slice();p.size=t.size;p.alpha=t.alpha}});this.float();return sleep(680)}
 float(){this.cancel();if(motion.matches){this.mode='idle';return}if(!this.points.length)this.seed(4200);this.mode='float';this.points.forEach(p=>{p.vx=Math.cos(p.seed)*(.6+Math.random());p.vy=Math.sin(p.seed)*(.6+Math.random());p.size=Math.min(p.size,2);p.bright=1})}
 attract(ms=540){this.cancel();if(motion.matches)return;if(!this.points.length)this.seed(4200);this.mode='attract';this.attractUntil=(this.now||performance.now())+ms;for(const p of this.points){const dx=this.width/2-p.x,dy=this.height*.44-p.y,d=Math.hypot(dx,dy)||1;p.vx=dx/d;p.vy=dy/d;p.alpha=.26;p.size=Math.min(p.size,1.8);p.bright=1}}
 fade(ms=560){this.cancel();if(this.mode==='idle')return;this.mode='fade';this.fadeStart=this.now||performance.now();this.fadeMs=ms}
 stop(){this.cancel();this.mode='idle';this.ctx.clearRect(0,0,this.width,this.height)}
 // Capture the visible source, not the old floating/search particles.
 capture(image,rect){const targets=this.sample(image,rect);this.seed(Math.min(this.limit,targets.length));this.points.forEach((p,i)=>{const t=targets[i];p.x=t.x;p.y=t.y;p.rgb=t.rgb.slice();p.size=t.size;p.alpha=t.alpha;p.bright=1});this.mode='hold'}
 morph(targets,duration=1150,burst=110,inward=false){
  this.cancel();if(motion.matches){this.stop();return sleep(180).then(()=>true)}
  if(!targets.length)return Promise.resolve(false);
  this.seed(Math.min(this.limit,targets.length));this.turn=(this.turn||0)+1;
  const hash=n=>{const v=Math.sin(n*127.1+this.turn*31.7)*43758.5453;return v-Math.floor(v)};
  const bounds=targets.reduce((b,p)=>[Math.min(b[0],p.x),Math.min(b[1],p.y),Math.max(b[2],p.x),Math.max(b[3],p.y)],[Infinity,Infinity,-Infinity,-Infinity]);
  const ccx=(bounds[0]+bounds[2])/2,ccy=(bounds[1]+bounds[3])/2;this.gcx=ccx;this.gcy=ccy;
  const count=this.points.length;let ox=0,oy=0;for(const p of this.points){ox+=p.x;oy+=p.y}ox/=count;oy/=count;
  this.phases=inward?{shatter:0,drift:0,gather:720,square:140,refine:290}:{shatter:265,drift:380,gather:560,square:90,refine:330};
  this.duration=Object.values(this.phases).reduce((a,b)=>a+b,0);this.inward=inward;
  this.points.forEach((p,i)=>{
   const t=targets[i%targets.length],h=hash(i+.1),h2=hash(i+920.4),h3=hash(i+1801.5);
   p.sx=p.x;p.sy=p.y;p.startSize=p.size;p.startAlpha=p.alpha;p.startBright=p.bright||1;
   p.tx=t.x;p.ty=t.y;p.targetSize=t.size;p.targetAlpha=t.alpha??1;
   p.frgb=(p.rgb||[237,196,139]).slice();p.trgb=this.one(t.rgb||t.color).slice();p.rgb=p.frgb.slice();
   p.dep=.35+h3*1.65;p.starSize=.7+Math.pow(h3,2)*1.65;p.starAlpha=.28+.38*h3;
   const angle=Math.atan2(p.y-oy,p.x-ox)+(h-.5)*1.6,ux=Math.cos(angle),uy=Math.sin(angle);
   const edgeX=(ux>0?this.width-ox:-ox)/(Math.abs(ux)<.0001?.0001:ux),edgeY=(uy>0?this.height-oy:-oy)/(Math.abs(uy)<.0001?.0001:uy);
   const reach=Math.min(Math.abs(edgeX),Math.abs(edgeY))*Math.sqrt(.025+.94*h2);
   p.ex=inward?p.x:ox+ux*reach;p.ey=inward?p.y:oy+uy*reach;
   p.driftX=(h-.5)*24*p.dep;p.driftY=(h2-.5)*18*p.dep;p.wave=(h3-.5)*8;
   // Exact end of suspension is the start of the gravity curve: no reset.
   p.ax=p.ex+p.driftX;p.ay=p.ey+p.driftY;
   if(inward){p.ax=p.x;p.ay=p.y}
   p.qx=ccx+(t.x-ccx)*.98;p.qy=ccy+(t.y-ccy)*.98;
   const dx=p.ax-ccx,dy=p.ay-ccy,L=Math.hypot(dx,dy)||1,bend=(h-.5)*Math.min(110,L*.15);
   p.c1x=p.ax-dx*.3-dy/L*bend;p.c1y=p.ay-dy*.3+dx/L*bend;
   p.c2x=ccx+(p.qx-ccx)*.45;p.c2y=ccy+(p.qy-ccy)*.45;
  });
  this.mode='morph';this.started=this.now||performance.now();return new Promise(r=>this.resolve=r)
 }
 updateBreath(age){
  const P=this.phases,a=P.shatter,b=a+P.drift,c=b+P.gather,d=c+P.square,end=d+P.refine;
  const sat=x=>Math.max(0,Math.min(1,x)),ease=x=>x*x*x*(x*(x*6-15)+10),lerp=(x,y,q)=>x+(y-x)*q;
  for(const p of this.points){let color=0;
   if(age<a){
    const u=sat(age/a),q=10*u*u-20*u*u*u+15*u**4-4*u**5;
    p.x=lerp(p.sx,p.ex,q);p.y=lerp(p.sy,p.ey,q);
    p.size=lerp(p.startSize,p.starSize,q);p.alpha=lerp(p.startAlpha,p.starAlpha,q);
    p.bright=lerp(p.startBright,1,q)+Math.sin(Math.PI*u)*.65;
   }else if(age<b){
    const u=sat((age-a)/P.drift),q=ease(u),breath=Math.sin(Math.PI*u)**2;
    p.x=p.ex+p.driftX*q+Math.sin(u*Math.PI*2+p.seed)*p.wave*breath;
    p.y=p.ey+p.driftY*q+Math.cos(u*Math.PI*2+p.seed)*p.wave*breath;
    p.size=p.starSize*(1+.13*breath*Math.sin(p.seed+u*3));
    p.alpha=p.starAlpha;p.bright=1+breath*(.28*Math.sin(p.seed+u*5)-.18);
   }else if(age<c){
    const u=sat((age-b)/P.gather),q=ease(u),v=1-q;
    p.x=v*v*v*p.ax+3*v*v*q*p.c1x+3*v*q*q*p.c2x+q*q*q*p.qx;
    p.y=v*v*v*p.ay+3*v*v*q*p.c1y+3*v*q*q*p.c2y+q*q*q*p.qy;
    p.size=lerp(p.starSize,p.targetSize*.9,q);p.alpha=lerp(p.starAlpha,p.targetAlpha*.74,q);p.bright=1;color=.22*q;
   }else if(age<d){
    const u=sat((age-c)/P.square),breath=Math.sin(Math.PI*u)**2*.002;
    p.x=p.qx+(p.qx-this.gcx)*breath;p.y=p.qy+(p.qy-this.gcy)*breath;
    p.size=p.targetSize*.9;p.alpha=p.targetAlpha*.74;p.bright=1;color=.22;
   }else{
    const q=ease(sat((age-d)/P.refine));p.x=lerp(p.qx,p.tx,q);p.y=lerp(p.qy,p.ty,q);
    p.size=lerp(p.targetSize*.9,p.targetSize,q);p.alpha=lerp(p.targetAlpha*.74,p.targetAlpha,q);p.bright=1;color=lerp(.22,1,q);
   }
   for(let j=0;j<3;j++)p.rgb[j]=lerp(p.frgb[j],p.trgb[j],color);
  }
  if(age>=end){this.mode='hold';if(this.resolve){this.resolve(true);this.resolve=null}}
 }

 draw(t){this.now=t;const dt=Math.max(0,Math.min(32,t-this.last))/16.67;this.last=t;const w=this.width,h=this.height,buf=this.buf;if(!buf){requestAnimationFrame(n=>this.draw(n));return}
  if(this.mode==='morph')this.updateBreath(Math.max(0,t-this.started));
  else if(this.mode==='float'){for(const p of this.points){p.x+=(p.vx||0)*dt*.6;p.y+=(p.vy||0)*dt*.6;p.alpha=.22+.18*Math.sin(t/1900+p.seed);if(p.x<0)p.x=w;if(p.x>w)p.x=0;if(p.y<0)p.y=h;if(p.y>h)p.y=0}}
  else if(this.mode==='attract'){for(const p of this.points){p.x+=(p.vx||0)*dt*1.4;p.y+=(p.vy||0)*dt*1.4;p.alpha=.2+.14*Math.sin(t/1700+p.seed)}if(t>=this.attractUntil)this.mode='float'}
  if(this.mode==='idle'){this.ctx.clearRect(0,0,w,h);requestAnimationFrame(n=>this.draw(n));return}
  buf.fill(0);
  const k=this.mode==='fade'?Math.max(0,1-(t-this.fadeStart)/this.fadeMs):1;
  for(let n=0;n<this.points.length;n++){const p=this.points[n],a=p.alpha*(p.bright==null?1:p.bright)*k;if(a<=.015)continue;const c=p.rgb,s=p.size<1?1:(p.size|0),x0=p.x|0,y0=p.y|0;if(x0<-s||y0<-s||x0>=w||y0>=h)continue;const cr=c[0]*a,cg=c[1]*a,cb=c[2]*a,ca=a*255;
   for(let yy=0;yy<s;yy++){const y1=y0+yy;if(y1>=h)break;if(y1<0)continue;const row=y1*w;
    for(let xx=0;xx<s;xx++){const x1=x0+xx;if(x1>=w)break;if(x1<0)continue;const i=row+x1,d=buf[i];let nr=(d&255)+cr,ng=((d>>8)&255)+cg,nb=((d>>16)&255)+cb,na=(d>>>24)+ca;buf[i]=(nr>255?255:nr|0)|((ng>255?255:ng|0)<<8)|((nb>255?255:nb|0)<<16)|((na>255?255:na|0)<<24)}}}
  this.ctx.putImageData(this.img,0,0);
  if(this.mode==='fade'&&t>=this.fadeStart+this.fadeMs)this.stop();
  requestAnimationFrame(n=>this.draw(n))}
}
export { ParticleMorphEngine };
