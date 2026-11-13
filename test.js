// المجتهد — اختبار المستوى المجاني (بدون تسجيل): #test (الرياضيات) و #test-en (الإنجليزي)
// أسئلة متدرّجة الصعوبة → مستوى، نقاط ضعف، بطاقة نتيجة للمشاركة، ودعوة للتسجيل
import { SKILLS as ESK, skillsFor as enSkills, genEn } from './entest.js';
export default function runTest(D, h) {
  const { el, go, store, root, bar } = D;
  const im = /^test(?:-en)?-i-([2-9A-HJ-NP-Z]{6})$/.exec(h || ''); if (im && !(window.ACC && ACC.user)) store.set('ref_in', { c: im[1], at: Date.now() });
  const GN = ['', 'الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس', 'السابع', 'الثامن', 'التاسع'];
  const SK = { add: ['➕', 'الجمع'], sub: ['➖', 'الطرح'], mul: ['✖️', 'جدول الضرب'], div: ['➗', 'القسمة'], mix: ['🔀', 'العمليات الأربع'] };
  const skillsFor = g => g <= 1 ? ['add', 'sub'] : g === 2 ? ['add', 'sub', 'mul'] : g === 3 ? ['add', 'sub', 'mul', 'div'] : ['mul', 'div', 'add', 'sub', 'mix'];
  const R = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const css = `.tst{display:flex;flex-direction:column;gap:12px;padding-bottom:30px}
.tst h2{margin:0;font-family:var(--f-display);text-align:center}.tst .sub{color:var(--muted);text-align:center;margin:0;line-height:1.8}
.tst .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.tst .grid.two{grid-template-columns:repeat(2,1fr)}
.tst .opt{border:2px solid var(--line);background:var(--card);border-radius:16px;padding:14px 6px;font:inherit;font-weight:800;font-size:1.05rem;color:inherit;cursor:pointer;text-align:center}
.tst .opt.on{border-color:var(--sea);background:color-mix(in srgb,var(--sea) 12%,var(--card))}
.tst .q{font-size:3rem;font-weight:800;text-align:center;direction:ltr;font-family:var(--f-display);margin:10px 0;letter-spacing:2px}
.tst .ans{display:grid;grid-template-columns:1fr 1fr;gap:10px}.tst .ans button{font:inherit;font-size:2rem;font-weight:800;padding:18px 0;border-radius:18px;border:2px solid var(--line);background:var(--card);color:inherit;cursor:pointer}
.tst .ans button.ok{background:#16a34a;color:#fff;border-color:#16a34a}.tst .ans button.no{background:#dc2626;color:#fff;border-color:#dc2626}
.tst .prog{height:10px;background:var(--line);border-radius:6px;overflow:hidden}.tst .prog i{display:block;height:100%;background:linear-gradient(90deg,#f59e0b,var(--sea));transition:width .3s}
.tst .meta{display:flex;justify-content:space-between;color:var(--muted);font-weight:700;font-size:.9rem}
.tst .badge{font-size:4.5rem;text-align:center;line-height:1}.tst .lvl{font-size:1.6rem;font-weight:800;text-align:center;font-family:var(--f-display)}
.tst .card{border:1px solid var(--line);background:var(--card);border-radius:18px;padding:14px;display:flex;flex-direction:column;gap:8px}
.tst .nums{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;text-align:center}.tst .nums b{display:block;font-size:1.4rem;font-family:var(--f-display)}.tst .nums span{font-size:.75rem;color:var(--muted)}
.tst .cta{background:linear-gradient(135deg,#1d4ed8,#7c3aed);color:#fff;border-radius:18px;padding:16px;display:flex;flex-direction:column;gap:8px;text-align:center}
.tst .cta .btn{background:#fbbf24;color:#111}
.tst .subj{display:grid;grid-template-columns:1fr 1fr;gap:10px}.tst .subj button{border:2.5px solid var(--line);background:var(--card);border-radius:20px;padding:12px 8px;display:grid;gap:4px;justify-items:center;font:inherit;color:inherit;cursor:pointer}
.tst .subj button.on{border-color:var(--sea);background:color-mix(in srgb,var(--sea) 12%,var(--card))}.tst .subj img{width:54px;height:54px;object-fit:contain}.tst .subj b{font-family:var(--f-display);font-size:1.05rem}.tst .subj small{color:var(--muted);font-size:.78rem}
.tst .eq{font-size:1.05rem;font-weight:700;text-align:center;color:var(--muted);margin:0}
.tst .big{font-size:4rem;text-align:center;line-height:1.2;margin:4px 0}.tst .big.tx{font-size:2.4rem;font-weight:800;font-family:var(--f-display);direction:ltr;letter-spacing:1px}
.tst .sent{direction:ltr;text-align:center;font-size:1.45rem;font-weight:800;line-height:1.6;background:var(--card);border:1.5px solid var(--line);border-radius:16px;padding:12px}
.tst .sent u{display:inline-block;min-width:70px;border-bottom:3px solid var(--sea);text-decoration:none}
.tst .text{direction:ltr;text-align:left;font-size:1.08rem;line-height:1.8;background:color-mix(in srgb,var(--sea) 7%,var(--card));border-radius:16px;padding:12px 14px}
.tst .ans.en button{font-size:1.25rem;padding:14px 6px;direction:ltr}.tst .ans.emo button{font-size:2.6rem;padding:10px 0}
.tst .ans.long{grid-template-columns:1fr}.tst .ans.long button{font-size:1.08rem;padding:12px 10px}`;
  if (!document.getElementById('tst-css')) document.head.append(el('style', { id: 'tst-css', text: css }));
  const st = { g: Number(store.get('tst_g', 0)) || 0, skill: null, table: 0, name: store.get('tst_name', ''), sub: /^test-en/.test(h || '') ? 'en' : /^test-math/.test(h || '') ? 'math' : store.get('tst_sub', 'math') };
  const EN = () => st.sub === 'en'; const SUBN = () => EN() ? 'الإنجليزي' : 'الرياضيات'; const ICO = () => EN() ? '🔤' : '🧮';
  const page = (t, s) => { root.innerHTML = ''; root.append(bar(t, s || 'مجاني — بدون تسجيل', 'home')); const w = el('section', { class: 'tst' }); root.append(w); return w; };

  /* ---------- step 1: grade + name ---------- */
  function start() {
    const w = page('📝 اختبر مستوى ابنك');
    const hero = el('div', { class: 'gx-hero', style: '--h1:#5b8cff;--h2:#7a4cf4' });
    const drawHero = () => { hero.innerHTML = ''; hero.append(el('img', { src: 'img/ui/' + (EN() ? 's_en' : 'q_test') + '.webp', alt: '' }), el('div', {}, el('b', { text: EN() ? 'كم يعرف ابنك في الإنجليزي؟' : 'كم يعرف ابنك في الرياضيات؟' }),
      el('span', { text: EN() ? 'أسئلة من منهج English for Libya: الحروف، الكلمات، القواعد والقراءة. تبدأ سهلة وتتدرّج حسب إجاباته، وفي النهاية تعرف مستواه ونقاط ضعفه.' : 'اختبار من 2 إلى 4 دقائق، يتغيّر حسب إجاباته. في النهاية تعرف مستواه ونقاط ضعفه بالضبط.' }))); };
    const subj = el('div', { class: 'subj' });
    const drawSubj = () => { subj.innerHTML = ''; [['math', 'q_test', 'الرياضيات', 'العمليات وجدول الضرب'], ['en', 's_en', 'الإنجليزي', 'حروف، كلمات، قواعد، قراءة']].forEach(([k, im, t, d]) =>
      subj.append(el('button', { class: st.sub === k ? 'on' : '', 'aria-pressed': String(st.sub === k), onclick: () => { st.sub = k; store.set('tst_sub', k); drawSubj(); drawHero(); } }, el('img', { src: 'img/ui/' + im + '.webp', alt: '' }), el('b', { text: t }), el('small', { text: d })))); };
    drawHero(); drawSubj();
    const nm = el('input', { value: st.name, placeholder: 'اسم ابنك (اختياري)', style: 'text-align:center' });
    const grid = el('div', { class: 'grid' });
    for (let g = 1; g <= 9; g++) grid.append(el('button', { class: 'opt' + (st.g === g ? ' on' : ''), style: '--hu:' + (g * 40 % 360), text: 'الصف ' + GN[g], onclick: () => { st.g = g; store.set('tst_g', g); st.name = nm.value.trim(); store.set('tst_name', st.name); chooseSkill(); } }));
    w.append(hero, el('b', { style: 'text-align:center', text: 'أي مادة؟' }), subj, nm, el('b', { style: 'text-align:center', text: 'في أي صف؟' }), grid);
  }
  /* ---------- step 2: skill ---------- */
  function chooseSkill() {
    const w = page(ICO() + ' اختبر مستوى ' + (st.name || 'ابنك') + ' في ' + SUBN(), 'الصف ' + GN[st.g]);
    w.append(el('h2', { text: 'ماذا نختبر؟' }));
    const grid = el('div', { class: 'grid two' });
    if (EN()) { enSkills(st.g).forEach(k => grid.append(el('button', { class: 'opt', style: k === 'mix' ? 'grid-column:1/-1' : '', onclick: () => { st.skill = k; runEn(); } }, el('div', { style: 'font-size:2rem', text: ESK[k][0] }), ESK[k][1])));
      w.append(grid, el('p', { class: 'sub', text: 'ننصح بـ«اختبار شامل» أولاً لمعرفة مستواه العام.' }), el('button', { class: 'linkbtn', text: '→ تغيير الصف أو المادة', onclick: start })); return; }
    skillsFor(st.g).forEach(k => grid.append(el('button', { class: 'opt', onclick: () => { st.skill = k; k === 'mul' || k === 'div' ? chooseTable() : run(); } }, el('div', { style: 'font-size:2rem', text: SK[k][0] }), SK[k][1])));
    w.append(grid, el('button', { class: 'linkbtn', text: '→ تغيير الصف أو المادة', onclick: start }));
  }
  function chooseTable() {
    const w = page(SK[st.skill][0] + ' ' + SK[st.skill][1], 'الصف ' + GN[st.g]);
    w.append(el('h2', { text: 'أي جدول؟' }), el('p', { class: 'sub', text: 'اختر «كل الجداول» لاختبار شامل، أو جدولاً واحداً.' }));
    const grid = el('div', { class: 'grid' });
    grid.append(el('button', { class: 'opt', style: 'grid-column:1/-1', text: '🌟 كل الجداول', onclick: () => { st.table = 0; run(); } }));
    for (let t = 2; t <= 10; t++) grid.append(el('button', { class: 'opt', text: 'جدول ' + t, onclick: () => { st.table = t; run(); } }));
    w.append(grid);
  }

  /* ---------- question generator (lv 1 easy → 3 hard) ---------- */
  const ADD = { 1: [5, 10, 18], 2: [20, 50, 100], 3: [50, 200, 999], 4: [100, 999, 9999] };
  const addMax = (g, lv) => (ADD[Math.min(g, 4)] || ADD[4])[lv - 1];
  function gen(skill, lv) {
    const g = st.g; let a, b, c, op, tag;
    if (skill === 'mix') skill = pick(['add', 'sub', 'mul', 'div']);
    if (skill === 'add') { const m = addMax(g, lv); a = R(1, Math.max(2, Math.floor(m * .6))); b = R(1, Math.max(1, m - a)); c = a + b; op = '+'; tag = ((a % 10) + (b % 10) >= 10) ? 'مع حمل (نقل)' : 'بدون حمل'; }
    else if (skill === 'sub') { const m = addMax(g, lv); a = R(2, m); b = R(1, a - 1); c = a - b; op = '−'; tag = (a % 10) < (b % 10) ? 'مع استلاف' : 'بدون استلاف'; }
    else {
      const tabs = st.table ? [st.table] : lv === 1 ? [2, 3, 4, 5, 10] : lv === 2 ? [2, 3, 4, 5, 6, 7] : [6, 7, 8, 9];
      const t = pick(tabs); const n = st.table ? R(1, 10) : lv === 1 ? R(1, 10) : lv === 2 ? R(1, 10) : R(3, 10);
      if (skill === 'mul') { [a, b] = Math.random() < .5 ? [t, n] : [n, t]; c = a * b; op = '×'; } else { a = t * n; b = t; c = n; op = '÷'; }
      tag = 'جدول ' + t;
    }
    const opts = new Set([c]); const near = [c + 1, c - 1, c + 2, c - 2, c + 10, c - 10, skill === 'mul' ? c + b : c + 3, skill === 'mul' ? c - a : c - 3, Number(String(c).split('').reverse().join(''))];
    for (const x of near.sort(() => Math.random() - .5)) { if (opts.size >= 4) break; if (x >= 0 && x !== c) opts.add(x); }
    while (opts.size < 4) opts.add(c + R(3, 15));
    return { a, b, c, op, tag, lv, opts: [...opts].sort(() => Math.random() - .5) };
  }
  let AC = null; const beep = ok => { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); const t = AC.currentTime;
    (ok ? [660, 990] : [220, 180]).forEach((f, i) => { const o = AC.createOscillator(), g = AC.createGain(); o.frequency.value = f; o.type = ok ? 'sine' : 'square';
      g.gain.setValueAtTime(.0001, t + i * .09); g.gain.exponentialRampToValueAtTime(ok ? .25 : .08, t + i * .09 + .02); g.gain.exponentialRampToValueAtTime(.0001, t + i * .09 + .18);
      o.connect(g).connect(AC.destination); o.start(t + i * .09); o.stop(t + i * .09 + .2); }); } catch (e) {} };
  const say = q => { try { const w = { '+': 'زائد', '−': 'ناقص', '×': 'ضرب', '÷': 'تقسيم' }[q.op]; D.speakAr && D.speakAr(q.a + ' ' + w + ' ' + q.b + ' ؟', { force: true }); } catch (e) {} };

  /* ---------- run the test ---------- */
  function run() {
    const N = st.g <= 2 ? 15 : 20; let i = 0, lv = st.g <= 2 ? 1 : 2, streak = 0; const log = []; const t0 = Date.now();
    // أسئلة عشوائية في كل مرة: لا يتكرر سؤال داخل الاختبار، ونتجنب أسئلة المحاولات السابقة قدر الإمكان
    const qk = q => q.a + q.op + q.b; const seen = new Set(); const old = new Set(store.get('tst_seen', []));
    const fresh = () => { let q = null; for (let k = 0; k < 40; k++) { q = gen(st.skill, lv); if (!seen.has(qk(q)) && (k > 25 || !old.has(qk(q)))) break; } seen.add(qk(q)); return q; };
    const w = page(SK[st.skill][0] + ' ' + SK[st.skill][1] + (st.table ? ' — جدول ' + st.table : ''), (st.name ? st.name + ' · ' : '') + 'الصف ' + GN[st.g]);
    const prog = el('i', { style: 'width:0' }), meta = el('div', { class: 'meta' }), qEl = el('div', { class: 'q' }), ans = el('div', { class: 'ans' }), clock = el('span');
    w.append(el('div', { class: 'prog' }, prog), meta, qEl, ans, el('button', { class: 'btn ghost sm', style: 'align-self:center', text: '🔊 اسمع السؤال', onclick: () => say(cur) }));
    let cur = null, qT = 0, locked = false;
    const tick = setInterval(() => { if (!document.body.contains(w)) { clearInterval(tick); return; } const s = Math.round((Date.now() - t0) / 1000); clock.textContent = '⏱️ ' + Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }, 500);
    const next = () => {
      if (i >= N) { clearInterval(tick); store.set('tst_seen', [...old, ...seen].slice(-150)); return result(log, (Date.now() - t0) / 1000); }
      cur = fresh(); qT = Date.now(); locked = false;
      prog.style.width = (i / N * 100) + '%'; meta.innerHTML = ''; meta.append(el('span', { text: 'سؤال ' + (i + 1) + ' من ' + N }), clock);
      qEl.textContent = cur.a + ' ' + cur.op + ' ' + cur.b + ' = ?';
      ans.innerHTML = ''; cur.opts.forEach(v => ans.append(el('button', { text: String(v), onclick: e => choose(v, e.currentTarget) })));
    };
    const choose = (v, btn) => { if (locked) return; locked = true; const ok = v === cur.c, secs = (Date.now() - qT) / 1000;
      log.push({ ...cur, ok, secs, picked: v }); i++;
      btn.classList.add(ok ? 'ok' : 'no'); if (!ok) [...ans.children].forEach(b => { if (Number(b.textContent) === cur.c) b.classList.add('ok'); });
      beep(ok);
      const fast = secs < (st.g <= 2 ? 8 : 6);
      if (ok && fast) { streak++; if (streak >= 2 && lv < 3) { lv++; streak = 0; } } else if (!ok) { streak = 0; if (lv > 1) lv--; } else streak = 0;
      setTimeout(next, ok ? 450 : 1100); };
    next();
  }


  /* ---------- اختبار الإنجليزي ---------- */
  const canSpeak = () => { try { return !!(D.ttsGet ? D.ttsGet('en') : window.speechSynthesis); } catch (e) { return !!window.speechSynthesis; } };
  const sayEn = t => { try { if (!t) return; if (D.speak) D.speak(t); else { const u = new SpeechSynthesisUtterance(t); u.lang = 'en-GB'; u.rate = .9; speechSynthesis.cancel(); speechSynthesis.speak(u); } } catch (e) {} };
  function runEn() {
    const N = st.skill === 'rd' ? 10 : st.g <= 2 ? 12 : 15; let i = 0, lv = 1, streak = 0; const log = []; const t0 = Date.now();
    const qk = q => q.key || (q.k + (q.sent || '') + (q.big || '') + q.a + (q.q || '')); const seen = new Set(), usedRd = new Set(); const old = new Set(store.get('tst_seen_en', []));
    const fresh = () => { let q = null; for (let k = 0; k < 50; k++) { q = genEn(st.skill, st.g, lv, { canSpeak: canSpeak(), usedRd }); if (!seen.has(qk(q)) && (k > 30 || !old.has(qk(q)))) break; }
      seen.add(qk(q)); if (q.k === 'rd') usedRd.add(q.key); return q; };
    const w = page(ESK[st.skill][0] + ' الإنجليزي — ' + ESK[st.skill][1], (st.name ? st.name + ' · ' : '') + 'الصف ' + GN[st.g]);
    const prog = el('i', { style: 'width:0' }), meta = el('div', { class: 'meta' }), body = el('div', { class: 'stack' }), clock = el('span');
    w.append(el('div', { class: 'prog' }, prog), meta, body);
    let cur = null, qT = 0, locked = false;
    const tick = setInterval(() => { if (!document.body.contains(w)) { clearInterval(tick); return; } const s2 = Math.round((Date.now() - t0) / 1000); clock.textContent = '⏱️ ' + Math.floor(s2 / 60) + ':' + String(s2 % 60).padStart(2, '0'); }, 500);
    const next = () => {
      if (i >= N) { clearInterval(tick); store.set('tst_seen_en', [...old, ...seen].slice(-200)); return result(log, (Date.now() - t0) / 1000); }
      cur = fresh(); qT = Date.now(); locked = false; const q = cur;
      prog.style.width = (i / N * 100) + '%'; meta.innerHTML = ''; meta.append(el('span', { text: 'سؤال ' + (i + 1) + ' من ' + N }), clock);
      body.innerHTML = '';
      body.append(el('p', { class: 'eq', text: q.q }));
      if (q.text) body.append(el('div', { class: 'text', lang: 'en', text: q.text }));
      if (q.big) body.append(el('div', { class: 'big' + (q.bigEn ? ' tx' : ''), lang: q.bigEn ? 'en' : null, text: q.big }));
      if (q.sent) { const parts = q.sent.split('___'); const se = el('div', { class: 'sent', lang: 'en' }); parts.forEach((p2, j) => { se.append(p2); if (j < parts.length - 1) se.append(el('u', { text: ' ' })); }); body.append(se); }
      const long = q.opts.some(o => String(o).length > 16);
      const ans = el('div', { class: 'ans' + (q.emo ? ' emo' : q.en ? ' en' : '') + (long ? ' long' : '') });
      q.opts.forEach(v => ans.append(el('button', { lang: q.en ? 'en' : null, text: String(v), onclick: e => choose(v, e.currentTarget, ans) })));
      body.append(ans);
      const spk = q.say || (q.sent ? q.sent.replace('___', 'blank') : '') || '';
      if (spk && canSpeak()) body.append(el('button', { class: 'btn ghost sm', style: 'align-self:center', text: '🔊 اسمع', onclick: () => sayEn(q.say || q.sent.replace('___', '...')) }));
      if (q.say && (q.big === '🔊' || st.g <= 3)) setTimeout(() => sayEn(q.say), 250);
    };
    const choose = (v, btn, ans) => { if (locked) return; locked = true; const ok = v === cur.a, secs = (Date.now() - qT) / 1000;
      log.push({ ...cur, ok, secs, picked: v, lv }); i++;
      btn.classList.add(ok ? 'ok' : 'no'); if (!ok) [...ans.children].forEach(b => { if (b.textContent === String(cur.a)) b.classList.add('ok'); });
      beep(ok);
      if (ok) { streak++; if (streak >= 2 && lv < 3) { lv++; streak = 0; } } else { streak = 0; if (lv > 1) lv--; }
      setTimeout(next, ok ? 550 : 1400); };
    next();
  }

  /* ---------- result ---------- */
  function result(log, total) {
    const en = EN();
    const n = log.length, sc = log.filter(x => x.ok).length, acc = Math.round(sc * 100 / n), avg = total / n;
    const hardOk = log.filter(x => x.lv === 3 && x.ok).length;
    const thr = st.g <= 2 ? 8 : (st.skill === 'add' || st.skill === 'sub') ? 6 : 5;
    const L = en ? (acc >= 90 && hardOk >= 2 ? ['🏆', 'ممتاز', '#16a34a'] : acc >= 75 ? ['⭐', 'جيد جداً', '#2563eb'] : acc >= 55 ? ['👍', 'جيد', '#d97706'] : ['💪', 'يحتاج تدريباً', '#dc2626'])
      : (acc >= 90 && avg <= thr && hardOk >= 3 ? ['🏆', 'ممتاز', '#16a34a'] : acc >= 80 ? ['⭐', 'جيد جداً', '#2563eb'] : acc >= 60 ? ['👍', 'جيد', '#d97706'] : ['💪', 'يحتاج تدريباً', '#dc2626']);
    // نقاط الضعف: حسب نوع السؤال (الجدول/العملية في الرياضيات، المهارة في الإنجليزي) — خطأ أو بطء
    const by = {}; log.forEach(x => { const b = by[x.tag] = by[x.tag] || { n: 0, w: 0, slow: 0 }; b.n++; if (!x.ok) b.w++; else if (!en && x.secs > thr * 1.6) b.slow++; });
    const weak = Object.entries(by).filter(([, b]) => b.w || b.slow).sort((a, b) => (b[1].w * 2 + b[1].slow) - (a[1].w * 2 + a[1].slow));
    const strong = Object.entries(by).filter(([, b]) => !b.w && !b.slow).map(([k]) => k);
    const mmss = s2 => Math.floor(s2 / 60) + ':' + String(Math.round(s2 % 60)).padStart(2, '0');
    const key = 'tst_hist'; const H = store.get(key, []); const prev = H.filter(x => (x.sub || 'math') === st.sub && x.g === st.g && x.skill === st.skill && x.table === st.table && x.name === st.name).pop();
    H.push({ sub: st.sub, g: st.g, skill: st.skill, table: st.table, name: st.name, sc, n, total: Math.round(total), lvl: L[1], at: Date.now() }); store.set(key, H.slice(-40));
    try { if (window.ACC && ACC.call) ACC.call('testLog', { subj: st.sub, g: String(st.g), skill: st.skill, n, sc, secs: Math.round(total), lvl: L[1] }).catch(() => {}); } catch (e) {}
    try { if (acc >= 60) D.cheer && D.cheer('win', { say: false }); } catch (e) {}
    try { window.AX && AX.ev('test_done', { s: st.sub, g: String(st.g), k: st.skill, sc, n }); } catch (e) {}
    const who = st.name || 'ابنك', what = en ? 'الإنجليزي — ' + ESK[st.skill][1] : SK[st.skill][1] + (st.table ? ' (جدول ' + st.table + ')' : '');
    const w = page(ICO() + ' نتيجة ' + who, what + ' · الصف ' + GN[st.g]);
    w.append(el('div', { class: 'card', style: 'border:2px solid ' + L[2] + ';text-align:center' },
      el('div', { class: 'badge', text: L[0] }), el('div', { class: 'lvl', style: 'color:' + L[2], text: 'المستوى: ' + L[1] }),
      el('div', { class: 'nums' }, el('div', {}, el('b', { text: acc + '%' }), el('span', { text: sc + ' من ' + n + ' صحيحة' })), el('div', {}, el('b', { text: mmss(total) }), el('span', { text: 'الوقت' })),
        el('div', {}, el('b', { text: avg.toFixed(1) + ' ث' }), el('span', { text: 'لكل سؤال' }))),
      prev ? el('div', { class: 'sub', text: (sc > prev.sc ? '📈 تحسّن! ' : sc < prev.sc ? '📉 ' : '➖ ') + 'المرة السابقة: ' + prev.sc + '/' + prev.n + ' في ' + mmss(prev.total) }) : null));
    const an = el('div', { class: 'card' }, el('b', { text: '🔍 التحليل' }));
    if (strong.length) an.append(el('div', { text: '✅ يتقن: ' + strong.join('، ') }));
    if (weak.length) an.append(el('div', { text: '⚠️ يحتاج تدريباً في: ' + weak.slice(0, 4).map(([k, b]) => k + (b.w ? ' (' + b.w + ' خطأ)' : ' (بطيء)')).join('، ') }));
    if (!weak.length) an.append(el('div', { text: '🌟 لا توجد نقاط ضعف واضحة في هذا الاختبار. جرّب مهارة أخرى أو صفاً أعلى.' }));
    const wrong = log.filter(x => !x.ok).slice(0, 6);
    if (wrong.length) an.append(el('div', { class: 'sub', style: 'text-align:start', text: 'أخطاؤه: ' + wrong.map(x => en
      ? '⁦' + (x.k === 'rd' ? x.sent + ' → ' + x.a : x.sent ? x.sent.replace('___', x.a) : (x.big && x.big !== '🔊' ? x.big + ' → ' : '') + x.a) + '⁩ (أجاب ' + x.picked + ')'
      : '⁦' + x.a + ' ' + x.op + ' ' + x.b + ' = ' + x.c + '⁩ (أجاب ' + x.picked + ')').join(' · ') }));
    an.append(el('div', { class: 'sub', style: 'text-align:start', text: acc >= 90 ? 'ممتاز! التدريب اليومي القصير يحافظ على هذا المستوى.' : en ? 'درس قصير يومياً مع الاستماع والتكرار يرفع مستواه بوضوح خلال أسبوعين.' : 'التدريب 10 دقائق يومياً على هذه النقاط يرفع مستواه بوضوح خلال أسبوعين.' }));
    w.append(an);
    // المشاركة: رسالة مختصرة جذابة + صورة النتيجة
    const sm = el('div');
    const ref = store.get('my_ref', ''); const link = 'https://mujtahid.ly/#test' + (en ? '-en' : '') + (ref ? '-i-' + ref : '');
    const subN = en ? 'الإنجليزي' : 'الرياضيات', kid = st.name ? 'ابني ' + st.name : 'ابني';
    const head = acc >= 55 ? '🎉 ' + kid + ' اجتاز اختبار مستوى ' + subN + ' للصف ' + GN[st.g] + ' بنسبة ' + acc + '%' : '📝 ' + kid + ' أنهى اختبار مستوى ' + subN + ' للصف ' + GN[st.g] + ' بنسبة ' + acc + '%';
    const shareTxt = head + '\n' + L[0] + ' المستوى: ' + L[1] + ' — ' + sc + ' إجابات صحيحة من ' + n + '\n📚 على منصة المجتهد للمنهج الليبي\n\n👈 خلّي ابنك يختبر نفسه مجاناً في دقيقتين:\n' + link;
    w.append(el('div', { class: 'card' }, el('b', { text: '📤 شارك النتيجة' }), el('div', { class: 'sub', style: 'text-align:start;white-space:pre-line;background:var(--paper);border-radius:12px;padding:10px', text: shareTxt }),
      el('div', { class: 'row', style: 'gap:8px;flex-wrap:wrap' },
        el('a', { class: 'btn sun', href: 'https://wa.me/?text=' + encodeURIComponent(shareTxt), target: '_blank', rel: 'noopener', text: '💬 واتساب', onclick: () => { try { window.AX && AX.ev('share_click', { to: 'whatsapp', l: 'test-' + st.sub }); } catch (e) {} } }),
        el('button', { class: 'btn ghost', text: '🖼️ صورة النتيجة', onclick: () => shareImage({ kid, subN, g: GN[st.g], acc, sc, n, L, en, txt: shareTxt }, sm) })), sm));
    // CTA
    const logged = window.ACC && ACC.user;
    w.append(el('div', { class: 'cta' }, el('b', { style: 'font-size:1.15rem', text: logged ? '📚 درّبه الآن على نقاط ضعفه' : '🎁 احفظ نتيجة ' + who + ' وتابع تقدّمه' }),
      el('span', { text: logged ? 'دروس ' + subN + ' للصف ' + GN[st.g] + ' بالصوت والصورة والألعاب.' : 'سجّل مجاناً في 20 ثانية: دروس المنهج الليبي بالصوت والصورة، وتقارير عن ابنك.' }),
      el('button', { class: 'btn paybig', text: logged ? 'ابدأ التدريب ←' : 'سجّل مجاناً ←', onclick: () => logged ? go('g' + st.g + '-' + (en ? 'en' : 'math')) : go('login') })));
    w.append(el('div', { class: 'row', style: 'gap:8px;justify-content:center;flex-wrap:wrap' },
      !en && (st.skill === 'mul' || st.skill === 'div') ? el('button', { class: 'btn', text: '✖️ احفظ جدول الضرب', onclick: () => go(st.table ? 'times-' + st.table : 'times') }) : null,
      el('button', { class: 'btn ghost', text: '🔁 أعد نفس الاختبار', onclick: () => en ? runEn() : run() }), el('button', { class: 'btn ghost', text: ICO() + ' اختبار آخر', onclick: chooseSkill }),
      el('button', { class: 'btn ghost', text: en ? '🧮 اختبر الرياضيات' : '🔤 اختبر الإنجليزي', onclick: () => { st.sub = en ? 'math' : 'en'; store.set('tst_sub', st.sub); chooseSkill(); } })));
  }

  /* ---------- share image (canvas 1080x1080) ---------- */
  async function shareImage(r, m) {
    try { await Promise.all([document.fonts.load('800 60px Alexandria'), document.fonts.load('700 40px Alexandria')]); } catch (e) {}
    const c = document.createElement('canvas'); c.width = c.height = 1080; const x = c.getContext('2d');
    const gr = x.createLinearGradient(0, 0, 1080, 1080); (r.en ? ['#0ea5e9', '#2563eb'] : ['#2563eb', '#7c3aed']).forEach((col, k) => gr.addColorStop(k, col)); x.fillStyle = gr; x.fillRect(0, 0, 1080, 1080);
    x.fillStyle = 'rgba(255,255,255,.09)'; [[120, 140, 160], [980, 220, 120], [900, 980, 200], [80, 900, 110]].forEach(([a, b, rr]) => { x.beginPath(); x.arc(a, b, rr, 0, 7); x.fill(); });
    const F = (wgt, sz) => wgt + ' ' + sz + 'px Alexandria, Tahoma, sans-serif'; x.direction = 'rtl'; x.textAlign = 'center';
    x.fillStyle = '#fff'; x.font = F(800, 58); x.fillText('المجتهد', 540, 110); x.font = F(700, 30); x.globalAlpha = .9; x.fillText('منصة دروس واختبارات المنهج الليبي', 540, 158); x.globalAlpha = 1;
    x.fillStyle = '#fff'; x.beginPath(); x.roundRect(80, 200, 920, 700, 56); x.fill();
    x.fillStyle = '#0f172a'; x.font = F(800, 54); x.fillText(r.acc >= 55 ? '🎉 ' + r.kid + ' اجتاز الاختبار' : r.kid + ' أنهى الاختبار', 540, 300);
    x.fillStyle = '#64748b'; x.font = F(700, 36); x.fillText('اختبار مستوى ' + r.subN + ' — الصف ' + r.g, 540, 360);
    // حلقة النسبة
    const cx = 540, cy = 560, rad = 145; x.lineWidth = 34; x.lineCap = 'round'; x.strokeStyle = '#e2e8f0'; x.beginPath(); x.arc(cx, cy, rad, 0, Math.PI * 2); x.stroke();
    x.strokeStyle = r.L[2]; x.beginPath(); x.arc(cx, cy, rad, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * r.acc / 100); x.stroke();
    x.fillStyle = r.L[2]; x.font = F(800, 96); x.direction = 'ltr'; x.fillText(r.acc + '%', cx, cy + 32); x.direction = 'rtl';
    x.fillStyle = '#334155'; x.font = F(700, 34); x.fillText(r.sc + ' إجابات صحيحة من ' + r.n, 540, 770);
    x.font = F(800, 38); const lt = 'المستوى: ' + r.L[1], lw = Math.min(820, x.measureText(lt).width + 90); x.fillStyle = r.L[2]; x.beginPath(); x.roundRect(540 - lw / 2, 800, lw, 76, 38); x.fill(); x.fillStyle = '#fff'; x.fillText(lt, 540, 852);
    x.fillStyle = '#fbbf24'; x.beginPath(); x.roundRect(150, 940, 780, 90, 45); x.fill();
    x.fillStyle = '#1f2937'; x.font = F(800, 38); x.fillText('اختبر ابنك مجاناً  mujtahid.ly', 540, 999);
    const blob = await new Promise(res => c.toBlob(res, 'image/png'));
    const file = new File([blob], 'mujtahid-result.png', { type: 'image/png' });
    try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text: r.txt }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'mujtahid-result.png'; a.click();
    m.innerHTML = ''; m.append(el('div', { class: 'feedback info', text: 'حُفظت الصورة على جهازك. أرسلها على واتساب مع الرابط.' }));
  }

  if (st.g && (h === 'test-again' || h === 'test-en-again')) chooseSkill(); else start();
}
