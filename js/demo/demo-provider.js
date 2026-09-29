/*
 * Seek 前端 · 示例演示数据源
 * ---------------------------------------------------------------------------
 * 只有在用户【主动】选择「示例演示」时才会被装上（SeekSearch.useDemo）。
 * 生产环境绝不允许在真实 API 失败后偷偷切到这里 —— 那属于严重误导。
 *
 * 演示候选一律标记 source='demo'，界面必须显示 DEMO DATA 标识。
 */
import { sleep } from '../shared/dom.js';
import { demoAlbums } from './demo-data.js';

async function demoProvider(payload,{signal}){await sleep(650);if(signal.aborted)throw new DOMException('Aborted','AbortError');let indices=[0,2,4,7,9,11,1,3];if(payload.operation==='answer'&&payload.answers.at(-1)?.value==='no')indices=[1,3,5,8,0,2,4,7];if(payload.operation==='rerank'&&/红|暖|橙/.test(payload.memories.join(' ')))indices=[1,8,5,3,0,2,4,7];const candidate=i=>({id:'demo-'+i,title:demoAlbums[i].title,artist:demoAlbums[i].artist,year:demoAlbums[i].year,genre:demoAlbums[i].genre,language:'示例资料',cover:demoAlbums[i].cover||generateArtwork(demoAlbums[i],i),matches:['交互演示用专辑，不是实际搜索结果。'],conflicts:[],tracks:[{id:'a',title:'序曲 · 示例曲目',duration:'3:42'},{id:'b',title:'回声 · 示例曲目',duration:'4:06'},{id:'c',title:'归途 · 示例曲目',duration:'3:18'}]});if(payload.operation==='details')return {candidate:candidate(Number(payload.albumId.replace('demo-',''))||0)};return {sessionId:'demo-session',candidates:indices.filter(i=>!payload.excludedIds.includes('demo-'+i)).map(candidate),question:{id:'demo-color',text:'你记得封面里有没有大面积的蓝绿色？'}}}
export { demoProvider };
