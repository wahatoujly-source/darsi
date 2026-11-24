/* «عرض المجتهد» — عارض شرائح الدروس داخل المنصة (موبايل، تابلت، لابتوب، شاشة الفصل).
   الشرائح تأتي من Firestore (decks/{رقم الدرس}) كما صنعها برنامج التحويل، ونص القراءة مطابق حرفياً
   لنص الفيديو والعرض بالصوت؛ فالصوت المولَّد سابقاً يأتي من ذاكرة المنصة دون استهلاك جديد.
   الأوضاع: يدوي (المعلم يضغط) · تلقائي (يتقدّم وحده) — مع الصوت أو بدونه. */
const FS = 'https://firestore.googleapis.com/v1/projects/mujtahid-810d7/databases/(default)/documents/';
const W = 1280, H = 720;
const DECKS = new Map(), AUD = new Map();
/* ملف صوت صامت صغير جداً: تشغيله أثناء ضغطة المستخدم يفتح الصوت في الآيفون لباقي العرض */
let SIL = null; const SILENT = () => { if (SIL) return SIL; const n = 800, b = new ArrayBuffer(44 + n), v = new DataView(b); const w = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  w(0, 'RIFF'); v.setUint32(4, 36 + n, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, 8000, true); v.setUint32(28, 8000, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true); w(36, 'data'); v.setUint32(40, n, true);
  for (let i = 0; i < n; i++) v.setUint8(44 + i, 128); return (SIL = URL.createObjectURL(new Blob([b], { type: 'audio/wav' }))); };

async function loadDeck(id) {
  if (DECKS.has(id)) return DECKS.get(id);
  const r = await fetch(FS + 'decks/' + encodeURIComponent(id));
  if (!r.ok) throw new Error(r.status === 404 ? 'لا يوجد عرض لهذا الدرس بعد' : 'تعذّر تحميل العرض');
  const j = await r.json(); const d = JSON.parse(((j.fields || {}).deck || {}).stringValue || '{}');
  if (!Array.isArray(d.slides) || !d.slides.length) throw new Error('العرض فارغ');
  DECKS.set(id, d); return d;
}

const CSS = `
.dv{position:fixed;inset:0;z-index:9999;background:#0d1226;display:flex;flex-direction:column;user-select:none;-webkit-user-select:none;touch-action:manipulation;direction:rtl}
.dv-wrap{position:relative;flex:1;min-height:0;overflow:hidden}
.dv-stage{position:absolute;left:50%;top:50%;width:${W}px;height:${H}px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.45);font-family:Alexandria,Tahoma,Arial,sans-serif;color:#1f2937;transform-origin:center center}
.dv-s{position:absolute;inset:0;animation:dvIn .45s ease}
@keyframes dvIn{from{opacity:0;transform:translateX(-40px)}to{opacity:1;transform:none}}
.dv-s.back{animation-name:dvBack}@keyframes dvBack{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:none}}
.dv-h{position:absolute;top:0;left:0;right:0;height:108px;display:flex;align-items:center;gap:18px;padding:0 48px;color:#fff;font-weight:700;font-size:44px}
.dv-h .ic{font-size:44px}.dv-h .tt{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dv-br{background:#fff;border-radius:999px;padding:6px 20px;font-size:22px;font-weight:700;white-space:nowrap}
.dv-b{position:absolute;top:132px;bottom:56px;left:52px;right:52px;font-size:34px;line-height:1.55;overflow:hidden}
.dv-f{position:absolute;bottom:0;left:0;right:0;height:44px;display:flex;align-items:center;justify-content:space-between;padding:0 30px;font-size:17px;color:#6b7280;border-top:1px solid #eef0f4}
.dv-st{transition:opacity .45s ease,transform .45s ease}.dv-st:not(.on){opacity:0;transform:translateY(16px)}
.dv-m{unicode-bidi:isolate;direction:ltr;display:inline-block}
.dv-row{display:flex;align-items:center;gap:20px;margin-bottom:14px}
.dv-n{flex:none;width:54px;height:54px;border-radius:50%;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:26px}
.dv-p{margin:0 0 14px}.dv-p b{font-weight:700}
.dv-note{background:#fff7db;border:3px solid #f2b705;border-radius:22px;padding:22px 30px;height:100%;box-sizing:border-box;display:flex;flex-direction:column;justify-content:center}
.dv-cols{display:flex;gap:28px;height:100%}.dv-cols>.tx{flex:1;min-width:0;overflow:hidden}.dv-img{flex:0 0 40%;display:flex;align-items:center;justify-content:center}.dv-img img{max-width:100%;max-height:100%;border-radius:14px}
.dv-q{border-radius:18px;padding:16px 26px;font-weight:700;margin-bottom:18px}
.dv-ok{color:#16a34a;font-weight:700}
.dv-terms{display:grid;grid-template-columns:1fr 1fr;gap:18px}.dv-term{border-radius:18px;padding:14px 22px;font-size:.78em}.dv-term b{display:block;font-size:1.15em}.dv-term.must{border:3px solid #f2b705}
.dv-qq{margin-bottom:22px}.dv-qq .q{font-weight:700;margin-bottom:10px}.dv-ops{display:flex;gap:14px;flex-wrap:wrap}.dv-op{flex:1;min-width:200px;background:#f3f4f6;border-radius:14px;padding:10px 18px;font-size:.85em}
.dv-op.ok{background:#dcfce7;border:3px solid #16a34a;color:#15803d;font-weight:700}
.dv-full{position:absolute;inset:0;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;overflow:hidden}
.dv-full .o{position:absolute;border-radius:50%;background:rgba(255,255,255,.12)}
.dv-card{position:relative;background:#fff;color:#1f2937;border-radius:30px;padding:30px 60px;width:1000px;box-sizing:border-box}
.dv-card .sub{font-size:28px;font-weight:700}.dv-card .ti{font-size:56px;font-weight:700;line-height:1.35;margin:10px 0}.dv-card .src{font-size:20px;color:#6b7280}
.dv-brand{position:relative;margin-top:26px;font-size:26px;font-weight:700}
.dv-logo{position:relative;width:96px;height:96px;border-radius:24px;margin-bottom:18px;background:#fff;padding:6px;box-sizing:border-box}
.dv-ctl{flex:none;display:flex;align-items:center;justify-content:center;gap:8px;padding:8px 10px calc(8px + env(safe-area-inset-bottom));background:#0d1226;flex-wrap:wrap}
.dv-ctl button{font:inherit;font-family:Alexandria,Tahoma,sans-serif;border:0;border-radius:999px;background:#232b4d;color:#fff;padding:9px 16px;font-size:15px;cursor:pointer;min-width:44px}
.dv-ctl button.on{background:#7c5cff}.dv-ctl button:disabled{opacity:.4}.dv-ctl .ct{color:#c9cff0;font-size:14px;min-width:64px;text-align:center}
.dv-pr{flex:none;height:4px;background:#232b4d}.dv-pr>i{display:block;height:100%;background:#7c5cff;transition:width .3s}
.dv-start{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;background:rgba(13,18,38,.55);z-index:3}
.dv-start button{font:inherit;font-family:Alexandria,Tahoma,sans-serif;border:0;border-radius:999px;padding:clamp(9px,2vh,16px) clamp(16px,4vw,34px);font-size:clamp(14px,3.2vmin,20px);max-width:92vw;font-weight:700;cursor:pointer;box-shadow:0 10px 30px rgba(0,0,0,.3)}
.dv-start .a{background:#ffd23f;color:#1f2937}.dv-start .b{background:#fff;color:#1f2937}.dv-start small{color:#fff;font-size:14px;opacity:.85;padding:0 12px;text-align:center}@media (max-height:460px),(max-width:520px){.dv-start small{display:none}}
.dv-tip{position:absolute;bottom:10px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,.6);color:#fff;border-radius:999px;padding:6px 14px;font-size:13px;z-index:4;pointer-events:none;white-space:nowrap}
.dv-lock .dv-card .ti{font-size:44px}
`;

/* المعادلات: البرنامج يعلّمها بنفس قواعد الباوربوينت (LRE…PDF) — تُعرض معزولة من اليسار لليمين (5 + 3 = 8)،
   ومعادلات الحروف العربية (أ = 12 ÷ 3) تبقى من اليمين كما في الكتاب */
function tx(el, s) {
  const f = document.createDocumentFragment(); s = String(s || ''); let i = 0;
  s.replace(/‪([^‬]*)‬?/g, (m, t, at) => { if (at > i) f.append(s.slice(i, at)); f.append(el('span', { class: 'dv-m', text: t })); i = at + m.length; return m; });
  if (i < s.length) f.append(s.slice(i)); return f;
}

export default async function openDeck(D, id, opt = {}) {
  const { el, store } = D;
  if (!document.getElementById('dv-css')) document.head.append(el('style', { id: 'dv-css', text: CSS }));
  const ov = el('div', { class: 'dv', role: 'dialog', 'aria-label': 'عرض الدرس' });
  const wrap = el('div', { class: 'dv-wrap' }), stage = el('div', { class: 'dv-stage' }), prog = el('div', { class: 'dv-pr' }, el('i'));
  wrap.append(stage); ov.append(wrap, prog); document.body.append(ov); document.body.style.overflow = 'hidden';
  stage.append(el('div', { class: 'dv-full', style: 'background:#2f5db8' }, el('div', { style: 'font-size:34px', text: '⏳ جارٍ تحميل العرض…' })));
  const fit = () => { const k = Math.min(wrap.clientWidth / W, wrap.clientHeight / H) * 0.97; stage.style.transform = 'translate(-50%,-50%) scale(' + k + ')'; };
  fit(); addEventListener('resize', fit);
  let closed = false; history.pushState({ dv: 1 }, '');
  const onPop = () => close(true); addEventListener('popstate', onPop);

  let d;
  try { d = await loadDeck(id); }
  catch (e) { stage.innerHTML = ''; stage.append(el('div', { class: 'dv-full', style: 'background:#2f5db8' }, el('div', { style: 'font-size:32px', text: '⚠️ ' + e.message }), el('div', { class: 'dv-brand', text: 'اضغط ✕ للرجوع' })));
    ov.append(el('div', { class: 'dv-ctl' }, el('button', { text: '✕ إغلاق', onclick: () => close() }))); return; }

  const [C, CL] = d.c || ['#2f5db8', '#e6eefb'], S = d.slides, N = S.length;
  const free = opt.free == null ? Infinity : Math.max(1, opt.free);
  const tts = (D.ACCX().tts || {}), voiceOk = !!tts.on && !!opt.voice && S.some(s => (s.say || []).length);
  let idx = 0, shown = 0, steps = [], weights = [], lead = 0, auto = false, voice = false, tok = 0, timer = null, speaking = false;
  const A = new Audio(); A.preload = 'auto';

  /* ---------- رسم الشرائح ---------- */
  const head = (s) => el('div', { class: 'dv-h', style: 'background:' + C }, s.i ? el('span', { class: 'ic', text: s.i }) : null, el('span', { class: 'tt' }, tx(el, s.h)), el('span', { class: 'dv-br', style: 'color:' + C, text: '🎓 المجتهد' }));
  const foot = (i) => el('div', { class: 'dv-f' }, el('span', { text: 'منصة المجتهد · mujtahid.ly' }), el('span', { text: d.title }), el('span', { text: (i + 1) + ' من ' + N }));
  const step = (node, w) => { node.classList.add('dv-st'); steps.push(node); weights.push(Math.max(8, w)); return node; };
  const full = (bg, ...kids) => el('div', { class: 'dv-full', style: 'background:' + bg },
    el('span', { class: 'o', style: 'width:420px;height:420px;top:-120px;right:-120px' }), el('span', { class: 'o', style: 'width:380px;height:380px;bottom:-140px;left:-90px' }), ...kids);
  const len = s => String(s || '').length;

  function draw(i, back) {
    steps = []; weights = []; lead = 0; shown = 0;
    const s = S[i], k = s.k; const node = el('div', { class: 'dv-s' + (back ? ' back' : '') });
    if (k === 'title') node.append(full(C, el('img', { class: 'dv-logo', src: 'icons/icon-192.png', alt: '' }),
      el('div', { class: 'dv-card' }, el('div', { class: 'sub', style: 'color:' + C, text: s.sub || '' }), el('div', { class: 'ti' }, tx(el, s.title)), s.src ? el('div', { class: 'src', text: s.src }) : null),
      el('div', { class: 'dv-brand', text: '🎓 منصة المجتهد  |  mujtahid.ly' })));
    else if (k === 'end') node.append(full(C, el('div', { style: 'font-size:72px;font-weight:700', text: d.rtl === false ? 'Well done! 🌟' : 'انتهى الدرس 🌟' }),
      el('div', { style: 'font-size:32px;margin-top:16px' }, tx(el, s.title)), el('div', { class: 'dv-brand', text: '🎓 منصة المجتهد  |  mujtahid.ly' })));
    else {
      const b = el('div', { class: 'dv-b' }); lead = len(s.h);
      if (k === 'list') (s.items || []).forEach((t, j) => b.append(step(el('div', { class: 'dv-row' }, el('span', { class: 'dv-n', style: 'background:' + C, text: s.num === false ? '•' : String(j + 1) }), el('span', {}, tx(el, t))), len(t))));
      else if (k === 'text') { const ps = (s.paras || []).map(([lb, rest]) => step(el('p', { class: 'dv-p' }, lb ? el('b', { style: 'color:' + C }, tx(el, lb)) : null, tx(el, rest)), len(lb) + len(rest)));
        const box = s.note ? el('div', { class: 'dv-note' }, ...ps) : el('div', {}, ...ps);
        if (s.img) b.append(el('div', { class: 'dv-cols' }, el('div', { class: 'tx' }, box), el('div', { class: 'dv-img' }, el('img', { src: s.img, alt: '' }))));
        else b.append(box); if (s.note) b.style.fontSize = '36px'; }
      else if (k === 'example') { lead += len(s.q); b.append(el('div', { class: 'dv-q', style: 'background:' + CL }, tx(el, s.q)));
        (s.steps || []).forEach((t, j) => b.append(step(el('p', { class: 'dv-p' }, (j + 1) + '.  ', tx(el, t)), len(t))));
        if (s.ans) b.append(step(el('p', { class: 'dv-p dv-ok' }, '✔ الناتج: ', tx(el, s.ans)), len(s.ans) + 8)); }
      else if (k === 'terms') { const g = el('div', { class: 'dv-terms' }); (s.terms || []).forEach(([t, m, must]) => g.append(step(el('div', { class: 'dv-term' + (must ? ' must' : ''), style: 'background:' + CL }, el('b', { style: 'color:' + C }, (must ? '★ ' : ''), tx(el, t)), tx(el, m)), len(t) + len(m)))); b.append(g); }
      else if (k === 'summary') b.append(el('div', { class: 'dv-note' }, ...(s.items || []).map(t => step(el('p', { class: 'dv-p' }, '• ', tx(el, t)), len(t)))));
      else if (k === 'quiz' || k === 'answer') { const L = d.rtl === false ? 'ABCDEFGH' : 'أبجدهوزح';
        (s.qs || []).forEach(q => { const ops = (q.o || []).map((o, j) => { const ok = k === 'answer' && o === q.a; return el('div', { class: 'dv-op' + (ok ? ' ok' : '') }, L[j] + ')  ', tx(el, o), ok ? '  ✔' : ''); });
          const box = el('div', { class: 'dv-qq' }, el('div', { class: 'q' }, q.n + ') ', tx(el, q.q)), ops.length ? el('div', { class: 'dv-ops' }, ...ops) : null,
            k === 'answer' && !ops.length && q.a ? el('div', { class: 'dv-op ok' }, '✔  ', tx(el, q.a)) : null);
          if (k === 'quiz') step(box, len(q.q) + (q.o || []).join('').length); b.append(box); }); }
      node.append(head(s), b, foot(i));
    }
    stage.innerHTML = ''; stage.append(node);
    /* تصغير الخط حتى يتسع النص للشريحة */
    const b = node.querySelector('.dv-b'); if (b) { let fs = parseFloat(getComputedStyle(b).fontSize); for (let t = 0; t < 14 && b.scrollHeight > b.clientHeight + 2; t++) { fs *= 0.92; b.style.fontSize = fs + 'px'; } }
    if (back) reveal(steps.length);
  }
  function lockSlide() { stop(); stage.innerHTML = ''; const reg = opt.lock === 'login';
    stage.append(el('div', { class: 'dv-s dv-lock' }, full(C, el('div', { style: 'font-size:70px', text: '🔒' }),
      el('div', { class: 'dv-card' }, el('div', { class: 'ti', text: reg ? 'سجّل مجاناً لتكمل العرض' : 'أكمل العرض كاملاً مع الاشتراك' }),
        el('div', { class: 'src', style: 'font-size:22px', text: 'شاهدت ' + free + ' شرائح من ' + N + ' — كل الدروس بالشرح والصوت والتمارين في منصة المجتهد.' })),
      el('div', { class: 'dv-brand' }, el('button', { style: 'font:inherit;font-size:26px;border:0;border-radius:999px;padding:14px 34px;background:#ffd23f;color:#1f2937;cursor:pointer', text: reg ? 'تسجيل مجاني' : '⭐ اشترك الآن',
        onclick: e => { e.stopPropagation(); const to = reg ? 'login' : 'subscribe'; close(); setTimeout(() => D.go(to), 50); } })))));
    upd(); }
  const reveal = n => { shown = Math.min(steps.length, n); steps.forEach((x, j) => x.classList.toggle('on', j < shown)); };

  /* ---------- الصوت ---------- */
  const vparams = () => { const st = d.st === 's' ? 's' : 'p', Sx = tts[st] || {}; const v = (opt.voice === 'teacher' && D.tvPick && D.tvPick(tts, st, Sx)) || Sx.a || ''; return { st, v, r: Sx.rate }; };
  const url = t => { const p = vparams(); return D.ttsUrl + '?st=' + p.st + '&v=' + encodeURIComponent(p.v) + (p.r ? '&r=' + p.r : '') + '&k=2&t=' + encodeURIComponent(t); };
  const audio = t => { const u = url(t); if (!AUD.has(u)) AUD.set(u, fetch(u).then(r => { if (!r.ok) throw new Error(r.status); return r.blob(); }).then(b => URL.createObjectURL(b)).catch(e => { AUD.delete(u); throw e; })); return AUD.get(u); };
  const prefetch = i => { if (voice && S[i]) (S[i].say || []).slice(0, 2).forEach(t => audio(t).catch(() => {})); };
  async function speak(i) {
    const my = ++tok, ch = S[i].say || []; speaking = true; if (!ch.length) return slideDone(my);
    const tot = ch.reduce((a, t) => a + t.length, 0) || 1, wsum = lead + weights.reduce((a, x) => a + x, 0) || 1;
    const starts = []; { let c = lead; weights.forEach(w => { starts.push(c / wsum); c += w; }); }
    prefetch(i + 1); let off = 0;
    for (const t of ch) {
      let src; try { src = await audio(t); } catch (e) { if (my !== tok) return; voiceFail(); return timed(i, my); }
      if (my !== tok) return; A.src = src;
      A.ontimeupdate = () => { if (my !== tok || !A.duration) return; const pos = (off + A.currentTime / A.duration * t.length) / tot; let n = 0; starts.forEach(x => { if (x <= pos + 0.02) n++; }); if (n > shown) reveal(n); };
      try { await A.play(); } catch (e) { if (my !== tok) return; voiceFail(); return timed(i, my); }
      await new Promise(res => { A.onended = res; A.onerror = res; A.onpause = () => { if (A.ended || my !== tok) res(); }; });
      if (my !== tok) return; off += t.length;
    }
    slideDone(my);
  }
  function slideDone(my) { if (my !== tok) return; speaking = false; reveal(steps.length); if (auto) timer = setTimeout(() => { if (my === tok) next(true); }, S[idx].k === 'quiz' ? 5000 : 1100); }
  function timed(i, my) { /* بدون صوت: تظهر الخطوات واحدة بعد أخرى حسب طول النص */
    const tick = () => { if (my !== tok || !auto) return; if (shown < steps.length) { reveal(shown + 1); timer = setTimeout(tick, Math.min(6000, Math.max(1800, weights[shown - 1] * 55))); } else timer = setTimeout(() => { if (my === tok) next(true); }, S[i].k === 'quiz' ? 6000 : 2500); };
    timer = setTimeout(tick, 1400); }
  let failed = false; const voiceFail = () => { if (failed) return; failed = true; voice = false; toast('🔇 الصوت غير متاح الآن — يستمر العرض بدونه'); upd(); };
  function stop() { tok++; speaking = false; clearTimeout(timer); try { A.pause(); } catch (e) { /* */ } }
  function run() { clearTimeout(timer); if (voice) speak(idx); else { const my = ++tok; if (auto) timed(idx, my); } }

  /* ---------- التنقل ---------- */
  function show(i, back) { stop(); if (i < 0) return; if (i >= free) { idx = Math.min(i, N - 1); return lockSlide(); } if (i >= N) { if (auto) { auto = false; upd(); return; } return close(); } idx = i; draw(i, back); upd(); run();
    if (window.AX && i === N - 1) AX.ev('deck_end', { l: id }); }
  function next(fromAuto) { if (!fromAuto && shown < steps.length) { reveal(shown + 1); return; } show(idx + 1); }
  function prev() { show(idx - 1, true); }

  /* ---------- أزرار التحكم ---------- */
  const bVoice = el('button', { title: 'الصوت', onclick: e => { e.stopPropagation(); voice = !voice; failed = false; if (voice) { A.src = SILENT(); A.play().catch(() => {}); run(); } else { stop(); if (auto) run(); } upd(); } });
  const bAuto = el('button', { title: 'تشغيل تلقائي', onclick: e => { e.stopPropagation(); auto = !auto; if (auto) { if (voice) { if (!speaking) next(true); } else { const my = ++tok; clearTimeout(timer); timed(idx, my); } } else if (!voice) { tok++; clearTimeout(timer); } upd(); } });
  const bPrev = el('button', { text: '→ السابق', onclick: e => { e.stopPropagation(); prev(); } }), bNext = el('button', { text: 'التالي ←', onclick: e => { e.stopPropagation(); next(); } });
  const ct = el('span', { class: 'ct' });
  const bFull = el('button', { text: '⛶', title: 'ملء الشاشة', onclick: e => { e.stopPropagation(); fullscreen(); } });
  const ctl = el('div', { class: 'dv-ctl' }, el('button', { text: '✕', title: 'إغلاق', onclick: e => { e.stopPropagation(); close(); } }), bFull, voiceOk ? bVoice : null, bAuto, bPrev, ct, bNext);
  ov.append(ctl);
  function upd() { ct.textContent = Math.min(idx + 1, N) + ' من ' + N; bPrev.disabled = idx === 0; prog.firstChild.style.width = ((idx + 1) / N * 100) + '%';
    bVoice.textContent = voice ? '🔊 بالصوت' : '🔇 بدون صوت'; bVoice.classList.toggle('on', voice); bAuto.textContent = auto ? '⏸ تلقائي' : '▶ تلقائي'; bAuto.classList.toggle('on', auto); }
  function fullscreen() { const f = document.fullscreenElement || document.webkitFullscreenElement;
    if (f) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); return; }
    const rq = ov.requestFullscreen || ov.webkitRequestFullscreen; if (rq) Promise.resolve(rq.call(ov)).then(() => { try { screen.orientation.lock('landscape').catch(() => {}); } catch (e) { /* */ } }).catch(() => {}); else toast('🔄 اقلب الهاتف أفقياً لعرض أكبر'); }
  let tipT = null; function toast(t) { const x = el('div', { class: 'dv-tip', text: t }); wrap.append(x); clearTimeout(tipT); tipT = setTimeout(() => x.remove(), 3500); }

  /* لمس: ضغطة = التالي · سحب يميناً = التالي · سحب يساراً = السابق (اتجاه الكتاب العربي) */
  let px = null, py = null;
  wrap.addEventListener('pointerdown', e => { px = e.clientX; py = e.clientY; });
  wrap.addEventListener('pointerup', e => { if (px == null || wrap.querySelector('.dv-start')) return; const dx = e.clientX - px, dy = e.clientY - py; px = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) { if (dx > 0) next(); else prev(); } else if (Math.abs(dx) < 10 && Math.abs(dy) < 10 && !e.target.closest('button')) next(); });
  const onKey = e => { if (e.key === 'Escape') return close(); if (['ArrowLeft', 'PageDown', ' ', 'Enter', 'ArrowDown'].includes(e.key)) { e.preventDefault(); next(); }
    else if (['ArrowRight', 'PageUp', 'Backspace', 'ArrowUp'].includes(e.key)) { e.preventDefault(); prev(); } else if (e.key === 'f' || e.key === 'F') fullscreen(); };
  addEventListener('keydown', onKey);

  function close(fromPop) { if (closed) return; closed = true; stop(); A.src = ''; removeEventListener('resize', fit); removeEventListener('keydown', onKey); removeEventListener('popstate', onPop);
    try { if (document.fullscreenElement) document.exitFullscreen(); } catch (e) { /* */ }
    ov.remove(); document.body.style.overflow = ''; if (!fromPop && history.state && history.state.dv) history.back(); }

  /* البداية: ضغطة المستخدم تفتح الصوت في الآيفون */
  idx = 0; draw(0); upd(); fit();
  if (innerWidth < 700 && innerHeight > innerWidth) toast('🔄 اقلب الهاتف أفقياً لعرض أكبر');
  const go0 = (v, a) => { voice = v; auto = a; st0.remove(); if (v) { A.src = SILENT(); A.play().catch(() => {}); }
    upd(); run(); window.AX && AX.ev('deck_open', { l: id, v: v ? 1 : 0, a: a ? 1 : 0 }); };
  const st0 = el('div', { class: 'dv-start' },
    voiceOk ? el('button', { class: 'a', text: '▶ ابدأ العرض بالصوت', onclick: e => { e.stopPropagation(); go0(true, true); } }) : el('button', { class: 'a', text: '▶ ابدأ العرض', onclick: e => { e.stopPropagation(); go0(false, true); } }),
    el('button', { class: 'b', text: '👆 عرض يدوي (للمعلم في الفصل)', onclick: e => { e.stopPropagation(); go0(false, false); } }),
    el('small', { text: 'التالي: ضغطة على الشريحة أو ← أو المسافة · السابق: → · ملء الشاشة: ⛶' }));
  wrap.append(st0);
}
