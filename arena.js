// المجتهد — ساحة المسابقات المباشرة (رياضيات): #arena و #arena-<cid>
// مسابقات مبرمجة في مواعيد ثابتة، 6 مستويات، الأسرع والأدق يفوز، أوسمة ولوحة أبطال
export default function runArena(D, h) {
  const { el, go, store, root, bar } = D;
  const ACC = window.ACC || {};
  const call = (n, d) => ACC.call(n, d);
  const err = e => (e && e.message && !/^internal$/i.test(e.message)) ? e.message : 'تعذّر الاتصال بالخادم. حاول لاحقاً.';
  let off = 0; const now = () => Date.now() + off; const sync = r => { if (r && r.now) off = r.now - Date.now(); };
  const timers = new Set(); const later = (f, ms) => { const t = setTimeout(() => { timers.delete(t); f(); }, Math.max(0, ms)); timers.add(t); return t; };
  const alive = () => location.hash.replace('#', '') === h;
  const stopAll = () => { timers.forEach(clearTimeout); timers.clear(); };
  window.addEventListener('hashchange', stopAll, { once: true });
  const MED = ['', '🥇', '🥈', '🥉'];
  const LVC = ['', '#22c55e', '#0ea5e9', '#8b5cf6', '#f59e0b', '#ef4444', '#111827'];
  const css = `.ar{display:flex;flex-direction:column;gap:12px;padding-bottom:30px}.ar h2{margin:0;font-family:var(--f-display);text-align:center}.ar .sub{color:var(--muted);text-align:center;margin:0;line-height:1.8}
.ar .hero{border-radius:22px;padding:16px;color:#fff;background:linear-gradient(135deg,#1e3a8a,#7c3aed);text-align:center;display:flex;flex-direction:column;gap:6px}
.ar .hero .cd{font-size:2.3rem;font-weight:800;direction:ltr;font-family:var(--f-display);letter-spacing:1px}
.ar .slot{border:1px solid var(--line);background:var(--card);border-radius:18px;padding:12px;display:flex;flex-direction:column;gap:8px}
.ar .slot>b{display:flex;justify-content:space-between;gap:8px}.ar .slot>b small{color:var(--muted);font-weight:600}
.ar .lvs{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.ar .lvc{border:2px solid var(--line);border-radius:14px;padding:9px;display:flex;flex-direction:column;gap:5px;background:var(--bg)}
.ar .lvc b{font-size:.92rem}.ar .lvc small{color:var(--muted);font-size:.74rem}.ar .lvc .seat{height:6px;background:var(--line);border-radius:4px;overflow:hidden}.ar .lvc .seat i{display:block;height:100%}
.ar .lvc button{font:inherit;font-weight:700;border-radius:10px;border:0;padding:7px;cursor:pointer;color:#fff}.ar .lvc button[disabled]{background:var(--line)!important;color:var(--muted);cursor:not-allowed}
.ar .lvc.mine{border-color:#16a34a;background:color-mix(in srgb,#16a34a 8%,var(--card))}
.ar .q{font-size:3rem;font-weight:800;text-align:center;direction:ltr;font-family:var(--f-display);margin:4px 0;unicode-bidi:isolate}
.ar .opts{display:grid;grid-template-columns:1fr 1fr;gap:10px}.ar .opts button{font:inherit;font-size:1.9rem;font-weight:800;padding:16px 0;border-radius:16px;border:2px solid var(--line);background:var(--card);color:inherit;cursor:pointer;direction:ltr}
.ar .opts button[disabled]{cursor:default}.ar .ok{background:#16a34a!important;color:#fff!important;border-color:#16a34a!important}.ar .no{background:#dc2626!important;color:#fff!important;border-color:#dc2626!important}
.ar .tm{height:12px;background:var(--line);border-radius:8px;overflow:hidden}.ar .tm i{display:block;height:100%;background:linear-gradient(90deg,#ef4444,#f59e0b,#16a34a);transition:width .2s linear}
.ar .meta{display:flex;justify-content:space-between;color:var(--muted);font-weight:700}
.ar .row{display:flex;gap:8px;align-items:center;border:1px solid var(--line);background:var(--card);border-radius:12px;padding:8px 10px}.ar .row.me{border-color:var(--sea);background:color-mix(in srgb,var(--sea) 10%,var(--card))}
.ar .row .n{min-width:30px;text-align:center;font-weight:800}.ar .row .x{flex:1;min-width:0}.ar .row .x small{display:block;color:var(--muted);font-size:.74rem}
.ar .pod{display:flex;align-items:flex-end;justify-content:center;gap:8px;margin-top:8px}.ar .pod div{flex:1;max-width:120px;text-align:center;border-radius:14px 14px 0 0;padding:8px 4px;color:#fff;font-weight:700}
.ar .pod b{display:block;font-size:2rem}.ar .pod small{display:block;font-size:.72rem;opacity:.9}
.ar .chips{display:flex;flex-wrap:wrap;gap:6px}.ar .chip{border:1px solid var(--line);border-radius:999px;padding:3px 10px;font-size:.8rem;background:var(--card)}
.ar input[type=text]{font:inherit;padding:10px;border-radius:12px;border:1px solid var(--line);background:var(--card);color:inherit;width:100%;box-sizing:border-box}
.ar .tabs{display:flex;gap:6px}.ar .tabs button{flex:1}`;
  if (!document.getElementById('ar-css')) document.head.append(el('style', { id: 'ar-css', text: css }));
  const page = (t, s, back) => { stopAll(); root.innerHTML = ''; root.append(bar(t, s || 'ساحة المسابقات', back || 'home')); const w = el('section', { class: 'ar' }); root.append(w); return w; };
  const note = (w, t, cls) => { const n = el('div', { class: 'feedback ' + (cls || 'info'), text: t }); w.append(n); return n; };
  const hm = t => new Date(t).toLocaleTimeString('ar-LY-u-nu-latn', { hour: 'numeric', minute: '2-digit', timeZone: 'Africa/Tripoli' });
  const dayLbl = t => { const f = x => new Date(x).toLocaleDateString('en-CA', { timeZone: 'Africa/Tripoli' }); const d = f(t), n = f(now());
    return d === n ? 'اليوم' : d === f(now() + 864e5) ? 'غداً' : new Date(t).toLocaleDateString('ar-LY-u-nu-latn', { weekday: 'long', day: 'numeric', month: 'numeric', timeZone: 'Africa/Tripoli' }); };
  const cd = ms => { ms = Math.max(0, ms); const s = Math.floor(ms / 1000), H = Math.floor(s / 3600), M = Math.floor(s % 3600 / 60), S = s % 60; return (H ? H + ':' : '') + String(M).padStart(H ? 2 : 1, '0') + ':' + String(S).padStart(2, '0'); };
  const eq = (a, op, b) => '⁦' + a + ' ' + op + ' ' + b + ' = ?⁩';
  const isGuest = () => !ACC.user || (ACC.user.isAnonymous && !ACC.kid);
  const me = () => store.get('arena_me', null) || { name: (ACC.profile && ACC.profile.name) || '', city: '', school: '', show: true };
  let AC = null; const beep = ok => { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); const t = AC.currentTime;
    (ok ? [660, 990] : [220, 180]).forEach((f, i) => { const o = AC.createOscillator(), g = AC.createGain(); o.frequency.value = f; o.type = ok ? 'sine' : 'square';
      g.gain.setValueAtTime(.0001, t + i * .09); g.gain.exponentialRampToValueAtTime(ok ? .25 : .08, t + i * .09 + .02); g.gain.exponentialRampToValueAtTime(.0001, t + i * .09 + .18);
      o.connect(g).connect(AC.destination); o.start(t + i * .09); o.stop(t + i * .09 + .2); }); } catch (e) {} };

  // ---------------- الساحة الرئيسية ----------------
  async function hub() {
    const w = page('🏟️ ساحة المسابقات', 'رياضيات — مباشر'); const msg = note(w, 'جارٍ التحميل…');
    let r; try { r = await call('arena', { op: 'hub', pid: ACC.pid || '' }); sync(r); } catch (e) { msg.className = 'feedback bad'; msg.textContent = err(e); return; }
    msg.remove();
    if (r.off) { w.append(el('div', { class: 'hero' }, el('b', { style: 'font-size:1.3rem', text: '🏟️ ساحة المسابقات قريباً!' }), el('span', { text: 'مسابقات رياضيات مباشرة بين الطلاب من كل ليبيا — الأسرع والأدق يفوز بالأوسمة.' }))); return; }
    const C = r.cfg, LV = r.LV || [];
    r.slots = r.slots || []; const first = r.slots.find(s => s.end > now()) || r.slots[0];
    if (!first) { w.append(el('div', { class: 'hero' }, el('b', { style: 'font-size:1.2rem', text: '🏟️ لا توجد مسابقات مجدولة الآن' }), el('span', { text: 'تابعنا، المسابقة القادمة تُعلن قريباً.' }))); return; }
    const cdEl = el('div', { class: 'cd' }); const live = first && now() >= first.at;
    w.append(el('div', { class: 'hero' }, el('b', { text: live ? '🔴 مسابقة جارية الآن' : '⏳ المسابقة القادمة ' + dayLbl(first.at) + ' الساعة ' + hm(first.at) }), cdEl,
      el('small', { text: C.n + ' سؤالاً · ' + C.secs + ' ثانية لكل سؤال · من ' + C.minP + ' إلى ' + C.seats + ' متسابقاً' })));
    const tick = () => { if (!alive() || !cdEl.isConnected) return; const left = first.at - now(); cdEl.textContent = left > 0 ? cd(left) : 'الآن!'; if (left > 0) later(tick, 1000); else later(hub, 1500); };
    if (!live) tick(); else cdEl.textContent = '⚡';
    w.append(el('p', { class: 'sub', text: 'اختر مستواك واحجز مقعدك. كل إجابة صحيحة = نقاط أكثر كلما كنت أسرع. الثلاثة الأوائل يفوزون بأوسمة 🥇🥈🥉' }));
    if (isGuest()) w.append(el('div', { class: 'feedback info' }, 'للمشاركة سجّل الدخول (مجاناً). ', el('button', { class: 'btn sm', text: 'تسجيل / دخول', onclick: () => go('account') })));
    if (C.who === 'sub') w.append(el('span', { class: 'note', style: 'text-align:center', text: '⭐ المسابقات حالياً للمشتركين.' }));
    const minLv = isGuest() ? 1 : (r.minLv || 1);
    if (!isGuest() && r.grade) w.append(el('span', { class: 'note', style: 'text-align:center', text: 'مستواك من ' + (LV[minLv] || '') + ' فما فوق — تقدر تتحدى مستوى أعلى 💪' }));
    const anyMine = r.slots.some(s => s.levels.some(l => l.mine));
    for (const s of r.slots) {
      const box = el('div', { class: 'slot' }, el('b', {}, el('span', { text: '🕒 ' + dayLbl(s.at) + ' — ' + hm(s.at) }), el('small', { text: now() >= s.at ? (now() < s.end ? 'جارية' : 'انتهت') : now() < s.openAt ? 'الحجز يُفتح ' + hm(s.openAt) : 'الحجز مفتوح' })));
      const g = el('div', { class: 'lvs' }); box.append(g);
      const slotMine = s.levels.find(l => l.mine);
      s.levels.forEach(l => { const full = l.count >= C.seats, started = now() >= s.at, closed = now() < s.openAt, low = l.lv < minLv;
        let b;
        if (l.mine) b = el('button', { style: 'background:#16a34a', text: started ? '⚡ ادخل الآن' : '✓ محجوز — الغرفة', onclick: () => go('arena-' + l.cid) });
        else b = el('button', { style: 'background:' + LVC[l.lv], disabled: started || closed || full || low || !!slotMine || isGuest(),
          text: started ? 'بدأت' : full ? 'مكتمل' : low ? 'أقل من مستواك' : slotMine ? 'حجزت مستوى آخر' : closed ? '🔒 لم يُفتح' : 'احجز مقعدك', onclick: () => book(s, l, LV, C) });
        g.append(el('div', { class: 'lvc' + (l.mine ? ' mine' : ''), style: 'border-color:' + (l.mine ? '#16a34a' : LVC[l.lv] + '55') }, el('b', { text: LV[l.lv] || ('المستوى ' + l.lv) }),
          el('small', { text: '👥 ' + l.count + ' / ' + C.seats + (l.status === 'cancelled' ? ' · أُلغيت (عدد قليل)' : l.status === 'done' ? ' · انتهت' : '') }),
          el('div', { class: 'seat' }, el('i', { style: 'width:' + Math.round(l.count * 100 / C.seats) + '%;background:' + LVC[l.lv] })), b)); });
      w.append(box);
    }
    if (!anyMine && !isGuest()) w.append(el('span', { class: 'note', style: 'text-align:center', text: 'تصلك رسالة تذكير قبل المسابقة بدقائق (إذا فعّلت الإشعارات).' }));
    // خزانة أوسمتي
    if (!isGuest()) { const m = r.mine || []; const cnt = k => m.filter(x => x.rank === k).length;
      w.append(el('div', { class: 'slot' }, el('b', {}, el('span', { text: '🎖️ خزانة أوسمتي' }), el('small', { text: m.length + ' وسام' })),
        m.length ? el('div', { class: 'chips' }, el('span', { class: 'chip', text: '🥇 ' + cnt(1) }), el('span', { class: 'chip', text: '🥈 ' + cnt(2) }), el('span', { class: 'chip', text: '🥉 ' + cnt(3) })) : el('span', { class: 'note', text: 'لا أوسمة بعد — شارك في أول مسابقة واكسب وسامك الأول!' }),
        ...m.slice(0, 8).map(x => el('div', { class: 'row' }, el('span', { class: 'n', text: MED[x.rank] }), el('span', { class: 'x' }, el('b', { text: LV[x.lv] || '' }), el('small', { text: dayLbl(x.at) + ' ' + hm(x.at) })), el('b', { text: x.score + ' ن' }))))); }
    // لوحة الأبطال
    const H = r.heroes || [];
    const hb = el('div', { class: 'slot' }, el('b', {}, el('span', { text: '🏆 لوحة الأبطال' }), el('small', { text: 'آخر 7 أيام' })));
    if (!H.length) hb.append(el('span', { class: 'note', text: 'كن أول بطل على اللوحة! 🌟' }));
    const lvTab = el('div', { class: 'chips' }); let pick = 0;
    const drawH = () => { [...hb.querySelectorAll('.row,.more')].forEach(x => x.remove()); const L = H.filter(x => !pick || x.lv === pick).slice(0, 15);
      L.forEach(x => hb.append(el('div', { class: 'row' }, el('span', { class: 'n', text: MED[x.rank] }), el('span', { class: 'x' }, el('b', { text: x.name }), el('small', { text: '📍 ' + x.city + (x.school ? ' · 🏫 ' + x.school : '') + ' · ' + (LV[x.lv] || '') + ' · ' + dayLbl(x.at) })), el('b', { text: x.score + ' ن' })))); };
    if (H.length) { hb.append(lvTab); const lvs = [...new Set(H.map(x => x.lv))].sort();
      const tabs = () => { lvTab.innerHTML = ''; [0, ...lvs].forEach(v => lvTab.append(el('button', { class: 'btn sm ' + (v === pick ? '' : 'ghost'), text: v ? 'م' + v : 'الكل', onclick: () => { pick = v; tabs(); drawH(); } }))); };
      tabs(); drawH(); }
    w.append(hb);
  }

  // ---------------- الحجز ----------------
  function book(s, l, LV, C) {
    const w = page('🎟️ حجز مقعد', LV[l.lv], 'arena'); const m = me();
    const name = el('input', { type: 'text', maxlength: 30, value: m.name, placeholder: 'اسم المتسابق (يظهر للآخرين)' });
    const city = el('input', { type: 'text', maxlength: 30, value: m.city, placeholder: 'المدينة — مثلاً: طرابلس' });
    const school = el('input', { type: 'text', maxlength: 50, value: m.school, placeholder: 'اسم المدرسة (اختياري)' });
    const show = el('input', { type: 'checkbox' }); show.checked = m.show !== false;
    const msg = el('div');
    const btn = el('button', { class: 'btn sun', text: '✅ احجز مقعدي', onclick: async () => {
      const d = { name: name.value.trim(), city: city.value.trim(), school: school.value.trim(), show: show.checked };
      if (d.name.length < 2) { msg.className = 'feedback bad'; msg.textContent = 'اكتب الاسم.'; return; }
      if (d.city.length < 2) { msg.className = 'feedback bad'; msg.textContent = 'اكتب المدينة.'; return; }
      store.set('arena_me', d); btn.disabled = true; msg.className = 'feedback info'; msg.textContent = 'جارٍ الحجز…';
      try { const r = await call('arena', { op: 'book', at: s.at, lv: l.lv, pid: ACC.pid || '', ...d }); D.cheer && D.cheer('win'); go('arena-' + r.cid); }
      catch (e) { btn.disabled = false; msg.className = 'feedback bad'; msg.textContent = err(e); } } });
    w.append(el('div', { class: 'slot' }, el('b', {}, el('span', { text: LV[l.lv] }), el('small', { text: dayLbl(s.at) + ' — ' + hm(s.at) })),
      el('label', { text: 'الاسم' }), name, el('label', { text: 'المدينة' }), city, el('label', { text: 'المدرسة (اختياري)' }), school,
      el('label', { style: 'display:flex;gap:8px;align-items:center' }, show, el('span', { text: 'أظهر اسمي في لوحة الأبطال إذا فزت' })), btn, msg),
      el('span', { class: 'note', text: 'احضر قبل الموعد بدقيقة. إذا لم يكتمل الحد الأدنى (' + C.minP + ' متسابقين) تُلغى المسابقة وتقدر تحجز الموعد القادم.' }));
  }

  // ---------------- الغرفة واللعب ----------------
  async function room(cid) {
    const w = page('🏟️ غرفة المسابقة', '', 'arena'); const msg = note(w, 'جارٍ التحميل…');
    let R; try { R = await call('arena', { op: 'room', cid }); sync(R); } catch (e) { msg.className = 'feedback bad'; msg.textContent = err(e); return; }
    msg.remove();
    const end = R.at + R.n * (R.secs + R.gap) * 1000;
    if (R.status === 'cancelled') { w.append(el('div', { class: 'hero', style: 'background:linear-gradient(135deg,#475569,#334155)' }, el('b', { text: 'أُلغيت هذه المسابقة' }), el('span', { text: 'لم يكتمل الحد الأدنى من المتسابقين. احجز في الموعد القادم 💪' })), el('button', { class: 'btn', text: '← ساحة المسابقات', onclick: () => go('arena') })); return; }
    if (!R.joined) { w.append(note(w, now() < R.at ? 'لم تحجز في هذه المسابقة.' : 'هذه المسابقة بدأت أو انتهت.', 'info'), el('button', { class: 'btn', text: '← ساحة المسابقات', onclick: () => go('arena') })); return; }
    if (R.status === 'done' || now() > end) return result(cid, R);
    if (now() >= R.at) return play(cid, R);
    // صالة الانتظار
    const cdEl = el('div', { class: 'cd' }), list = el('div', { class: 'chips' }), cnt = el('small');
    w.append(el('div', { class: 'hero' }, el('b', { text: R.lvName }), el('span', { text: 'تبدأ ' + dayLbl(R.at) + ' الساعة ' + hm(R.at) }), cdEl, cnt),
      el('p', { class: 'sub', text: R.n + ' سؤالاً، لكل سؤال ' + R.secs + ' ثانية. الإجابة الصحيحة الأسرع = نقاط أكثر (حتى 1000 نقطة للسؤال). ابقَ في هذه الصفحة — ستبدأ تلقائياً.' }),
      el('b', { text: '👥 المتسابقون' }), list,
      el('button', { class: 'btn ghost', text: 'إلغاء حجزي', onclick: async e => { const b = e.currentTarget; if (b.dataset.c !== '1') { b.dataset.c = '1'; b.textContent = 'اضغط مرة أخرى لتأكيد الإلغاء'; return; }
        try { await call('arena', { op: 'cancel', cid }); go('arena'); } catch (x) { b.textContent = err(x); } } }));
    const drawP = X => { list.innerHTML = ''; X.players.forEach(p => list.append(el('span', { class: 'chip', text: p.name + ' · ' + p.city }))); cnt.textContent = X.count + ' / ' + X.seats + ' متسابق' + (X.count < X.minP ? ' — نحتاج ' + X.minP + ' على الأقل' : ''); };
    drawP(R);
    let lastT = -1; const tick = () => { if (!alive()) return; const left = R.at - now(); cdEl.textContent = cd(left); { const sc = Math.ceil(left / 1000); if (sc <= 10 && sc !== lastT && sc >= 0) { lastT = sc; D.tick && D.tick(sc); } } if (left <= 0) { play(cid, R); return; } later(tick, 250); };
    const poll = async () => { if (!alive() || now() >= R.at - 3000) return; try { const X = await call('arena', { op: 'room', cid }); sync(X); if (X.status === 'cancelled') return room(cid); drawP(X); } catch (e) {} later(poll, 8000); };
    tick(); later(poll, 8000);
  }

  async function play(cid, R) {
    const w = page('⚡ ' + R.lvName, 'مسابقة مباشرة', 'arena');
    const head = el('div', { class: 'meta' }), tm = el('div', { class: 'tm' }, el('i', { style: 'width:100%' })), q = el('div', { class: 'q' }), opts = el('div', { class: 'opts' }), fb = el('div', { style: 'min-height:28px;text-align:center;font-weight:800' }), side = el('div', { class: 'stack' });
    w.append(head, tm, q, opts, fb, side);
    let score = 0, right = 0;
    const T = i => R.at + i * (R.secs + R.gap) * 1000;
    const drawHead = i => { head.innerHTML = ''; head.append(el('span', { text: 'السؤال ' + (i + 1) + ' / ' + R.n }), el('span', { text: '✔️ ' + right }), el('span', { text: '⭐ ' + score })); };
    const board = async i => { try { const B = await call('arena', { op: 'board', cid, i }); sync(B); side.innerHTML = '';
      side.append(el('b', { text: 'ترتيبك الآن: ' + B.rank + ' من ' + B.count }), ...B.top.slice(0, 5).map((x, k) => el('div', { class: 'row' + (x.me ? ' me' : '') }, el('span', { class: 'n', text: MED[k + 1] || String(k + 1) }), el('span', { class: 'x' }, el('b', { text: x.name }), el('small', { text: x.city })), el('b', { text: x.score }))));
      score = B.score; right = B.right; } catch (e) {} };
    const ask = async i => {
      if (!alive()) return; if (i >= R.n) return later(() => result(cid, R), 1500);
      const openAt = T(i), closeAt = openAt + R.secs * 1000;
      if (now() > closeAt) return ask(i + 1);
      if (now() < openAt - 300) return later(() => ask(i), openAt - now() - 300);
      drawHead(i); q.textContent = '…'; opts.innerHTML = ''; fb.textContent = '';
      let Q; try { Q = await call('arena', { op: 'q', cid, i }); sync(Q); } catch (e) { fb.textContent = err(e); return later(() => ask(i), 1500); }
      if (Q.cancelled) return room(cid);
      if (Q.wait) return later(() => ask(i), Q.wait);
      q.textContent = eq(Q.a, Q.op, Q.b); let done = false;
      let ended = false, lastS = -1; const bars = () => { if (ended || !alive()) return; const left = Q.closeAt - now(); { const sc = Math.ceil(left / 1000); if (sc !== lastS && sc >= 0) { lastS = sc; if (!done) D.tick && D.tick(sc); } } tm.firstChild.style.width = Math.min(100, Math.max(0, left / (R.secs * 10))) + '%'; if (left > 0) later(bars, 100); else { ended = true; if (!done) { done = true; [...opts.children].forEach(b => b.disabled = true); fb.textContent = '⏰ انتهى الوقت'; } } };
      bars();
      Q.opts.forEach(v => opts.append(el('button', { text: String(v), onclick: async e => { if (done) return; done = true; const b = e.currentTarget; [...opts.children].forEach(x => x.disabled = true); b.style.outline = '3px solid var(--sea)';
        try { const A = await call('arena', { op: 'a', cid, i, v }); sync(A);
          if (A.late) fb.textContent = '⏰ وصلت الإجابة متأخرة';
          else if (A.dup) fb.textContent = 'أجبت مسبقاً';
          else { beep(A.ok); [...opts.children].forEach(x => { if (+x.textContent === A.right) x.classList.add('ok'); }); if (!A.ok) b.classList.add('no');
            if (A.ok) { right++; score += A.pts; fb.textContent = '✅ +' + A.pts + ' نقطة'; } else fb.textContent = '❌ الجواب ' + A.right; drawHead(i); }
        } catch (x) { fb.textContent = err(x); } } })));
      later(() => board(i), Math.max(0, closeAt - now()) + 900);
      later(() => ask(i + 1), Math.max(0, T(i + 1) - now() - 300));
    };
    ask(Math.max(0, Math.floor((now() - R.at) / ((R.secs + R.gap) * 1000))));
  }

  async function result(cid, R) {
    const w = page('🏁 النتيجة', R.lvName, 'arena'); const msg = note(w, 'جارٍ حساب النتائج…');
    let B, k = 0; while (alive() && k++ < 6) { try { B = await call('arena', { op: 'board', cid, i: R.n }); sync(B); if (B.done) break; } catch (e) { msg.className = 'feedback bad'; msg.textContent = err(e); } await new Promise(r => later(r, 2500)); }
    if (!B) return; msg.remove();
    const t = B.top; const col = ['#f59e0b', '#94a3b8', '#b45309'];
    const pod = el('div', { class: 'pod' }); [1, 0, 2].forEach(j => { if (!t[j]) return; pod.append(el('div', { style: 'background:' + col[j] + ';min-height:' + [135, 115, 100][j] + 'px' }, el('b', { text: MED[j + 1] }), el('span', { text: t[j].name }), el('small', { text: t[j].city + ' · ' + t[j].score }))); });
    const won = B.rank <= 3 && B.score > 0;
    w.append(el('div', { class: 'hero', style: won ? 'background:linear-gradient(135deg,#f59e0b,#ef4444)' : '' }, el('b', { style: 'font-size:1.3rem', text: won ? MED[B.rank] + ' مبروك! المركز ' + B.rank : 'ترتيبك ' + B.rank + ' من ' + B.count }),
      el('span', { text: '⭐ ' + B.score + ' نقطة · ✔️ ' + B.right + ' / ' + R.n + ' إجابة صحيحة' }), won ? el('small', { text: 'أُضيف الوسام إلى خزانة أوسمتك 🎖️' }) : el('small', { text: 'تدرّب أكثر وارجع في المسابقة القادمة 💪' })), pod);
    if (won) { D.cheer && D.cheer('win'); }
    t.forEach((x, j) => w.append(el('div', { class: 'row' + (x.me ? ' me' : '') }, el('span', { class: 'n', text: MED[j + 1] || String(j + 1) }), el('span', { class: 'x' }, el('b', { text: x.name }), el('small', { text: x.city })), el('b', { text: x.score }))));
    const share = (won ? MED[B.rank] + ' فزت بالمركز ' + B.rank : '🏟️ شاركت') + ' في مسابقة الرياضيات المباشرة على منصة المجتهد (' + R.lvName + ') بـ' + B.score + ' نقطة! تحدّاني: ' + location.origin + '/#arena';
    w.append(el('button', { class: 'btn', style: 'background:#25d366;border-color:#25d366;color:#fff', text: '📲 شارك على واتساب', onclick: () => window.open('https://wa.me/?text=' + encodeURIComponent(share), '_blank') }),
      el('button', { class: 'btn ghost', text: '✖️ تدرّب على جدول الضرب', onclick: () => go('times') }),
      el('button', { class: 'btn sun', text: '🏟️ احجز المسابقة القادمة', onclick: () => go('arena') }));
  }

  const m = /^arena-(\d{10}_L[1-6])$/.exec(h);
  if (m) room(m[1]); else hub();
}
