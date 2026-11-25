/* ===== لوحة الإدارة: 🛒 بيع المواد للمعلمين — الأسعار، الخصم، الباقات (حتى 5)، الصلاحية والتنزيلات، منح يدوي، المبيعات ===== */
export default async function shopAdmin(X, host) {
  const { el, call, fbk, fnErr } = X;
  const msg = el('div'); host.append(msg); fbk(msg, 'info', '⏳ جارٍ التحميل…');
  let R; try { R = await call('adminMat', { op: 'shopGet' }); msg.innerHTML = ''; } catch (e) { fbk(msg, 'bad', fnErr(e)); return; }
  const C = R.cfg, TN = R.typeNames || {}, TYPES = Object.keys(TN);
  const fmtD = t => new Date(t).toLocaleDateString('ar-LY-u-nu-latn', { day: 'numeric', month: 'short', year: 'numeric' });
  const inp = (v, o = {}) => el('input', { value: v == null ? '' : v, style: 'width:' + (o.w || '90px'), type: o.type || 'text', placeholder: o.ph || '', dir: o.dir || null });
  const lab = (t, x) => el('label', { class: 'row', style: 'gap:6px;align-items:center;flex-wrap:wrap' }, el('span', { text: t }), x);

  /* ---- عام ---- */
  const on = el('input', { type: 'checkbox', checked: C.on ? '' : null });
  const who = el('select', {}, el('option', { value: 'teachers', text: 'المعلمون فقط' }), el('option', { value: 'all', text: 'كل المستخدمين المسجلين' })); who.value = C.who;
  const step = inp(C.step, { type: 'number', w: '70px' }), dls = inp(C.downloads, { type: 'number', w: '70px' }), until = inp(C.until, { type: 'date', w: '150px' });
  host.append(el('label', { class: 'sndrow' }, on, el('span', {}, el('b', { text: 'فتح المتجر للمعلمين' }), el('small', { class: 'note', text: 'يظهر لهم «📦 مكتبة المعلم» في حسابهم. المواد المعروضة هي التي حالتها «للمشتركين» أو «للجميع».' }))),
    lab('من يشتري:', who), lab('الخصم لكل مادة/صف إضافي (د.ل):', step), lab('عدد مرات التنزيل لكل ملف (افتراضي):', dls), lab('الصلاحية حتى (افتراضي):', until));

  /* ---- الأسعار ---- */
  const gBox = el('div', { class: 'stack', style: 'gap:6px' });
  const G = C.groups.map(g => ({ ...g }));
  const drawG = () => { gBox.innerHTML = ''; G.forEach((g, i) => { const n = inp(g.name, { w: '120px' }), gs = inp(g.grades.join(','), { w: '140px', dir: 'ltr' }), su = inp(g.subj, { type: 'number', w: '70px' }), fu = inp(g.full, { type: 'number', w: '70px' });
    [n, gs, su, fu].forEach(x => x.oninput = () => { g.name = n.value; g.grades = gs.value.split(/[,،\s]+/).filter(Boolean); g.subj = +su.value; g.full = +fu.value; });
    gBox.append(el('div', { class: 'row', style: 'gap:6px;flex-wrap:wrap;align-items:center;border-bottom:1px dashed var(--line);padding-bottom:6px' }, n, el('small', { text: 'الصفوف:' }), gs, el('small', { text: 'المادة:' }), su, el('small', { text: 'الصف كاملاً:' }), fu,
      el('button', { class: 'linkbtn', text: '✕', onclick: () => { G.splice(i, 1); drawG(); } }))); });
    gBox.append(el('button', { class: 'btn ghost sm', text: '+ مجموعة أسعار', onclick: () => { G.push({ name: 'مجموعة', grades: [], subj: 15, full: 60 }); drawG(); } })); };
  drawG();
  host.append(el('b', { text: '💰 الأسعار (د.ل) — رموز الصفوف: 1..9 ، s1 s2 s3 للثانوي، k للروضة' }), gBox);

  /* ---- الباقات ---- */
  const oBox = el('div', { class: 'stack', style: 'gap:8px' });
  const O = C.offers.map(o => ({ ...o, types: [...o.types] }));
  const drawO = () => { oBox.innerHTML = ''; O.forEach((o, i) => {
    const on = el('input', { type: 'checkbox', checked: o.on ? '' : null, onchange: e => o.on = e.target.checked });
    const nm = inp(o.name, { w: '160px' }), ds = inp(o.desc, { w: '100%', ph: 'وصف يظهر للمعلم (اختياري)' }), pl = inp(o.plus, { type: 'number', w: '70px' }), dl = inp(o.downloads, { type: 'number', w: '70px', ph: C.downloads }), un = inp(o.until, { type: 'date', w: '150px' });
    nm.oninput = () => o.name = nm.value; ds.oninput = () => o.desc = ds.value; pl.oninput = () => o.plus = +pl.value || 0; dl.oninput = () => o.downloads = dl.value ? +dl.value : null; un.oninput = () => o.until = un.value || null;
    oBox.append(el('div', { style: 'border:1px solid var(--line);border-radius:12px;padding:8px;display:flex;flex-direction:column;gap:6px' },
      el('div', { class: 'row', style: 'gap:6px;align-items:center;flex-wrap:wrap' }, on, nm, el('small', { text: 'فرق السعر ±:' }), pl, el('button', { class: 'linkbtn', text: '🗑️ حذف', onclick: () => { O.splice(i, 1); drawO(); } })), ds,
      el('div', { class: 'row', style: 'gap:6px;flex-wrap:wrap' }, ...TYPES.map(t => el('label', { class: 'row', style: 'gap:3px;align-items:center;border:1px solid var(--line);border-radius:10px;padding:2px 6px' },
        el('input', { type: 'checkbox', checked: o.types.includes(t) ? '' : null, onchange: e => { e.target.checked ? o.types.push(t) : o.types.splice(o.types.indexOf(t), 1); } }), el('small', { text: TN[t] })))),
      el('div', { class: 'row', style: 'gap:6px;align-items:center;flex-wrap:wrap' }, el('small', { text: 'التنزيلات لكل ملف:' }), dl, el('small', { text: 'الصلاحية حتى:' }), un, el('small', { class: 'note', text: '(فارغ = الافتراضي)' })))); });
    if (O.length < 5) oBox.append(el('button', { class: 'btn ghost sm', text: '+ باقة جديدة (حتى 5)', onclick: () => { O.push({ id: 'o' + Date.now().toString(36).slice(-5), name: 'باقة جديدة', desc: '', types: ['pptx', 'ppsx'], plus: 0, downloads: null, until: null, on: true }); drawO(); } })); };
  drawO();
  host.append(el('b', { text: '🎁 الباقات/العروض (الصيغ المفتوحة في كل باقة)' }), oBox);
  const sm = el('div');
  host.append(el('button', { class: 'btn sun', text: '💾 حفظ إعداد المتجر', onclick: async e => { e.target.disabled = true;
    try { const r = await call('adminMat', { op: 'shopSet', cfg: { on: on.checked, who: who.value, step: +step.value, downloads: +dls.value, until: until.value, groups: G, offers: O } }); Object.assign(C, r.cfg); fbk(sm, 'ok', '✓ حُفظ.'); }
    catch (x) { fbk(sm, 'bad', fnErr(x)); } e.target.disabled = false; } }), sm, el('hr'));

  /* ---- منح يدوي (دفع نقدي/تحويل) ---- */
  const gm = el('div'), q = inp('', { w: '200px', ph: 'رقم الهاتف أو البريد', dir: 'ltr' }), found = el('div');
  let target = null;
  const grades = [...new Set((R.catalog || []).map(m => m.grade))];
  const gSel = el('select', {}, ...grades.map(g => el('option', { value: g, text: ((R.catalog.find(m => m.grade === g) || {}).grade_name || g) })));
  const sBox = el('div', { class: 'row', style: 'gap:6px;flex-wrap:wrap' }); const picks = {};
  const drawS = () => { sBox.innerHTML = ''; const g = gSel.value; picks[g] = picks[g] || new Set();
    sBox.append(el('label', {}, el('input', { type: 'checkbox', checked: picks[g].has('*') ? '' : null, onchange: e => { e.target.checked ? picks[g].add('*') : picks[g].delete('*'); } }), el('b', { text: ' الصف كاملاً' })),
      ...(R.catalog || []).filter(m => m.grade === g).map(m => el('label', {}, el('input', { type: 'checkbox', checked: picks[g].has(m.subject) ? '' : null, onchange: e => { e.target.checked ? picks[g].add(m.subject) : picks[g].delete(m.subject); } }), el('span', { text: ' ' + (m.subject_name || m.subject) })))); };
  gSel.onchange = drawS; drawS();
  const oSel = el('select', {}, ...C.offers.map(o => el('option', { value: o.id, text: o.name })));
  const gu = inp('', { type: 'date', w: '150px' }), gd = inp('', { type: 'number', w: '70px', ph: 'افتراضي' }), ga = inp('', { type: 'number', w: '80px', ph: '0' }), gn = inp('', { w: '200px', ph: 'ملاحظة (نقداً، تحويل…)' });
  host.append(el('b', { text: '✋ منح يدوي (لمن دفع نقداً أو بتحويل)' }),
    el('div', { class: 'row', style: 'gap:6px' }, q, el('button', { class: 'btn sm', text: 'بحث', onclick: async () => { found.innerHTML = ''; target = null;
      try { const r = await call('adminFindUser', { q: q.value.trim() }); if (!r.users.length) { fbk(found, 'info', 'لا يوجد حساب.'); return; }
        r.users.forEach(u => found.append(el('label', { class: 'row', style: 'gap:6px' }, el('input', { type: 'radio', name: 'mgu', onchange: () => target = u.uid }), el('span', { text: (u.name || '—') + ' · ' + (u.phone || u.email || '') })))); }
      catch (e) { fbk(found, 'bad', fnErr(e)); } } })), found,
    lab('الباقة:', oSel), lab('الصف:', gSel), sBox,
    el('div', { class: 'row', style: 'gap:6px;flex-wrap:wrap;align-items:center' }, el('small', { text: 'حتى:' }), gu, el('small', { text: 'التنزيلات:' }), gd, el('small', { text: 'المبلغ المدفوع:' }), ga, gn),
    el('button', { class: 'btn', text: '✅ امنح المواد', onclick: async e => { if (!target) { fbk(gm, 'bad', 'اختر المستخدم أولاً'); return; }
      const items = Object.keys(picks).map(g => ({ g, s: [...picks[g]] })).filter(x => x.s.length); if (!items.length) { fbk(gm, 'bad', 'اختر مادة أو صفاً'); return; }
      e.target.disabled = true; try { const r = await call('adminMat', { op: 'grantMat', uid: target, offer: oSel.value, items, until: gu.value, downloads: +gd.value || 0, amount: +ga.value || 0, note: gn.value });
        fbk(gm, 'ok', '✓ مُنح. (السعر حسب الجدول: ' + r.total + ' د.ل)'); loadList(); } catch (x) { fbk(gm, 'bad', fnErr(x)); } e.target.disabled = false; } }), gm, el('hr'));

  /* ---- المبيعات ---- */
  const list = el('div', { class: 'stack', style: 'gap:6px' });
  host.append(el('b', { text: '🧾 آخر المبيعات' }), list);
  const draw = gs => { list.innerHTML = ''; if (!gs.length) { list.append(el('span', { class: 'note', text: 'لا توجد مبيعات بعد.' })); return; }
    const tot = gs.filter(g => !g.revoked).reduce((a, g) => a + (g.amount || 0), 0);
    list.append(el('small', { class: 'note', text: 'المجموع (آخر ' + gs.length + '): ' + tot + ' د.ل' }));
    gs.forEach(g => list.append(el('div', { style: 'border-bottom:1px dashed var(--line);padding:4px 0;' + (g.revoked ? 'opacity:.5;text-decoration:line-through' : '') },
      el('b', { text: g.who }), el('small', { text: ' — ' + (g.offer || '') + ' — ' + g.lines.map(l => l.label).join('، ') + ' — ' + g.amount + ' د.ل' + (g.src === 'manual' ? ' (يدوي)' : '') + ' — حتى ' + fmtD(g.until) }),
      g.revoked ? null : el('button', { class: 'linkbtn', text: ' ⛔ إلغاء', onclick: async e => { if (!confirm('إلغاء صلاحية هذا المعلم؟')) return; try { await call('adminMat', { op: 'revokeMat', id: g.id }); g.revoked = true; draw(gs); } catch (x) { alert(fnErr(x)); } } })))); };
  async function loadList() { try { const r = await call('adminMat', { op: 'shopGet' }); draw(r.grants || []); } catch (e) {} }
  draw(R.grants || []);
}
