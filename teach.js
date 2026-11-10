// المجتهد — منصة المعلمين: دورات فيديو مدفوعة (الفيديو على يوتيوب غير مدرج، داخل مشغّل يخفي يوتيوب)
// الصفحات: courses · courses-gN · courses-skill · courses-mine · crs-<id> · tch-<id> · studio · studio-<id|new> · cpaid-<order>
export default function initTeach(X) {
  const { call, fnErr, ACC, page, fbk, D, el, go, store } = X;
  const GR = [['1', 'الأول'], ['2', 'الثاني'], ['3', 'الثالث'], ['4', 'الرابع'], ['5', 'الخامس'], ['6', 'السادس'], ['7', 'السابع'], ['8', 'الثامن'], ['9', 'التاسع']];
  const gName = g => (GR.find(x => x[0] === String(g)) || [, ''])[1];
  const SUBJ = { isl: 'التربية الإسلامية', ar: 'اللغة العربية', math: 'الرياضيات', en: 'اللغة الإنجليزية', sci: 'العلوم', soc: 'الاجتماعيات', hist: 'التاريخ', geo: 'الجغرافيا', civ: 'التربية الوطنية', comp: 'الحاسوب', art: 'التربية الفنية', phy: 'الفيزياء', chem: 'الكيمياء', bio: 'الأحياء', other: 'أخرى' };
  const KIND = { course: 'دورة كاملة', boost: 'حصص تقوية', exam: 'مراجعة قبل الامتحان', skill: 'مهارة' };
  const STAT = { draft: ['مسودة', 'gray'], pending: ['قيد المراجعة', 'sun'], live: ['منشورة', 'ok'], rejected: ['مرفوضة', 'bad'], off: ['موقوفة', 'bad'] };
  const cfg = () => ((ACC.access || {}).teach || {});
  const on = () => !!(cfg().on && cfg().show) || !!ACC.isAdmin;
  const money = n => (Math.round(Number(n || 0) * 100) / 100) + ' د.ل';
  const mins = ls => { const m = ls.reduce((a, l) => a + (l.min || 0), 0); return m ? (m >= 60 ? Math.floor(m / 60) + ' س ' + (m % 60 ? m % 60 + ' د' : '') : m + ' دقيقة') : ''; };
  const where = c => c.cat === 'skill' ? (c.skill || 'مهارة') : (SUBJ[c.subject] || '') + ' · الصف ' + gName(c.grade);
  const fdate = ms => ms ? new Date(ms).toLocaleDateString('ar-LY-u-nu-latn', { year: 'numeric', month: 'short', day: 'numeric' }) : '';
  const ini = n => (String(n || '؟').replace(/^\s*(أ|د|م|ا)\.\s*/, '').trim() || '؟')[0];
  const tag = (t, c) => el('span', { class: 'tc-tag ' + (c || ''), text: t });
  const loading = s => { const m = el('div'); s.append(m); fbk(m, 'info', 'جارٍ التحميل…'); return m; };
  const TERMS = ['الفيديوهات التي تنشرها في المنصة حصرية لها: تُعرض لمشتركي دورتك فقط داخل المنصة، ولا تنشرها في مكان آخر بمقابل أو مجاناً.',
    'لا تعيد المنصة نشر فيديوهاتك أو استخدامها خارج دورتك إلا بموافقتك.',
    'تحصل على 70% من سعر كل اشتراك في دورتك، وتأخذ المنصة 30% وتتحمّل منها رسوم الدفع الإلكتروني.',
    'سعر الدورة من 30 إلى 500 دينار تحدّده أنت، والدرس الأول مجاني للجميع كتعريف بدورتك.',
    'تطلب سحب رصيدك عندما يبلغ 200 دينار فأكثر، مرة واحدة كل 30 يوماً، إلى حسابك المصرفي المسجّل.',
    'المحتوى من إعدادك ولا يخالف حقوق غيرك أو الآداب العامة، وللإدارة مراجعة الدورات وإيقاف المخالف منها.'];

  /* ---------------- styles ---------------- */
  const css = `
.acc select,.acc textarea{width:100%;box-sizing:border-box;border:1.5px solid var(--line);border-radius:12px;padding:10px 12px;font:inherit;background:var(--card);color:var(--ink)}.acc textarea{resize:vertical;line-height:1.7}
.tc-chips{display:flex;gap:6px;overflow-x:auto;padding:4px 2px 10px;scrollbar-width:none}.tc-chips::-webkit-scrollbar{display:none}
.tc-chip{flex:0 0 auto;border:1px solid var(--line);background:var(--card);color:var(--ink);border-radius:999px;padding:7px 13px;font:inherit;font-weight:700;font-size:.85rem;cursor:pointer}
.tc-chip.on{background:var(--sea);border-color:var(--sea);color:#fff}
.tc-t{display:flex;align-items:center;gap:10px;margin:14px 0 8px;cursor:pointer;background:none;border:0;padding:0;font:inherit;color:inherit;text-align:start;width:100%}
.tc-av{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;font-weight:800;font-size:1.2rem;color:#fff;background:linear-gradient(135deg,var(--sea),#7c3aed);flex:0 0 auto}
.tc-av.big{width:68px;height:68px;font-size:1.8rem}
.tc-t b{display:block;font-family:var(--f-display);font-size:1.05rem}.tc-t small{color:var(--muted);font-size:.8rem}
.tc-card{display:block;width:100%;text-align:start;border:1px solid var(--line);background:var(--card);border-radius:18px;padding:13px 14px;margin-bottom:9px;font:inherit;color:inherit;cursor:pointer}
.tc-card b{font-family:var(--f-display);font-size:1rem;display:block;margin:4px 0}
.tc-card .tc-m{display:flex;flex-wrap:wrap;gap:6px;align-items:center;color:var(--muted);font-size:.8rem}
.tc-price{margin-inline-start:auto;background:var(--sea);color:#fff;font-weight:800;border-radius:999px;padding:4px 11px;font-size:.82rem}
.tc-tag{display:inline-block;font-size:.72rem;font-weight:800;border-radius:999px;padding:3px 9px;background:color-mix(in srgb,var(--sea) 14%,var(--card));color:var(--sea)}
.tc-tag.sun{background:color-mix(in srgb,#f59e0b 20%,var(--card));color:#b45309}.tc-tag.ok{background:color-mix(in srgb,#16a34a 18%,var(--card));color:#15803d}
.tc-tag.bad{background:color-mix(in srgb,#dc2626 16%,var(--card));color:#b91c1c}.tc-tag.gray{background:var(--line);color:var(--muted)}
.tv{position:relative;width:100%;aspect-ratio:16/9;background:#000;border-radius:16px;overflow:hidden;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none}
.tv-frame{position:absolute;left:0;right:0;top:-62px;bottom:-62px}.tv-frame iframe,.tv-frame>div{width:100%;height:100%;border:0}
.tv-shield{position:absolute;inset:0;z-index:2}
.tv-wm{position:absolute;z-index:3;color:#fff;opacity:.38;font-weight:800;font-size:.8rem;letter-spacing:.5px;text-shadow:0 1px 3px #000;pointer-events:none;transition:top 1.5s,left 1.5s;direction:ltr}
.tv-cover{position:absolute;inset:0;z-index:4;display:grid;place-items:center;text-align:center;color:#fff;padding:14px;background:linear-gradient(135deg,#0f2b5b,#1d4ed8 60%,#7c3aed)}
.tv-cover.dim{background:rgba(5,10,25,.88)}
.tv-cover .tv-big{width:68px;height:68px;border-radius:50%;border:0;background:rgba(255,255,255,.95);color:#1d4ed8;font-size:1.7rem;cursor:pointer;box-shadow:0 6px 24px rgba(0,0,0,.35)}
.tv-cover p{margin:8px 0 0;font-weight:700}.tv-cover small{opacity:.8}
.tv-bar{position:absolute;left:0;right:0;bottom:0;z-index:5;display:flex;align-items:center;gap:8px;padding:6px 10px;background:linear-gradient(transparent,rgba(0,0,0,.75));color:#fff;direction:ltr;transition:opacity .3s}
.tv.idle .tv-bar{opacity:0}
.tv-bar button{background:none;border:0;color:#fff;font-size:1rem;cursor:pointer;padding:4px 6px;font-weight:800}
.tv-bar input{flex:1;accent-color:#fbbf24;min-width:40px}.tv-bar span{font-size:.75rem;font-variant-numeric:tabular-nums}
.tv.full{position:fixed;inset:0;z-index:9999;border-radius:0;aspect-ratio:auto;width:100vw;height:100vh}
.tv-end{display:flex;flex-direction:column;gap:8px;width:min(100%,420px)}
.tv-end button{border:0;border-radius:12px;padding:9px 12px;font:inherit;font-weight:700;cursor:pointer;text-align:start;background:rgba(255,255,255,.12);color:#fff}
.tv-end button.go{background:#fbbf24;color:#111;text-align:center}
.tc-ls{display:flex;flex-direction:column;gap:6px}
.tc-l{display:grid;grid-template-columns:34px 1fr auto;gap:10px;align-items:center;border:1px solid var(--line);background:var(--card);border-radius:14px;padding:9px 11px;font:inherit;color:inherit;text-align:start;cursor:pointer;width:100%}
.tc-l .n{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:var(--line);font-weight:800;font-size:.85rem}
.tc-l.on{border-color:var(--sea);box-shadow:0 0 0 2px color-mix(in srgb,var(--sea) 30%,transparent)}.tc-l.on .n{background:var(--sea);color:#fff}
.tc-l small{color:var(--muted);display:block;font-size:.75rem}.tc-l.lk{opacity:.7;cursor:default}
.tc-buy{border:2px solid var(--sea);border-radius:18px;padding:14px;background:color-mix(in srgb,var(--sea) 7%,var(--card));display:flex;flex-direction:column;gap:8px}
.tc-buy .btn{width:100%}
.tc-tabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px}
.tc-wal{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px}
.tc-wal div{border:1px solid var(--line);background:var(--card);border-radius:14px;padding:10px;text-align:center}.tc-wal b{display:block;font-size:1.25rem;font-family:var(--f-display)}.tc-wal span{font-size:.75rem;color:var(--muted)}
.tc-ed{display:grid;grid-template-columns:28px 1fr;gap:6px 8px;border:1px solid var(--line);border-radius:14px;padding:9px;background:var(--card)}
.tc-ed .n{font-weight:800;color:var(--sea);padding-top:8px;text-align:center}.tc-ed .f{display:flex;flex-direction:column;gap:6px}
.tc-ed .r{display:flex;gap:6px;align-items:center;flex-wrap:wrap}.tc-ed input{min-width:0}
.tc-ed .r input.min{width:80px}
.tc-terms{font-size:.85rem;line-height:1.8;padding-inline-start:18px;margin:4px 0}
.tc-adm-row{border:1px solid var(--line);border-radius:14px;padding:10px;display:flex;flex-direction:column;gap:6px;background:var(--card)}
.tc-adm-row .row{gap:6px;flex-wrap:wrap}
.tc-bank{font-size:.82rem;line-height:1.7;background:var(--paper);border-radius:10px;padding:8px;direction:rtl}
.tc-bank code{direction:ltr;unicode-bidi:embed;font-weight:700}
.tc-card-home{border-color:color-mix(in srgb,#7c3aed 30%,var(--line))!important;background:linear-gradient(120deg,color-mix(in srgb,#7c3aed 12%,var(--card)),var(--card))!important}
.tc-card-home .bk-go{background:#7c3aed!important}

/* v6 */
.tc-chips{padding-top:10px}.tc-chip{border:0;background:#fff;box-shadow:0 3px 0 #dde2f0;font-family:var(--kx-d)}.tc-chip.on{background:linear-gradient(180deg,#8a6bff,#5b3ee8);box-shadow:0 3px 0 #3d26b0}
.tc-teach{display:flex;align-items:center;gap:10px;width:100%;border:2px dashed #c9b8ff;background:#f7f3ff;border-radius:18px;padding:10px 12px;font:inherit;color:inherit;cursor:pointer;text-align:start;margin-bottom:6px}
.tc-teach>span:first-child{font-size:1.6rem}.tc-teach b{display:block;color:#5b3ee8}.tc-teach small{color:var(--kx-mut);font-weight:600}.tc-teach .go{margin-inline-start:auto;font-weight:800;color:#5b3ee8}
.tc-t{background:#fff;border-radius:18px;padding:8px 10px;box-shadow:0 8px 20px -18px rgba(23,32,61,.6)}
.tc-card2{display:flex;gap:12px;align-items:stretch;border:0;border-radius:20px;padding:10px;box-shadow:0 10px 24px -18px rgba(23,32,61,.6)}
.tc-th{position:relative;flex:none;width:92px;border-radius:16px;background:linear-gradient(160deg,#eef0ff,#dfe3ff);display:grid;place-items:center}
.tc-th img{width:76px;height:76px;object-fit:contain}.tc-th i{position:absolute;bottom:6px;inset-inline-end:6px;width:26px;height:26px;border-radius:50%;background:#fff;color:#5b3ee8;display:grid;place-items:center;font-style:normal;font-size:.75rem;box-shadow:0 2px 6px rgba(0,0,0,.2)}
.tc-bd{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}.tc-card2 b{font-family:var(--kx-d);font-size:1.05rem;margin:0;color:var(--kx-ink)}
.tc-price{background:linear-gradient(180deg,#ffd451,#f5a400);color:#3a2300;box-shadow:0 2px 0 #b97800}.tc-free{color:#15803d;font-weight:800;font-size:.75rem}
.tc-tph{display:flex;gap:12px;align-items:center;padding:14px;border-radius:24px;background:linear-gradient(160deg,#a066ff,#5b3ee8);color:#fff;box-shadow:0 12px 26px -16px #5b3ee8}
.tc-tph .tc-av{background:#fff;color:#5b3ee8}.tc-tph b{display:block;font-family:var(--kx-d);font-size:1.3rem}.tc-tph small{display:block;opacity:.9;font-weight:600}.tc-tph .c{display:inline-block;margin-top:4px;background:rgba(255,255,255,.2);border-radius:99px;padding:2px 10px;font-size:.8rem;font-weight:700}
.tv{border-radius:22px;box-shadow:0 16px 30px -18px rgba(0,0,0,.6)}
.tc-buy{border:0;background:linear-gradient(160deg,#fff8e1,#fff);box-shadow:0 0 0 2px #ffd451 inset,0 12px 26px -20px rgba(0,0,0,.5);border-radius:22px}
.tc-l{border:0;background:#fff;border-radius:16px;box-shadow:0 6px 16px -14px rgba(23,32,61,.6)}.tc-l .n{background:#eef0ff;color:#5b3ee8}.tc-l.on{box-shadow:0 0 0 2px #8a6bff}.tc-l.on .n{background:#5b3ee8}
.tc-wal div{border:0;border-radius:18px;background:#fff;box-shadow:0 8px 20px -16px rgba(23,32,61,.6)}.tc-wal div:first-child{background:linear-gradient(160deg,#ffd451,#f5a400);color:#3a2300}.tc-wal div:first-child span{color:#5a3a00}
.tc-wal b{font-family:var(--kx-d)}
.tc-tabs{flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;padding:4px 2px 8px}.tc-tabs .tc-chip{flex:0 0 auto}
.tc-ed{border:0;background:#fff;border-radius:18px;box-shadow:0 8px 20px -16px rgba(23,32,61,.6)}
`;
  document.head.append(el('style', { text: css }));

  /* ---------------- data ---------------- */
  let LIST = null, LIST_AT = 0;
  const getList = async () => { if (LIST && Date.now() - LIST_AT < 60000) return LIST; LIST = await call('teach', { op: 'list' }); LIST_AT = Date.now(); return LIST; };

  /* ---------------- player: YouTube hidden behind our own controls ---------------- */
  let ytP = null;
  const ytApi = () => ytP || (ytP = new Promise((res, rej) => { if (window.YT && YT.Player) return res(window.YT);
    const prev = window.onYouTubeIframeAPIReady; window.onYouTubeIframeAPIReady = () => { prev && prev(); res(window.YT); };
    const s = document.createElement('script'); s.src = 'https://www.youtube.com/iframe_api'; s.onerror = () => { ytP = null; rej(new Error('yt')); }; document.head.append(s); }));
  const tfmt = s => { s = Math.max(0, Math.floor(s || 0)); const m = Math.floor(s / 60), x = s % 60; return (m >= 60 ? Math.floor(m / 60) + ':' + String(m % 60).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0'); };
  function makePlayer(opts) {
    const tv = el('div', { class: 'tv', oncontextmenu: e => e.preventDefault() });
    const frame = el('div', { class: 'tv-frame' }), shield = el('div', { class: 'tv-shield' }), wm = el('div', { class: 'tv-wm', text: opts.wm || '' });
    const cover = el('div', { class: 'tv-cover' });
    const playB = el('button', { text: '▶', 'aria-label': 'تشغيل' }), cur = el('span', { text: '0:00' }), dur = el('span', { text: '0:00' });
    const seek = el('input', { type: 'range', min: '0', max: '1000', value: '0', 'aria-label': 'التقدّم' });
    const RATES = [1, 1.25, 1.5, 2, 0.75]; let ri = 0; const rateB = el('button', { text: '1x', 'aria-label': 'السرعة' });
    const fullB = el('button', { text: '⛶', 'aria-label': 'ملء الشاشة' });
    const back = el('button', { text: '⟲10', 'aria-label': 'رجوع 10 ثوان' });
    const barEl = el('div', { class: 'tv-bar' }, playB, back, cur, seek, dur, rateB, fullB);
    tv.append(frame, shield, wm, cover, barEl);
    let P = null, ready = false, timer = null, idleT = null, seeking = false, vid = null, title = '', started = false;
    const posWm = () => { wm.style.top = (8 + Math.random() * 70) + '%'; wm.style.left = (5 + Math.random() * 60) + '%'; }; posWm();
    const wmT = setInterval(() => { if (!document.body.contains(tv)) { clearInterval(wmT); clearInterval(timer); return; } posWm(); }, 7000);
    const wake = () => { tv.classList.remove('idle'); clearTimeout(idleT); idleT = setTimeout(() => { if (P && ready && P.getPlayerState() === 1) tv.classList.add('idle'); }, 2600); };
    const showCover = (kind) => { cover.innerHTML = ''; cover.style.display = 'grid'; cover.className = 'tv-cover' + (kind === 'poster' ? '' : ' dim');
      if (kind === 'end') { cover.append(opts.endScreen ? opts.endScreen() : el('div', { text: 'انتهى الدرس' })); return; }
      const box = el('div', {}, el('button', { class: 'tv-big', text: '▶', 'aria-label': 'تشغيل', onclick: e => { e.stopPropagation(); play(); } }));
      if (kind === 'poster') box.append(el('p', { text: title }), el('small', { text: opts.sub || '' }));
      if (kind === 'wait') { box.innerHTML = ''; box.append(el('p', { text: '⏳ جارٍ التشغيل…' })); }
      cover.append(box); };
    const hideCover = () => { cover.style.display = 'none'; };
    const tick = () => { if (!P || !ready) return; const d = P.getDuration() || 0, t = P.getCurrentTime() || 0; dur.textContent = tfmt(d); cur.textContent = tfmt(t); if (!seeking && d) seek.value = String(Math.round(t / d * 1000)); };
    const onState = e => { const s = e.data;
      if (s === 1) { started = true; hideCover(); shield.style.pointerEvents = ''; playB.textContent = '❚❚'; wake(); }
      else if (s === 2) { playB.textContent = '▶'; showCover('paused'); tv.classList.remove('idle'); }
      else if (s === 0) { playB.textContent = '▶'; tv.classList.remove('idle'); showCover('end'); opts.onEnd && opts.onEnd(); } };
    const play = async () => {
      if (!vid) return;
      if (P && ready) { P.playVideo(); return; }
      showCover('wait');
      try { const YT = await ytApi(); frame.innerHTML = ''; const host = el('div'); frame.append(host);
        P = new YT.Player(host, { host: 'https://www.youtube-nocookie.com', videoId: vid, width: '100%', height: '100%',
          playerVars: { autoplay: 1, controls: 0, disablekb: 1, fs: 0, rel: 0, iv_load_policy: 3, modestbranding: 1, playsinline: 1, cc_load_policy: 0, origin: location.origin, hl: 'ar' },
          events: { onReady: () => { ready = true; P.playVideo(); clearInterval(timer); timer = setInterval(tick, 500);
              setTimeout(() => { if (!started && P.getPlayerState && [-1, 5].includes(P.getPlayerState())) { hideCover(); shield.style.pointerEvents = 'none'; } }, 1800); },
            onStateChange: onState, onError: () => { cover.style.display = 'grid'; cover.className = 'tv-cover dim'; cover.innerHTML = ''; cover.append(el('p', { text: 'تعذّر تشغيل الفيديو الآن. إذا رُفع حديثاً فقد يكون قيد المعالجة؛ حاول بعد دقائق.' })); } } });
      } catch (e) { cover.innerHTML = ''; cover.append(el('p', { text: 'تعذّر تحميل المشغّل. تحقق من الاتصال.' })); }
    };
    const toggle = () => { if (!P || !ready) { play(); return; } const s = P.getPlayerState(); if (s === 1 || s === 3) P.pauseVideo(); else P.playVideo(); };
    shield.addEventListener('click', () => { wake(); toggle(); });
    tv.addEventListener('mousemove', wake); tv.addEventListener('touchstart', wake, { passive: true });
    playB.onclick = toggle;
    back.onclick = () => { if (P && ready) P.seekTo(Math.max(0, P.getCurrentTime() - 10), true); };
    seek.oninput = () => { seeking = true; if (P && ready) cur.textContent = tfmt(seek.value / 1000 * P.getDuration()); };
    seek.onchange = () => { seeking = false; if (P && ready) P.seekTo(seek.value / 1000 * P.getDuration(), true); };
    rateB.onclick = () => { ri = (ri + 1) % RATES.length; rateB.textContent = RATES[ri] + 'x'; if (P && ready) P.setPlaybackRate(RATES[ri]); };
    const exitFull = () => { tv.classList.remove('full'); document.body.style.overflow = ''; };
    fullB.onclick = async () => {
      if (document.fullscreenElement || document.webkitFullscreenElement) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); return; }
      if (tv.classList.contains('full')) { exitFull(); return; }
      const rq = tv.requestFullscreen || tv.webkitRequestFullscreen;
      if (rq) { try { await rq.call(tv); try { await screen.orientation.lock('landscape'); } catch (e) {} return; } catch (e) {} }
      tv.classList.add('full'); document.body.style.overflow = 'hidden'; };
    return { el: tv,
      load(id, t, autoplay) { vid = id; title = t; started = false; if (P) { try { P.destroy(); } catch (e) {} P = null; ready = false; } frame.innerHTML = ''; playB.textContent = '▶'; seek.value = '0'; cur.textContent = dur.textContent = '0:00'; showCover('poster'); if (autoplay) play(); },
      locked(msgEl) { vid = null; if (P) { try { P.destroy(); } catch (e) {} P = null; ready = false; } frame.innerHTML = ''; cover.style.display = 'grid'; cover.className = 'tv-cover'; cover.innerHTML = ''; cover.append(msgEl); },
    };
  }

  /* ---------------- public: course list ---------------- */
  const SIMG = ['ar', 'en', 'math', 'isl', 'sci', 'civ', 'soc', 'hist', 'geo', 'comp', 'art'];
  const cImg = c => 'img/ui/' + (c.cat === 'skill' ? 'q_learn' : SIMG.includes(c.subject) ? 's_' + c.subject : 'x_all') + '.webp';
  const courseCard = c => el('button', { class: 'tc-card tc-card2', onclick: () => go('crs-' + c.id) },
    el('span', { class: 'tc-th' }, el('img', { src: cImg(c), alt: '', loading: 'lazy' }), el('i', { text: '▶' })),
    el('span', { class: 'tc-bd' },
      el('div', { class: 'tc-m' }, tag(KIND[c.kind] || 'دورة'), el('span', { text: where(c) })),
      el('b', { text: c.title }),
      el('div', { class: 'tc-m' }, el('span', { text: '🎬 ' + c.lessons.length + ' درس' }), mins(c.lessons) ? el('span', { text: '⏱️ ' + mins(c.lessons) }) : null, el('span', { class: 'tc-price', text: money(c.price) })),
      c.lessons[0] && c.lessons[0].ready ? el('small', { class: 'tc-free', text: '▶ الدرس الأول مجاني' }) : null));
  const tHead = (t, n) => el('button', { class: 'tc-t', onclick: () => go('tch-' + t.id) }, el('span', { class: 'tc-av', text: ini(t.name) }),
    el('span', {}, el('b', { text: t.name }), el('small', { text: (t.spec || '') + (n ? ' · ' + n + (n > 2 ? ' دورات' : n === 2 ? ' دورتان' : ' دورة') : '') })));

  async function renderCourses(f) {
    const s = page('🎥 دورات المعلمين', 'دروس فيديو من معلمين معتمدين', 'home');
    if (!on()) { s.append(el('div', { class: 'empty' }, el('span', { class: 'big', text: '🎥' }), el('p', { text: 'دورات المعلمين غير متاحة حالياً.' }))); return; }
    f = f || store.get('tc_f', 'all'); store.set('tc_f', f);
    const chips = el('div', { class: 'tc-chips' });
    [['all', 'الكل'], ['skill', '✨ مهارات'], ...GR.map(([g]) => ['g' + g, 'الصف ' + g]), ...(ACC.user ? [['mine', '🎒 دوراتي']] : [])].forEach(([k, t]) =>
      chips.append(el('button', { class: 'tc-chip' + (k === f ? ' on' : ''), text: t, onclick: () => go(k === 'all' ? 'courses' : 'courses-' + k) })));
    s.append(el('div', { class: 'gx-hero', style: '--h1:#a066ff;--h2:#5b3ee8' }, el('img', { src: 'img/ui/n_lessons.webp', alt: '' }), el('div', {}, el('b', { text: 'دورات فيديو من معلمين ليبيين' }), el('span', { text: 'شرح المنهج والتقوية والمراجعة قبل الامتحانات — الدرس الأول مجاني دائماً' }))), chips);
    if (ACC.user && !ACC.kid) s.append(el('button', { class: 'tc-teach', onclick: () => go('studio') }, el('span', { text: '🎓' }), el('span', {}, el('b', { text: 'أنت معلم؟' }), el('small', { text: 'انشر دوراتك واربح 70% من كل اشتراك' })), el('span', { class: 'go', text: '←' })));
    const box = el('div'); s.append(box); const m = loading(box);
    try {
      if (f === 'mine') { const r = await call('teach', { op: 'mine' }); box.innerHTML = '';
        if (!r.courses.length) { box.append(el('div', { class: 'empty' }, el('span', { class: 'big', text: '🎒' }), el('p', { text: 'لم تشترك في أي دورة بعد.' }))); return; }
        r.courses.forEach(c => box.append(courseCard(c))); return; }
      const L = await getList(); box.innerHTML = '';
      const cs = L.courses.filter(c => f === 'all' || (f === 'skill' ? c.cat === 'skill' : c.cat === 'cur' && 'g' + c.grade === f));
      if (!cs.length) { box.append(el('div', { class: 'empty' }, el('span', { class: 'big', text: '🎬' }), el('p', { text: 'لا توجد دورات هنا بعد. ترقّب قريباً!' }))); return; }
      const by = {}; cs.forEach(c => (by[c.tid] = by[c.tid] || []).push(c));
      Object.keys(by).sort((a, b) => by[b].length - by[a].length).forEach(tid => { const t = L.teachers[tid]; if (!t) return;
        box.append(tHead(t, by[tid].length)); by[tid].sort((a, b) => (b.at || 0) - (a.at || 0)).forEach(c => box.append(courseCard(c))); });
    } catch (e) { fbk(m, 'bad', fnErr(e)); }
  }

  async function renderTeacherPage(tid) {
    const s = page('صفحة المعلم', '', 'courses'); const m = loading(s);
    try { const r = await call('teach', { op: 'teacher', tid }); m.remove(); const t = r.teacher;
      s.append(el('div', { class: 'tc-tph' }, el('span', { class: 'tc-av big', text: ini(t.name) }),
        el('div', {}, el('b', { text: t.name }), el('small', { text: t.spec || '' }), el('span', { class: 'c', text: '🎬 ' + r.courses.length + (r.courses.length > 2 ? ' دورات' : r.courses.length === 2 ? ' دورتان' : ' دورة') }))));
      if (t.bio) s.append(el('p', { style: 'line-height:1.8;margin:0', text: t.bio }));
      s.append(el('h3', { text: 'دورات ' + t.name + ' (' + r.courses.length + ')' }));
      r.courses.forEach(c => s.append(courseCard(c)));
    } catch (e) { fbk(m, 'bad', fnErr(e)); }
  }

  /* ---------------- public: one course + player ---------------- */
  async function renderCourse(cid) {
    const s = page('الدورة', '', 'courses'); const m = loading(s);
    let r; try { r = await call('teach', { op: 'course', cid }); } catch (e) { fbk(m, 'bad', fnErr(e)); return; }
    m.remove(); const c = r.course, t = r.teacher; const full = r.owned || r.mine || r.admin;
    D.root.querySelector('.bar h1, .bar b') && (D.root.querySelector('.bar h1, .bar b').textContent = c.title);
    let curI = -1; const rows = [];
    const playable = i => !!r.vids[c.lessons[i].id];
    const next = () => { for (let i = curI + 1; i < c.lessons.length; i++) if (playable(i)) return i; return -1; };
    const endScreen = () => { const w = el('div', { class: 'tv-end' }, el('b', { text: '✔️ انتهى: ' + c.lessons[curI].title }));
      const n = next();
      if (n >= 0) w.append(el('button', { class: 'go', text: '▶ الدرس التالي: ' + c.lessons[n].title, onclick: () => pick(n, true) }));
      else if (!full) w.append(el('button', { class: 'go', text: '🔓 اشترك لمتابعة باقي الدروس — ' + money(c.price), onclick: () => buyBox.scrollIntoView({ behavior: 'smooth' }) }));
      w.append(el('small', { style: 'opacity:.8;margin-top:4px', text: 'اقتراحات من المنصة' }));
      getList().then(L => { L.courses.filter(x => x.id !== c.id).sort((a, b) => (b.tid === c.tid) - (a.tid === c.tid) || (b.grade === c.grade) - (a.grade === c.grade)).slice(0, 3)
        .forEach(x => w.append(el('button', { text: '🎬 ' + x.title + ' — ' + x.tname, onclick: () => { if (document.fullscreenElement) document.exitFullscreen(); go('crs-' + x.id); } }))); }).catch(() => {});
      return w; };
    const P = makePlayer({ wm: r.wm, sub: t.name, endScreen });
    const lockMsg = () => el('div', {}, el('div', { style: 'font-size:2.2rem', text: '🔒' }), el('p', { text: 'هذا الدرس للمشتركين في الدورة' }), el('small', { text: 'الدرس الأول مجاني — اشترك لمشاهدة الكل' }));
    const pick = (i, auto) => { if (!playable(i)) { if (!full) buyBox.scrollIntoView({ behavior: 'smooth' }); return; } curI = i; rows.forEach((x, j) => x.classList.toggle('on', j === i));
      P.load(r.vids[c.lessons[i].id], (i + 1) + '. ' + c.lessons[i].title, auto); if (auto) P.el.scrollIntoView({ behavior: 'smooth', block: 'center' }); };
    s.append(P.el);
    s.append(el('div', {}, el('div', { class: 'tc-m', style: 'display:flex;gap:6px;flex-wrap:wrap;align-items:center;color:var(--muted);font-size:.8rem' }, tag(KIND[c.kind] || 'دورة'), el('span', { text: where(c) }), c.students ? el('span', { text: '👥 ' + c.students + ' مشترك' }) : null),
      el('h2', { style: 'margin:6px 0;font-family:var(--f-display)', text: c.title })));
    s.append(tHead(t));
    const buyBox = el('div', { class: 'tc-buy' });
    if (r.mine) buyBox.append(el('b', { text: '👩‍🏫 هذه دورتك' }), el('span', { class: 'note', text: 'الحالة: ' + (STAT[c.status] || [''])[0] }), el('button', { class: 'btn ghost', text: 'تعديل الدورة', onclick: () => go('studio-' + c.id) }));
    else if (r.owned) buyBox.append(el('b', { text: '✅ أنت مشترك في هذه الدورة' }), el('span', { class: 'note', text: 'كل الدروس مفتوحة لك.' }));
    else { const bm = el('div');
      buyBox.append(el('div', { class: 'row', style: 'justify-content:space-between;align-items:center' }, el('b', { text: 'اشترك في الدورة كاملة' }), el('span', { class: 'tc-price', style: 'font-size:1rem', text: money(c.price) })),
        el('span', { class: 'note', text: c.lessons.length + ' درس' + (mins(c.lessons) ? ' · ' + mins(c.lessons) : '') + ' · مشاهدة غير محدودة داخل المنصة. الدرس الأول مجاني للتجربة.' }),
        el('button', { class: 'btn sun', text: '💳 اشترك الآن', onclick: async e => {
          if (!ACC.user) { store.set('after_login', 'crs-' + c.id); go('login'); return; }
          if (ACC.kid) { fbk(bm, 'info', 'اطلب من ولي أمرك شراء الدورة من حسابه، وتُفتح لك مباشرة.'); return; }
          if (!ACC.phoneVerified()) { const pb = el('div'); bm.innerHTML = ''; bm.append(pb); await ACC.verifyPhone(pb); pb.remove(); }
          e.target.disabled = true; fbk(bm, 'info', 'جارٍ تجهيز الدفع…');
          try { const x = await call('teach', { op: 'buy', cid: c.id }); if (x.owned) { renderCourse(cid); return; } location.href = x.url; }
          catch (er) { fbk(bm, 'bad', fnErr(er)); e.target.disabled = false; } } }), bm); }
    s.append(buyBox);
    s.append(el('h3', { text: 'دروس الدورة' }));
    const ls = el('div', { class: 'tc-ls' });
    c.lessons.forEach((l, i) => { const ok = playable(i);
      const st = ok ? (i === 0 && !full ? tag('مجاني', 'ok') : el('span', { text: '▶' })) : (!l.ready ? tag('قريباً', 'gray') : el('span', { text: '🔒' }));
      const row = el('button', { class: 'tc-l' + (ok ? '' : ' lk'), onclick: () => pick(i, true) }, el('span', { class: 'n', text: String(i + 1) }),
        el('span', {}, el('b', { text: l.title }), l.min ? el('small', { text: l.min + ' دقيقة' }) : null), st);
      rows.push(row); ls.append(row); });
    s.append(ls);
    if (c.desc) s.append(el('h3', { text: 'عن الدورة' }), el('p', { style: 'line-height:1.9;white-space:pre-line;margin:0', text: c.desc }));
    s.append(el('p', { class: 'note', style: 'font-size:.75rem', text: '🔐 الفيديوهات حصرية لمنصة المجتهد ومحمية؛ يظهر عليها رقم حساب المشاهد، ونسخها أو نشرها مخالف لشروط الاستخدام.' }));
    const first = c.lessons.findIndex((l, i) => playable(i));
    if (first >= 0) pick(first, false); else P.locked(c.lessons.length ? lockMsg() : el('p', { text: 'لا توجد دروس بعد.' }));
  }

  /* ---------------- after payment ---------------- */
  function renderCPaid(oid) {
    const s = page('نتيجة الدفع', '', 'courses'); const st = el('div'); s.append(st); fbk(st, 'info', '⏳ جارٍ تأكيد الدفع… لا تغلق الصفحة.');
    if (!ACC.user) { fbk(st, 'info', 'سجّل الدخول بنفس الحساب لنتأكد من الدفع.'); return; }
    let n = 0; const tick = async () => {
      try { const r = await call('teach', { op: 'paid', orderId: oid });
        if (r.status === 'paid') { D.cheer && D.cheer('win'); fbk(st, 'ok', '🎉 تم الدفع والاشتراك في: ' + r.title); s.append(el('button', { class: 'btn sun', text: 'ابدأ المشاهدة ←', onclick: () => go('crs-' + r.cid) })); return; }
        if (r.status === 'failed') { fbk(st, 'bad', 'لم تكتمل عملية الدفع.'); if (r.cid) s.append(el('button', { class: 'btn', text: 'رجوع للدورة', onclick: () => go('crs-' + r.cid) })); return; }
      } catch (e) {}
      if (++n < 30) setTimeout(tick, 3000);
      else { fbk(st, 'bad', 'لم يصلنا تأكيد الدفع بعد. إذا خُصم المبلغ فستُفتح الدورة تلقائياً خلال دقائق؛ وإن لم تُفتح تواصل معنا وأرسل رقم الطلب.'); s.append(el('p', { class: 'note', dir: 'ltr', text: 'Order: ' + oid })); } };
    tick();
  }

  /* ---------------- teacher studio ---------------- */
  let ME = null;
  async function loadMe() { ME = await call('teach', { op: 'me' }); return ME; }
  const termsBox = () => el('div', { class: 'panel accbox' }, el('b', { text: '📜 اتفاقية المعلم مع المنصة' }), el('ol', { class: 'tc-terms' }, ...TERMS.map(x => el('li', { text: x }))));

  async function renderStudio(tab) {
    if (!ACC.user || ACC.kid) { store.set('after_login', 'studio'); go('login'); return; }
    const s = page('🎓 منصة المعلم', 'انشر دوراتك المصوّرة واربح', 'account'); const m = loading(s);
    try { await loadMe(); } catch (e) { fbk(m, 'bad', fnErr(e)); return; } m.remove();
    const T = ME.teacher;
    if (!T || T.status === 'rejected') {
      if (!ME.cfg.on && !ME.admin) { s.append(el('div', { class: 'empty' }, el('span', { class: 'big', text: '🎓' }), el('p', { text: 'منصة المعلمين غير مفعّلة حالياً. ترقّب الإطلاق قريباً.' }))); return; }
      if (ME.cfg.apply === false) { s.append(el('div', { class: 'empty' }, el('span', { class: 'big', text: '⏸️' }), el('p', { text: 'استقبال طلبات المعلمين متوقف مؤقتاً.' }))); return; }
      if (T && T.status === 'rejected') { const x = el('div'); s.append(x); fbk(x, 'bad', 'لم يُقبل طلبك السابق' + (T.note ? ': ' + T.note : '.') + ' يمكنك تعديل بياناتك وإعادة التقديم.'); }
      s.append(el('div', { class: 'panel accbox' }, el('b', { text: 'كيف تعمل منصة المعلم؟' }), el('ol', { class: 'tc-terms' },
        el('li', { text: 'قدّم طلبك، وتراجعه الإدارة.' }), el('li', { text: 'أنشئ دورة: عنوان، صف ومادة أو مهارة، سعر، وارفع فيديوهات الدروس من جهازك مباشرة.' }),
        el('li', { text: 'تراجع الإدارة الدورة ثم تُنشر للطلاب.' }), el('li', { text: 'كل اشتراك يضيف 70% من السعر إلى محفظتك، وتسحب رصيدك إلى حسابك المصرفي.' }))));
      const name = el('input', { value: (T && T.name) || (ACC.profile && ACC.profile.name) || '', placeholder: 'الاسم كما يظهر للطلاب (مثلاً: أ. محمد علي)' });
      const spec = el('input', { value: (T && T.spec) || '', placeholder: 'التخصص (مثلاً: معلم رياضيات للتعليم الأساسي)' });
      const bio = el('textarea', { rows: '4', placeholder: 'نبذة عنك وخبرتك (اختياري)', text: (T && T.bio) || '' });
      const agree = el('input', { type: 'checkbox' }); const msg = el('div'); const pbox = el('div');
      s.append(el('div', { class: 'panel accbox' }, el('b', { text: 'طلب الانضمام كمعلم' }), name, spec, bio), termsBox(),
        el('label', { class: 'sndrow' }, agree, el('span', { text: 'قرأت الاتفاقية وأوافق عليها، وأقرّ بأن فيديوهاتي حصرية لمنصة المجتهد.' })), pbox,
        el('button', { class: 'btn sun', text: 'إرسال الطلب', onclick: async e => {
          if (!agree.checked) { fbk(msg, 'bad', 'يجب الموافقة على الاتفاقية.'); return; }
          if (!ACC.phoneVerified()) { await ACC.verifyPhone(pbox); pbox.innerHTML = ''; }
          e.target.disabled = true;
          try { await call('teach', { op: 'apply', name: name.value, spec: spec.value, bio: bio.value, agree: true }); D.cheer && D.cheer('win'); renderStudio(); }
          catch (er) { fbk(msg, 'bad', fnErr(er)); e.target.disabled = false; } } }), msg);
      return;
    }
    if (T.status === 'pending') { s.append(el('div', { class: 'empty' }, el('span', { class: 'big', text: '⏳' }), el('p', { text: 'طلبك قيد المراجعة. سنفعّل حسابك بعد الموافقة، ثم تبدأ بنشر دوراتك.' }), el('small', { class: 'note', text: T.name + ' · ' + (T.spec || '') }))); return; }
    if (T.status === 'blocked') { s.append(el('div', { class: 'empty' }, el('span', { class: 'big', text: '⛔' }), el('p', { text: 'حساب المعلم موقوف. تواصل مع الإدارة.' }))); return; }
    // approved
    tab = tab || store.get('st_tab', 'courses'); store.set('st_tab', tab);
    const W = ME.wallet;
    s.append(el('div', { class: 'gx-hero', style: '--h1:#34c46a;--h2:#0e9f6e' }, el('img', { src: 'img/ui/k6.webp', alt: '', style: 'height:100px;margin:-10px 0 -12px' }), el('div', {}, el('b', { text: 'أهلاً ' + (T.name || '') + ' 👋' }), el('span', { text: T.spec || 'منصة المعلم' }))));
    s.append(el('div', { class: 'tc-wal' }, el('div', {}, el('b', { text: money(W.bal) }), el('span', { text: 'رصيدك الحالي' })),
      el('div', {}, el('b', { text: String(W.sales) }), el('span', { text: 'اشتراك في دوراتك' })), el('div', {}, el('b', { text: money(W.earned) }), el('span', { text: 'إجمالي أرباحك' }))));
    const tabs = el('div', { class: 'tc-tabs' }); const body = el('div', { class: 'stack' });
    [['courses', '🎬 دوراتي'], ['wallet', '💰 المحفظة'], ['banks', '🏦 حساباتي'], ['profile', '👤 ملفي']].forEach(([k, t]) =>
      tabs.append(el('button', { class: 'tc-chip' + (k === tab ? ' on' : ''), text: t, onclick: () => renderStudio(k) })));
    s.append(tabs, body);
    if (tab === 'courses') studioCourses(body); else if (tab === 'wallet') studioWallet(body); else if (tab === 'banks') studioBanks(body); else studioProfile(body);
  }
  function studioCourses(b) {
    b.append(el('button', { class: 'btn sun', text: '➕ دورة جديدة', onclick: () => go('studio-new') }));
    if (!ME.courses.length) { b.append(el('div', { class: 'empty' }, el('span', { class: 'big', text: '🎬' }), el('p', { text: 'أنشئ دورتك الأولى: درس أو مجموعة دروس مصوّرة لأي صف ومادة، أو لأي مهارة تتقنها.' }))); return; }
    ME.courses.forEach(c => { const st = STAT[c.status] || ['', '']; const wait = c.lessons.filter(l => !l.ready).length; const msg = el('div');
      b.append(el('div', { class: 'tc-adm-row' }, el('div', { class: 'row', style: 'justify-content:space-between' }, tag(st[0], st[1]), el('span', { class: 'tc-price', text: money(c.price) })),
        el('b', { text: c.title }), el('span', { class: 'note', text: where(c) + ' · ' + c.lessons.length + ' درس · 👥 ' + (c.students || 0) + ' مشترك' + (wait ? ' · ⏳ ' + wait + ' بانتظار الرفع' : '') }),
        c.note && ['rejected', 'off'].includes(c.status) ? el('span', { class: 'note', style: 'color:#b91c1c', text: 'ملاحظة الإدارة: ' + c.note }) : null,
        el('div', { class: 'row' }, el('button', { class: 'btn ghost sm', text: '✏️ تعديل', onclick: () => go('studio-' + c.id) }),
          ['draft', 'rejected'].includes(c.status) ? el('button', { class: 'btn sm', text: '📤 إرسال للمراجعة', onclick: async e => { e.target.disabled = true; try { await call('teach', { op: 'submit', cid: c.id }); renderStudio('courses'); } catch (er) { fbk(msg, 'bad', fnErr(er)); e.target.disabled = false; } } }) : null,
          el('button', { class: 'btn ghost sm', text: '👁️ معاينة', onclick: () => go('crs-' + c.id) })), msg)); });
  }
  function studioWallet(b) {
    const W = ME.wallet, T = ME.teacher, R = ME.terms; const msg = el('div');
    const nextAt = W.lastWd ? W.lastWd + R.GAP : 0; const wait = nextAt > Date.now();
    b.append(el('div', { class: 'panel accbox' }, el('b', { text: '💸 طلب سحب إلى حسابك المصرفي' }),
      el('span', { class: 'note', text: 'أقل مبلغ للسحب ' + R.MIN_WD + ' دينار، ومرة واحدة كل 30 يوماً. يُحوَّل المبلغ خلال أيام عمل بعد مراجعة الطلب.' })));
    const box = b.lastChild;
    if (!T.banks.length) box.append(el('span', { class: 'note', text: 'أضف حساباً مصرفياً أولاً من تبويب «حساباتي المصرفية».' }));
    else if (W.bal < R.MIN_WD) box.append(el('span', { class: 'note', text: 'رصيدك ' + money(W.bal) + '. يبقى ' + money(R.MIN_WD - W.bal) + ' لتتمكن من السحب.' }));
    else if (wait) box.append(el('span', { class: 'note', text: 'آخر طلب سحب كان ' + fdate(W.lastWd) + '. يمكنك الطلب مرة أخرى بعد ' + fdate(nextAt) + '.' }));
    else { const amt = el('input', { type: 'number', min: String(R.MIN_WD), max: String(W.bal), step: '1', value: String(Math.floor(W.bal)) });
      const bank = el('select', { class: 'qsel' }, ...T.banks.map(x => el('option', { value: x.id, text: x.bank + ' — ' + x.branch + ' (' + x.acct + ')' })));
      box.append(el('label', { class: 'prow' }, el('span', { text: 'المبلغ (دينار)' }), amt), bank, el('button', { class: 'btn sun', text: 'طلب السحب', onclick: async e => { e.target.disabled = true;
        try { await call('teach', { op: 'withdraw', amount: Number(amt.value), bankId: bank.value }); D.cheer && D.cheer('win'); renderStudio('wallet'); } catch (er) { fbk(msg, 'bad', fnErr(er)); e.target.disabled = false; } } })); }
    box.append(msg);
    const WS = { pending: ['قيد التحويل', 'sun'], paid: ['تم التحويل', 'ok'], rejected: ['مرفوض — أُعيد لرصيدك', 'bad'] };
    if (ME.wds.length) { b.append(el('h3', { text: 'طلبات السحب' })); ME.wds.forEach(w => b.append(el('div', { class: 'kidrow' }, el('span', {}, el('b', { text: money(w.amount) }), el('span', { class: 'note', text: ' · ' + w.bank + ' · ' + fdate(w.at) + (w.note ? ' · ' + w.note : '') })), tag(WS[w.status][0], WS[w.status][1])))); }
    b.append(el('h3', { text: 'حركة المحفظة' }));
    if (!ME.tx.length) b.append(el('span', { class: 'note', text: 'لا توجد حركات بعد.' }));
    ME.tx.forEach(x => b.append(el('div', { class: 'kidrow' }, el('span', {}, el('b', { text: x.t === 'sale' ? '🟢 اشتراك: ' + (x.title || '') : x.t === 'wd' ? '🔻 سحب' + (x.bank ? ' — ' + x.bank : '') : '↩️ إعادة مبلغ سحب مرفوض' }),
      el('span', { class: 'note', text: ' · ' + fdate(x.at) + (x.price ? ' · السعر ' + money(x.price) : '') })), el('b', { dir: 'ltr', style: 'color:' + (x.amt >= 0 ? '#15803d' : '#b91c1c'), text: (x.amt >= 0 ? '+' : '') + x.amt }))));
  }
  function studioBanks(b) {
    const list = ME.teacher.banks.map(x => ({ ...x })); const msg = el('div'); const wrap = el('div', { class: 'stack' });
    const F = [['bank', 'اسم المصرف'], ['branch', 'الفرع'], ['holder', 'اسم صاحب الحساب'], ['acct', 'رقم الحساب'], ['iban', 'رقم IBAN (يبدأ بـ LY)'], ['phone', 'رقم الهاتف 09xxxxxxxx']];
    const draw = () => { wrap.innerHTML = ''; list.forEach((x, i) => { const box = el('div', { class: 'tc-adm-row' }, el('b', { text: '🏦 حساب ' + (i + 1) }));
      F.forEach(([k, t]) => box.append(el('input', { value: x[k] || '', placeholder: t, 'aria-label': t, dir: ['acct', 'iban', 'phone'].includes(k) ? 'ltr' : null, inputmode: ['acct', 'phone'].includes(k) ? 'numeric' : null, oninput: e => { x[k] = e.target.value; } })));
      box.append(el('button', { class: 'linkbtn', text: '🗑️ حذف هذا الحساب', onclick: () => { list.splice(i, 1); draw(); } })); wrap.append(box); });
      if (list.length < 5) wrap.append(el('button', { class: 'btn ghost', text: '➕ إضافة حساب مصرفي', onclick: () => { list.push({}); draw(); } })); };
    if (!list.length) list.push({});
    draw();
    b.append(el('span', { class: 'note', text: 'يمكنك إضافة حتى 5 حسابات، وتختار أحدها عند كل طلب سحب.' }), wrap,
      el('button', { class: 'btn sun', text: '💾 حفظ الحسابات', onclick: async e => { e.target.disabled = true;
        try { const r = await call('teach', { op: 'banks', banks: list.filter(x => Object.values(x).some(Boolean)) }); ME.teacher.banks = r.banks; fbk(msg, 'ok', '✓ حُفظت.'); } catch (er) { fbk(msg, 'bad', fnErr(er)); } e.target.disabled = false; } }), msg);
  }
  function studioProfile(b) {
    const T = ME.teacher; const name = el('input', { value: T.name }), spec = el('input', { value: T.spec, placeholder: 'التخصص' }), bio = el('textarea', { rows: '5', text: T.bio, placeholder: 'نبذة' }); const msg = el('div');
    b.append(el('div', { class: 'panel accbox' }, el('b', { text: 'بياناتك كما تظهر للطلاب' }), name, spec, bio, el('button', { class: 'btn', text: 'حفظ', onclick: async () => {
      try { await call('teach', { op: 'profile', name: name.value, spec: spec.value, bio: bio.value }); fbk(msg, 'ok', '✓ حُفظت.'); } catch (er) { fbk(msg, 'bad', fnErr(er)); } } }), msg),
      el('button', { class: 'btn ghost', text: '👁️ صفحتي العامة', onclick: () => go('tch-' + ACC.user.uid) }), termsBox());
  }

  async function renderEditor(cid) {
    if (!ACC.user) { go('login'); return; }
    const s = page(cid === 'new' ? 'دورة جديدة' : 'تعديل الدورة', 'منصة المعلم', 'studio'); const m = loading(s);
    try { if (!ME || !ME.teacher) await loadMe(); } catch (e) { fbk(m, 'bad', fnErr(e)); return; } m.remove();
    if (!ME.teacher || ME.teacher.status !== 'approved') { go('studio'); return; }
    const o = cid === 'new' ? null : ME.courses.find(c => c.id === cid); if (cid !== 'new' && !o) { await loadMe(); }
    const C = o ? JSON.parse(JSON.stringify(o)) : { cat: 'cur', grade: '', subject: '', skill: '', kind: 'course', title: '', desc: '', price: 30, lessons: [] };
    const R = ME.terms; const msg = el('div');
    const catSel = el('select', { class: 'qsel' }, el('option', { value: 'cur', text: '📘 درس من المنهج الدراسي' }), el('option', { value: 'skill', text: '✨ مهارة (رسم، خط، إلقاء، كهرباء…)' }));
    catSel.value = C.cat;
    const gSel = el('select', { class: 'qsel' }, el('option', { value: '', text: 'اختر الصف' }), ...GR.map(([g, n]) => el('option', { value: g, text: 'الصف ' + n }))); gSel.value = C.grade || '';
    const sSel = el('select', { class: 'qsel' }, el('option', { value: '', text: 'اختر المادة' }), ...Object.entries(SUBJ).map(([k, t]) => el('option', { value: k, text: t }))); sSel.value = C.subject || '';
    const skill = el('input', { value: C.skill || '', placeholder: 'اسم المهارة (مثلاً: إتقان فن الإلقاء)' });
    const kSel = el('select', { class: 'qsel' }, ...Object.entries(KIND).map(([k, t]) => el('option', { value: k, text: t }))); kSel.value = C.kind;
    const title = el('input', { value: C.title, placeholder: 'عنوان الدورة (مثلاً: الكسور العشرية للصف الخامس)' });
    const desc = el('textarea', { rows: '4', text: C.desc, placeholder: 'وصف الدورة: ماذا سيتعلم الطالب؟ لمن هي؟' });
    const price = el('input', { type: 'number', min: String(R.MIN), max: String(R.MAX), step: '1', value: String(C.price) });
    const share = el('span', { class: 'note' });
    const upShare = () => { const p = Number(price.value) || 0; share.textContent = p >= R.MIN && p <= R.MAX ? 'تحصل على ' + money(p * R.SHARE) + ' من كل مشترك.' : 'السعر من ' + R.MIN + ' إلى ' + R.MAX + ' دينار.'; }; price.oninput = upShare; upShare();
    const curBox = el('div', { class: 'stack' }, gSel, sSel), skBox = el('div', { class: 'stack' }, skill);
    const upCat = () => { curBox.style.display = catSel.value === 'cur' ? '' : 'none'; skBox.style.display = catSel.value === 'skill' ? '' : 'none'; if (catSel.value === 'skill') kSel.value = 'skill'; }; catSel.onchange = upCat; upCat();
    const lw = el('div', { class: 'stack' });
    const rid = () => crypto.getRandomValues(new Uint32Array(1))[0].toString(16).padStart(8, '0');
    let curCid = o ? o.id : '', curStatus = o ? o.status : 'draft';
    const UP = {}; // lessonId -> {pct, msg, busy, done}
    const queue = []; let running = false;
    const upEls = {};
    const showUp = id => { const u = UP[id], e = upEls[id]; if (!e || !u) return; e.bar.style.width = (u.pct || 0) + '%'; e.txt.textContent = u.msg || ''; e.wrap.style.display = u.busy || u.msg ? '' : 'none'; };
    const durOf = f => new Promise(res => { try { const v = document.createElement('video'); v.preload = 'metadata'; v.onloadedmetadata = () => { res(Math.max(1, Math.round(v.duration / 60))); URL.revokeObjectURL(v.src); }; v.onerror = () => res(0); v.src = URL.createObjectURL(f); setTimeout(() => res(0), 8000); } catch (e) { res(0); } });
    const xput = (url, file, start, prog) => new Promise((res, rej) => { const x = new XMLHttpRequest(); x.open('PUT', url);
      if (start > 0) x.setRequestHeader('Content-Range', 'bytes ' + start + '-' + (file.size - 1) + '/' + file.size);
      x.upload.onprogress = e => prog(start + e.loaded);
      x.onload = () => { if (x.status === 200 || x.status === 201) { let id = null; try { id = JSON.parse(x.responseText).id; } catch (e) {} res({ done: true, id }); }
        else if (x.status === 308) { const r = x.getResponseHeader('Range'); res({ next: r ? Number(r.split('-')[1]) + 1 : start }); } else rej(new Error('http ' + x.status)); };
      x.onerror = () => rej(new Error('net')); x.send(start > 0 ? file.slice(start) : file); });
    const xstat = (url, size) => new Promise((res, rej) => { const x = new XMLHttpRequest(); x.open('PUT', url); x.setRequestHeader('Content-Range', 'bytes */' + size);
      x.onload = () => { if (x.status === 200 || x.status === 201) { let id = null; try { id = JSON.parse(x.responseText).id; } catch (e) {} res({ done: true, id }); }
        else if (x.status === 308) { const r = x.getResponseHeader('Range'); res({ next: r ? Number(r.split('-')[1]) + 1 : 0 }); } else rej(new Error('http ' + x.status)); };
      x.onerror = () => rej(new Error('net')); x.send(); });
    const fmtMB = b => (b / 1048576).toFixed(b > 1e9 ? 0 : 1) + ' م.ب';
    const finish = async (l, vid, min) => { for (let i = 0; i < 6; i++) { try { return await call('teach', { op: 'upDone', cid: curCid, lid: l.id, vid, min }); } catch (e) { if (i === 5) throw e; await new Promise(r => setTimeout(r, 5000)); } } };
    const doUpload = async (l, file) => { const u = UP[l.id] = { busy: true, pct: 0, msg: 'جارٍ التحضير…' }; showUp(l.id);
      try {
        if (!l.title.trim()) l.title = file.name.replace(/\.[a-z0-9]{2,5}$/i, '').slice(0, 80);
        const min = await durOf(file); if (min && !l.min) { l.min = min; drawL(); }
        await doSave(false, true);
        const { url } = await call('teach', { op: 'upInit', cid: curCid, lid: l.id, size: file.size, type: file.type || 'video/mp4', origin: location.origin });
        let start = 0, res = null, t0 = Date.now();
        const prog = n => { u.pct = Math.round(n / file.size * 100); const sp = n / Math.max(1, (Date.now() - t0) / 1000); const left = sp > 0 ? Math.round((file.size - n) / sp / 60) : 0;
          u.msg = '📤 ' + u.pct + '% · ' + fmtMB(n) + ' من ' + fmtMB(file.size) + (left > 0 ? ' · باقي ~' + left + ' د' : ''); showUp(l.id); };
        for (let att = 0; att < 8 && !(res && res.done); att++) {
          try { res = await xput(url, file, start, prog); if (!res.done) start = res.next; }
          catch (e) { u.msg = '⚠️ انقطع الاتصال، إعادة المحاولة…'; showUp(l.id); await new Promise(r => setTimeout(r, 3000 * (att + 1)));
            try { const st = await xstat(url, file.size); if (st.done) res = st; else start = st.next; } catch (e2) {} }
        }
        if (!res || !res.done) throw new Error('تعذّر إكمال الرفع. تحقق من الإنترنت وأعد المحاولة.');
        u.pct = 100; u.msg = '⏳ اكتمل الرفع، جارٍ التأكيد…'; showUp(l.id);
        await finish(l, res.id, min);
        l.ready = true; u.busy = false; u.msg = ''; u.done = true; D.cheer && D.cheer('win'); drawL();
      } catch (e) { u.busy = false; u.msg = '❌ ' + (e.message && !/^http|^net/.test(e.message) ? fnErr(e) : 'فشل الرفع. أعد المحاولة.'); showUp(l.id); }
    };
    const enqueue = (l, file) => { UP[l.id] = { busy: true, pct: 0, msg: '⏳ في الانتظار…' }; showUp(l.id); queue.push([l, file]); run(); };
    const run = async () => { if (running) return; running = true; while (queue.length) { const [l, f] = queue.shift(); await doUpload(l, f); } running = false; };
    window.addEventListener('beforeunload', e => { if (running) { e.preventDefault(); e.returnValue = ''; } });
    const picker = (multi, onFiles) => { const i = el('input', { type: 'file', accept: 'video/*', multiple: multi ? '' : null, style: 'display:none', onchange: () => { const fs = [...i.files]; i.value = ''; if (fs.length) onFiles(fs); } }); return i; };
    const drawL = () => { lw.innerHTML = ''; C.lessons.forEach((l, i) => { if (!l.id) l.id = rid();
      const t = el('input', { value: l.title || '', placeholder: 'عنوان الدرس ' + (i + 1), oninput: e => { l.title = e.target.value; } });
      const mn = el('input', { class: 'min', type: 'number', min: '0', value: l.min ? String(l.min) : '', placeholder: 'دقائق', oninput: e => { l.min = Number(e.target.value) || 0; } });
      const mv = (d) => { const j = i + d; if (j < 0 || j >= C.lessons.length) return; [C.lessons[i], C.lessons[j]] = [C.lessons[j], C.lessons[i]]; drawL(); };
      const busy = UP[l.id] && UP[l.id].busy;
      const fi = picker(false, fs => enqueue(l, fs[0]));
      const upBtn = el('button', { class: 'btn sm ' + (l.ready ? 'ghost' : ''), text: busy ? '⏳ جارٍ الرفع' : l.ready ? '🔁 استبدال الفيديو' : '📤 رفع فيديو الدرس', disabled: busy ? '' : null, onclick: () => fi.click() });
      const bar = el('i', { style: 'display:block;height:100%;width:0;background:var(--sea);border-radius:6px;transition:width .3s' });
      const txt = el('small', { class: 'note' }); const wrap = el('div', { style: 'display:none' }, el('div', { style: 'height:8px;background:var(--line);border-radius:6px;overflow:hidden;margin:2px 0' }, bar), txt);
      upEls[l.id] = { bar, txt, wrap };
      lw.append(el('div', { class: 'tc-ed' }, el('span', { class: 'n', text: String(i + 1) }), el('div', { class: 'f' }, t,
        el('div', { class: 'r' }, upBtn, fi, l.ready ? tag('✓ الفيديو مرفوع', 'ok') : null, i === 0 ? tag('مجاني — دعاية لدورتك', 'ok') : null),
        wrap,
        el('div', { class: 'r' }, mn, el('span', { class: 'note', text: 'دقيقة' }), el('span', { style: 'flex:1' }),
          el('button', { class: 'linkbtn', text: '⬆', onclick: () => mv(-1) }), el('button', { class: 'linkbtn', text: '⬇', onclick: () => mv(1) }),
          busy ? null : el('button', { class: 'linkbtn', text: '🗑️', onclick: () => { C.lessons.splice(i, 1); drawL(); } }))))); showUp(l.id); });
      const multi = picker(true, fs => { fs.forEach(f => { const l = { id: rid(), title: f.name.replace(/\.[a-z0-9]{2,5}$/i, '').slice(0, 80), min: 0 }; C.lessons.push(l); }); drawL();
        fs.forEach((f, k) => enqueue(C.lessons[C.lessons.length - fs.length + k], f)); });
      lw.append(el('div', { class: 'row', style: 'gap:6px;flex-wrap:wrap' }, el('button', { class: 'btn ghost sm', text: '➕ درس', onclick: () => { C.lessons.push({ id: rid(), title: '', min: 0 }); drawL(); } }),
        el('button', { class: 'btn ghost sm', text: '📤 رفع عدة فيديوهات دفعة واحدة', onclick: () => multi.click() }), multi)); };
    const bulk = el('div');
    if (!C.lessons.length) C.lessons.push({ id: rid(), title: '', min: 0 });
    drawL();
    const doSave = async (submit, quiet) => {
      C.lessons.forEach((l, i) => { if (!String(l.title || '').trim()) l.title = 'الدرس ' + (i + 1); });
      const r = await call('teach', { op: 'save', cid: curCid, cat: catSel.value, grade: gSel.value, subject: sSel.value, skill: skill.value, kind: kSel.value, title: title.value, desc: desc.value, price: Number(price.value), lessons: C.lessons.map(l => ({ id: l.id, title: l.title, min: l.min || 0, src: '' })) });
      if (!curCid) { curCid = r.cid; history.replaceState(null, '', '#studio-' + r.cid); }
      if (submit && !r.live) { await call('teach', { op: 'submit', cid: r.cid }); curStatus = 'pending'; }
      if (!quiet) drawL();
      return r; };
    const save = async (submit, btn) => { btn.disabled = true; fbk(msg, 'info', 'جارٍ الحفظ…');
      try { if (submit && running) throw new Error('انتظر حتى يكتمل رفع الفيديوهات ثم أرسل الدورة للمراجعة.');
        if (submit && C.lessons.some(l => !l.ready)) throw new Error('ارفع فيديو كل الدروس قبل الإرسال للمراجعة.');
        const r = await doSave(submit); loadMe().catch(() => {});
        fbk(msg, 'ok', r.live ? '✓ حُفظت التعديلات.' : submit ? '✓ أُرسلت الدورة للمراجعة. سنبلغك عند نشرها.' : '✓ حُفظت كمسودة.');
      } catch (er) { fbk(msg, 'bad', er.code ? fnErr(er) : er.message); } btn.disabled = false; };
    s.append(o ? el('div', {}, tag((STAT[o.status] || [''])[0], (STAT[o.status] || ['', ''])[1]), o.note ? el('span', { class: 'note', text: '  ملاحظة الإدارة: ' + o.note }) : null) : null,
      el('div', { class: 'panel accbox' }, el('b', { text: '1. نوع الدورة' }), catSel, curBox, skBox, kSel),
      el('div', { class: 'panel accbox' }, el('b', { text: '2. العنوان والوصف' }), title, desc),
      el('div', { class: 'panel accbox' }, el('b', { text: '3. السعر' }), el('label', { class: 'prow' }, el('span', { text: 'سعر الدورة كاملة (دينار)' }), price), share),
      el('div', { class: 'panel accbox' }, el('b', { text: '4. الدروس بالترتيب' }),
        el('span', { class: 'note', text: 'ارفع فيديو كل درس من جهازك مباشرة؛ يُحفظ في مشغّل المنصة المحمي ولا يظهر لأحد إلا لمشتركي دورتك. أبقِ الصفحة مفتوحة حتى يكتمل الرفع. الدرس الأول يُعرض مجاناً للجميع.' }), lw),
      el('div', { class: 'row', style: 'gap:8px;flex-wrap:wrap' }, el('button', { class: 'btn ghost', text: '💾 حفظ', onclick: e => save(false, e.target) }),
        !o || o.status !== 'live' ? el('button', { class: 'btn sun', text: '📤 حفظ وإرسال للمراجعة', onclick: e => save(true, e.target) }) : null), msg,
      o && !o.students ? el('button', { class: 'linkbtn', style: 'color:#b91c1c;align-self:flex-start', text: '🗑️ حذف الدورة', onclick: async e => { if (e.target.dataset.c !== '1') { e.target.dataset.c = '1'; e.target.textContent = 'اضغط مرة أخرى لتأكيد الحذف'; return; }
        try { await call('teach', { op: 'delete', cid: o.id }); go('studio'); } catch (er) { fbk(msg, 'bad', fnErr(er)); } } }) : null);
  }

  /* ---------------- admin box ---------------- */
  ACC.teachAdminBox = () => {
    const C = { on: false, show: false, apply: true, ...cfg() };
    const box = el('div', { class: 'panel accbox' }, el('b', { text: '🎥 منصة المعلمين (دورات الفيديو)' }));
    const ck = (k, t, n) => { const i = el('input', { type: 'checkbox', checked: C[k] ? '' : null, onchange: e => { C[k] = e.target.checked; } }); return el('label', { class: 'sndrow' }, i, el('span', {}, el('b', { text: t }), el('small', { class: 'note', text: n }))); };
    const cm = el('div');
    if (ACC.owner) box.append(ck('on', '⚙️ تفعيل الخدمة', 'المعلمون يقدّمون وينشئون الدورات، والطلاب يشترون. عند التعطيل يتوقف كل شيء.'),
      ck('show', '👁️ إظهار الدورات للجميع', 'بطاقة «دورات المعلمين» في الرئيسية وصفحات الدورات. عند الإخفاء يراها المدير فقط.'),
      ck('apply', '📝 استقبال طلبات معلمين جدد', ''),
      el('button', { class: 'btn', text: 'حفظ', onclick: async () => { try { await call('adminTeach', { op: 'cfg', ...C }); fbk(cm, 'ok', '✓ حُفظت.'); } catch (e) { fbk(cm, 'bad', fnErr(e)); } } }), cm);
    const yb = el('div', { class: 'tc-adm-row' }, el('b', { text: '▶️ قناة يوتيوب للرفع' }), el('span', { class: 'note', text: 'جارٍ الفحص…' }));
    if (ACC.owner) box.append(yb);
    if (ACC.owner) call('adminTeach', { op: 'ytStatus' }).then(r => { yb.lastChild.remove();
      yb.append(r.ok ? el('span', { class: 'note', html: '' }, '✅ مربوطة: ', el('b', { text: r.name }), ' · ' + r.videos + ' فيديو ', r.url ? el('a', { href: r.url, target: '_blank', rel: 'noopener', text: 'فتح القناة' }) : null)
        : el('span', { class: 'note', text: '⚠️ غير مربوطة بعد — المعلمون لا يستطيعون رفع الفيديوهات حتى تربطها.' }));
      const lm = el('div'); yb.append(el('button', { class: 'btn sm ' + (r.ok ? 'ghost' : 'sun'), text: r.ok ? 'إعادة ربط القناة' : '🔗 ربط قناة يوتيوب', onclick: async e => { e.target.disabled = true;
        try { const x = await call('adminTeach', { op: 'ytLink' }); location.href = x.url; } catch (er) { fbk(lm, 'bad', fnErr(er)); e.target.disabled = false; } } }), lm); })
      .catch(e => { yb.lastChild.textContent = fnErr(e); });
    const tabs = el('div', { class: 'tc-tabs' }), body = el('div', { class: 'stack' }), stats = el('div'); box.append(stats, tabs, body);
    let A = null, tab = 'req';
    const TABS = [['req', 'طلبات المعلمين', 'teach_req'], ['teachers', 'المعلمون', 'teach_req'], ['review', 'دورات للمراجعة', 'teach_courses'], ['all', 'كل الدورات', 'teach_courses'], ['wd', 'طلبات السحب', 'teach_wd']].filter(x => ACC.can(x[2]));
    tab = (TABS[0] || [])[0] || 'req';
    const drawTabs = () => { tabs.innerHTML = ''; TABS.forEach(([k, t]) => { const n = !A ? '' : k === 'req' ? A.teachers.filter(x => x.status === 'pending').length : k === 'review' ? A.courses.filter(x => x.status === 'pending' || x.lessons.some(l => !l.ready && x.status === 'live')).length : k === 'wd' ? A.withdrawals.length : '';
      tabs.append(el('button', { class: 'btn sm ' + (k === tab ? '' : 'ghost'), text: t + (n ? ' (' + n + ')' : ''), onclick: () => { tab = k; drawTabs(); draw(); } })); }); };
    const load = async () => { body.innerHTML = ''; const m = loading(body);
      try { A = await call('adminTeach', { op: 'load' }); const S = A.stats || {};
        stats.innerHTML = ''; if (ACC.can('stats')) stats.append(el('div', { class: 'tc-wal' }, el('div', {}, el('b', { text: String(S.sales || 0) }), el('span', { text: 'اشتراك مدفوع' })), el('div', {}, el('b', { text: money(S.gross) }), el('span', { text: 'إجمالي المبيعات' })),
          el('div', {}, el('b', { text: money(S.platform) }), el('span', { text: 'نصيب المنصة 30%' })), el('div', {}, el('b', { text: money(S.teachers) }), el('span', { text: 'نصيب المعلمين 70%' }))));
        drawTabs(); draw(); } catch (e) { fbk(m, 'bad', fnErr(e)); } };
    const act = async (fn, btn, m) => { btn.disabled = true; try { await fn(); await load(); } catch (e) { fbk(m, 'bad', fnErr(e)); btn.disabled = false; } };
    const tRow = t => { const m = el('div'); const st = { pending: ['بانتظار الموافقة', 'sun'], approved: ['معتمد', 'ok'], rejected: ['مرفوض', 'bad'], blocked: ['موقوف', 'bad'] }[t.status] || ['', ''];
      const note = el('input', { placeholder: 'سبب الرفض (يظهر للمعلم)', value: t.note || '' });
      const B = (txt, up, cls) => el('button', { class: 'btn sm ' + (cls || 'ghost'), text: txt, onclick: e => act(() => call('adminTeach', { op: 'teacher', tid: t.id, ...up, note: note.value }), e.target, m) });
      return el('div', { class: 'tc-adm-row' }, el('div', { class: 'row', style: 'justify-content:space-between' }, el('b', { text: t.name }), tag(st[0], st[1])),
        el('span', { class: 'note', text: (t.spec || '') + ' · 📱 ' + t.phone + ' · ' + t.courses + ' دورة · الرصيد ' + money(t.bal) + ' · أرباح ' + money(t.earned) + (t.hidden ? ' · 🙈 مخفي' : '') }),
        t.bio ? el('span', { class: 'note', text: t.bio }) : null, t.status !== 'approved' ? note : null,
        el('div', { class: 'row' }, t.status !== 'approved' ? B('✓ موافقة', { status: 'approved' }, 'sun') : null, t.status === 'pending' ? B('✗ رفض', { status: 'rejected' }) : null,
          t.status === 'approved' ? B(t.hidden ? '👁️ إظهار' : '🙈 إخفاء من المنصة', { hidden: !t.hidden }) : null, t.status !== 'blocked' ? B('⛔ إيقاف', { status: 'blocked' }) : B('↩️ إلغاء الإيقاف', { status: 'approved' }),
          t.status === 'approved' ? el('button', { class: 'btn ghost sm', text: 'صفحته', onclick: () => go('tch-' + t.id) }) : null), m); };
    const cRow = c => { const m = el('div'); const st = STAT[c.status] || ['', '']; const vw = el('div', { class: 'stack' }); let open = false;
      const note = el('input', { placeholder: 'ملاحظة للمعلم (سبب الرفض أو الإيقاف)', value: c.note || '' });
      const B = (txt, status, cls) => el('button', { class: 'btn sm ' + (cls || 'ghost'), text: txt, onclick: e => act(() => call('adminTeach', { op: 'course', cid: c.id, status, note: note.value }), e.target, m) });
      const openV = async () => { open = !open; vw.innerHTML = ''; if (!open) return; const mm = loading(vw);
        try { const { map } = await call('adminTeach', { op: 'vmap', cid: c.id }); mm.remove(); const inp = {};
          vw.append(el('span', { class: 'note', text: 'المعلم يرفع الفيديوهات بنفسه إلى قناتك. الروابط هنا للمعاينة، ويمكنك استبدال أي درس برابط يوتيوب آخر عند الحاجة.' }));
          c.lessons.forEach((l, i) => { inp[l.id] = el('input', { dir: 'ltr', value: map[l.id] ? 'https://youtu.be/' + map[l.id] : '', placeholder: 'رابط يوتيوب للدرس ' + (i + 1) });
            vw.append(el('div', { class: 'tc-ed' }, el('span', { class: 'n', text: String(i + 1) }), el('div', { class: 'f' }, el('b', { text: l.title + (l.min ? ' (' + l.min + ' د)' : '') }),
              map[l.id] ? el('a', { href: 'https://youtu.be/' + map[l.id], target: '_blank', rel: 'noopener', style: 'font-size:.8rem', text: '▶ مشاهدة على يوتيوب' }) : el('span', { class: 'note', text: '⏳ لم يُرفع بعد' }), inp[l.id]))); });
          vw.append(el('button', { class: 'btn sun sm', text: '💾 حفظ روابط يوتيوب', onclick: e => act(() => call('adminTeach', { op: 'videos', cid: c.id, vids: Object.fromEntries(Object.entries(inp).map(([k, v]) => [k, v.value])) }), e.target, m) }));
        } catch (e) { fbk(mm, 'bad', fnErr(e)); } };
      const ready = c.lessons.filter(l => l.ready).length;
      return el('div', { class: 'tc-adm-row' }, el('div', { class: 'row', style: 'justify-content:space-between' }, tag(st[0], st[1]), el('span', { class: 'tc-price', text: money(c.price) })),
        el('b', { text: c.title }), el('span', { class: 'note', text: '👩‍🏫 ' + c.tname + ' · ' + where(c) + ' · ' + KIND[c.kind] + ' · 🎬 ' + ready + '/' + c.lessons.length + ' جاهز · 👥 ' + (c.students || 0) }),
        note, el('div', { class: 'row' }, el('button', { class: 'btn sm', text: '🎬 روابط الفيديو', onclick: openV }),
          c.status !== 'live' ? B('✓ نشر', 'live', 'sun') : B('⏸️ إيقاف', 'off'), c.status === 'pending' ? B('✗ رفض', 'rejected') : null,
          el('button', { class: 'btn ghost sm', text: '👁️ معاينة', onclick: () => go('crs-' + c.id) })), vw, m); };
    const wRow = w => { const m = el('div'); const b = w.bank || {}; const note = el('input', { placeholder: 'ملاحظة (رقم الحوالة أو سبب الرفض)' });
      const B = (txt, status, cls) => el('button', { class: 'btn sm ' + (cls || 'ghost'), text: txt, onclick: e => act(() => call('adminTeach', { op: 'withdrawal', id: w.id, status, note: note.value }), e.target, m) });
      return el('div', { class: 'tc-adm-row' }, el('div', { class: 'row', style: 'justify-content:space-between' }, el('b', { text: w.tname + ' — ' + money(w.amount) }), el('span', { class: 'note', text: fdate(w.at) })),
        el('div', { class: 'tc-bank' }, el('div', { text: 'المصرف: ' + b.bank + ' — فرع ' + b.branch }), el('div', { text: 'صاحب الحساب: ' + b.holder }),
          el('div', {}, 'رقم الحساب: ', el('code', { text: b.acct })), el('div', {}, 'IBAN: ', el('code', { text: b.iban })), el('div', {}, 'الهاتف: ', el('code', { text: b.phone }))),
        note, el('div', { class: 'row' }, B('✓ تم التحويل', 'paid', 'sun'), B('✗ رفض وإعادة للرصيد', 'rejected')), m); };
    const draw = () => { body.innerHTML = ''; if (!A) return;
      let items = [];
      if (tab === 'req') items = A.teachers.filter(t => t.status === 'pending').map(tRow);
      if (tab === 'teachers') items = A.teachers.filter(t => t.status !== 'pending').sort((a, b) => b.earned - a.earned).map(tRow);
      if (tab === 'review') items = A.courses.filter(c => c.status === 'pending' || (c.status === 'live' && c.lessons.some(l => !l.ready))).map(cRow);
      if (tab === 'all') items = A.courses.sort((a, b) => (b.at || 0) - (a.at || 0)).map(cRow);
      if (tab === 'wd') items = A.withdrawals.map(wRow);
      if (!items.length) body.append(el('span', { class: 'note', text: 'لا يوجد شيء هنا.' })); else body.append(...items); };
    box.id = 'tc-admin'; box.openTab = k => { const fd = box.closest('details'); if (fd) fd.open = true; tab = k; drawTabs(); draw(); box.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
    drawTabs(); load();
    return box;
  };
  // تنبيه أعلى لوحة الإدارة بما ينتظر موافقة المدير
  ACC.teachAdminAlert = () => {
    const w = el('div');
    call('adminTeach', { op: 'load' }).then(A => {
      const nT = A.teachers.filter(x => x.status === 'pending').length;
      const nC = A.courses.filter(x => x.status === 'pending').length;
      const nW = A.withdrawals.length;
      const go2 = k => { const b = document.getElementById('tc-admin'); if (b && b.openTab) b.openTab(k); };
      const items = [[nT, '👩‍🏫 طلبات انضمام معلمين', 'req', 'teach_req'], [nC, '🎬 دورات تنتظر المراجعة', 'review', 'teach_courses'], [nW, '💸 طلبات سحب أرصدة', 'wd', 'teach_wd']].filter(x => ACC.can(x[3]));
      const tot = items.reduce((a, x) => a + x[0], 0);
      w.append(el('div', { class: 'panel accbox', style: 'border:2px solid ' + (tot ? '#f59e0b' : 'var(--line)') },
        el('b', { text: tot ? '🔔 بانتظار موافقتك' : '✅ منصة المعلمين: لا توجد طلبات تنتظرك' }),
        ...(tot ? items.filter(x => x[0]).map(([n, t, k]) => el('button', { class: 'btn ghost', style: 'justify-content:space-between;display:flex', onclick: () => go2(k) }, el('span', { text: t }), el('b', { text: String(n) }))) : []),
        el('span', { class: 'note', text: 'المعلمون المعتمدون: ' + A.teachers.filter(x => x.status === 'approved').length + ' · الدورات المنشورة: ' + A.courses.filter(x => x.status === 'live').length + ' · كل الطلبات: ' + A.teachers.length })));
    }).catch(e => { w.append(el('div', { class: 'panel accbox' }, el('b', { text: '🎥 منصة المعلمين' }), el('span', { class: 'note', text: fnErr(e) }))); });
    return w;
  };

  /* ---------------- routes ---------------- */
  ACC.teachRoute = h => {
    let m;
    const need = f => { if (!ACC.ready) { page('…', 'جارٍ التحميل', 'home'); return true; } f(); return true; };
    if (h === 'courses') return need(() => renderCourses('all'));
    if ((m = /^courses-(skill|mine|g\d)$/.exec(h))) return need(() => renderCourses(m[1]));
    if ((m = /^crs-([A-Za-z0-9]{6,40})$/.exec(h))) return need(() => renderCourse(m[1]));
    if ((m = /^tch-([A-Za-z0-9]{6,40})$/.exec(h))) return need(() => renderTeacherPage(m[1]));
    if (h === 'studio') return need(() => renderStudio());
    if ((m = /^studio-([A-Za-z0-9]{3,40})$/.exec(h))) return need(() => renderEditor(m[1]));
    if ((m = /^cpaid-([A-Za-z0-9]{10,40})$/.exec(h))) return need(() => renderCPaid(m[1]));
    return false;
  };
}
