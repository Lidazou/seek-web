/*
 * Seek 前端 · 唱片收藏（CD 集）
 * ---------------------------------------------------------------------------
 * 负责用户自己的唱片集：演示唱片 + 收藏的真实专辑 + 手动新建的唱片。
 *   · localStorage 持久化（key: seek-collection-v1）
 *   · 编辑 CD 集页面：点击 / 拖动排序、新建、删除、改封面与信息
 *   · 搜索候选「★ 收藏到唱片机」也走这里
 *
 * 对外接口（main.js 注入给搜索模块使用）：
 *   library.getAlbums() / addAlbum() / removeAlbum() / updateAlbum()
 *   library.reorder(ids) / has(id) / get(id) / list()
 *   library.openEditor() / closeEditor()
 *
 * 注意：候选不会自动进入唱片集，必须用户显式收藏。
 * 数据来源区分：source === 'demo' | 'favorite' | 'custom'。
 */
import { el } from '../shared/dom.js';
import { generateArtwork } from '../scene/artwork-generator.js';

export function createCdLibrary({
  initialAlbums = [],
  storageKey = 'seek-collection-v1',
  onLibraryChange = () => {}
}) {
  const COLL_KEY = storageKey;

  /* ------------------------------------------------------------------
   * 编辑 CD 集：页面渲染、指针拖拽排序、单张唱片编辑弹窗
   * ------------------------------------------------------------------ */
  let cdEditingId=null,editDragId=null,editMoved=false,editStartX=0,editStartY=0;

  function cdPreview(a,idx){if(a.cover)return a.cover;try{return generateArtwork(a, idx)||''}catch{return ''}}

  function cdRender(){const grid=el('cd-grid');grid.replaceChildren();libraryApi.list().forEach((a,idx)=>{const it=document.createElement('div');it.className='cd-item';it.dataset.id=a.id;const img=document.createElement('img');img.alt=a.title;img.draggable=false;img.src=cdPreview(a,idx);const t=document.createElement('div');t.className='cd-item-title';t.textContent=a.title;const ar=document.createElement('div');ar.className='cd-item-artist';ar.textContent=a.artist;it.append(img,t,ar);grid.append(it)})}

  function cdItemAt(x,y){const el=document.elementFromPoint(x,y);return el&&el.closest('.cd-item')}

  function cdInsertIndex(x,y){const items=[...el('cd-grid').querySelectorAll('.cd-item')];if(!items.length)return 0;for(let i=0;i<items.length;i++){const r=items[i].getBoundingClientRect();if(x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom)return x<r.left+r.width/2?i:i+1}let bi=0,bd=1e9;items.forEach((it,i)=>{const r=it.getBoundingClientRect();const d=(x-(r.left+r.width/2))**2+(y-(r.top+r.height/2))**2;if(d<bd){bd=d;bi=i}});const r=items[bi].getBoundingClientRect();return x<r.left+r.width/2?bi:bi+1}

  function cdWireGrid(){const grid=el('cd-grid');
   grid.addEventListener('pointerdown',e=>{const it=cdItemAt(e.clientX,e.clientY);if(!it||e.button!==0)return;editDragId=it.dataset.id;editMoved=false;editStartX=e.clientX;editStartY=e.clientY;it.classList.add('dragging');try{grid.setPointerCapture(e.pointerId)}catch{}});
   grid.addEventListener('pointermove',e=>{if(!editDragId)return;if(!editMoved&&Math.hypot(e.clientX-editStartX,e.clientY-editStartY)>7)editMoved=true;if(!editMoved)return;const ids=libraryApi.list().map(x=>x.id);const from=ids.indexOf(editDragId);if(from<0)return;const insert=cdInsertIndex(e.clientX,e.clientY);ids.splice(from,1);const to=Math.max(0,Math.min(ids.length,insert>from?insert-1:insert));ids.splice(to,0,editDragId);const cur=libraryApi.list().map(x=>x.id);if(ids.join('\u0000')!==cur.join('\u0000')){libraryApi.reorder(ids);cdRender();const nn=el('cd-grid').querySelector('.cd-item[data-id="'+editDragId+'"]');if(nn)nn.classList.add('dragging')}});
   grid.addEventListener('pointerup',e=>{if(editDragId){const prev=el('cd-grid').querySelector('.cd-item.dragging');if(prev)prev.classList.remove('dragging');editDragId=null;try{grid.releasePointerCapture(e.pointerId)}catch{}}});
   grid.addEventListener('click',e=>{const it=e.target.closest('.cd-item');if(it&&it.dataset.id)cdEdit(it.dataset.id)});
  }

  function cdEdit(id){const a=libraryApi.get(id);if(!a)return;cdEditingId=id;el('cd-modal-title').textContent='编辑 · '+a.title;el('cd-f-title').value=a.title;el('cd-f-artist').value=a.artist;el('cd-f-cover').value=a.cover||'';el('cd-f-year').value=a.year;el('cd-f-genre').value=a.genre;el('cd-modal-notice').textContent='';el('cd-modal').hidden=false;setTimeout(()=>el('cd-f-title').focus(),50)}

  function cdSave(){if(!cdEditingId)return;const patch={title:el('cd-f-title').value.trim(),artist:el('cd-f-artist').value.trim(),cover:el('cd-f-cover').value.trim(),year:el('cd-f-year').value.trim(),genre:el('cd-f-genre').value.trim()};if(!patch.title){el('cd-modal-notice').textContent='专辑名不能为空。';return}libraryApi.update(cdEditingId,patch);el('cd-modal').hidden=true;cdRender()}

  function cdNew(){const id=libraryApi.add({title:'新唱片',artist:'未知艺人',cover:'',year:'',genre:'',source:'custom'});cdRender();cdEdit(id)}

  function cdDelete(){if(!cdEditingId)return;libraryApi.remove(cdEditingId);el('cd-modal').hidden=true;cdRender()}

  function cdOpen(){el('cd-editor').hidden=false;cdRender()}

  function cdClose(){el('cd-editor').hidden=true;el('cd-modal').hidden=true}

  el('cd-done').onclick=cdClose;

  el('cd-add').onclick=cdNew;

  el('cd-modal-close').onclick=()=>{el('cd-modal').hidden=true};

  el('cd-save').onclick=cdSave;

  el('cd-delete').onclick=cdDelete;
  /* 场景与搜索模块都不直接读 collection，统一通过 getAlbums() / list() */
  let libraryApi = null;

let collection=[];
try{const v=JSON.parse(localStorage.getItem(COLL_KEY)||'null');if(Array.isArray(v)&&v.length)collection=v}catch{}
if(!collection.length){collection=initialAlbums.map((a,i)=>({id:'demo-'+i,title:a.title,artist:a.artist,year:a.year,genre:a.genre,cover:a.cover,colors:a.colors,source:'demo'}));persistCollection()}
function persistCollection(){try{localStorage.setItem(COLL_KEY,JSON.stringify(collection))}catch{}}
function normalizeAlbum(e){const a={id:String(e.id||''),title:String(e.title||'未命名唱片'),artist:String(e.artist||'未知艺人'),year:String(e.year||''),genre:String(e.genre||''),language:String(e.language||''),cover:String(e.cover||''),tracks:Array.isArray(e.tracks)?e.tracks:[],source:String(e.source||'custom')};if(e.colors&&Array.isArray(e.colors))a.colors=e.colors;return a}
function applyLibrary(){onLibraryChange(collection.slice())}
function libAdd(e){const a=normalizeAlbum(e);if(!a.id)a.id='c-'+Date.now().toString(36);collection=collection.filter(x=>x.id!==a.id);collection.unshift(a);persistCollection();applyLibrary();return a.id}
applyLibrary();

  /* 对外只暴露行为，不暴露内部数组 */
  /* 接线：拖拽排序的指针事件只绑一次；首页「编辑CD集」入口也在这里 */
  cdWireGrid();
  el('custom-entry').onclick = cdOpen;

  libraryApi = Object.assign({
 add:libAdd,
 addFavorite(e){return libAdd(Object.assign({},e,{source:'favorite'}))},
 addCustom(e){return libAdd(Object.assign({},e,{source:'custom'}))},
 remove(id){collection=collection.filter(x=>x.id!==id);persistCollection();applyLibrary()},
 update(id,patch){const a=collection.find(x=>x.id===id);if(!a)return false;if(patch.title!=null)a.title=String(patch.title);if(patch.artist!=null)a.artist=String(patch.artist);if(patch.year!=null)a.year=String(patch.year);if(patch.genre!=null)a.genre=String(patch.genre);if(patch.cover!=null)a.cover=String(patch.cover);persistCollection();applyLibrary();return true},
 reorder(orderedIds){const m=new Map(collection.map(x=>[x.id,x]));const next=orderedIds.map(id=>m.get(id)).filter(Boolean);const seen=new Set(orderedIds);collection=next.concat(collection.filter(x=>!seen.has(x.id)));persistCollection();applyLibrary()},
 has(id){return collection.some(x=>x.id===id)},
 get(id){return collection.find(x=>x.id===id)||null},
 list(){return collection.slice()}
}, {
    getAlbums: () => collection.slice(),
    openRecordEditor: (id) => cdEdit(String(id)),
    openEditor: () => { document.getElementById('cd-editor').hidden = false; cdRender(); },
    closeEditor: () => { document.getElementById('cd-editor').hidden = true; document.getElementById('cd-modal').hidden = true; }
  });
  onLibraryChange(collection.slice());
  return libraryApi;
}
