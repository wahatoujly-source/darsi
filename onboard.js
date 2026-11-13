/* ================= المجتهد — رحلة البداية حسب نوع المستخدم (ولي أمر · طالب · معلم · زائر) =================
   لا تفرض التسجيل: تعرض المحتوى المناسب والدروس المجانية والباقات المناسبة أولاً.
   الاختيارات تُحفظ في الجهاز (darsi_ob) وتُستعمل بعد التسجيل (الدور، صفوف الأبناء) وفي صفحة الاشتراك.
   الأسعار تأتي من الخادم (getPlans = باقات لوحة الإدارة) — لا أسعار ثابتة هنا، والخادم يتحقق من السعر عند الدفع. */
let D, el, go, store, App, root;
const MAXN = 12; // عدد الأبناء في الاختيار (الباقات الحالية تحدد عدد من تشملهم، ونوضّح ذلك بصراحة)
const ev = (n, p, once) => { try { window.AX && AX.ev(n, p || {}, once); } catch (e) {} };
const OB = () => store.get('ob', null) || {};
const saveOB = o => { o.at = Date.now(); store.set('ob', o); };
const ROLE_T = { parent: ['👨‍👩‍👧', 'ولي أمر'], student: ['🎒', 'طالب'], teacher: ['👩‍🏫', 'معلم'], visitor: ['👀', 'زائر'] };

/* الصفوف التي فيها محتوى فعلاً، بترتيب المراحل */
function gradeList() { const c = App.catalog; if (!c) return []; const out = [];
  (c.stages || []).forEach(st => st.grades.forEach(g => { if ((c.grades[g.id] || []).length) out.push([g.id, g.name + (g.track ? ' — ' + g.track : '')]); }));
  return out; }
const gName = g => (gradeList().find(x => x[0] === String(g)) || [, 'الصف ' + g])[1];
const shortG = g => gName(g).replace(/^الصف /, '');

/* ما في الصف: المواد وعدد الدروس الجاهزة والمجانية (حسب إعدادات الإتاحة الحالية) */
function gradeContent(g) {
  const subs = (App.catalog && App.catalog.grades[g]) || []; let ready = 0, free = 0; const rows = [];
  subs.forEach(sj => { let r = 0, f = 0, first = null;
    (sj.books || [{ units: sj.units }]).forEach(b => (b.units || []).forEach(u => u.lessons.forEach(l => { if (!l.ready) return; r++;
      let fr = false; try { fr = D.isFree ? D.isFree(l, null, String(g), sj.id) : !!l.free; } catch (e) { fr = !!l.free; }
      if (fr) { f++; if (!first) first = l; } })));
    if (!r) return; ready += r; free += f; rows.push({ id: sj.id, name: sj.name, icon: sj.icon || '📘', ready: r, free: f, first }); });
  return { ready, free, rows };
}

/* ---------- عناصر مشتركة ---------- */
const head = (t, sub) => el('div', { class: 'ob-head' }, el('h1', { text: t }), sub ? el('p', { text: sub }) : null);
const stepBox = (n, t, ...kids) => el('section', { class: 'ob-step' }, el('div', { class: 'ob-sn' }, el('span', { text: String(n) }), el('b', { text: t })), ...kids);
const chip = (t, on, fn, extra) => el('button', { class: 'ob-chip' + (on ? ' on' : '') + (extra ? ' ' + extra : ''), 'aria-pressed': String(!!on), text: t, onclick: fn });
function gradePicker(sel, onPick, multi) { const w = el('div', { class: 'ob-grades' });
  gradeList().forEach(([g, n]) => w.append(chip((multi && sel.includes(g) ? '✓ ' : '') + n.replace(/^الصف /, ''), multi ? sel.includes(g) : sel === g, () => onPick(g))));
  return w; }

/* المحتوى والدروس المجانية لصف */
function contentCard(g, opt = {}) {
  const C = gradeContent(g);
  const card = el('div', { class: 'ob-card' },
    el('div', { class: 'ob-ct' }, el('b', { text: '📚 ' + gName(g) + (opt.who ? ' — ' + opt.who : '') }),
      el('span', { class: 'ob-badge', text: C.ready + ' درساً تفاعلياً' }), C.free ? el('span', { class: 'ob-badge ok', text: C.free + ' مجاناً' }) : null));
  const list = el('div', { class: 'ob-subs' }); const LIM = opt.all ? 99 : 3;
  C.rows.forEach((r, i) => list.append(el('div', { class: 'ob-sub', hidden: i >= LIM ? '' : null }, el('span', { class: 'ic', text: r.icon }),
    el('span', { class: 'tx' }, el('b', { text: r.name }), el('small', { text: r.ready + ' درساً' + (r.free ? ' · ' + r.free + ' مجاناً' : '') })),
    r.first ? el('button', { class: 'ob-try', text: '▶ جرّب', 'aria-label': 'جرّب درس ' + r.first.title, onclick: () => { ev('ob_cta', { to: 'lesson', l: r.first.id, g: String(g), role: OB().role || '' }); go('l-' + r.first.id); } })
      : el('button', { class: 'ob-try ghost', text: 'تصفّح', onclick: () => go('g' + g + '-' + r.id) }))));
  const more = C.rows.length > LIM ? el('button', { class: 'ob-link', text: '▼ عرض كل المواد (' + C.rows.length + ')', onclick: e => { list.querySelectorAll('.ob-sub[hidden]').forEach(x => x.hidden = false); e.currentTarget.remove(); } }) : null;
  card.append(list, more, el('button', { class: 'ob-link', text: 'كل دروس ' + gName(g) + ' ←', onclick: () => { ev('ob_cta', { to: 'grade', g: String(g), role: OB().role || '' }); go('g' + g); } }));
  return card;
}

/* ---------- الباقات المناسبة (من لوحة الإدارة) ---------- */
let PLANS = null, PLOAD = null;
function loadPlans() { if (PLANS) return Promise.resolve(PLANS);
  if (!PLOAD) PLOAD = new Promise((res, rej) => { let n = 0; const t = () => { if (window.ACC && ACC.getPlans) ACC.getPlans().then(r => { PLANS = r; res(r); }).catch(rej); else if (++n < 60) setTimeout(t, 150); else rej(new Error('acc')); }; t(); }).catch(e => { PLOAD = null; throw e; });
  return PLOAD; }
const durTxt = p => { const d = p.dur || {}; if (d.t === 'days') return d.days === 30 ? 'شهر واحد' : d.days % 30 === 0 ? (d.days / 30) + ' أشهر' : d.days + ' يوماً';
  try { return 'حتى ' + new Date(p.end).toLocaleDateString('ar-LY-u-nu-latn', { day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) { return 'العام الدراسي'; } };
const BASE_FOR = { parent: ['parent_grade', 'parent_all'], student: ['student_grade', 'student_subject'] };
const r1 = v => Math.round(v * 10) / 10;

/* يحسب لكل باقة: هل تناسب اختياراتك؟ وكم المجموع؟ — من بيانات الباقة كما ضبطتها الإدارة، دون افتراض أسعار */
function fitPlans(list, who, n, grades) {
  const G = [...new Set(grades.filter(Boolean))]; const out = [];
  const mine = list.filter(p => (BASE_FOR[who] || []).includes(p.base)); const maxCap = Math.max(1, ...mine.map(p => p.kids || 5));
  mine.forEach(p => {
    const cap = who === 'parent' ? (p.kids || 5) : 1; const x = { p, cap, ok: true, why: '', total: p.price, covers: '' };
    if (who === 'parent' && n > cap) { if (cap < maxCap) { x.ok = false; x.why = 'تشمل حتى ' + cap + (cap === 2 ? ' ابنين' : ' أبناء') + ' فقط'; } else x.part = 'تشمل أول ' + cap + ' أبناء من ' + n; }
    if (p.base === 'parent_all') x.covers = 'كل الصفوف والمواد';
    if (p.base === 'parent_grade' || p.base === 'student_grade') { x.covers = G.length === 1 ? 'كل مواد ' + gName(G[0]) : 'كل مواد صف واحد';
      if (G.length > 1) { x.ok = false; x.why = 'تغطي صفاً واحداً، واخترت ' + G.length + ' صفوف'; x.multi = { k: G.length, total: r1(p.price * G.length) }; } }
    if (p.base === 'student_subject') x.covers = 'مادة واحدة تختارها' + (G.length === 1 ? ' في ' + gName(G[0]) : '');
    if (who === 'parent' && n > 0) x.perKid = r1(p.price / Math.min(n, cap));
    out.push(x); });
  // الأنسب: أرخص باقة مناسبة لكامل المدة (الموسم)، ثم أرخص مناسبة عموماً
  const okL = out.filter(x => x.ok); const season = okL.filter(x => (x.p.dur || {}).t !== 'days');
  const best = (season.length ? season : okL).filter(x => who !== 'student' || x.p.base !== 'student_subject').sort((a, b) => a.total - b.total)[0] || okL[0];
  if (best) best.best = true;
  return out.sort((a, b) => (b.ok - a.ok) || (b.best ? 1 : 0) - (a.best ? 1 : 0) || a.total - b.total);
}

function plansBlock(who, n, grades, src) {
  const box = el('div', { class: 'ob-plans' }, el('p', { class: 'note', text: 'جارٍ تحميل الباقات…' }));
  loadPlans().then(R => { box.innerHTML = '';
    const L = fitPlans(R.plans || [], who, n, grades);
    if (!L.length) { box.append(el('p', { class: 'note', text: 'لا توجد باقات متاحة حالياً.' })); return; }
    ev('plans_view', { plans: L.map(x => x.p.id), who, src: 'ob', kids: n || 0, gs: grades.join(',') });
    const maxCap = Math.max(...L.map(x => x.cap));
    if (who === 'parent' && n > maxCap) box.append(el('div', { class: 'ob-note warn', text: 'باقات العائلة الحالية تشمل حتى ' + maxCap + ' أبناء في الحساب الواحد. لعائلة من ' + n + ' أبناء تواصل معنا لنرتّب لك الأنسب، أو ابدأ بباقة لأول ' + maxCap + ' أبناء.' }));
    L.forEach(x => { const p = x.p;
      const card = el('div', { class: 'ob-plan' + (x.best ? ' best' : '') + (x.ok ? '' : ' off') },
        x.best ? el('span', { class: 'rib', text: '⭐ الأنسب لاختياراتك' }) : null,
        el('div', { class: 'top' }, el('b', { text: p.name }), el('span', { class: 'pr' }, el('b', { text: String(p.price) }), el('small', { text: 'د.ل' }))),
        el('ul', {},
          x.covers ? el('li', { text: '📚 ' + x.covers }) : null,
          el('li', { text: '⏳ ' + durTxt(p) }),
          who === 'parent' ? el('li', { text: '👥 حتى ' + x.cap + (x.cap === 2 ? ' ابنين' : ' أبناء') + '، لكل ابن صفه وتقريره' }) : el('li', { text: '🎒 لطالب واحد' }),
          x.perKid && n > 1 && x.ok ? el('li', { class: 'g', text: '💡 نحو ' + x.perKid + ' د.ل للابن الواحد مع ' + Math.min(n, x.cap) + ' أبناء' }) : null,
          p.desc ? el('li', { class: 'd', text: p.desc }) : null,
          x.part ? el('li', { class: 'w', text: 'ℹ️ ' + x.part }) : null,
          !x.ok ? el('li', { class: 'w', text: '⚠️ ' + x.why + (x.multi ? ' — تحتاج ' + x.multi.k + ' باقات = ' + x.multi.total + ' د.ل' : '') }) : null),
        x.ok ? el('button', { class: 'btn sun ob-pick', text: 'اختر هذه الباقة ←', onclick: () => {
          ev('plan_select', { plan: p.id, price: p.price, who, src: 'ob' });
          const G = [...new Set(grades.filter(Boolean))];
          store.set('pend_pay', { plan: p.id, grade: G.length === 1 && p.base !== 'parent_all' ? G[0] : null, subject: null, who });
          store.set('sub_who', who); go('subscribe'); } }) : null);
      box.append(card); });
    box.append(el('p', { class: 'note ob-fine', text: 'الأسعار هي الأسعار المعتمدة حالياً في المنصة، والمبلغ النهائي يظهر قبل الدفع. يتفعّل الاشتراك تلقائياً بعد تأكيد الدفع من بوابة الدفع.' }));
  }).catch(() => { box.innerHTML = ''; box.append(el('button', { class: 'btn ghost', text: 'اعرض الباقات ←', onclick: () => go('subscribe') })); });
  return box;
}

/* الأسعار لا تُعرض مباشرة: الزائر يجرّب أولاً، ومن يريد يضغط «كم سعر الاشتراك؟» فتظهر الباقات */
let PRICE_OPEN = false;
function priceAsk(title, mk) {
  const box = el('div', { class: 'ob-price' });
  const open = () => { PRICE_OPEN = true; box.innerHTML = ''; box.append(el('section', { class: 'ob-step' }, el('div', { class: 'ob-sn' }, el('span', { text: '💳' }), el('b', { text: title })),
    el('p', { class: 'note', style: 'margin:0', text: 'الدروس المجانية متاحة دائماً دون اشتراك. الاشتراك يفتح بقية الدروس والتقارير الكاملة.' }), ...[].concat(mk()))); };
  if (PRICE_OPEN) open(); else box.append(el('button', { class: 'ob-link', text: '💬 كم سعر الاشتراك؟', onclick: () => { ev('ob_cta', { to: 'prices', role: OB().role || '' }); open(); } }));
  return box;
}
const benefits = who => el('div', { class: 'ob-ben' }, ...(who === 'parent' ? [
  ['📊', 'تقرير لكل ابن', 'الدقائق والدرجات ونقاط القوة والضعف'], ['📱', 'ربط هاتف الابن', 'برمز أو QR دون بريد أو كلمة مرور'],
  ['🗓️', 'جدول وتحكم', 'تختار المواد والدروس وأوقات الدراسة'], ['🎯', 'محاولات الاختبارات', 'الأولى والمكررة لكل درس']]
  : [['⭐', 'نجومك محفوظة', 'على أي جهاز'], ['🏆', 'لوحة الأبطال', 'تنافس زملاءك في صفك'], ['📝', 'اختبارات وتصحيح فوري', 'وتعرف أخطاءك'], ['🔊', 'شرح بالصوت والصورة', 'خطوة بخطوة']])
  .map(([i, t, s]) => el('div', {}, el('span', { text: i }), el('b', { text: t }), el('small', { text: s }))));

function ctas(who, g) { const logged = window.ACC && ACC.user && !ACC.user.isAnonymous;
  return el('div', { class: 'ob-ctas' },
    logged ? null : el('button', { class: 'btn sun ob-big', text: who === 'parent' ? '👨‍👩‍👧 أنشئ حساب ولي الأمر مجاناً' : '✨ أنشئ حسابي مجاناً', onclick: () => { ev('ob_cta', { to: 'register', role: OB().role || '' }); go('login'); } }),
    el('button', { class: 'btn ghost ob-big', text: '📖 استكشف الدروس المجانية أولاً', onclick: () => { ev('ob_cta', { to: 'explore', role: OB().role || '' }); go(g ? 'g' + g : 'home'); } }),
    logged ? null : el('p', { class: 'note', style: 'text-align:center;margin:0', text: 'التسجيل مجاني ولا يحتاج بطاقة دفع. يمكنك تعديل اختياراتك لاحقاً.' }));
}

/* ---------- ولي الأمر ---------- */
function renderParent(o, alsoTeacher) {
  o.kids = Array.isArray(o.kids) ? o.kids : []; const n = o.n || 0;
  const wrap = el('div', { class: 'ob-wrap' });
  if (!alsoTeacher) wrap.append(head('👨‍👩‍👧 مرحباً بك يا ولي الأمر', 'ثلاث خطوات سريعة لنعرض لك ما يناسب أبناءك — دون تسجيل.'));
  const nums = el('div', { class: 'ob-nums' });
  for (let i = 1; i <= 5; i++) nums.append(chip(String(i), n === i, () => setN(i)));
  nums.append(chip(n > 5 ? String(n) : '+5', n > 5, () => setN(Math.max(6, n + (n > 5 ? 1 : 0)))));
  if (n > 5) nums.append(el('span', { class: 'ob-step-n' }, chip('−', false, () => setN(n - 1), 'sm'), chip('+', false, () => setN(Math.min(MAXN, n + 1)), 'sm')));
  function setN(k) { const v = Math.max(1, Math.min(MAXN, k)); o.n = v; o.kids = o.kids.slice(0, v); while (o.kids.length < v) o.kids.push(null); saveOB(o); ev('children_count_selected', { n: v, role: o.role }); draw(); }
  wrap.append(stepBox(1, 'كم ابناً تريد أن تتابع؟', nums, el('small', { class: 'note', text: 'لا نطلب الأسماء الآن. تضيفها بعد التسجيل.' })));
  if (n) { const kidsBox = el('div', { class: 'ob-kids' });
    o.kids.forEach((g, i) => { const lab = (n === 1 ? 'ابنك' : 'الابن ' + (i + 1));
      if (g && EDIT !== i) { kidsBox.append(el('div', { class: 'ob-kid done' }, el('b', { text: '✓ ' + lab + ' — ' + gName(g) }), el('button', { class: 'ob-try ghost', text: 'تغيير', onclick: () => { EDIT = i; draw(); } }))); return; }
      kidsBox.append(el('div', { class: 'ob-kid' }, el('b', { text: lab + ': في أي صف؟' }),
        gradePicker(g, v => { o.kids[i] = v; EDIT = -1; saveOB(o); ev('grade_selected', { g: v, role: o.role, i: i + 1 }); draw(); setTimeout(() => { const nx = document.querySelector('.ob-kid:not(.done)') || document.querySelector('.ob-s3'); nx && nx.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 60); }))); });
    wrap.append(stepBox(2, n === 1 ? 'في أي صف ابنك؟' : 'في أي صف كل واحد منهم؟', kidsBox)); }
  const G = o.kids.filter(Boolean), done = n && G.length === n;
  if (done) { const uniq = [...new Set(G)];
    const s3 = stepBox(3, 'هذا ما ينتظر أبناءك', ...uniq.map(g => contentCard(g, { who: o.kids.map((x, i) => x === g ? (n === 1 ? 'ابنك' : 'الابن ' + (i + 1)) : null).filter(Boolean).join('، ') })));
    s3.classList.add('ob-s3'); wrap.append(s3, benefits('parent'),
      ctas('parent', uniq[0]), priceAsk('الباقات المناسبة لـ ' + (n === 1 ? 'ابن واحد' : n + ' أبناء') + (uniq.length > 1 ? ' في ' + uniq.length + ' صفوف' : ' في ' + gName(uniq[0])), () => plansBlock('parent', n, G, 'parent'))); }
  return wrap;
}

/* ---------- الطالب ---------- */
function renderStudent(o) { const wrap = el('div', { class: 'ob-wrap' }, head('🎒 أهلاً يا بطل', 'اختر صفك لنعرض لك دروسك والدروس المجانية.'));
  const g = o.grade || null;
  wrap.append(stepBox(1, 'في أي صف أنت؟', gradePicker(g, v => { o.grade = v; saveOB(o); ev('grade_selected', { g: v, role: 'student' }); draw(); setTimeout(() => { const t = document.querySelector('.ob-s2'); t && t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 60); })));
  if (g) { const s2 = stepBox(2, 'دروسك في ' + gName(g), contentCard(g)); s2.classList.add('ob-s2');
    wrap.append(s2, benefits('student'), ctas('student', g), priceAsk('باقات الطالب', () => plansBlock('student', 1, [g], 'student')),
      el('button', { class: 'ob-link', text: '🧒 عندي رمز من ولي أمري', onclick: () => go('link') })); }
  return wrap; }

/* ---------- المعلم ---------- */
function renderTeacher(o) { const wrap = el('div', { class: 'ob-wrap' }, head('👩‍🏫 أهلاً بك أستاذنا', 'اختر الصفوف التي تدرّسها لنعرض لك محتواها.'));
  o.tg = Array.isArray(o.tg) ? o.tg : [];
  wrap.append(stepBox(1, 'ما الصفوف التي تدرّسها؟ (يمكن أكثر من صف)', gradePicker(o.tg, v => { o.tg = o.tg.includes(v) ? o.tg.filter(x => x !== v) : [...o.tg, v]; saveOB(o); ev('grade_selected', { g: v, role: 'teacher' }); draw(); }, true)));
  if (o.tg.length) {
    wrap.append(stepBox(2, 'محتوى صفوفك', ...o.tg.map(g => contentCard(g))),
      el('div', { class: 'ob-card' }, el('b', { text: '🧑‍🏫 ما يتيحه حساب المعلم' }), el('ul', { class: 'ob-ul' },
        el('li', { text: 'استعمال الدروس التفاعلية في الفصل أو مع طلابك.' }), el('li', { text: 'إنشاء اختبارات خاصة بك لكل مادة وصف.' }), el('li', { text: 'إضافة أبنائك ومتابعتهم من الحساب نفسه إن كنت ولي أمر أيضاً.' }))));
    const ap = el('label', { class: 'ob-toggle' }, el('input', { type: 'checkbox', checked: o.alsoParent ? '' : null, onchange: e => { o.alsoParent = e.target.checked; saveOB(o); ev('role_selected', { role: 'teacher', also: o.alsoParent ? 'parent' : '' }); draw(); } }),
      el('span', {}, el('b', { text: 'وأنا أيضاً ولي أمر وأريد متابعة أبنائي' }), el('small', { text: 'حساب واحد للدورين — دون حساب ثانٍ.' })));
    wrap.append(ap);
    if (o.alsoParent) wrap.append(renderParent(o, true));
    else wrap.append(ctas('teacher', o.tg[0]), priceAsk('الباقات', () => plansBlock('student', 1, o.tg, 'teacher')));
  }
  return wrap; }

/* ---------- الزائر ---------- */
function renderVisitor(o) { const wrap = el('div', { class: 'ob-wrap' }, head('👀 استكشف المجتهد', 'اختر صفاً وجرّب دروسه المجانية الآن، دون تسجيل.'));
  const g = o.grade || null;
  wrap.append(stepBox(1, 'أي صف تريد أن تستكشف؟', gradePicker(g, v => { o.grade = v; saveOB(o); ev('grade_selected', { g: v, role: 'visitor' }); draw(); setTimeout(() => { const t = document.querySelector('.ob-s2'); t && t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 60); })));
  if (g) { const s2 = stepBox(2, 'جرّب الآن مجاناً', contentCard(g)); s2.classList.add('ob-s2'); wrap.append(s2);
    const who = o.pw || 'parent';
    const seg = el('div', { class: 'ob-seg' }, chip('👨‍👩‍👧 لأبنائي', who === 'parent', () => { o.pw = 'parent'; saveOB(o); draw(); }), chip('🎒 لنفسي (طالب)', who === 'student', () => { o.pw = 'student'; saveOB(o); draw(); }));
    wrap.append(benefits(who), ctas(who, g), priceAsk('الباقات المتاحة لـ' + gName(g), () => [seg, plansBlock(who, 1, [g], 'visitor')])); }
  return wrap; }

/* ---------- الصفحة ---------- */
let CUR = null, EDIT = -1;
function draw() { const o = OB(); const r = CUR;
  root.innerHTML = '';
  const back = D.bar(ROLE_T[r] ? ROLE_T[r][0] + ' ' + ROLE_T[r][1] : 'البداية', 'نجهّز لك المنصة المناسبة', 'start');
  root.append(back);
  const sec = el('section', { class: 'stack ob' });
  sec.append(r === 'parent' ? renderParent(o) : r === 'student' ? renderStudent(o) : r === 'teacher' ? renderTeacher(o) : renderVisitor(o));
  sec.append(el('button', { class: 'ob-link', text: '↺ غيّر نوع الاستخدام', onclick: () => go('start') }));
  root.append(sec); }

export default function (DARSI, h) {
  D = DARSI; ({ el, go, store, App, root } = D);
  if (!App.catalog) { root.innerHTML = ''; root.append(el('p', { class: 'note', style: 'padding:30px', text: 'جارٍ التحميل…' })); return; }
  const r = h.replace(/^ob-/, ''); if (!ROLE_T[r]) { go('start'); return; }
  const o = OB(); if (o.role !== r) { const keep = { ...o, role: r }; saveOB(keep); }
  // الزائر تُحفظ رغبته كدور مفضل فقط عند اختيار ولي الأمر/الطالب/المعلم
  if (r !== 'visitor') store.set('pref_role', r);
  store.set('welcomed', true); document.body.classList.remove('wl-on');
  if (CUR !== r) PRICE_OPEN = false; CUR = r; draw();
}
