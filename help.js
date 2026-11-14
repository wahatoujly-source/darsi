/* ================= المجتهد — مركز المساعدة: أسئلة شائعة حسب الصفحة + تذاكر دعم (بدون أرقام هواتف ظاهرة) =================
   المصدر الوحيد للأسئلة: data/help.json (نفسه يبني صفحة /faq/ العامة لمحركات البحث).
   التذاكر: ticketSend / ticketMine (للمستخدم أو الزائر بمفتاح سري محفوظ في جهازه)، والإدارة: adminTickets. */
let C; // { call, fnErr, ACC, page, fbk, D, el, go, store }
const ev = (n, p, once) => { try { window.AX && AX.ev(n, p || {}, once); } catch (e) {} };
const CATS = [['pay', '💳', 'الدفع والاشتراك'], ['login', '🔐', 'التسجيل والدخول'], ['kids', '👨‍👩‍👧', 'الأبناء والأجهزة'], ['lessons', '📚', 'الدروس والمحتوى'], ['idea', '💡', 'اقتراح'], ['other', '✉️', 'أخرى']];
const CTX_CAT = { pay: 'pay', paid: 'pay', login: 'login', kids: 'kids', devices: 'kids', lessons: 'lessons' };
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
      const rt = el('textarea', { class: 'tinput', rows: 2, placeholder: 'اكتب الرد…' });
      const act = async (op, close) => { try { if (op === 'reply' && rt.value.trim().length < 2) return; await call('adminTickets', { op, id: t.id, text: rt.value.trim(), close }); fbk(msg, 'ok', '✓ تم.'); load(); } catch (e) { fbk(msg, 'bad', fnErr(e)); } };
      b.append(rt, el('div', { class: 'row', style: 'gap:6px;flex-wrap:wrap' },
        el('button', { class: 'btn sun sm', text: 'إرسال الرد', onclick: () => act('reply') }), el('button', { class: 'btn ghost sm', text: 'إرسال وإغلاق', onclick: () => act('reply', true) }),
        t.status === 'closed' ? el('button', { class: 'btn ghost sm', text: 'إعادة فتح', onclick: () => act('reopen') }) : el('button', { class: 'btn ghost sm', text: 'إغلاق بدون رد', onclick: () => act('close') })));
      body.append(b); });
  };
  box.append(body, msg); load(); return box;
}
