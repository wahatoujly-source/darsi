// درسي — offline support. Bump VERSION on every deploy.
const VERSION='darsi-v120';
const SHELL=['./','./index.html','./manifest.json','./account.js','./icons/icon-192.png','./icons/icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(VERSION).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;
  const url=new URL(r.url);
  const isPage=r.mode==='navigate';
  // الصفحات العامة (/g/ و /l/ و sitemap…) تمرّ إلى الشبكة كما هي ولا تُخزَّن مكان التطبيق
  if(isPage&&/^\/(g|l|og)\//.test(url.pathname))return;
  if(isPage){ // network first, so new lessons appear; cache as fallback offline (only the app shell itself)
    e.respondWith(fetch(r).then(res=>{if(res.ok&&/^\/(index\.html)?$/.test(url.pathname)){const cp=res.clone();caches.open(VERSION).then(c=>c.put('./index.html',cp));}return res;}).catch(()=>caches.match('./index.html')));return;}
  if(url.origin===location.origin||/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)||(url.hostname==='www.gstatic.com'&&url.pathname.startsWith('/firebasejs/'))){ // stale-while-revalidate
    e.respondWith(caches.open(VERSION).then(async c=>{const hit=await c.match(r);const net=fetch(r).then(res=>{if(res&&(res.ok||res.type==='opaque'))c.put(r,res.clone());return res;}).catch(()=>hit);return hit||net;}));}
});

// إشعارات Firebase Cloud Messaging (رسائل data) — نعرضها بأنفسنا ونفتح الرابط عند الضغط
self.addEventListener('push',e=>{let d={};try{const j=e.data?e.data.json():{};d=j.data||j.notification||j;}catch(x){d={title:'المجتهد',body:e.data?e.data.text():''};}
  e.waitUntil(self.registration.showNotification(d.title||'المجتهد',{body:d.body||'',icon:'icons/icon-192.png',badge:'icons/icon-192.png',dir:'rtl',lang:'ar',tag:d.tag||undefined,renotify:!!d.tag,data:{link:d.link||'#home'}}));});
self.addEventListener('notificationclick',e=>{e.notification.close();const url=new URL('./'+((e.notification.data&&e.notification.data.link)||'#home'),self.registration.scope).href;
  e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(cs=>{for(const c of cs){if('focus' in c){if(c.navigate)c.navigate(url).catch(()=>{});return c.focus();}}return clients.openWindow(url);}));});
