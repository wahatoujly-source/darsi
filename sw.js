// درسي — offline support. Bump VERSION on every deploy.
const VERSION='darsi-v16';
const SHELL=['./','./index.html','./manifest.json','./icons/icon-192.png','./icons/icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(VERSION).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;
  const url=new URL(r.url);
  const isPage=r.mode==='navigate';
  if(isPage){ // network first, so new lessons appear; cache as fallback offline
    e.respondWith(fetch(r).then(res=>{const cp=res.clone();caches.open(VERSION).then(c=>c.put('./index.html',cp));return res;}).catch(()=>caches.match('./index.html')));return;}
  if(url.origin===location.origin||/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)){ // stale-while-revalidate
    e.respondWith(caches.open(VERSION).then(async c=>{const hit=await c.match(r);const net=fetch(r).then(res=>{if(res&&(res.ok||res.type==='opaque'))c.put(r,res.clone());return res;}).catch(()=>hit);return hit||net;}));}
});
