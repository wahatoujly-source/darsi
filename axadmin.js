// المجتهد — لوحة «تحليلات المنصة والتحويلات» (للمالك ومن يملك صلاحية ax فقط؛ الخادم يتحقق أيضاً)
const CSS = `
.ax{gap:12px}.ax h3{margin:14px 0 6px;font-size:1.02rem}
.ax-tabs{display:flex;gap:6px;overflow-x:auto;padding:2px 0 6px;scrollbar-width:thin;position:sticky;top:0;z-index:5;background:var(--paper)}
.ax-tabs button{flex:0 0 auto;border:1.5px solid var(--line);background:var(--card);color:var(--ink);border-radius:99px;padding:7px 13px;font:inherit;font-weight:700;font-size:.86rem;white-space:nowrap}
.ax-tabs button.on{background:#1f72e0;border-color:#1f72e0;color:#fff}.ax-tabs .bd{background:#e8384f;color:#fff;border-radius:99px;padding:0 6px;margin-inline-start:4px;font-size:.75rem}
.ax-per{display:flex;gap:6px;flex-wrap:wrap;align-items:center}.ax-per button{border:1.5px solid var(--line);background:var(--card);color:var(--ink);border-radius:10px;padding:6px 10px;font:inherit;font-size:.85rem;font-weight:700}
.ax-per button.on{border-color:#1f72e0;color:#1f72e0}.ax-per input{border:1.5px solid var(--line);border-radius:10px;padding:5px 8px;font:inherit;background:var(--card);color:var(--ink)}
.ax-kpis{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px}
.ax-k{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:10px 12px;display:flex;flex-direction:column;gap:2px;min-width:0}
.ax-k b{font-size:1.45rem;line-height:1.2}.ax-k span{color:var(--muted);font-size:.8rem}.ax-k i{font-style:normal;font-size:.75rem;font-weight:700}
.ax-k i.up{color:#24a148}.ax-k i.dn{color:#e8384f}.ax-k.hi{border-color:#1f72e0;box-shadow:inset 0 0 0 1px #1f72e0}
.ax-note{background:#fff7e0;color:#6b4b00;border:1px solid #f3d57a;border-radius:12px;padding:9px 12px;font-size:.85rem}
.ax-fun{display:flex;flex-direction:column;gap:4px}
.ax-fr{display:grid;grid-template-columns:96px 1fr 58px;gap:8px;align-items:center}
.ax-fr .bar{height:30px;background:var(--line);border-radius:8px;overflow:hidden;position:relative}
.ax-fr .bar i{position:absolute;top:0;bottom:0;inset-inline-start:0;background:linear-gradient(270deg,#5ab0ff,#1f72e0);border-radius:8px}
.ax-fr .bar b{position:absolute;inset-inline-start:8px;top:50%;transform:translateY(-50%);color:#fff;font-size:.9rem;text-shadow:0 1px 2px rgba(0,0,0,.35)}
.ax-fr .lab{font-weight:700;font-size:.88rem}.ax-fr .pc{font-size:.78rem;color:var(--muted);text-align:end}
.ax-drop{margin-inline-start:20px;font-size:.78rem;color:#e8384f;font-weight:700}
.ax-tw{overflow-x:auto;border:1px solid var(--line);border-radius:12px;background:var(--card)}
.ax-t{border-collapse:collapse;width:100%;font-size:.82rem;min-width:520px}
.ax-t th,.ax-t td{padding:7px 9px;border-bottom:1px solid var(--line);text-align:start;white-space:nowrap}
.ax-t th{background:var(--paper);font-weight:800;position:sticky;top:0;cursor:pointer}.ax-t td.n{font-variant-numeric:tabular-nums}
.ax-t tr:last-child td{border-bottom:0}
.ax-tag{display:inline-block;border-radius:99px;padding:1px 8px;font-size:.74rem;font-weight:800}
.ax-tag.v{background:#eef2f7;color:#5A6F82}.ax-tag.r{background:#e3f0ff;color:#1f72e0}.ax-tag.s{background:#e3f7e9;color:#1b7f3a}.ax-tag.w{background:#ffe9ec;color:#c22a43}
.ax-bars{display:flex;align-items:flex-end;gap:3px;height:120px;padding:6px;border:1px solid var(--line);border-radius:12px;background:var(--card);overflow-x:auto}
.ax-bars div{flex:1 0 14px;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:2px;height:100%}
.ax-bars i{display:block;width:100%;background:#5ab0ff;border-radius:4px 4px 0 0;min-height:2px}.ax-bars small{font-size:.6rem;color:var(--muted)}
.ax-al{display:flex;gap:10px;align-items:flex-start;padding:10px 12px;border:1px solid var(--line);border-radius:12px;background:var(--card)}
.ax-al.un{border-inline-start:4px solid #1f72e0}.ax-al.warn.un{border-inline-start-color:#e8384f}.ax-al.good.un{border-inline-start-color:#24a148}
.ax-al .tx{flex:1;min-width:0}.ax-al small{color:var(--muted)}
.ax-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center;justify-content:space-between}
.ax-help{font-size:.82rem;color:var(--muted);line-height:1.7;overflow-wrap:anywhere}.ax-code{direction:ltr;text-align:left;font-family:monospace;font-size:.78rem;background:var(--card);border:1px solid var(--line);border-radius:10px;padding:8px;overflow-wrap:anywhere}
`;
const ROLE = {student: 'طالب', parent: 'ولي أمر', teacher: 'معلم'};
const SRC = {facebook: 'فيسبوك', instagram: 'إنستغرام', google: 'جوجل', whatsapp: 'واتساب', youtube: 'يوتيوب', direct: 'مباشر', ref: 'موقع آخر', invite: 'رابط دعوة'};
const PAGE = {home: 'الرئيسية', grade: 'صفحة الصف', subject: 'صفحة المادة', lesson: 'درس', subscribe: 'الاشتراك', login: 'التسجيل/الدخول', 'login-email': 'التسجيل بالبريد', 'login-phone': 'التسجيل بالهاتف',
  onboard: 'إكمال البيانات', kids: 'أبنائي', who: 'من يدرس الآن', account: 'حسابي', paid: 'نتيجة الدفع', welcome: 'الترحيب', start: 'من أنت؟', test: 'اختبار المستوى', arena: 'المسابقات', myreport: 'التقرير', board: 'لوحة الأبطال', books: 'الكتب', daily: 'التحدي اليومي', invite: 'دعوة', privacy: 'الخصوصية', admin: 'الإدارة'};
const ENTRY = {pill: 'زر الترقية', lesson: 'من درس', subject: 'درس مقفل', grade: 'صفحة الصف', home: 'الرئيسية', account: 'حسابي', login: 'بعد التسجيل', direct: 'رابط مباشر/إشعار', onboard: 'بعد التسجيل', kids: 'أبنائي', who: 'من يدرس'};
const FREE = {isl: 'التربية الإسلامية', civ: 'التربية الوطنية'};

export default function axAdmin({ call, fnErr, ACC, page, fbk, D, el, go, store }) {
  if (!document.getElementById('ax-css')) document.head.append(el('style', { id: 'ax-css', text: CSS }));
  const s = page('تحليلات المنصة والتحويلات', 'أرقام حقيقية من سلوك الزوار والمستخدمين', 'admin');
  if (!ACC.isAdmin || !ACC.can('ax')) { const m = el('div'); s.append(m); fbk(m, 'bad', 'هذا القسم للمدير المخوّل فقط.'); return; }
  s.classList.add('ax');
  const tz = 2 * 36e5, DAY = 864e5;
  const dayStart = (t) => { const d = new Date(t + tz).toISOString().slice(0, 10); return Date.parse(d + 'T00:00:00Z') - tz; };
  const fmtD = (t) => t ? new Date(t).toLocaleDateString('ar-LY-u-nu-latn', { timeZone: 'Africa/Tripoli', day: 'numeric', month: 'short' }) : '—';
  const fmtDT = (t) => t ? new Date(t).toLocaleString('ar-LY-u-nu-latn', { timeZone: 'Africa/Tripoli', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
  const pct = (a, b) => b ? (Math.round(a * 1000 / b) / 10) + '%' : '—';
  const dur = (sec) => sec < 60 ? sec + ' ث' : Math.floor(sec / 60) + ' د ' + (sec % 60 ? (sec % 60) + ' ث' : '');
  let P = store.get('ax_per', { k: '7' }); let R = null, planNames = {}, tab = store.get('ax_tab', 'ov');
  const range = () => { const now = Date.now(), t0 = dayStart(now);
    if (P.k === 'today') return [t0, now]; if (P.k === 'yday') return [t0 - DAY, t0];
    if (P.k === 'custom' && P.from && P.to) return [Date.parse(P.from + 'T00:00:00Z') - tz, Date.parse(P.to + 'T00:00:00Z') - tz + DAY];
    return [t0 - (+P.k - 1) * DAY, now]; };

  // ---------- أدوات العرض ----------
  const kpi = (n, t, prev, hi) => { let i = null; if (prev != null && typeof n === 'number') { const d = n - prev; if (d) i = el('i', { class: d > 0 ? 'up' : 'dn', text: (d > 0 ? '▲ ' : '▼ ') + Math.abs(Math.round(d * 100) / 100) + ' عن الفترة السابقة' }); }
    return el('div', { class: 'ax-k' + (hi ? ' hi' : '') }, el('b', { text: typeof n === 'number' ? n.toLocaleString('en') : n }), el('span', { text: t }), i); };
  const csv = (name, cols, rows) => { const esc = (v) => { v = v == null ? '' : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    const txt = '﻿' + [cols.map((c) => esc(c[1])).join(','), ...rows.map((r) => cols.map((c) => esc(typeof c[2] === 'function' ? c[2](r) : r[c[0]])).join(','))].join('\n');
    const a = el('a', { href: URL.createObjectURL(new Blob([txt], { type: 'text/csv;charset=utf-8' })), download: name + '-' + new Date().toISOString().slice(0, 10) + '.csv' }); document.body.append(a); a.click(); a.remove(); };
  // جدول قابل للفرز + زر تصدير
  const table = (name, cols, rows, opt = {}) => { const wrap = el('div', { class: 'stack', style: 'gap:6px' }); let sk = null, dir = -1; const lim = opt.limit || 300;
    const draw = () => { const data = sk ? [...rows].sort((a, b) => { const x = a[sk], y = b[sk]; return (x > y ? 1 : x < y ? -1 : 0) * dir; }) : rows;
      const t = el('table', { class: 'ax-t' }, el('thead', {}, el('tr', {}, ...cols.map((c) => el('th', { text: c[1] + (sk === c[0] ? (dir > 0 ? ' ▲' : ' ▼') : ''), onclick: () => { if (sk === c[0]) dir = -dir; else { sk = c[0]; dir = -1; } draw(); } })))),
        el('tbody', {}, ...data.slice(0, lim).map((r) => el('tr', {}, ...cols.map((c) => { const v = c[3] ? c[3](r) : (typeof c[2] === 'function' ? c[2](r) : r[c[0]]); return el('td', { class: typeof r[c[0]] === 'number' ? 'n' : '' }, v instanceof Node ? v : (v == null || v === '' ? '—' : String(v))); })))));
      wrap.innerHTML = ''; wrap.append(el('div', { class: 'ax-row' }, el('span', { class: 'note', text: rows.length + ' صف' + (rows.length > lim ? ' (يُعرض أول ' + lim + ')' : '') }),
        rows.length ? el('button', { class: 'btn ghost sm', text: '⬇️ تصدير CSV (Excel)', onclick: () => csv(name, cols, data) }) : null),
        rows.length ? el('div', { class: 'ax-tw' }, t) : el('p', { class: 'note', text: opt.empty || 'لا توجد بيانات في هذه الفترة.' })); };
    draw(); return wrap; };
  const tag = (cls, t) => el('span', { class: 'ax-tag ' + cls, text: t });
  const who = (r) => r.reg ? (r.name || 'حساب') + (r.role ? ' · ' + (ROLE[r.role] || r.role) : '') : 'زائر ' + r.id;
  const planN = (id) => planNames[id] || id || '—';
  const help = (t) => el('p', { class: 'ax-help', text: t });

  // ---------- الهيكل ----------
  const per = el('div', { class: 'ax-per' }), tabs = el('div', { class: 'ax-tabs' }), body = el('div', { class: 'stack' }), msg = el('div');
  const TABS = [['ov', '📊 نظرة عامة'], ['fun', '🔻 مسار التحويل'], ['ppl', '👥 الزوار والمستخدمون'], ['reg', '📝 التسجيلات المتوقفة'], ['sub', '💳 الاشتراكات المتوقفة'],
    ['free', '📖 المواد المجانية'], ['sc', '🏆 نتائج الدروس والإتقان'], ['ret', '🔁 العودة'], ['src', '📣 المصادر والحملات'], ['al', '🔔 التنبيهات']];
  let unread = 0;
  const drawTabs = () => { tabs.innerHTML = ''; TABS.forEach(([k, t]) => tabs.append(el('button', { class: tab === k ? 'on' : '', onclick: () => { tab = k; store.set('ax_tab', k); drawTabs(); render(); } }, t, k === 'al' && unread ? el('span', { class: 'bd', text: String(unread) }) : null))); };
  const drawPer = () => { per.innerHTML = '';
    [['today', 'اليوم'], ['yday', 'أمس'], ['7', '7 أيام'], ['30', '30 يوماً'], ['90', '90 يوماً'], ['custom', 'فترة مخصصة']].forEach(([k, t]) => per.append(el('button', { class: P.k === k ? 'on' : '', text: t, onclick: () => { P = { ...P, k }; store.set('ax_per', P); drawPer(); if (k !== 'custom' || (P.from && P.to)) load(); } })));
    if (P.k === 'custom') { const today = new Date(Date.now() + tz).toISOString().slice(0, 10);
      const a = el('input', { type: 'date', value: P.from || today, max: today }), b = el('input', { type: 'date', value: P.to || today, max: today });
      per.append(a, el('span', { text: 'إلى' }), b, el('button', { class: 'on', text: 'عرض', onclick: () => { if (a.value > b.value) return; P = { k: 'custom', from: a.value, to: b.value }; store.set('ax_per', P); load(); } })); }
    per.append(el('button', { text: '↻ تحديث', onclick: () => load() })); };
  s.append(el('div', { class: 'gx-hero', style: '--h1:#1f72e0;--h2:#123f86' }, el('img', { src: 'img/ui/n_ach.webp', alt: '' }), el('div', {}, el('b', { text: '📈 تحليلات المنصة والتحويلات' }), el('span', { text: 'من أين يأتي الزوار، وأين نخسرهم، وما الذي يجعلهم يشتركون' }))),
    per, tabs, msg, body);
  drawTabs(); drawPer();

  async function load() {
    const [from, to] = range(); body.innerHTML = ''; fbk(msg, 'info', '⏳ جارٍ حساب التقرير…');
    try { R = await call('adminAx', { op: 'report', from, to }); msg.innerHTML = ''; render(); }
    catch (e) { fbk(msg, 'bad', fnErr(e)); }
  }
  async function loadAlerts() { try { const a = await call('adminAx', { op: 'alerts' }); ACC._axAlerts = a.list || []; unread = ACC._axAlerts.filter((x) => !x.read).length; drawTabs(); if (tab === 'al') render(); } catch (e) {} }
  (async () => { try { const p = await call('adminGetPlans', {}); (p.list || []).forEach((x) => { planNames[x.id] = x.name; }); } catch (e) { try { const p = await call('getPlans', {}); (p.plans || []).forEach((x) => { planNames[x.id] = x.name; }); } catch (e2) {} } })();
  load(); loadAlerts();

  function render() {
    body.innerHTML = ''; if (tab === 'al') { renderAlerts(); return; } if (!R) return;
    const notice = el('div', { class: 'ax-note' }, R.firstTrack ? 'بدأ تسجيل سلوك الزوار في ' + fmtDT(R.firstTrack) + '. ما قبل ذلك غير متاح، باستثناء الحسابات والطلبات والمدفوعات (من قاعدة البيانات مباشرة). حسابات الإدارة وأجهزة الأبناء المربوطة مستبعدة من الأرقام.'
      : 'لم يصل أي حدث تتبع بعد. بعد نشر التحديث ستبدأ الأرقام بالظهور تلقائياً. الحسابات والطلبات والمدفوعات أدناه من قاعدة البيانات مباشرة.');
    body.append(notice);
    ({ sc: renderSc, ov: renderOv, fun: renderFun, ppl: renderPpl, reg: renderReg, sub: renderSub, free: renderFree, ret: renderRet, src: renderSrc })[tab]();
  }

  // ---------- 1) نظرة عامة ----------
  function renderOv() { const o = R.overview, p = R.prev || {};
    body.append(el('h3', { text: 'الزوار والنشاط' }), el('div', { class: 'ax-kpis' },
      kpi(o.visitors, 'زائر (أشخاص مختلفون)', p.visitors, true), kpi(o.newVisitors, 'زائر جديد', p.newVisitors), kpi(o.returning, 'زائر عائد', p.returning), kpi(o.sessions, 'زيارة (جلسة)', p.sessions),
      kpi(dur(o.avgSession), 'متوسط مدة الزيارة'), kpi(o.totalVisitors, 'كل الزوار منذ بدء التتبع')),
      el('h3', { text: 'المستخدمون النشطون (حتى نهاية الفترة)' }), el('div', { class: 'ax-kpis' },
      kpi(o.dau, 'نشط يومياً'), kpi(o.wau, 'نشط أسبوعياً'), kpi(o.mau, 'نشط شهرياً'), kpi(o.dauReg, 'مسجّل نشط اليوم'), kpi(o.wauReg, 'مسجّل نشط هذا الأسبوع'), kpi(o.mauReg, 'مسجّل نشط هذا الشهر')),
      el('h3', { text: 'التسجيل والاشتراك' }), el('div', { class: 'ax-kpis' },
      kpi(o.newAccounts, 'حساب جديد (من قاعدة البيانات)', p.newAccounts, true), kpi(o.regStarted, 'بدأ التسجيل', p.regStarted), kpi(o.regIncomplete, 'تسجيل غير مكتمل', p.regIncomplete),
      kpi(o.plansViewers, 'شاهد الباقات', p.plansViewers), kpi(o.payStarted, 'بدأ الدفع', p.payStarted), kpi(o.subsDone, 'اشتراك مكتمل (مؤكد من ماي باي)', p.subsDone, true),
      kpi(o.revenue + ' د.ل', 'إيرادات مؤكدة'), kpi(o.conversion + '%', 'التحويل: زائر ← مشترك'), kpi(o.failed, 'دفع فاشل'), kpi(o.cancelled, 'دفع ملغى'), kpi(o.abandoned, 'طلب دفع لم يكتمل (+2 ساعة)')));
    if (R.daily.length) { const mx = Math.max(1, ...R.daily.map((d) => d.visitors));
      body.append(el('h3', { text: 'الزوار يومياً' }), el('div', { class: 'ax-bars' }, ...R.daily.map((d) => el('div', { title: d.d + ': ' + d.visitors + ' زائر، ' + d.regs + ' تسجيل، ' + d.paid + ' اشتراك' },
        el('small', { text: String(d.visitors) }), el('i', { style: 'height:' + Math.round(d.visitors * 100 / mx) + '%' + (d.paid ? ';background:#24a148' : '') }), el('small', { text: d.d.slice(8) })))),
      help('العمود الأخضر = يوم فيه اشتراك مدفوع.'),
      table('يومي', [['d', 'اليوم'], ['visitors', 'زوار'], ['newV', 'جدد'], ['regs', 'حسابات جديدة'], ['plans', 'شاهدوا الباقات'], ['pay', 'طلبات دفع'], ['paid', 'اشتراكات'], ['revenue', 'إيراد د.ل']], [...R.daily].reverse(), { limit: 120 })); }
    body.append(el('h3', { text: 'الأقسام الأكثر زيارة' }), table('الصفحات', [['k', 'القسم', (r) => PAGE[r.k] || r.k], ['v', 'مرات المشاهدة']], R.pages),
      el('h3', { text: 'أكثر الصفحات تحديداً' }), table('صفحات-تفصيلية', [['k', 'الصفحة', (r) => { const [a, b] = r.k.split(':'); if (a === 'lesson') { const f = D.findLesson(b); return 'درس: ' + (f ? f.lesson.title : b); } return (PAGE[a] || a) + ' ' + b; }], ['v', 'مرات المشاهدة']], R.pagesX));
  }

  // ---------- 2) مسار التحويل ----------
  function renderFun() { const F = R.funnel, top = Math.max(1, F[0].n);
    const draw = (key, title, hint) => { const box = el('div', { class: 'ax-fun' });
      F.forEach((f, i) => { const n = f[key], pv = i ? F[i - 1][key] : null;
        if (i && key === 'seq') box.append(el('div', { class: 'ax-drop', text: pv ? '↓ انتقل ' + pct(n, pv) + ' · انسحب ' + Math.max(0, pv - n) + ' (' + pct(Math.max(0, pv - n), pv) + ')' : '↓' }));
        box.append(el('div', { class: 'ax-fr' }, el('span', { class: 'lab', text: f.t }), el('div', { class: 'bar' }, el('i', { style: 'width:' + Math.max(2, Math.round(n * 100 / top)) + '%' }), el('b', { text: String(n) })), el('span', { class: 'pc', title: 'من الزوار', text: pct(n, F[0][key]) }))); });
      body.append(el('h3', { text: title }), help(hint), box); };
    draw('seq', 'المسار المتتابع (من مرّ بكل الخطوات بالترتيب)', 'كل رقم = عدد من وصل إلى هذه الخطوة بعد أن مرّ بكل ما قبلها خلال الفترة. من كان مسجلاً من قبل يُحسب مارّاً بخطوتي التسجيل. هذا هو المسار الأدق لمعرفة أين نخسر الناس.');
    draw('n', 'كل خطوة على حدة', 'عدد من قام بكل خطوة خلال الفترة بغض النظر عن ترتيب الوصول (بعضهم يشاهد الباقات قبل التسجيل، لذلك قد تكون خطوة لاحقة أكبر من سابقتها). النسبة = من الزوار.');
    const o = R.overview;
    body.append(el('h3', { text: 'نتيجة طلبات الدفع (من قاعدة البيانات)' }), el('div', { class: 'ax-kpis' }, kpi(o.orders, 'طلب دفع أُنشئ'), kpi(o.subsDone, 'مدفوع ومؤكد'), kpi(o.failed, 'فشل'), kpi(o.cancelled, 'ألغاه المستخدم'), kpi(o.abandoned, 'تركه دون إكمال')),
      el('h3', { text: 'من أين يدخلون صفحة الاشتراك؟' }), table('مداخل-الاشتراك', [['k', 'المدخل', (r) => ENTRY[r.k] || PAGE[r.k] || r.k], ['v', 'مرات']], R.entry),
      el('h3', { text: 'الباقات: المشاهدة والاختيار والدفع' }), help('تُعرض كل الباقات معاً في صفحة الاشتراك؛ «شاهدها» = فتح الصفحة وهي معروضة، و«اختارها» = ضغط عليها، وهو المؤشر الحقيقي للاهتمام.'),
      table('الباقات', [['plan', 'الباقة', (r) => planN(r.plan)], ['shown', 'شاهدها (أشخاص)'], ['shownN', 'مرات المشاهدة'], ['selected', 'اختارها (أشخاص)'], ['selectedN', 'مرات الاختيار'], ['payClick', 'ضغط ادفع'], ['orders', 'طلبات دفع'], ['paid', 'مدفوعة'], ['revenue', 'إيراد د.ل']], R.plans),
      el('h3', { text: 'خطوات التسجيل بالتفصيل' }), table('خطوات-التسجيل', [['t', 'الخطوة'], ['n', 'أشخاص']], R.regSteps),
      el('h3', { text: 'طرق التسجيل المختارة' }), table('طرق-التسجيل', [['k', 'الطريقة', (r) => ({ google: 'Google', email: 'البريد', phone: 'الهاتف' })[r.k] || r.k], ['v', 'أشخاص']], Object.entries(R.regMethods).map(([k, v]) => ({ k, v }))),
      el('h3', { text: 'الأخطاء التي واجهت المسجّلين' }), table('أخطاء-التسجيل', [['k', 'الطريقة · الخطأ', (r) => errAr(r.k)], ['v', 'مرات']], R.regErrors, { empty: 'لم تُسجل أخطاء.' }));
  }
  const ERR = { bad_phone: 'رقم هاتف غير صحيح', short_password: 'كلمة مرور قصيرة', bad_email: 'بريد غير صحيح', 'auth/email-already-in-use': 'الحساب موجود مسبقاً', 'auth/invalid-credential': 'بيانات دخول خاطئة', 'auth/popup-closed-by-user': 'أغلق نافذة Google',
    'auth/network-request-failed': 'مشكلة اتصال', 'auth/too-many-requests': 'محاولات كثيرة', no_name: 'لم يكتب الاسم', no_role: 'لم يختر الدور', no_grade: 'لم يختر الصف', 'auth/invalid-email': 'بريد غير صحيح', 'auth/weak-password': 'كلمة مرور ضعيفة' };
  const errAr = (k) => { const [m, c] = String(k).split(' · '); return ({ google: 'Google', email: 'البريد', phone: 'الهاتف', onboard: 'إكمال البيانات' })[m] || m + ' · ' + (ERR[c] || c); };

  // ---------- 3) الزوار والمستخدمون ----------
  function renderPpl() {
    body.append(help('كل صف = شخص (زائر بمعرّف ثابت في متصفحه، أو حساب مسجّل يجمع كل أجهزته). «الزيارات» = عدد الجلسات، وتحديث الصفحة لا يُحسب زيارة جديدة.'),
      table('الزوار-والمستخدمون', [['id', 'المعرّف'], ['reg', 'الحالة', (r) => r.subNow ? 'مشترك' : r.reg ? 'مسجّل' : 'زائر', (r) => r.subNow ? tag('s', 'مشترك') : r.reg ? tag('r', 'مسجّل') : tag('v', 'زائر')],
        ['name', 'الاسم', (r) => r.reg ? (r.name || '') + (r.role ? ' (' + (ROLE[r.role] || r.role) + ')' : '') : ''], ['f', 'أول زيارة', (r) => fmtDT(r.f)], ['last', 'آخر زيارة', (r) => fmtDT(r.last)], ['visits', 'الزيارات'], ['days', 'أيام النشاط'],
        ['src', 'المصدر', (r) => (SRC[r.src] || r.src || '') + (r.cmp ? ' · ' + r.cmp : '')], ['returned', 'عاد؟', (r) => r.returned ? 'نعم' : 'لا'], ['plans', 'شاهد الباقات؟', (r) => r.plans ? 'نعم' : 'لا'], ['sub', 'اشترك؟', (r) => r.sub ? 'نعم' : 'لا']], R.people, { limit: 500 }));
  }
  // ---------- 4) التسجيلات المتوقفة ----------
  function renderReg() {
    body.append(help('من بدأ التسجيل ولم يكمله (لا يوجد له حساب مكتمل حتى الآن)، مع آخر خطوة وصلها وآخر خطأ ظهر له. لا تُعرض كلمات المرور أو أي بيانات أدخلها.'),
      table('تسجيلات-متوقفة', [['id', 'المعرّف'], ['stepT', 'توقف عند'], ['err', 'آخر خطأ', (r) => r.err ? (ERR[r.err] || r.err) : ''], ['at', 'الوقت', (r) => fmtDT(r.at)], ['visits', 'الزيارات'], ['src', 'المصدر', (r) => (SRC[r.src] || r.src || '') + (r.cmp ? ' · ' + r.cmp : '')], ['returned', 'عاد لاحقاً؟', (r) => r.returned ? 'نعم' : 'لا']], R.stalledReg));
  }
  // ---------- 5) الاشتراكات المتوقفة ----------
  function renderSub() {
    body.append(help('من دخل صفحة الاشتراك أو شاهد الباقات أو بدأ الدفع ولم يدفع. «شاهد» و«اختار» تُظهر كل باقة وعدد المرات. أرقام الهاتف لأصحاب الحسابات فقط (ولي الأمر أو الطالب المسجل) للتواصل عند الحاجة.'),
      table('اشتراكات-متوقفة', [['id', 'المعرّف'], ['name', 'الشخص', who], ['phone', 'الهاتف'], ['stepT', 'توقف عند'], ['plan', 'آخر باقة', (r) => planN(r.plan)],
        ['seen', 'شاهد', (r) => r.seen.replace(/([a-z0-9_]+)×/gi, (m, k) => planN(k) + '×')], ['sel', 'اختار', (r) => r.sel.replace(/([a-z0-9_]+)×/gi, (m, k) => planN(k) + '×')], ['orders', 'طلبات دفع'], ['lastOrder', 'آخر طلب', (r) => ({ pending: 'معلق', failed: 'فشل' })[String(r.lastOrder).split(' ')[0]] ? r.lastOrder.replace('pending', 'معلق').replace('failed', 'فشل') : r.lastOrder], ['at', 'الوقت', (r) => fmtDT(r.at)]], R.stalledSub),
      el('h3', { text: 'طلبات دفع لم تكتمل (من قاعدة البيانات، تشمل ما قبل التتبع)' }), help('أشخاص ضغطوا «ادفع» فعلاً وأُنشئ لهم طلب في ماي باي ولم يكتمل، ولم يشتركوا بعد ذلك. ✱ = قبل بدء التتبع.'),
      table('طلبات-غير-مكتملة', [['name', 'الاسم', (r) => (r.name || '—') + (r.role ? ' (' + (ROLE[r.role] || r.role) + ')' : '')], ['phone', 'الهاتف'], ['plan', 'الباقة'], ['amount', 'المبلغ'], ['status', 'الحالة', (r) => r.status === 'failed' ? 'فشل' : r.cancelled ? 'ألغاه' : 'لم يكمل'], ['at', 'التاريخ', (r) => fmtDT(r.at) + (r.before ? ' ✱' : '')]], R.histPending));
  }
  // ---------- 6) المواد المجانية ----------
  const subjTotal = (g, sid) => { const c = D.App.catalog; const sj = c && (c.grades[g] || []).find((x) => x.id === sid); if (!sj) return 0;
    const units = sj.books ? sj.books.flatMap((b) => b.units) : (sj.units || []); return units.reduce((a, u) => a + u.lessons.filter((l) => l.ready).length, 0); };
  const lname = (id) => { const f = D.findLesson(id); return f ? f.lesson.title : id; };
  function renderFree() {
    if (!R.free.length) { body.append(el('p', { class: 'note', text: 'لم يفتح أحد دروس المواد المجانية في هذه الفترة (أو لم يبدأ التتبع بعد).' })); return; }
    const all = { visitors: 0, regs: 0, opens: 0, dones: 0, people: 0, toPlans: 0, toPaid: 0, returns: 0, full: 0 };
    R.free.forEach((f) => f.rows.forEach((r) => { r.total = subjTotal(r.g, f.s); r.full = r.total && r.done >= r.total; }));
    R.free.forEach((f) => { ['visitors', 'regs', 'opens', 'dones', 'people', 'toPlans', 'toPaid', 'returns'].forEach((k) => { all[k] += f[k]; }); all.full += f.rows.filter((r) => r.full).length; });
    body.append(el('h3', { text: 'إجمالي المواد المجانية' }), el('div', { class: 'ax-kpis' }, kpi(all.visitors, 'زائر غير مسجّل فتحها'), kpi(all.regs, 'مسجّل استخدمها'), kpi(all.opens, 'مرة فُتح فيها درس'), kpi(all.dones, 'درس أُكمل'),
      kpi(all.returns, 'عاد إليها أكثر من مرة'), kpi(all.toPlans, 'انتقل بعدها للباقات', null, true), kpi(all.toPaid, 'اشترك بعدها', null, true), kpi(all.full, 'أكمل كل دروس المادة لصفه')));
    R.free.forEach((f) => {
      body.append(el('h3', { text: '📖 ' + (FREE[f.s] || f.s) }), el('div', { class: 'ax-kpis' }, kpi(f.visitors, 'زائر فتحها'), kpi(f.regs, 'مسجّل استخدمها'), kpi(f.avgOpened, 'متوسط الدروس المفتوحة للشخص'), kpi(f.avgDone, 'متوسط الدروس المكتملة'),
        kpi(pct(f.dones, f.opens), 'نسبة إكمال الدروس'), kpi(f.returns, 'عاد إليها'), kpi(f.toPlans, 'انتقل للباقات'), kpi(f.toPaid, 'اشترك')),
      table('مجانية-' + f.s, [['id', 'المعرّف'], ['reg', 'الحالة', (r) => r.sub ? 'مشترك' : r.reg ? 'مسجّل' : 'زائر', (r) => r.sub ? tag('s', 'مشترك') : r.reg ? tag('r', 'مسجّل') : tag('v', 'زائر')], ['name', 'الاسم'], ['g', 'الصف', (r) => D.gradeName(r.g) || r.g],
        ['opened', 'فتح'], ['done', 'أكمل'], ['total', 'دروس المادة'], ['full', 'أكمل المادة؟', (r) => r.full ? 'نعم' : 'لا'], ['last', 'أين توقف', (r) => lname(r.last) + (r.n ? ' (الخطوة ' + r.lastAt + ' من ' + r.n + ')' : '')],
        ['sess', 'مرات العودة'], ['toPlans', 'ذهب للباقات؟', (r) => r.toPlans ? 'نعم' : 'لا'], ['lastT', 'آخر نشاط', (r) => fmtDT(r.lastT)]], f.rows)); });
  }
  // ---------- نتائج الدروس والقفل بعد الإتقان ----------
  const SUBJ = (g, sid) => { const c = D.App.catalog; const sj = c && (c.grades[g] || []).find((x) => x.id === sid); return sj ? sj.name : sid; };
  function renderSc() { const M0 = (ACC.access || {}).master || {}; const M = { on: M0.on !== false, pct: +M0.pct || 80 }; const S = R.scores || { lessons: [], rows: [] };
    const on = el('input', { type: 'checkbox', checked: M.on ? '' : null }), pc = el('input', { type: 'number', min: '50', max: '100', value: String(M.pct), style: 'width:80px' }), m = el('div');
    body.append(el('div', { class: 'panel', style: 'display:flex;flex-direction:column;gap:8px;border:2px solid #ffc98a' }, el('b', { text: '⚙️ قفل الدرس بعد الإتقان (النسخة المجانية)' }),
      help('من يحصل على هذه النسبة أو أكثر في اختبار الدرس يُغلق عليه الدرس ولا يستطيع إعادته، ما لم يكن عنده اشتراك مدفوع رسمي. يشمل الزوار والمسجلين بدون دفع وأصحاب الأيام المجانية والمنح. عند الاشتراك المدفوع تُفتح كل الدروس تلقائياً. الدروس التي ليس فيها اختبار لا تُغلق.'),
      el('label', { class: 'sndrow', style: 'margin:0' }, on, el('b', { text: 'تفعيل القفل بعد الإتقان' })),
      el('label', { class: 'prow' }, el('span', { text: 'نسبة الإتقان المطلوبة %' }), pc),
      ACC.can('access') ? el('button', { class: 'btn sun', text: '💾 حفظ', onclick: async (e) => { e.target.disabled = true; try { const r = await call('adminSetAccess', { op: 'master', on: on.checked, pct: +pc.value }); ACC.access = { ...(ACC.access || {}), master: { on: on.checked, pct: r.pct } }; fbk(m, 'ok', '✓ حُفظ: ' + (on.checked ? 'القفل مفعّل عند ' + r.pct + '%' : 'القفل متوقف')); } catch (x) { fbk(m, 'bad', fnErr(x)); } e.target.disabled = false; } })
        : el('span', { class: 'note', text: 'التعديل يحتاج صلاحية «فتح وإغلاق الدروس».' }), m),
      el('div', { class: 'ax-kpis' }, kpi(S.rows.length, 'محاولة اختبار في الفترة'), kpi(S.lockedPersons, 'شخص أُغلق عليه درس', null, true), kpi(S.lockViews, 'شخص رأى رسالة «أتقنت الدرس»'), kpi(S.lockCta, 'ضغط «الاشتراك» من رسالة الإتقان', null, true)),
      el('h3', { text: 'نتائج كل درس' }), help('«متوسط أفضل نتيجة» = متوسط أعلى درجة حصل عليها كل شخص. «أُغلق» = عدد من أُغلق عليهم الدرس (غير مشتركين).'),
      table('نتائج-الدروس', [['l', 'الدرس', (r) => lname(r.l)], ['s', 'المادة', (r) => SUBJ(r.g, r.s)], ['g', 'الصف', (r) => D.gradeName(r.g) || r.g], ['persons', 'أشخاص'], ['attempts', 'محاولات'], ['avg', 'متوسط الدرجة %'], ['avgBest', 'متوسط أفضل نتيجة %'], ['over80', 'حصلوا 80% فأكثر'], ['locked', 'أُغلق'], ['paid', 'مشتركون']], S.lessons),
      el('h3', { text: 'آخر المحاولات' }), table('محاولات-الاختبارات', [['t', 'الوقت', (r) => fmtDT(r.t)], ['id', 'المعرّف'], ['name', 'الشخص', (r) => r.reg ? (r.name || 'حساب') + (r.role ? ' (' + (ROLE[r.role] || r.role) + ')' : '') : 'زائر'],
        ['l', 'الدرس', (r) => lname(r.l)], ['s', 'المادة', (r) => SUBJ(r.g, r.s)], ['sc', 'الدرجة %'], ['lock', 'أُغلق؟', (r) => r.paid ? 'مشترك' : r.lock ? 'نعم 🔒' : 'لا']], S.rows));
  }
  // ---------- 7) العودة ----------
  function renderRet() { const T = R.retention;
    const co = (c, t) => el('div', { class: 'ax-kpis' }, kpi(c.n, t), kpi(c.retPct + '%', 'عاد مرة أخرى على الأقل (' + c.ret + ')'), kpi(c.d1.pct == null ? '—' : c.d1.pct + '%', 'عاد في اليوم التالي (' + c.d1.n + ' من ' + c.d1.elig + ')'),
      kpi(c.d7.pct == null ? '—' : c.d7.pct + '%', 'عاد بعد 7 أيام أو أكثر (' + c.d7.n + ' من ' + c.d7.elig + ')'), kpi(c.d30.pct == null ? '—' : c.d30.pct + '%', 'عاد بعد 30 يوماً أو أكثر (' + c.d30.n + ' من ' + c.d30.elig + ')'));
    body.append(help('الفوج = من كانت أول زيارة له داخل الفترة. «بعد 7 أيام» تُحسب فقط لمن مرّ على أول زيارته 7 أيام على الأقل (وكذلك 30).'),
      el('h3', { text: 'كل الأشخاص' }), co(T.all, 'شخص زار لأول مرة'), el('h3', { text: 'المسجّلون فقط' }), co(T.reg, 'مسجّل'), el('h3', { text: 'الزوار غير المسجّلين' }), co(T.visitorsOnly, 'زائر'),
      el('h3', { text: 'كم يوماً نشط كل شخص؟' }), table('توزيع-الزيارات', [['k', 'عدد أيام النشاط'], ['v', 'أشخاص']], Object.entries(T.visitsDist).map(([k, v]) => ({ k, v }))),
      el('h3', { text: 'مقارنة الأسابيع (آخر 8 أسابيع)' }), table('العودة-أسبوعياً', [['from', 'الأسبوع', (r) => r.from + ' ← ' + r.to], ['n', 'جدد', (r) => r.all.n], ['ret', 'عاد', (r) => r.all.retPct + '%'], ['d1', 'اليوم التالي', (r) => r.all.d1.pct == null ? '—' : r.all.d1.pct + '%'],
        ['d7', 'بعد 7 أيام', (r) => r.all.d7.pct == null ? '—' : r.all.d7.pct + '%'], ['d30', 'بعد 30 يوماً', (r) => r.all.d30.pct == null ? '—' : r.all.d30.pct + '%'], ['rn', 'مسجّلون جدد', (r) => r.reg.n], ['rr', 'عاد منهم', (r) => r.reg.retPct + '%']], T.weeks),
      el('h3', { text: 'سجّلوا ولم يعودوا' }), table('سجلوا-ولم-يعودوا', [['name', 'الاسم'], ['role', 'الدور', (r) => ROLE[r.role] || r.role], ['phone', 'الهاتف'], ['created', 'تاريخ التسجيل', (r) => fmtDT(r.created)], ['lastSeen', 'آخر ظهور', (r) => fmtDT(r.lastSeen)]], T.regNoReturn),
      el('h3', { text: 'يستخدمون المنصة ولم يشتركوا' }), help('مسجّلون نشطون يومين أو أكثر ولم يدفعوا أبداً — أفضل المرشحين للتواصل أو لعرض خاص.'),
      table('نشطون-بلا-اشتراك', [['name', 'الاسم', (r) => r.name + (r.role ? ' (' + (ROLE[r.role] || r.role) + ')' : '')], ['phone', 'الهاتف'], ['days', 'أيام النشاط'], ['visits', 'الزيارات'], ['last', 'آخر زيارة', (r) => fmtDT(r.last)], ['plans', 'شاهد الباقات؟', (r) => r.plans ? 'نعم' : 'لا']], T.usedNoSub));
  }
  // ---------- المصادر والحملات ----------
  function renderSrc() {
    body.append(help('الأشخاص يُنسبون إلى أول مصدر جاؤوا منه (لمعرفة أي إعلان جلب مشتركين). الحملات تُقرأ من روابط UTM؛ اجعل رابط الإعلان في فيسبوك مثل هذا (غيّر اسم الحملة والإعلان):'),
      el('div', { class: 'ax-code', text: 'https://mujtahid.ly/?utm_source=facebook&utm_medium=paid&utm_campaign=nov_parents&utm_content=video1' }),
      help('زيارات فيسبوك بدون UTM تُعرف تلقائياً كمصدر «فيسبوك» من fbclid أو من متصفح فيسبوك، لكن بدون اسم الحملة.'),
      el('h3', { text: 'المصادر' }), table('المصادر', [['src', 'المصدر', (r) => SRC[r.src] || r.src], ['persons', 'أشخاص (أول مصدر)'], ['sessions', 'زيارات'], ['regs', 'سجّلوا'], ['plans', 'شاهدوا الباقات'], ['paid', 'اشتركوا'], ['cv', 'التحويل', (r) => pct(r.paid, r.persons)]], R.sources),
      el('h3', { text: 'الحملات والإعلانات (UTM)' }), table('الحملات', [['src', 'المصدر', (r) => SRC[r.src] || r.src], ['cmp', 'الحملة'], ['cnt', 'الإعلان'], ['persons', 'أشخاص'], ['sessions', 'زيارات'], ['regs', 'سجّلوا'], ['plans', 'شاهدوا الباقات'], ['paid', 'اشتركوا']], R.campaigns, { empty: 'لا توجد زيارات من روابط فيها UTM في هذه الفترة.' }));
  }
  // ---------- 8) التنبيهات ----------
  function renderAlerts() { const L = ACC._axAlerts || [];
    const ICON = { reg: '👤', sub: '🎉', payfail: '⚠️', reg_drop: '📝', plans_exit: '🚪', ret_up: '🔁', act_down: '📉' };
    body.append(el('div', { class: 'ax-row' }, help('تنبيه فوري (إشعار على هاتفك) فقط للاشتراك الجديد وفشل الدفع والتغيرات الكبيرة؛ والباقي يظهر هنا. يُفحص النشاط يومياً الساعة 9:15 مساءً.'),
      unread ? el('button', { class: 'btn ghost sm', text: '✓ تمييز الكل كمقروء', onclick: async () => { const ids = L.filter((x) => !x.read).map((x) => x.id); await call('adminAx', { op: 'read', ids }).catch(() => {}); L.forEach((x) => { x.read = true; }); unread = 0; drawTabs(); render(); } }) : null));
    if (!L.length) { body.append(el('p', { class: 'note', text: 'لا توجد تنبيهات بعد.' })); return; }
    L.forEach((a) => body.append(el('div', { class: 'ax-al ' + (a.lvl || '') + (a.read ? '' : ' un') }, el('span', { style: 'font-size:1.4rem', text: ICON[a.type] || '🔔' }),
      el('div', { class: 'tx' }, el('b', { text: a.title }), el('div', { text: a.body || '' }), el('small', { text: fmtDT(a.at) })),
      a.read ? null : el('button', { class: 'btn ghost sm', text: 'مقروء', onclick: async (e) => { await call('adminAx', { op: 'read', ids: [a.id] }).catch(() => {}); a.read = true; unread = Math.max(0, unread - 1); drawTabs(); render(); } }))));
  }
}
