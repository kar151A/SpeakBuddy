import { defaults } from './catalog.js';

let opening;
function database() {
  if (!opening) opening = new Promise((resolve,reject)=>{
    const req = indexedDB.open('speakbuddy-studio',1);
    req.onupgradeneeded=()=>{
      req.result.createObjectStore('settings');
      req.result.createObjectStore('reports',{keyPath:'id'});
    };
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
  return opening;
}
async function operation(store,mode,work) {
  const db=await database();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(store,mode);
    const req=work(tx.objectStore(store));
    tx.oncomplete=()=>resolve(req?.result);
    tx.onabort=tx.onerror=()=>reject(tx.error || Error('Storage unavailable'));
  });
}
export async function loadDevice() {
  const prefs={...defaults,...await operation('settings','readonly',s=>s.get('profile'))};
  const list=await operation('reports','readonly',s=>s.getAll());
  const cutoff=Date.now()-30*86400000;
  const keep=list.filter(r=>Date.parse(r.date)>=cutoff);
  for (const r of list) if (Date.parse(r.date)<cutoff) await operation('reports','readwrite',s=>s.delete(r.id));
  return {prefs,reports:keep.sort((a,b)=>b.date.localeCompare(a.date))};
}
export const savePrefs=p=>operation('settings','readwrite',s=>s.put(p,'profile'));
export const saveLocal=r=>operation('reports','readwrite',s=>s.put(r));
export async function clearLocal() {
  const db=await database();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(['settings','reports'],'readwrite');
    tx.objectStore('settings').clear();
    tx.objectStore('reports').clear();
    tx.oncomplete=resolve;
    tx.onabort=tx.onerror=()=>reject(tx.error);
  });
}
export function practicePatterns(reports) {
  const counts=new Map();
  for (const r of reports) for (const c of r.corrections) counts.set(c.tag,(counts.get(c.tag)||0)+1);
  return [...counts].sort((a,b)=>b[1]-a[1]);
}
export function week(reports,today=new Date()) {
  const start=new Date(today);
  start.setHours(0,0,0,0);
  start.setDate(start.getDate()-((start.getDay()+6)%7));
  return Array.from({length:7},(_,i)=>{
    const day=new Date(start); day.setDate(day.getDate()+i);
    return {day,active:reports.some(r=>new Date(r.date).toDateString()===day.toDateString()),today:day.toDateString()===today.toDateString()};
  });
}
