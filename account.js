// المجتهد — الحسابات: الدخول (هاتف، إيميل، Google)، الأدوار، ملفات الأبناء، حفظ التقدّم في السحابة.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup, signInWithRedirect, signInAnonymously,
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  sendPasswordResetEmail, updateProfile } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js';
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

const ACC = window.ACC = { user: null, profile: null, profiles: [], pid: store.get('acc_pid', null), ready: false };

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
  if (!ACC.user) return el('button', { class: 'pill', onclick: () => go('login'), text: '👤 دخول' });
  const p = activeProfile();
  return el('button', { class: 'pill', onclick: () => go(ACC.kid ? 'account' : isAdult() ? 'who' : 'account'), text: (p ? (p.avatar || '🙂') + ' ' + p.name : '👤 حسابي') });
};

/* ---------- pages ---------- */
const page = (title, sub, back) => { D.root.innerHTML = ''; D.root.append(D.bar(title, sub, back)); const s = el('section', { class: 'stack acc' }); D.root.append(s); return s; };

function renderLogin() {
  if (ACC.user) { go(ACC.profile ? 'account' : 'onboard'); return; }
  const s = page('الدخول', 'سجّل لتحفظ نجومك وتقدّمك على أي جهاز', 'home');
  const msg = el('div');
  s.append(el('button', { class: 'btn sun', style: 'width:100%', text: '🧒 أنا طالب، عندي رمز من ولي أمري', onclick: () => go('link') }));
  // Google
  const gBtn = el('button', { class: 'btn accbtn', onclick: async () => {
    msg.innerHTML = ''; const pr = new GoogleAuthProvider(); pr.setCustomParameters({ prompt: 'select_account' });
    try { await signInWithPopup(auth, pr); }
    catch (e) { if (['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment', 'auth/cancelled-popup-request'].includes(e.code)) await signInWithRedirect(auth, pr); else fbk(msg, 'bad', errMsg(e)); }
  } }, el('b', { class: 'gl', text: 'G' }), 'الدخول بحساب Google');
  // Phone + password (no SMS here: SMS is sent only when the person subscribes, see ACC.verifyPhone)
  const ph = el('input', { type: 'tel', inputmode: 'numeric', placeholder: '09X XXX XXXX', 'aria-label': 'رقم الهاتف', autocomplete: 'tel' });
  const ppw = el('input', { type: 'password', placeholder: 'كلمة المرور (6 أحرف أو أكثر)', 'aria-label': 'كلمة المرور', autocomplete: 'current-password' });
  const phoneGo = async create => { msg.innerHTML = ''; const n = libyanPhone(ph.value);
    if (!n) { fbk(msg, 'bad', 'اكتب رقماً ليبياً يبدأ بـ 091 أو 092 أو 093 أو 094 أو 095.'); return; }
    try { create ? await createUserWithEmailAndPassword(auth, phoneEmail(n), ppw.value) : await signInWithEmailAndPassword(auth, phoneEmail(n), ppw.value); }
    catch (e) { fbk(msg, 'bad', e.code === 'auth/email-already-in-use' ? 'هذا الرقم مسجّل من قبل. اضغط «دخول».' : e.code === 'auth/invalid-credential' ? 'الرقم أو كلمة المرور غير صحيحة.' : errMsg(e)); } };
  const pforgot = el('button', { class: 'linkbtn', text: 'نسيت كلمة المرور؟', onclick: () => fbk(msg, 'info', 'تواصل معنا لإعادة تعيين كلمة المرور. وإذا كان رقمك مؤكداً (بعد الاشتراك) ستتمكن قريباً من إعادة تعيينها برسالة نصية.') });
  // Email
  const em = el('input', { type: 'email', placeholder: 'example@gmail.com', 'aria-label': 'البريد الإلكتروني', autocomplete: 'email' });
  const pw = el('input', { type: 'password', placeholder: 'كلمة المرور (6 أحرف أو أكثر)', 'aria-label': 'كلمة المرور', autocomplete: 'current-password' });
  const emailGo = async create => { msg.innerHTML = '';
    try { create ? await createUserWithEmailAndPassword(auth, em.value.trim(), pw.value) : await signInWithEmailAndPassword(auth, em.value.trim(), pw.value); }
    catch (e) { fbk(msg, 'bad', errMsg(e)); } };
  const forgot = el('button', { class: 'linkbtn', text: 'نسيت كلمة المرور؟', onclick: async () => {
    if (!em.value.trim()) { fbk(msg, 'info', 'اكتب بريدك أولاً ثم اضغط «نسيت كلمة المرور».'); return; }
    try { await sendPasswordResetEmail(auth, em.value.trim()); fbk(msg, 'ok', 'أرسلنا رابط تغيير كلمة المرور إلى بريدك.'); } catch (e) { fbk(msg, 'bad', errMsg(e)); } } });
  s.append(
    el('div', { class: 'panel accbox' }, gBtn),
    el('div', { class: 'panel accbox' }, el('b', { text: '📱 رقم الهاتف' }), ph, ppw,
      el('div', { class: 'row', style: 'gap:8px;flex-wrap:wrap' }, el('button', { class: 'btn', text: 'دخول', onclick: () => phoneGo(false) }), el('button', { class: 'btn ghost', text: 'حساب جديد', onclick: () => phoneGo(true) }), pforgot)),
    el('div', { class: 'panel accbox' }, el('b', { text: '✉️ البريد الإلكتروني' }), em, pw,
      el('div', { class: 'row', style: 'gap:8px;flex-wrap:wrap' }, el('button', { class: 'btn', text: 'دخول', onclick: () => emailGo(false) }), el('button', { class: 'btn ghost', text: 'حساب جديد', onclick: () => emailGo(true) }), forgot)),
    el('div', { class: 'panel accbox off' }, el('b', { text: ' الدخول بحساب Apple' }), el('span', { class: 'tag sun', text: 'قريباً' })),
    msg,
    el('p', { class: 'note', text: 'الدروس المجانية متاحة دون تسجيل. التسجيل يحفظ نجومك وتقدّمك، ويلزم للاشتراك.' }));
}

function renderOnboard() {
  if (!ACC.user) { go('login'); return; }
  if (ACC.profile) { go('account'); return; }
  const s = page('مرحباً بك في المجتهد', 'خطوة واحدة ونبدأ', null);
  const msg = el('div');
  let role = null, grade = null, avatar = AVATARS[0];
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
  const s = page('حسابي', P.name, 'home');
  s.append(el('div', { class: 'panel accbox' },
    el('div', {}, el('b', { text: ic + ' ' + P.name }), el('span', { class: 'note', text: ' — ' + rt })),
    (P.phone || phoneOf(u)) ? el('div', { class: 'note' }, el('span', { dir: 'ltr', text: '📱 ' + (P.phone || phoneOf(u)).replace('+218', '0') }), P.phoneVerified ? el('span', { class: 'tag', style: 'margin-inline-start:8px', text: '✓ مؤكد' }) : el('span', { class: 'tag sun', style: 'margin-inline-start:8px', text: 'يُؤكَّد برسالة عند الاشتراك' })) : null,
    u.email && !phoneOf(u) ? el('div', { class: 'note', dir: 'ltr', style: 'text-align:right', text: '✉️ ' + u.email }) : null,
    P.role === 'student' && activeProfile() && activeProfile().grade ? el('div', { class: 'note', text: '📚 الصف ' + gradeName(activeProfile().grade) }) : null));
  if (isAdult()) s.append(el('button', { class: 'btn', text: '👨‍👩‍👧 أبنائي (' + kidsOf().length + ' من ' + MAX_KIDS + ')', onclick: () => go('kids') }));
  if (isAdult()) s.append(coParentBox());
  if (isAdult() && !ACC.co && !kidsOf().length) s.append(coRedeemBox());
  if (P.role === 'parent') { const m = el('div');
    s.append(el('div', { class: 'panel accbox' }, el('b', { text: '👩‍🏫 هل أنت معلم أيضاً؟' }), el('span', { class: 'note', text: 'حوّل حسابك إلى حساب معلم وتبقى إدارة أبنائك كما هي.' }),
      el('button', { class: 'btn ghost', text: 'نعم، أنا معلم أيضاً', onclick: async () => {
        try { await setDoc(uref(), { ...P, role: 'teacher' }); await setDoc(pref('me'), { name: P.name, grade: null, avatar: '👩‍🏫', createdAt: serverTimestamp() });
          ACC.profile = { ...P, role: 'teacher' }; await loadProfiles(); D.cheer && D.cheer('win'); renderAccount(); } catch (e) { fbk(m, 'bad', errMsg(e)); } } }), m)); }
  s.append(el('div', { class: 'panel accbox' }, el('b', { text: 'اشتراكاتي' }),
    ...(ACC.subs.length ? ACC.subs.map(x => el('div', { class: 'kidrow' }, el('span', {}, el('b', { text: subName(x) }), el('span', { class: 'note', text: ' — حتى ' + fmtDate(x.end.toMillis()) })))) : [el('span', { class: 'note', text: 'لا يوجد اشتراك بعد. الدروس المجانية متاحة لك.' })]),
    el('button', { class: 'btn sun', text: 'اشترك / أضف باقة', onclick: () => go('subscribe') })));
  const adm = el('div'); s.append(adm);
  call('adminCheck', {}).then(() => { ACC.isAdmin = true; adm.append(el('button', { class: 'btn sun', text: '🛠️ لوحة الإدارة', onclick: () => go('admin') })); }).catch(() => {});
  s.append(el('button', { class: 'btn ghost', text: 'تسجيل الخروج', onclick: async () => { await signOut(auth); go('home'); } }));
  s.append(el('p', { class: 'note', dir: 'ltr', style: 'text-align:center;font-size:.75rem;opacity:.6', text: 'ID: ' + u.uid }));
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
  try { const r = await call('getLesson', { id, pid: ACC.pid || null }); await cachePut(id, r.lesson); return r.lesson; }
  catch (e) { if (cached && /unavailable|internal|deadline/i.test(e.code || '')) return cached;
    const x = new Error('paid'); x.userMsg = fnErr(e); throw x; }
};

/* ---------- subscriptions ---------- */
ACC.subs = [];
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
  if (sc.kids) return !!ACC.pid && ACC.pid !== 'me';
  if (ACC.kid) return false;
  return role === 'student' || (!!sc.self && ACC.pid === 'me');
};
ACC.hasAccess = (g, s) => ACC.subs.some(sub => { if (!subApplies(sub)) return false; const sc = sub.scope || {};
  if (sc.pairs) return sc.pairs.includes(g + ':' + s);
  return (sc.grades || []).some(x => x === '*' || x === g) && (sc.subjects || []).some(x => x === '*' || x === s); });
ACC.hasAnySub = () => ACC.subs.some(subApplies);
const fmtDate = ms => new Date(ms).toLocaleDateString('ar-LY', { year: 'numeric', month: 'long', day: 'numeric' });
const KINDS = {
  gift: ['🎁', 'اشتراك مجاني', 'منحة من الإدارة', []],
  student_subject: ['📘', 'مادة واحدة', 'مادة واحدة في صف واحد', ['student', 'teacher']],
  student_grade: ['📚', 'الصف كاملاً', 'كل مواد صف واحد', ['student', 'teacher']],
  parent_grade: ['👨‍👩‍👧', 'العائلة — صف واحد', 'كل مواد صف واحد لأبنائك (حتى 5)', ['parent', 'teacher']],
  parent_all: ['🏫', 'العائلة — كل الصفوف', 'كل الصفوف والمواد لأبنائك (حتى 5)', ['parent', 'teacher']],
};
const subName = sub => { const k = KINDS[sub.kind] || ['', sub.kind]; const sc = sub.scope || {};
  let t = k[1]; if (sc.pairs) t += ' — ' + sc.pairs.length + ' مادة'; else if (sc.grades && sc.grades[0] !== '*') t += ' — الصف ' + gradeName(sc.grades[0]);
  if (sc.subjects && sc.subjects[0] && sc.subjects[0] !== '*') t += ' — ' + subjName(sc.grades[0], sc.subjects[0]); return k[0] + ' ' + t; };
const PAID_SUBJECTS = ['ar', 'en', 'math', 'comp', 'art', 'sci', 'soc', 'hist', 'geo'];
function subjectsOf(g) { const c = D.App.catalog; return ((c && c.grades[g]) || []).filter(s => PAID_SUBJECTS.includes(s.id)); }
function subjName(g, sid) { const s = subjectsOf(g).find(x => x.id === sid); return s ? s.name : sid; }

function renderSubscribe() {
  if (ACC.co) { const s = page('الاشتراك', '', 'who'); s.append(el('div', { class: 'feedback info', text: 'الاشتراك يتم من حساب ولي الأمر الأساسي، ويشمل الأبناء عندك تلقائياً.' })); return; }
  if (ACC.kid) { const s = page('الاشتراك', '', 'home'); s.append(el('div', { class: 'feedback info', text: 'هذا الدرس يحتاج اشتراكاً. اطلب من ولي أمرك أن يشترك لك من حسابه، وسيفتح عندك مباشرة.' })); return; }
  if (!ACC.user) { D.App.after = 'subscribe'; go('login'); return; }
  if (!ACC.profile) { go('onboard'); return; }
  const role = ACC.profile.role, s = page('الاشتراك', 'افتح الدروس حتى 31 أغسطس', D.App.after || 'home');
  const mine = ACC.subs.filter(subApplies);
  if (mine.length) s.append(el('div', { class: 'feedback ok', text: '✓ عندك اشتراك فعّال: ' + mine.map(subName).join('، ') }));
  const box = el('div', { class: 'stack' }), msg = el('div'), phoneBox = el('div');
  let prices = null, kind = null, grade = null, subject = null; const items = new Set();
  const kinds = Object.entries(KINDS).filter(([, v]) => v[3].includes(role));
  const kidsN = ACC.profiles.filter(p => p.id !== 'me').length;
  const price = () => { if (!prices || !kind) return 0; const u = prices[kind] || 0; return kind === 'teacher' ? u * items.size : u; };
  const draw = () => {
    box.innerHTML = '';
    const pg = el('div', { class: 'plans' });
    kinds.forEach(([k, [ic, n, d]]) => { const pr = prices ? prices[k] : null;
      pg.append(el('button', { class: 'plan', 'aria-pressed': String(kind === k), onclick: () => { kind = k; grade = null; subject = null; items.clear(); draw(); } },
        el('b', { text: ic + ' ' + n }), el('span', { class: 'note', text: d }),
        el('div', { class: 'tag sun', style: 'margin-top:6px', text: pr == null ? '…' : pr ? pr + ' د.ل' + (k === 'teacher' ? ' لكل مادة' : '') : 'قريباً' }))); });
    box.append(el('b', { text: 'اختر الباقة' }), pg);
    if (!kind) return;
    if (['parent_grade', 'parent_all'].includes(kind) && !kidsN) { box.append(el('div', { class: 'feedback info' }, 'أضف أبناءك أولاً. ', el('button', { class: 'linkbtn', text: 'أبنائي', onclick: () => go('kids') }))); return; }
    const allowedG = () => { if (kind === 'parent_grade') return [...new Set(ACC.profiles.filter(p => p.id !== 'me' && p.grade).map(p => String(p.grade)))];
      const me = ACC.profiles.find(p => p.id === 'me'); if (role === 'student' && me && me.grade && kind !== 'teacher') return [String(me.grade)]; return null; };
    const AG = allowedG(); if (AG && AG.length === 1 && !grade && kind !== 'teacher') grade = AG[0];
    const gpick = () => { const w = el('div', { class: 'gpick' }); GRADES.filter(([g]) => !AG || !AG.length || AG.includes(String(g))).forEach(([g, n]) => w.append(el('button', { class: 'btn ghost sm' + (grade === g ? ' on' : ''), text: n, onclick: () => { grade = g; subject = null; draw(); } }))); return w; };
    if (['student_subject', 'student_grade', 'parent_grade'].includes(kind)) box.append(el('b', { text: 'الصف' }), gpick());
    if (kind === 'student_subject' && grade) { const w = el('div', { class: 'gpick' }); subjectsOf(grade).forEach(x => w.append(el('button', { class: 'btn ghost sm' + (subject === x.id ? ' on' : ''), text: x.name, onclick: () => { subject = x.id; draw(); } }))); box.append(el('b', { text: 'المادة' }), w); }
    if (kind === 'teacher') { box.append(el('b', { text: 'الصف' }), gpick());
      if (grade) { const w = el('div', { class: 'gpick' }); subjectsOf(grade).forEach(x => { const key = grade + ':' + x.id; w.append(el('button', { class: 'btn ghost sm' + (items.has(key) ? ' on' : ''), text: (items.has(key) ? '✓ ' : '') + x.name, onclick: () => { items.has(key) ? items.delete(key) : items.add(key); draw(); } })); }); box.append(el('b', { text: 'المواد التي تدرّسها في هذا الصف' }), w); }
      if (items.size) box.append(el('p', { class: 'note', text: 'اخترت ' + items.size + ': ' + [...items].map(k => { const [g, x] = k.split(':'); return subjName(g, x) + ' (' + gradeName(g) + ')'; }).join('، ') })); }
    const ready = kind === 'parent_all' || (kind === 'student_subject' ? grade && subject : kind === 'teacher' ? items.size > 0 : !!grade);
    if (!ready) return;
    const total = price();
    box.append(el('div', { class: 'paybox' }, el('b', { style: 'font-size:1.2rem', text: total ? 'المبلغ: ' + total + ' دينار' : 'هذه الباقة غير متاحة للشراء بعد' }),
      el('span', { class: 'note', text: 'الاشتراك صالح حتى 31 أغسطس ' + (prices ? new Date(prices.end).getFullYear() : '') + '. الدفع عبر ماي باي: ادفع لي، سداد، موبي كاش وغيرها.' }),
      el('a', { class: 'note', href: '#privacy', text: 'بالدفع أنت توافق على شروط الاستخدام وسياسة الخصوصية.' }),
      total ? payBtn : null));
  };
  const payBtn = el('button', { class: 'btn sun paybig', text: 'ادفع الآن', onclick: async () => {
    msg.innerHTML = '';
    if (!ACC.phoneVerified()) { phoneBox.scrollIntoView({ behavior: 'smooth' }); await ACC.verifyPhone(phoneBox); phoneBox.innerHTML = ''; }
    payBtn.disabled = true; fbk(msg, 'info', 'جارٍ تجهيز صفحة الدفع…');
    try { const r = await call('createOrder', { kind, grade, subject, items: [...items].map(k => { const [g, x] = k.split(':'); return { grade: g, subject: x }; }) });
      store.set('last_order', r.orderId); location.href = r.url; }
    catch (e) { fbk(msg, 'bad', fnErr(e)); payBtn.disabled = false; } } });
  s.append(box, phoneBox, msg);
  draw();
  call('getPlans', {}).then(r => { prices = { ...r.prices, end: r.end }; draw(); }).catch(e => fbk(msg, 'bad', fnErr(e)));
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
function renderAdmin() {
  if (!ACC.user) { go('login'); return; }
  const s = page('لوحة الإدارة', 'المجتهد', 'account');
  const st = el('div'); s.append(st); fbk(st, 'info', 'جارٍ التحميل…');
  call('adminStats', {}).then(d => {
    st.innerHTML = '';
    const card = (n, t) => el('div', { class: 'stat' }, el('b', { text: String(n) }), el('span', { text: t }));
    s.append(el('h3', { text: 'المستخدمون' }), el('div', { class: 'stats' },
      card(d.users, 'كل الحسابات'), card(d.roles.student || 0, 'طلاب'), card(d.roles.parent || 0, 'أولياء أمور'),
      card(d.roles.teacher || 0, 'معلمون'), card(d.kids, 'أبناء مسجّلون عند أولياء الأمور')));
    s.append(el('h3', { text: 'الاشتراكات الفعّالة' }), el('div', { class: 'stats' },
      card(d.activeSubs, 'كل الاشتراكات'), card(d.payingStudents, 'طلاب مشتركون'), card(d.payingParents, 'أولياء أمور مشتركون'),
      card(d.payingTeachers, 'معلمون مشتركون'), card(d.kidsCovered, 'أبناء مشمولون باشتراك عائلة'), card(d.byKind.gift || 0, 'اشتراكات مجانية (منح)'),
      card(d.paidOrders, 'عمليات دفع ناجحة'), card(d.revenue + ' د.ل', 'إجمالي المدفوعات')));
    // prices
    const pr = {}; const pbox = el('div', { class: 'panel accbox' }, el('b', { text: '💰 الأسعار (دينار) — 0 يعني غير معروضة للبيع' }));
    [['student_subject', 'طالب — مادة واحدة'], ['student_grade', 'طالب — الصف كاملاً'], ['parent_grade', 'ولي أمر — صف واحد'], ['parent_all', 'ولي أمر — كل الصفوف']].forEach(([k, t]) => {
      pr[k] = el('input', { type: 'number', min: '0', step: '0.5', value: String(d.prices[k] || 0), 'aria-label': t });
      pbox.append(el('label', { class: 'prow' }, el('span', { text: t }), pr[k])); });
    const pm = el('div');
    pbox.append(el('button', { class: 'btn', text: 'حفظ الأسعار', onclick: async () => { try { await call('adminSetPrices', Object.fromEntries(Object.entries(pr).map(([k, i]) => [k, Number(i.value)]))); fbk(pm, 'ok', '✓ حُفظت الأسعار.'); } catch (e) { fbk(pm, 'bad', fnErr(e)); } } }), pm);
    s.append(pbox);
    // grants
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
    s.append(gbox);
    s.append(accessBox());
    // list
    const tb = el('div', { class: 'stack' });
    d.list.forEach(x => { const sc = x.scope || {}; const what = (KINDS[x.kind] || ['', x.kind])[1] + (sc.grades && sc.grades[0] !== '*' ? ' — الصف ' + gradeName(sc.grades[0]) : sc.grades ? ' — كل الصفوف' : '') + (sc.subjects && sc.subjects[0] && sc.subjects[0] !== '*' ? ' — ' + sc.subjects[0] : '');
      tb.append(el('div', { class: 'kidrow' }, el('span', {}, el('b', { text: (x.name || '—') + ' (' + (ROLE_AR[x.role] || '') + ')' }), el('span', { class: 'note', text: ' — ' + what + (x.amount ? ' — ' + x.amount + ' د.ل' : '') + ' — حتى ' + fmtDate(x.end) + (x.note ? ' — ' + x.note : '') })),
        el('span', { class: 'note', dir: 'ltr', text: (x.phone || '').replace('+218', '0') }),
        el('button', { class: 'btn ghost sm', text: 'إلغاء', onclick: async e => { const b = e.currentTarget; if (b.dataset.c !== '1') { b.dataset.c = '1'; b.textContent = 'تأكيد الإلغاء'; return; }
          try { await call('adminRevoke', { id: x.id }); b.closest('.kidrow').remove(); } catch (er) { b.textContent = fnErr(er); } } }))); });
    s.append(el('h3', { text: 'آخر الاشتراكات الفعّالة (' + d.list.length + ')' }), tb);
  }).catch(e => fbk(st, 'bad', fnErr(e)));
}

loadAccess().then(() => { if (D.App.catalog) D.route(); });
document.addEventListener('visibilitychange', async () => { if (document.visibilityState === 'visible') { const o = JSON.stringify(ACC.access || {}); await loadAccess(); if (JSON.stringify(ACC.access) !== o && D.App.catalog) D.route(); } if (document.visibilityState === 'visible' && ACC.kid) { try { const d = await getDoc(pref(ACC.kid.pid)); if (d.exists()) { const old = JSON.stringify(ACC.profiles[0] && ACC.profiles[0].ctrl || null); ACC.profiles = [{ id: d.id, ...d.data() }]; if (JSON.stringify(d.data().ctrl || null) !== old && D.App.catalog) D.route(); } } catch (e) {} }
  if (document.visibilityState === 'visible' && ACC.user && ACC.profile) { const n = ACC.subs.length; await loadSubs(); if (ACC.subs.length !== n && D.App.catalog) D.route(); } });

const ROUTES = { admin: renderAdmin, subscribe: renderSubscribe, login: renderLogin, onboard: renderOnboard, kids: renderKids, who: renderWho, account: renderAccount };
ACC.route = h => { const pm = /^paid-([A-Za-z0-9]{10,40})$/.exec(h); const lm = /^link(?:-(\d{6}))?$/.exec(h); if (lm) { if (!ACC.ready) { page('…', 'جارٍ التحميل', 'home'); return true; } renderLink(lm[1]); return true; }
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
      if (ACC.profiles.length && !ACC.profiles.some(p => p.id === ACC.pid)) await setActive(ACC.profiles.length === 1 ? ACC.profiles[0].id : null);
      else if (ACC.pid && !ACC.loadError) withTimeout(pullProgress(ACC.pid)).catch(() => {});
    } else { ACC.pid = null; store.set('acc_pid', null); }
  } catch (e) { console.error('auth', e); ACC.loadError = e; }
  ACC.ready = true;
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

