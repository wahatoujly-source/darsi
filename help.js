/* ================= المجتهد — مركز المساعدة: أسئلة شائعة حسب الصفحة + تذاكر دعم (بدون أرقام هواتف ظاهرة) =================
   المصدر الوحيد للأسئلة: data/help.json (نفسه يبني صفحة /faq/ العامة لمحركات البحث).
   التذاكر: ticketSend / ticketMine (للمستخدم أو الزائر بمفتاح سري محفوظ في جهازه)، والإدارة: adminTickets. */
let C; // { call, fnErr, ACC, page, fbk, D, el, go, store }
const ev = (n, p, once) => { try { window.AX && AX.ev(n, p || {}, once); } catch (e) {} };
const CATS = [['pay', '💳', 'الدفع والاشتراك'], ['login', '🔐', 'التسجيل والدخول'], ['kids', '👨‍👩‍👧', 'الأبناء والأجهزة'], ['lessons', '📚', 'الدروس والمحتوى'], ['teach', '👩‍🏫', 'المعلمون والدورات'], ['idea', '💡', 'اقتراح'], ['other', '✉️', 'أخرى']];
const CTX_CAT = { pay: 'pay', paid: 'pay', login: 'login', kids: 'kids', devices: 'kids', lessons: 'lessons', teach: 'teach' };
const fmt = ms => ms ? new Date(ms).toLocaleString('ar-LY-u-nu-latn', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
const ST = { open: ['⏳ بانتظار الرد', '#b45309'], answered: ['💬 تم الرد', '#15803d'], closed: ['✓ مغلقة', '#6b7280'] };
let DATA = null;
const loadData = async () => DATA || (DATA = await fetch('data/help.json').then(r => r.json()));
const keys = () => C.store.get('tk_keys', []) || [];

/* هل هناك رد جديد لم يُقرأ؟ (لشارة زر المساعدة) */
export async function unread(ctx) { C = C || ctx; const { ACC, store } = C;
  const ks = keys(); if (!(ACC.user && !ACC.user.isAnonymous) && !ks.length) return 0;
  if (store.get('tk_chk', 0) > Date.now() - 10 * 60e3) return store.get('tk_unread', 0);
  try { const r = await C.call('ticketMine', { keys: ks }); const seen = store.get('tk_seen', 0);
    const n = r.list.filter(t => { const m = t.msgs[t.msgs.length - 1]; return m && m.by === 'a' && m.at > seen; }).length;
    store.set('tk_chk', Date.now()); store.set('tk_unread', n); return n; } catch (e) { return 0; } }

export async function renderHelp(ctx, opt) {
  C = ctx; const { el, page, fbk, call, fnErr, ACC, store, go } = C; opt = opt || {};
  const cx = store.get('help_ctx', '') || ''; ev('help_open', { ctx: cx });
  const s = page('💬 المساعدة', 'أسئلة شائعة · أرسل سؤالك ونرد عليك', 'home');
  const search = el('input', { class: 'tinput hp-q', type: 'search', placeholder: '🔎 ابحث: الدفع، ربط الجوال، كلمة المرور…', 'aria-label': 'ابحث في الأسئلة' });
  const faq = el('div', { class: 'stack' }), tkBox = el('div', { class: 'stack' }), mine = el('div', { class: 'stack' });
  s.append(search, faq, tkBox, mine);
  const qa = (x, open) => { const d = el('details', { class: 'hp-qa' }, el('summary', { text: x.q }), el('p', { text: x.a })); if (open) d.open = true;
    d.addEventListener('toggle', () => { if (d.open) ev('help_q', { q: x.q.slice(0, 60) }); }); return d; };
  const drawFaq = () => { faq.innerHTML = ''; if (!DATA) { faq.append(el('span', { class: 'note', text: 'جارٍ التحميل…' })); return; }
    const t = search.value.trim(); const all = DATA.groups.flatMap(g => g.qs.map(q => ({ ...q, g })));
    if (t) { const w = t.split(/\s+/).filter(x => x.length > 1); const hit = all.filter(x => w.every(k => (x.q + ' ' + x.a).includes(k)));
      faq.append(el('b', { text: hit.length ? 'نتائج البحث (' + hit.length + ')' : 'لم نجد سؤالاً مطابقاً — أرسل سؤالك بالأسفل وسنجيبك.' }), ...hit.slice(0, 12).map(x => qa(x, hit.length === 1))); return; }
    const top = cx ? all.filter(x => (x.ctx || []).includes(cx)) : [];
    if (top.length) faq.append(el('div', { class: 'hp-top' }, el('b', { text: '⭐ أسئلة تخص هذه الصفحة' }), ...top.slice(0, 6).map(x => qa(x))));
    DATA.groups.forEach(g => faq.append(el('div', { class: 'hp-grp' }, el('b', { text: g.icon + ' ' + g.name }), ...g.qs.map(x => qa(x))))); };
  search.addEventListener('input', drawFaq);
  loadData().then(drawFaq).catch(() => { faq.innerHTML = ''; fbk(faq, 'bad', 'تعذّر تحميل الأسئلة. تحقق من الاتصال.'); }); drawFaq();

  /* ----- نموذج التذكرة ----- */
  const logged = ACC.user && !ACC.user.isAnonymous && !ACC.kid;
  if (ACC.kid) { tkBox.append(el('div', { class: 'feedback info', text: 'عندك سؤال أو مشكلة؟ اطلب من ولي أمرك أن يرسلها من حسابه في «المساعدة».' })); }
  else {
    let cat = opt.cat || CTX_CAT[cx] || (store.get('last_order', '') && cx === 'pay' ? 'pay' : '');
    const card = el('div', { class: 'panel accbox hp-tk' }); const msg = el('div');
    const txt = el('textarea', { class: 'tinput', rows: 4, maxLength: 1500, placeholder: 'اكتب سؤالك أو مشكلتك بالتفصيل…' });
    const nm = el('input', { class: 'tinput', placeholder: 'اسمك', maxLength: 60 }), ph = el('input', { class: 'tinput', type: 'tel', inputmode: 'numeric', dir: 'ltr', placeholder: '091 234 5678', maxLength: 14 });
    const cats = el('div', { class: 'hp-cats' }), oInfo = el('div');
    const drawCats = () => { cats.innerHTML = ''; CATS.forEach(([k, ic, n]) => cats.append(el('button', { class: 'btn ghost sm' + (cat === k ? ' on' : ''), text: ic + ' ' + n, onclick: () => { cat = k; drawCats(); } })));
      oInfo.innerHTML = ''; const oid = store.get('last_order', ''); if (cat === 'pay' && oid) oInfo.append(el('span', { class: 'note', text: '🧾 سنرفق رقم آخر طلب دفع لك تلقائياً: ' + oid })); };
    drawCats();
    const send = el('button', { class: 'btn sun', text: 'إرسال ←', onclick: async () => {
      msg.innerHTML = ''; if (!cat) { fbk(msg, 'bad', 'اختر نوع السؤال.'); return; } if (txt.value.trim().length < 5) { fbk(msg, 'bad', 'اكتب سؤالك بوضوح.'); txt.focus(); return; }
      send.disabled = true;
      try { const r = await call('ticketSend', { cat, text: txt.value.trim(), orderId: cat === 'pay' ? store.get('last_order', '') : '', name: logged ? '' : nm.value.trim(), phone: logged ? '' : ph.value.trim(), page: cx, ua: navigator.userAgent.slice(0, 120) });
        if (r.key) store.set('tk_keys', [{ id: r.id, key: r.key }, ...keys()].slice(0, 10));
        ev('ticket_sent', { cat }); txt.value = ''; fbk(msg, 'ok', '✓ وصلنا سؤالك. سنرد عليك هنا في «تذاكري»' + (logged ? ' ويصلك إشعار عند الرد.' : '، احفظ هذه الصفحة وارجع إليها لاحقاً.')); store.set('tk_chk', 0); drawMine();
      } catch (e) { fbk(msg, 'bad', fnErr(e)); } send.disabled = false; } });
    card.append(el('b', { text: '✉️ لم تجد الجواب؟ أرسل سؤالك' }), el('span', { class: 'note', text: 'يرد عليك فريق المجتهد هنا في أقرب وقت.' }),
      cats, oInfo, logged ? null : el('div', { class: 'stack' }, nm, ph, el('small', { class: 'note', text: 'رقمك لن يظهر لأحد، نستعمله فقط للتواصل معك بخصوص سؤالك.' })), txt, send, msg);
    tkBox.append(card);
    if (opt.focus) setTimeout(() => { card.scrollIntoView({ behavior: 'smooth', block: 'start' }); txt.focus(); }, 300);
  }

  /* ----- تذاكري ----- */
  const drawMine = async () => { mine.innerHTML = ''; if (!logged && !keys().length) return;
    let r; try { r = await call('ticketMine', { keys: keys() }); } catch (e) { return; } if (!r.list.length) return;
    let mx = store.get('tk_seen', 0); mine.append(el('b', { text: '🎫 تذاكري' }));
    r.list.forEach(t => { const [sn, sc] = ST[t.status] || ['', '#555']; const box = el('div', { class: 'panel accbox hp-th' });
      box.append(el('div', { style: 'display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap' }, el('b', { text: t.catName || 'سؤال' }), el('span', { style: 'color:' + sc + ';font-weight:800', text: sn })));
      t.msgs.forEach(m => { box.append(el('div', { class: 'hp-msg ' + (m.by === 'a' ? 'a' : 'u') }, el('small', { text: (m.by === 'a' ? '🟢 فريق المجتهد' : 'أنت') + ' · ' + fmt(m.at) }), el('p', { text: m.t }))); if (m.by === 'a') mx = Math.max(mx, m.at); });
      if (t.status !== 'closed') { const rt = el('textarea', { class: 'tinput', rows: 2, maxLength: 1500, placeholder: 'أضف رداً أو معلومة…' }), m2 = el('div');
        box.append(rt, el('button', { class: 'btn ghost sm', text: 'إرسال الرد', onclick: async e => { if (rt.value.trim().length < 5) return; e.target.disabled = true;
          try { const k = keys().find(x => x.id === t.id); await call('ticketSend', { id: t.id, key: k ? k.key : undefined, text: rt.value.trim() }); drawMine(); } catch (x) { fbk(m2, 'bad', fnErr(x)); e.target.disabled = false; } } }), m2); }
      mine.append(box); });
    store.set('tk_seen', mx); store.set('tk_unread', 0); C.onSeen && C.onSeen(); };
  drawMine();
}

/* ----- صاحب التذكرة: من هو، وإجراءات مباشرة (تحويل نوع الحساب، منحة مجانية، تفعيل دفعة، إلغاء منحة) ----- */
const ROLE_N = { student: '🎒 طالب', parent: '👨‍👩‍👧 ولي أمر', teacher: '👩‍🏫 معلم' };
const OST = { pending: '⏳ بانتظار التأكيد', paid: '✅ مدفوع', failed: '✖ فشل', refunded: '↩ مُسترد', dismissed: '— مُلغى' };
function whoBox(t, reload) {
  const { el, call, fnErr, fbk, ACC } = C;
  const box = el('div', { class: 'tk-who' }, el('span', { class: 'note', text: '👤 جارٍ التعرّف على صاحب التذكرة…' })), m = el('div');
  const day = ms => ms ? new Date(ms).toLocaleDateString('ar-LY-u-nu-latn', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
  const draw = async () => {
    let w; try { w = await call('adminTickets', { op: 'who', id: t.id }); } catch (e) { box.innerHTML = ''; fbk(box, 'bad', fnErr(e)); return; }
    box.innerHTML = '';
    if (!w.found) { box.append(el('div', { class: 'tk-who-h' }, el('b', { text: '🚫 غير مسجّل في المنصة' }), el('span', { class: 'note', dir: 'ltr', text: w.phone || '' })),
      el('span', { class: 'note', text: 'لا يوجد حساب بهذا الرقم. اطلب منه في الرد أن يسجّل بنفس الرقم، ثم يمكنك منحه أو تفعيل ما يلزم من هنا.' })); return; }
    const kids = w.profiles.filter(p => p.id !== 'me'), me = w.profiles.find(p => p.id === 'me');
    const actSubs = w.subs.filter(x => x.active);
    box.append(el('div', { class: 'tk-who-h' }, el('b', { text: '✅ مسجّل: ' + (w.name || '—') }), el('span', { class: 'tk-chip', text: ROLE_N[w.role] || w.role || 'بدون نوع' })),
      el('span', { class: 'note', dir: 'auto', text: [w.phone && w.phone.replace('+218', '0'), w.email, 'سجّل ' + day(w.createdAt), w.lastSeen && 'آخر دخول ' + day(w.lastSeen), w.devices && w.devices + ' جهاز ابن مربوط'].filter(Boolean).join(' · ') }),
      kids.length ? el('span', { class: 'note', text: '👧 الأبناء: ' + kids.map(k => k.name + (k.grade ? ' (' + C.gradeName(k.grade) + ')' : '')).join('، ') }) : (w.role === 'parent' ? el('span', { class: 'note', text: '👧 لم يضف أبناء بعد' }) : null),
      me && me.grade && w.role === 'student' ? el('span', { class: 'note', text: '🎒 صفه: ' + C.gradeName(me.grade) }) : null,
      el('span', { class: 'note', text: actSubs.length ? '⭐ اشتراكات فعّالة: ' + actSubs.map(x => (x.planName || (x.kind === 'gift' ? 'منحة' : x.kind)) + ' حتى ' + day(x.end)).join('، ') : '⭐ لا يوجد اشتراك فعّال' }));
    /* الطلبات: تفعيل دفعة لم تتفعّل */
    if (w.orders.length) { const ol = el('div', { class: 'stack', style: 'gap:4px' }, el('b', { text: '🧾 آخر عمليات الدفع' }));
      w.orders.forEach(o => ol.append(el('div', { class: 'tk-row' }, el('span', { text: (o.planName || '') + ' · ' + o.amount + ' د.ل · ' + (OST[o.status] || o.status) + ' · ' + day(o.at) }),
        ['pending', 'failed'].includes(o.status) && ACC.can('plans') ? el('button', { class: 'btn sm', text: '✅ تفعيل', onclick: async () => { if (!confirm('تفعيل «' + o.planName + '» لـ ' + (w.name || 'المستخدم') + '؟\nتأكد أن المبلغ ' + o.amount + ' د.ل وصل في ماي باي.')) return;
          try { await call('adminOrders', { op: 'activate', id: o.id, note: 'من تذكرة' }); fbk(m, 'ok', '✓ تم تفعيل الاشتراك.'); draw(); } catch (e) { fbk(m, 'bad', fnErr(e)); } } }) : null)));
      box.append(ol); }
    /* المنح الفعّالة: إلغاء */
    const gifts = actSubs.filter(x => x.kind === 'gift');
    if (gifts.length && ACC.can('grant')) gifts.forEach(g => box.append(el('div', { class: 'tk-row' }, el('span', { text: '🎁 منحة ' + ((g.scope.grades || [])[0] === '*' ? 'كل الصفوف' : 'الصف ' + C.gradeName((g.scope.grades || [])[0])) + ' حتى ' + day(g.end) }),
      el('button', { class: 'btn ghost sm', text: 'إلغاء المنحة', onclick: async e => { if (e.target.dataset.c !== '1') { e.target.dataset.c = '1'; e.target.textContent = 'تأكيد الإلغاء'; return; } try { await call('adminRevoke', { id: g.id }); fbk(m, 'ok', '✓ أُلغيت.'); draw(); } catch (er) { fbk(m, 'bad', fnErr(er)); } } }))));
    if (!ACC.can('grant')) { box.append(m); return; }
    /* تحويل نوع الحساب */
    let gSel = null; const gp = el('div', { class: 'gpick', hidden: true });
    C.GRADES.forEach(([g, n]) => gp.append(el('button', { class: 'btn ghost sm', text: n, onclick: e => { gSel = g; [...gp.children].forEach(x => x.classList.remove('on')); e.currentTarget.classList.add('on'); } })));
    const setRole = async r => { if (r === 'student' && !gSel) { gp.hidden = false; fbk(m, 'info', 'اختر صف الطالب ثم اضغط «طالب» مرة أخرى.'); return; }
      if (!confirm('تحويل حساب ' + (w.name || '') + ' إلى «' + ROLE_N[r] + '»؟' + (actSubs.length ? '\nاشتراكه المدفوع يتحوّل معه.' : ''))) return;
      try { const x = await call('adminTickets', { op: 'role', id: t.id, uid: w.uid, role: r, grade: gSel }); fbk(m, 'ok', '✓ تم التحويل' + (x.converted ? ' مع الاشتراك' : '') + '. وصلته رسالة في التذكرة.'); reload(); } catch (e) { fbk(m, 'bad', fnErr(e)); } };
    box.append(el('b', { text: '🔁 تحويل نوع الحساب' }), el('div', { class: 'row', style: 'gap:6px;flex-wrap:wrap' },
      ...['parent', 'student', 'teacher'].filter(r => r !== w.role).map(r => el('button', { class: 'btn ghost sm', text: 'إلى ' + ROLE_N[r], onclick: () => setRole(r) }))), gp);
    /* منحة مجانية */
    const gr = el('select', { class: 'qsel' }, el('option', { value: '*', text: 'كل الصفوف' }), ...C.GRADES.map(([g, n]) => el('option', { value: g, text: 'الصف ' + n })));
    { const kg = [...new Set(kids.map(k => String(k.grade)).filter(Boolean))]; if (w.role === 'student' && me && me.grade) gr.value = String(me.grade); else if (kg.length === 1) gr.value = kg[0]; }
    const du = el('select', { class: 'qsel' }, ...[['7', 'أسبوع'], ['30', 'شهر'], ['45', '45 يوماً'], ['90', '3 أشهر'], ['', 'حتى نهاية العام الدراسي']].map(([v, n]) => el('option', { value: v, text: n })));
    const wy = el('select', { class: 'qsel' }, ...[['other', 'تعويض عن مشكلة'], ['promo', 'عرض ترويجي'], ['family', 'أقارب وأصدقاء']].map(([v, n]) => el('option', { value: v, text: n })));
    box.append(el('b', { text: '🎁 فتح باقة مجاناً' }), el('div', { class: 'row', style: 'gap:6px;flex-wrap:wrap' }, gr, du, wy),
      el('button', { class: 'btn sun sm', text: '🎁 امنح الآن', onclick: async e => { const b = e.currentTarget; b.disabled = true;
        try { await call('adminGrant', { uid: w.uid, grade: gr.value, days: du.value ? +du.value : 0, why: wy.value, note: 'تذكرة: ' + (t.catName || '') });
          fbk(m, 'ok', '✓ تم المنح (' + gr.options[gr.selectedIndex].text + ' — ' + du.options[du.selectedIndex].text + '). اكتب له في الرد أن يعيد فتح المنصة.'); draw(); } catch (er) { fbk(m, 'bad', fnErr(er)); } b.disabled = false; } }), m);
  };
  draw(); return box;
}

/* ----- لوحة الإدارة: تذاكر الدعم ----- */
export function adminBox(ctx) {
  C = ctx; const { el, fbk, call, fnErr } = C;
  const box = el('div', { class: 'panel accbox' }, el('b', { text: '🎫 تذاكر الدعم' }), el('span', { class: 'note', text: 'أسئلة المستخدمين والزوار. ردّك يظهر لهم في «المساعدة» ويصلهم إشعار.' }));
  const body = el('div', { class: 'stack' }), msg = el('div'); let all = false;
  const load = async () => { body.innerHTML = ''; body.append(el('span', { class: 'note', text: 'جارٍ التحميل…' }));
    let r; try { r = await call('adminTickets', { op: 'list', all }); } catch (e) { body.innerHTML = ''; fbk(msg, 'bad', fnErr(e)); return; }
    body.innerHTML = '';
    body.append(el('div', { class: 'row', style: 'gap:6px' }, el('button', { class: 'btn ghost sm' + (!all ? ' on' : ''), text: 'المفتوحة', onclick: () => { all = false; load(); } }), el('button', { class: 'btn ghost sm' + (all ? ' on' : ''), text: 'الكل', onclick: () => { all = true; load(); } })));
    if (!r.list.length) body.append(el('span', { class: 'note', text: 'لا توجد تذاكر ' + (all ? '' : 'مفتوحة ') + '👍' }));
    r.list.forEach(t => { const [sn, sc] = ST[t.status] || ['', '#555']; const b = el('div', { class: 'accrow', style: 'flex-direction:column;align-items:stretch;gap:6px' });
      b.append(el('div', { style: 'display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap' }, el('b', { text: (t.name || 'زائر') + ' · ' + (t.catName || '') }), el('span', { style: 'color:' + sc + ';font-weight:800', text: sn })),
        el('span', { class: 'note', dir: 'auto', text: [t.phone, t.guest ? 'زائر' : t.role, t.page && 'من صفحة: ' + t.page, fmt(t.createdAt)].filter(Boolean).join(' · ') }),
        t.orderId ? el('span', { class: 'note', dir: 'ltr', style: 'font-family:monospace', text: '🧾 ' + t.orderId + '  ← راجعه في «الطلبات والمدفوعات»' }) : null);
      t.msgs.forEach(m => b.append(el('div', { class: 'hp-msg ' + (m.by === 'a' ? 'a' : 'u') }, el('small', { text: (m.by === 'a' ? 'الدعم' : t.name || 'المستخدم') + ' · ' + fmt(m.at) }), el('p', { text: m.t }))));
      b.append(whoBox(t, load));
      const rt = el('textarea', { class: 'tinput', rows: 2, placeholder: 'اكتب الرد…' });
      const act = async (op, close) => { try { if (op === 'reply' && rt.value.trim().length < 2) return; await call('adminTickets', { op, id: t.id, text: rt.value.trim(), close }); fbk(msg, 'ok', '✓ تم.'); load(); } catch (e) { fbk(msg, 'bad', fnErr(e)); } };
      b.append(rt, el('div', { class: 'row', style: 'gap:6px;flex-wrap:wrap' },
        el('button', { class: 'btn sun sm', text: 'إرسال الرد', onclick: () => act('reply') }), el('button', { class: 'btn ghost sm', text: 'إرسال وإغلاق', onclick: () => act('reply', true) }),
        t.status === 'closed' ? el('button', { class: 'btn ghost sm', text: 'إعادة فتح', onclick: () => act('reopen') }) : el('button', { class: 'btn ghost sm', text: 'إغلاق بدون رد', onclick: () => act('close') })));
      body.append(b); });
  };
  box.append(body, msg); load(); return box;
}
