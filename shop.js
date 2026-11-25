/* ===== 📦 مكتبة المعلم: شراء مواد الدروس (باوربوينت، عرض، عرض بالصوت، وورد، PDF...) وتنزيلها =====
   السعر من الخادم فقط (quote)، والدفع ماي باي، والتنزيل بعدد محدد لكل ملف حتى تاريخ الصلاحية. */
export default async function shopPage(X) {
  const { page, el, call, fbk, fnErr, go, ACC } = X;
  const s = page('📦 مكتبة المعلم', 'دروس جاهزة للفصل: عروض باوربوينت، عرض بالصوت، وورد، PDF، وحل التمارين', 'home');
  const msg = el('div'); s.append(msg);
  if (!ACC.user) { fbk(msg, 'info', 'سجّل الدخول بحساب المعلم أولاً.'); s.append(el('button', { class: 'btn sun', text: 'تسجيل الدخول', onclick: () => go('login') })); return; }
  fbk(msg, 'info', '⏳ جارٍ التحميل…');
  let C, M;
  try { [C, M] = await Promise.all([call('matShop', { op: 'cfg' }), call('matShop', { op: 'mine' }).catch(() => ({ grants: [] }))]); msg.innerHTML = ''; }
  catch (e) { fbk(msg, 'bad', fnErr(e)); return; }
  const TN = C.typeNames || M.typeNames || {};
  const fmtD = t => new Date(t).toLocaleDateString('ar-LY-u-nu-latn', { day: 'numeric', month: 'long', year: 'numeric' });
  const mb = b => (b / 1048576).toFixed(1) + ' م.ب';

  /* ---------- مشترياتي ---------- */
  const mine = el('div', { class: 'stack', style: 'gap:10px' });
  if ((M.grants || []).length) {
    s.append(el('h3', { text: '📚 مشترياتي' }), mine);
    M.grants.forEach(g => {
      const expired = g.until < Date.now();
      const card = el('div', { class: 'kx-card', style: 'display:flex;flex-direction:column;gap:6px' },
        el('b', { text: (g.offer || 'باقة') + ' — ' + g.lines.map(l => l.label).join('، ') }),
        el('small', { class: 'note', text: (expired ? '⛔ انتهت الصلاحية ' : '✅ صالحة حتى ') + fmtD(g.until) + ' · التنزيل: ' + g.downloads + ' مرات لكل ملف' }));
      g.mats.forEach(m => {
        const det = el('details', {}, el('summary', { text: '📁 ' + (m.subject_name || m.subject) + ' — ' + (m.grade_name || m.grade) + ' (' + m.lessons.length + ' درس)' }));
        m.lessons.forEach(l => det.append(el('div', { style: 'border-top:1px dashed var(--line);padding:6px 0;display:flex;flex-direction:column;gap:4px' },
          el('span', { text: l.order + '. ' + l.title }),
          el('div', { class: 'row', style: 'gap:4px;flex-wrap:wrap' }, ...l.files.map(f => {
            const b = el('button', { class: 'btn ghost sm', disabled: expired || !f.left ? '' : null, title: mb(f.size), text: '⬇ ' + (TN[f.type] || f.type) + ' (' + f.left + ')',
              onclick: async () => { b.disabled = true; try { const r = await call('matShop', { op: 'url', grant: g.id, key: f.key }); f.left = r.left; b.textContent = '⬇ ' + (TN[f.type] || f.type) + ' (' + r.left + ')'; location.href = r.url; }
                catch (e) { fbk(msg, 'bad', fnErr(e)); } b.disabled = !f.left; } });
            return b; })))));
        card.append(det);
      });
      mine.append(card);
    });
  }

  /* ---------- الشراء ---------- */
  if (!C.on && !ACC.isAdmin) { if (!(M.grants || []).length) fbk(msg, 'info', 'متجر المواد سيُفتح قريباً بإذن الله.'); return; }
  const grades = []; (C.catalog || []).forEach(m => { if (!grades.find(x => x.g === m.grade)) grades.push({ g: m.grade, name: m.grade_name || m.grade }); });
  const order = g => (/^\d+$/.test(g) ? +g : g === 'k' ? 0 : 20 + (+g.replace(/\D/g, '') || 0));
  grades.sort((a, b) => order(a.g) - order(b.g));
  const buy = el('div', { class: 'kx-card', style: 'display:flex;flex-direction:column;gap:10px' });
  s.append(el('h3', { text: '🛒 اشترِ مواد جديدة' }), buy);
  if (!grades.length) { buy.append(el('span', { class: 'note', text: 'لا توجد مواد معروضة بعد.' })); return; }
  const offers = C.offers || [];
  let offer = (offers[0] || {}).id, sel = {}; // sel: {grade: Set(subjects) | '*'}
  const ofBox = el('div', { class: 'stack', style: 'gap:6px' });
  const drawOffers = () => { ofBox.innerHTML = ''; offers.forEach(o => ofBox.append(el('label', { class: 'sndrow', style: 'margin:0;cursor:pointer' },
    el('input', { type: 'radio', name: 'mofr', checked: o.id === offer ? '' : null, onchange: () => { offer = o.id; requote(); } }),
    el('span', {}, el('b', { text: o.name + (o.plus ? (o.plus > 0 ? ' (+' + o.plus + ' د.ل)' : ' (' + o.plus + ' د.ل)') : '') }),
      el('small', { class: 'note', text: ' — ' + (o.desc || (o.types || []).map(t => TN[t] || t).join('، ')) + ' · ' + o.downloads + ' تنزيلات لكل ملف · صالحة حتى ' + fmtD(o.until + 'T12:00:00') }))))); };
  if (offers.length > 1) buy.append(el('b', { text: '1) اختر الباقة' }), ofBox);
  drawOffers();
  /* الأسعار المعلنة */
  buy.append(el('div', { class: 'feedback info', style: 'margin:0' }, ...C.groups.filter(g => g.grades.some(x => grades.find(y => y.g === x))).map(g => el('div', { text: '• ' + g.name + ': المادة ' + g.subj + ' د.ل — الصف كاملاً ' + g.full + ' د.ل' })),
    el('div', { text: '• كل مادة أو صف إضافي يُخصم منه ' + C.step + ' د.ل، وإذا بلغت المواد سعر الصف يُفتح لك الصف كاملاً.' })));
  const gBox = el('div', { class: 'stack', style: 'gap:8px' });
  buy.append(el('b', { text: (offers.length > 1 ? '2' : '1') + ') اختر الصفوف والمواد' }), gBox);
  const drawGrades = () => { gBox.innerHTML = '';
    gBox.append(el('div', { class: 'row', style: 'gap:6px;flex-wrap:wrap' }, ...grades.map(g => el('button', { class: 'btn sm ' + (sel[g.g] ? '' : 'ghost'), text: (sel[g.g] ? '✓ ' : '') + g.name,
      onclick: () => { if (sel[g.g]) delete sel[g.g]; else sel[g.g] = new Set(); drawGrades(); requote(); } }))));
    Object.keys(sel).forEach(g => { const subs = (C.catalog || []).filter(m => m.grade === g); const gn = (grades.find(x => x.g === g) || {}).name || g;
      const box = el('div', { style: 'border:1px solid var(--line);border-radius:12px;padding:8px;display:flex;flex-direction:column;gap:4px' }, el('b', { text: gn }));
      box.append(el('label', { class: 'row', style: 'gap:6px;align-items:center' }, el('input', { type: 'checkbox', checked: sel[g] === '*' ? '' : null, onchange: e => { sel[g] = e.target.checked ? '*' : new Set(); drawGrades(); requote(); } }), el('b', { text: 'الصف كاملاً (كل المواد)' })));
      if (sel[g] !== '*') subs.forEach(m => box.append(el('label', { class: 'row', style: 'gap:6px;align-items:center' },
        el('input', { type: 'checkbox', checked: sel[g].has(m.subject) ? '' : null, onchange: e => { e.target.checked ? sel[g].add(m.subject) : sel[g].delete(m.subject); requote(); } }),
        el('span', { text: (m.subject_name || m.subject) + ' (' + m.lessons + ' درس)' }))));
      gBox.append(box); }); };
  drawGrades();
  const qBox = el('div'), payBtn = el('button', { class: 'btn sun', disabled: '', text: '💳 ادفع عبر ماي باي' });
  buy.append(qBox, payBtn, el('small', { class: 'note', text: 'الملفات بأسماء الدروس وجاهزة للعرض في الفصل. للدفع نقداً أو بتحويل تواصل معنا ونفعّل لك الطلب.' }));
  const items = () => Object.keys(sel).map(g => ({ g, s: sel[g] === '*' ? ['*'] : [...sel[g]] })).filter(x => x.s.length);
  let qt = 0, last = null;
  async function requote() { const my = ++qt; const it = items(); payBtn.disabled = true; qBox.innerHTML = '';
    if (!it.length) { qBox.append(el('span', { class: 'note', text: 'اختر صفاً ومادة على الأقل.' })); return; }
    try { const q = await call('matShop', { op: 'quote', offer, items: it }); if (my !== qt) return; last = q;
      qBox.append(el('div', { class: 'feedback ok', style: 'margin:0;display:flex;flex-direction:column;gap:3px' },
        ...q.lines.map(l => el('span', { text: '• ' + l.label + ': ' + l.cost + ' د.ل' + (l.upgraded ? ' ← فُتح لك الصف كاملاً بنفس السعر 🎁' : '') })),
        q.gradeDisc ? el('span', { text: '• خصم الصفوف المتعددة: −' + q.gradeDisc + ' د.ل' }) : null,
        q.plus ? el('span', { text: '• فرق الباقة: ' + (q.plus > 0 ? '+' : '') + q.plus + ' د.ل' }) : null,
        el('b', { style: 'font-size:1.15rem', text: 'المجموع: ' + q.total + ' د.ل' })));
      payBtn.disabled = false; payBtn.textContent = '💳 ادفع ' + q.total + ' د.ل عبر ماي باي'; }
    catch (e) { if (my === qt) fbk(qBox, 'bad', fnErr(e)); } }
  payBtn.onclick = async () => { payBtn.disabled = true; fbk(msg, 'info', '⏳ جارٍ تجهيز الدفع…');
    try { const r = await call('matShop', { op: 'buy', offer, items: items() }); location.href = r.url; }
    catch (e) { fbk(msg, 'bad', fnErr(e)); payBtn.disabled = false; } };
  requote();
}
