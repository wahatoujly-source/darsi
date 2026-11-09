// المجتهد — الحسابات: الدخول (هاتف، إيميل، Google)، الأدوار، ملفات الأبناء، حفظ التقدّم في السحابة.
import initTeach from './teach.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup, signInWithRedirect, signInAnonymously,
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  sendPasswordResetEmail, updateProfile } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js';
import { getMessaging, getToken, deleteToken, isSupported } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging.js';
import { getFirestore, doc, getDoc, setDoc, getDocs, collection, deleteDoc, serverTimestamp, query, where }
  from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'AIzaSyDiTpH5RF5c1Wd9M6RKy-j22mTeOBGKr9g',
  authDomain: 'mujtahid-810d7.firebaseapp.com',
  projectId: 'mujtahid-810d7',
  storageBucket: 'mujtahid-810d7.firebasestorage.app',
  messagingSenderId: '461631006811',
  appId: '1:461631006811:web:fb082c0b138771f02cf77e',
  measurementId: 'G-3JS9RCT2QM'
};
const fb = initializeApp(firebaseConfig);
const auth = getAuth(fb); auth.languageCode = 'ar';
const db = getFirestore(fb);
const fns = getFunctions(fb, 'europe-west1');
const call = (name, data) => httpsCallable(fns, name)(data).then(r => r.data);
window.ACC_CALL = call;

const fnErr = e => (e && e.message && !/^internal$|^INTERNAL$/.test(e.message)) ? e.message : 'تعذّر الاتصال بالخادم. حاول لاحقاً.';

const D = window.DARSI; const { el, go, store } = D;
const deviceId = (() => { let d = store.get('device_id', null); if (!d) { d = 'd' + crypto.getRandomValues(new Uint32Array(4)).join(''); store.set('device_id', d); } return d; })();
const MAX_KIDS = 5;
const isAdult = () => !!(ACC.profile && ['parent', 'teacher'].includes(ACC.profile.role));
const kidsOf = () => ACC.profiles.filter(p => p.id !== 'me');
const AVATARS = ['🦁','🐯','🐼','🐨','🦊','🐸','🐵','🦄','🐢','🐬','🦉','🐝'];
const ROLES = { student: ['🧒', 'طالب', 'أدرس دروسي بنفسي'], parent: ['👨‍👩‍👧', 'ولي أمر', 'أتابع حتى 5 من أبنائي'], teacher: ['👩‍🏫', 'معلم', 'أستعمل الدروس مع طلابي، ويمكنني إضافة أبنائي'] };
const GRADES = [['1','الأول'],['2','الثاني'],['3','الثالث'],['4','الرابع'],['5','الخامس'],['6','السادس'],['7','السابع'],['8','الثامن'],['9','التاسع']];
const gradeName = g => (GRADES.find(x => x[0] === String(g)) || [, ''])[1];

const ACC = window.ACC = { user: null, profile: null, profiles: [], pid: store.get('acc_pid', null), ready: false, call };

/* ---------- push notifications (FCM web push) ---------- */
const IOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const standalone = () => (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
const osName = () => IOS ? 'ios' : /Android/.test(navigator.userAgent) ? 'android' : 'desktop';
ACC.pushState = async () => {
  if (IOS && !standalone()) return 'ios-install';
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return 'unsupported';
  try { if (!(await isSupported())) return 'unsupported'; } catch (e) { return 'unsupported'; }
  return Notification.permission; };
let MSG = null;
const pushToken = async () => { MSG = MSG || getMessaging(fb); const reg = await navigator.serviceWorker.ready; return getToken(MSG, { serviceWorkerRegistration: reg }); };
ACC.enablePush = async () => {
  const p = await Notification.requestPermission(); if (p !== 'granted') return p;
  const t = await pushToken(); await call('pushReg', { token: t, pid: ACC.kid ? ACC.kid.pid : 'me', os: osName() });
  store.set('push_t', t); store.set('push_at', Date.now()); return 'granted'; };
ACC.disablePush = async () => { const t = store.get('push_t', ''); try { if (t) await call('pushReg', { token: t, off: true }); } catch (e) {} try { MSG = MSG || getMessaging(fb); await deleteToken(MSG); } catch (e) {} store.set('push_t', ''); };
async function pushRefresh() { // مرة يومياً: تحديث رمز الجهاز + آخر ظهور
  try { if (!ACC.user || (ACC.user.isAnonymous && !ACC.kid)) return; if (store.get('push_at', 0) > Date.now() - 20 * 3600e3) return;
    let t = ''; if ((await ACC.pushState()) === 'granted') { try { t = await pushToken(); store.set('push_t', t); } catch (e) {} }
    await call('pushReg', t ? { token: t, pid: ACC.kid ? ACC.kid.pid : 'me', os: osName() } : {}); store.set('push_at', Date.now()); } catch (e) {} }
/* soft prompt on the home page (never the browser prompt on first sight) */
ACC.pushCard = () => {
  if (!ACC.user || (ACC.user.isAnonymous && !ACC.kid)) return null;
  if (store.get('push_later', 0) > Date.now() - 4 * 864e5) return null;
  const w = el('div');
  ACC.pushState().then(st => {
    if (!['default', 'ios-install'].includes(st)) return;
    if (st === 'ios-install' && store.get('push_ios_seen', 0) > Date.now() - 14 * 864e5) return;
    const kidsN = (ACC.profiles || []).filter(p => p.id !== 'me').length;
    const txt = ACC.kid ? 'فعّل الإشعارات ليصلك تذكير بدروسك وتحدياتك اليومية.' : kidsN ? 'فعّل الإشعارات ليصلك تقرير أسبوعي عن ' + (kidsN > 1 ? 'أبنائك' : 'ابنك') + '، وتذكير بالدروس، وكل جديد في المنصة.' : 'فعّل الإشعارات ليصلك كل جديد: دروس جديدة، تذكير يومي، وعروض الاشتراك.';
    const m = el('div');
    const later = el('button', { class: 'btn ghost sm', text: 'لاحقاً', onclick: () => { store.set('push_later', Date.now()); if (st === 'ios-install') store.set('push_ios_seen', Date.now()); w.remove(); } });
    w.append(el('div', { class: 'panel', style: 'display:flex;flex-direction:column;gap:8px;border:2px solid #f59e0b;margin:10px 0' },
      el('b', { text: '🔔 لا تفوّت شيئاً' }), el('span', { class: 'note', text: st === 'ios-install' ? 'على آيفون تصل الإشعارات فقط بعد تثبيت المنصة: اضغط زر المشاركة ⬆️ في Safari، ثم «إضافة إلى الشاشة الرئيسية»، وافتح المنصة من أيقونتها.' : txt }),
      el('div', { class: 'row', style: 'gap:8px' }, st === 'default' ? el('button', { class: 'btn sun sm', text: '🔔 تفعيل الإشعارات', onclick: async e => { e.target.disabled = true;
        try { const r = await ACC.enablePush(); if (r === 'granted') { w.innerHTML = ''; w.append(el('div', { class: 'feedback ok', text: '✓ تم تفعيل الإشعارات.' })); setTimeout(() => w.remove(), 3000); }
          else { fbk(m, 'info', 'لم تُفعَّل. يمكنك تفعيلها لاحقاً من «حسابي».'); store.set('push_later', Date.now()); } } catch (er) { fbk(m, 'bad', 'تعذّر التفعيل على هذا الجهاز.'); } e.target.disabled = false; } }) : null, later), m)); });
  return w; };
/* row in «حسابي» */
function pushRow() {
  const box = el('div', { class: 'panel accbox' }, el('b', { text: '🔔 الإشعارات على هذا الجهاز' })); const m = el('div');
  const draw = st => { [...box.children].slice(1).forEach(x => x.remove());
    const T = { granted: '✅ مفعّلة', denied: '⛔ مرفوضة من إعدادات المتصفح. لتفعيلها: افتح إعدادات الموقع في المتصفح (رمز القفل بجانب العنوان) واسمح بالإشعارات.', default: 'غير مفعّلة', unsupported: 'هذا المتصفح لا يدعم الإشعارات. جرّب Chrome.', 'ios-install': 'على آيفون: أضف المنصة إلى الشاشة الرئيسية (زر المشاركة ⬆️ ← «إضافة إلى الشاشة الرئيسية») ثم افتحها من الأيقونة وفعّل الإشعارات من هنا.' };
    box.append(el('span', { class: 'note', text: T[st] || st }));
    if (st === 'default') box.append(el('button', { class: 'btn sun', text: '🔔 تفعيل الإشعارات', onclick: async () => { try { draw(await ACC.enablePush()); } catch (e) { fbk(m, 'bad', 'تعذّر التفعيل.'); } } }));
    if (st === 'granted') box.append(el('button', { class: 'btn ghost sm', text: 'إيقاف الإشعارات على هذا الجهاز', onclick: async () => { await ACC.disablePush(); fbk(m, 'ok', '✓ أُوقفت.'); } }));
    box.append(m); };
  ACC.pushState().then(draw); return box;
}


/* ---------- Arabic error messages ---------- */
const ERR = {
  'auth/invalid-phone-number': 'رقم الهاتف غير صحيح.',
  'auth/invalid-verification-code': 'الرمز غير صحيح. تأكد منه وحاول مرة أخرى.',
  'auth/code-expired': 'انتهت صلاحية الرمز. اطلب رمزاً جديداً.',
  'auth/too-many-requests': 'محاولات كثيرة. انتظر قليلاً ثم حاول مرة أخرى.',
  'auth/invalid-email': 'البريد الإلكتروني غير صحيح.',
  'auth/invalid-credential': 'البريد أو كلمة المرور غير صحيحة.',
  'auth/wrong-password': 'كلمة المرور غير صحيحة.',
  'auth/user-not-found': 'لا يوجد حساب بهذا البريد. أنشئ حساباً جديداً.',
  'auth/email-already-in-use': 'هذا البريد مسجّل من قبل. ادخل بكلمة المرور.',
  'auth/weak-password': 'كلمة المرور قصيرة. اكتب 6 أحرف أو أكثر.',
  'auth/network-request-failed': 'لا يوجد اتصال بالإنترنت.',
  'auth/popup-closed-by-user': 'أُغلقت نافذة جوجل قبل إتمام الدخول.',
  'auth/unauthorized-domain': 'هذا الموقع غير مسموح له بالدخول بعد (Authorized domains).',
  'auth/operation-not-allowed': 'طريقة الدخول هذه غير مفعّلة بعد.'
};
const errMsg = e => ERR[e && e.code] || 'حدث خطأ غير متوقع. حاول مرة أخرى.';
const fbk = (box, cls, text) => { box.innerHTML = ''; box.append(el('div', { class: 'feedback ' + cls, text })); };

/* ---------- Libyan phone numbers: 091/092/093/094/095 ---------- */
const PHONE_DOMAIN = '@phone.mujtahid.ly';
const phoneEmail = n => n.slice(1) + PHONE_DOMAIN;               // +218912345678 -> 218912345678@phone.mujtahid.ly
const phoneOf = u => u && u.email && u.email.endsWith(PHONE_DOMAIN) ? '+' + u.email.slice(0, -PHONE_DOMAIN.length) : null;
function libyanPhone(raw) {
  const d = String(raw).replace(/[^\d٠-٩]/g, '').replace(/[٠-٩]/g, c => '٠١٢٣٤٥٦٧٨٩'.indexOf(c));
  const m = /^(?:00218|218|0)?(9[1-5]\d{7})$/.exec(d);
  return m ? '+218' + m[1] : null;
}

/* ---------- Firestore paths ---------- */
/* a linked child's device reads/writes the parent's data for that one child */
/* ---------- second parent (e.g. the mother) ---------- */
function coParentBox() {
  const box = el('div', { class: 'panel accbox' }); const msg = el('div');
  if (ACC.co) { box.append(el('b', { text: '👨‍👩‍👧 حساب مرتبط' }), el('span', { class: 'note', text: 'أنت مرتبط بحساب ولي الأمر الأساسي: ترى الأبناء وتقاريرهم وجداولهم وتتحكم فيها، ما عدا إضافة أو حذف ابن.' }),
      el('button', { class: 'btn ghost sm', text: 'إلغاء الارتباط', onclick: async e => { const b = e.currentTarget; if (b.dataset.c !== '1') { b.dataset.c = '1'; b.textContent = 'تأكيد إلغاء الارتباط'; return; }
        try { await call('removeCoParent', {}); await auth.currentUser.getIdToken(true); location.reload(); } catch (x) { fbk(msg, 'bad', fnErr(x)); } } }), msg); return box; }
  box.append(el('b', { text: '👨‍👩‍👧 أضف ولي أمر آخر (الأم أو الأب)' }), el('span', { class: 'note', text: 'يرى الأبناء وتقاريرهم ويتحكم في جداولهم بنفس صلاحياتك، ما عدا إضافة أو حذف ابن. يمكنك إزالته في أي وقت.' }));
  const list = el('div'), out = el('div');
  const load = async () => { list.innerHTML = ''; try { const q = await getDocs(collection(db, 'users', ACC.user.uid, 'coParents'));
    q.forEach(d => list.append(el('div', { class: 'kidrow' }, el('span', { text: '👤' }), el('b', { text: d.data().name || 'ولي أمر' }),
      el('button', { class: 'btn ghost sm', text: 'إزالة', onclick: async e => { e.target.disabled = true; try { await call('removeCoParent', { co: d.id }); load(); } catch (x) { fbk(msg, 'bad', fnErr(x)); e.target.disabled = false; } } })))); } catch (e) {} };
  const gen = el('button', { class: 'btn sun', text: '🔗 أنشئ رمز ربط', onclick: async () => { gen.disabled = true; out.innerHTML = '';
    try { const r = await call('createCoCode', {}); out.append(el('div', { class: 'linkcode', dir: 'ltr', text: r.code.slice(0, 3) + ' ' + r.code.slice(3) }),
      el('span', { class: 'note', text: 'على هاتف ولي الأمر الآخر: يسجّل الدخول بحسابه (رقمه أو بريده)، ثم «حسابي» ← «عندي رمز من ولي الأمر» ويكتب الرقم. صالح 15 دقيقة.' }));
      setTimeout(load, 20000); } catch (x) { fbk(msg, 'bad', fnErr(x)); } gen.disabled = false; } });
  box.append(list, gen, out, msg); load(); return box;
}
function coRedeemBox() {
  const inp = el('input', { type: 'text', inputmode: 'numeric', maxlength: 6, placeholder: '000000', dir: 'ltr', style: 'font-size:1.6rem;text-align:center;letter-spacing:.3em' }); const msg = el('div');
  const btn = el('button', { class: 'btn', text: '🔗 اربط حسابي', onclick: async () => { const code = inp.value.replace(/[٠-٩]/g, c => '٠١٢٣٤٥٦٧٨٩'.indexOf(c)).replace(/\D/g, '');
    if (code.length !== 6) { fbk(msg, 'bad', 'الرمز 6 أرقام.'); return; } btn.disabled = true;
    try { const r = await call('redeemCoCode', { code, name: (ACC.profile && ACC.profile.name) || '' }); await auth.currentUser.getIdToken(true); fbk(msg, 'ok', '✓ تم الربط بحساب ' + (r.owner || 'ولي الأمر'));
      setTimeout(() => { location.hash = 'who'; location.reload(); }, 900); } catch (x) { fbk(msg, 'bad', fnErr(x)); btn.disabled = false; } } });
  return el('div', { class: 'panel accbox' }, el('b', { text: '🔑 عندي رمز من ولي الأمر' }), el('span', { class: 'note', text: 'إذا أرسل لك ولي الأمر الآخر رمز ربط، اكتبه هنا لترى الأبناء وتتابعهم.' }), inp, btn, msg);
}
const OW = () => ACC.kid ? ACC.kid.parent : ACC.co ? ACC.co.owner : ACC.user.uid;
const uref = () => doc(db, 'users', ACC.user.uid);
const pcol = () => collection(db, 'users', OW(), 'profiles');
const pref = pid => doc(db, 'users', OW(), 'profiles', pid);
const prog = (pid, lid) => doc(db, 'users', OW(), 'profiles', pid, 'progress', lid);

async function loadProfiles() { const s = await getDocs(pcol()); ACC.profiles = s.docs.map(d => ({ id: d.id, ...d.data() })); }

/* progress for the active child lives in localStorage under p_<pid>_done_<lesson> (see store in index.html) */
async function pullProgress(pid) {
  try { const s = await getDocs(collection(db, 'users', OW(), 'profiles', pid, 'progress'));
    s.forEach(d => { try { localStorage.setItem('darsi_p_' + pid + '_done_' + d.id, JSON.stringify(d.data().done || [])); } catch (e) {} });
  } catch (e) { console.warn('progress', e); }
}
/* first profile inherits whatever the child did on this device before signing in */
async function migrateLocal(pid) {
  const keys = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (/^darsi_done_/.test(k)) keys.push(k); }
  for (const k of keys) { const lid = k.slice('darsi_done_'.length); let done = []; try { done = JSON.parse(localStorage.getItem(k)) || []; } catch (e) {}
    if (done.length) { localStorage.setItem('darsi_p_' + pid + '_' + k.slice(6), JSON.stringify(done)); setDoc(prog(pid, lid), { done, at: serverTimestamp() }).catch(() => {}); } }
}
ACC.saveProgress = (lid, done) => { if (!ACC.user || !ACC.pid) return; setDoc(prog(ACC.pid, lid), { done, at: serverTimestamp() }).catch(e => console.warn('save', e)); };

ACC.saveBoard = (day, grade, e) => { if (!ACC.user || !ACC.pid || !grade) return; const p = ACC.profiles.find(x => x.id === ACC.pid); if (!p || p.board === false) return;
  const id = OW() + '_' + ACC.pid; const n = String(p.name || (ACC.profile && ACC.profile.name) || 'طالب').trim().split(/\s+/)[0].slice(0, 20);
  setDoc(doc(db, 'boards', day + '_g' + grade, 'e', id), { n, av: p.avatar || '🙂', pts: Math.min(3000, Math.max(0, Math.round(e.pts))), st: e.st | 0, r: e.r | 0, m: Math.round(e.m || 0), g: String(grade), at: serverTimestamp() }).catch(e2 => console.warn('board', e2)); };
ACC.loadBoard = async (day, grade) => { const q = await getDocs(collection(db, 'boards', day + '_g' + grade, 'e')); return q.docs.map(d => ({ id: d.id, me: d.id === OW() + '_' + ACC.pid, ...d.data() })).sort((a, b) => b.pts - a.pts); };
ACC.saveStats = st => { if (!ACC.user || !ACC.pid) return; const p = ACC.profiles.find(x => x.id === ACC.pid); if (!p) return;
  p.stats = { ...st, at: Date.now() };
  setDoc(pref(ACC.pid), ACC.kid ? { stats: { ...st, at: serverTimestamp() } } : { name: p.name, stats: { ...st, at: serverTimestamp() } }, { merge: true }).catch(e => console.warn('stats', e)); };
/* bring the profile's goal + minutes/days from the cloud into this device (max per day wins) */
function pullStats(pid) {
  const p = ACC.profiles.find(x => x.id === pid); if (!p) return; const k = n => 'darsi_p_' + pid + '_' + n;
  const rd = (n, d) => { try { return JSON.parse(localStorage.getItem(k(n))) ?? d; } catch (e) { return d; } };
  const wr = (n, v) => { try { localStorage.setItem(k(n), JSON.stringify(v)); } catch (e) {} };
  if (p.goal) wr('g_goal', p.goal);
  const m = rd('g_mins', {}), cm = (p.stats && p.stats.mins) || {}; Object.keys(cm).forEach(d => { if ((cm[d] || 0) > (m[d] || 0)) m[d] = cm[d]; }); wr('g_mins', m);
  const days = new Set(rd('g_days', [])); Object.keys(cm).forEach(d => { if (cm[d] >= 1) days.add(d); }); wr('g_days', [...days].sort().slice(-120));
}
async function setActive(pid) {
  ACC.pid = pid; store.set('acc_pid', pid);
  if (pid && ACC.user) { pullStats(pid); await pullProgress(pid); }
}
const activeProfile = () => ACC.profiles.find(p => p.id === ACC.pid) || null;

/* ---------- header pill ---------- */
ACC.pill = () => {
  if (!ACC.ready) return null;
  if (!ACC.user) return el('button', { class: 'pill dup', onclick: () => go('login'), text: '👤 دخول' });
  const p = activeProfile();
  if (!p || ACC.kid) return el('button', { class: 'pill dup', onclick: () => go('account'), text: '👤 حسابي' });
  return el('button', { class: 'pill', title: 'تبديل الطالب', onclick: () => go(isAdult() ? 'who' : 'account'), text: (p.avatar || '🙂') + ' ' + p.name + (isAdult() ? ' 🔄' : '') });
};

/* ---------- pages ---------- */
const page = (title, sub, back) => { D.root.innerHTML = ''; D.root.append(D.bar(title, sub, back)); const s = el('section', { class: 'stack acc' }); D.root.append(s); return s; };

/* ---------- sign-in / sign-up: one elegant page with three ways (Google, phone, email) ---------- */
const ROLE_HERO = { parent: ['👨‍👩‍👧', 'أنشئ حساب ولي الأمر', 'تابع أبناءك وتقاريرهم وجدولهم الدراسي من مكان واحد.'], student: ['🎒', 'أنشئ حسابك يا بطل', 'احفظ نجومك وتقدّمك وتنافس زملاءك في لوحة الأبطال.'], teacher: ['👩‍🏫', 'أنشئ حساب المعلم', 'راجع الدروس واصنع الاختبارات لطلابك.'] };
function authHero(sub) { const r = ROLE_HERO[store.get('pref_role', '')] || ['✨', 'مرحباً بك في المجتهد', 'سجّل لتحفظ النجوم والتقدّم على أي جهاز.'];
  return el('div', { class: 'au-hero' }, el('div', { class: 'au-logo' }, el('img', { src: 'icons/icon-512.png', alt: 'المجتهد' })), el('h1', { text: sub || r[1] }), el('p', { text: r[2] })); }
function renderLogin() {
  if (ACC.user) { go(ACC.profile ? 'account' : 'onboard'); return; }
  const root = D.root; root.innerHTML = ''; const msg = el('div', { class: 'au-msg' });
  const gBtn = el('button', { class: 'au-row g', onclick: async () => {
    msg.innerHTML = ''; const pr = new GoogleAuthProvider(); pr.setCustomParameters({ prompt: 'select_account' });
    try { await signInWithPopup(auth, pr); }
    catch (e) { if (['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment', 'auth/cancelled-popup-request'].includes(e.code)) await signInWithRedirect(auth, pr); else fbk(msg, 'bad', errMsg(e)); }
  } }, el('span', { class: 'ri', html: '<svg viewBox="0 0 48 48" width="22" height="22"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>' }), el('span', {}, el('b', { text: 'المتابعة بحساب Google' }), el('small', { text: 'بضغطة واحدة' })), el('span', { class: 'tag', text: 'الأسرع' }));
  const opt = (cls, ic, t, d, to) => el('button', { class: 'au-row ' + cls, onclick: () => go(to) }, el('span', { class: 'ri', text: ic }), el('span', {}, el('b', { text: t }), el('small', { text: d })), el('span', { class: 'rg', text: '←' }));
  root.append(el('section', { class: 'au' }, el('button', { class: 'au-back', text: '→', 'aria-label': 'رجوع', onclick: () => go(store.get('welcomed', false) ? 'start' : 'home') }),
    authHero(),
    el('div', { class: 'au-group' }, gBtn, opt('e', '✉️', 'البريد الإلكتروني', 'ببريدك وكلمة مرور', 'login-email'), opt('p', '📱', 'رقم الهاتف', 'برقمك الليبي وكلمة مرور', 'login-phone')), msg,
    el('button', { class: 'st-link', style: 'color:var(--muted);font-weight:600', text: 'تصفّح الدروس المجانية دون تسجيل', onclick: () => go('home') }),
    el('p', { class: 'note au-legal', style: 'margin:0' }, 'بالمتابعة أنت توافق على ', el('a', { href: '#privacy', text: 'الشروط وسياسة الخصوصية' }), '.'),
    el('div', { class: 'au-or', text: 'للطلاب' }),
    el('button', { class: 'au-kid', onclick: () => go('link') }, el('span', { class: 'ri', text: '🧒' }), el('span', {}, el('b', { text: 'أنا طالب، عندي رمز من ولي أمري' }), el('small', { text: 'أدخل الرمز أو امسح QR' })), el('span', { class: 'rg', style: 'color:var(--muted)', text: '←' }))));
}
function authForm(kind) {
  if (ACC.user) { go(ACC.profile ? 'account' : 'onboard'); return; }
  const root = D.root; root.innerHTML = ''; const msg = el('div'); let mode = 'new';
  const isPhone = kind === 'phone';
  const id = isPhone ? el('input', { class: 'au-in', type: 'tel', inputmode: 'numeric', placeholder: '09X XXX XXXX', 'aria-label': 'رقم الهاتف', autocomplete: 'tel', dir: 'ltr' })
    : el('input', { class: 'au-in', type: 'email', placeholder: 'example@gmail.com', 'aria-label': 'البريد الإلكتروني', autocomplete: 'email', dir: 'ltr' });
  const pw = el('input', { class: 'au-in', type: 'password', placeholder: 'كلمة المرور (6 أحرف أو أكثر)', 'aria-label': 'كلمة المرور', autocomplete: 'new-password' });
  const eye = el('button', { class: 'au-eye', type: 'button', text: '👁️', onclick: () => { pw.type = pw.type === 'password' ? 'text' : 'password'; } });
  const tabs = el('div', { class: 'au-tabs' }); const go_ = el('button', { class: 'au-main' }); const extra = el('div');
  const draw = () => { tabs.innerHTML = ''; [['new', 'حساب جديد'], ['in', 'لدي حساب']].forEach(([k, t]) => tabs.append(el('button', { class: k === mode ? 'on' : '', text: t, onclick: () => { mode = k; msg.innerHTML = ''; draw(); } })));
    go_.textContent = mode === 'new' ? 'إنشاء الحساب ←' : 'دخول ←'; pw.autocomplete = mode === 'new' ? 'new-password' : 'current-password';
    extra.innerHTML = ''; if (mode === 'in') extra.append(el('button', { class: 'linkbtn', text: 'نسيت كلمة المرور؟', onclick: async () => {
      if (isPhone) { fbk(msg, 'info', 'تواصل معنا لإعادة تعيين كلمة المرور، أو سجّل الدخول ببريدك أو بحساب Google.'); return; }
      if (!id.value.trim()) { fbk(msg, 'info', 'اكتب بريدك أولاً ثم اضغط «نسيت كلمة المرور».'); return; }
      try { await sendPasswordResetEmail(auth, id.value.trim()); fbk(msg, 'ok', 'أرسلنا رابط تغيير كلمة المرور إلى بريدك.'); } catch (e) { fbk(msg, 'bad', errMsg(e)); } } })); };
  go_.onclick = async () => { msg.innerHTML = ''; const create = mode === 'new';
    if ((pw.value || '').length < 6) { fbk(msg, 'bad', 'كلمة المرور 6 أحرف أو أكثر.'); return; }
    let login = id.value.trim();
    if (isPhone) { const n = libyanPhone(login); if (!n) { fbk(msg, 'bad', 'اكتب رقماً ليبياً يبدأ بـ 091 أو 092 أو 093 أو 094 أو 095.'); return; } login = phoneEmail(n); }
    go_.disabled = true; go_.classList.add('busy');
    try { create ? await createUserWithEmailAndPassword(auth, login, pw.value) : await signInWithEmailAndPassword(auth, login, pw.value); }
    catch (e) { fbk(msg, 'bad', e.code === 'auth/email-already-in-use' ? (isPhone ? 'هذا الرقم مسجّل من قبل. اختر «لدي حساب».' : 'هذا البريد مسجّل من قبل. اختر «لدي حساب».') : e.code === 'auth/invalid-credential' ? (isPhone ? 'الرقم أو كلمة المرور غير صحيحة.' : 'البريد أو كلمة المرور غير صحيحة.') : errMsg(e)); }
    go_.disabled = false; go_.classList.remove('busy'); };
  draw();
  root.append(el('section', { class: 'au' }, el('button', { class: 'au-back', text: '→', 'aria-label': 'رجوع', onclick: () => go('login') }),
    authHero(isPhone ? 'التسجيل برقم الهاتف' : 'التسجيل بالبريد الإلكتروني'),
    el('div', { class: 'au-card' }, tabs, el('label', { class: 'au-lab', text: isPhone ? 'رقم الهاتف' : 'البريد الإلكتروني' }), id,
      el('label', { class: 'au-lab', text: 'كلمة المرور' }), el('div', { class: 'au-pw' }, pw, eye), go_, extra, msg,
      isPhone ? el('p', { class: 'note', text: 'لن نرسل لك رسالة الآن. نؤكد رقمك برسالة قصيرة واحدة فقط عند الاشتراك.' }) : null)));
  setTimeout(() => id.focus(), 50);
}

function renderOnboard() {
  if (!ACC.user) { go('login'); return; }
  if (ACC.profile) { go('account'); return; }
  const s = page('مرحباً بك في المجتهد', 'خطوة واحدة ونبدأ', null);
  const msg = el('div');
  let role = ['parent', 'student', 'teacher'].includes(store.get('pref_role', '')) ? store.get('pref_role', '') : null, grade = null, avatar = AVATARS[0];
  const name = el('input', { class: 'tinput', placeholder: 'الاسم', 'aria-label': 'الاسم', value: ACC.user.displayName || '' });
  const roles = el('div', { class: 'plans' }), kidBox = el('div', { class: 'stack', hidden: true });
  const draw = () => { roles.innerHTML = ''; Object.entries(ROLES).forEach(([k, [ic, t, d]]) => roles.append(el('button', { class: 'plan', 'aria-pressed': String(role === k), onclick: () => { role = k; draw(); } }, el('b', { text: ic + ' ' + t }), el('span', { class: 'note', text: d }))));
    kidBox.hidden = role !== 'student'; };
  const gsel = el('div', { class: 'gpick' }); const drawG = () => { gsel.innerHTML = ''; GRADES.forEach(([g, n]) => gsel.append(el('button', { class: 'btn ghost sm' + (grade === g ? ' on' : ''), text: n, onclick: () => { grade = g; drawG(); } }))); }; drawG();
  const av = el('div', { class: 'avpick' }); const drawA = () => { av.innerHTML = ''; AVATARS.forEach(a => av.append(el('button', { class: 'av' + (a === avatar ? ' on' : ''), text: a, onclick: () => { avatar = a; drawA(); } }))); }; drawA();
  kidBox.append(el('b', { text: 'صفك الدراسي' }), gsel, el('b', { text: 'اختر صورتك' }), av);
  draw();
  const save = el('button', { class: 'btn sun paybig', text: 'ابدأ', onclick: async () => {
    const nm = name.value.trim();
    if (nm.length < 2) { fbk(msg, 'bad', 'اكتب الاسم.'); return; }
    if (!role) { fbk(msg, 'bad', 'اختر: طالب أو ولي أمر أو معلم.'); return; }
    if (role === 'student' && !grade) { fbk(msg, 'bad', 'اختر صفك الدراسي.'); return; }
    save.disabled = true;
    try {
      const u = ACC.user;
      const data = { name: nm, role, phone: phoneOf(u) || u.phoneNumber || null, email: phoneOf(u) ? null : (u.email || null), createdAt: serverTimestamp() };
      await setDoc(uref(), data);
      try { await updateProfile(u, { displayName: nm }); } catch (e) {}
      ACC.profile = data;
      await claimRef();
      if (role === 'parent') { ACC.profiles = []; go('kids'); return; }
      await setDoc(pref('me'), { name: nm, grade: grade || null, avatar: role === 'teacher' ? '👩‍🏫' : avatar, createdAt: serverTimestamp() });
      await loadProfiles(); await migrateLocal('me'); await setActive('me');
      D.cheer && D.cheer('win'); go(grade ? 'g' + grade : 'home');
    } catch (e) { save.disabled = false; fbk(msg, 'bad', errMsg(e)); console.error(e); }
  } });
  s.append(el('div', { class: 'panel accbox' }, el('b', { text: 'ما اسمك؟' }), name), el('b', { text: 'من أنت؟' }), roles, kidBox, msg, save);
}

/* ---------- parent: manage children ---------- */
function renderKids() {
  if (!ACC.user || !ACC.profile) { go('login'); return; }
  const s = page('أبنائي', 'حتى ' + MAX_KIDS + ' أبناء في حساب واحد', 'who');
  if (ACC.co) { s.append(el('div', { class: 'feedback info', text: 'أنت مرتبط بحساب ولي الأمر الأساسي. إضافة الأبناء أو حذفهم تتم من حسابه.' }), el('div', { class: 'stack' }, ...kidsOf().map(p => el('div', { class: 'kidrow' }, el('span', { class: 'kav', text: p.avatar || '🙂' }), el('b', { text: p.name + ' — الصف ' + gradeName(p.grade) })))), el('button', { class: 'btn sun', text: 'تم ←', onclick: () => go('who') })); return; }
  const list = el('div', { class: 'stack' }), msg = el('div');
  const draw = () => { list.innerHTML = '';
    if (!kidsOf().length) list.append(el('p', { class: 'note', text: 'لم تضف أحداً بعد. أضف ابنك الأول.' }));
    kidsOf().forEach(p => list.append(el('div', { class: 'kidrow' }, el('span', { class: 'kav', text: p.avatar || '🙂' }), el('span', {}, el('b', { text: p.name }), el('span', { class: 'note', text: ' — الصف ' + gradeName(p.grade) })),
      el('button', { class: 'btn ghost sm', text: 'حذف', onclick: async e => { const b = e.currentTarget; if (b.dataset.c !== '1') { b.dataset.c = '1'; b.textContent = 'تأكيد الحذف'; return; }
        try { await deleteDoc(pref(p.id)); ACC.profiles = ACC.profiles.filter(x => x.id !== p.id); if (ACC.pid === p.id) await setActive(null); draw(); } catch (x) { fbk(msg, 'bad', errMsg(x)); } } })))); };
  draw();
  let grade = null, avatar = AVATARS[1];
  const name = el('input', { class: 'tinput', placeholder: 'اسم الابن أو الابنة', 'aria-label': 'اسم الابن' });
  const gsel = el('div', { class: 'gpick' }); const drawG = () => { gsel.innerHTML = ''; GRADES.forEach(([g, n]) => gsel.append(el('button', { class: 'btn ghost sm' + (grade === g ? ' on' : ''), text: n, onclick: () => { grade = g; drawG(); } }))); }; drawG();
  const av = el('div', { class: 'avpick' }); const drawA = () => { av.innerHTML = ''; AVATARS.forEach(a => av.append(el('button', { class: 'av' + (a === avatar ? ' on' : ''), text: a, onclick: () => { avatar = a; drawA(); } }))); }; drawA();
  const add = el('button', { class: 'btn', text: '＋ أضف', onclick: async () => {
    if (kidsOf().length >= MAX_KIDS) { fbk(msg, 'bad', 'وصلت إلى الحد الأقصى: ' + MAX_KIDS + ' أبناء.'); return; }
    const nm = name.value.trim(); if (nm.length < 2) { fbk(msg, 'bad', 'اكتب الاسم.'); return; } if (!grade) { fbk(msg, 'bad', 'اختر الصف.'); return; }
    add.disabled = true;
    try { const id = 'k' + Date.now().toString(36); const first = !kidsOf().length && ACC.profile.role === 'parent';
      await setDoc(pref(id), { name: nm, grade, avatar, createdAt: serverTimestamp() });
      ACC.profiles.push({ id, name: nm, grade, avatar }); if (first) { await migrateLocal(id); }
      name.value = ''; grade = null; drawG(); draw(); fbk(msg, 'ok', 'تمت إضافة ' + nm + '.');
    } catch (e) { fbk(msg, 'bad', errMsg(e)); }
    add.disabled = false; } });
  s.append(list, el('div', { class: 'panel accbox' }, el('b', { text: 'إضافة ابن' }), name, el('span', { class: 'note', text: 'الصف' }), gsel, el('span', { class: 'note', text: 'الصورة' }), av, add), msg,
    el('button', { class: 'btn sun', text: 'تم ←', onclick: () => go('who') }));
}

/* ---------- parent: who is studying now? ---------- */
function renderWho() {
  if (!ACC.user || !ACC.profile) { go('login'); return; }
  if (!isAdult()) { go('account'); return; }
  const s = page('من يدرس الآن؟', ACC.profile.name, 'home');
  { const tp = trialPick(); if (tp && tp.tagName !== 'DIV' || (tp && !tp.classList.contains('feedback'))) s.append(tp); }
  { const pc = ACC.pushCard(); if (pc) s.append(pc); }
  s.append(el('div', { class: 'row', style: 'gap:8px;flex-wrap:wrap;margin-bottom:6px' }, el('button', { class: 'btn ghost sm', text: '🧮 اختبر مستوى أبنائك في الرياضيات', onclick: () => go('test') }),
    (ACC.access && ACC.access.ref && ACC.access.ref.on === false) ? null : el('button', { class: 'btn ghost sm', text: '🎁 ادعُ عائلة واحصل على أيام مجانية', onclick: () => go('account') })));
  if (ACC.isAdmin) s.append(el('div', { class: 'row', style: 'gap:8px;flex-wrap:wrap;margin-bottom:8px' }, !ACC.can('browse') ? null : el('button', { class: 'btn sun', text: ACC.adminBrowse ? '👁️ وضع المدير مفعّل ← الرئيسية' : '👁️ تصفّح المنصة كمدير (كل الدروس)', onclick: async () => { ACC.adminBrowse = true; store.set('admin_browse', true); await setActive(null); go('home'); } }), el('button', { class: 'btn ghost', text: '🛠️ لوحة الإدارة', onclick: () => go('admin') })));
  const g = el('div', { class: 'whogrid' });
  const me = ACC.profiles.find(p => p.id === 'me');
  if (me) g.append(el('button', { class: 'who' + (ACC.pid === 'me' ? ' on' : ''), onclick: async () => { await setActive('me'); go('home'); } },
    el('span', { class: 'kav big', text: me.avatar || '👩‍🏫' }), el('b', { text: 'أنا' }), el('span', { class: 'note', text: 'المعلم' })));
  kidsOf().forEach(p => { const st = p.stats || {}; const lv = D.GAME.level(st.stars || 0);
    g.append(el('div', { class: 'whobox' }, el('button', { class: 'who' + (p.id === ACC.pid ? ' on' : ''), onclick: async () => { await setActive(p.id); go('g' + p.grade); } },
      el('span', { class: 'kav big', text: p.avatar || '🙂' }), el('b', { text: p.name }), el('span', { class: 'note', text: 'الصف ' + gradeName(p.grade) }),
      el('span', { class: 'wstats' }, el('span', { text: lv.icon + ' ' + lv.name }), el('span', { text: '⭐ ' + (st.stars || 0) }), el('span', { text: '🔥 ' + liveStreak(st) }))),
      el('div', { class: 'row', style: 'gap:6px;justify-content:center' }, el('button', { class: 'btn ghost sm', text: '📊 التقرير', onclick: () => go('kid-' + p.id) }),
        el('button', { class: 'btn sun sm', text: '📱 ربط موبايله', onclick: () => go('linkkid-' + p.id) })),
      el('button', { class: 'btn ghost sm', text: '📅 الجدول الدراسي' + (p.tt && p.tt.on ? ' ✓' : ''), onclick: () => go('tt-' + p.id) }),
      el('button', { class: 'btn ghost sm', text: '🎛️ ماذا يدرس؟ والأصوات' + (p.ctrl && ((p.ctrl.subjects || []).length || Object.values(p.ctrl.lessons || {}).some(a => a.length)) ? ' ✓' : ''), onclick: () => go('ctrl-' + p.id) }))); });
  if (!ACC.co && kidsOf().length < MAX_KIDS) g.append(el('button', { class: 'who add', onclick: () => go('kids') }, el('span', { class: 'kav big', text: '＋' }), el('b', { text: 'أضف ابناً' })));
  s.append(g, el('div', { class: 'row', style: 'gap:8px;justify-content:center' }, el('button', { class: 'btn ghost', text: '✏️ إدارة الأبناء', onclick: () => go('kids') }), el('button', { class: 'btn ghost', text: '⚙️ حسابي', onclick: () => go('account') })));
}

const ymd = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const daysAgo = n => { const d = new Date(); d.setDate(d.getDate() - n); return ymd(d); };
/* a streak only counts if the child studied today or yesterday */
const liveStreak = st => (st && st.streak && (st.lastDay === daysAgo(0) || st.lastDay === daysAgo(1))) ? st.streak : 0;
const DAYN = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

/* ---------- child's device: enter the 6-digit code (or open the QR link) ---------- */
function renderLink(pre) {
  if (ACC.kid) { go('account'); return; }
  const s = page('ربط جهاز الطالب', 'رمز من 6 أرقام من ولي أمرك', 'home');
  if (ACC.user && !ACC.user.isAnonymous) { s.append(el('div', { class: 'feedback info', text: 'هذا الجهاز مسجّل بحساب آخر. اخرج منه أولاً ثم أدخل الرمز.' }),
    el('button', { class: 'btn ghost', text: 'تسجيل الخروج', onclick: async () => { await signOut(auth); renderLink(pre); } })); return; }
  const inp = el('input', { type: 'text', inputmode: 'numeric', maxlength: 6, placeholder: '000000', value: pre || '', dir: 'ltr', style: 'font-size:2rem;text-align:center;letter-spacing:.4em', 'aria-label': 'الرمز' });
  const msg = el('div');
  const btn = el('button', { class: 'btn sun', text: '🔗 اربط هذا الجهاز', onclick: async () => {
    const code = inp.value.replace(/[^\d٠-٩]/g, '').replace(/[٠-٩]/g, c => '٠١٢٣٤٥٦٧٨٩'.indexOf(c));
    if (code.length !== 6) { fbk(msg, 'bad', 'الرمز 6 أرقام.'); return; }
    btn.disabled = true; fbk(msg, 'info', 'جارٍ الربط…');
    try { ACC.linking = true;
      if (!auth.currentUser) await signInAnonymously(auth);
      const r = await call('redeemLinkCode', { code, device: (u => /iPhone/.test(u) ? 'iPhone' : /iPad/.test(u) ? 'iPad' : /Android/.test(u) ? 'Android' + ((/;\s*([^;)]+)\s+Build/.exec(u) || [])[1] ? ' — ' + /;\s*([^;)]+)\s+Build/.exec(u)[1] : '') : /Windows/.test(u) ? 'Windows' : /Mac/.test(u) ? 'Mac' : 'جهاز')(navigator.userAgent) });
      await auth.currentUser.getIdToken(true);
      fbk(msg, 'ok', '✓ تم! أهلاً ' + r.name); D.cheer && D.cheer('win');
      setTimeout(() => { location.hash = 'home'; location.reload(); }, 900);
    } catch (e) { ACC.linking = false; btn.disabled = false; fbk(msg, 'bad', e.code === 'auth/admin-restricted-operation' || e.code === 'auth/operation-not-allowed' ? 'خدمة الربط غير مفعّلة بعد.' : String(e.code || '').startsWith('auth/') ? errMsg(e) : fnErr(e));
      if (auth.currentUser && auth.currentUser.isAnonymous) { const u = auth.currentUser; const t = await u.getIdTokenResult().catch(() => null); if (!(t && t.claims.kidOf)) await signOut(auth).catch(() => {}); } }
  } });
  const cam = el('div');
  const scanB = el('button', { class: 'btn', text: '📷 امسح رمز QR من موبايل ولي أمرك', onclick: () => scanQR(cam, code => { inp.value = code; btn.click(); }, m => fbk(msg, 'bad', m)) });
  s.append(el('div', { class: 'panel accbox' }, el('span', { class: 'note', text: 'اطلب من ولي أمرك أن يفتح: من يدرس الآن؟ ← «📱 ربط موبايله» ← «اربط جهاز»، ثم امسح رمز QR أو اكتب الأرقام.' }),
    scanB, cam, el('span', { class: 'note', style: 'text-align:center', text: '— أو اكتب الأرقام —' }), inp, btn, msg));
  if (pre && pre.length === 6) btn.click();
}
async function kidDevicesBox(p) {
  const box = el('div', { class: 'panel accbox' }, el('b', { text: '📱 أجهزة ' + p.name }),
    el('span', { class: 'note', text: 'اربط موبايل ابنك بملفه: يدخل مباشرة بدون رقم ولا كلمة سر، ولا يرى حسابك أو الدفع أو ملفات إخوته.' }));
  const list = el('div'), out = el('div'), msg = el('div');
  const load = async () => { list.innerHTML = '';
    try { const q = await getDocs(query(collection(db, 'users', OW(), 'kidDevices'), where('pid', '==', p.id)));
      if (!q.size) list.append(el('span', { class: 'note', text: 'لا يوجد جهاز مربوط بعد.' }));
      q.forEach(d => { const x = d.data(); list.append(el('div', { class: 'kidrow' }, el('span', { text: '📱' }), el('span', {}, el('b', { text: x.device || 'جهاز' }), el('span', { class: 'note', text: x.at && x.at.toMillis ? ' — رُبط في ' + fmtDate(x.at.toMillis()) : '' })),
        el('button', { class: 'btn ghost sm', text: 'إلغاء الربط', onclick: async e => { e.target.disabled = true; try { await call('unlinkKidDevice', { kid: d.id }); load(); } catch (x) { fbk(msg, 'bad', fnErr(x)); e.target.disabled = false; } } }))); });
    } catch (e) { list.append(el('span', { class: 'note', text: 'تعذّر تحميل الأجهزة.' })); } };
  const gen = el('button', { class: 'btn sun', text: '🔗 اربط جهاز ' + p.name, onclick: async () => {
    gen.disabled = true; out.innerHTML = ''; msg.innerHTML = '';
    try { const r = await call('createLinkCode', { pid: p.id }); const url = location.origin + location.pathname + '#link-' + r.code;
      const qr = el('div', { class: 'qrbox' });
      const left = el('span', { class: 'note' });
      out.append(el('div', { class: 'linkcode', dir: 'ltr', text: r.code.slice(0, 3) + ' ' + r.code.slice(3) }), qr, left,
        el('span', { class: 'note', text: 'على موبايل ' + p.name + ': امسح الرمز بالكاميرا، أو افتح المنصة واضغط «دخول» ← «أنا طالب، عندي رمز» واكتب الأرقام.' }));
      const t = setInterval(() => { const m = Math.max(0, r.exp - Date.now()); left.textContent = m ? 'صالح لمدة ' + Math.ceil(m / 60000) + ' دقيقة' : 'انتهت صلاحية الرمز'; if (!m || !out.isConnected) { clearInterval(t); if (!m) { out.innerHTML = ''; gen.disabled = false; } } }, 1000);
      loadQR().then(Q => { new Q(qr, { text: url, width: 200, height: 200, correctLevel: Q.CorrectLevel.M }); }).catch(() => {});
      setTimeout(() => { gen.disabled = false; }, 3000); const poll = setInterval(() => { if (!out.isConnected) { clearInterval(poll); return; } load(); }, 5000); setTimeout(() => clearInterval(poll), 15 * 60000);
    } catch (e) { gen.disabled = false; fbk(msg, 'bad', fnErr(e)); } } });
  box.append(list, gen, out, msg); load(); return box;
}
/* in-app QR scanner: BarcodeDetector when available, otherwise jsQR */
let _jsqr = null;
const loadJsQR = () => _jsqr || (_jsqr = new Promise((res, rej) => { const sc = document.createElement('script'); sc.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js'; sc.onload = () => res(window.jsQR); sc.onerror = rej; document.head.append(sc); }));
async function scanQR(box, onCode, onErr) {
  box.innerHTML = '';
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { onErr('الكاميرا غير متاحة هنا. افتح كاميرا الهاتف ووجّهها إلى الرمز، أو اكتب الأرقام.'); return; }
  let stream; try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false }); }
  catch (e) { onErr('لم نتمكن من فتح الكاميرا. اسمح للمتصفح باستعمال الكاميرا، أو اكتب الأرقام.'); return; }
  const v = el('video', { playsinline: '', muted: '', style: 'width:100%;max-width:320px;border-radius:16px;display:block;margin:auto;background:#000' });
  v.srcObject = stream; v.setAttribute('playsinline', ''); await v.play().catch(() => {});
  let live = true; const stop = () => { live = false; stream.getTracks().forEach(t => t.stop()); box.innerHTML = ''; };
  box.append(v, el('button', { class: 'btn ghost sm', style: 'margin:6px auto;display:block', text: '✕ إغلاق الكاميرا', onclick: stop }));
  const pick = txt => { const m = /link-(\d{6})/.exec(txt || '') || /^\s*(\d{6})\s*$/.exec(txt || ''); return m ? m[1] : null; };
  let det = null; try { if ('BarcodeDetector' in window) det = new window.BarcodeDetector({ formats: ['qr_code'] }); } catch (e) {}
  const jsQR = det ? null : await loadJsQR().catch(() => null);
  if (!det && !jsQR) { stop(); onErr('تعذّر تشغيل قارئ الرمز. اكتب الأرقام بدلاً منه.'); return; }
  const cv = document.createElement('canvas'), cx = cv.getContext('2d', { willReadFrequently: true });
  const tick = async () => { if (!live || !box.isConnected) { if (live) stop(); return; }
    try { let txt = null;
      if (v.readyState >= 2) {
        if (det) { const r = await det.detect(v); txt = r[0] && r[0].rawValue; }
        else { cv.width = v.videoWidth; cv.height = v.videoHeight; cx.drawImage(v, 0, 0); const im = cx.getImageData(0, 0, cv.width, cv.height); const r = jsQR(im.data, im.width, im.height); txt = r && r.data; } }
      const code = pick(txt); if (code) { stop(); onCode(code); return; }
    } catch (e) {}
    setTimeout(tick, 250); };
  tick();
}
let _qr = null;
function loadQR() { return _qr || (_qr = new Promise((res, rej) => { const sc = document.createElement('script'); sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js'; sc.onload = () => res(window.QRCode); sc.onerror = rej; document.head.append(sc); })); }

/* ---------- parent: choose what the child studies (subjects, and lessons inside each subject) ---------- */
function renderCtrl(pid) {
  if (!ACC.user || !isAdult()) { go('login'); return; }
  const p = ACC.profiles.find(x => x.id === pid); if (!p) { go('who'); return; }
  if (!D.App.catalog) { setTimeout(() => renderCtrl(pid), 300); return; }
  const g = String(p.grade || ''); const subs = (D.App.catalog.grades[g] || []);
  const s = page('ماذا يدرس ' + p.name + '؟', 'الصف ' + gradeName(g), 'who');
  const c0 = p.ctrl || {}; const selS = new Set(c0.subjects || []); const selL = {}; Object.entries(c0.lessons || {}).forEach(([k, v]) => selL[k] = new Set(v));
  let all = !selS.size; const msg = el('div'); const box = el('div', { class: 'stack' }); const snd = { voice: true, praise: true, fx: true, ...(p.snd || {}) }; let boardOn = p.board !== false;
  const lessonsOf = sb => { const out = []; (sb.books || [{ units: sb.units }]).forEach(b => (b.units || []).forEach(u => u.lessons.forEach(l => { if (l.ready && !out.some(x => x.id === l.id)) out.push({ ...l, unit: u.title }); }))); return out; };
  const draw = () => { box.innerHTML = '';
    box.append(el('div', { class: 'panel accbox' }, el('b', { text: '1) المواد' }),
      el('span', { class: 'note', text: 'اختر المواد التي تظهر لـ' + p.name + '. المواد غير المختارة تختفي من شاشته.' }),
      el('div', { class: 'gpick' }, el('button', { class: 'btn ghost sm' + (all ? ' on' : ''), text: (all ? '✓ ' : '') + 'كل المواد', onclick: () => { all = true; selS.clear(); draw(); } }),
        ...subs.map(sb => el('button', { class: 'btn ghost sm' + (!all && selS.has(sb.id) ? ' on' : ''), text: (!all && selS.has(sb.id) ? '✓ ' : '') + sb.name, onclick: () => { all = false; selS.has(sb.id) ? selS.delete(sb.id) : selS.add(sb.id); if (!selS.size) all = true; draw(); } })))));
    const shown = all ? subs : subs.filter(sb => selS.has(sb.id));
    const lp = el('div', { class: 'panel accbox' }, el('b', { text: '2) الدروس (اختياري)' }), el('span', { class: 'note', text: 'لكل مادة: اتركها «كل الدروس»، أو حدّد دروساً معيّنة فقط.' }));
    shown.forEach(sb => { const L = lessonsOf(sb); const set = selL[sb.id] || (selL[sb.id] = new Set()); const open = set.size > 0;
      const head = el('div', { class: 'row', style: 'justify-content:space-between;gap:8px;margin-top:8px' }, el('b', { text: sb.name }),
        el('div', { class: 'row', style: 'gap:6px' }, el('button', { class: 'btn ghost sm' + (!open ? ' on' : ''), text: 'كل الدروس', onclick: () => { set.clear(); sb._open = false; draw(); } }),
          el('button', { class: 'btn ghost sm' + (open || sb._open ? ' on' : ''), text: 'دروس محددة' + (set.size ? ' (' + set.size + ')' : ''), onclick: () => { sb._open = !sb._open; draw(); } })));
      lp.append(head);
      // where the child is in this subject: last studied lesson and the next one
      const SS = L.map(l => ({ l, S: D.lessonStudy(l.id, p.stats || {}) }));
      let lastI = -1; SS.forEach((x, i) => { if (x.S) lastI = i; });
      const nxt = SS.slice(lastI + 1).find(x => !x.S);
      lp.append(el('div', { class: 'note', style: 'margin-top:2px' }, lastI >= 0 ? '✓ درس ' + SS.filter(x => x.S).length + ' من ' + L.length + ' — آخرها: «' + SS[lastI].l.title + '»' : 'لم يبدأ هذه المادة بعد.',
        nxt ? el('span', { style: 'display:block;font-weight:700', text: '▶ التالي: «' + nxt.l.title + '»' }) : null));
      if (open || sb._open) { const list = el('div', { class: 'ctrl-list' });
        SS.forEach(({ l, S }) => list.append(el('label', { class: 'ctrl-l' + (S ? ' studied' : '') + (nxt && nxt.l.id === l.id ? ' next' : '') }, el('input', { type: 'checkbox', checked: set.has(l.id) ? '' : null, onchange: e => { e.target.checked ? set.add(l.id) : set.delete(l.id); } }),
          el('span', {}, el('b', { text: l.title }), el('small', { class: 'note', text: ' — ' + (l.unit || '') }), S ? el('small', { class: 'lstudy', text: D.studyLine(S) }) : (nxt && nxt.l.id === l.id ? el('small', { class: 'lnext', text: '▶ الدرس التالي' }) : null)))));
        lp.append(list); } });
    const tg = (k, t, d) => el('label', { class: 'sndrow' }, el('input', { type: 'checkbox', checked: snd[k] ? '' : null, onchange: e => { snd[k] = e.target.checked; } }), el('span', {}, el('b', { text: t }), el('small', { class: 'note', text: d })));
    const sp = el('div', { class: 'panel accbox' }, el('b', { text: '3) الأصوات' }),
      tg('voice', '🗣️ الشرح الصوتي', 'قراءة الشرح والنصوص بالصوت. إذا أوقفته يقرأ ' + p.name + ' بنفسه.'),
      tg('praise', '👏 كلمات التشجيع', '«أحسنت! ممتاز!» بعد الإجابة الصحيحة.'),
      tg('fx', '🔔 المؤثرات الصوتية', 'نغمات الصح والخطأ والفوز.'),
      el('span', { class: 'note', text: 'ملاحظة: دروس الإنجليزي، وحروف اللغة العربية للصفوف 1–3، وأسئلة «اسمع واختر»، وتلاوة القرآن يبقى صوتها دائماً لأنها تعتمد عليه.' }),
      el('b', { text: '4) لوحة الأبطال' }), el('label', { class: 'sndrow' }, el('input', { type: 'checkbox', checked: p.board !== false ? '' : null, onchange: e => { boardOn = e.target.checked; } }), el('span', {}, el('b', { text: '🏆 إظهار ' + p.name + ' في لوحة الترتيب' }), el('small', { class: 'note', text: 'يظهر الاسم الأول والصورة الرمزية والنقاط فقط، لطلاب الصف نفسه.' }))));
    box.append(lp, sp,
      el('button', { class: 'btn sun', text: '💾 حفظ', onclick: async e => { e.target.disabled = true;
        const ctrl = { subjects: all ? [] : [...selS], lessons: {} }; Object.entries(selL).forEach(([k, v]) => { if (v.size && (all || selS.has(k))) ctrl.lessons[k] = [...v]; });
        try { await setDoc(pref(pid), { name: p.name, ctrl, snd: { ...snd }, board: boardOn, ctrlAt: serverTimestamp() }, { mergeFields: ['name', 'ctrl', 'snd', 'board', 'ctrlAt'] }); p.ctrl = ctrl; p.snd = { ...snd }; p.board = boardOn; fbk(msg, 'ok', '✓ تم الحفظ. يظهر التغيير على جهاز ' + p.name + ' عند فتح المنصة.'); D.cheer && D.cheer('win'); }
        catch (x) { fbk(msg, 'bad', errMsg(x)); } e.target.disabled = false; } }), msg);
  };
  draw(); s.append(box);
}
/* ---------- parent: weekly timetable for a child ---------- */
function renderTT(pid) {
  if (!ACC.user || !isAdult()) { go('login'); return; }
  const p = ACC.profiles.find(x => x.id === pid); if (!p) { go('who'); return; }
  if (!D.App.catalog) { setTimeout(() => renderTT(pid), 300); return; }
  const g = String(p.grade || ''); const subs = D.App.catalog.grades[g] || []; const TT = D.TT;
  const s = page('📅 جدول ' + p.name, 'الصف ' + gradeName(g) + ' — من الأحد إلى الخميس', 'who');
  const clone = o => JSON.parse(JSON.stringify(o));
  let tt = p.tt ? clone(p.tt) : TT.deflt(g); tt.days = [0, 1, 2, 3, 4].map(i => (tt.days && tt.days[i]) || []);
  const msg = el('div'); const box = el('div', { class: 'stack' }); s.append(box, msg);
  const subName = sid => (subs.find(x => x.id === sid) || {}).name || sid;
  const lessonsOf = sid => { const sb = subs.find(x => x.id === sid); if (!sb) return []; const out = []; (sb.books || [{ units: sb.units }]).forEach(b => (b.units || []).forEach(u => u.lessons.forEach(l => { if (l.ready && !out.some(x => x.id === l.id)) out.push(l); }))); return out; };
  const inp = (attrs, on) => { const e = el('input', attrs); e.addEventListener('change', () => { on(e); draw(); }); return e; };
  function draw() {
    box.innerHTML = '';
    const cnt = {}; tt.days.flat().forEach(x => cnt[x.s] = (cnt[x.s] || 0) + 1);
    box.append(el('div', { class: 'panel accbox' }, el('b', { text: '⚙️ الإعدادات' }),
      el('label', { class: 'sndrow' }, inp({ type: 'checkbox', checked: tt.on ? '' : null }, e => tt.on = e.checked), el('span', {}, el('b', { text: 'تفعيل الجدول' }), el('small', { class: 'note', text: 'يظهر لـ' + p.name + ' جدول اليوم والحصة الحالية في الصفحة الرئيسية.' }))),
      el('label', { class: 'sndrow' }, inp({ type: 'checkbox', checked: tt.mandatory ? '' : null }, e => tt.mandatory = e.checked), el('span', {}, el('b', { text: '🔒 الجدول إلزامي' }), el('small', { class: 'note', text: 'وقت الحصة لا يظهر إلا مادتها (ودرسها إن حدّدته). وقت الاستراحة تظهر شاشة استراحة.' }))),
      tt.mandatory ? el('label', { class: 'sndrow' }, inp({ type: 'checkbox', checked: tt.outside === 'closed' ? '' : null }, e => tt.outside = e.checked ? 'closed' : 'open'), el('span', {}, el('b', { text: 'إغلاق المنصة خارج أوقات الجدول' }), el('small', { class: 'note', text: 'قبل الحصة الأولى وبعد الأخيرة ويومي الجمعة والسبت.' }))) : null,
      el('div', { class: 'ttset' },
        el('label', {}, el('span', { text: 'بداية الحصة الأولى' }), inp({ type: 'time', value: tt.start }, e => tt.start = e.value || '08:00')),
        el('label', {}, el('span', { text: 'مدة الحصة (دقيقة)' }), inp({ type: 'number', min: 10, max: 90, value: tt.len }, e => tt.len = Math.max(10, Math.min(90, +e.value || 45)))),
        el('label', {}, el('span', { text: 'مراجعة الدرس السابق أول الحصة' }), (() => { const sel = el('select', {}, ...[[0, 'بدون'], [5, '5 دقائق'], [10, '10 دقائق']].map(([v, t]) => el('option', { value: v, text: t }))); sel.value = String(tt.review || 0); sel.onchange = () => { tt.review = +sel.value; draw(); }; return sel; })())),
      el('div', { class: 'ttset' },
        el('label', { class: 'row', style: 'gap:6px' }, inp({ type: 'checkbox', checked: tt.brk.on ? '' : null }, e => tt.brk.on = e.checked), el('span', { text: '☕ استراحة' })),
        el('label', {}, el('span', { text: 'بعد الحصة رقم' }), inp({ type: 'number', min: 1, max: 8, value: tt.brk.after }, e => tt.brk.after = +e.value || 3)),
        el('label', {}, el('span', { text: 'مدتها (دقيقة)' }), inp({ type: 'number', min: 5, max: 60, value: tt.brk.len }, e => tt.brk.len = +e.value || 30))),
      el('button', { class: 'btn ghost sm', text: '↺ جدول افتراضي حسب الخطة الدراسية للوزارة', onclick: () => { const d = TT.deflt(g); tt.days = d.days; draw(); } }),
      el('span', { class: 'note', text: 'الحصص في الأسبوع: ' + Object.entries(cnt).map(([k, v]) => subName(k) + ' ' + v).join('، ') })));
    tt.days.forEach((day, di) => { const T = TT.times(tt, day.length);
      const dbox = el('div', { class: 'panel accbox ttday' }, el('b', { text: TT.DAYS[di] + ' — ' + day.length + ' حصص' + (day.length ? ' (' + TT.hm(T[0][0]) + ' – ' + TT.hm(T[T.length - 1][1]) + ')' : '') }));
      day.forEach((x, i) => {
        const ss = el('select', {}, ...subs.map(sb => el('option', { value: sb.id, text: sb.name }))); ss.value = x.s; ss.onchange = () => { x.s = ss.value; x.l = null; draw(); };
        const ls = el('select', {}, el('option', { value: '', text: '▶ الدرس التالي تلقائياً' }), ...lessonsOf(x.s).map(l => { const S = D.lessonStudy(l.id, p.stats || {}); return el('option', { value: l.id, text: (S ? '✓ ' : '') + l.title }); }));
        ls.value = x.l || ''; ls.onchange = () => { x.l = ls.value || null; };
        dbox.append(el('div', { class: 'ttrow' }, el('span', { class: 'tttime', text: (i + 1) + ') ' + TT.hm(T[i][0]) }), ss, ls,
          el('button', { class: 'btn ghost sm', title: 'لأعلى', text: '↑', onclick: () => { if (i) { [day[i - 1], day[i]] = [day[i], day[i - 1]]; draw(); } } }),
          el('button', { class: 'btn ghost sm', title: 'حذف', text: '✕', onclick: () => { day.splice(i, 1); draw(); } })));
        if (tt.brk.on && i + 1 === +tt.brk.after && i + 1 < day.length) dbox.append(el('div', { class: 'ttbrk', text: '☕ استراحة ' + tt.brk.len + ' دقيقة' }));
      });
      dbox.append(el('button', { class: 'btn ghost sm', text: '+ إضافة حصة', onclick: () => { day.push({ s: (subs[0] || {}).id, l: null }); draw(); } }));
      box.append(dbox); });
    box.append(el('button', { class: 'btn sun', text: '💾 حفظ الجدول', onclick: async e => { e.target.disabled = true;
      const save = { ...clone(tt), days: Object.fromEntries(tt.days.map((d, i) => [String(i), d])) };
      try { await setDoc(pref(pid), { name: p.name, tt: save }, { mergeFields: ['name', 'tt'] }); p.tt = save; fbk(msg, 'ok', '✓ حُفظ الجدول. يظهر على جهاز ' + p.name + ' عند فتح المنصة.'); D.cheer && D.cheer('win'); }
      catch (x) { fbk(msg, 'bad', errMsg(x)); } e.target.disabled = false; } }));
  }
  draw();
}
async function renderLinkKid(pid) {
  if (!ACC.user || !isAdult()) { go('login'); return; }
  const p = ACC.profiles.find(x => x.id === pid); if (!p) { go('who'); return; }
  const s = page('ربط موبايل ' + p.name, 'خطوة واحدة على موبايل الابن', 'who');
  s.append(el('div', { class: 'panel accbox' }, el('b', { text: 'كيف؟' }),
    el('span', { class: 'note', text: '1) اضغط الزر الأصفر بالأسفل: يظهر رمز من 6 أرقام ورمز QR.' }),
    el('span', { class: 'note', text: '2) على موبايل ' + p.name + ': امسح رمز QR بالكاميرا، أو افتح المنصة (بدون تسجيل دخول) واضغط «دخول» ← «🧒 أنا طالب، عندي رمز من ولي أمري» واكتب الأرقام.' }),
    el('span', { class: 'note', text: '3) انتهى! يبقى موبايله مفتوحاً على ملفه دائماً، ويظهر هنا في قائمة الأجهزة.' })),
    await kidDevicesBox(p));
}

/* ---------- parent: one child's report ---------- */
async function renderKid(pid) {
  if (!D.App.catalog) { setTimeout(() => renderKid(pid), 300); return; }
  if (!ACC.user || !isAdult()) { go('login'); return; }
  let p = ACC.profiles.find(x => x.id === pid); if (!p) { go('who'); return; }
  const s = page('تقرير ' + p.name, 'الصف ' + gradeName(p.grade), 'who');
  s.append(el('p', { class: 'note', text: 'جارٍ التحديث…' }));
  try { const d = await withTimeout(getDoc(pref(pid))); if (d.exists()) { Object.assign(p, d.data()); } } catch (e) {}
  s.innerHTML = '';
  const st = p.stats || {}, lv = D.GAME.level(st.stars || 0), mins = st.mins || {}, goal = p.goal || 20;
  const nx = lv.next;
  s.append(el('div', { class: 'mj-progress' },
    el('div', { class: 'lv' }, el('span', { class: 'lvi', text: lv.icon }), el('span', {}, el('b', { text: lv.name }), el('small', { text: nx ? ('باقي ' + (nx[0] - (st.stars || 0)) + ' نجمة لمستوى ' + nx[1]) : 'أعلى مستوى!' }))),
    el('div', { class: 'chips' }, el('span', { class: 'chip' }, '⭐ ', el('b', { text: String(st.stars || 0) }), ' نجمة'), el('span', { class: 'chip' }, '🔥 ', el('b', { text: String(liveStreak(st)) }), ' يوم متتالٍ'),
      el('span', { class: 'chip' }, '⏱ ', el('b', { text: String(Math.round(Object.keys(mins).filter(k => k >= daysAgo(6)).reduce((a, k) => a + mins[k], 0))) }), ' دقيقة هذا الأسبوع'))));
  // 7-day bars
  const ch = el('div', { class: 'wk' }); const mx = Math.max(goal, ...Array.from({ length: 7 }, (_, i) => mins[daysAgo(i)] || 0));
  for (let i = 6; i >= 0; i--) { const k = daysAgo(i), v = Math.round(mins[k] || 0), d = new Date(); d.setDate(d.getDate() - i);
    ch.append(el('div', { class: 'wkd' + (v >= goal ? ' ok' : '') }, el('small', { text: String(v) }), el('span', { class: 'wkb' }, el('i', { style: 'height:' + Math.round(100 * v / mx) + '%' })), el('small', { text: i === 0 ? 'اليوم' : DAYN[d.getDay()] }))); }
  ch.style.setProperty('--goal', (100 * goal / mx) + '%');
  s.append(el('div', { class: 'panel accbox' }, el('b', { text: 'دقائق التعلّم في آخر 7 أيام' }), el('span', { class: 'note', text: 'الهدف اليومي ' + goal + ' دقيقة. العمود الأخضر = يوم حقّق فيه الهدف.' }), ch));
  // goal setting
  const gsel = el('div', { class: 'gpick' }); const msg = el('div');
  [10, 15, 20, 30, 45, 60].forEach(v => gsel.append(el('button', { class: 'btn' + (v === goal ? ' on' : ''), text: v + ' د', onclick: async () => {
    try { await setDoc(pref(pid), { name: p.name, goal: v }, { merge: true }); p.goal = v; if (ACC.pid === pid) { try { localStorage.setItem('darsi_p_' + pid + '_g_goal', JSON.stringify(v)); } catch (e) {} } renderKid(pid); }
    catch (x) { fbk(msg, 'bad', errMsg(x)); } } })));
  s.append(el('div', { class: 'panel accbox' }, el('b', { text: '🎯 الهدف اليومي' }), el('span', { class: 'note', text: 'كم دقيقة تريد أن يتعلّم ' + p.name + ' كل يوم؟ سيظهر له عدّاد، ويحتفل التطبيق معه عند تحقيقه.' }), gsel, msg));
  s.append(await kidDevicesBox(p));
  // full report (day / week / month) with weak skills, PDF and WhatsApp
  const rbox = el('div'); s.append(rbox);
  const drawRep = per => { rbox.innerHTML = ''; rbox.append(D.REPORT.view({ name: p.name, grade: p.grade, stats: st, goal }, per, drawRep)); };
  drawRep('week');
  s.append(el('button', { class: 'btn sun', text: '▶ ابدأ الدراسة كـ ' + p.name, onclick: async () => { await setActive(pid); go('g' + p.grade); } }));
}

function renderKidAccount() {
  const p = activeProfile() || {}; const s = page('حسابي', p.name || '', 'home');
  s.append(el('div', { class: 'panel accbox' }, el('div', { style: 'font-size:3rem;text-align:center', text: p.avatar || '🙂' }),
    el('b', { style: 'text-align:center;font-size:1.3rem', text: p.name || '' }), el('span', { class: 'note', style: 'text-align:center', text: 'الصف ' + gradeName(p.grade) }),
    el('div', { class: 'feedback ok', text: '🔗 هذا الجهاز مربوط بحساب ولي أمرك. نجومك وتقدّمك تُحفظ تلقائياً ويراها ولي أمرك.' })),
    el('button', { class: 'btn sun', text: '📚 دروسي', onclick: () => go('g' + p.grade) }),
    el('button', { class: 'btn', text: '📊 تقريري', onclick: () => go('myreport') }));
}
function renderAccount() {
  if (!ACC.user) { go('login'); return; }
  if (ACC.kid) { renderKidAccount(); return; }
  if (!ACC.profile) { go('onboard'); return; }
  const P = ACC.profile, u = ACC.user, [ic, rt] = ROLES[P.role] || ['👤', ''];
  const U = n => 'img/ui/' + n + '.webp'; const ph = P.phone || phoneOf(u); const subOn = ACC.hasAnySub();
  const s = page('حسابي', '', 'home'); s.classList.add('kx-acc');
  const kids = isAdult() ? kidsOf() : [];
  const tot = kids.reduce((a, k) => a + ((k.stats || {}).stars || 0), 0);
  /* ---- hero ---- */
  s.append(el('div', { class: 'kx-ph' },
    el('div', { class: 'bgx' }), el('span', { class: 'sp1', text: '✨' }), el('span', { class: 'sp2', text: '⭐' }),
    el('div', { class: 'avw' }, el('img', { src: U(P.role === 'teacher' ? 'k6' : P.role === 'student' ? 'k3' : 'k5'), alt: '' })),
    el('h2', { text: P.name }),
    el('div', { class: 'chips' }, el('span', { class: 'c', text: ic + ' ' + rt }),
      ph ? el('span', { class: 'c', dir: 'ltr', text: ph.replace('+218', '0') + (P.phoneVerified ? ' ✓' : '') }) : u.email ? el('span', { class: 'c', dir: 'ltr', text: u.email }) : null),
    isAdult() ? el('div', { class: 'stats' },
      el('div', {}, el('b', { text: String(kids.length) }), el('small', { text: 'أبناء' })),
      el('div', {}, el('b', { text: String(tot) }), el('small', { text: 'نجمة جمعوها' })),
      el('div', {}, el('b', { text: subOn ? '⭐' : '—' }), el('small', { text: subOn ? 'مشترك' : 'مجاني' }))) : null));
  /* ---- kids strip ---- */
  if (isAdult()) s.append(el('div', { class: 'kx-card' }, el('div', { class: 'hd' }, el('b', { text: '👨‍👩‍👧 أبنائي' }), el('button', { class: 'lnk', text: 'إدارة ←', onclick: () => go('kids') })),
    el('div', { class: 'kx-kids' }, ...kids.map(k => { const st = k.stats || {}; return el('button', { class: 'kx-kid1', onclick: () => go('kid-' + k.id) },
      el('span', { class: 'kav', text: k.avatar || '🙂' }), el('b', { text: k.name }), el('small', { text: k.grade ? 'الصف ' + gradeName(k.grade) : '' }), el('span', { class: 'kst', text: '⭐ ' + (st.stars || 0) })); }),
      kids.length < MAX_KIDS && !ACC.co ? el('button', { class: 'kx-kid1 add', onclick: () => go('kids') }, el('span', { class: 'kav', text: '+' }), el('b', { text: 'أضف ابناً' }), el('small', { text: 'حتى ' + MAX_KIDS })) : null)));
  /* ---- subscription card ---- */
  { const sub = ACC.subs && ACC.subs.find(x => x.kind !== 'trial') ; const subs = (ACC.subs || []).filter(x => x.kind !== 'trial');
    s.append(subOn && sub ? el('button', { class: 'kx-sub on', onclick: () => go('subscribe') }, el('img', { src: U('q_comp'), alt: '' }),
        el('span', { class: 'tx' }, el('small', { text: 'اشتراكك فعّال ⭐' }), el('b', { text: subName(sub) }), el('small', { text: subs.length > 1 ? subs.length + ' اشتراكات · ' + 'أقربها ينتهي ' + fmtDate(Math.min(...subs.map(x => x.end.toMillis()))) : 'حتى ' + fmtDate(sub.end.toMillis()) })), el('span', { class: 'go', text: 'التفاصيل' }))
      : el('button', { class: 'kx-sub', onclick: () => go('subscribe') }, el('img', { src: U('q_learn'), alt: '' }),
        el('span', { class: 'tx' }, el('small', { text: 'حسابك مجاني الآن' }), el('b', { text: 'افتح كل الدروس والمواد' }), el('small', { text: 'باقات للطالب والعائلة — شهري أو حتى نهاية العام' })), el('span', { class: 'go', text: '⭐ ترقية' }))); }
  /* ---- quick tiles ---- */
  { const T = [];
    T.push(['n_ach', 'التقارير', () => go(isAdult() && kids.length ? 'who' : 'myreport')]);
    { const tc = (ACC.access || {}).teach || {}; if (tc.on || ACC.isAdmin) T.push(['n_lessons', 'دوراتي', () => go('courses-mine')]); }
    if (P.role === 'teacher' || ACC.isAdmin) T.push(['k6', 'منصة المعلم', () => go('studio')]);
    T.push(['x_all', 'كتب PDF', () => go('books')], ['q_test', 'اختبر مستوى', () => go('test')], ['q_times', 'جدول الضرب', () => go('times')]);
    s.append(el('div', { class: 'kx-qk' }, ...T.slice(0, 6).map(([im, t, fn]) => el('button', { onclick: fn }, el('span', { class: 'ib' }, el('img', { src: U(im), alt: '', loading: 'lazy' })), el('b', { text: t }))))); }
  /* ---- settings list (each row opens its panel) ---- */
  const list = el('div', { class: 'kx-set' });
  const row = (icon, bg, title, sub, mk, danger) => { const box = el('div', { class: 'body', hidden: true }); let made = false;
    const b = el('button', { class: 'r' + (danger ? ' danger' : ''), onclick: () => {
      if (!made) { made = true; const c = mk(); if (c) box.append(c); } box.hidden = !box.hidden; b.classList.toggle('open', !box.hidden); } },
      el('span', { class: 'ic', style: 'background:' + bg, text: icon }), el('span', { class: 'tt' }, el('b', { text: title }), sub ? el('small', { text: sub }) : null), el('span', { class: 'ch', text: '‹' }));
    list.append(el('div', { class: 'it' }, b, box)); };
  const link = (icon, bg, title, sub, fn, danger) => list.append(el('div', { class: 'it' }, el('button', { class: 'r' + (danger ? ' danger' : ''), onclick: fn },
    el('span', { class: 'ic', style: 'background:' + bg, text: icon }), el('span', { class: 'tt' }, el('b', { text: title }), sub ? el('small', { text: sub }) : null), el('span', { class: 'ch', text: '‹' }))));
  row('🔔', '#fff1c2', 'الإشعارات', 'تذكير بالدروس وتقارير الأبناء', () => pushRow());
  if (!ACC.kid && !ACC.co) row('🎁', '#ffe1ec', 'ادعُ عائلة واكسب أياماً مجانية', 'رابطك الخاص للمشاركة', () => refBox());
  if (isAdult()) row('👫', '#e2f0ff', 'ولي أمر آخر', 'الأم أو الأب يتابع معك نفس الأبناء', () => { const w = el('div', { class: 'stack' }); w.append(coParentBox()); if (!ACC.co && !kids.length) w.append(coRedeemBox()); return w; });
  if ((ACC.subs || []).length) row('🧾', '#e3f7ea', 'اشتراكاتي', (ACC.subs || []).length + ' اشتراك', () => el('div', { class: 'stack' }, ...ACC.subs.map(x => el('div', { class: 'kidrow' }, el('span', {}, el('b', { text: subName(x) }), el('span', { class: 'note', text: ' — حتى ' + fmtDate(x.end.toMillis()) }))))));
  if (P.role === 'parent') row('👩‍🏫', '#efe6ff', 'هل أنت معلم أيضاً؟', 'حوّل حسابك لحساب معلم', () => { const m = el('div');
    return el('div', { class: 'stack' }, el('span', { class: 'note', text: 'حوّل حسابك إلى حساب معلم وتبقى إدارة أبنائك كما هي.' }),
      el('button', { class: 'btn ghost', text: 'نعم، أنا معلم أيضاً', onclick: async () => {
        try { await setDoc(uref(), { ...P, role: 'teacher' }); await setDoc(pref('me'), { name: P.name, grade: null, avatar: '👩‍🏫', createdAt: serverTimestamp() });
          ACC.profile = { ...P, role: 'teacher' }; await loadProfiles(); D.cheer && D.cheer('win'); renderAccount(); } catch (e) { fbk(m, 'bad', errMsg(e)); } } }), m); });
  const admSlot = el('div'); list.append(admSlot);
  link('🔒', '#eef0f6', 'الخصوصية وشروط الاستخدام', '', () => go('privacy'));
  link('🚪', '#ffe4e4', 'تسجيل الخروج', '', async () => { await signOut(auth); go('home'); }, true);
  s.append(el('div', { class: 'kx-card pad0' }, el('div', { class: 'hd', style: 'padding:12px 14px 4px' }, el('b', { text: '⚙️ الإعدادات' })), list));
  call('adminCheck', {}).then(() => { ACC.isAdmin = true; admSlot.append(el('div', { class: 'it' }, el('button', { class: 'r', onclick: () => go('admin') },
    el('span', { class: 'ic', style: 'background:#fff1c2', text: '🛠️' }), el('span', { class: 'tt' }, el('b', { text: 'لوحة الإدارة' }), el('small', { text: 'للمدير والمشرفين' })), el('span', { class: 'ch', text: '‹' })))); }).catch(() => {});
  s.append(el('p', { class: 'note', dir: 'ltr', style: 'text-align:center;font-size:.7rem;opacity:.5;margin:0', text: 'ID: ' + u.uid }));
}

/* ---------- SMS verification: only before the first payment (resala, via our server) ---------- */
ACC.phoneVerified = () => !!(ACC.profile && ACC.profile.phoneVerified);
ACC.verifyPhone = box => new Promise(resolve => {
  if (ACC.phoneVerified()) { resolve(true); return; }
  box.innerHTML = ''; const msg = el('div');
  const known = (ACC.profile && ACC.profile.phone) || phoneOf(ACC.user) || '';
  const ph = el('input', { type: 'tel', inputmode: 'numeric', placeholder: '09X XXX XXXX', 'aria-label': 'رقم الهاتف', value: known.replace('+218', '0') });
  const code = el('input', { inputmode: 'numeric', placeholder: 'الرمز (4 أرقام)', 'aria-label': 'رمز التحقق', autocomplete: 'one-time-code', maxlength: '4' });
  const send = el('button', { class: 'btn', text: 'أرسل رمز التأكيد' });
  const ok = el('button', { class: 'btn', text: 'تأكيد' });
  const codeRow = el('div', { class: 'code', hidden: true }, code, ok);
  send.onclick = async () => { msg.innerHTML = ''; const n = libyanPhone(ph.value);
    if (!n) { fbk(msg, 'bad', 'اكتب رقماً ليبياً يبدأ بـ 091 أو 092 أو 093 أو 094 أو 095.'); return; }
    send.disabled = true;
    try { await call('sendOtp', { phone: n.replace('+218', '0'), deviceId }); codeRow.hidden = false; code.focus(); fbk(msg, 'ok', 'أرسلنا رمزاً من 4 أرقام إلى ' + n.replace('+218', '0') + '.'); }
    catch (e) { fbk(msg, 'bad', fnErr(e)); }
    send.disabled = false; };
  ok.onclick = async () => { msg.innerHTML = ''; ok.disabled = true;
    try { const r = await call('verifyOtp', { code: code.value.trim() });
      if (r.ok) { ACC.profile = { ...ACC.profile, phone: r.phone, phoneVerified: true }; fbk(msg, 'ok', '✓ تم تأكيد رقمك.'); resolve(true); }
      else fbk(msg, 'bad', 'الرمز غير صحيح. بقيت ' + r.left + ' محاولات.'); }
    catch (e) { fbk(msg, 'bad', fnErr(e)); }
    ok.disabled = false; };
  box.append(el('div', { class: 'panel accbox' }, el('b', { text: '📱 أكّد رقم هاتفك قبل الدفع' }), el('span', { class: 'note', text: 'نرسل رسالة واحدة فقط لتأكيد أن الرقم لك. لا نرسلها مرة أخرى بعد التأكيد.' }), el('div', { class: 'code' }, ph, send), codeRow, msg));
});

/* ---------- paid lessons: fetched from the server for subscribers, then kept on this device ---------- */
const PAID_CACHE = 'mj-paid-v1';
async function cacheGet(id) { try { const c = await caches.open(PAID_CACHE); const r = await c.match('/paid/' + id); return r ? r.json() : null; } catch (e) { return null; } }
async function cachePut(id, data) { try { const c = await caches.open(PAID_CACHE); await c.put('/paid/' + id, new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } })); } catch (e) {} }
ACC.loadPaid = async id => {
  const cached = await cacheGet(id);
  if (cached && (!navigator.onLine || !ACC.user)) return cached;           // offline: what was opened before keeps working
  if (!ACC.user) { const e = new Error('login'); e.userMsg = 'سجّل الدخول لفتح هذا الدرس.'; throw e; }
  try { const r = await call('getLesson', ACC.adminBrowse ? { id, admin: true } : { id, pid: ACC.pid || null }); await cachePut(id, r.lesson); return r.lesson; }
  catch (e) { if (cached && /unavailable|internal|deadline/i.test(e.code || '')) return cached;
    const x = new Error('paid'); x.userMsg = fnErr(e); throw x; }
};

/* ---------- subscriptions ---------- */
ACC.subs = []; ACC.perms = []; ACC.owner = false;
ACC.can = p => !!ACC.isAdmin && (ACC.owner || (ACC.perms || []).includes(p));
async function loadSubs() {
  ACC.subs = [];
  try { const q = query(collection(db, 'subscriptions'), where('uid', '==', OW()));
    const sn = await getDocs(q); const now = Date.now();
    ACC.subs = sn.docs.map(d => ({ id: d.id, ...d.data() })).filter(x => x.active !== false && x.end && x.end.toMillis() > now);
  } catch (e) { console.warn('subs', e); }
}
const subApplies = sub => {
  const sc = sub.scope || {}, role = ACC.profile && ACC.profile.role;
  if (sc.any) return true;                        // منحة الإدارة: لكل ملفات الحساب
  if (sc.teacherOnly) return role === 'teacher' && ACC.pid === 'me';
  if (sc.kids) return !!ACC.pid && ACC.pid !== 'me' && (!sc.kidIds || sc.kidIds.includes(ACC.pid));
  if (ACC.kid) return false;
  return role === 'student' || (!!sc.self && ACC.pid === 'me');
};
ACC.trialN = g => { const t = ACC.subs.find(x => x.kind === 'trial'); if (!t) return 0; const gs = (t.scope || {}).grades || []; if (g != null && !gs.includes(String(g))) return 0; return (t.scope || {}).trialN || 5; };
/* free days: one grade, chosen once by the account owner and locked */
function trialPick() {
  const t = ACC.subs.find(x => x.kind === 'trial'); if (!t || ACC.kid) return null; const sc = t.scope || {}, N = sc.trialN || 5;
  if ((sc.grades || []).length) return el('div', { class: 'feedback info', text: '🎁 أيامك المجانية سارية حتى ' + fmtDate(t.end.toMillis()) + ': أول ' + N + ' دروس في كل مادة للصف ' + gradeName(sc.grades[0]) + '.' });
  if (ACC.co) return el('div', { class: 'feedback info', text: '🎁 عندكم أيام مجانية. يختار ولي الأمر الأساسي الصف من حسابه.' });
  const kids = ACC.profiles.filter(p => p.id !== 'me' && p.grade); const me = ACC.profiles.find(p => p.id === 'me');
  const opts = kids.length ? [...new Map(kids.map(k => [String(k.grade), k.name])).entries()].map(([g]) => [g, 'الصف ' + gradeName(g) + ' (' + kids.filter(k => String(k.grade) === g).map(k => k.name).join('، ') + ')'])
    : (me && me.grade) ? [[String(me.grade), 'الصف ' + gradeName(me.grade)]] : GRADES.map(([g, n]) => [g, 'الصف ' + n]);
  let sel = opts.length === 1 ? opts[0][0] : null; const m = el('div');
  const box = el('div', { class: 'panel', style: 'border:2px solid #16a34a;display:flex;flex-direction:column;gap:8px;margin:8px 0' },
    el('b', { text: '🎁 عندك أيام مجانية حتى ' + fmtDate(t.end.toMillis()) }), el('span', { class: 'note', text: 'اختر صفاً واحداً تُفتح فيه أول ' + N + ' دروس من كل مادة. لا يمكن تغيير الصف بعد الاختيار.' }));
  const gp = el('div', { class: 'gpick' }); const drawG = () => { gp.innerHTML = ''; opts.forEach(([g, t2]) => gp.append(el('button', { class: 'btn ghost sm' + (sel === g ? ' on' : ''), text: t2, onclick: () => { sel = g; drawG(); conf.dataset.c = ''; conf.textContent = '✓ اعتمد هذا الصف'; } }))); };
  const conf = el('button', { class: 'btn sun', text: '✓ اعتمد هذا الصف', onclick: async () => { if (!sel) { fbk(m, 'bad', 'اختر الصف.'); return; }
    if (conf.dataset.c !== '1') { conf.dataset.c = '1'; conf.textContent = '⚠️ تأكيد: الصف ' + gradeName(sel) + ' (لا يمكن تغييره)'; return; }
    conf.disabled = true; try { await call('trialGrade', { grade: sel }); await loadSubs(); D.cheer && D.cheer('win'); D.route(); } catch (e) { fbk(m, 'bad', fnErr(e)); conf.disabled = false; } } });
  drawG(); box.append(gp, conf, m); return box;
}
ACC.hasAccess = (g, s) => ACC.subs.some(sub => { if (sub.kind === 'trial' || !subApplies(sub)) return false; const sc = sub.scope || {};
  if (sc.pairs) return sc.pairs.includes(g + ':' + s);
  return (sc.grades || []).some(x => x === '*' || x === g) && (sc.subjects || []).some(x => x === '*' || x === s); });
ACC.hasAnySub = () => ACC.subs.some(x => x.kind !== 'trial' && subApplies(x));
ACC.hasGrade = g => ACC.subs.some(sub => { if (sub.kind === 'trial' || !subApplies(sub)) return false; const sc = sub.scope || {}; if (sc.any) return true;
  if (sc.pairs) return sc.pairs.some(x => x.startsWith(g + ':')); return (sc.grades || []).some(x => x === '*' || x === g); });
const fmtDate = ms => new Date(ms).toLocaleDateString('ar-LY', { year: 'numeric', month: 'long', day: 'numeric' });
const KINDS = {
  gift: ['🎁', 'اشتراك مجاني', 'منحة من الإدارة', []],
  student_subject: ['📘', 'مادة واحدة', 'مادة واحدة في صف واحد', ['student', 'teacher']],
  student_grade: ['📚', 'الصف كاملاً', 'كل مواد صف واحد', ['student', 'teacher']],
  parent_grade: ['👨‍👩‍👧', 'العائلة — صف واحد', 'كل مواد صف واحد لأبنائك (حتى 5)', ['parent', 'teacher']],
  parent_all: ['🏫', 'العائلة — كل الصفوف', 'كل الصفوف والمواد لأبنائك (حتى 5)', ['parent', 'teacher']],
};
const subName = sub => { const k = KINDS[sub.kind] || ['', sub.kind]; const sc = sub.scope || {};
  let t = sub.planName || k[1]; if (sc.pairs) t += ' — ' + sc.pairs.length + ' مادة'; else if (sc.grades && sc.grades[0] !== '*') t += ' — الصف ' + gradeName(sc.grades[0]);
  if (sc.subjects && sc.subjects[0] && sc.subjects[0] !== '*') t += ' — ' + subjName(sc.grades[0], sc.subjects[0]); return k[0] + ' ' + t; };
const PAID_SUBJECTS = ['ar', 'en', 'math', 'comp', 'art', 'sci', 'soc', 'hist', 'geo'];
function subjectsOf(g) { const c = D.App.catalog; return ((c && c.grades[g]) || []).filter(s => PAID_SUBJECTS.includes(s.id)); }
function subjName(g, sid) { const s = subjectsOf(g).find(x => x.id === sid); return s ? s.name : sid; }

const BASE_ROLES = { student_subject: ['student', 'teacher'], student_grade: ['student', 'teacher'], parent_grade: ['parent', 'teacher'], parent_all: ['parent', 'teacher'] };
const BASE_ICON = { student_subject: '📘', student_grade: '📚', parent_grade: '👨‍👩‍👧', parent_all: '🏫' };
const durLabel = p => { const d = p.dur || {}; return d.t === 'days' ? (d.days % 30 === 0 ? (d.days === 30 ? 'شهر واحد' : d.days === 60 ? 'شهران' : (d.days / 30) + ' أشهر') : d.days + ' يوماً') + ' من يوم الاشتراك' : 'حتى ' + fmtDate(p.end); };
function renderSubscribe() {
  if (ACC.co) { const s = page('الاشتراك', '', 'who'); s.append(el('div', { class: 'feedback info', text: 'الاشتراك يتم من حساب ولي الأمر الأساسي، ويشمل الأبناء عندك تلقائياً.' })); return; }
  if (ACC.kid) { const s = page('الاشتراك', '', 'home'); s.append(el('div', { class: 'feedback info', text: 'هذا الدرس يحتاج اشتراكاً. اطلب من ولي أمرك أن يشترك لك من حسابه، وسيفتح عندك مباشرة.' })); return; }
  if (!ACC.user) { D.App.after = 'subscribe'; go('login'); return; }
  if (!ACC.profile) { go('onboard'); return; }
  const role = ACC.profile.role, s = page('الاشتراك', 'اختر الباقة والمدة المناسبة لك', D.App.after || 'home');
  const mine = ACC.subs.filter(subApplies);
  if (mine.length) s.append(el('div', { class: 'feedback ok', text: '✓ عندك اشتراك فعّال: ' + mine.map(x => subName(x) + ' (حتى ' + fmtDate(x.end.toMillis()) + ')').join('، ') }));
  const box = el('div', { class: 'stack' }), msg = el('div'), phoneBox = el('div');
  let plans = null, pl = null, grade = null, subject = null;
  const kidsN = ACC.profiles.filter(p => p.id !== 'me').length;
  const draw = () => {
    box.innerHTML = '';
    if (!plans) { box.append(el('span', { class: 'note', text: 'جارٍ تحميل الباقات…' })); return; }
    const mineP = plans.filter(p => (BASE_ROLES[p.base] || []).includes(role));
    if (!mineP.length) { box.append(el('div', { class: 'feedback info', text: 'لا توجد باقات متاحة حالياً. عُد قريباً.' })); return; }
    const pg = el('div', { class: 'plans' });
    mineP.forEach(p => pg.append(el('button', { class: 'plan', 'aria-pressed': String(pl === p), onclick: () => { pl = p; grade = null; subject = null; draw(); } },
      el('b', { text: (BASE_ICON[p.base] || '⭐') + ' ' + p.name }), p.desc ? el('span', { class: 'note', style: 'display:block', text: p.desc }) : null,
      el('span', { class: 'note', style: 'display:block;font-weight:700', text: '⏳ ' + durLabel(p) }),
      el('div', { class: 'tag sun', style: 'margin-top:6px', text: p.price + ' د.ل' }))));
    box.append(el('b', { text: 'اختر الباقة' }), pg);
    if (!pl) return;
    const isParent = ['parent_grade', 'parent_all'].includes(pl.base);
    if (isParent && !kidsN) { box.append(el('div', { class: 'feedback info' }, 'أضف أبناءك أولاً. ', el('button', { class: 'linkbtn', text: 'أبنائي', onclick: () => go('kids') }))); return; }
    if (isParent && pl.kids && pl.kids < 5 && kidsN > pl.kids) { box.append(el('div', { class: 'feedback info', text: 'هذه الباقة ' + (pl.kids === 2 ? 'لابنين' : 'لـ' + pl.kids + ' أبناء') + ' فقط، وعندك ' + kidsN + '. اختر باقة العائلة.' })); return; }
    const allowedG = () => { if (pl.base === 'parent_grade') return [...new Set(ACC.profiles.filter(p => p.id !== 'me' && p.grade).map(p => String(p.grade)))];
      const me = ACC.profiles.find(p => p.id === 'me'); if (role === 'student' && me && me.grade) return [String(me.grade)]; return null; };
    const AG = allowedG(); if (AG && AG.length === 1 && !grade) grade = AG[0];
    const gpick = () => { const w = el('div', { class: 'gpick' }); GRADES.filter(([g]) => !AG || !AG.length || AG.includes(String(g))).forEach(([g, n]) => w.append(el('button', { class: 'btn ghost sm' + (grade === g ? ' on' : ''), text: n, onclick: () => { grade = g; subject = null; draw(); } }))); return w; };
    if (['student_subject', 'student_grade', 'parent_grade'].includes(pl.base)) box.append(el('b', { text: 'الصف' }), gpick());
    if (pl.base === 'student_subject' && grade) { const w = el('div', { class: 'gpick' }); subjectsOf(grade).forEach(x => w.append(el('button', { class: 'btn ghost sm' + (subject === x.id ? ' on' : ''), text: x.name, onclick: () => { subject = x.id; draw(); } }))); box.append(el('b', { text: 'المادة' }), w); }
    const ready = pl.base === 'parent_all' || (pl.base === 'student_subject' ? grade && subject : !!grade);
    if (!ready) return;
    { // اشتراك فعّال يشمل نفس الاختيار؟ لا داعي للدفع مرة أخرى
      const isDays = (pl.dur || {}).t === 'days', want = pl.base === 'student_subject' ? { g: [grade], s: [subject] } : pl.base === 'parent_all' ? { g: ['*'], s: ['*'] } : { g: [grade], s: ['*'] };
      const kidIds = ACC.profiles.filter(p => p.id !== 'me').map(p => p.id), forKids = isParent;
      const inc = (have, w) => (have || []).includes('*') || w.every(v => (have || []).includes(v));
      const cov = ACC.subs.find(x => { if (x.kind === 'trial') return false; if (isDays && x.plan === pl.id) return false; const sc = x.scope || {}; if (sc.teacherOnly) return false;
        const who = sc.any || (forKids ? (sc.kids && (!sc.kidIds || kidIds.every(k => sc.kidIds.includes(k)))) : (sc.self || (!sc.kids && role === 'student')));
        return who && inc(sc.grades, want.g) && (sc.any || inc(sc.subjects, want.s)) && x.end.toMillis() >= pl.end - 864e5; });
      if (cov) { box.append(el('div', { class: 'feedback ok', text: '✓ أنت مشترك بالفعل في «' + subName(cov).replace(/^\S+\s/, '') + '» حتى ' + fmtDate(cov.end.toMillis()) + '، وهو يشمل ما اخترته. لا حاجة لاشتراك جديد.' })); return; }
    }
    const d = pl.dur || {}, endTxt = d.t === 'days' ? 'الاشتراك لمدة ' + durLabel(pl) + '. إذا كان عندك اشتراك فعّال من نفس الباقة تُضاف المدة بعد نهايته.' : 'الاشتراك صالح ' + durLabel(pl) + '.';
    box.append(el('div', { class: 'paybox' }, el('b', { style: 'font-size:1.2rem', text: 'المبلغ: ' + pl.price + ' دينار' }),
      el('span', { class: 'note', text: endTxt + ' الدفع عبر ماي باي: ادفع لي، سداد، موبي كاش وغيرها.' }),
      el('label', { class: 'sndrow', style: 'margin:4px 0' }, agree, el('span', {}, 'أوافق على ', el('a', { href: '#privacy', text: 'شروط الاستخدام وسياسة الخصوصية' }))), payBtn));
    payBtn.disabled = !agree.checked;
  };
  const agree = el('input', { type: 'checkbox', onchange: () => { payBtn.disabled = !agree.checked; } });
  const payBtn = el('button', { class: 'btn sun paybig', text: 'ادفع الآن', onclick: async () => {
    if (!agree.checked) { fbk(msg, 'bad', 'وافق على الشروط أولاً.'); return; }
    msg.innerHTML = '';
    if (!ACC.phoneVerified()) { phoneBox.scrollIntoView({ behavior: 'smooth' }); await ACC.verifyPhone(phoneBox); phoneBox.innerHTML = ''; }
    payBtn.disabled = true; fbk(msg, 'info', 'جارٍ تجهيز صفحة الدفع…');
    try { const r = await call('createOrder', { plan: pl.id, kind: pl.base, grade, subject });
      store.set('last_order', r.orderId); location.href = r.url; }
    catch (e) { fbk(msg, 'bad', fnErr(e)); payBtn.disabled = false; } } });
  s.append(box, phoneBox, msg);
  draw();
  call('getPlans', {}).then(r => { plans = r.plans || []; draw(); }).catch(e => fbk(msg, 'bad', fnErr(e)));
}

/* ---------- back from MyPay ---------- */
function renderPaid(orderId) {
  const s = page('نتيجة الدفع', '', 'home');
  const st = el('div'); s.append(st); fbk(st, 'info', '⏳ جارٍ تأكيد الدفع… لا تغلق الصفحة.');
  if (!ACC.user) { fbk(st, 'info', 'سجّل الدخول بنفس الحساب لنتأكد من الدفع.'); return; }
  let n = 0;
  const tick = async () => {
    try { const d = await getDoc(doc(db, 'subscriptions', orderId));
      if (d.exists()) { await loadSubs(); D.cheer && D.cheer('win'); fbk(st, 'ok', '🎉 تم الدفع وتفعيل اشتراكك حتى ' + fmtDate(d.data().end.toMillis()) + '.');
        s.append(el('button', { class: 'btn sun', text: 'ابدأ التعلّم ←', onclick: () => go('home') })); return; }
    } catch (e) {}
    if (++n < 30) setTimeout(tick, 3000);
    else { fbk(st, 'bad', 'لم يصلنا تأكيد الدفع بعد. إذا خُصم المبلغ فسيُفعَّل اشتراكك تلقائياً خلال دقائق؛ وإن لم يُفعَّل تواصل معنا وأرسل رقم الطلب.');
      s.append(el('p', { class: 'note', dir: 'ltr', text: 'رقم الطلب: ' + orderId })); }
  };
  tick();
}

/* ---------- admin dashboard ---------- */
const ROLE_AR = { student: 'طالب', parent: 'ولي أمر', teacher: 'معلم' };
/* ---------- admin: open / close grades, subjects, lessons; maintenance; open-for-all day ---------- */
async function loadAccess() { try { const d = await getDoc(doc(db, 'config', 'access')); ACC.access = d.exists() ? d.data() : {}; } catch (e) { ACC.access = ACC.access || {}; } }
function accessBox() {
  const A = JSON.parse(JSON.stringify(ACC.access || {})); ['closed', 'subsOnly', 'extraFree'].forEach(k => A[k] = new Set(A[k] || [])); A.maint = A.maint || { on: false, msg: '' };
  const box = el('div', { class: 'panel accbox' }, el('b', { text: '🔐 فتح وإغلاق المحتوى' }),
    el('span', { class: 'note', text: 'لكل صف أو مادة أو درس: مفتوح (حسب الاشتراك العادي)، أو مجاني للجميع، أو للمشتركين فقط (حتى الدروس المجانية)، أو مغلق (للمراجعة).' }));
  const msg = el('div'); const body = el('div', { class: 'stack' });
  const mOn = el('input', { type: 'checkbox', checked: A.maint.on ? '' : null }), mMsg = el('input', { value: A.maint.msg || '', placeholder: 'رسالة الصيانة (اختياري)' });
  const oAll = el('input', { type: 'checkbox', checked: A.openAll ? '' : null });
  box.append(el('label', { class: 'sndrow' }, oAll, el('span', {}, el('b', { text: '🎉 افتح المنصة كاملة مجاناً للجميع' }), el('small', { class: 'note', text: 'مثلاً يوم الجمعة أو أيام العروض. (يحتاج الزائر تسجيل الدخول لفتح الدروس المدفوعة)' }))),
    el('label', { class: 'sndrow' }, mOn, el('span', {}, el('b', { text: '🛠️ إغلاق كامل للصيانة' }), el('small', { class: 'note', text: 'يرى الجميع صفحة صيانة، ما عدا المدير.' }))), mMsg);
  const state = k => A.closed.has(k) ? 'closed' : A.subsOnly.has(k) ? 'subs' : A.extraFree.has(k) ? 'free' : 'open';
  const setState = (k, v) => { ['closed', 'subsOnly', 'extraFree'].forEach(x => A[x].delete(k)); if (v === 'closed') A.closed.add(k); if (v === 'subs') A.subsOnly.add(k); if (v === 'free') A.extraFree.add(k); };
  const OPTS = [['open', 'عادي'], ['free', 'مجاني'], ['subs', 'للمشتركين'], ['closed', 'مغلق']];
  const picker = (k, redraw) => { const w = el('div', { class: 'accpick' }); OPTS.forEach(([v, t]) => w.append(el('button', { class: 'btn ghost sm acc-' + v + (state(k) === v ? ' on' : ''), text: t, onclick: () => { setState(k, v); redraw(); } }))); return w; };
  const gsel = el('select', { class: 'qsel' }, ...GRADES.map(([g, n]) => el('option', { value: g, text: 'الصف ' + n })));
  const draw = () => { body.innerHTML = ''; const g = gsel.value; const subs = (D.App.catalog && D.App.catalog.grades[g]) || [];
    body.append(el('div', { class: 'accrow head' }, el('b', { text: 'الصف ' + gradeName(g) + ' كاملاً' }), picker('g' + g, draw)));
    subs.forEach(sb => { const k = 'g' + g + '-' + sb.id; const row = el('div', { class: 'accrow' }, el('span', {}, el('b', { text: sb.name }), el('button', { class: 'linkbtn', text: sb._accOpen ? '▲ إخفاء الدروس' : '▼ الدروس', onclick: () => { sb._accOpen = !sb._accOpen; draw(); } })), picker(k, draw));
      body.append(row);
      if (sb._accOpen) { const ls = []; (sb.books || [{ units: sb.units }]).forEach(b => (b.units || []).forEach(u => u.lessons.forEach(l => { if (l.ready && !ls.some(x => x.id === l.id)) ls.push(l); })));
        const lw = el('div', { class: 'ctrl-list' }); ls.forEach(l => lw.append(el('div', { class: 'accrow sm' }, el('span', { text: l.title }), picker('l-' + l.id, draw)))); body.append(lw); } });
    const cnt = A.closed.size + A.subsOnly.size + A.extraFree.size; body.append(el('span', { class: 'note', text: 'إعدادات خاصة مفعّلة: ' + cnt }));
  };
  gsel.addEventListener('change', draw);
  box.append(el('b', { text: 'اختر الصف:' }), gsel, body, el('button', { class: 'btn sun', text: '💾 حفظ الإعدادات', onclick: async e => { e.target.disabled = true;
    try { await call('adminSetAccess', { maint: { on: mOn.checked, msg: mMsg.value }, openAll: oAll.checked, closed: [...A.closed], subsOnly: [...A.subsOnly], extraFree: [...A.extraFree] });
      await loadAccess(); fbk(msg, 'ok', '✓ حُفظت. تظهر للمستخدمين عند فتح المنصة أو تحديثها.'); } catch (x) { fbk(msg, 'bad', fnErr(x)); } e.target.disabled = false; } }), msg);
  setTimeout(draw, 0); return box;
}
/* ---------- admin: cloud voice (Google Chirp HD) — on/off, voice per stage, speed, audition ---------- */
function ttsBox() {
  const T0 = (ACC.access || {}).tts || {};
  const stage = (x, oldV, oldR, defV) => { x = x || {}; return { rate: Number(x.rate != null ? x.rate : (oldR != null ? oldR : 0.9)), a: x.a || oldV || defV, b: x.b || '', mode: x.mode || 'single', subj: Object.assign({}, x.subj || {}) }; };
  const C = { on: !!T0.on, p: stage(T0.p, T0.f, T0.rate, 'ar-XA-Chirp3-HD-Aoede'), s: stage(T0.s, T0.m, T0.rate, 'ar-XA-Chirp3-HD-Charon') };
  const stBox = el('div', { class: 'feedback ' + (C.on ? 'ok' : 'info'), text: C.on ? '✅ الصوت الجديد مفعّل الآن في كل الدروس' : '⏸️ الصوت الجديد غير مفعّل بعد — اضغط «تفعيل الصوت الجديد الآن»' });
  const box = el('div', { class: 'panel accbox' }, el('b', { text: '🔊 القراءة الصوتية التلقائية' }),
    el('span', { class: 'note', text: 'صوت Google المختار هو الصوت الرسمي لكل الدروس، حتى لو لم يكن في جهاز الطالب صوت عربي. لكل مرحلة سرعة خاصة وصوتان (مثلاً معلم ومعلمة)، وتختار كيف يُستعملان. يُنشأ صوت كل جملة مرة واحدة ويُحفظ للجميع.' }), stBox);
  const msg = el('div'), body = el('div', { class: 'stack' }); box.append(body, msg);
  const sample = el('textarea', { rows: '2', text: 'أحسنت يا بطل! اسمع جيداً، ثم اضغط على حرف الباء. خمسة في ستة يساوي ثلاثين.' });
  let audio = null;
  const tryV = async (voice, rate, btn) => { btn.disabled = true; fbk(msg, 'info', '⏳ جارٍ التوليد…');
    try { const r = await call('adminTts', { op: 'try', text: sample.value, voice, rate }); msg.innerHTML = '';
      if (audio) audio.pause(); audio = new Audio('data:audio/mpeg;base64,' + r.audio); audio.play(); } catch (e) { fbk(msg, 'bad', fnErr(e)); } btn.disabled = false; };
  const SUBJ = { p: [['ar', 'اللغة العربية'], ['math', 'الرياضيات'], ['sci', 'العلوم'], ['isl', 'التربية الإسلامية'], ['soc', 'الاجتماعيات'], ['civ', 'التربية الوطنية'], ['comp', 'الحاسوب']],
    s: [['ar', 'اللغة العربية'], ['math', 'الرياضيات'], ['sci', 'العلوم'], ['isl', 'التربية الإسلامية'], ['hist', 'التاريخ'], ['geo', 'الجغرافيا'], ['civ', 'التربية الوطنية'], ['comp', 'الحاسوب']] };
  body.append(el('span', { class: 'note', text: 'جارٍ جلب الأصوات…' }));
  call('adminTts', { op: 'voices' }).then(r => { body.innerHTML = '';
    const list = r.voices.filter(v => /Chirp3-HD|Chirp-HD|Neural2|Wavenet/.test(v.name)).sort((a, b) => (/Chirp3/.test(b.name) - /Chirp3/.test(a.name)) || a.name.localeCompare(b.name));
    const lab = v => v.name.replace('ar-XA-', '').replace('Chirp3-HD-', '') + (v.g === 'FEMALE' ? ' — صوت أنثى' : v.g === 'MALE' ? ' — صوت ذكر' : '');
    const vsel = (val, onch, blank) => { const x = el('select', { class: 'qsel', onchange: e => onch(e.target.value) }, ...(blank ? [el('option', { value: '', text: blank })] : []), ...list.map(v => el('option', { value: v.name, text: lab(v) }))); x.value = val || ''; return x; };
    const setOn = async (v, btn) => { btn.disabled = true;
      try { await call('adminTts', { op: 'cfg', on: v, p: C.p, s: C.s }); await loadAccess(); C.on = v;
        stBox.className = 'feedback ' + (v ? 'ok' : 'info'); stBox.textContent = v ? '✅ الصوت الجديد مفعّل الآن في كل الدروس' : '⏸️ الصوت الجديد موقوف'; fbk(msg, 'ok', v ? '✓ تم التفعيل. افتح أي درس وجرّب.' : '✓ تم الإيقاف.'); drawOnBtn(); }
      catch (x) { fbk(msg, 'bad', fnErr(x)); } btn.disabled = false; };
    const onWrap = el('div'); const drawOnBtn = () => { onWrap.innerHTML = ''; onWrap.append(C.on ? el('button', { class: 'btn ghost', text: '⏸️ إيقاف الصوت الجديد', onclick: e => setOn(false, e.target) }) : el('button', { class: 'btn sun paybig', text: '✅ تفعيل الصوت الجديد الآن', onclick: e => setOn(true, e.target) })); };
    drawOnBtn();
    const stagePanel = (k, title) => { const S = C[k]; const w = el('div', { style: 'border:1px solid var(--line);border-radius:14px;padding:10px;display:flex;flex-direction:column;gap:8px' });
      const draw = () => { w.innerHTML = '';
        const rl = el('b', { text: 'السرعة: ' + S.rate.toFixed(2) + (S.rate < 0.85 ? ' (بطيئة)' : S.rate > 1.05 ? ' (سريعة)' : ' (عادية)') });
        w.append(el('b', { style: 'font-size:1.05rem', text: title }), rl, el('input', { type: 'range', min: '0.65', max: '1.2', step: '0.05', value: String(S.rate), oninput: e => { S.rate = Number(e.target.value); rl.textContent = 'السرعة: ' + S.rate.toFixed(2) + (S.rate < 0.85 ? ' (بطيئة)' : S.rate > 1.05 ? ' (سريعة)' : ' (عادية)'); } }),
          el('span', { class: 'note', text: 'الصوت الأول (الأساسي):' }), el('div', { class: 'row', style: 'gap:6px' }, vsel(S.a, v => { S.a = v; }), el('button', { class: 'btn ghost sm', text: '▶ اسمع', onclick: e => tryV(S.a, S.rate, e.target) })),
          el('span', { class: 'note', text: 'الصوت الثاني (مثلاً صوت ذكر إذا كان الأول أنثى):' }), el('div', { class: 'row', style: 'gap:6px' }, vsel(S.b, v => { S.b = v; }, '— بدون صوت ثانٍ —'), el('button', { class: 'btn ghost sm', text: '▶ اسمع', onclick: e => S.b && tryV(S.b, S.rate, e.target) })),
          el('span', { class: 'note', text: 'كيف تُستعمل الأصوات في الدروس؟' }));
        [['single', '🎙️ صوت واحد في كل الدروس', 'الصوت الأول فقط'], ['alt', '🔁 تناوب بين الصوتين حسب الدرس', 'درس بصوت المعلم ودرس بصوت المعلمة — كأن الدروس من أكثر من مدرّس'], ['subject', '📚 صوت لكل مادة', 'تختار صوت كل مادة، ويبقى نفسه في كل صفوف المرحلة']].forEach(([m, t, d]) =>
          w.append(el('label', { class: 'sndrow', style: 'margin:0' }, el('input', { type: 'radio', name: 'tmode_' + k, checked: S.mode === m ? '' : null, onchange: () => { S.mode = m; draw(); } }), el('span', {}, el('b', { text: t }), el('small', { class: 'note', text: ' — ' + d })))));
        if (S.mode === 'subject') SUBJ[k].forEach(([sid, sn]) => w.append(el('div', { class: 'row', style: 'gap:6px;align-items:center' }, el('span', { style: 'min-width:110px;font-weight:700', text: sn }),
          vsel(S.subj[sid] || '', v => { if (v) S.subj[sid] = v; else delete S.subj[sid]; }, '— الصوت الأول —'), el('button', { class: 'btn ghost sm', text: '▶', onclick: e => tryV(S.subj[sid] || S.a, S.rate, e.target) }))));
        if (S.mode === 'alt' && !S.b) w.append(el('span', { class: 'note', style: 'color:#b45309', text: '⚠️ اختر الصوت الثاني ليعمل التناوب.' })); };
      draw(); return w; };
    const st = r.stats || {};
    body.append(onWrap, stagePanel('p', '🧒 الصفوف 1–6'), stagePanel('s', '🧑 الصفوف 7–9'),
      el('span', { class: 'note', text: 'نص التجربة (غيّره كما تريد):' }), sample,
      el('span', { class: 'note', text: 'المحفوظ: ' + (st.items || 0) + ' جملة (' + (st.chars || 0) + ' حرف) · اليوم: ' + (r.today || 0) + ' حرف. مجاني حتى نحو مليون حرف شهرياً. تغيير الصوت أو السرعة يُنشئ الجمل من جديد تلقائياً عند الحاجة.' }),
      el('button', { class: 'btn', text: '💾 حفظ الأصوات والسرعات', onclick: async e => { e.target.disabled = true;
        try { await call('adminTts', { op: 'cfg', on: C.on, p: C.p, s: C.s }); await loadAccess(); fbk(msg, 'ok', '✓ حُفظت. تظهر في الدروس خلال دقيقة.'); }
        catch (x) { fbk(msg, 'bad', fnErr(x)); } e.target.disabled = false; } }));
  }).catch(e => { body.innerHTML = ''; body.append(el('span', { class: 'note', text: '⚠️ ' + fnErr(e) }),
    el('a', { href: 'https://console.cloud.google.com/apis/library/texttospeech.googleapis.com?project=mujtahid-810d7', target: '_blank', rel: 'noopener', class: 'btn sun', text: 'تفعيل Cloud Text-to-Speech API' })); });
  return box;
}
/* ---------- admin: textbooks (PDF) — per grade / subject: for everyone, subscribers only, or hidden ---------- */
function booksBox() {
  const M = Object.assign({}, (ACC.access || {}).books || {});
  const box = el('div', { class: 'panel accbox' }, el('b', { text: '📚 الكتب المدرسية PDF' }),
    el('span', { class: 'note', text: 'لكل صف أو مادة: تظهر للجميع، أو للمشتركين في ذلك الصف فقط، أو مخفية. إعداد المادة يتقدّم على إعداد الصف، وإعداد الصف على الإعداد العام.' }));
  const OPTS = [['all', 'للجميع'], ['subs', 'للمشتركين'], ['off', 'مخفية']], CLS = { all: 'free', subs: 'subs', off: 'closed' };
  const cur = k => M[k] || (k === 'all' ? 'all' : '');
  const pick = (k, redraw, inherit) => { const w = el('div', { class: 'accpick' });
    if (inherit) w.append(el('button', { class: 'btn ghost sm acc-open' + (!M[k] ? ' on' : ''), text: 'كالصف', onclick: () => { delete M[k]; redraw(); } }));
    OPTS.forEach(([v, t]) => w.append(el('button', { class: 'btn ghost sm acc-' + CLS[v] + (cur(k) === v ? ' on' : ''), text: t, onclick: () => { if (v === 'all' && k !== 'all' && !inherit) delete M[k]; else M[k] = v; if (k === 'all' && v === 'all') delete M.all; redraw(); } }))); return w; };
  const body = el('div', { class: 'stack' }), msg = el('div'); let B = null, open = {};
  const draw = () => { body.innerHTML = ''; if (!B) { body.append(el('span', { class: 'note', text: 'جارٍ التحميل…' })); return; }
    body.append(el('div', { class: 'accrow head' }, el('b', { text: 'كل الكتب (الإعداد العام)' }), pick('all', draw)));
    Object.keys(B.grades).forEach(g => { const subs = [...new Set(B.grades[g].map(b => b.s))]; const gk = 'g' + g;
      body.append(el('div', { class: 'accrow' }, el('span', {}, el('b', { text: 'الصف ' + gradeName(g) + ' (' + B.grades[g].length + ' كتاب)' }), el('button', { class: 'linkbtn', text: open[g] ? '▲ إخفاء المواد' : '▼ المواد', onclick: () => { open[g] = !open[g]; draw(); } })), pick(gk, draw, true)));
      if (open[g]) { const lw = el('div', { class: 'ctrl-list' }); subs.forEach(sb => lw.append(el('div', { class: 'accrow sm' }, el('span', { text: (B.subjects[sb] || {}).name || sb }), pick(gk + '-' + sb, draw, true)))); body.append(lw); } });
    body.append(el('span', { class: 'note', text: 'إعدادات خاصة: ' + Object.keys(M).length + ' — "كالصف" يعني يأخذ إعداد الصف أو الإعداد العام.' })); };
  fetch('data/books.json').then(r => r.json()).then(j => { B = j; draw(); }).catch(() => fbk(msg, 'bad', 'تعذّر تحميل قائمة الكتب.'));
  box.append(body, el('button', { class: 'btn sun', text: '💾 حفظ إعدادات الكتب', onclick: async e => { e.target.disabled = true;
    try { await call('adminSetBooks', { books: M }); await loadAccess(); fbk(msg, 'ok', '✓ حُفظت. تظهر للمستخدمين عند فتح المنصة أو تحديثها.'); } catch (x) { fbk(msg, 'bad', fnErr(x)); } e.target.disabled = false; } }), msg);
  draw(); return box;
}
/* ---------- admin: flexible plans (price, duration, kids limit) ---------- */
function plansBox() {
  const box = el('div', { class: 'panel accbox' }, el('b', { text: '💰 الباقات والأسعار والمدة' }),
    el('span', { class: 'note', text: 'أضف أي باقة: النوع، السعر، المدة (حتى 31 أغسطس، أو عدد أيام من يوم الاشتراك، أو حتى تاريخ محدد مثل نهاية الامتحانات)، وعدد الأبناء لباقات ولي الأمر. الباقة غير المفعّلة أو بسعر 0 لا تظهر للمشتركين.' }));
  const body = el('div', { class: 'stack' }), msg = el('div'); box.append(body, msg);
  const BASES = [['student_subject', 'طالب — مادة واحدة'], ['student_grade', 'طالب — الصف كاملاً'], ['parent_grade', 'ولي أمر — صف واحد'], ['parent_all', 'ولي أمر — كل الصفوف']];
  let L = null;
  const slug = () => 'p' + Date.now().toString(36).slice(-6);
  const draw = () => { body.innerHTML = '';
    L.forEach((p, i) => { p.dur = p.dur || { t: 'season' };
      const inp = (k, attrs) => el('input', { ...attrs, value: p[k] == null ? '' : String(p[k]), oninput: e => { p[k] = attrs.type === 'number' ? Number(e.target.value) : e.target.value; } });
      const base = el('select', { class: 'qsel', onchange: e => { p.base = e.target.value; if (p.base.startsWith('parent') && !p.kids) p.kids = 5; draw(); } }, ...BASES.map(([v, t]) => el('option', { value: v, text: t }))); base.value = p.base;
      const dt = el('select', { class: 'qsel', onchange: e => { p.dur = { t: e.target.value, days: p.dur.days || 30, until: p.dur.until || '' }; draw(); } },
        el('option', { value: 'season', text: 'حتى 31 أغسطس (نهاية العام الدراسي)' }), el('option', { value: 'days', text: 'عدد أيام من يوم الاشتراك' }), el('option', { value: 'until', text: 'حتى تاريخ محدد' })); dt.value = p.dur.t;
      const durIn = p.dur.t === 'days' ? el('div', { class: 'row', style: 'gap:6px;flex-wrap:wrap' }, el('input', { type: 'number', min: '1', max: '400', value: String(p.dur.days || 30), style: 'width:90px', oninput: e => { p.dur.days = Number(e.target.value); } }), el('span', { class: 'note', text: 'يوماً' }),
          ...[[30, 'شهر'], [60, 'شهران'], [90, '3 أشهر']].map(([n, t]) => el('button', { class: 'btn ghost sm', text: t, onclick: () => { p.dur.days = n; draw(); } })))
        : p.dur.t === 'until' ? el('input', { type: 'date', value: p.dur.until || '', oninput: e => { p.dur.until = e.target.value; } }) : null;
      const isP = String(p.base).startsWith('parent');
      body.append(el('div', { class: 'tc-adm-row', style: 'border:1px solid var(--line);border-radius:14px;padding:10px;display:flex;flex-direction:column;gap:6px' + (p.on ? '' : ';opacity:.7') },
        el('div', { class: 'row', style: 'justify-content:space-between;align-items:center' },
          el('label', { class: 'sndrow', style: 'margin:0' }, el('input', { type: 'checkbox', checked: p.on ? '' : null, onchange: e => { p.on = e.target.checked; draw(); } }), el('b', { text: p.on ? 'مفعّلة' : 'غير مفعّلة' })),
          el('span', {}, el('button', { class: 'linkbtn', text: '⬆', onclick: () => { if (i) { [L[i - 1], L[i]] = [L[i], L[i - 1]]; draw(); } } }), el('button', { class: 'linkbtn', text: '⬇', onclick: () => { if (i < L.length - 1) { [L[i + 1], L[i]] = [L[i], L[i + 1]]; draw(); } } }),
            el('button', { class: 'linkbtn', text: '🗑️', onclick: e => { if (e.target.dataset.c !== '1') { e.target.dataset.c = '1'; e.target.textContent = 'تأكيد الحذف'; return; } L.splice(i, 1); draw(); } }))),
        inp('name', { placeholder: 'اسم الباقة كما يراه المشترك' }), inp('desc', { placeholder: 'وصف قصير (اختياري)' }),
        el('label', { class: 'prow' }, el('span', { text: 'النوع' }), base),
        el('label', { class: 'prow' }, el('span', { text: 'السعر (دينار)' }), inp('price', { type: 'number', min: '0', step: '0.5' })),
        el('label', { class: 'prow' }, el('span', { text: 'المدة' }), dt), durIn,
        isP ? el('label', { class: 'prow' }, el('span', { text: 'أقصى عدد للأبناء' }), inp('kids', { type: 'number', min: '1', max: '5' })) : null)); });
    body.append(el('button', { class: 'btn ghost', text: '➕ إضافة باقة', onclick: () => { L.push({ id: slug(), on: false, base: 'student_grade', name: '', desc: '', price: 0, dur: { t: 'days', days: 30 }, kids: 0 }); draw(); } }),
      el('button', { class: 'btn sun', text: '💾 حفظ الباقات', onclick: async e => { e.target.disabled = true;
        try { const r = await call('adminSetPlans', { list: L }); L = r.list; draw(); fbk(msg, 'ok', '✓ حُفظت الباقات. تظهر للمشتركين فوراً.'); } catch (x) { fbk(msg, 'bad', fnErr(x)); } e.target.disabled = false; } })); };
  body.append(el('span', { class: 'note', text: 'جارٍ التحميل…' }));
  call('adminGetPlans', {}).then(r => { L = r.list; draw(); }).catch(e => { body.innerHTML = ''; fbk(msg, 'bad', fnErr(e)); });
  return box;
}

/* ---------- admin: supervisors with specific permissions (owner only) ---------- */
const PERM_AR = { stats: '📊 الإحصائيات والمشتركون', grant: '🎁 منح وإلغاء الاشتراكات المجانية', plans: '💰 الباقات والأسعار', access: '🔐 فتح وإغلاق الدروس والكتب', tts: '🔊 الأصوات',
  teach_req: '👩‍🏫 قبول طلبات المعلمين', teach_courses: '🎬 مراجعة ونشر دورات الفيديو', teach_wd: '💸 طلبات سحب أرصدة المعلمين', browse: '👁️ تصفّح كل الدروس للمراجعة', push: '🔔 إرسال الإشعارات' };
function staffBox() {
  const box = el('div', { class: 'panel accbox' }, el('b', { text: '🧑‍💼 المشرفون' }),
    el('span', { class: 'note', text: 'أضف مشرفاً من الأشخاص المسجّلين في المنصة، واختر صلاحياته بالضبط. يرى المشرف في لوحة الإدارة الأقسام المسموحة له فقط، ولا يستطيع إضافة مشرفين أو تغيير إعدادات المنصة الأساسية.' }));
  const list = el('div', { class: 'stack' }), msg = el('div'), q = el('input', { placeholder: 'رقم الهاتف 09xxxxxxxx أو البريد', 'aria-label': 'بحث' }), res = el('div', { class: 'stack' });
  const permPick = (sel) => { const w = el('div', { class: 'stack', style: 'gap:2px' }); Object.entries(PERM_AR).forEach(([k, t]) => w.append(el('label', { class: 'sndrow', style: 'margin:0' }, el('input', { type: 'checkbox', checked: sel.has(k) ? '' : null, onchange: e => { e.target.checked ? sel.add(k) : sel.delete(k); } }), el('span', { text: t })))); return w; };
  const drawList = staff => { list.innerHTML = '';
    if (!staff.length) list.append(el('span', { class: 'note', text: 'لا يوجد مشرفون بعد.' }));
    staff.forEach(x => { const sel = new Set(x.perms || []); const m = el('div');
      list.append(el('div', { style: 'border:1px solid var(--line);border-radius:14px;padding:10px;display:flex;flex-direction:column;gap:6px' },
        el('b', { text: (x.name || '—') }), el('span', { class: 'note', dir: 'ltr', text: x.phone || x.email || '' }), permPick(sel),
        el('div', { class: 'row', style: 'gap:6px' }, el('button', { class: 'btn sm', text: '💾 حفظ الصلاحيات', onclick: async () => { try { const r = await call('adminStaff', { op: 'set', uid: x.uid, perms: [...sel] }); drawList(r.staff); fbk(msg, 'ok', '✓ حُفظت. يعيد المشرف فتح المنصة لتظهر له.'); } catch (e) { fbk(m, 'bad', fnErr(e)); } } }),
          el('button', { class: 'btn ghost sm', text: '🗑️ إزالة', onclick: async e => { if (e.target.dataset.c !== '1') { e.target.dataset.c = '1'; e.target.textContent = 'تأكيد الإزالة'; return; } try { const r = await call('adminStaff', { op: 'remove', uid: x.uid }); drawList(r.staff); } catch (er) { fbk(m, 'bad', fnErr(er)); } } })), m)); }); };
  box.append(list, el('b', { text: '➕ إضافة مشرف' }), el('div', { class: 'code' }, q, el('button', { class: 'btn', text: 'بحث', onclick: async () => { res.innerHTML = ''; msg.innerHTML = '';
    try { const r = await call('adminFindUser', { q: q.value.trim() });
      if (!r.users.length) { fbk(msg, 'info', 'لا يوجد حساب بهذا الرقم/البريد. اطلب منه أن يسجّل في المنصة أولاً.'); return; }
      r.users.forEach(u => { const sel = new Set(['teach_req', 'teach_courses']);
        res.append(el('div', { style: 'border:1px solid var(--line);border-radius:14px;padding:10px;display:flex;flex-direction:column;gap:6px' }, el('b', { text: (u.name || '—') + ' — ' + (ROLE_AR[u.role] || u.role) }), el('span', { class: 'note', dir: 'ltr', text: u.phone || u.email || '' }),
          el('span', { class: 'note', text: 'اختر صلاحياته:' }), permPick(sel),
          el('button', { class: 'btn sun', text: 'اجعله مشرفاً', onclick: async () => { try { const x = await call('adminStaff', { op: 'set', uid: u.uid, perms: [...sel] }); drawList(x.staff); res.innerHTML = ''; fbk(msg, 'ok', '✓ أُضيف المشرف. يسجّل دخوله ثم يفتح «حسابي ← لوحة الإدارة».'); } catch (e) { fbk(msg, 'bad', fnErr(e)); } } }))); });
    } catch (e) { fbk(msg, 'bad', fnErr(e)); } } })), res, msg);
  call('adminStaff', { op: 'list' }).then(r => drawList(r.staff)).catch(e => fbk(msg, 'bad', fnErr(e)));
  return box;
}

/* ---------- admin: notifications (manual campaigns + automatic rules) ---------- */
function pushBox() {
  const box = el('div', { class: 'panel accbox' }, el('b', { text: '🔔 الإشعارات' }),
    el('span', { class: 'note', text: 'تصل لمن وافق على الإشعارات في جهازه، حتى والمنصة مغلقة. اختر الفئة واكتب الرسالة، أو استخدم قالباً جاهزاً.' }));
  const info = el('div'), msg = el('div'); box.append(info);
  const sel = (opts, v) => { const x = el('select', { class: 'qsel' }, ...opts.map(([k, t]) => el('option', { value: k, text: t }))); x.value = v; return x; };
  const role = sel([['all', 'كل البالغين (أولياء أمور وطلاب ومعلمون)'], ['parent', 'أولياء الأمور'], ['student', 'الطلاب'], ['teacher', 'المعلمون'], ['kids', 'الطلاب وأجهزة الأبناء']], 'all');
  const sub = sel([['', 'المشتركون وغير المشتركين'], ['no', 'غير المشتركين فقط'], ['yes', 'المشتركون فقط']], '');
  const grade = sel([['', 'كل الصفوف'], ...GRADES.map(([g, n]) => [g, 'الصف ' + n])], '');
  const inact = sel([['0', 'بغض النظر عن آخر نشاط'], ['7', 'لم يفتحوا المنصة منذ 7 أيام'], ['14', 'منذ 14 يوماً'], ['30', 'منذ 30 يوماً'], ['60', 'منذ 60 يوماً']], '0');
  const phone = el('input', { placeholder: 'أو شخص واحد برقم هاتفه 09xxxxxxxx (اختياري)', dir: 'ltr', inputmode: 'numeric' });
  const title = el('input', { placeholder: 'العنوان (قصير وواضح)' }), body = el('textarea', { rows: '3', placeholder: 'نص الإشعار' });
  const link = sel([['#home', 'يفتح: الرئيسية'], ['#subscribe', 'يفتح: صفحة الاشتراك'], ['#books', 'يفتح: الكتب المدرسية'], ['#courses', 'يفتح: دورات المعلمين'], ['#who', 'يفتح: تقارير الأبناء'], ['#studio', 'يفتح: منصة المعلم'], ['#account', 'يفتح: حسابي']], '#home');
  const aud = () => ({ role: role.value, sub: sub.value, grade: grade.value, inactive: Number(inact.value), phone: phone.value.trim() });
  const TPL = [['📚 الكتب المدرسية', '📚 كتب المنهج الليبي PDF مجاناً', 'حمّل كتب صف ابنك مجاناً وبدون تسجيل من منصة المجتهد.', '#books', ''],
    ['🆕 دروس جديدة', '🆕 دروس جديدة في المجتهد', 'أضفنا دروساً جديدة. افتح المنصة وجرّبها مع ابنك الآن.', '#home', ''],
    ['📝 الامتحانات', '📝 استعدّوا للامتحانات', 'مراجعات وتمارين جاهزة لكل المواد. ابدأوا اليوم ولو بدرس واحد.', '#home', ''],
    ['🎁 عرض للاشتراك', '🎁 عرض خاص لفترة محدودة', 'اشترك الآن بسعر رمزي وافتح كل الدروس لأبنائك.', '#subscribe', 'no'],
    ['🎥 دورات المعلمين', '🎥 دورات فيديو من معلمين معتمدين', 'شروحات وحصص تقوية لكل المواد. الدرس الأول مجاني.', '#courses', ''],
    ['💙 للغائبين', '💙 اشتقنا لكم في المجتهد', 'خمس دقائق اليوم تصنع فرقاً. هيا نكمل من حيث توقفنا!', '#home', '']];
  const cnt = el('span', { class: 'note' });
  const sendB = el('button', { class: 'btn sun', text: '📤 إرسال' });
  sendB.onclick = async () => { msg.innerHTML = '';
    if (sendB.dataset.c !== '1') { try { const r = await call('adminPush', { op: 'count', aud: aud() }); if (!r.n) { fbk(msg, 'info', 'لا يوجد أحد في هذه الفئة فعّل الإشعارات بعد.'); return; }
      sendB.dataset.c = '1'; sendB.textContent = '✓ تأكيد الإرسال إلى ' + r.n + ' جهاز'; } catch (e) { fbk(msg, 'bad', fnErr(e)); } return; }
    sendB.disabled = true; fbk(msg, 'info', 'جارٍ الإرسال…');
    try { const r = await call('adminPush', { op: 'send', aud: aud(), title: title.value, body: body.value, link: link.value }); fbk(msg, 'ok', '✓ أُرسل إلى ' + r.ok + ' جهاز' + (r.fail ? ' (تعذّر ' + r.fail + ')' : '') + '.'); loadInfo(); }
    catch (e) { fbk(msg, 'bad', fnErr(e)); } sendB.disabled = false; sendB.dataset.c = ''; sendB.textContent = '📤 إرسال'; };
  [role, sub, grade, inact, phone].forEach(x => x.addEventListener('change', () => { sendB.dataset.c = ''; sendB.textContent = '📤 إرسال'; cnt.textContent = ''; }));
  box.append(el('b', { text: '✉️ إشعار جديد' }), el('div', { class: 'row', style: 'gap:6px;flex-wrap:wrap' }, ...TPL.map(([n, t, b, l, sb]) => el('button', { class: 'btn ghost sm', text: n, onclick: () => { title.value = t; body.value = b; link.value = l; if (sb) sub.value = sb; } }))),
    el('span', { class: 'note', text: 'إلى من؟' }), role, sub, grade, inact, phone,
    el('div', { class: 'row', style: 'gap:6px;align-items:center' }, el('button', { class: 'btn ghost sm', text: '👥 كم شخصاً؟', onclick: async () => { cnt.textContent = '…'; try { const r = await call('adminPush', { op: 'count', aud: aud() }); cnt.textContent = r.n + ' جهاز'; } catch (e) { cnt.textContent = fnErr(e); } } }), cnt),
    title, body, link,
    el('div', { class: 'row', style: 'gap:6px;flex-wrap:wrap' }, el('button', { class: 'btn ghost', text: '📲 جرّب على جهازي', onclick: async () => { try { await call('adminPush', { op: 'test', title: title.value, body: body.value, link: link.value }); fbk(msg, 'ok', '✓ أُرسل إلى أجهزتك.'); } catch (e) { fbk(msg, 'bad', fnErr(e)); } } }), sendB), msg);
  const autoBox = el('div', { class: 'stack' }), logBox = el('div', { class: 'stack' });
  box.append(el('b', { text: '⚙️ الإشعارات الآلية' }), el('span', { class: 'note', text: 'تُرسل تلقائياً كل يوم الساعة 6:30 مساءً (إشعار واحد كحد أقصى لكل شخص في اليوم)، والأحداث تُرسل فوراً.' }), autoBox,
    el('b', { text: '🗂️ آخر الإرسالات' }), logBox);
  const AUTO_AR = { nosub: ['👋 سجّل ولم يشترك', 'بعد 2 و7 و14 و30 يوماً من التسجيل (أولياء الأمور والطلاب).', true],
    inactive: ['💙 الغائبون', 'من لم يفتح المنصة 14 يوماً، ومرة كل 14 يوماً.', true],
    expiry: ['⏳ قرب انتهاء الاشتراك', 'قبل 3 أيام من انتهاء الاشتراك. {days} = عدد الأيام.', true],
    streak: ['🔥 سلسلة الطالب', 'للطالب أو جهاز الابن إذا لم يدرس اليوم وسلسلته يومان فأكثر. {n} = عدد الأيام.', true],
    lowday: ['📚 ابنك درس أقل من هدفه', 'لولي الأمر إذا درس ابنه اليوم أقل من نصف هدفه (مرتين أسبوعياً على الأكثر). النص يُكتب تلقائياً باسم الابن.', false],
    weekly: ['📊 تقرير أسبوعي', 'كل خميس لولي الأمر: دقائق دراسة كل ابن هذا الأسبوع.', false],
    events: ['⚡ أحداث فورية', 'تأكيد الدفع، قبول المعلم أو دورته، مشترك جديد في دورة، تحويل رصيد.', false],
    staff: ['🛠️ تنبيه الإدارة', 'لك وللمشرفين: طلب معلم جديد، دورة للمراجعة، طلب سحب.', false] };
  let CFG = null;
  const drawAuto = () => { autoBox.innerHTML = ''; Object.entries(AUTO_AR).forEach(([k, [n, d, ed]]) => { const c = CFG[k];
    const row = el('div', { style: 'border:1px solid var(--line);border-radius:12px;padding:8px;display:flex;flex-direction:column;gap:4px' },
      el('label', { class: 'sndrow', style: 'margin:0' }, el('input', { type: 'checkbox', checked: c.on ? '' : null, disabled: ACC.owner ? null : '', onchange: e => { c.on = e.target.checked; } }), el('span', {}, el('b', { text: n }), el('small', { class: 'note', text: ' — ' + d }))));
    if (ed) row.append(el('input', { value: c.title, disabled: ACC.owner ? null : '', oninput: e => { c.title = e.target.value; } }), el('textarea', { rows: '2', text: c.body, disabled: ACC.owner ? null : '', oninput: e => { c.body = e.target.value; } }));
    autoBox.append(row); });
    if (ACC.owner) autoBox.append(el('button', { class: 'btn', text: '💾 حفظ الإشعارات الآلية', onclick: async () => { try { const r = await call('adminPush', { op: 'cfg', auto: CFG }); CFG = r.cfg; fbk(msg, 'ok', '✓ حُفظت.'); } catch (e) { fbk(msg, 'bad', fnErr(e)); } } })); };
  const loadInfo = () => call('adminPush', { op: 'info' }).then(r => { CFG = r.cfg; drawAuto();
    const b = r.byRole || {}; info.innerHTML = ''; info.append(el('div', { class: 'stats' }, ...[[r.devices, 'جهاز فعّل الإشعارات'], [b.parent || 0, 'أولياء أمور'], [b.student || 0, 'طلاب'], [b.kid || 0, 'أجهزة أبناء'], [b.teacher || 0, 'معلمون']].map(([n, t]) => el('div', { class: 'stat' }, el('b', { text: String(n) }), el('span', { text: t })))));
    logBox.innerHTML = ''; if (!r.log.length) logBox.append(el('span', { class: 'note', text: 'لا توجد إرسالات بعد.' }));
    r.log.forEach(x => logBox.append(el('div', { class: 'kidrow' }, el('span', {}, el('b', { text: x.auto ? '⚙️ ' + x.title : x.title }), el('span', { class: 'note', text: ' · ' + (x.at ? new Date(x.at).toLocaleString('ar-LY-u-nu-latn', { dateStyle: 'medium', timeStyle: 'short' }) : '') + (x.auto ? ' · ' + x.body : '') })), el('b', { text: (x.ok != null ? x.ok : x.n) + ' ✓' })))); })
    .catch(e => fbk(info, 'bad', fnErr(e)));
  loadInfo();
  return box;
}

function grantBox() {
    const gq = el('input', { placeholder: 'رقم الهاتف 09xxxxxxxx أو البريد', 'aria-label': 'بحث' }), gres = el('div', { class: 'stack' }), gm = el('div');
    const gbox = el('div', { class: 'panel accbox' }, el('b', { text: '🎁 منح اشتراك مجاني (أبناؤك، أقاربك…)' }),
      el('span', { class: 'note', text: 'ابحث عن الشخص بعد أن يسجّل في الموقع، ثم اختر صفاً معيّناً أو كل الصفوف. ولي الأمر تُفتح الدروس لكل أبنائه.' }),
      el('div', { class: 'code' }, gq, el('button', { class: 'btn', text: 'بحث', onclick: async () => { gres.innerHTML = ''; gm.innerHTML = '';
        try { const r = await call('adminFindUser', { q: gq.value.trim() });
          if (!r.users.length) { fbk(gm, 'info', 'لا يوجد حساب بهذا الرقم/البريد. اطلب منه أن يسجّل أولاً.'); return; }
          r.users.forEach(u => { const sel = new Set(['*']); const gp = el('div', { class: 'gpick' });
            const drawG = () => { gp.innerHTML = ''; [['*', 'كل الصفوف'], ...GRADES].forEach(([g, n]) => gp.append(el('button', { class: 'btn ghost sm' + (sel.has(g) ? ' on' : ''), text: (sel.has(g) ? '✓ ' : '') + n,
              onclick: () => { if (g === '*') { sel.clear(); sel.add('*'); } else { sel.delete('*'); sel.has(g) ? sel.delete(g) : sel.add(g); if (!sel.size) sel.add('*'); } drawG(); } }))); }; drawG();
            const note = el('input', { placeholder: 'ملاحظة (مثلاً: ابن أخي)', 'aria-label': 'ملاحظة' });
            gres.append(el('div', { class: 'panel accbox' },
              el('b', { text: (u.name || '—') + ' — ' + (ROLE_AR[u.role] || u.role) }),
              el('span', { class: 'note', dir: 'ltr', text: (u.phone || u.email || '') }),
              u.profiles.length ? el('span', { class: 'note', text: 'الملفات: ' + u.profiles.map(p => p.id === 'me' ? 'هو نفسه' : p.name + (p.grade ? ' (' + gradeName(p.grade) + ')' : '')).join('، ') }) : null,
              gp, note, el('button', { class: 'btn sun', text: '🎁 امنح الاشتراك', onclick: async ev => { const b = ev.currentTarget; b.disabled = true; fbk(gm, 'info', 'جارٍ المنح…');
                try { for (const g of sel) await call('adminGrant', { uid: u.uid, grade: g, note: note.value });
                  if (u.uid === ACC.user.uid) await loadSubs();
                  fbk(gm, 'ok', '✓ تم منح الاشتراك (' + [...sel].map(g => g === '*' ? 'كل الصفوف' : 'الصف ' + gradeName(g)).join('، ') + ') حتى 31 أغسطس. على صاحب الحساب أن يعيد فتح الموقع.'); }
                catch (e) { fbk(gm, 'bad', fnErr(e)); } b.disabled = false; } }))); });
        } catch (e) { fbk(gm, 'bad', fnErr(e)); } } })), gres, gm);
    return gbox;
}
function browseBox() {
    return el('div', { class: 'panel accbox' }, el('b', { text: '👁️ تصفّح المنصة كمدير' }),
      el('span', { class: 'note', text: 'تُفتح لك كل الصفوف والمواد والدروس مجاناً (حتى المغلقة) لتراجعها وتجربها، دون أن تتغير المنصة لأي مستخدم آخر.' }),
      el('button', { class: 'btn sun', text: ACC.adminBrowse ? '✓ وضع المدير مفعّل — افتح الصفحة الرئيسية' : '👁️ ابدأ التصفح كمدير', onclick: () => { ACC.adminBrowse = true; store.set('admin_browse', true); setActive(null).then(() => go('home')); } }),
      ACC.adminBrowse ? el('button', { class: 'btn ghost', text: 'إنهاء وضع المدير', onclick: () => { ACC.adminBrowse = false; store.set('admin_browse', false); renderAdmin(); } }) : null);
}
/* ---------- admin: heroes board + activity (all grades, every day / week / month, click a student for his full card) ---------- */
function heroesBox() {
  const box = el('div', { class: 'panel accbox' }, el('b', { text: '🏆 لوحة الأبطال ونشاط الطلاب' }),
    el('span', { class: 'note', text: 'كل الطلاب المسجّلين (مشتركين وتجريبيين) في كل الصفوف. الزائر الذي لم يسجّل الدخول لا يُحسب. اضغط على أي طالب لترى ملفه ونشاطه.' }));
  const top = el('div', { class: 'stack' }), ctrl = el('div', { class: 'stack' }), list = el('div', { class: 'stack' }), msg = el('div'); box.append(top, ctrl, list, msg);
  let period = 'today', grade = '';
  const P = [['today', 'اليوم'], ['yesterday', 'أمس'], ['week', 'آخر 7 أيام'], ['month', 'آخر 30 يوماً']];
  const dname = d => new Date(d + 'T12:00:00').toLocaleDateString('ar-LY-u-nu-latn', { weekday: 'short', day: 'numeric' });
  const bars = (pairs, unit) => { const mx = Math.max(1, ...pairs.map(x => x[1]));
    return el('div', { style: 'display:flex;align-items:flex-end;gap:3px;height:110px;padding:6px 0;direction:ltr' }, ...pairs.slice().reverse().map(([lab, v]) => el('div', { style: 'flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:2px;min-width:0' },
      el('small', { style: 'font-size:.62rem;color:var(--muted)', text: v ? String(v) : '' }), el('div', { style: 'width:100%;border-radius:4px 4px 0 0;background:var(--sea);height:' + Math.max(2, Math.round(v / mx * 70)) + 'px', title: lab + ': ' + v + (unit || '') }),
      el('small', { style: 'font-size:.55rem;color:var(--muted);white-space:nowrap;overflow:hidden;max-width:100%', text: lab })))); };
  const stat = (n, t) => el('div', { class: 'stat' }, el('b', { text: String(n) }), el('span', { text: t }));
  const load = async () => { list.innerHTML = ''; fbk(msg, 'info', 'جارٍ التحميل…');
    try { const r = await call('adminActivity', { op: 'overview', period, grade }); msg.innerHTML = '';
      top.innerHTML = ''; const dd = r.days;
      top.append(el('div', { class: 'stats' }, stat(r.dau[dd[0]], 'نشِط اليوم'), stat(r.dau[dd[1]], 'نشِط أمس'), stat(r.everActive, 'نشِط خلال 30 يوماً'), stat(r.total, 'ملف طالب له نشاط مسجّل')),
        el('span', { class: 'note', text: 'عدد الطلاب النشِطين يومياً (آخر 14 يوماً):' }), bars(dd.slice(0, 14).map(x => [dname(x), r.dau[x]])),
        Object.keys(r.byGrade).length ? el('span', { class: 'note', text: 'اليوم حسب الصف: ' + Object.entries(r.byGrade).sort().map(([g, n]) => (g === '?' ? 'بدون صف' : 'الصف ' + g) + ': ' + n).join(' · ') }) : null);
      list.append(el('b', { text: (P.find(x => x[0] === period) || [])[1] + (grade ? ' — الصف ' + gradeName(grade) : ' — كل الصفوف') + ' (' + r.count + ' طالب)' }));
      if (!r.rows.length) list.append(el('span', { class: 'note', text: 'لا يوجد نشاط في هذه الفترة.' }));
      r.rows.forEach((x, i) => list.append(el('button', { class: 'kidrow', style: 'width:100%;text-align:start;cursor:pointer;font:inherit;color:inherit;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:8px 10px;display:flex;gap:8px;align-items:center', onclick: () => student(x) },
        el('b', { style: 'min-width:28px;text-align:center', text: i < 3 ? ['🥇', '🥈', '🥉'][i] : String(i + 1) }), el('span', { style: 'font-size:1.4rem', text: x.av }),
        el('span', { style: 'flex:1;min-width:0' }, el('b', { text: x.name + (x.grade ? ' — الصف ' + gradeName(x.grade) : '') }), ' ', el('span', { class: 'tag ' + (x.sub ? 'sun' : ''), style: 'font-size:.68rem;padding:1px 7px', text: x.sub ? 'مشترك' : 'تجريبي' }),
          el('div', { class: 'note', style: 'font-size:.75rem', text: '⭐ ' + x.st + ' · ✔️ ' + x.r + (x.acc != null ? ' (' + x.acc + '%)' : '') + ' · ⏱️ ' + x.m + ' د · 📘 ' + x.lessons + ' درس · ' + x.level + (x.owner ? ' · وليّه: ' + x.owner : '') })),
        el('b', { style: 'color:var(--sea)', text: x.pts + ' ن' })))); }
    catch (e) { fbk(msg, 'bad', fnErr(e)); } };
  const drawCtrl = () => { ctrl.innerHTML = '';
    ctrl.append(el('div', { class: 'row', style: 'gap:6px;flex-wrap:wrap' }, ...P.map(([k, t]) => el('button', { class: 'btn sm ' + (k === period ? '' : 'ghost'), text: t, onclick: () => { period = k; drawCtrl(); load(); } }))),
      el('div', { class: 'gpick' }, ...[['', 'كل الصفوف'], ...GRADES].map(([g, n]) => el('button', { class: 'btn ghost sm' + (grade === g ? ' on' : ''), text: n, onclick: () => { grade = g; drawCtrl(); load(); } })))); };
  const student = async x => { const w = el('div', { class: 'stack' }); list.innerHTML = ''; list.append(el('button', { class: 'btn ghost sm', style: 'align-self:flex-start', text: '→ رجوع للقائمة', onclick: load }), w); fbk(w, 'info', 'جارٍ التحميل…');
    try { const r = await call('adminActivity', { op: 'student', uid: x.uid, pid: x.pid }); w.innerHTML = ''; const st = r.stats; const now = Date.now();
      const dd = []; for (let i = 0; i < 14; i++) { const t = new Date(now - i * 864e5 + 2 * 3600e3).toISOString().slice(0, 10); dd.push(t); }
      const m14 = dd.reduce((a, d) => a + (st.mins[d] || 0), 0); let R = 0, W = 0; Object.values(st.log).forEach(L => { R += L.r || 0; W += L.w || 0; });
      const qz = st.qz || []; const qAvg = qz.length ? Math.round(qz.reduce((a, q) => a + (q.n ? q.sc / q.n : 0), 0) / qz.length * 100) : null;
      w.append(el('div', { style: 'display:flex;gap:10px;align-items:center' }, el('span', { style: 'font-size:2.6rem', text: r.av }),
          el('div', {}, el('b', { style: 'font-size:1.15rem', text: r.name }), el('div', { class: 'note', text: (r.grade ? 'الصف ' + gradeName(r.grade) + ' · ' : '') + (st.level || '') + ' · 🔥 ' + st.streak + ' أيام' }))),
        el('div', { class: 'note', text: (x.pid === 'me' ? 'الحساب: ' : 'ولي الأمر: ') + (r.owner.name || '—') + (r.owner.phone ? ' · ' + r.owner.phone : r.owner.email ? ' · ' + r.owner.email : '') + (r.owner.created ? ' · سجّل ' + fmtDate(r.owner.created) : '') }),
        el('div', { class: 'note', text: r.subs.length ? '✅ مشترك: ' + r.subs.map(s => s.name + ' حتى ' + fmtDate(s.end)).join('، ') : '🆓 غير مشترك (يستخدم الدروس المجانية)' }),
        el('div', { class: 'stats' }, stat(st.stars, 'نجمة'), stat(R + W ? Math.round(R * 100 / (R + W)) + '%' : '—', 'دقة الإجابات'), stat(Math.round(m14), 'دقيقة في 14 يوماً'), stat(qAvg != null ? qAvg + '%' : '—', 'متوسط الاختبارات')),
        el('span', { class: 'note', text: 'دقائق الدراسة يومياً (آخر 14 يوماً)' + (r.goal ? ' — الهدف ' + r.goal + ' د' : '') + ' · آخر نشاط: ' + (st.lastDay || '—') }), bars(dd.map(d => [dname(d), Math.round(st.mins[d] || 0)]), ' د'));
      const lr = Object.entries(st.lr || {}).sort((a, b) => (b[1].t || 0) - (a[1].t || 0));
      w.append(el('b', { text: '📘 الدروس (' + lr.length + ')' }));
      if (!lr.length) w.append(el('span', { class: 'note', text: 'لا توجد دروس مسجّلة.' }));
      lr.slice(0, 60).forEach(([id, L]) => { const f = D.findLesson && D.findLesson(id); const acc = L.r + L.w ? Math.round(L.r * 100 / (L.r + L.w)) : null;
        w.append(el('div', { class: 'kidrow', style: 'display:flex;justify-content:space-between;gap:8px' }, el('span', { style: 'min-width:0' }, el('b', { style: 'font-size:.88rem', text: f ? f.lesson.title : id }),
          el('div', { class: 'note', style: 'font-size:.72rem', text: (f ? f.subject.name + ' · ' : '') + (L.t ? fmtDate(L.t) : '') })),
          el('span', { class: 'note', style: 'white-space:nowrap;font-size:.75rem;color:' + (acc == null ? 'var(--muted)' : acc >= 80 ? '#15803d' : acc >= 50 ? '#b45309' : '#b91c1c'), text: '⭐' + (L.st || 0) + ' · ' + (acc != null ? acc + '%' : '—') + ' · ' + Math.round(L.m || 0) + 'د' }))); });
      if (qz.length) { w.append(el('b', { text: '📝 آخر الاختبارات' })); qz.slice(-10).reverse().forEach(q => { const f = D.findLesson && D.findLesson(q.l);
        w.append(el('div', { class: 'kidrow', style: 'display:flex;justify-content:space-between' }, el('span', { class: 'note', text: (f ? f.lesson.title : q.l) + ' · ' + fmtDate(q.t) }), el('b', { text: q.sc + '/' + q.n }))); }); }
    } catch (e) { fbk(w, 'bad', fnErr(e)); } };
  drawCtrl(); box._lazy = load;
  return box;
}

function arenaAdminBox() {
  const box = el('div', { class: 'panel accbox' }, el('b', { text: '🏟️ ساحة المسابقات' }),
    el('span', { class: 'note', text: 'مسابقات رياضيات مباشرة مبرمجة تلقائياً (6 مستويات: المستوى 1 للصف الثاني … المستوى 6 للصف السابع فما فوق). الأسئلة تُولَّد عشوائياً لكل مسابقة ولا تتكرر داخلها، والترتيب بالدقة ثم السرعة.' }));
  const cfgW = el('div', { class: 'stack' }), listW = el('div', { class: 'stack' }), msg = el('div'); box.append(cfgW, msg, listW);
  const LVN = ['', 'م1·ص2', 'م2·ص3', 'م3·ص4', 'م4·ص5', 'م5·ص6', 'م6·ص7+'];
  const num = (v, lo, hi) => el('input', { type: 'number', min: lo, max: hi, value: v, style: 'width:90px' });
  const lab = (t, inp, hint) => el('label', { style: 'display:flex;gap:8px;align-items:center;flex-wrap:wrap' }, el('span', { style: 'min-width:150px', text: t }), inp, hint ? el('small', { class: 'note', text: hint }) : null);
  const tm = t => new Date(t).toLocaleString('ar-LY-u-nu-latn', { weekday: 'short', day: 'numeric', month: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'Africa/Tripoli' });
  const ST = { open: 'الحجز مفتوح', live: 'جارية', done: 'انتهت', cancelled: 'أُلغيت (عدد قليل)' };
  const load = async () => { fbk(msg, 'info', 'جارٍ التحميل…');
    try { const r = await call('adminArena', { op: 'list' }); msg.innerHTML = ''; const c = r.cfg; cfgW.innerHTML = '';
      if (ACC.owner) {
        const on = el('input', { type: 'checkbox' }); on.checked = !!c.on;
        const who = el('select', {}, el('option', { value: 'all', text: 'كل المسجّلين (مجاني ومشترك)' }), el('option', { value: 'sub', text: 'المشتركين فقط' })); who.value = c.who === 'sub' ? 'sub' : 'all';
        const every = el('select', {}, ...[1, 2, 3, 4, 6, 8, 12, 24].map(h => el('option', { value: h, text: h === 1 ? 'كل ساعة' : h === 2 ? 'كل ساعتين' : h === 24 ? 'مرة واحدة يومياً' : 'كل ' + h + (h <= 10 ? ' ساعات' : ' ساعة') }))); every.value = c.every;
        const start = el('select', {}, ...Array.from({ length: 24 }, (_, h) => el('option', { value: h, text: (h % 12 || 12) + (h < 12 ? ' صباحاً' : ' مساءً') }))); start.value = c.start;
        const seats = num(c.seats, 2, 100), minP = num(c.minP, 2, 20), n = num(c.n, 5, 30), secs = num(c.secs, 5, 30), open = num(c.open, 10, 720);
        const lvs = [1, 2, 3, 4, 5, 6].map(v => { const x = el('input', { type: 'checkbox', value: v }); x.checked = (c.levels || []).includes(v); return x; });
        const slots = () => { const e = +every.value, st = +start.value; const H = []; for (let h = 0; h < 24; h++) if (((h - st) % e + e) % e === 0) H.push((h % 12 || 12) + (h < 12 ? 'ص' : 'م')); return H.join(' · '); };
        const sl = el('small', { class: 'note' }); const upd = () => sl.textContent = 'المواعيد اليومية (بتوقيت ليبيا): ' + slots(); every.onchange = upd; start.onchange = upd; upd();
        cfgW.append(el('label', { style: 'display:flex;gap:8px;align-items:center;font-weight:700;justify-content:flex-start' }, on, el('span', { style: 'flex:1', text: 'تفعيل الساحة (تظهر للمستخدمين)' })),
          lab('من يشارك', who), lab('تكرار المسابقة', every), lab('أول موعد في اليوم', start), sl,
          lab('أقصى عدد مقاعد', seats, 'لكل مستوى'), lab('أقل عدد للبدء', minP, 'وإلا تُلغى'), lab('عدد الأسئلة', n), lab('ثواني كل سؤال', secs), lab('فتح الحجز قبل البداية (دقيقة)', open),
          el('span', { text: 'المستويات المتاحة:' }), el('div', { class: 'row', style: 'gap:10px;flex-wrap:wrap' }, ...lvs.map((x, i) => el('label', { style: 'display:flex;gap:4px;align-items:center' }, x, el('span', { text: LVN[i + 1] })))),
          el('button', { class: 'btn sun', text: '💾 حفظ إعدادات المسابقات', onclick: async e => { const b = e.currentTarget; b.disabled = true;
            try { await call('adminArena', { op: 'cfg', on: on.checked, who: who.value, every: +every.value, start: +start.value, seats: +seats.value, minP: +minP.value, n: +n.value, secs: +secs.value, open: +open.value, levels: lvs.filter(x => x.checked).map(x => +x.value) });
              fbk(msg, 'ok', '✓ تم الحفظ. يظهر للمستخدمين خلال دقيقة.'); } catch (x) { fbk(msg, 'bad', fnErr(x)); } b.disabled = false; } }));
      } else cfgW.append(el('span', { class: 'note', text: 'الحالة: ' + (c.on ? '✅ مفعّلة' : '⛔ متوقفة') + ' · كل ' + c.every + ' ساعة · ' + c.seats + ' مقعد · ' + c.n + ' سؤال × ' + c.secs + ' ث' }));
      listW.innerHTML = ''; listW.append(el('b', { text: 'آخر 14 يوماً: ' + r.totals.comps + ' مسابقة · ' + r.totals.players + ' مشاركة' }));
      if (!r.list.length) listW.append(el('span', { class: 'note', text: 'لا توجد مسابقات بعد.' }));
      r.list.forEach(x => listW.append(el('div', { class: 'kidrow', style: 'display:flex;flex-direction:column;gap:4px' },
        el('div', { style: 'display:flex;justify-content:space-between;gap:8px' }, el('b', { text: tm(x.at) + ' — ' + LVN[x.lv] }), el('span', { class: 'note', text: '👥 ' + x.count + ' · ' + (ST[x.status] || x.status) })),
        ...x.winners.map(w => el('div', { class: 'note', style: 'font-size:.8rem', text: ['', '🥇', '🥈', '🥉'][w.rank] + ' ' + w.name + ' · ' + w.city + (w.school ? ' · ' + w.school : '') + ' · ' + w.score + ' ن' + (w.phone ? ' · ' + w.phone : '') })))));
    } catch (e) { fbk(msg, 'bad', fnErr(e)); } };
  box._lazy = load; return box;
}

/* ---------- admin safety: every section folded, sensitive buttons need a second press ---------- */
function fold(box, title) {
  const h = box.querySelector(':scope > b'); const t = title || (h ? h.textContent : 'قسم');
  if (h && !title) h.style.display = 'none';
  const d = el('details', { class: 'adm-fold' }, el('summary', {}, el('span', { text: t }), el('i', { text: '▾' })), box);
  d.addEventListener('toggle', () => { if (d.open && box._lazy) { const f = box._lazy; box._lazy = null; f(); } if (d.open && d.parentElement) d.parentElement.querySelectorAll(':scope > details.adm-fold[open]').forEach(x => { if (x !== d) x.open = false; }); });
  return d;
}
const RISKY = /حفظ|امنح|موافقة|رفض|إيقاف|نشر|تم التحويل|اجعله مشرفاً|إظهار|إخفاء|ربط قناة|إعادة ربط|تحويل/;
function adminSafety(s) {
  [...s.children].forEach(c => { if (c.classList && c.classList.contains('panel') && c.classList.contains('accbox')) { const ph = el('span'); s.replaceChild(ph, c); s.replaceChild(fold(c), ph); } });
  s.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('button'); if (!b || !s.contains(b) || b.closest('summary')) return;
    const txt = b.textContent || ''; if (!RISKY.test(txt) || /تأكيد|اضغط مرة أخرى/.test(txt)) return;
    if (b.dataset.sure === '1') { b.dataset.sure = ''; clearTimeout(b._st); if (b._orig != null) { b.textContent = b._orig; b._orig = null; } b.classList.remove('adm-sure'); return; }
    e.preventDefault(); e.stopImmediatePropagation();
    b.dataset.sure = '1'; b._orig = txt; b.textContent = '⚠️ اضغط مرة أخرى للتأكيد: ' + txt.replace(/^[^\p{L}]+/u, '').slice(0, 30); b.classList.add('adm-sure');
    b._st = setTimeout(() => { if (b.isConnected && b.dataset.sure === '1') { b.dataset.sure = ''; b.textContent = b._orig; b._orig = null; b.classList.remove('adm-sure'); } }, 5000);
  }, true);
}
/* ---------- invites: claim on sign-up, share card in «حسابي», admin box ---------- */
async function claimRef() {
  const r = store.get('ref_in', null); if (!r || !r.c || Date.now() - r.at > 14 * 864e5) return;
  try { const x = await call('refClaim', { code: r.c }); store.set('ref_in', null);
    if (x.ok) { await loadSubs(); D.cheer && D.cheer('win'); store.set('ref_gift', x.days || 3); } } catch (e) { store.set('ref_in', null); }
}
function refBox() {
  const box = el('div', { class: 'panel accbox', style: 'border:2px solid #f59e0b' }, el('b', { text: '🎁 ادعُ عائلة واحصل على أيام مجانية' })); const m = el('div');
  const gift = store.get('ref_gift', 0); if (gift) { box.append(el('div', { class: 'feedback ok', text: '🎉 حصلت على ' + gift + ' أيام مجانية لأنك سجّلت من رابط صديق.' })); store.set('ref_gift', 0); }
  const body = el('div', { class: 'stack' }); box.append(body, m); body.append(el('span', { class: 'note', text: 'جارٍ التحميل…' }));
  call('refMine', {}).then(r => { body.innerHTML = ''; const C = r.cfg, S = r.stats; store.set('my_ref', r.code); if (!C.on) { box.remove(); return; }
    const link = 'https://mujtahid.ly/#i-' + r.code;
    const msgTxt = 'أبنائي يتعلمون المنهج الليبي بالصوت والصورة على منصة المجتهد 📚✨ سجّلوا من هذا الرابط واحصلوا على ' + C.invitee + ' أيام مجانية 🎁\n' + link;
    body.append(el('span', { class: 'note', text: 'شارك رابطك مع الأقارب والأصدقاء ومجموعات أولياء الأمور. كل عائلة تسجّل من رابطك ويبدأ أبناؤها الدراسة: ' + C.reg + ' يوم مجاني لك، وإذا اشتركت: ' + C.pay + ' أيام أخرى. وهم يحصلون على ' + C.invitee + ' أيام مجانية.' }),
      el('div', { class: 'code', dir: 'ltr', style: 'font-weight:800;word-break:break-all', text: link }),
      el('div', { class: 'row', style: 'gap:8px;flex-wrap:wrap' },
        el('a', { class: 'btn sun', href: 'https://wa.me/?text=' + encodeURIComponent(msgTxt), target: '_blank', rel: 'noopener', text: '💬 شارك على واتساب' }),
        el('button', { class: 'btn ghost', text: '📋 نسخ الرابط', onclick: async () => { try { await navigator.clipboard.writeText(msgTxt); fbk(m, 'ok', '✓ نُسخ.'); } catch (e) { fbk(m, 'info', link); } } }),
        navigator.share ? el('button', { class: 'btn ghost', text: '📤 مشاركة', onclick: () => navigator.share({ text: msgTxt }).catch(() => {}) }) : null),
      el('div', { class: 'stats' }, ...[[S.invited, 'عائلة سجّلت'], [S.active, 'بدأت الدراسة'], [S.paid, 'اشتركت'], [S.days, 'يوم مجاني حصلت عليه']].map(([n, t]) => el('div', { class: 'stat' }, el('b', { text: String(n) }), el('span', { text: t })))));
    { const tp = trialPick(); if (tp) body.append(tp); }
  }).catch(e => { body.innerHTML = ''; fbk(m, 'bad', fnErr(e)); });
  return box;
}
function refAdminBox() {
  const box = el('div', { class: 'panel accbox' }, el('b', { text: '🎁 الدعوات واختبار المستوى' }));
  const body = el('div', { class: 'stack' }), m = el('div'); box.append(body, m);
  box._lazy = () => { body.append(el('span', { class: 'note', text: 'جارٍ التحميل…' }));
    call('adminRefs', { op: 'list' }).then(r => { body.innerHTML = ''; const C = r.cfg;
      const num = (k, t) => { const i = el('input', { type: 'number', min: '0', value: String(C[k]), style: 'width:90px', oninput: e => { C[k] = Number(e.target.value); } }); return el('label', { class: 'prow' }, el('span', { text: t }), i); };
      const on = el('input', { type: 'checkbox', checked: C.on ? '' : null, onchange: e => { C.on = e.target.checked; } });
      const tb = r.tests || {}; const days = Object.keys(tb.byDay || {}).sort().reverse().slice(0, 7);
      body.append(el('div', { class: 'stats' }, ...[[r.total.invited, 'سجّلوا من دعوة'], [r.total.active, 'بدأوا الدراسة'], [r.total.paid, 'اشتركوا من دعوة'], [tb.n || 0, 'اختبار مستوى (30 يوماً)'], [tb.reg || 0, 'اختبار من مسجّلين']].map(([n, t]) => el('div', { class: 'stat' }, el('b', { text: String(n) }), el('span', { text: t })))),
        days.length ? el('span', { class: 'note', text: 'اختبارات المستوى: ' + days.map(d => d.slice(5) + ': ' + tb.byDay[d]).join(' · ') }) : null,
        el('span', { class: 'note', text: 'رابط اختبار المستوى للإعلانات: https://mujtahid.ly/#test' }),
        el('b', { text: '⚙️ الإعدادات' }), el('label', { class: 'sndrow' }, on, el('b', { text: 'تفعيل الدعوات' })),
        num('invitee', 'أيام مجانية للمدعو عند التسجيل'), num('reg', 'أيام للداعي عندما يبدأ صديقه الدراسة'), num('pay', 'أيام إضافية للداعي عندما يشترك صديقه'), num('cap', 'حد أيام التسجيلات للداعي'), num('trialN', 'عدد الدروس المفتوحة من كل كتاب في الأيام المجانية'),
        el('button', { class: 'btn', text: '💾 حفظ إعدادات الدعوات', onclick: async () => { try { await call('adminRefs', { op: 'cfg', ...C }); await loadAccess(); fbk(m, 'ok', '✓ حُفظت.'); } catch (e) { fbk(m, 'bad', fnErr(e)); } } }),
        el('b', { text: '🏅 أكثر الداعين' }));
      if (!r.top.length) body.append(el('span', { class: 'note', text: 'لا توجد دعوات بعد.' }));
      r.top.forEach(t => body.append(el('div', { class: 'kidrow', style: 'display:flex;justify-content:space-between;gap:6px' }, el('span', {}, el('b', { text: t.name || '—' }), el('span', { class: 'note', dir: 'ltr', text: ' ' + t.phone })),
        el('span', { class: 'note', text: t.invited + ' سجّل · ' + t.active + ' نشِط · ' + t.paid + ' اشترك · ' + t.days + ' يوم' }))));
    }).catch(e => { body.innerHTML = ''; fbk(m, 'bad', fnErr(e)); }); };
  return box;
}

function renderAdmin() {
  if (!ACC.user) { go('login'); return; }
  const s = page('لوحة الإدارة', ACC.owner ? 'المجتهد' : 'مشرف — حسب صلاحياتك', 'account');
  if (!ACC.isAdmin) { const m = el('div'); s.append(m); fbk(m, 'bad', 'هذه الصفحة للإدارة فقط.'); return; }
  const can = ACC.can, teachAny = can('teach_req') || can('teach_courses') || can('teach_wd');
  if (teachAny && ACC.teachAdminAlert) s.append(ACC.teachAdminAlert());
  const statsHost = el('div'), listHost = el('div');
  if (can('stats')) { s.append(statsHost); fbk(statsHost, 'info', 'جارٍ تحميل الإحصائيات…'); }
  if (can('stats')) s.append(heroesBox());
  if (can('grant')) s.append(grantBox());
  if (can('browse')) s.append(browseBox());
  if (ACC.owner) s.append(staffBox());
  if (can('plans')) s.append(plansBox());
  if (can('plans') || can('stats')) s.append(refAdminBox());
  if (can('stats') || can('push')) s.append(arenaAdminBox());
  if (can('push')) s.append(pushBox());
  if (can('tts')) s.append(ttsBox());
  if (can('access')) s.append(accessBox(), booksBox());
  if (teachAny) s.append(ACC.teachAdminBox());
  adminSafety(s);
  if (!can('stats')) return;
  s.append(fold(listHost, '📋 آخر الاشتراكات الفعّالة (مع زر الإلغاء)'));
  call('adminStats', {}).then(d => {
    statsHost.innerHTML = ''; const st = statsHost; const s0 = s;
    { const s = st;
    const card = (n, t) => el('div', { class: 'stat' }, el('b', { text: String(n) }), el('span', { text: t }));
    s.append(el('h3', { text: 'المستخدمون' }), el('div', { class: 'stats' },
      card(d.users, 'كل الحسابات'), card(d.roles.student || 0, 'طلاب'), card(d.roles.parent || 0, 'أولياء أمور'),
      card(d.roles.teacher || 0, 'معلمون'), card(d.kids, 'أبناء مسجّلون عند أولياء الأمور')));
    s.append(el('h3', { text: 'الاشتراكات الفعّالة' }), el('div', { class: 'stats' },
      card(d.activeSubs, 'كل الاشتراكات'), card(d.payingStudents, 'طلاب مشتركون'), card(d.payingParents, 'أولياء أمور مشتركون'),
      card(d.payingTeachers, 'معلمون مشتركون'), card(d.kidsCovered, 'أبناء مشمولون باشتراك عائلة'), card(d.byKind.gift || 0, 'اشتراكات مجانية (منح)'),
      card(d.paidOrders, 'عمليات دفع ناجحة'), card(d.revenue + ' د.ل', 'إجمالي المدفوعات')));
    }
    { const s = listHost;
    // list
    const tb = el('div', { class: 'stack' });
    d.list.forEach(x => { const sc = x.scope || {}; const what = (x.planName || (KINDS[x.kind] || ['', x.kind])[1]) + (sc.grades && sc.grades[0] !== '*' ? ' — الصف ' + gradeName(sc.grades[0]) : sc.grades ? ' — كل الصفوف' : '') + (sc.subjects && sc.subjects[0] && sc.subjects[0] !== '*' ? ' — ' + sc.subjects[0] : '');
      tb.append(el('div', { class: 'kidrow' }, el('span', {}, el('b', { text: (x.name || '—') + ' (' + (ROLE_AR[x.role] || '') + ')' }), el('span', { class: 'note', text: ' — ' + what + (x.amount ? ' — ' + x.amount + ' د.ل' : '') + ' — حتى ' + fmtDate(x.end) + (x.note ? ' — ' + x.note : '') })),
        el('span', { class: 'note', dir: 'ltr', text: (x.phone || '').replace('+218', '0') }),
        !ACC.can('grant') ? null : el('button', { class: 'btn ghost sm', text: 'إلغاء', onclick: async e => { const b = e.currentTarget; if (b.dataset.c !== '1') { b.dataset.c = '1'; b.textContent = 'تأكيد الإلغاء'; return; }
          try { await call('adminRevoke', { id: x.id }); b.closest('.kidrow').remove(); } catch (er) { b.textContent = fnErr(er); } } }))); });
    s.append(el('h3', { text: 'آخر الاشتراكات الفعّالة (' + d.list.length + ')' }), tb);
    }
  }).catch(e => fbk(statsHost, 'bad', fnErr(e)));
}

loadAccess().then(() => { if (D.App.catalog) D.route(); });
document.addEventListener('visibilitychange', async () => { if (document.visibilityState === 'visible') { const o = JSON.stringify(ACC.access || {}); await loadAccess(); if (JSON.stringify(ACC.access) !== o && D.App.catalog) D.route(); } if (document.visibilityState === 'visible' && ACC.kid) { try { const d = await getDoc(pref(ACC.kid.pid)); if (d.exists()) { const old = JSON.stringify(ACC.profiles[0] && ACC.profiles[0].ctrl || null); ACC.profiles = [{ id: d.id, ...d.data() }]; if (JSON.stringify(d.data().ctrl || null) !== old && D.App.catalog) D.route(); } } catch (e) {} }
  if (document.visibilityState === 'visible' && ACC.user && ACC.profile) { const n = ACC.subs.length; await loadSubs(); if (ACC.subs.length !== n && D.App.catalog) D.route(); } });

const ROUTES = { admin: renderAdmin, subscribe: renderSubscribe, login: renderLogin, 'login-phone': () => authForm('phone'), 'login-email': () => authForm('email'), onboard: renderOnboard, kids: renderKids, who: renderWho, account: renderAccount };
initTeach({ call, fnErr, ACC, page, fbk, D, el, go, store });
ACC.route = h => { if (ACC.teachRoute && ACC.teachRoute(h)) return true; const pm = /^paid-([A-Za-z0-9]{10,40})$/.exec(h); const lm = /^link(?:-(\d{6}))?$/.exec(h); if (lm) { if (!ACC.ready) { page('…', 'جارٍ التحميل', 'home'); return true; } renderLink(lm[1]); return true; }
  const tk = /^tt-([A-Za-z0-9]{1,30})$/.exec(h); if (tk) { if (!ACC.ready) { page('…', 'جارٍ التحميل', 'home'); return true; } renderTT(tk[1]); return true; }
  const ck = /^ctrl-([A-Za-z0-9]{1,30})$/.exec(h); if (ck) { if (!ACC.ready) { page('…', 'جارٍ التحميل', 'home'); return true; } renderCtrl(ck[1]); return true; }
  const lk = /^linkkid-([A-Za-z0-9]{1,30})$/.exec(h); if (lk) { if (!ACC.ready) { page('…', 'جارٍ التحميل', 'home'); return true; } renderLinkKid(lk[1]); return true; }
  const km = /^kid-([A-Za-z0-9]{1,30})$/.exec(h); const f = pm ? () => renderPaid(pm[1]) : km ? () => renderKid(km[1]) : ROUTES[h]; if (!f) return false; if (!ACC.ready) { page('…', 'جارٍ التحميل', 'home'); return true; } if (ACC.loadError && ACC.user) { showLoadError(); return true; } f(); return true; };

/* ---------- auth state ---------- */
const withTimeout = (pr, ms = 8000) => Promise.race([pr, new Promise((_, rej) => setTimeout(() => rej({ code: 'timeout' }), ms))]);
onAuthStateChanged(auth, async user => {
  ACC.user = user; ACC.profile = null; ACC.profiles = []; ACC.loadError = null;
  try {
    ACC.kid = null; ACC.co = null;
    if (user && user.isAnonymous) {
      const tr = await withTimeout(user.getIdTokenResult()).catch(() => null);
      const c = (tr && tr.claims) || {};
      if (c.kidOf) {
        ACC.kid = { parent: c.kidOf, pid: c.kidPid };
        try { const d = await withTimeout(getDoc(pref(c.kidPid)));
          if (!d.exists()) throw { code: 'unlinked' };
          ACC.profiles = [{ id: d.id, ...d.data() }]; ACC.profile = { role: 'kid', name: d.data().name };
          await withTimeout(loadSubs()); ACC.pid = c.kidPid; store.set('acc_pid', c.kidPid);
          withTimeout(pullProgress(c.kidPid)).catch(() => {}); pullStats(c.kidPid);
        } catch (e) { if (e.code === 'permission-denied' || e.code === 'unlinked') { ACC.kid = null; ACC.unlinked = true; await signOut(auth); return; } console.error('kid', e); ACC.loadError = e; }
      } else if (!ACC.linking) { await signOut(auth); return; }
    }
    else if (user) {
      try { const tr = await withTimeout(user.getIdTokenResult()).catch(() => null); if (tr && tr.claims && tr.claims.coOf) ACC.co = { owner: tr.claims.coOf };
        const snap = await withTimeout(getDoc(uref())); ACC.profile = snap.exists() ? snap.data() : null; if (ACC.profile) { await withTimeout(loadProfiles()); await withTimeout(loadSubs()); } }
      catch (e) { console.error('profile', e); ACC.loadError = e; }
      { const ak = 'adm2_' + user.uid; let A = store.get(ak, null);
        const applyA = A => { ACC.isAdmin = !!A; ACC.owner = !!(A && A.owner); ACC.perms = (A && A.perms) || []; ACC.adminBrowse = ACC.can('browse') && !!store.get('admin_browse', false); if (!ACC.adminBrowse) store.set('admin_browse', false); };
        const fetchA = async () => { try { const r = await call('adminCheck', {}); return { owner: !!r.owner, perms: r.perms || [] }; } catch (e) { return /permission|unauthenticated/.test(e.code || '') ? false : null; } };
        if (A === null) { A = await fetchA(); if (A !== null) store.set(ak, A); }
        applyA(A);
        fetchA().then(B => { if (B !== null && JSON.stringify(B) !== JSON.stringify(A)) { store.set(ak, B); applyA(B); } }); }
      if (ACC.profiles.length && !ACC.profiles.some(p => p.id === ACC.pid)) await setActive(ACC.profiles.length === 1 ? ACC.profiles[0].id : null);
      else if (ACC.pid && !ACC.loadError) withTimeout(pullProgress(ACC.pid)).catch(() => {});
    } else { ACC.pid = null; store.set('acc_pid', null); }
  } catch (e) { console.error('auth', e); ACC.loadError = e; }
  ACC.ready = true; pushRefresh();
  const h = location.hash.replace(/^#/, '');
  if (ACC.linking) return;
  if (ACC.kid && (h === 'login' || h === 'who' || h === 'kids' || h === 'onboard')) { go('home'); return; }
  if (!user && ACC.unlinked) { ACC.unlinked = false; go('link'); return; }
  if (user && ACC.loadError) { if (ROUTES[h] || !h || h === 'home') { showLoadError(); return; } }
  else if (user && !ACC.profile) { go('onboard'); return; }
  else if (user && h === 'login') { go(isAdult() ? (ACC.profiles.length ? 'who' : 'kids') : 'home'); return; }
  else if (user && isAdult() && !ACC.pid && (!h || h === 'home')) { go(ACC.profiles.length ? 'who' : 'kids'); return; }
  if (D.App.catalog) D.route();
});
function showLoadError() {
  const e = ACC.loadError || {};
  const s = page('تعذّر تحميل حسابك', 'الدروس تعمل بشكل عادي', 'home');
  s.append(el('div', { class: 'feedback bad', text: 'لم نتمكن من الاتصال بقاعدة البيانات. تحقق من الإنترنت ثم أعد المحاولة.' }),
    el('p', { class: 'note', dir: 'ltr', style: 'text-align:right', text: 'code: ' + (e.code || e.message || e) }),
    el('div', { class: 'row', style: 'gap:8px' }, el('button', { class: 'btn', text: '↺ أعد المحاولة', onclick: () => location.reload() }),
      el('button', { class: 'btn ghost', text: 'الدروس', onclick: () => { ACC.loadError = null; location.hash = 'home'; D.route(); } }),
      el('button', { class: 'btn ghost', text: 'تسجيل الخروج', onclick: async () => { await signOut(auth); } })));
}

