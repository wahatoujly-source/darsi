// المجتهد — «أجهزتي المرتبطة»: هاتف خاص لكل ابن، هاتف مشترك بين أبناء، أو هاتف واحد للأسرة كلها.
// يضيف إلى نظام الربط بـ QR الحالي ولا يستبدله. الوقت المرجعي من الخادم (لا يتأثر بتغيير ساعة الهاتف).
const CSS = `
.dv-card{background:var(--card);border:1.5px solid var(--line);border-radius:18px;padding:14px;display:flex;flex-direction:column;gap:10px}
.dv-card.paused{border-color:#e8384f}.dv-card.me{box-shadow:0 0 0 2px #1f72e0 inset}
.dv-h{display:flex;gap:10px;align-items:center}.dv-ic{font-size:2rem;line-height:1}.dv-h .tx{flex:1;min-width:0}.dv-h b{display:block;font-size:1.05rem}
.dv-tag{display:inline-block;border-radius:99px;padding:1px 9px;font-size:.75rem;font-weight:800;margin-inline-start:4px}
.dv-tag.own{background:#e3f0ff;color:#1f72e0}.dv-tag.shared{background:#f3e8ff;color:#7c3aed}.dv-tag.family{background:#fff1d6;color:#a35b00}.dv-tag.off{background:#ffe9ec;color:#c22a43}.dv-tag.on{background:#e3f7e9;color:#1b7f3a}
.dv-kids{display:flex;gap:6px;flex-wrap:wrap}.dv-kid{display:inline-flex;align-items:center;gap:4px;background:var(--paper);border:1px solid var(--line);border-radius:99px;padding:3px 10px;font-weight:700;font-size:.88rem}
.dv-kid button{border:0;background:none;color:#c22a43;font:inherit;cursor:pointer;padding:0 2px}
.dv-act{display:flex;gap:6px;flex-wrap:wrap}.dv-now{font-size:.88rem;font-weight:700;padding:7px 10px;border-radius:12px;background:var(--paper)}
.dv-case{display:flex;gap:10px;align-items:flex-start;padding:12px;border:1.5px dashed var(--line);border-radius:16px;background:var(--card);text-align:start;font:inherit;color:var(--ink);cursor:pointer;width:100%}
.dv-case .e{font-size:1.8rem}.dv-case b{display:block}.dv-case small{color:var(--muted);line-height:1.6}
.dv-sl{display:flex;gap:6px;align-items:center;flex-wrap:wrap;padding:8px;border:1px solid var(--line);border-radius:12px;background:var(--paper)}
.dv-day{border:1.5px solid var(--line);background:var(--card);color:var(--ink);border-radius:9px;padding:4px 7px;font:inherit;font-size:.8rem;font-weight:800;min-width:34px}
.dv-day.on{background:#1f72e0;border-color:#1f72e0;color:#fff}
.dv-sl input[type=time]{border:1.5px solid var(--line);border-radius:9px;padding:4px 6px;font:inherit;background:var(--card);color:var(--ink)}
#devguard{position:fixed;inset:0;z-index:9000;background:var(--paper);overflow:auto;display:flex;align-items:center;justify-content:center;padding:20px}
#devguard .in{max-width:440px;width:100%;display:flex;flex-direction:column;gap:14px;align-items:center;text-align:center}
#devguard h2{margin:0}.dg-kids{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px;width:100%}
.dg-kid{border:2px solid var(--line);background:var(--card);border-radius:20px;padding:14px 8px;display:flex;flex-direction:column;align-items:center;gap:6px;font:inherit;color:var(--ink);cursor:pointer}
.dg-kid .av{font-size:2.6rem;line-height:1}.dg-kid b{font-size:1.05rem}
.dg-pill{position:fixed;bottom:calc(10px + env(safe-area-inset-bottom));inset-inline-start:10px;z-index:8000;background:#1f2a44;color:#fff;border:0;border-radius:99px;padding:7px 13px;font:inherit;font-size:.85rem;font-weight:800;box-shadow:0 4px 14px rgba(0,0,0,.25);cursor:pointer}
.dg-ban{position:fixed;top:0;inset-inline:0;z-index:8500;background:#e8384f;color:#fff;padding:10px 14px;font-weight:800;text-align:center;box-shadow:0 4px 14px rgba(0,0,0,.25)}
.dg-pin{display:grid;grid-template-columns:repeat(3,64px);gap:8px;justify-content:center}.dg-pin button{height:56px;border-radius:14px;border:1.5px solid var(--line);background:var(--card);color:var(--ink);font:inherit;font-size:1.3rem;font-weight:800}
.dg-dots{font-size:1.6rem;letter-spacing:8px;min-height:2rem}
`;
const DAYS = [[6, 'سبت'], [0, 'أحد'], [1, 'اثنين'], [2, 'ثلاثاء'], [3, 'أربعاء'], [4, 'خميس'], [5, 'جمعة']];
const DAYN = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const TZ = 2 * 3600e3;
const hm = t => { const [h, m] = String(t).split(':').map(Number); return h * 60 + m; };
// نفس منطق الخادم: من صاحب الوقت الآن؟ والموعد القادم
function devNow(dev, now) {
  const L = new Date(now + TZ), day = L.getUTCDay(), mins = L.getUTCHours() * 60 + L.getUTCMinutes();
  const pids = dev.pids || [];
  if (dev.ext && dev.ext.until > now && pids.includes(dev.ext.pid)) return { pid: dev.ext.pid, until: dev.ext.until, ext: true };
  const S = dev.sched || {};
  for (const pid of pids) for (const sl of (S[pid] || [])) if ((sl.d || []).includes(day) && mins >= hm(sl.s) && mins < hm(sl.e)) return { pid, until: now + (hm(sl.e) - mins) * 60e3 - L.getUTCSeconds() * 1000 };
  let next = null;
  for (let k = 0; k < 8 && !next; k++) { const dd = (day + k) % 7; let best = null;
    for (const pid of pids) for (const sl of (S[pid] || [])) if ((sl.d || []).includes(dd) && (k > 0 || hm(sl.s) > mins) && (!best || hm(sl.s) < hm(best.s))) best = { pid, s: sl.s };
    if (best) next = { pid: best.pid, at: now + ((k * 1440 + hm(best.s) - mins) * 60e3) - L.getUTCSeconds() * 1000 }; }
  return { pid: null, next };
}
const fmtT = t => new Date(t).toLocaleTimeString('ar-LY-u-nu-latn', { timeZone: 'Africa/Tripoli', hour: 'numeric', minute: '2-digit' });
const fmtWhen = (t, now) => { const a = new Date(t + TZ).toISOString().slice(0, 10), b = new Date(now + TZ).toISOString().slice(0, 10);
  const day = a === b ? 'اليوم' : (new Date(t + TZ).getUTCDay() === (new Date(now + TZ).getUTCDay() + 1) % 7 ? 'غداً' : DAYN[new Date(t + TZ).getUTCDay()]); return day + ' ' + fmtT(t); };
const ago = t => { if (!t) return 'لم يُستخدم بعد'; const m = Math.round((Date.now() - t) / 60000); return m < 2 ? 'نشط الآن' : m < 60 ? 'قبل ' + m + ' دقيقة' : m < 1440 ? 'قبل ' + Math.round(m / 60) + ' ساعة' : 'قبل ' + Math.round(m / 1440) + ' يوم'; };
const AV = a => a || '🧒';
async function sha(s) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); }
const LS = { get: k => { try { return localStorage.getItem('mj_' + k); } catch (e) { return null; } }, set: (k, v) => { try { v == null ? localStorage.removeItem('mj_' + k) : localStorage.setItem('mj_' + k, v); } catch (e) {} } };

let C = null; // سياق account.js
const css = () => { if (!document.getElementById('dv-css')) document.head.append(C.el('style', { id: 'dv-css', text: CSS })); };

/* =============================== واجهة ولي الأمر =============================== */
export async function renderDevices(ctx) {
  C = ctx; css(); const { el, page, fbk, call, fnErr, go, ACC, gradeName } = C;
  const s = page('📱 أجهزتي المرتبطة', 'الأجهزة التي يدرس عليها أبناؤك وجداول استخدامها', 'who');
  const msg = el('div'); const box = el('div', { class: 'stack' }); s.append(msg, box);
  fbk(msg, 'info', '⏳ جارٍ التحميل…');
  let R; try { R = await call('devAdmin', { op: 'list' }); msg.innerHTML = ''; } catch (e) { fbk(msg, 'bad', fnErr(e)); return; }
  const off = R.now - Date.now(); const now = () => Date.now() + off;
  const K = Object.fromEntries(R.kids.map(k => [k.id, k])); const kids = R.kids.filter(k => k.id !== 'me');
  const myFam = LS.get('fam_dev');
  const draw = () => { box.innerHTML = '';
    box.append(el('p', { class: 'note', text: 'نظّم استخدام المجتهد في أسرتك: هاتف خاص لكل ابن، أو هاتف يشترك فيه أكثر من ابن، أو هاتفك أنت يستخدمه الأبناء. هذا ينظّم استخدام المجتهد فقط، ولا يقفل الهاتف ولا التطبيقات الأخرى.' }));
    // الحالات الثلاث: كلها عبر معالج إعداد خطوة بخطوة
    box.append(el('b', { text: '➕ أضف جهازاً' }),
      el('button', { class: 'dv-case', onclick: () => go('devices-fam') }, el('span', { class: 'e', text: '🏠' }), el('span', {}, el('b', { text: 'هاتفي أنا يستعمله الأبناء' }), el('small', { text: 'هاتف واحد للأسرة: لكل ابن وقته، أو يختار الابن اسمه. صفحتك محمية برمز أو بالبصمة.' }))),
      el('button', { class: 'dv-case', onclick: () => go('devices-shared') }, el('span', { class: 'e', text: '👥' }), el('span', {}, el('b', { text: 'هاتف مشترك بين أكثر من ابن' }), el('small', { text: 'هاتف للأبناء (غير هاتفك) يدرس عليه ابنان أو أكثر: بالجدول أو باختيار الاسم. يُربط برمز QR واحد.' }))),
      el('button', { class: 'dv-case', onclick: () => go('devices-own') }, el('span', { class: 'e', text: '📱' }), el('span', {}, el('b', { text: 'هاتف خاص لابن' }), el('small', { text: 'كل ابن له هاتفه: يُربط بملفه برمز QR ويدخل مباشرة.' }))));
    box.append(el('b', { text: 'أجهزتي (' + R.devices.length + ')' }));
    if (!R.devices.length) box.append(el('p', { class: 'note', text: 'لا توجد أجهزة مرتبطة بعد.' }));
    R.devices.sort((a, b) => (a.kind === 'fam' ? 0 : 1) - (b.kind === 'fam' ? 0 : 1) || b.last - a.last).forEach(D => box.append(card(D)));
  };
  function pickKid(title, fn) { if (!kids.length) { fbk(msg, 'bad', 'أضف ابناً أولاً من «أبنائي».'); return; }
    box.innerHTML = ''; box.append(el('b', { text: title }), el('div', { class: 'dg-kids' }, ...kids.map(k => el('button', { class: 'dg-kid', onclick: () => fn(k.id) }, el('span', { class: 'av', text: AV(k.avatar) }), el('b', { text: k.name }), el('small', { text: 'الصف ' + gradeName(k.grade) })))),
      el('button', { class: 'btn ghost', text: 'رجوع', onclick: draw })); }
  async function famCreate() { if (myFam && R.devices.some(d => d.id === myFam)) { fbk(msg, 'info', 'هذا الهاتف مسجّل كجهاز الأسرة بالفعل — تجده في القائمة.'); return; }
    try { const r = await call('devAdmin', { op: 'famCreate', name: 'هاتف ولي الأمر' }); LS.set('fam_dev', r.id); renderDevices(C); } catch (e) { fbk(msg, 'bad', fnErr(e)); } }
  async function upd(D, patch, okMsg) { try { const r = await call('devAdmin', { op: 'update', kind: D.kind, dev: D.id, patch }); Object.assign(D, r.device); fbk(msg, 'ok', '✓ ' + (okMsg || 'حُفظ')); draw(); return true; }
    catch (e) { fbk(msg, 'bad', conflictMsg(e)); return false; } }
  const conflictMsg = e => { const m = /conflict:([^:]+):([^:]+):([\d:]+-[\d:]+):([\d:]+-[\d:]+)/.exec(String(e && e.message || '')); return m ? 'تعارض في المواعيد: وقت ' + ((K[m[1]] || {}).name || '') + ' (' + m[3] + ') يتداخل مع وقت ' + ((K[m[2]] || {}).name || '') + ' (' + m[4] + ') في نفس اليوم. عدّل أحدهما.' : fnErr(e); };
  function card(D) {
    const isFam = D.kind === 'fam', mine = isFam && D.id === myFam, typ = isFam ? 'family' : D.pids.length > 1 ? 'shared' : 'own';
    const st = devNow(D, now()); const nm = p => (K[p] || {}).name || '؟';
    const c = el('div', { class: 'dv-card' + (D.paused ? ' paused' : '') + (mine ? ' me' : '') });
    c.append(el('div', { class: 'dv-h' }, el('span', { class: 'dv-ic', text: isFam ? '🏠' : typ === 'shared' ? '👥' : '📱' }),
      el('span', { class: 'tx' }, el('b', {}, D.name, mine ? el('span', { class: 'dv-tag on', text: 'هذا الهاتف' }) : null),
        el('span', {}, el('span', { class: 'dv-tag ' + typ, text: typ === 'family' ? 'جهاز الأسرة الوحيد' : typ === 'shared' ? 'مشترك' : 'خاص' }),
          el('span', { class: 'dv-tag ' + (D.paused ? 'off' : 'on'), text: D.paused ? '⏸ موقوف' : '✓ مرتبط' }), el('small', { class: 'note', text: ' · ' + ago(D.last) }))),
      el('button', { class: 'btn ghost sm', text: '✏️', title: 'تغيير الاسم', onclick: async () => { const n = prompt('اسم الجهاز (مثلاً: هاتف أمجد)', D.name); if (n && n.trim()) upd(D, { name: n.trim() }, 'تغيّر الاسم'); } })));
    // الأبناء على الجهاز
    const kidsRow = el('div', { class: 'dv-kids' }, ...D.pids.map(p => el('span', { class: 'dv-kid' }, AV((K[p] || {}).avatar) + ' ' + nm(p),
      D.pids.length > 1 ? el('button', { title: 'إزالة من الجهاز', text: '✕', onclick: () => { if (confirm('إزالة ' + nm(p) + ' من هذا الجهاز؟ (تبقى نتائجه وتقدّمه محفوظة)')) upd(D, { pids: D.pids.filter(x => x !== p) }, 'أُزيل ' + nm(p)); } }) : null)));
    const free = kids.filter(k => !D.pids.includes(k.id));
    if (free.length) kidsRow.append(el('button', { class: 'btn ghost sm', text: '➕ إضافة ابن', onclick: () => { const sel = el('select', { class: 'qsel' }, ...free.map(k => el('option', { value: k.id, text: k.name })));
      kidsRow.replaceWith(el('div', { class: 'row', style: 'gap:6px;flex-wrap:wrap' }, sel, el('button', { class: 'btn sm', text: 'أضف', onclick: () => upd(D, { pids: [...D.pids, sel.value] }, 'أُضيف ' + nm(sel.value) + (D.schedOn ? ' — حدّد موعده في الجدول' : '')) }), el('button', { class: 'btn ghost sm', text: 'إلغاء', onclick: draw }))); } }));
    c.append(el('small', { class: 'note', text: 'الأبناء على هذا الجهاز:' }), kidsRow);
    // الحالة الآن
    c.append(el('div', { class: 'dv-now' }, D.paused ? '⏸ الجهاز موقوف: لا يستطيع الأبناء الدراسة عليه حتى تعيد تفعيله.'
      : !D.schedOn ? (D.pids.length > 1 ? '🔓 بدون جدول: يختار الابن ملفه عند فتح المجتهد.' : '🔓 بدون جدول: متاح في أي وقت.')
      : st.pid ? '▶ الآن وقت ' + nm(st.pid) + ' حتى ' + fmtT(st.until) + (st.ext ? ' (تمديد)' : '') : '⏰ لا أحد الآن' + (st.next ? ' — التالي: ' + nm(st.next.pid) + ' ' + fmtWhen(st.next.at, now()) : ' — لا مواعيد في الجدول')));
    if (D.schedOn) c.append(el('div', { class: 'note' }, ...D.pids.map(p => el('div', { text: nm(p) + ': ' + (((D.sched || {})[p] || []).map(x => DAYS.filter(([d]) => x.d.includes(d)).map(([, t]) => t).join('، ') + ' ' + x.s + '–' + x.e).join(' | ') || 'بلا مواعيد') }))));
    // الأوامر
    const act = el('div', { class: 'dv-act' },
      el('button', { class: 'btn ghost sm', text: '📅 جدول الاستخدام', onclick: () => editSched(D) }),
      el('button', { class: 'btn ghost sm', text: D.paused ? '▶ إعادة التفعيل' : '⏸ إيقاف الجهاز', onclick: () => upd(D, { paused: !D.paused }, D.paused ? 'أُعيد التفعيل' : 'أُوقف الجهاز') }),
      D.schedOn ? el('button', { class: 'btn ghost sm', text: '⏱ تمديد وقت', onclick: () => extend(D) }) : null,
      D.ext && D.ext.until > now() ? el('button', { class: 'btn ghost sm', text: '✕ إلغاء التمديد', onclick: () => upd(D, { ext: null }, 'أُلغي التمديد') }) : null);
    if (isFam) { act.append(mine ? el('button', { class: 'btn sun sm', text: '🧒 تشغيل وضع الأبناء الآن', onclick: () => { if (!D.hasPin) { fbk(msg, 'info', 'ضع أولاً رمزاً لولي الأمر حتى لا يدخل الأبناء صفحتك.'); go('devices-lock-' + D.id); return; } LS.set('fam_mode', '1'); boot(C, true); } })
        : el('button', { class: 'btn ghost sm', text: '📲 استخدمه على هذا الهاتف', onclick: () => { LS.set('fam_dev', D.id); renderDevices(C); } }),
      el('button', { class: 'btn ghost sm', text: D.hasPin ? '🔐 الرمز والبصمة' : '🔐 ضع رمز ولي الأمر', onclick: () => go('devices-lock-' + D.id) })); }
    act.append(el('button', { class: 'btn ghost sm', style: 'color:#c22a43', text: '✕ إلغاء الربط', onclick: async e => { const b = e.currentTarget; if (b.dataset.c !== '1') { b.dataset.c = '1'; b.textContent = '⚠️ متأكد؟ اضغط مرة أخرى'; return; }
      try { await call('devAdmin', { op: 'unlink', kind: D.kind, dev: D.id }); if (mine) { LS.set('fam_dev', null); LS.set('fam_mode', null); } R.devices = R.devices.filter(x => x !== D); fbk(msg, 'ok', '✓ أُلغي ربط الجهاز. نتائج الأبناء محفوظة.'); draw(); } catch (x) { fbk(msg, 'bad', fnErr(x)); } } }));
    c.append(act); return c;
  }
  function extend(D) { const nm = p => (K[p] || {}).name || '؟'; const sel = el('select', { class: 'qsel' }, ...D.pids.map(p => el('option', { value: p, text: nm(p) })));
    const st = devNow(D, now()); if (st.pid) sel.value = st.pid;
    box.innerHTML = ''; box.append(el('div', { class: 'panel stack' }, el('b', { text: '⏱ تمديد استثنائي — ' + D.name }), el('span', { class: 'note', text: 'يُضاف الوقت لمرة واحدة فقط ولا يغيّر الجدول.' }), sel,
      el('div', { class: 'row', style: 'gap:6px;flex-wrap:wrap' }, ...[15, 30, 60].map(m => el('button', { class: 'btn sm', text: '+' + m + ' دقيقة', onclick: () => upd(D, { ext: { pid: sel.value, mins: m } }, 'مُدّد وقت ' + nm(sel.value) + ' ' + m + ' دقيقة') }))),
      el('button', { class: 'btn ghost', text: 'رجوع', onclick: draw }))); }
  async function setPin(D) {
    const p1 = prompt('رمز من 4 أرقام يُطلب عند الخروج من «وضع الأبناء» على هذا الهاتف.\nاتركه فارغاً لإزالة الرمز.', '');
    if (p1 === null) return; if (p1 === '') { upd(D, { pinH: '' }, 'أُزيل الرمز'); return; }
    if (!/^\d{4}$/.test(p1)) { fbk(msg, 'bad', 'الرمز 4 أرقام.'); return; } const p2 = prompt('أعد كتابة الرمز للتأكيد', ''); if (p2 !== p1) { fbk(msg, 'bad', 'الرمزان غير متطابقين.'); return; }
    upd(D, { pinH: await sha('mj:' + ACC.user.uid + ':' + p1) }, 'حُفظ رمز ولي الأمر'); }
  function editSched(D) {
    const nm = p => (K[p] || {}).name || '؟'; const S = JSON.parse(JSON.stringify(D.sched || {})); let on = D.schedOn; const m2 = el('div');
    const w = el('div', { class: 'panel stack' }); box.innerHTML = ''; box.append(w);
    const drawE = () => { w.innerHTML = '';
      w.append(el('b', { text: '📅 جدول الاستخدام — ' + D.name }), el('span', { class: 'note', text: 'حدّد لكل ابن أيامه وأوقاته (يمكن أكثر من فترة في اليوم). عندما يحين موعد ابن يظهر ملفه تلقائياً، وعند انتهاء وقته يُحفظ تقدّمه وينتقل الجهاز إلى من بعده، أو تظهر شاشة انتظار بالموعد القادم. لا يُسمح بتداخل مواعيد الأبناء.' }),
        el('label', { class: 'sndrow' }, el('input', { type: 'checkbox', checked: on ? '' : null, onchange: e => { on = e.target.checked; drawE(); } }), el('b', { text: 'تفعيل الجدول' + (on ? '' : ' (متوقف: يُستخدم الجهاز في أي وقت)') })));
      if (on) D.pids.forEach(p => { const L = S[p] = S[p] || [];
        w.append(el('b', { text: AV((K[p] || {}).avatar) + ' ' + nm(p) }));
        L.forEach((x, i) => w.append(el('div', { class: 'dv-sl' }, ...DAYS.map(([d, t]) => el('button', { class: 'dv-day' + (x.d.includes(d) ? ' on' : ''), text: t, onclick: () => { x.d = x.d.includes(d) ? x.d.filter(y => y !== d) : [...x.d, d]; drawE(); } })),
          el('span', { text: 'من' }), el('input', { type: 'time', value: x.s, onchange: e => { x.s = e.target.value; } }), el('span', { text: 'إلى' }), el('input', { type: 'time', value: x.e, onchange: e => { x.e = e.target.value; } }),
          el('button', { class: 'btn ghost sm', text: '✕', onclick: () => { L.splice(i, 1); drawE(); } }))));
        w.append(el('button', { class: 'btn ghost sm', text: '+ فترة لـ' + nm(p), onclick: () => { L.push({ d: [6, 0, 1, 2, 3, 4], s: '16:00', e: '17:00' }); drawE(); } })); });
      w.append(m2, el('div', { class: 'row', style: 'gap:8px' }, el('button', { class: 'btn sun', text: '💾 حفظ الجدول', onclick: async () => {
        const bad = Object.values(S).flat().find(x => !x.d.length || !x.s || !x.e || hm(x.e) <= hm(x.s)); if (on && bad) { fbk(m2, 'bad', 'كل فترة تحتاج يوماً واحداً على الأقل، ووقت نهاية بعد البداية.'); return; }
        try { const r = await call('devAdmin', { op: 'update', kind: D.kind, dev: D.id, patch: { sched: S, schedOn: on } }); Object.assign(D, r.device); fbk(msg, 'ok', '✓ حُفظ الجدول. يُطبَّق على الجهاز خلال دقيقتين.'); draw(); }
        catch (e) { fbk(m2, 'bad', conflictMsg(e)); } } }), el('button', { class: 'btn ghost', text: 'رجوع', onclick: draw }))); };
    drawE(); }
  draw();
}

/* =============================== على الجهاز نفسه: الحارس =============================== */
// يعمل على جهاز الابن (مرتبط بـ QR) إذا كان مشتركاً أو له جدول أو موقوفاً، وعلى جهاز الأسرة في «وضع الأبناء».
let G = null;
const PARENT_ROUTES = /^(account|kids|who|devices(-.*)?|guide|admin(-.*)?|ctrl-.*|tt-.*|kid-.*|linkkid-.*|link(-\d+)?|subscribe|login(-.*)?|onboard|paid-.*|teacher.*|crs-.*)$/;
export async function boot(ctx, startNow) {
  C = ctx; css();
  const fam = !C.ACC.kid; if (fam && !(LS.get('fam_mode') === '1' && LS.get('fam_dev'))) return stop();
  if (G) { G.stop(); G = null; }
  G = { fam, dev: null, off: 0, pill: null, overlay: null, grace: 0, timer: null, poll: null, chosen: sessionStorage.getItem('dg_pick') || '' };
  G.stop = () => { clearInterval(G.timer); clearInterval(G.poll); G.pill && G.pill.remove(); G.overlay && G.overlay.remove(); document.querySelector('.dg-ban') && document.querySelector('.dg-ban').remove(); };
  await refresh(); if (!G) return;
  G.timer = setInterval(tick, 15000); G.poll = setInterval(refresh, 120000);
  C.ACC.guardRoute = h => { if (!G || !G.fam) return false; if (PARENT_ROUTES.test(h || '')) { parentGate(h); return true; } return false; };
  if (startNow) { C.go('home'); }
  tick();
}
function stop() { if (G) { G.stop(); G = null; } if (C) C.ACC.guardRoute = null; }
async function refresh() {
  try { const r = G.fam ? await C.call('devAdmin', { op: 'state', kind: 'fam', dev: LS.get('fam_dev') }) : await C.call('kidDeviceState', {});
    G.dev = r; G.off = r.now - Date.now(); G.kids = Object.fromEntries((r.kids || []).map(k => [k.id, k])); if (G.fam && r.pinH !== undefined) LS.set('fam_pin', r.pinH || null); }
  catch (e) { if (G && G.fam && /not-found|غير موجود/.test(String(e.message))) { LS.set('fam_mode', null); stop(); } }
}
const now = () => Date.now() + (G ? G.off : 0);
const curPid = () => G.fam ? C.ACC.pid : (G.dev && G.dev.cur) || C.ACC.pid;
const kname = p => ((G.kids || {})[p] || {}).name || '';
function tick() {
  if (!G || !G.dev) return; const D = G.dev;
  const simple = !G.fam && D.pids.length <= 1 && !D.schedOn && !D.paused;
  if (simple) { G.overlay && G.overlay.remove(); G.overlay = null; G.pill && G.pill.remove(); G.pill = null; return; } // جهاز خاص بلا جدول: كما كان تماماً
  if (D.paused) return screen('⏸', 'الجهاز موقوف مؤقتاً', 'أوقف ولي الأمر استخدام المجتهد على هذا الجهاز. اطلب منه إعادة التفعيل.');
  let want;
  if (D.schedOn) { const st = devNow(D, now()); if (!st.pid) return screen('⏰', 'ليس وقت الدراسة الآن', st.next ? 'الموعد القادم: ' + kname(st.next.pid) + ' — ' + fmtWhen(st.next.at, now()) : 'لا توجد مواعيد في الجدول. اطلب من ولي الأمر ضبط الجدول.');
    want = st.pid; G.until = st.until; }
  else { if (D.pids.length > 1 && !G.chosen) return chooser(); want = G.chosen || curPid(); G.until = 0; }
  if (want !== curPid()) {
    // انتهى وقت الابن الحالي أثناء درس أو اختبار: مهلة دقيقتين لإكمال التمرين، والتقدّم يُحفظ خطوة بخطوة
    const busy = /^(l-|times|test|daily|arena)/.test(location.hash.replace('#', ''));
    if (busy && G.overlay == null && D.schedOn) { if (!G.grace) G.grace = now() + 120000; if (now() < G.grace) { banner('⏰ انتهى وقت ' + kname(curPid()) + ' — أكمل ما بين يديك، سيُحفظ تقدّمك وينتقل الجهاز بعد ' + Math.ceil((G.grace - now()) / 60000) + ' دقيقة'); return; } }
    G.grace = 0; return switchTo(want);
  }
  G.grace = 0; document.querySelector('.dg-ban') && document.querySelector('.dg-ban').remove();
  G.overlay && G.overlay.remove(); G.overlay = null; pill();
}
async function switchTo(pid) {
  try { C.D.GAME && C.D.GAME.sync && C.D.GAME.sync(true); } catch (e) {}
  screen('🔄', 'جارٍ الانتقال إلى ملف ' + kname(pid) + '…', 'تم حفظ التقدّم.');
  if (G.fam) { await C.setActive(pid); G.overlay && G.overlay.remove(); G.overlay = null; document.querySelector('.dg-ban') && document.querySelector('.dg-ban').remove(); C.go('home'); pill(); return; }
  try { await C.call('kidSwitch', { pid }); await C.auth.currentUser.getIdToken(true); setTimeout(() => location.reload(), 600); }
  catch (e) { screen('⚠️', 'تعذّر الانتقال', C.fnErr(e)); setTimeout(refresh, 20000); }
}
function screen(ic, t, d, extra, gate) { const { el } = C;
  if (!G.overlay) { G.overlay = el('div', { id: 'devguard' }); document.body.append(G.overlay); }
  G.overlay.innerHTML = ''; G.overlay.append(el('div', { class: 'in' }, el('div', { style: 'font-size:4rem;line-height:1', text: ic }), el('h2', { text: t }), el('p', { class: 'note', style: 'font-size:1rem', text: d }), extra || null,
    G.fam && !gate ? el('button', { class: 'btn ghost', text: '👤 دخول ولي الأمر', onclick: () => parentGate('who') }) : null));
  G.pill && G.pill.remove(); G.pill = null; }
function chooser() { const { el } = C; const D = G.dev;
  screen('👋', 'من يدرس الآن؟', 'اضغط على اسمك.', el('div', { class: 'dg-kids' }, ...D.pids.map(p => { const k = (G.kids || {})[p] || {};
    return el('button', { class: 'dg-kid', onclick: () => { G.chosen = p; sessionStorage.setItem('dg_pick', p); if (p === curPid()) { G.overlay.remove(); G.overlay = null; pill(); } else switchTo(p); } },
      el('span', { class: 'av', text: AV(k.avatar) }), el('b', { text: k.name || '' }), el('small', { text: k.grade ? 'الصف ' + C.gradeName(k.grade) : '' })); }))); }
function banner(t) { let b = document.querySelector('.dg-ban'); if (!b) { b = C.el('div', { class: 'dg-ban' }); document.body.append(b); } b.textContent = t; }
function pill() { const { el } = C; const D = G.dev; if (!D) return;
  const left = G.until ? Math.max(0, Math.round((G.until - now()) / 60000)) : 0;
  const t = '👤 ' + kname(curPid()) + (left ? ' · ⏱ ' + left + ' د' : '') + (!D.schedOn && D.pids.length > 1 ? ' · تبديل' : '') + (G.fam ? ' · 🔒' : '');
  if (!G.pill) { G.pill = el('button', { class: 'dg-pill', onclick: () => { if (!D.schedOn && D.pids.length > 1) { G.chosen = ''; sessionStorage.removeItem('dg_pick'); chooser(); } else if (G.fam) parentGate('who'); } }); document.body.append(G.pill); }
  G.pill.textContent = t; }
// الدخول إلى صفحات ولي الأمر من «وضع الأبناء»: برمز إن وضعه، وإلا بتأكيد
function parentGate(h) { const { el } = C; const pinH = LS.get('fam_pin');
  const leave = () => { LS.set('fam_mode', null); stop(); C.go(h && PARENT_ROUTES.test(h) ? h : 'who'); };
  if (!pinH) { let n = 0; return screen('🔒', 'هذه الصفحة لولي الأمر', 'أنت في «وضع الأبناء». الخروج يعيد الهاتف لحساب ولي الأمر.', el('div', { class: 'row', style: 'gap:8px;justify-content:center' },
    el('button', { class: 'btn sun', text: 'الخروج من وضع الأبناء', onclick: e => { if (++n < 2) { e.currentTarget.textContent = '⚠️ اضغط مرة أخرى للتأكيد'; return; } leave(); } }), el('button', { class: 'btn ghost', text: 'رجوع', onclick: back })), true); }
  let v = ''; const dots = el('div', { class: 'dg-dots', text: '' }); const m = el('div');
  const bioB = LS.get('fam_bio') ? el('button', { class: 'btn sun', text: '👆 البصمة أو الوجه', onclick: async () => { if (await bioCheck()) leave(); else C.fbk(m, 'bad', 'لم يتم التحقق. استعمل الرمز.'); } }) : null;
  const press = async k => { if (k === '⌫') v = v.slice(0, -1); else if (v.length < 4) v += k; dots.textContent = '●'.repeat(v.length);
    if (v.length === 4) { if (await sha('mj:' + C.ACC.user.uid + ':' + v) === pinH) leave(); else { v = ''; dots.textContent = ''; C.fbk(m, 'bad', 'الرمز غير صحيح'); } } };
  screen('🔐', 'صفحة ولي الأمر', bioB ? 'افتح بالبصمة أو الوجه، أو اكتب الرمز.' : 'اكتب الرمز للخروج من «وضع الأبناء».', el('div', { class: 'stack', style: 'align-items:center' }, bioB, dots, m,
    el('div', { class: 'dg-pin' }, ...['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map(k => k ? el('button', { text: k, onclick: () => press(k) }) : el('span'))), el('button', { class: 'btn ghost', text: 'رجوع', onclick: back })), true);
  function back() { G.overlay && G.overlay.remove(); G.overlay = null; C.go('home'); tick(); }
}

/* =============================== البصمة / الوجه (WebAuthn على هذا الهاتف فقط) ===============================
   تُستعمل قفلاً لصفحة ولي الأمر في «وضع الأبناء». القفل الأساسي هو الرمز، والبصمة اختصار له على هذا الجهاز. */
const b64 = a => btoa(String.fromCharCode(...new Uint8Array(a))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64 = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
export async function bioAvailable() { try { return !!(window.PublicKeyCredential && await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()); } catch (e) { return false; } }
async function bioRegister() {
  const cred = await navigator.credentials.create({ publicKey: { challenge: crypto.getRandomValues(new Uint8Array(32)), rp: { name: 'المجتهد' },
    user: { id: crypto.getRandomValues(new Uint8Array(16)), name: 'parent', displayName: 'ولي الأمر' }, pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
    authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'discouraged' }, timeout: 60000, attestation: 'none' } });
  LS.set('fam_bio', b64(cred.rawId)); return true; }
async function bioCheck() { const id = LS.get('fam_bio'); if (!id) return false;
  try { await navigator.credentials.get({ publicKey: { challenge: crypto.getRandomValues(new Uint8Array(32)), allowCredentials: [{ type: 'public-key', id: unb64(id) }], userVerification: 'required', timeout: 60000 } }); return true; }
  catch (e) { return false; } }

/* =============================== معالج الإعداد خطوة بخطوة ===============================
   devices-fam    : هاتف ولي الأمر للأسرة (الأبناء ← طريقة الاستخدام ← الجدول ← القفل ← تشغيل)
   devices-shared : هاتف مشترك للأبناء (الأبناء ← الطريقة ← الجدول ← رمز QR واحد للجميع)
   devices-own    : هاتف خاص لكل ابن
   devices-lock-<id> : رمز ولي الأمر والبصمة لجهاز الأسرة */
const WZ_CSS = `.wz-steps{display:flex;gap:6px;justify-content:center}.wz-steps i{width:28px;height:6px;border-radius:9px;background:var(--line)}.wz-steps i.on{background:#1f72e0}
.wz-kids{display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:8px}.wz-kid{border:2px solid var(--line);background:var(--card);border-radius:16px;padding:10px 6px;display:flex;flex-direction:column;align-items:center;gap:4px;font:inherit;color:var(--ink);cursor:pointer}
.wz-kid.on{border-color:#1f72e0;background:#e3f0ff}.wz-kid .av{font-size:2rem}.wz-opt{display:flex;gap:10px;align-items:flex-start;padding:12px;border:2px solid var(--line);border-radius:16px;background:var(--card);font:inherit;color:var(--ink);text-align:start;cursor:pointer;width:100%}
.wz-opt.on{border-color:#1f72e0;background:#e3f0ff}.wz-opt .e{font-size:1.7rem}.wz-opt b{display:block}.wz-opt small{color:var(--muted);line-height:1.6}
.wz-pin{font-size:1.6rem;letter-spacing:10px;text-align:center;direction:ltr;max-width:200px;margin:auto}`;
function schedEditor(el, pids, K, S) { // يعدّل S في مكانه
  const w = el('div', { class: 'stack' }); const nm = p => (K[p] || {}).name || '؟';
  const draw = () => { w.innerHTML = '';
    pids.forEach(p => { const L = S[p] = S[p] || []; if (!L.length) L.push({ d: [6, 0, 1, 2, 3, 4], s: '16:00', e: '17:00' });
      w.append(el('b', { text: AV((K[p] || {}).avatar) + ' ' + nm(p) }));
      L.forEach((x, i) => w.append(el('div', { class: 'dv-sl' }, ...DAYS.map(([d, t]) => el('button', { class: 'dv-day' + (x.d.includes(d) ? ' on' : ''), text: t, onclick: () => { x.d = x.d.includes(d) ? x.d.filter(y => y !== d) : [...x.d, d]; draw(); } })),
        el('span', { text: 'من' }), el('input', { type: 'time', value: x.s, onchange: e => { x.s = e.target.value; } }), el('span', { text: 'إلى' }), el('input', { type: 'time', value: x.e, onchange: e => { x.e = e.target.value; } }),
        L.length > 1 ? el('button', { class: 'btn ghost sm', text: '✕', onclick: () => { L.splice(i, 1); draw(); } }) : null)));
      w.append(el('button', { class: 'btn ghost sm', text: '+ فترة أخرى لـ' + nm(p), onclick: () => { L.push({ d: [6, 0, 1, 2, 3, 4], s: '18:00', e: '19:00' }); draw(); } })); }); };
  draw(); return w; }
const schedBad = (S, pids) => { const L = pids.flatMap(p => S[p] || []); return L.find(x => !x.d.length || !x.s || !x.e || hm(x.e) <= hm(x.s)) ? 'كل فترة تحتاج يوماً واحداً على الأقل، ووقت نهاية بعد البداية.' : ''; };

export async function renderSetup(ctx, h) {
  C = ctx; css(); if (!document.getElementById('wz-css')) document.head.append(C.el('style', { id: 'wz-css', text: WZ_CSS }));
  const { el, page, fbk, call, fnErr, go, ACC, gradeName } = C;
  const kind = h.replace(/^devices-/, '');
  const T = { fam: '🏠 هاتفي أنا للأسرة', shared: '👥 هاتف مشترك للأبناء', own: '📱 هاتف خاص لكل ابن' };
  const s = page(kind.startsWith('lock') ? '🔐 قفل صفحة ولي الأمر' : T[kind] || 'إعداد الأجهزة', 'إعداد خطوة بخطوة', 'devices');
  const msg = el('div'), box = el('div', { class: 'stack' }); s.append(box, msg);
  const kids = (ACC.profiles || []).filter(p => p.id !== 'me'); const K = Object.fromEntries(kids.map(k => [k.id, k]));
  if (!kids.length) { box.append(el('p', { class: 'note', text: 'أضف أبناءك أولاً، ثم ارجع إلى هنا.' }), el('button', { class: 'btn sun', text: '＋ أضف ابناً', onclick: () => go('kids') })); return; }
  const st = { step: 0, pids: kids.map(k => k.id), mode: 'sched', S: {}, pin: '' };
  const dots = n => el('div', { class: 'wz-steps' }, ...Array.from({ length: n }, (_, i) => el('i', { class: i <= st.step ? 'on' : '' })));
  const nav = (back, next, nextT) => el('div', { class: 'row', style: 'gap:8px' }, next ? el('button', { class: 'btn sun', text: nextT || 'التالي ←', onclick: next }) : null, back ? el('button', { class: 'btn ghost', text: 'رجوع', onclick: back }) : el('button', { class: 'btn ghost', text: 'إلغاء', onclick: () => go('devices') }));
  const kidPick = (min) => el('div', { class: 'wz-kids' }, ...kids.map(k => el('button', { class: 'wz-kid' + (st.pids.includes(k.id) ? ' on' : ''), onclick: () => { st.pids = st.pids.includes(k.id) ? st.pids.filter(x => x !== k.id) : [...st.pids, k.id]; draw(); } },
    el('span', { class: 'av', text: AV(k.avatar) }), el('b', { text: (st.pids.includes(k.id) ? '✓ ' : '') + k.name }), el('small', { text: 'الصف ' + gradeName(k.grade) }))));
  const modePick = () => el('div', { class: 'stack' },
    el('button', { class: 'wz-opt' + (st.mode === 'sched' ? ' on' : ''), onclick: () => { st.mode = 'sched'; draw(); } }, el('span', { class: 'e', text: '⏰' }), el('span', {}, el('b', { text: 'لكل ابن وقته (جدول)' }), el('small', { text: 'مثلاً: سعاد من 4 إلى 5، رهف من 5 إلى 6. عند انتهاء وقت ابن يُحفظ تقدّمه وينتقل الهاتف تلقائياً إلى من بعده.' }))),
    el('button', { class: 'wz-opt' + (st.mode === 'open' ? ' on' : ''), onclick: () => { st.mode = 'open'; draw(); } }, el('span', { class: 'e', text: '🙋' }), el('span', {}, el('b', { text: 'مفتوح: كل ابن يفتح ملفه' }), el('small', { text: 'عند فتح المجتهد يظهر «من يدرس الآن؟» ويضغط كل ابن على اسمه. بدون أوقات محددة.' }))));
  const mins = () => (kind === 'shared' ? 2 : 1);
  const steps = {
    kids: () => [el('b', { text: kind === 'fam' ? 'من من أبنائك يدرس على هاتفك؟' : 'من من أبنائك يدرس على هذا الهاتف المشترك؟' }), kidPick(),
      nav(null, () => { if (st.pids.length < mins()) { fbk(msg, 'bad', kind === 'shared' ? 'اختر ابنين على الأقل (لابن واحد استعمل «هاتف خاص»).' : 'اختر ابناً واحداً على الأقل.'); return; } msg.innerHTML = ''; st.step++; draw(); })],
    mode: () => [el('b', { text: 'كيف يتناوبون على الهاتف؟' }), st.pids.length === 1 ? el('p', { class: 'note', text: 'ابن واحد: الجدول يحدد أوقات استعماله، أو اتركه مفتوحاً.' }) : null, modePick(),
      nav(() => { st.step--; draw(); }, () => { st.step++; if (st.mode === 'open') st.step++; draw(); })],
    sched: () => [el('b', { text: '⏰ وقت كل ابن' }), el('p', { class: 'note', text: 'حدّد الأيام والساعات. لا يُسمح بتداخل أوقات الأبناء. يمكنك تعديلها لاحقاً في أي وقت.' }), schedEditor(el, st.pids, K, st.S),
      nav(() => { st.step--; draw(); }, () => { const b = schedBad(st.S, st.pids); if (b) { fbk(msg, 'bad', b); return; } msg.innerHTML = ''; st.step++; draw(); })],
  };
  let famId = null;
  const draw = () => { box.innerHTML = '';
    if (kind === 'own') return drawOwn();
    if (kind.startsWith('lock')) return drawLock(kind.slice(5));
    const order = kind === 'fam' ? ['kids', 'mode', 'sched', 'lock', 'done'] : ['kids', 'mode', 'sched', 'qr'];
    box.append(dots(order.length));
    const k = order[st.step];
    if (steps[k]) box.append(...steps[k]().filter(Boolean));
    else if (k === 'lock') box.append(...lockStep(async (pinH, bio) => {
      try { const r = await call('devAdmin', { op: 'famCreate', name: 'هاتف ولي الأمر', pids: st.pids }); famId = r.id; LS.set('fam_dev', r.id);
        await call('devAdmin', { op: 'update', kind: 'fam', dev: r.id, patch: { pids: st.pids, sched: st.mode === 'sched' ? st.S : {}, schedOn: st.mode === 'sched', pinH } });
        LS.set('fam_pin', pinH); st.step++; draw(); } catch (e) { fbk(msg, 'bad', conflict(e)); } }, () => { st.step = st.mode === 'open' ? 1 : 2; draw(); }));
    else if (k === 'done') box.append(el('div', { class: 'panel stack', style: 'text-align:center' }, el('div', { style: 'font-size:3rem', text: '✅' }), el('b', { text: 'هاتفك جاهز للأسرة' }),
      el('p', { class: 'note', text: st.mode === 'sched' ? 'عندما تعطي الهاتف لأبنائك اضغط «ابدأ وضع الأبناء». يظهر ملف صاحب الوقت تلقائياً، وعند انتهاء وقته ينتقل إلى من بعده. للعودة إلى صفحتك اضغط «👤 دخول ولي الأمر» واستعمل الرمز أو البصمة.' : 'عندما تعطي الهاتف لأبنائك اضغط «ابدأ وضع الأبناء». يظهر «من يدرس الآن؟» ويختار كل ابن اسمه. للعودة إلى صفحتك استعمل الرمز أو البصمة.' }),
      el('button', { class: 'btn sun', text: '🧒 ابدأ وضع الأبناء الآن', onclick: () => { LS.set('fam_mode', '1'); boot(C, true); } }), el('button', { class: 'btn ghost', text: 'لاحقاً — إلى «أجهزتي»', onclick: () => go('devices') })));
    else if (k === 'qr') drawQR();
  };
  const conflict = e => { const m = /conflict:([^:]+):([^:]+):([\d:]+-[\d:]+):([\d:]+-[\d:]+)/.exec(String(e && e.message || '')); return m ? 'تعارض في المواعيد: وقت ' + ((K[m[1]] || {}).name || '') + ' (' + m[3] + ') يتداخل مع وقت ' + ((K[m[2]] || {}).name || '') + ' (' + m[4] + '). عدّل أحدهما.' : fnErr(e); };
  function lockStep(onDone, back) {
    const p1 = el('input', { class: 'tinput wz-pin', type: 'password', inputmode: 'numeric', maxlength: '4', placeholder: '••••', autocomplete: 'new-password', 'aria-label': 'رمز من 4 أرقام' });
    const p2 = el('input', { class: 'tinput wz-pin', type: 'password', inputmode: 'numeric', maxlength: '4', placeholder: '••••', autocomplete: 'new-password', 'aria-label': 'أعد الرمز' });
    const bio = el('div'); let useBio = false;
    bioAvailable().then(ok => { if (!ok) { bio.append(el('small', { class: 'note', text: 'البصمة/الوجه غير متاحة في هذا المتصفح، والرمز يكفي.' })); return; }
      bio.append(el('label', { class: 'sndrow' }, el('input', { type: 'checkbox', onchange: e => { useBio = e.target.checked; } }), el('b', { text: '👆 أريد الفتح أيضاً ببصمة الإصبع أو الوجه على هذا الهاتف' }))); });
    return [el('b', { text: '🔐 قفل صفحة ولي الأمر' }), el('p', { class: 'note', text: 'حتى لا يدخل الأبناء صفحتك أو يغيّروا الجدول: اختر رمزاً من 4 أرقام لا يعرفه الأبناء. يُطلب عند الخروج من «وضع الأبناء».' }),
      el('span', { class: 'note', text: 'الرمز:' }), p1, el('span', { class: 'note', text: 'أعد كتابته:' }), p2, bio,
      nav(back, async () => { if (!/^\d{4}$/.test(p1.value)) { fbk(msg, 'bad', 'الرمز 4 أرقام.'); return; } if (p1.value !== p2.value) { fbk(msg, 'bad', 'الرمزان غير متطابقين.'); return; }
        if (useBio) { try { await bioRegister(); } catch (e) { fbk(msg, 'bad', 'لم يتم تسجيل البصمة/الوجه. يمكنك المتابعة بالرمز فقط.'); return; } } else LS.set('fam_bio', null);
        msg.innerHTML = ''; onDone(await sha('mj:' + ACC.user.uid + ':' + p1.value), useBio); }, 'حفظ القفل ←')]; }
  function drawLock(id) { box.append(...lockStep(async pinH => { try { await call('devAdmin', { op: 'update', kind: 'fam', dev: id, patch: { pinH } }); LS.set('fam_pin', pinH); fbk(msg, 'ok', '✓ حُفظ القفل.'); setTimeout(() => go('devices'), 700); } catch (e) { fbk(msg, 'bad', fnErr(e)); } }, () => go('devices')),
    el('button', { class: 'btn ghost sm', style: 'color:#c22a43', text: 'إزالة القفل (غير مستحسن)', onclick: async () => { try { await call('devAdmin', { op: 'update', kind: 'fam', dev: id, patch: { pinH: '' } }); LS.set('fam_pin', null); LS.set('fam_bio', null); LS.set('fam_mode', null); go('devices'); } catch (e) { fbk(msg, 'bad', fnErr(e)); } } })); }
  async function drawQR() {
    const names = st.pids.map(p => K[p].name).join(' و');
    box.append(el('b', { text: '📷 اربط الهاتف المشترك' }), el('div', { class: 'lk-steps' },
      el('p', { class: 'note', text: '1) على الهاتف المشترك افتح mujtahid.ly ← «دخول» ← «🧒 أنا طالب، عندي رمز»، ثم امسح رمز QR أو اكتب الأرقام.' }),
      el('p', { class: 'note', text: '2) يُربط الهاتف بـ ' + names + ' دفعة واحدة' + (st.mode === 'sched' ? '، ويُطبَّق جدولهم مباشرة.' : '، ويختار كل منهم اسمه عند الفتح.') })));
    const out = el('div', { class: 'stack', style: 'align-items:center' }, el('span', { class: 'note', text: '⏳ جارٍ إنشاء الرمز…' })); box.append(out, nav(() => { st.step = st.mode === 'open' ? 1 : 2; draw(); }, null));
    try { const r = await call('createLinkCode', { pids: st.pids, ...(st.mode === 'sched' ? { sched: st.S, schedOn: true } : {}) }); out.innerHTML = '';
      const qr = el('div', { class: 'qrbox' }), left = el('span', { class: 'note' });
      out.append(el('div', { class: 'linkcode', dir: 'ltr', text: r.code.slice(0, 3) + ' ' + r.code.slice(3) }), qr, left);
      const t = setInterval(() => { const m = Math.max(0, r.exp - Date.now()); left.textContent = m ? 'صالح لمدة ' + Math.ceil(m / 60000) + ' دقيقة' : 'انتهت صلاحية الرمز — ارجع وأنشئ رمزاً جديداً'; if (!m || !out.isConnected) clearInterval(t); }, 1000);
      C.loadQR().then(Q => { new Q(qr, { text: location.origin + location.pathname + '#link-' + r.code, width: 200, height: 200, correctLevel: Q.CorrectLevel.M }); }).catch(() => {});
      // ننتظر ظهور الجهاز ثم نعرض النجاح
      const t0 = Date.now(); const poll = setInterval(async () => { if (!out.isConnected || Date.now() - t0 > 15 * 60000) { clearInterval(poll); return; }
        try { const L = await call('devAdmin', { op: 'list' }); const D = L.devices.find(d => d.kind === 'kid' && st.pids.every(p => d.pids.includes(p)) && (d.at || d.last || 0) >= t0 - 60000);
          if (D) { clearInterval(poll); box.innerHTML = ''; box.append(el('div', { class: 'panel stack', style: 'text-align:center' }, el('div', { style: 'font-size:3rem', text: '✅' }), el('b', { text: 'رُبط الهاتف المشترك بـ ' + names }), el('button', { class: 'btn sun', text: 'إلى «أجهزتي»', onclick: () => go('devices') }))); } } catch (e) {} }, 5000);
    } catch (e) { out.innerHTML = ''; fbk(msg, 'bad', conflict(e)); } }
  function drawOwn() { box.append(el('p', { class: 'note', text: 'اختر الابن الذي له هاتف خاص، ثم امسح رمز QR من هاتفه. كرّر ذلك لكل ابن له هاتف.' }),
    el('div', { class: 'wz-kids' }, ...kids.map(k => el('button', { class: 'wz-kid', onclick: () => go('linkkid-' + k.id) }, el('span', { class: 'av', text: AV(k.avatar) }), el('b', { text: k.name }), el('small', { text: '📱 اربط هاتفه' })))),
    nav(() => go('devices'), null)); }
  draw();
}
