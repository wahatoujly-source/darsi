// المجتهد — منصة حفظ جدول الضرب (1 إلى 12) مجانية للجميع: #times و #times-N
// لكل جدول: تعلّم (اسمع/غطِّ النواتج) + 5 مستويات تُفتح بالتدريج + نجوم إتقان، ومراجعة الأخطاء، وتحدّي كل الجداول
export default function runTimes(D, h) {
  const { el, go, store, root, bar } = D;
  const W = ['صفر', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة', 'عشرة', 'أحد عشر', 'اثنا عشر'];
  const R = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const shuf = a => a.map(x => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map(x => x[1]);
  const PK = 'tt_' + ((window.ACC && ACC.pid) || 'g');
  const P = store.get(PK, {}); // {N: {lv: أعلى مستوى ناجح, best: أفضل سباق, stars}}
  const save = () => store.set(PK, P);
  const MISS = 'ttm_' + ((window.ACC && ACC.pid) || 'g');
  const LV = [['🟢', 'بالترتيب', 'الأسئلة بالترتيب من 1 إلى 12'], ['🟡', 'عشوائي', 'نفس الجدول بترتيب عشوائي'], ['🟠', 'الرقم الناقص', 'مثل: 6 × ؟ = 18'], ['🔴', 'اكتب الجواب', 'بدون اختيارات — تكتب الناتج بنفسك'], ['⚡', 'سباق الدقيقة', 'أكبر عدد من الإجابات الصحيحة في 60 ثانية']];
  const css = `.tt{display:flex;flex-direction:column;gap:12px;padding-bottom:30px}.tt h2{margin:0;font-family:var(--f-display);text-align:center}.tt .sub{color:var(--muted);text-align:center;margin:0;line-height:1.8}
.tt .tabs{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.tt .tb{border:2px solid var(--line);background:var(--card);border-radius:20px;padding:12px 6px;font:inherit;color:inherit;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:4px}
.tt .tb b{font-size:1.9rem;font-family:var(--f-display);line-height:1}.tt .tb small{color:var(--muted);font-size:.72rem}.tt .tb .st{font-size:.85rem;letter-spacing:1px}
.tt .tb.done{border-color:#16a34a;background:color-mix(in srgb,#16a34a 8%,var(--card))}
.tt .lv{display:flex;align-items:center;gap:10px;border:2px solid var(--line);background:var(--card);border-radius:16px;padding:12px;font:inherit;color:inherit;cursor:pointer;text-align:start;width:100%}
.tt .lv[disabled]{opacity:.45;cursor:not-allowed}.tt .lv .e{font-size:1.6rem}.tt .lv b{display:block}.tt .lv small{color:var(--muted)}
.tt .row12{display:grid;grid-template-columns:1fr 1fr;gap:6px}.tt .fact{border:1px solid var(--line);background:var(--card);border-radius:12px;padding:10px;font:inherit;font-size:1.15rem;font-weight:800;direction:ltr;color:inherit;cursor:pointer}
.tt .fact i{font-style:normal;color:var(--sea)}.tt .fact.hid i{color:transparent;background:var(--line);border-radius:6px}
.tt .q{font-size:3.1rem;font-weight:800;text-align:center;direction:ltr;font-family:var(--f-display);margin:6px 0}.tt .q u{text-decoration:none;color:var(--sea);border-bottom:4px solid var(--sea);padding:0 10px}
.tt .ans{display:grid;grid-template-columns:1fr 1fr;gap:10px}.tt .ans button,.tt .kp button{font:inherit;font-size:1.9rem;font-weight:800;padding:14px 0;border-radius:16px;border:2px solid var(--line);background:var(--card);color:inherit;cursor:pointer}
.tt .ok{background:#16a34a!important;color:#fff!important;border-color:#16a34a!important}.tt .no{background:#dc2626!important;color:#fff!important;border-color:#dc2626!important}
.tt .kp{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;direction:ltr}.tt .kp button{padding:10px 0;font-size:1.6rem}.tt .kp .go{background:var(--sea);color:#fff;border-color:var(--sea)}
.tt .disp{font-size:2.4rem;font-weight:800;text-align:center;min-height:56px;border:2px dashed var(--line);border-radius:16px;direction:ltr;padding:4px}
.tt .prog{height:10px;background:var(--line);border-radius:6px;overflow:hidden}.tt .prog i{display:block;height:100%;background:linear-gradient(90deg,#f59e0b,#16a34a);transition:width .3s}
.tt .meta{display:flex;justify-content:space-between;color:var(--muted);font-weight:700}`;
  if (!document.getElementById('tt-css')) document.head.append(el('style', { id: 'tt-css', text: css }));
  const page = (t, s, back) => { root.innerHTML = ''; root.append(bar(t, s || 'مجاني للجميع', back || 'home')); const w = el('section', { class: 'tt' }); root.append(w); return w; };
  const stars = n => '⭐'.repeat(n) + '☆'.repeat(3 - n);
  const starsOf = N => { const p = P[N] || {}; return (p.lv >= 2 ? 1 : 0) + (p.lv >= 4 ? 1 : 0) + ((p.best || 0) >= 20 ? 1 : 0); };
  const say = t => { try { D.speakAr && D.speakAr(t, { force: true }); } catch (e) {} };
  const sayFact = (a, b) => say(W[a] + ' في ' + W[b] + ' يساوي ' + (a * b));
  let AC = null; const beep = ok => { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); const t = AC.currentTime;
    (ok ? [660, 990] : [220, 180]).forEach((f, i) => { const o = AC.createOscillator(), g = AC.createGain(); o.frequency.value = f; o.type = ok ? 'sine' : 'square';
      g.gain.setValueAtTime(.0001, t + i * .09); g.gain.exponentialRampToValueAtTime(ok ? .25 : .08, t + i * .09 + .02); g.gain.exponentialRampToValueAtTime(.0001, t + i * .09 + .18);
      o.connect(g).connect(AC.destination); o.start(t + i * .09); o.stop(t + i * .09 + .2); }); } catch (e) {} };
  const miss = (a, b, add) => { let m = store.get(MISS, []); const k = a + 'x' + b; m = m.filter(x => x !== k); if (add) m.push(k); store.set(MISS, m.slice(-40)); };

  /* ---------- home: 12 tables ---------- */
  function home() {
    const w = page('✖️ جدول الضرب', 'احفظه خطوة بخطوة — مجاناً');
    const done = Object.keys(P).filter(n => starsOf(n) === 3).length;
    w.append(el('h2', { text: 'اختر الجدول' }), el('p', { class: 'sub', text: 'لكل جدول: تعلّم واسمع، ثم 5 مستويات. اجمع 3 نجوم في كل جدول لتصبح بطل جدول الضرب! 🏆 (' + done + ' من 12)' }));
    const g = el('div', { class: 'tabs' });
    for (let n = 1; n <= 12; n++) { const s = starsOf(n); g.append(el('button', { class: 'tb' + (s === 3 ? ' done' : ''), onclick: () => go('times-' + n) }, el('small', { text: 'جدول' }), el('b', { text: String(n) }), el('span', { class: 'st', text: stars(s) }))); }
    const m = store.get(MISS, []);
    w.append(g, el('button', { class: 'lv', onclick: () => quiz({ mode: 'all' }) }, el('span', { class: 'e', text: '🌟' }), el('span', {}, el('b', { text: 'تحدّي كل الجداول' }), el('small', { text: '20 سؤالاً من كل الجداول، تكتب الجواب بنفسك' }))),
      el('button', { class: 'lv', disabled: m.length ? null : '', onclick: () => quiz({ mode: 'miss' }) }, el('span', { class: 'e', text: '🔁' }), el('span', {}, el('b', { text: 'راجع أخطائي (' + m.length + ')' }), el('small', { text: m.length ? 'الأسئلة التي أخطأت فيها مؤخراً' : 'لا توجد أخطاء محفوظة — ممتاز!' }))),
      el('button', { class: 'lv', onclick: () => go('test') }, el('span', { class: 'e', text: '🧮' }), el('span', {}, el('b', { text: 'اختبر مستواك' }), el('small', { text: 'اختبار المستوى في الرياضيات' }))));
  }
  /* ---------- one table: learn + levels ---------- */
  function table(N) {
    const w = page('✖️ جدول ' + N, stars(starsOf(N)), 'times'); const p = P[N] || {};
    let hide = false; const facts = el('div', { class: 'row12' });
    const draw = () => { facts.innerHTML = ''; for (let b = 1; b <= 12; b++) facts.append(el('button', { class: 'fact' + (hide ? ' hid' : ''), onclick: e => { if (hide) e.currentTarget.classList.toggle('hid'); sayFact(N, b); } }, N + ' × ' + b + ' = ', el('i', { text: String(N * b) }))); };
    draw();
    w.append(el('b', { text: '📖 تعلّم الجدول' }), facts,
      el('div', { class: 'row', style: 'gap:8px;flex-wrap:wrap;justify-content:center' },
        el('button', { class: 'btn ghost sm', text: '🔊 اسمع الجدول كله', onclick: async () => { for (let b = 1; b <= 12; b++) { await D.speakAr(W[N] + ' في ' + W[b] + ' يساوي ' + (N * b), { force: true }); } } }),
        el('button', { class: 'btn ghost sm', text: '🙈 غطِّ النواتج واختبر نفسك', onclick: () => { hide = !hide; draw(); } })),
      el('b', { text: '🎯 المستويات' }));
    const admin = !!(window.ACC && ACC.isAdmin);
    LV.forEach(([e, t, d], i) => { const open = admin || i === 0 || (p.lv || 0) >= i; const ok = (p.lv || 0) > i;
      w.append(el('button', { class: 'lv', disabled: open ? null : '', onclick: () => quiz({ mode: 'lv', N, lv: i + 1 }) }, el('span', { class: 'e', text: open ? e : '🔒' }),
        el('span', { style: 'flex:1' }, el('b', { text: 'المستوى ' + (i + 1) + ': ' + t + (ok ? ' ✅' : '') }), el('small', { text: i === 4 && p.best ? d + ' — أفضل نتيجة: ' + p.best : d })))); });
    w.append(el('p', { class: 'sub', text: 'تنجح في المستوى بـ 11 من 12 على الأقل، فيُفتح الذي بعده. سباق الدقيقة: 20 إجابة صحيحة = النجمة الثالثة ⭐' + (admin ? ' — (كل المستويات مفتوحة لك كمدير)' : '') }));
  }
  /* ---------- quiz engine ---------- */
  function quiz(o) {
    const N = o.N, lv = o.lv || 4; const typed = o.mode !== 'lv' || lv >= 4, race = o.mode === 'lv' && lv === 5, missing = o.mode === 'lv' && lv === 3;
    let qs = [];
    if (o.mode === 'lv') { const bs = Array.from({ length: 12 }, (_, i) => i + 1); qs = (lv === 1 ? bs : shuf(bs)).map(b => [N, b]); if (lv >= 2 && lv !== 3) qs = qs.map(([a, b]) => Math.random() < .3 ? [b, a] : [a, b]); }
    if (o.mode === 'all') { const seen = new Set(); while (qs.length < 20) { const a = R(2, 12), b = R(2, 12), k = Math.min(a, b) + 'x' + Math.max(a, b); if (!seen.has(k)) { seen.add(k); qs.push([a, b]); } } }
    if (o.mode === 'miss') qs = shuf(store.get(MISS, []).map(k => k.split('x').map(Number))).slice(0, 20);
    const title = o.mode === 'lv' ? 'جدول ' + N + ' — ' + LV[lv - 1][1] : o.mode === 'all' ? 'تحدّي كل الجداول' : 'مراجعة أخطائي';
    const w = page(title, o.mode === 'lv' ? 'المستوى ' + lv : '', o.mode === 'lv' ? 'times-' + N : 'times');
    const prog = el('i', { style: 'width:0' }), meta = el('div', { class: 'meta' }), qEl = el('div', { class: 'q' }), area = el('div');
    w.append(el('div', { class: 'prog' }, prog), meta, qEl, area);
    let i = 0, sc = 0, cur = null, locked = false, val = ''; const t0 = Date.now(); let tmr = null;
    const end = () => { clearInterval(tmr); result({ o, sc, n: race ? sc : qs.length, secs: (Date.now() - t0) / 1000 }); };
    if (race) { let lastL = 61; tmr = setInterval(() => { if (!document.body.contains(w)) { clearInterval(tmr); return; } const left = 60 - Math.floor((Date.now() - t0) / 1000); if (left !== lastL && left >= 0) { lastL = left; D.tick && D.tick(left); } meta.lastChild && (meta.lastChild.textContent = '⏱️ ' + Math.max(0, left)); prog.style.width = ((60 - left) / 60 * 100) + '%'; if (left <= 0) end(); }, 250); }
    const disp = el('div', { class: 'disp' });
    const next = () => {
      if (!race && i >= qs.length) return end();
      if (race) { const b = R(1, 12); cur = Math.random() < .5 ? [N, b] : [b, N]; } else cur = qs[i];
      locked = false; val = ''; const [a, b] = cur, c = a * b;
      if (!race) prog.style.width = (i / qs.length * 100) + '%';
      meta.innerHTML = ''; meta.append(el('span', { text: race ? '✅ ' + sc : 'سؤال ' + (i + 1) + ' من ' + qs.length }), el('span', { text: race ? '⏱️ 60' : '⭐ ' + sc }));
      area.innerHTML = '';
      if (missing) { const hideA = Math.random() < .5; qEl.innerHTML = ''; qEl.append(hideA ? el('u', { text: '?' }) : String(a), ' × ', hideA ? String(b) : el('u', { text: '?' }), ' = ' + c);
        cur.want = hideA ? a : b; } else { qEl.textContent = a + ' × ' + b + ' = ?'; cur.want = c; }
      if (!typed) { const opts = new Set([cur.want]); const nb = missing ? [cur.want + 1, cur.want - 1, cur.want + 2, cur.want - 2, 12 - cur.want] : [c + a, c - a, c + b, c - b, c + 1, c - 1, c + 10];
        shuf(nb).forEach(x => { if (opts.size < 4 && x > 0 && x !== cur.want) opts.add(x); }); while (opts.size < 4) opts.add(cur.want + R(3, 9));
        const g = el('div', { class: 'ans' }); shuf([...opts]).forEach(v => g.append(el('button', { text: String(v), onclick: e => answer(v, e.currentTarget, g) }))); area.append(g); }
      else { disp.textContent = ''; const kp = el('div', { class: 'kp' });
        [7, 8, 9, 4, 5, 6, 1, 2, 3].forEach(d => kp.append(el('button', { text: String(d), onclick: () => key(String(d)) })));
        kp.append(el('button', { text: '⌫', onclick: () => key('del') }), el('button', { text: '0', onclick: () => key('0') }), el('button', { class: 'go', text: '✓', onclick: () => key('ok') }));
        area.append(disp, kp); }
    };
    const key = k => { if (locked) return; if (k === 'del') val = val.slice(0, -1); else if (k === 'ok') { if (val) answer(Number(val), disp); return; } else if (val.length < 3) val += k; disp.textContent = val; };
    const answer = (v, btn, g) => { if (locked) return; locked = true; const ok = v === cur.want; const [a, b] = cur;
      btn.classList.add(ok ? 'ok' : 'no'); beep(ok); if (ok) sc++;
      if (!ok) { if (g) [...g.children].forEach(x => { if (Number(x.textContent) === cur.want) x.classList.add('ok'); }); else disp.textContent = v + ' ✗ ' + cur.want; }
      miss(a, b, !ok); i++;
      setTimeout(() => { btn.classList.remove('ok', 'no'); next(); }, ok ? (race ? 150 : 450) : 1300); };
    next();
  }
  /* ---------- result ---------- */
  function result(r) {
    const { o } = r; const N = o.N, lv = o.lv;
    let passed = false, msg = '';
    if (o.mode === 'lv') { const p = P[N] = P[N] || {};
      if (lv === 5) { if (r.sc > (p.best || 0)) p.best = r.sc; passed = r.sc >= 20; msg = r.sc + ' إجابة صحيحة في دقيقة' + (r.sc >= 20 ? ' — النجمة الثالثة ⭐' : ' — حاول الوصول إلى 20 لتنال النجمة الثالثة'); if (passed) p.lv = Math.max(p.lv || 0, 5); }
      else { passed = r.sc >= 11; if (passed) p.lv = Math.max(p.lv || 0, lv); msg = r.sc + ' من ' + r.n + (passed ? (lv < 5 ? ' — فُتح المستوى ' + (lv + 1) + ' 🔓' : '') : ' — تحتاج 11 لتنجح. حاول مرة أخرى!'); }
      save(); }
    else { passed = r.sc >= r.n * .8; msg = r.sc + ' من ' + r.n + ' في ' + Math.round(r.secs) + ' ثانية'; }
    try { if (passed) D.cheer && D.cheer('win', { say: false }); } catch (e) {}
    const w = page(passed ? '🎉 أحسنت!' : '💪 تقدّم جيد', o.mode === 'lv' ? 'جدول ' + N : '', o.mode === 'lv' ? 'times-' + N : 'times');
    w.append(el('div', { style: 'font-size:4.5rem;text-align:center', text: passed ? '🏆' : '💪' }), el('h2', { text: msg }));
    if (o.mode === 'lv') w.append(el('div', { style: 'text-align:center;font-size:1.6rem', text: stars(starsOf(N)) }));
    w.append(el('div', { class: 'row', style: 'gap:8px;justify-content:center;flex-wrap:wrap' },
      el('button', { class: 'btn sun', text: '🔁 مرة أخرى', onclick: () => quiz(o) }),
      o.mode === 'lv' && passed && lv < 5 ? el('button', { class: 'btn', text: 'المستوى ' + (lv + 1) + ' ←', onclick: () => quiz({ ...o, lv: lv + 1 }) }) : null,
      el('button', { class: 'btn ghost', text: o.mode === 'lv' ? 'جدول ' + N : 'كل الجداول', onclick: () => go(o.mode === 'lv' ? 'times-' + N : 'times') })));
    if (!(window.ACC && ACC.user)) w.append(el('div', { class: 'panel', style: 'text-align:center;display:flex;flex-direction:column;gap:8px' }, el('b', { text: '📚 دروس المنهج الليبي كاملة بالصوت والصورة' }),
      el('span', { class: 'note', text: 'سجّل مجاناً واحفظ تقدّم ابنك، وجرّب الدروس المجانية في كل المواد.' }), el('button', { class: 'btn', text: 'سجّل مجاناً', onclick: () => go('login') })));
  }
  const m = /^times-(\d{1,2})$/.exec(h || ''); const n = m ? Number(m[1]) : 0;
  if (n >= 1 && n <= 12) table(n); else home();
}
