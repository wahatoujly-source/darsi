// المجتهد — اختبار المستوى المجاني (بدون تسجيل): #test (الرياضيات) و #test-en (الإنجليزي)
// مسار من مراحل (مهارات) متدرّجة الصعوبة، نقاط لكل إجابة ومجموع للمسار، مستوى ونقاط ضعف، بطاقة نتيجة للمشاركة، ودعوة للتسجيل.
import { SKILLS as ESK, skillsFor as enSkills, genEn } from './entest.js';
export default function runTest(D, h) {
  const { el, go, store, root, bar } = D;
  const im = /^test(?:-en)?-i-([2-9A-HJ-NP-Z]{6})$/.exec(h || ''); if (im && !(window.ACC && ACC.user)) store.set('ref_in', { c: im[1], at: Date.now() });
  const GN = ['', 'الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس', 'السابع', 'الثامن', 'التاسع'];
  const SK = { add: ['➕', 'الجمع'], sub: ['➖', 'الطرح'], mul: ['✖️', 'جدول الضرب'], div: ['➗', 'القسمة'], mix: ['🔀', 'العمليات الأربع'] };
  const SKD = { add: 'جمع الأعداد مع الحمل وبدونه', sub: 'الطرح مع الاستلاف وبدونه', mul: 'جداول الضرب من 2 إلى 10', div: 'القسمة على جداول الضرب', mix: 'خليط من العمليات الأربع',
    abc: 'أسماء الحروف وأصواتها والتهجئة', voc: 'كلمات المنهج بالصور والمعاني', gr: 'أكمل الجملة بالكلمة الصحيحة', rd: 'نصوص قصيرة وأسئلة فهم' };
  const mathSkills = g => g <= 1 ? ['add', 'sub'] : g === 2 ? ['add', 'sub', 'mul'] : g === 3 ? ['add', 'sub', 'mul', 'div'] : ['add', 'sub', 'mul', 'div', 'mix'];
  const R = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const css = `
.tst{--A1:#6d5dfc;--A2:#a855f7;--AS:color-mix(in srgb,var(--A1) 12%,var(--card));display:flex;flex-direction:column;gap:14px;padding-bottom:34px}
.tst.en{--A1:#0ea5e9;--A2:#14b8a6}
.tst h2,.tst h3{margin:0;font-family:var(--f-display)}.tst .sub{color:var(--muted);margin:0;line-height:1.8}
.tst .hero{position:relative;overflow:hidden;border-radius:26px;padding:18px 16px;color:#fff;background:linear-gradient(135deg,var(--A1),var(--A2));box-shadow:0 18px 34px -20px var(--A1);display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center}
.tst .hero::after{content:"";position:absolute;inset-inline-end:-50px;top:-60px;width:180px;height:180px;border-radius:50%;background:rgba(255,255,255,.14)}
.tst .hero b{font:800 1.3rem/1.5 var(--f-display);display:block}.tst .hero span{opacity:.95;line-height:1.7;font-size:.93rem}.tst .hero img{width:92px;height:92px;object-fit:contain;filter:drop-shadow(0 8px 12px rgba(0,0,0,.25));position:relative;z-index:1}
.tst .pills{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}.tst .pills i{font-style:normal;background:rgba(255,255,255,.2);border-radius:99px;padding:3px 10px;font-size:.8rem;font-weight:700}
.tst .stepl{display:flex;align-items:center;gap:8px;font:800 1rem var(--f-display);color:var(--ink)}.tst .stepl i{font-style:normal;width:26px;height:26px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(135deg,var(--A1),var(--A2));color:#fff;font-size:.85rem}
.tst .subj{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.tst .subj button{position:relative;border:2.5px solid var(--line);background:var(--card);border-radius:22px;padding:14px 8px 12px;display:grid;gap:4px;justify-items:center;font:inherit;color:var(--ink);cursor:pointer;transition:transform .15s,box-shadow .15s}
.tst .subj button:hover{transform:translateY(-2px)}.tst .subj button.on{border-color:transparent;background:linear-gradient(var(--card),var(--card)) padding-box,linear-gradient(135deg,var(--A1),var(--A2)) border-box;box-shadow:0 10px 22px -14px var(--A1)}
.tst .subj button.on::before{content:"✓";position:absolute;top:8px;inset-inline-start:10px;width:22px;height:22px;border-radius:50%;background:var(--A1);color:#fff;font-size:.8rem;display:grid;place-items:center;font-weight:800}
.tst .subj img{width:58px;height:58px;object-fit:contain}.tst .subj b{font:800 1.08rem var(--f-display)}.tst .subj small{color:var(--muted);font-size:.78rem}
.tst .nm{border:2px solid var(--line);border-radius:16px;padding:12px;font:inherit;font-size:1.05rem;text-align:center;background:var(--card);color:var(--ink)}.tst .nm:focus{outline:none;border-color:var(--A1)}
.tst .grades{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.tst .grades button{border:0;border-radius:18px;padding:10px 4px;cursor:pointer;font:inherit;color:#fff;display:grid;justify-items:center;gap:0;background:linear-gradient(150deg,hsl(var(--h) 80% 60%),hsl(calc(var(--h) + 25) 75% 48%));box-shadow:0 8px 16px -12px hsl(var(--h) 70% 40%);transition:transform .15s}
.tst .grades button:hover{transform:translateY(-2px) scale(1.02)}.tst .grades b{font:800 1.6rem/1.2 var(--f-display)}.tst .grades small{font-weight:700;font-size:.82rem;opacity:.95}.tst .grades button.on{outline:3px solid var(--ink);outline-offset:2px}
.tst .tot{display:flex;justify-content:space-between;align-items:center;gap:10px;background:var(--AS);border-radius:18px;padding:12px 14px}.tst .tot b{font:800 1.5rem var(--f-display);color:var(--A1)}
.tst .stages{display:grid;gap:10px}
.tst .stage{display:grid;grid-template-columns:auto 1fr auto;gap:12px;align-items:center;border:2px solid var(--line);background:var(--card);border-radius:20px;padding:12px;cursor:pointer;font:inherit;color:var(--ink);text-align:start;transition:transform .15s,box-shadow .15s}
.tst .stage:hover{transform:translateY(-1px);box-shadow:0 10px 20px -16px var(--A1)}
.tst .stage .no{width:46px;height:46px;border-radius:15px;display:grid;place-items:center;font-size:1.5rem;background:var(--AS)}
.tst .stage b{display:block;font:800 1.02rem var(--f-display)}.tst .stage small{color:var(--muted);font-size:.8rem;line-height:1.5}
.tst .stage .go{font:800 .85rem var(--f-display);border-radius:99px;padding:6px 12px;background:var(--AS);color:var(--A1);white-space:nowrap}
.tst .stage.next{border-color:transparent;background:linear-gradient(var(--card),var(--card)) padding-box,linear-gradient(135deg,var(--A1),var(--A2)) border-box}.tst .stage.next .go{background:linear-gradient(135deg,var(--A1),var(--A2));color:#fff}
.tst .stage.done .no{background:#dcfce7}.tst .stage.done .go{background:#dcfce7;color:#15803d}
.tst .seg{display:flex;gap:3px}.tst .seg i{flex:1;height:8px;border-radius:9px;background:var(--line)}.tst .seg i.ok{background:#22c55e}.tst .seg i.no{background:#ef4444}.tst .seg i.cur{background:linear-gradient(90deg,var(--A1),var(--A2))}
.tst .hud{display:flex;gap:5px;align-items:center;flex-wrap:nowrap}.tst .chip{display:inline-flex;align-items:center;gap:4px;border-radius:99px;padding:5px 10px;font:800 .8rem var(--f-display);white-space:nowrap;background:var(--card);border:1.5px solid var(--line);color:var(--ink)}
.tst .chip.sc{background:linear-gradient(135deg,#fbbf24,#f59e0b);border:0;color:#3b2500}.tst .chip.lv1{color:#15803d;background:#dcfce7;border-color:#bbf7d0}.tst .chip.lv2{color:#a16207;background:#fef9c3;border-color:#fde68a}.tst .chip.lv3{color:#b91c1c;background:#fee2e2;border-color:#fecaca}
.tst .chip.btn{cursor:pointer}.tst .hud .sp{flex:1}
.tst .qcard{position:relative;background:var(--card);border-radius:26px;padding:20px 16px;box-shadow:0 14px 34px -22px rgba(20,40,80,.45);border:1.5px solid color-mix(in srgb,var(--A1) 18%,var(--line));display:flex;flex-direction:column;gap:12px;animation:tstIn .35s ease}
@keyframes tstIn{from{opacity:0;transform:translateY(12px) scale(.98)}to{opacity:1;transform:none}}
.tst .qlab{align-self:center;font:700 .92rem var(--f-display);color:var(--A1);background:var(--AS);border-radius:99px;padding:4px 14px;text-align:center}
.tst .eqn{font:800 3.1rem/1.2 var(--f-display);display:flex;justify-content:center;align-items:center;flex-wrap:nowrap;white-space:nowrap;direction:ltr;letter-spacing:1px;color:var(--ink);margin:6px 0}.tst .eqn.m{font-size:2.4rem}.tst .eqn.s{font-size:1.9rem}.tst .eqn em{font-style:normal;color:var(--A1);padding:0 6px}.tst .eqn u{text-decoration:none;display:inline-block;min-width:1.4em;height:1em;border-radius:12px;border:3px dashed var(--A1);background:var(--AS);color:transparent;margin-inline-start:4px}
.tst .big{font-size:4.2rem;text-align:center;line-height:1.2}.tst .big.tx{font:800 2.5rem var(--f-display);direction:ltr;letter-spacing:2px;color:var(--ink)}
.tst .sent{direction:ltr;text-align:center;font:800 1.45rem/1.7 var(--f-display);color:var(--ink);padding:6px 4px}
.tst .sent u{display:inline-block;min-width:84px;margin:0 4px;border-radius:10px;background:var(--AS);border:2px dashed var(--A1);text-decoration:none;height:1.4em;vertical-align:middle}
.tst .text{direction:ltr;text-align:left;font-size:1.08rem;line-height:1.85;background:var(--AS);border-inline-start:5px solid var(--A1);border-radius:14px;padding:12px 14px;color:var(--ink)}
.tst .opts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.tst .opts.long{grid-template-columns:1fr}
.tst .opts button{position:relative;display:flex;align-items:center;justify-content:center;gap:8px;min-height:64px;border:2px solid var(--line);background:var(--card);border-radius:18px;padding:10px 34px;min-width:0;overflow-wrap:anywhere;font:800 1.5rem var(--f-display);color:var(--ink);cursor:pointer;box-shadow:0 4px 0 color-mix(in srgb,var(--A1) 22%,var(--line));transition:transform .1s,box-shadow .1s,border-color .15s}
.tst .opts button:hover{border-color:var(--A1)}.tst .opts button:active{transform:translateY(3px);box-shadow:0 1px 0 var(--line)}
.tst .opts button .k{position:absolute;inset-inline-start:10px;top:50%;transform:translateY(-50%);width:24px;height:24px;border-radius:8px;display:grid;place-items:center;background:var(--AS);color:var(--A1);font:800 .8rem var(--f-display)}
.tst .opts.en button,.tst .opts.long button{direction:ltr}.tst .opts.en button{font-size:1.12rem}.tst .opts.long button{font-size:1.05rem;justify-content:flex-start;padding-inline:44px 14px;text-align:left}
.tst .opts.emo button{font-size:2.6rem}
.tst .opts button.ok{background:linear-gradient(135deg,#22c55e,#16a34a);border-color:#16a34a;color:#fff;box-shadow:0 4px 0 #15803d;animation:tstPop .35s}.tst .opts button.ok .k{background:rgba(255,255,255,.25);color:#fff}
.tst .opts button.no{background:linear-gradient(135deg,#f87171,#dc2626);border-color:#dc2626;color:#fff;box-shadow:0 4px 0 #991b1b;animation:tstShake .4s}.tst .opts button.no .k{background:rgba(255,255,255,.25);color:#fff}
.tst .opts.done button:not(.ok):not(.no){opacity:.45}
@keyframes tstPop{40%{transform:scale(1.06)}}@keyframes tstShake{20%,60%{transform:translateX(-6px)}40%,80%{transform:translateX(6px)}}
.tst .fb{min-height:28px;text-align:center;font:800 1rem var(--f-display)}.tst .fb.ok{color:#16a34a}.tst .fb.no{color:#dc2626}
.tst .plus{position:absolute;top:10px;inset-inline-start:14px;font:800 1.3rem var(--f-display);color:#f59e0b;animation:tstUp 1s forwards;pointer-events:none}
@keyframes tstUp{from{opacity:0;transform:translateY(10px)}20%{opacity:1}to{opacity:0;transform:translateY(-36px)}}
.tst .listen{align-self:center;border:0;border-radius:99px;padding:8px 16px;background:var(--AS);color:var(--A1);font:800 .9rem var(--f-display);cursor:pointer}
.tst .res{position:relative;overflow:hidden;border-radius:28px;padding:22px 16px 18px;color:#fff;background:linear-gradient(140deg,var(--A1),var(--A2));text-align:center;display:grid;gap:10px;justify-items:center;box-shadow:0 18px 34px -20px var(--A1)}
.tst .ring{width:150px;height:150px;border-radius:50%;display:grid;place-items:center;background:conic-gradient(#fff calc(var(--p) * 1%),rgba(255,255,255,.22) 0)}
.tst .ring div{width:118px;height:118px;border-radius:50%;background:linear-gradient(140deg,var(--A1),var(--A2));display:grid;place-items:center;align-content:center}.tst .ring b{font:800 2.3rem/1 var(--f-display);direction:ltr}.tst .ring small{opacity:.9;font-weight:700}
.tst .res .lvl{font:800 1.45rem var(--f-display);background:rgba(255,255,255,.2);border-radius:99px;padding:4px 18px}
.tst .tiles{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;width:100%}.tst .tiles div{background:rgba(255,255,255,.16);border-radius:14px;padding:8px 2px}.tst .tiles b{display:block;font:800 1.1rem var(--f-display)}.tst .tiles span{font-size:.72rem;opacity:.95}
.tst .card{border:1.5px solid var(--line);background:var(--card);border-radius:22px;padding:14px;display:flex;flex-direction:column;gap:10px}
.tst .chips{display:flex;flex-wrap:wrap;gap:6px}.tst .chips span{border-radius:99px;padding:4px 11px;font-size:.85rem;font-weight:700}.tst .chips .g{background:#dcfce7;color:#166534}.tst .chips .w{background:#ffedd5;color:#9a3412}
.tst .mist{display:grid;gap:6px}.tst .mist div{display:flex;justify-content:space-between;gap:8px;align-items:center;background:var(--paper);border-radius:12px;padding:8px 10px;font-size:.9rem}.tst .mist .q{direction:ltr;font-weight:800;color:var(--ink)}.tst .mist .p{color:#dc2626;font-size:.82rem;white-space:nowrap}
.tst .nextc{display:grid;gap:10px;border-radius:22px;padding:14px;background:linear-gradient(var(--card),var(--card)) padding-box,linear-gradient(135deg,var(--A1),var(--A2)) border-box;border:2.5px solid transparent}
.tst .bigbtn{border:0;border-radius:18px;padding:15px;font:800 1.1rem var(--f-display);color:#fff;background:linear-gradient(135deg,var(--A1),var(--A2));cursor:pointer;box-shadow:0 6px 0 color-mix(in srgb,var(--A1) 70%,#000)}
.tst .bigbtn:active{transform:translateY(4px);box-shadow:0 2px 0 color-mix(in srgb,var(--A1) 70%,#000)}
.tst .shtxt{white-space:pre-line;background:var(--paper);border-radius:14px;padding:10px 12px;font-size:.9rem;line-height:1.8;color:var(--ink)}
.tst .cta{background:linear-gradient(135deg,#0f172a,#1e3a8a);color:#fff;border-radius:22px;padding:16px;display:flex;flex-direction:column;gap:8px;text-align:center}.tst .cta .btn{background:#fbbf24;color:#111}
.tst .acts{display:flex;gap:8px;justify-content:center;flex-wrap:wrap}
.tst .tbls{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.tst .tbls button{border:2px solid var(--line);background:var(--card);border-radius:16px;padding:14px 4px;font:800 1.05rem var(--f-display);color:var(--ink);cursor:pointer}.tst .tbls button:first-child{grid-column:1/-1;background:linear-gradient(135deg,var(--A1),var(--A2));color:#fff;border:0}`;
  if (!document.getElementById('tst-css2')) { const o = document.getElementById('tst-css'); o && o.remove(); document.head.append(el('style', { id: 'tst-css2', text: css })); }
  const st = { g: Number(store.get('tst_g', 0)) || 0, skill: null, table: 0, name: store.get('tst_name', ''), sub: /^test-en/.test(h || '') ? 'en' : /^test-math/.test(h || '') ? 'math' : store.get('tst_sub', 'math') };
  const EN = () => st.sub === 'en'; const SUBN = () => EN() ? 'الإنجليزي' : 'الرياضيات'; const ICO = () => EN() ? '🔤' : '🧮';
  const SKN = k => (EN() ? ESK : SK)[k]; const stages = () => EN() ? enSkills(st.g).filter(k => k !== 'mix').concat(['mix']) : mathSkills(st.g);
  const page = (t, s) => { root.innerHTML = ''; root.append(bar(t, s || 'مجاني — بدون تسجيل', 'home')); const w = el('section', { class: 'tst' + (EN() ? ' en' : '') }); root.append(w); return w; };
  const PK = () => 'tst_path_' + st.sub + '_' + st.g + '_' + (st.name || '');
  const path = () => store.get(PK(), {}); const savePath = p => store.set(PK(), p);
  const total = p => Object.values(p).reduce((a, x) => a + (x.pts || 0), 0);

  /* ---------- البداية: المادة + الاسم + الصف ---------- */
  function start() {
    const w = page('📝 اختبر مستوى ابنك');
    const hero = el('div', { class: 'hero' }), subj = el('div', { class: 'subj' });
    const drawHero = () => { w.className = 'tst' + (EN() ? ' en' : ''); hero.innerHTML = '';
      hero.append(el('div', {}, el('b', { text: EN() ? 'كم يعرف ابنك في الإنجليزي؟' : 'كم يعرف ابنك في الرياضيات؟' }),
        el('span', { text: EN() ? 'مراحل من منهج English for Libya: الحروف، الكلمات، القواعد والقراءة.' : 'مراحل في العمليات وجدول الضرب، تتدرّج حسب إجاباته.' }),
        el('div', { class: 'pills' }, el('i', { text: '⏱ دقيقتان لكل مرحلة' }), el('i', { text: '📈 يبدأ سهلاً ويتدرّج' }), el('i', { text: '🎁 مجاني' }))),
        el('img', { src: 'img/ui/' + (EN() ? 's_en' : 'q_test') + '.webp', alt: '' })); };
    const drawSubj = () => { subj.innerHTML = ''; [['math', 'q_test', 'الرياضيات', 'العمليات وجدول الضرب'], ['en', 's_en', 'الإنجليزي', 'حروف، كلمات، قواعد، قراءة']].forEach(([k, img, t, d]) =>
      subj.append(el('button', { class: st.sub === k ? 'on' : '', 'aria-pressed': String(st.sub === k), onclick: () => { st.sub = k; store.set('tst_sub', k); drawSubj(); drawHero(); } }, el('img', { src: 'img/ui/' + img + '.webp', alt: '' }), el('b', { text: t }), el('small', { text: d })))); };
    drawHero(); drawSubj();
    const nm = el('input', { class: 'nm', value: st.name, placeholder: 'اسم ابنك (اختياري) — يظهر في النتيجة', 'aria-label': 'اسم ابنك' });
    const grid = el('div', { class: 'grades' });
    for (let g = 1; g <= 9; g++) grid.append(el('button', { class: st.g === g ? 'on' : '', style: '--h:' + ((g * 37 + 200) % 360), 'aria-label': 'الصف ' + GN[g], onclick: () => { st.g = g; store.set('tst_g', g); st.name = nm.value.trim(); store.set('tst_name', st.name); chooseSkill(); } }, el('b', { text: String(g) }), el('small', { text: GN[g] })));
    w.append(hero, el('div', { class: 'stepl' }, el('i', { text: '1' }), 'اختر المادة'), subj, el('div', { class: 'stepl' }, el('i', { text: '2' }), 'اسم ابنك'), nm, el('div', { class: 'stepl' }, el('i', { text: '3' }), 'اختر الصف لتبدأ'), grid);
  }

  /* ---------- المراحل ---------- */
  function chooseSkill() {
    const w = page(ICO() + ' مراحل اختبار ' + SUBN(), (st.name ? st.name + ' · ' : '') + 'الصف ' + GN[st.g]);
    const P = path(), S = stages(); const nextK = S.find(k => !P[k]);
    w.append(el('div', { class: 'tot' }, el('div', {}, el('b', { text: '⭐ ' + total(P) }), el('div', { class: 'sub', style: 'font-size:.85rem', text: 'مجموع نقاط المسار · ' + S.filter(k => P[k]).length + ' من ' + S.length + ' مراحل' })),
      Object.keys(P).length ? el('button', { class: 'chip btn', text: '↺ من جديد', onclick: () => { savePath({}); chooseSkill(); } }) : null));
    const box = el('div', { class: 'stages' });
    S.forEach((k, i) => { const done = P[k], isNext = k === nextK, last = k === 'mix';
      box.append(el('button', { class: 'stage' + (done ? ' done' : '') + (isNext ? ' next' : ''), onclick: () => begin(k) },
        el('span', { class: 'no', text: done ? '✅' : SKN(k)[0] }),
        el('span', {}, el('b', { text: (last ? 'المرحلة النهائية: ' : 'المرحلة ' + (i + 1) + ': ') + SKN(k)[1] }), el('small', { text: done ? 'حصل على ' + done.pts + ' نقطة · ' + done.acc + '% · ' + done.lvl : (k === 'mix' && EN() ? 'أسئلة من كل المهارات معاً' : SKD[k] || '') })),
        el('span', { class: 'go', text: done ? 'أعد' : isNext ? 'ابدأ ▶' : 'ابدأ' }))); });
    w.append(box, el('p', { class: 'sub', style: 'text-align:center;font-size:.88rem', text: 'كل إجابة صحيحة تعطي نقاطاً حسب صعوبتها: سهل 10، متوسط 15، صعب 20، و+5 لكل 3 إجابات صحيحة متتالية.' }),
      el('div', { class: 'acts' }, el('button', { class: 'chip btn', text: '→ تغيير الصف أو المادة', onclick: start }), el('button', { class: 'chip btn', text: EN() ? '🧮 مراحل الرياضيات' : '🔤 مراحل الإنجليزي', onclick: () => { st.sub = EN() ? 'math' : 'en'; store.set('tst_sub', st.sub); chooseSkill(); } })));
  }
  const begin = k => { st.skill = k; st.table = 0; if (!EN() && (k === 'mul' || k === 'div')) chooseTable(); else play(); };
  function chooseTable() {
    const w = page(SK[st.skill][0] + ' ' + SK[st.skill][1], 'الصف ' + GN[st.g]);
    const g = el('div', { class: 'tbls' }, el('button', { text: '🌟 كل الجداول (موصى به)', onclick: () => { st.table = 0; play(); } }));
    for (let t = 2; t <= 10; t++) g.append(el('button', { text: 'جدول ' + t, onclick: () => { st.table = t; play(); } }));
    w.append(el('h3', { text: 'أي جدول؟' }), g, el('button', { class: 'chip btn', style: 'align-self:center', text: '→ رجوع إلى المراحل', onclick: chooseSkill }));
  }

  /* ---------- مولّد أسئلة الرياضيات (المستوى 1 سهل → 3 صعب) ---------- */
  const ADD = { 1: [5, 10, 18], 2: [20, 50, 100], 3: [50, 200, 999], 4: [100, 999, 9999] };
  const addMax = (g, lv) => (ADD[Math.min(g, 4)] || ADD[4])[lv - 1];
  function gen(skill, lv) {
    const g = st.g; let a, b, c, op, tag;
    if (skill === 'mix') skill = pick(['add', 'sub', 'mul', 'div']);
    if (skill === 'add') { const m = addMax(g, lv); a = R(1, Math.max(2, Math.floor(m * .6))); b = R(1, Math.max(1, m - a)); c = a + b; op = '+'; tag = ((a % 10) + (b % 10) >= 10) ? 'الجمع مع الحمل' : 'الجمع بدون حمل'; }
    else if (skill === 'sub') { const m = addMax(g, lv); a = R(2, m); b = R(1, a - 1); c = a - b; op = '−'; tag = (a % 10) < (b % 10) ? 'الطرح مع الاستلاف' : 'الطرح بدون استلاف'; }
    else {
      const tabs = st.table ? [st.table] : lv === 1 ? [2, 3, 4, 5, 10] : lv === 2 ? [2, 3, 4, 5, 6, 7] : [6, 7, 8, 9];
      const t = pick(tabs); const n = st.table ? R(1, 10) : lv === 3 ? R(3, 10) : R(1, 10);
      if (skill === 'mul') { [a, b] = Math.random() < .5 ? [t, n] : [n, t]; c = a * b; op = '×'; } else { a = t * n; b = t; c = n; op = '÷'; }
      tag = 'جدول ' + t;
    }
    const opts = new Set([c]); const near = [c + 1, c - 1, c + 2, c - 2, c + 10, c - 10, skill === 'mul' ? c + b : c + 3, skill === 'mul' ? c - a : c - 3, Number(String(c).split('').reverse().join(''))];
    for (const x of near.sort(() => Math.random() - .5)) { if (opts.size >= 4) break; if (x >= 0 && x !== c) opts.add(x); }
    while (opts.size < 4) opts.add(c + R(3, 15));
    return { k: 'math', a, b, c, op, tag, lv, key: a + op + b, opts: [...opts].sort(() => Math.random() - .5) };
  }

  /* ---------- الصوت ---------- */
  let AC = null; const ac = () => (AC = AC || new (window.AudioContext || window.webkitAudioContext)());
  const tone = (fs, type, vol, gap, dur) => { try { const A = ac(); if (A.state === 'suspended') A.resume(); const t = A.currentTime; fs.forEach((f, i) => { const o = A.createOscillator(), g = A.createGain(); o.frequency.value = f; o.type = type;
    g.gain.setValueAtTime(.0001, t + i * gap); g.gain.exponentialRampToValueAtTime(vol, t + i * gap + .015); g.gain.exponentialRampToValueAtTime(.0001, t + i * gap + dur); o.connect(g).connect(A.destination); o.start(t + i * gap); o.stop(t + i * gap + dur + .02); }); } catch (e) {} };
  const beep = ok => ok ? tone([660, 880, 1175], 'sine', .22, .08, .16) : tone([260, 196], 'triangle', .14, .12, .22);
  const tick = () => tone([1500], 'square', .025, 0, .03);
  let tickOn = store.get('tst_tick', true);
  const sayAr = q => { try { const w = { '+': 'زائد', '−': 'ناقص', '×': 'ضرب', '÷': 'تقسيم' }[q.op]; D.speakAr && D.speakAr(q.a + ' ' + w + ' ' + q.b + ' ؟', { force: true }); } catch (e) {} };
  const canSpeak = () => { try { return !!(D.ttsGet ? D.ttsGet('en') : window.speechSynthesis); } catch (e) { return !!window.speechSynthesis; } };
  const sayEn = t => { try { if (!t) return; if (D.speak) D.speak(t); else { const u = new SpeechSynthesisUtterance(t); u.lang = 'en-GB'; u.rate = .9; speechSynthesis.cancel(); speechSynthesis.speak(u); } } catch (e) {} };

  /* ---------- اللعب (الرياضيات والإنجليزي بنفس الواجهة) ---------- */
  function play() {
    const en = EN();
    const N = en ? (st.skill === 'rd' ? 10 : st.g <= 2 ? 12 : 15) : (st.g <= 2 ? 15 : 20);
    let i = 0, lv = en ? 1 : (st.g <= 2 ? 1 : 2), streak = 0, best = 0, pts = 0; const log = []; const t0 = Date.now();
    const seen = new Set(), usedRd = new Set(); const OK = en ? 'tst_seen_en' : 'tst_seen'; const old = new Set(store.get(OK, []));
    const qk = q => q.key || (q.k + (q.sent || '') + (q.big || '') + q.a + (q.q || ''));
    const fresh = () => { let q = null; for (let k = 0; k < 50; k++) { q = en ? genEn(st.skill, st.g, lv, { canSpeak: canSpeak(), usedRd }) : gen(st.skill, lv); if (!seen.has(qk(q)) && (k > 30 || !old.has(qk(q)))) break; }
      seen.add(qk(q)); if (q.k === 'rd') usedRd.add(q.key); return q; };
    const S = stages(), stN = S.indexOf(st.skill) + 1;
    const w = page(SKN(st.skill)[0] + ' ' + (st.skill === 'mix' && en ? 'المرحلة النهائية' : 'المرحلة ' + stN) + ': ' + SKN(st.skill)[1] + (st.table ? ' — جدول ' + st.table : ''), (st.name ? st.name + ' · ' : '') + SUBN() + ' · الصف ' + GN[st.g]);
    const seg = el('div', { class: 'seg' }, ...Array.from({ length: N }, () => el('i')));
    const qn = el('span', { class: 'chip' }), lvc = el('span', { class: 'chip' }), scc = el('span', { class: 'chip sc', text: '⭐ 0' }), clock = el('span', { class: 'chip', text: '⏱ 0:00' });
    const tk = el('button', { class: 'chip btn', 'aria-label': 'صوت المؤقت', title: 'صوت المؤقت', text: tickOn ? '🔔' : '🔕', onclick: () => { tickOn = !tickOn; store.set('tst_tick', tickOn); tk.textContent = tickOn ? '🔔' : '🔕'; } });
    const card = el('div'); const fb = el('div', { class: 'fb' });
    w.append(seg, el('div', { class: 'hud' }, qn, lvc, el('span', { class: 'sp' }), scc, clock, tk), card, fb);
    let cur = null, qT = 0, locked = false;
    const timer = setInterval(() => { if (!document.body.contains(w)) { clearInterval(timer); return; } const s2 = Math.round((Date.now() - t0) / 1000); clock.textContent = '⏱ ' + Math.floor(s2 / 60) + ':' + String(s2 % 60).padStart(2, '0'); if (tickOn && !locked) tick(); }, 1000);
    const LV = { 1: ['سهل', 'lv1'], 2: ['متوسط', 'lv2'], 3: ['صعب', 'lv3'] };
    const next = () => {
      if (i >= N) { clearInterval(timer); store.set(OK, [...old, ...seen].slice(-200)); return result(log, (Date.now() - t0) / 1000, pts, best); }
      cur = fresh(); qT = Date.now(); locked = false; const q = cur; fb.textContent = ''; fb.className = 'fb';
      [...seg.children].forEach((x, j) => { x.className = j < log.length ? (log[j].ok ? 'ok' : 'no') : j === i ? 'cur' : ''; });
      qn.textContent = 'سؤال ' + (i + 1) + ' / ' + N; lvc.className = 'chip ' + LV[lv][1]; lvc.textContent = '● ' + LV[lv][0];
      const c = el('div', { class: 'qcard' });
      if (!en) { const ln = String(q.a).length + String(q.b).length; c.append(el('div', { class: 'qlab', text: 'احسب الناتج' }), el('div', { class: 'eqn' + (ln >= 8 ? ' s' : ln >= 6 ? ' m' : '') }, String(q.a), el('em', { text: q.op }), String(q.b), el('em', { text: '=' }), el('u', { text: '?' })),
        el('button', { class: 'listen', text: '🔊 اسمع السؤال', onclick: () => sayAr(q) })); }
      else {
        c.append(el('div', { class: 'qlab', text: q.q }));
        if (q.text) c.append(el('div', { class: 'text', lang: 'en', text: q.text }));
        if (q.big) c.append(el('div', { class: 'big' + (q.bigEn ? ' tx' : ''), lang: q.bigEn ? 'en' : null, text: q.big }));
        if (q.sent) { const parts = q.sent.split('___'); const se = el('div', { class: 'sent', lang: 'en' }); parts.forEach((p2, j) => { se.append(p2); if (j < parts.length - 1) se.append(el('u')); }); c.append(se); }
        if ((q.say || q.sent) && canSpeak()) c.append(el('button', { class: 'listen', text: '🔊 اسمع', onclick: () => sayEn(q.say || q.sent.replace('___', '...')) }));
        if (q.say && (q.big === '🔊' || st.g <= 3)) setTimeout(() => sayEn(q.say), 250);
      }
      const long = en && q.opts.some(o => String(o).length > 16);
      const opts = el('div', { class: 'opts' + (q.emo ? ' emo' : en && q.en ? ' en' : '') + (long ? ' long' : '') });
      const K = en && q.en ? ['A', 'B', 'C', 'D'] : ['أ', 'ب', 'ج', 'د'];
      q.opts.forEach((v, j) => opts.append(el('button', { lang: en && q.en ? 'en' : null, 'data-v': String(v), onclick: e => choose(v, e.currentTarget, opts, c) }, el('span', { class: 'k', text: K[j] }), el('span', { text: String(v) }))));
      c.append(opts); card.innerHTML = ''; card.append(c);
    };
    const choose = (v, btn, opts, c) => { if (locked) return; locked = true; const ans = en ? cur.a : cur.c; const ok = String(v) === String(ans), secs = (Date.now() - qT) / 1000;
      let got = 0; if (ok) { streak++; best = Math.max(best, streak); got = { 1: 10, 2: 15, 3: 20 }[lv] + (streak >= 3 && streak % 3 === 0 ? 5 : 0); pts += got; } else streak = 0;
      log.push({ ...cur, ok, secs, picked: v, lv, got }); i++;
      opts.classList.add('done'); btn.classList.add(ok ? 'ok' : 'no'); if (!ok) [...opts.children].forEach(b => { if (b.dataset.v === String(ans)) b.classList.add('ok'); });
      beep(ok); scc.textContent = '⭐ ' + pts;
      if (ok) { c.append(el('span', { class: 'plus', text: '+' + got })); fb.className = 'fb ok'; fb.textContent = streak >= 3 ? '🔥 ' + streak + ' إجابات صحيحة متتالية!' : pick(['أحسنت! 🎉', 'ممتاز! ✨', 'رائع! 👏', 'صحيح! 🌟']); }
      else { fb.className = 'fb no'; fb.textContent = 'الإجابة الصحيحة: ' + ans; }
      // التدرّج: بعد إجابتين صحيحتين يصعد مستوى، ومع الخطأ ينزل (وفي الرياضيات تُحتسب السرعة أيضاً)
      const fast = en || secs < (st.g <= 2 ? 8 : 6);
      if (ok && fast) { if (streak >= 2 && streak % 2 === 0 && lv < 3) lv++; } else if (!ok && lv > 1) lv--;
      setTimeout(next, ok ? 750 : 1600); };
    next();
  }

  /* ---------- النتيجة ---------- */
  function result(log, totalSecs, pts, best) {
    const en = EN();
    const n = log.length, sc = log.filter(x => x.ok).length, acc = Math.round(sc * 100 / n), avg = totalSecs / n;
    const hardOk = log.filter(x => x.lv === 3 && x.ok).length;
    const thr = st.g <= 2 ? 8 : (st.skill === 'add' || st.skill === 'sub') ? 6 : 5;
    const L = en ? (acc >= 90 && hardOk >= 2 ? ['🏆', 'ممتاز', '#16a34a'] : acc >= 75 ? ['⭐', 'جيد جداً', '#2563eb'] : acc >= 55 ? ['👍', 'جيد', '#d97706'] : ['💪', 'يحتاج تدريباً', '#dc2626'])
      : (acc >= 90 && avg <= thr && hardOk >= 3 ? ['🏆', 'ممتاز', '#16a34a'] : acc >= 80 ? ['⭐', 'جيد جداً', '#2563eb'] : acc >= 60 ? ['👍', 'جيد', '#d97706'] : ['💪', 'يحتاج تدريباً', '#dc2626']);
    const by = {}; log.forEach(x => { const b = by[x.tag] = by[x.tag] || { n: 0, w: 0, slow: 0 }; b.n++; if (!x.ok) b.w++; else if (!en && x.secs > thr * 1.6) b.slow++; });
    const weak = Object.entries(by).filter(([, b]) => b.w || b.slow).sort((a, b) => (b[1].w * 2 + b[1].slow) - (a[1].w * 2 + a[1].slow));
    const strong = Object.entries(by).filter(([, b]) => !b.w && !b.slow).map(([k]) => k);
    const mmss = s2 => Math.floor(s2 / 60) + ':' + String(Math.round(s2 % 60)).padStart(2, '0');
    // حفظ المرحلة في المسار (تُحفظ أفضل نتيجة)
    const P = path(); const prevBest = P[st.skill]; if (!prevBest || pts >= prevBest.pts) P[st.skill] = { pts, acc, sc, n, lvl: L[1], at: Date.now() }; savePath(P);
    const H = store.get('tst_hist', []); H.push({ sub: st.sub, g: st.g, skill: st.skill, table: st.table, name: st.name, sc, n, pts, total: Math.round(totalSecs), lvl: L[1], at: Date.now() }); store.set('tst_hist', H.slice(-40));
    try { if (window.ACC && ACC.call) ACC.call('testLog', { subj: st.sub, g: String(st.g), skill: st.skill, n, sc, secs: Math.round(totalSecs), lvl: L[1] }).catch(() => {}); } catch (e) {}
    try { if (acc >= 60) D.cheer && D.cheer('win', { say: false }); } catch (e) {}
    try { window.AX && AX.ev('test_done', { s: st.sub, g: String(st.g), k: st.skill, sc, n }); } catch (e) {}
    const who = st.name || 'ابنك', S = stages(), nextK = S.find(k => !P[k]), TOT = total(P), doneN = S.filter(k => P[k]).length;
    const w = page(ICO() + ' نتيجة ' + (st.name || 'الاختبار'), SKN(st.skill)[1] + ' · ' + SUBN() + ' · الصف ' + GN[st.g]);
    w.append(el('div', { class: 'res' }, el('div', { style: 'font-size:2.6rem;line-height:1', text: L[0] }),
      el('div', { class: 'ring', style: '--p:' + acc }, el('div', {}, el('b', { text: acc + '%' }), el('small', { text: sc + ' من ' + n }))),
      el('div', { class: 'lvl', text: 'المستوى: ' + L[1] }),
      el('div', { class: 'tiles' }, el('div', {}, el('b', { text: '⭐ ' + pts }), el('span', { text: 'نقاط المرحلة' })), el('div', {}, el('b', { text: mmss(totalSecs) }), el('span', { text: 'الوقت' })),
        el('div', {}, el('b', { text: avg.toFixed(1) + 'ث' }), el('span', { text: 'لكل سؤال' })), el('div', {}, el('b', { text: '🔥 ' + best }), el('span', { text: 'أطول سلسلة' }))),
      prevBest ? el('div', { style: 'font-weight:700;opacity:.95', text: (pts > prevBest.pts ? '📈 تحسّن! ' : pts < prevBest.pts ? '📉 ' : '➖ ') + 'المرة السابقة: ' + prevBest.pts + ' نقطة' }) : null));
    const nc = el('div', { class: 'nextc' }, el('div', { class: 'tot', style: 'padding:0;background:none' }, el('div', {}, el('b', { text: '⭐ ' + TOT }), el('div', { class: 'sub', style: 'font-size:.85rem', text: 'مجموع نقاط المسار · ' + doneN + ' من ' + S.length + ' مراحل' }))));
    if (nextK) nc.append(el('button', { class: 'bigbtn', text: 'التالي: ' + (nextK === 'mix' && en ? 'المرحلة النهائية' : 'المرحلة ' + (S.indexOf(nextK) + 1)) + ' — ' + SKN(nextK)[1] + ' ←', onclick: () => begin(nextK) }));
    else nc.append(el('div', { style: 'text-align:center;font:800 1.1rem var(--f-display)', text: '🏁 أكمل ' + who + ' كل مراحل ' + SUBN() + '!' }), el('button', { class: 'bigbtn', text: en ? '🧮 الآن مراحل الرياضيات ←' : '🔤 الآن مراحل الإنجليزي ←', onclick: () => { st.sub = en ? 'math' : 'en'; store.set('tst_sub', st.sub); chooseSkill(); } }));
    nc.append(el('div', { class: 'acts' }, el('button', { class: 'chip btn', text: '🔁 أعد هذه المرحلة', onclick: () => begin(st.skill) }), el('button', { class: 'chip btn', text: '🗺️ كل المراحل', onclick: chooseSkill })));
    w.append(nc);
    const an = el('div', { class: 'card' }, el('h3', { text: '🔍 التحليل' }));
    if (strong.length) an.append(el('div', { class: 'sub', style: 'font-size:.85rem', text: 'يتقن:' }), el('div', { class: 'chips' }, ...strong.slice(0, 8).map(k => el('span', { class: 'g', text: '✓ ' + k }))));
    if (weak.length) an.append(el('div', { class: 'sub', style: 'font-size:.85rem', text: 'يحتاج تدريباً في:' }), el('div', { class: 'chips' }, ...weak.slice(0, 6).map(([k, b]) => el('span', { class: 'w', text: k + (b.w ? ' · ' + b.w + ' خطأ' : ' · بطيء') }))));
    if (!weak.length) an.append(el('div', { text: '🌟 لا توجد نقاط ضعف واضحة في هذه المرحلة.' }));
    const wrong = log.filter(x => !x.ok).slice(0, 6);
    if (wrong.length) an.append(el('div', { class: 'sub', style: 'font-size:.85rem', text: 'الأخطاء والإجابة الصحيحة:' }), el('div', { class: 'mist' }, ...wrong.map(x => el('div', {},
      el('span', { class: 'q', text: en ? (x.k === 'rd' ? x.sent + ' → ' + x.a : x.sent ? x.sent.replace('___', x.a) : (x.big && x.big !== '🔊' ? x.big + ' → ' : '') + x.a) : x.a + ' ' + x.op + ' ' + x.b + ' = ' + x.c }),
      el('span', { class: 'p', text: 'أجاب: ' + x.picked })))));
    an.append(el('div', { class: 'sub', style: 'font-size:.9rem', text: acc >= 90 ? 'ممتاز! التدريب اليومي القصير يحافظ على هذا المستوى.' : en ? 'درس قصير يومياً مع الاستماع والتكرار يرفع مستواه بوضوح خلال أسبوعين.' : 'التدريب 10 دقائق يومياً على هذه النقاط يرفع مستواه بوضوح خلال أسبوعين.' }));
    w.append(an);
    const sm = el('div');
    const ref = store.get('my_ref', ''); const link = 'https://mujtahid.ly/#test' + (en ? '-en' : '') + (ref ? '-i-' + ref : '');
    const subN = SUBN(), kid = st.name ? 'ابني ' + st.name : 'ابني';
    const head = (acc >= 55 ? '🎉 ' + kid + ' اجتاز' : '📝 ' + kid + ' أنهى') + ' اختبار ' + subN + ' (' + SKN(st.skill)[1] + ') للصف ' + GN[st.g] + ' بنسبة ' + acc + '%';
    const shareTxt = head + '\n' + L[0] + ' المستوى: ' + L[1] + ' — ' + sc + ' إجابات صحيحة من ' + n + (doneN > 1 ? '\n⭐ مجموع نقاطه: ' + TOT + ' في ' + doneN + ' مراحل' : '') + '\n📚 على منصة المجتهد للمنهج الليبي\n\n👈 خلّي ابنك يختبر نفسه مجاناً في دقيقتين:\n' + link;
    w.append(el('div', { class: 'card' }, el('h3', { text: '📤 شارك النتيجة' }), el('div', { class: 'shtxt', text: shareTxt }),
      el('div', { class: 'acts', style: 'justify-content:flex-start' },
        el('a', { class: 'btn sun', href: 'https://wa.me/?text=' + encodeURIComponent(shareTxt), target: '_blank', rel: 'noopener', text: '💬 واتساب', onclick: () => { try { window.AX && AX.ev('share_click', { to: 'whatsapp', l: 'test-' + st.sub }); } catch (e) {} } }),
        el('button', { class: 'btn ghost', text: '🖼️ صورة النتيجة', onclick: () => shareImage({ kid, subN, skN: SKN(st.skill)[1], g: GN[st.g], acc, sc, n, pts, L, en, txt: shareTxt }, sm) })), sm));
    const logged = window.ACC && ACC.user;
    w.append(el('div', { class: 'cta' }, el('b', { style: 'font-size:1.15rem', text: logged ? '📚 درّبه الآن على نقاط ضعفه' : '🎁 احفظ نتيجة ' + who + ' وتابع تقدّمه' }),
      el('span', { text: logged ? 'دروس ' + subN + ' للصف ' + GN[st.g] + ' بالصوت والصورة والألعاب.' : 'سجّل مجاناً في 20 ثانية: دروس المنهج الليبي بالصوت والصورة، وتقارير عن ابنك.' }),
      el('button', { class: 'btn paybig', text: logged ? 'ابدأ التدريب ←' : 'سجّل مجاناً ←', onclick: () => logged ? go('g' + st.g + '-' + (en ? 'en' : 'math')) : go('login') })));
    if (!en && (st.skill === 'mul' || st.skill === 'div')) w.append(el('div', { class: 'acts' }, el('button', { class: 'btn', text: '✖️ احفظ جدول الضرب', onclick: () => go(st.table ? 'times-' + st.table : 'times') })));
  }

  /* ---------- صورة النتيجة (1080×1080) ---------- */
  async function shareImage(r, m) {
    try { await Promise.all([document.fonts.load('800 60px Alexandria'), document.fonts.load('700 40px Alexandria')]); } catch (e) {}
    const c = document.createElement('canvas'); c.width = c.height = 1080; const x = c.getContext('2d');
    const cols = r.en ? ['#0ea5e9', '#14b8a6'] : ['#6d5dfc', '#a855f7'];
    const gr = x.createLinearGradient(0, 0, 1080, 1080); gr.addColorStop(0, cols[0]); gr.addColorStop(1, cols[1]); x.fillStyle = gr; x.fillRect(0, 0, 1080, 1080);
    x.fillStyle = 'rgba(255,255,255,.1)'; [[120, 140, 170], [990, 230, 130], [930, 990, 210], [70, 900, 120]].forEach(([a, b, rr]) => { x.beginPath(); x.arc(a, b, rr, 0, 7); x.fill(); });
    const F = (wgt, sz) => wgt + ' ' + sz + 'px Alexandria, Tahoma, sans-serif'; x.direction = 'rtl'; x.textAlign = 'center';
    x.fillStyle = '#fff'; x.font = F(800, 58); x.fillText('المجتهد', 540, 108); x.font = F(700, 30); x.globalAlpha = .92; x.fillText('منصة دروس واختبارات المنهج الليبي', 540, 156); x.globalAlpha = 1;
    x.fillStyle = '#fff'; x.beginPath(); x.roundRect(80, 196, 920, 712, 56); x.fill();
    x.fillStyle = '#0f172a'; x.font = F(800, 54); x.fillText(r.acc >= 55 ? '🎉 ' + r.kid + ' اجتاز الاختبار' : r.kid + ' أنهى الاختبار', 540, 292);
    x.fillStyle = '#64748b'; x.font = F(700, 34); x.fillText(r.subN + ' — ' + r.skN + ' — الصف ' + r.g, 540, 350);
    const cx = 540, cy = 550, rad = 140; x.lineWidth = 34; x.lineCap = 'round'; x.strokeStyle = '#e2e8f0'; x.beginPath(); x.arc(cx, cy, rad, 0, Math.PI * 2); x.stroke();
    const rg = x.createLinearGradient(cx - rad, cy - rad, cx + rad, cy + rad); rg.addColorStop(0, cols[0]); rg.addColorStop(1, cols[1]); x.strokeStyle = rg;
    x.beginPath(); x.arc(cx, cy, rad, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(.01, r.acc / 100)); x.stroke();
    x.fillStyle = '#0f172a'; x.font = F(800, 92); x.direction = 'ltr'; x.fillText(r.acc + '%', cx, cy + 30); x.direction = 'rtl';
    x.fillStyle = '#334155'; x.font = F(700, 34); x.fillText(r.sc + ' إجابات صحيحة من ' + r.n + '  ·  ⭐ ' + r.pts + ' نقطة', 540, 760);
    x.font = F(800, 38); const lt = 'المستوى: ' + r.L[1], lw = Math.min(820, x.measureText(lt).width + 90); x.fillStyle = r.L[2]; x.beginPath(); x.roundRect(540 - lw / 2, 796, lw, 76, 38); x.fill(); x.fillStyle = '#fff'; x.fillText(lt, 540, 848);
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
