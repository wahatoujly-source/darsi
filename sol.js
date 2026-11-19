// المجتهد — حلول تمارين الكتاب المدرسي بالخطوات: #sol (كل الكتب) و #sol-<صف>-<مادة> و #sol-8-math~t1b (تمرين) و ~p15 (صفحة) و ~l-<درس>
// البيانات: data/sol/index.json + data/sol/<صف>-<مادة>.json + صور الصفحات data/sol/img/<كتاب>/pNNN.webp
// إعدادات الإدارة في config/access.sol = {on, ans:'all'|'reg'|'subs', steps:'all'|'reg'|'subs', off:[مفاتيح كتب مخفية]}
export default async function runSol(D, h) {
  const { el, go, store, root, bar } = D;
  const A = () => window.ACC || {};
  const CFG = () => Object.assign({ on: true, ans: 'all', steps: 'reg', off: [] }, (D.ACCX && D.ACCX().sol) || {});
  const admin = () => !!A().isAdmin;
  const ev = (n, p) => { try { window.AX && AX.ev(n, p); } catch (e) {} };
  const ok = (mode, g, s) => admin() || mode === 'all' || (mode === 'reg' && D.registered()) || (mode === 'subs' && (D.App.sub || D.canOpen(g, s)));
  const need = mode => mode === 'subs' ? 'subs' : 'reg';

  if (!document.getElementById('sol-css')) document.head.append(el('style', { id: 'sol-css', text: CSS }));
  root.innerHTML = ''; root.append(el('p', { class: 'note', style: 'padding:30px 0', text: 'جارٍ تحميل الحلول…' }));
  const m = /^sol(?:-([a-z0-9]+)-([a-z]+))?(?:~([a-z0-9-]+))?$/.exec(h) || [];
  let IX;
  try { IX = await D.getJSON('data/sol/index.json'); } catch (e) { fail(); return; }
  const C = CFG();
  if (!C.on && !admin()) { off('حلول التمارين غير متاحة حالياً', 'عُد إليها لاحقاً.'); return; }
  const KS = D.kidSol ? D.kidSol() : 'on';
  if (KS === 'off') { off('حلول التمارين مغلقة', 'أغلقها ولي أمرك. اسأله إذا احتجت إليها.'); return; }
  if (!m[1]) { renderAll(); return; }
  const key = m[1] + '-' + m[2];
  if (!IX.books[key] || ((C.off || []).includes(key) && !admin())) { off('حلول هذا الكتاب غير متاحة حالياً', ''); return; }
  let B;
  try { B = await D.getJSON('data/sol/' + key + '.json'); } catch (e) { fail(); return; }
  renderBook(B, m[3] || '');

  function fail() { root.innerHTML = ''; root.append(el('div', { class: 'err' }, el('p', { text: 'تعذّر تحميل الحلول. تحقق من الاتصال وحاول مرة أخرى.' }), el('button', { class: 'btn', text: 'أعد المحاولة', onclick: () => D.route() }))); }
  function off(t, s) { root.innerHTML = ''; root.append(bar('حلول التمارين', '', 'home'), el('div', { class: 'maint' }, el('div', { style: 'font-size:3rem', text: '✍️' }), el('h2', { text: t }), s ? el('p', { text: s }) : null)); }

  // ---------- كل الكتب المتاحة ----------
  function renderAll() {
    root.innerHTML = ''; root.append(bar('حلول تمارين الكتب', 'المنهج الليبي · بالخطوات', 'home'));
    const LG = D.lockedGrade && D.lockedGrade();
    const sec = el('section', { class: 'sol' });
    sec.append(el('div', { class: 'sol-hero' }, el('span', { class: 'ic', text: '✍️' }), el('div', {}, el('b', { text: 'حلول تمارين الكتاب المدرسي' }),
      el('span', { text: 'كل سؤال في الكتاب: الناتج النهائي، وخطوات الحل سطراً بسطر مع سبب كل خطوة.' }))));
    const list = Object.entries(IX.books).filter(([k, b]) => (!LG || String(b.g) === String(LG)) && (admin() || !(C.off || []).includes(k)));
    if (!list.length) sec.append(el('div', { class: 'empty' }, el('span', { class: 'big', text: '📚' }), el('p', { text: 'لا توجد حلول لصفك بعد. نضيف كتباً جديدة باستمرار.' })));
    list.forEach(([k, b]) => sec.append(el('button', { class: 'sol-bk', onclick: () => go('sol-' + k) },
      el('span', { class: 'ic', text: '📘' }), el('span', { class: 'tx' }, el('b', { text: b.t }), el('small', { text: D.gradeName(b.g) + ' · ' + b.ex + ' تمريناً · ' + b.items + ' سؤالاً محلولاً' })),
      (C.off || []).includes(k) ? el('span', { class: 'tag', text: 'مخفي' }) : el('span', { class: 'go', text: '←' }))));
    sec.append(el('p', { class: 'note', style: 'text-align:center', text: 'نضيف حلول باقي الكتب والصفوف تباعاً، بدءاً بالرياضيات.' }));
    root.append(sec); ev('sol_home');
  }

  // ---------- كتاب واحد ----------
  function renderBook(B, sel) {
    const g = String(B.grade), s = B.subject, key = B.key, LTR = s === 'en';
    { const LG = D.lockedGrade && D.lockedGrade(); if (LG && LG !== g && !admin()) { location.replace('#sol'); return; } }
    const ansOk = ok(C.ans, g, s), stepsOk = KS !== 'ans' && ok(C.steps, g, s), kidAns = KS === 'ans';
    const SEEN = 'solv_' + key, seen = new Set(store.get(SEEN, []));
    let selfTest = store.get('sol_hide', false), chap = 0, q = '';
    root.innerHTML = '';
    const SUBN = (D.App.catalog && (D.App.catalog.grades[g] || []).find(x => x.id === s) || {}).name || B.book, GN = D.gradeName(g);
    root.append(bar('حلول تمارين ' + SUBN, GN + ' · من كتاب الطالب', 'g' + g + '-' + s,
      el('button', { class: 'pill', title: 'شارك', 'aria-label': 'شارك', text: '📤', onclick: () => share('حلول تمارين كتاب ' + SUBN + ' — ' + GN + ' | المجتهد', 'sol-' + key) })));
    const sec = el('section', { class: 'sol' }); root.append(sec);
    if (admin() && (C.off || []).includes(key)) sec.append(el('div', { class: 'feedback info', text: '👁️ هذا الكتاب مخفي عن المستخدمين (تراه لأنك مدير).' }));
    const nItems = B.ex.reduce((a, e) => a + e.it.length, 0);
    sec.append(el('div', { class: 'sol-hero' }, el('span', { class: 'ic', text: '✍️' }), el('div', {}, el('b', { text: 'كتاب ' + SUBN + ' — ' + GN }),
      el('span', { text: B.ex.length + ' تمريناً · ' + nItems + ' سؤالاً · كل سؤال بالناتج وخطوات الحل' }),
      el('span', { class: 'sv', text: '✓ فتحت ' + B.ex.filter(e => seen.has(e.id)).length + ' من ' + B.ex.length + ' تمريناً' }))));
    // البحث
    const inp = el('input', { type: 'search', class: 'sol-q', placeholder: '🔎 رقم الصفحة، أو التمرين (مثل 1-ب)، أو جزء من المسألة', 'aria-label': 'بحث في الحلول', enterkeyhint: 'search' });
    const chips = el('div', { class: 'sol-ch' });
    const tools = el('div', { class: 'sol-tools' });
    const hideBtn = el('button', { class: 'btn ghost sm', onclick: () => { selfTest = !selfTest; store.set('sol_hide', selfTest); paintHide(); draw(); } });
    const paintHide = () => { hideBtn.textContent = selfTest ? '👁️ أظهر الإجابات' : '🙈 أخفِ الإجابات لأختبر نفسي'; hideBtn.classList.toggle('on', selfTest); };
    paintHide(); tools.append(hideBtn);
    sec.append(el('div', { class: 'sol-sticky' }, inp, chips), tools);
    const chipList = [{ n: 0, t: 'الكل' }, ...B.chapters.filter(c => B.ex.some(e => e.ch === c.n)).map(c => ({ n: c.n, t: (c.ev || !['math', 'sci', 'en'].includes(B.subject)) ? c.t : (B.subject === 'en' ? 'Unit ' : 'الفصل ') + c.n }))];
    const drawChips = () => { chips.innerHTML = ''; chipList.forEach(c => chips.append(el('button', { class: 'sol-c' + (chap === c.n ? ' on' : ''), text: c.t, title: (B.chapters.find(x => x.n === c.n) || {}).t || '', onclick: () => { chap = c.n; q = ''; inp.value = ''; drawChips(); draw(); } }))); };
    drawChips();
    if (kidAns) sec.append(el('div', { class: 'feedback info', text: '📌 ولي أمرك سمح لك برؤية الناتج النهائي فقط، لتتأكد من إجابتك بعد أن تحل بنفسك.' }));
    else if (!ansOk || !stepsOk) {
      const w = !ansOk ? C.ans : C.steps;
      sec.append(el('div', { class: 'cta-soft' }, el('span', { style: 'font-size:1.5rem', text: w === 'subs' ? '⭐' : '🔑' }),
        el('span', { class: 'tx' }, el('b', { text: w === 'subs' ? (ansOk ? 'خطوات الحل للمشتركين' : 'الحلول للمشتركين') : (ansOk ? 'خطوات الحل مجانية لمن عنده حساب' : 'الحلول مجانية لمن عنده حساب') }),
          el('small', { text: w === 'subs' ? 'اشترك لتفتح خطوات حل كل التمارين.' : 'سجّل حساباً مجانياً في دقيقة لتفتحها كلها.' })),
        el('button', { class: 'btn sm', text: w === 'subs' ? 'اشترك' : 'سجّل مجاناً', onclick: () => gate(w) })));
    }
    const list = el('div', { class: 'sol-list' }); sec.append(list);
    let tmr = 0; inp.addEventListener('input', () => { clearTimeout(tmr); tmr = setTimeout(() => { q = inp.value; if (q.trim()) chap = 0; drawChips(); draw(); if (q.trim().length > 1) ev('sol_search', { b: key }); }, 220); });

    // فهرسة للبحث
    const NX = B.ex.map(e => ({ e, lab: lab(e.l), txt: norm(e.l + ' ' + e.ls), its: e.it.map(x => norm((x.i || '') + ' ' + x.q + ' ' + x.a)) }));
    const openSet = new Set();
    // الاختيار من الرابط
    let focus = null;
    if (sel) {
      let mm;
      if ((mm = /^p(\d{1,3})$/.exec(sel))) { q = mm[1]; inp.value = q; }
      else if ((mm = /^l-([a-z0-9-]+)$/.exec(sel))) { const L = IX.lessons[mm[1]]; if (L) { L.ex.forEach(id => openSet.add(id)); focus = L.ex[0]; } }
      else if (B.ex.some(e => e.id === sel)) { openSet.add(sel); focus = sel; }
    }
    ev('sol_book', { b: key, sel: sel || '' });
    draw();
    if (focus) setTimeout(() => { const t = document.getElementById('sx-' + focus); t && t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 80);

    function draw() {
      list.innerHTML = '';
      const qq = q.trim();
      if (!qq) {
        let lastCh = -1;
        B.ex.filter(e => !chap || e.ch === chap).forEach(e => {
          if (e.ch !== lastCh) { lastCh = e.ch; const c = B.chapters.find(x => x.n === e.ch); if (c) list.append(el('h3', { class: 'sol-h', text: (c.ev || B.subject === 'en' || !['math', 'sci'].includes(B.subject) ? '' : 'الفصل ' + c.n + ': ') + c.t })); }
          list.append(exCard(e, openSet.has(e.id)));
        });
        return;
      }
      // رقم صفحة
      const nq = toW(qq).replace(/^(?:ص|صفحة|صفحه)\s*/, '').trim();
      if (/^\d{1,3}$/.test(nq)) {
        const p = +nq, hit = B.ex.filter(e => e.pages.includes(p));
        if (hit.length) { list.append(el('p', { class: 'note', text: 'تمارين صفحة ' + p + ':' })); hit.forEach(e => list.append(exCard(e, true))); }
        if (!hit.length) list.append(el('div', { class: 'empty' }, el('p', { text: 'لا توجد تمارين في صفحة ' + p + '. صفحات التمارين: ' + [...new Set(B.ex.map(e => e.pg))].sort((a, b) => a - b).join('، ') + '.' })));
        return;
      }
      // رقم تمرين مثل 1-ب أو 2 جـ أو "تمرين 5 ط"
      const lq = lab(qq);
      const byLab = NX.filter(x => x.lab === lq);
      if (byLab.length) { byLab.forEach(x => list.append(exCard(x.e, true))); return; }
      // بحث نصي في المسائل
      const toks = norm(qq).split(' ').filter(Boolean);
      const res = [];
      NX.forEach(x => { if (toks.every(t => x.txt.includes(t))) { res.push([x.e, null]); return; }
        x.its.forEach((t, i) => { if (toks.every(k => t.includes(k))) res.push([x.e, i]); }); });
      if (!res.length) { list.append(el('div', { class: 'empty' }, el('span', { class: 'big', text: '🔎' }), el('p', { text: 'لم نجد نتائج. جرّب رقم الصفحة أو رقم التمرين، أو كلمات أقل.' }))); return; }
      list.append(el('p', { class: 'note', text: 'النتائج: ' + res.length + (res.length > 60 ? ' (نعرض أول 60)' : '') }));
      res.slice(0, 60).forEach(([e, i]) => { if (i == null) list.append(exCard(e, false)); else list.append(el('div', { class: 'sol-hit' }, el('button', { class: 'linkbtn', text: e.l + ' · ص ' + e.pg, onclick: () => { q = ''; inp.value = ''; openSet.add(e.id); draw(); setTimeout(() => { const t = document.getElementById('sx-' + e.id); t && t.scrollIntoView({ behavior: 'smooth' }); }, 60); } }), itemCard(e, e.it[i]))); });
    }

    function exCard(e, open) {
      const body = el('div', { class: 'sol-items' });
      const head = el('button', { class: 'sol-exh', 'aria-expanded': String(!!open) },
        el('span', { class: 'pg', html: '<small>ص</small>' + e.pg + (B.ex.some(x => x.b2) ? '<small>' + (e.b2 ? 'ف2' : 'ف1') + '</small>' : '') }),
        el('span', { class: 'tx' }, el('b', { text: e.l }), el('small', { text: e.ls + ' · ' + e.it.length + ' سؤالاً' })),
        el('span', { class: 'st', text: seen.has(e.id) ? '✓' : '' }), el('span', { class: 'ar', text: '▾' }));
      const card = el('div', { class: 'sol-ex' + (open ? ' open' : ''), id: 'sx-' + e.id }, head, body);
      const fill = () => { if (body.childElementCount) return; body.append(exTools(e));
        let lastN = null; e.it.forEach(x => { if (x.i && x.n !== lastN) body.append(el('p', { class: 'sol-instr', dir: LTR ? 'auto' : null, html: fmt(LTR ? x.i : x.n + '- ' + x.i) })); lastN = x.n; body.append(itemCard(e, x, true)); }); };
      if (open) { fill(); mark(e); }
      head.onclick = () => { const o = !card.classList.contains('open'); card.classList.toggle('open', o); head.setAttribute('aria-expanded', String(o)); if (o) { fill(); mark(e); if (o) openSet.add(e.id); } else openSet.delete(e.id); };
      return card;
    }
    function exTools(e) {
      return el('div', { class: 'sol-et' },
        IX.books[key].img ? el('button', { class: 'btn ghost sm', text: '📖 صفحة الكتاب', onclick: () => viewer(e) }) : null,
        e.lid && D.findLesson && D.findLesson(e.lid) ? el('button', { class: 'btn ghost sm', text: '🎓 درس: ' + D.findLesson(e.lid).lesson.title, onclick: () => go('l-' + e.lid) }) : null,
        el('button', { class: 'btn ghost sm', text: '📤 شارك', onclick: () => share('حل ' + e.l + ' — ' + SUBN + ' ' + GN + ' (ص ' + e.pg + ')', 'sol-' + key + '~' + e.id) }));
    }
    function mark(e) { if (!seen.has(e.id)) { seen.add(e.id); store.set(SEEN, [...seen]); } ev('sol_ex', { b: key, e: e.id }); }

    function itemCard(e, x, inEx) {
      const c = el('div', { class: 'sol-it' });
      c.append(el('div', { class: 'qh' }, el('span', { class: 'qn', text: LTR ? (String(x.n) + (x.p ? ' ' + x.p : '')) : (x.p ? x.p : 'س ' + x.n) }),
        !inEx && x.i ? el('small', { class: 'note', html: fmt(x.i) }) : null),
        el('div', { class: 'qq', dir: LTR ? 'auto' : null, html: fmt(x.q) }));
      if (x.f) c.append(el('div', { class: 'sol-fig' }, '📐 هذا السؤال يعتمد على شكل في كتابك صفحة ' + e.pg + (e.b2 ? ' (الفصل الثاني)' : '') + ' ', IX.books[key].img ? el('button', { class: 'linkbtn', text: 'اعرض الصفحة', onclick: () => viewer(e) }) : null));
      // الإجابة
      const ans = el('div', { class: 'sol-a' }, el('span', { class: 'l', text: x.k === 'construction' ? '📏 الإنشاء:' : x.k === 'drawing' ? '📊 الرسم:' : '✅ الإجابة:' }), el('span', { class: 'v', dir: LTR ? 'auto' : null, html: fmt(x.a) }));
      if (!ansOk) c.append(lockBtn(C.ans, 'لعرض الإجابة'));
      else if (selfTest) { const b = el('button', { class: 'btn ghost sm sol-rev', text: '👁️ أظهر الإجابة', onclick: () => { b.replaceWith(ans); } }); c.append(b); }
      else c.append(ans);
      // الخطوات
      const stp = el('div', { class: 'sol-steps', hidden: true });
      const sb = el('button', { class: 'btn sm sol-sb', text: '📝 خطوات الحل', onclick: () => {
        if (kidAns) return;
        if (!stepsOk) { gate(need(C.steps)); return; }
        if (!stp.childElementCount) {
          const ol = el('ol');
          x.s.forEach(([t, n]) => ol.append(el('li', {}, el('div', { class: 't', html: fmt(t) }), n ? el('div', { class: 'n', text: n }) : null)));
          stp.append(ol);
          if (x.c) stp.append(el('div', { class: 'sol-chk', html: '🔍 <b>التحقق:</b> ' + fmt(x.c) }));
          if (x.k === 'construction' || x.k === 'drawing') stp.append(el('p', { class: 'note', text: 'نفّذ الرسم في دفترك بالأدوات المطلوبة، ثم قارن بالشكل في كتابك.' }));
          ev('sol_steps', { b: key, e: e.id });
        }
        stp.hidden = !stp.hidden; sb.textContent = stp.hidden ? '📝 خطوات الحل' : '▴ إخفاء الخطوات'; } });
      if (kidAns || !(x.s && x.s.length)) sb.hidden = true;
      else if (!stepsOk) sb.textContent = (C.steps === 'subs' ? '⭐ ' : '🔑 ') + 'خطوات الحل';
      c.append(sb, stp);
      if (x.nt) c.append(el('div', { class: 'sol-nt', text: 'ℹ️ ' + x.nt }));
      if (x.bk) c.append(el('div', { class: 'sol-nt', text: '📕 في مفتاح إجابات الكتاب: ' + x.bk }));
      return c;
    }
    function lockBtn(mode, why) { return el('button', { class: 'btn ghost sm', text: (mode === 'subs' ? '⭐ اشترك ' : '🔑 سجّل مجاناً ') + why, onclick: () => gate(need(mode)) }); }
    function gate(w) { D.App.after = location.hash.replace(/^#/, ''); ev('sol_gate', { b: key, w }); go(w === 'subs' ? (D.registered() ? 'subscribe' : 'login') : 'login'); }

    // عارض صفحات الكتاب
    function viewer(e) {
      let i = 0; const ps = e.pages;
      const img = el('img', { alt: 'صفحة من الكتاب', loading: 'eager', title: 'اضغط للتكبير', onclick: () => img.classList.toggle('z') });
      const cap = el('b'), prev = el('button', { class: 'btn ghost sm', text: '→ السابقة' }), next = el('button', { class: 'btn ghost sm', text: 'التالية ←' });
      const show = () => { img.src = 'data/sol/img/' + key + '/' + (e.b2 ? 'q' : 'p') + String(ps[i]).padStart(3, '0') + '.webp'; cap.textContent = 'صفحة ' + ps[i] + (e.b2 ? ' — الفصل الثاني' : ''); prev.disabled = i === 0; next.disabled = i === ps.length - 1; };
      prev.onclick = () => { if (i > 0) { i--; show(); } }; next.onclick = () => { if (i < ps.length - 1) { i++; show(); } };
      const close = () => { ov.remove(); document.removeEventListener('keydown', kd); };
      const kd = k => { if (k.key === 'Escape') close(); };
      const ov = el('div', { class: 'sol-ov', onclick: z => { if (z.target === ov) close(); } },
        el('div', { class: 'sol-vw' }, el('div', { class: 'hd' }, cap, el('span', { class: 'note', text: e.l + ' · اضغط الصورة للتكبير' }), el('button', { class: 'pill', text: '✕', 'aria-label': 'إغلاق', onclick: close })),
          el('div', { class: 'im' }, img), el('div', { class: 'ft' }, prev, next)));
      document.addEventListener('keydown', kd); document.body.append(ov); show(); ev('sol_page', { b: key, e: e.id });
    }
  }

  function toast(t) { const x = el('div', { class: 'sol-toast', text: t }); document.body.append(x); setTimeout(() => x.remove(), 1800); }
  function share(t, hash) {
    const url = location.origin + location.pathname + '#' + hash;
    if (navigator.share) navigator.share({ title: t, text: t, url }).catch(() => {});
    else { try { navigator.clipboard.writeText(t + '\n' + url).then(() => toast('✓ تم نسخ الرابط')); } catch (e) { prompt('انسخ الرابط', url); } }
  }
}

// ---------- أدوات ----------
const AD = '٠١٢٣٤٥٦٧٨٩';
const toW = s => String(s).replace(/[٠-٩]/g, c => AD.indexOf(c));
function norm(s) {
  return toW(s).toLowerCase().replace(/[ً-ْـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/ـ/g, '')
    .replace(/[−–—]/g, '-').replace(/[×x*]/g, '×').replace(/\s+/g, ' ').trim();
}
// "تمرين 1-ب" ، "1 ب" ، "1ب" ، "تمرين 5 ط" → "1ب"
function lab(s) { return norm(s).replace(/^(تمرين|تمارين|حل)\s*/, '').replace(/[\s\-_.()]/g, '').replace(/جـ|ج/g, 'ج'); }
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// يعرض الكسور عمودياً: 3/4 والعدد الكسري 2 1/9
function fmt(s) {
  let h = esc(s);
  const fr = (a, b) => '<span class="fr"><i>' + a + '</i><i>' + b + '</i></span>';
  h = h.replace(/(^|[^\d./])(\d+) (\d+)\/(\d+)(?![\d./])/g, (m0, p, w, a, b) => p + '<bdi class="mx" dir="ltr">' + w + fr(a, b) + '</bdi>');
  h = h.replace(/(^|[^\d./])(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)(?![\d./])/g, (m0, p, a, b) => p + '<bdi class="mx" dir="ltr">' + fr(a, b) + '</bdi>');
  return h;
}

const CSS = `.sol{display:flex;flex-direction:column;gap:12px;padding-bottom:40px}
.sol-hero{display:flex;gap:12px;align-items:center;background:linear-gradient(135deg,#fff1d6,#ffe2a6);border-radius:22px;padding:14px 16px;border:2px solid #ffcf70}
.sol-hero .ic{font-size:2.4rem}.sol-hero b{display:block;font-family:var(--f-display);font-size:1.15rem}.sol-hero span{display:block;color:#6b5320;font-size:.9rem;line-height:1.7}.sol-hero .sv{color:#2b7a3d;font-weight:700}
.sol-bk{display:flex;align-items:center;gap:12px;width:100%;text-align:start;border:2px solid var(--line);background:var(--card);border-radius:20px;padding:14px;font:inherit;color:inherit;cursor:pointer}
.sol-bk .ic{font-size:2rem}.sol-bk .tx{flex:1;display:flex;flex-direction:column}.sol-bk small{color:var(--muted)}.sol-bk .go{font-size:1.3rem;color:var(--sea)}
.sol-sticky{position:sticky;top:0;z-index:5;background:var(--paper,#f6f8fc);padding:6px 0;display:flex;flex-direction:column;gap:8px}
.sol-q{width:100%;font:inherit;font-size:1rem;padding:12px 14px;border-radius:16px;border:2px solid #ffcf70;background:#fff;outline:none}.sol-q:focus{border-color:#f0a400;box-shadow:0 0 0 4px #ffcf7044}
.sol-ch{display:flex;gap:6px;overflow-x:auto;padding-bottom:2px;scrollbar-width:none}.sol-c{flex:none;border:1.5px solid var(--line);background:var(--card);border-radius:99px;padding:6px 12px;font:inherit;font-size:.85rem;cursor:pointer;color:inherit}
.sol-c.on{background:#ffcf70;border-color:#f0a400;font-weight:700}
.sol-tools{display:flex;justify-content:flex-end}.sol-tools .on{background:#fff1d6}
.sol-h{margin:10px 2px 0;font-family:var(--f-display);font-size:1.05rem;color:#8a5a00}
.sol-ex{background:var(--card);border:2px solid var(--line);border-radius:20px;overflow:hidden;scroll-margin-top:110px}.sol-ex.open{border-color:#ffcf70}
.sol-exh{display:flex;align-items:center;gap:12px;width:100%;border:0;background:none;padding:12px 14px;font:inherit;color:inherit;cursor:pointer;text-align:start}
.sol-exh .pg{flex:none;width:52px;height:52px;border-radius:16px;background:#fff1d6;display:flex;flex-direction:column;align-items:center;justify-content:center;font-weight:800;font-size:1.1rem;line-height:1}.sol-exh .pg small{font-size:.65rem;font-weight:400;color:#8a5a00}
.sol-exh .tx{flex:1;display:flex;flex-direction:column}.sol-exh .tx b{font-family:var(--f-display)}.sol-exh .tx small{color:var(--muted);font-size:.8rem}
.sol-exh .st{color:#2b7a3d;font-weight:800}.sol-exh .ar{transition:transform .2s;color:var(--muted)}.sol-ex.open .ar{transform:rotate(180deg)}
.sol-items{display:none;padding:0 12px 14px;flex-direction:column;gap:10px}.sol-ex.open .sol-items{display:flex}
.sol-et{display:flex;gap:6px;flex-wrap:wrap}
.sol-instr{margin:6px 2px 0;font-weight:700;color:#8a5a00}
.sol-it{border:1.5px solid var(--line);border-radius:16px;padding:10px 12px;display:flex;flex-direction:column;gap:8px;background:#fffdf7}
.sol-it .qh{display:flex;gap:8px;align-items:baseline;flex-wrap:wrap}.sol-it .qn{background:#2f6fed;color:#fff;border-radius:99px;padding:0 10px;font-size:.85rem;font-weight:700}
.sol-it .qq{font-size:1.08rem;line-height:2;font-weight:600;white-space:pre-line}
.sol-a{background:#e9f8ef;border:1.5px solid #9fdcb4;border-radius:12px;padding:6px 10px;display:flex;gap:8px;align-items:baseline;flex-wrap:wrap}.sol-a .l{color:#2b7a3d;font-weight:700}.sol-a .v{font-weight:700;font-size:1.05rem}
.sol-sb{align-self:flex-start}
.sol-steps{border-inline-start:4px solid #ffcf70;padding-inline-start:10px}.sol-steps ol{margin:0;padding-inline-start:22px;display:flex;flex-direction:column;gap:6px}
.sol-steps li::marker{font-weight:800;color:#f0a400}.sol-steps .t{font-weight:700;font-size:1.05rem;line-height:2}.sol-steps .n{color:var(--muted);font-size:.85rem}
.sol-chk{margin-top:8px;background:#eef4ff;border-radius:10px;padding:6px 10px;font-size:.92rem;line-height:1.9}
.sol-fig{background:#fff6e0;border-radius:10px;padding:6px 10px;font-size:.88rem}
.sol-nt{font-size:.85rem;color:#7a5a12;background:#fff8e6;border-radius:10px;padding:6px 10px}
.sol-hit{display:flex;flex-direction:column;gap:4px}
.fr{display:inline-flex;flex-direction:column;vertical-align:middle;text-align:center;font-size:.82em;line-height:1.15;margin:0 2px}.fr i{font-style:normal;padding:0 2px}.fr i:first-child{border-bottom:1.5px solid currentColor}
.sol-toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#15314d;color:#fff;border-radius:99px;padding:8px 18px;z-index:1100}
.mx{display:inline-flex;align-items:center;gap:1px;unicode-bidi:isolate}
.sol-ov{position:fixed;inset:0;background:#0b1a33cc;z-index:1000;display:flex;align-items:center;justify-content:center;padding:10px}
.sol-vw{background:#fff;border-radius:18px;max-width:760px;width:100%;max-height:96vh;display:flex;flex-direction:column;overflow:hidden}
.sol-vw .hd{display:flex;align-items:center;gap:10px;padding:8px 12px;border-bottom:1px solid var(--line)}.sol-vw .hd .note{flex:1}
.sol-vw .im{overflow:auto;flex:1;background:#f3f3f3}.sol-vw .im img{width:100%;display:block;cursor:zoom-in}.sol-vw .im img.z{width:200%;max-width:none;cursor:zoom-out}
.sol-vw .ft{display:flex;justify-content:space-between;padding:8px 12px;border-top:1px solid var(--line)}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .sol-hero{background:linear-gradient(135deg,#3a2e10,#2a2208);border-color:#6b5320}:root:not([data-theme="light"]) .sol-hero span{color:#e9d6a8}:root:not([data-theme="light"]) .sol-it{background:var(--card)}:root:not([data-theme="light"]) .sol-exh .pg,:root:not([data-theme="light"]) .sol-tools .on{background:#3a2e10}:root:not([data-theme="light"]) .sol-exh .pg small,:root:not([data-theme="light"]) .sol-instr,:root:not([data-theme="light"]) .sol-h{color:#ffcf70}:root:not([data-theme="light"]) .sol-a{background:#123a22;border-color:#2b7a3d}:root:not([data-theme="light"]) .sol-a .l,:root:not([data-theme="light"]) .sol-hero .sv,:root:not([data-theme="light"]) .sol-exh .st{color:#7ddb97}:root:not([data-theme="light"]) .sol-chk{background:#16284a}:root:not([data-theme="light"]) .sol-nt,:root:not([data-theme="light"]) .sol-fig{background:#3a2e10;color:#ffe2a6}:root:not([data-theme="light"]) .sol-q{background:var(--card);color:inherit}:root:not([data-theme="light"]) .sol-c.on{color:#3a2600}:root:not([data-theme="light"]) .sol-vw{background:var(--card)}}
:root[data-theme="dark"] .sol-hero{background:linear-gradient(135deg,#3a2e10,#2a2208);border-color:#6b5320}:root[data-theme="dark"] .sol-hero span{color:#e9d6a8}:root[data-theme="dark"] .sol-it{background:var(--card)}:root[data-theme="dark"] .sol-exh .pg,:root[data-theme="dark"] .sol-tools .on{background:#3a2e10}:root[data-theme="dark"] .sol-exh .pg small,:root[data-theme="dark"] .sol-instr,:root[data-theme="dark"] .sol-h{color:#ffcf70}:root[data-theme="dark"] .sol-a{background:#123a22;border-color:#2b7a3d}:root[data-theme="dark"] .sol-a .l,:root[data-theme="dark"] .sol-hero .sv,:root[data-theme="dark"] .sol-exh .st{color:#7ddb97}:root[data-theme="dark"] .sol-chk{background:#16284a}:root[data-theme="dark"] .sol-nt,:root[data-theme="dark"] .sol-fig{background:#3a2e10;color:#ffe2a6}:root[data-theme="dark"] .sol-q{background:var(--card);color:inherit}:root[data-theme="dark"] .sol-c.on{color:#3a2600}:root[data-theme="dark"] .sol-vw{background:var(--card)}`;
