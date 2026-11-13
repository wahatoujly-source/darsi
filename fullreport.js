// المجتهد — «التقرير الشامل للمنصة»: ملف Excel واحد بأوراق منظمة + تحليل نقاط القوة والضعف والتوصيات.
// يعتمد فقط على ما يسجله النظام فعلاً (التتبع + قاعدة البيانات)، ويميّز المؤكد عمّا يحتاج بيانات أكثر.
const XLSX_URL = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
let _x = null; const loadX = () => _x || (_x = new Promise((res, rej) => { if (window.XLSX) return res(window.XLSX); const s = document.createElement('script'); s.src = XLSX_URL; s.onload = () => res(window.XLSX); s.onerror = rej; document.head.append(s); }));
const SRC = { facebook: 'فيسبوك', instagram: 'إنستغرام', google: 'جوجل', whatsapp: 'واتساب', youtube: 'يوتيوب', direct: 'مباشر', ref: 'موقع آخر', invite: 'رابط دعوة' };
const ROLE = { student: 'طالب', parent: 'ولي أمر', teacher: 'معلم', '—': 'غير محدد' };
const pc = (a, b) => b ? Math.round(a * 1000 / b) / 10 : null;
const dt = t => t ? new Date(t).toLocaleString('ar-LY-u-nu-latn', { timeZone: 'Africa/Tripoli', day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

/* ---------- التحليل: نقاط القوة والضعف والتوصيات (كل جملة مدعومة برقم، ومصنّفة: مؤكد / يحتاج بيانات) ---------- */
export function analyze(R, names) {
  const o = R.overview, X = R.extra || {}, F = R.funnel, S = [], W = [], REC = [], NOTE = [];
  const small = o.visitors < 30;
  if (small) NOTE.push(['تنبيه', 'عدد الزوار في الفترة ' + o.visitors + ' فقط — النسب أدناه أولية وقد تتغير كثيراً مع بيانات أكثر.', 'يحتاج بيانات']);
  if (!R.firstTrack) NOTE.push(['تنبيه', 'لم يصل أي حدث تتبع بعد؛ الأرقام من قاعدة البيانات فقط (الحسابات والطلبات).', 'يحتاج بيانات']);
  // المسار: أكبر خسارة بين خطوتين متتاليتين
  let worst = null; for (let i = 1; i < F.length; i++) { const a = F[i - 1].seq, b = F[i].seq; if (a >= 5) { const loss = a - b, r = 1 - b / a; if (!worst || r > worst.r) worst = { i, loss, r, a, b }; } }
  if (worst) W.push(['أكبر نقطة نخسر فيها الناس', 'من «' + F[worst.i - 1].t + '» إلى «' + F[worst.i].t + '»: انتقل ' + worst.b + ' من ' + worst.a + ' (' + pc(worst.b, worst.a) + '%)، أي خسرنا ' + worst.loss + ' شخصاً.', 'مؤكد']);
  for (let i = 1; i < F.length; i++) { const a = F[i - 1].seq, b = F[i].seq; if (a >= 5 && b / a >= 0.6) S.push(['انتقال جيد في المسار', '«' + F[i - 1].t + '» ← «' + F[i].t + '»: ' + pc(b, a) + '% انتقلوا (' + b + ' من ' + a + ').', 'مؤكد']); }
  // التسجيل
  if (o.regStarted >= 5) { const r = pc(o.regStarted - o.regIncomplete, o.regStarted);
    (r >= 60 ? S : W).push([r >= 60 ? 'إكمال التسجيل جيد' : 'كثيرون لا يكملون التسجيل', 'من بدأ التسجيل ' + o.regStarted + '، لم يكمل منهم ' + o.regIncomplete + ' (نسبة الإكمال ' + r + '%).', 'مؤكد']);
    const st = Object.entries(X.stallRegSteps || {}).sort((a, b) => b[1] - a[1])[0]; if (st) W.push(['أين يتوقف التسجيل', 'أكثر خطوة يتوقف عندها المسجّلون: «' + st[0] + '» (' + st[1] + ' شخصاً).', 'مؤكد']);
    const er = (R.regErrors || [])[0]; if (er) W.push(['أكثر خطأ في التسجيل', (names.err ? names.err(er.k) : er.k) + ' — ' + er.v + ' مرة.', 'مؤكد']); }
  if (X.authNoProfile) W.push(['حسابات غير مكتملة', X.authNoProfile + ' شخصاً أنشأوا حساباً ولم يكملوا بياناتهم (الاسم والدور).', 'مؤكد']);
  // الباقات والدفع
  if (o.plansViewers >= 5) { const r = pc(o.planSelectors, o.plansViewers);
    W.push(['مشاهدة الباقات دون اختيار', o.plansViewers + ' شاهدوا الباقات، واختار منهم باقة ' + o.planSelectors + ' فقط (' + r + '%).', 'مؤكد']);
    NOTE.push(['سبب عدم الاختيار', 'الأرقام تبيّن أين يتوقفون لا لماذا. لا يوجد دليل كافٍ لنسب ذلك إلى السعر أو الإعلان أو المحتوى.', 'يحتاج بيانات']); }
  if (o.payStarted) { W.push(['الدفع', 'بدأ الدفع ' + o.payStarted + '، واكتمل ' + o.payers + ' (' + pc(o.payers, o.payStarted) + '%). فشل: ' + o.failed + '، ألغاه المستخدم: ' + o.cancelled + '، تُرك دون إكمال: ' + o.abandoned + '.', o.failed + o.cancelled + o.abandoned ? 'مؤكد' : 'معلومة']); }
  if (o.subsDone) S.push(['اشتراكات مدفوعة', o.subsDone + ' اشتراكاً مؤكداً من بوابة الدفع بإيراد ' + o.revenue + ' د.ل.', 'مؤكد']);
  // العودة والنشاط
  if (o.visitors >= 10) { const r = pc(o.returning, o.visitors); (r >= 30 ? S : W).push([r >= 30 ? 'زوار يعودون' : 'قليل من الزوار يعودون', o.returning + ' من ' + o.visitors + ' زائراً عادوا (' + r + '%).', 'مؤكد']); }
  if (R.prev && R.prev.visitors >= 10) { const d = pc(o.visitors - R.prev.visitors, R.prev.visitors); if (d <= -30) W.push(['انخفاض النشاط', 'الزوار ' + o.visitors + ' مقابل ' + R.prev.visitors + ' في الفترة السابقة (' + d + '%).', 'مؤكد']); if (d >= 30) S.push(['زيادة النشاط', 'الزوار ' + o.visitors + ' مقابل ' + R.prev.visitors + ' في الفترة السابقة (+' + d + '%).', 'مؤكد']); }
  // التعلم
  const LU = (X.lessonsUse || []).filter(x => x.opens);
  if (LU[0]) S.push(['أكثر الدروس جذباً', LU.slice(0, 3).map(x => names.lesson(x.l) + ' (' + x.persons + ' شخصاً)').join('، ') + '.', 'مؤكد']);
  const SU = (X.subjUse || [])[0]; if (SU) S.push(['أكثر المواد استخداماً', names.subj(SU.g, SU.s) + ' — الصف ' + names.grade(SU.g) + ' (' + SU.opens + ' مرة فتح).', 'مؤكد']);
  LU.filter(x => x.opens >= 5 && x.done < 40).slice(0, 3).forEach(x => W.push(['درس يُترك قبل نهايته', names.lesson(x.l) + ': فُتح ' + x.opens + ' مرة وأُكمل ' + x.done + '% فقط.', 'مؤكد']));
  LU.filter(x => x.quiz >= 5 && x.avg != null && x.avg < 60).slice(0, 3).forEach(x => W.push(['تعثر متكرر في اختبار', names.lesson(x.l) + ': متوسط الدرجة ' + x.avg + '% في ' + x.quiz + ' محاولة.', 'مؤكد']));
  if (X.quizzes >= 10 && X.quizAvg >= 75) S.push(['نتائج الاختبارات جيدة', 'متوسط درجات ' + X.quizzes + ' محاولة اختبار: ' + X.quizAvg + '%.', 'مؤكد']);
  // التوصيات — الأولى مرتبطة بأكبر خسارة
  if (worst) { const k = F[worst.i].k;
    REC.push(['الأولوية الأولى', k === 'reg_start' ? 'معظم الزوار لا يبدأون التسجيل: اجعل الدروس المجانية والتعريفية أوضح في الصفحة الأولى، وأضف دعوة واضحة للتسجيل بعد أول درس.'
      : k === 'reg_done' ? 'كثيرون يبدأون التسجيل ولا يكملونه: راجع «التسجيلات المتوقفة» وأكثر خطأ يظهر لهم، وابدأ بإصلاحه.'
      : k === 'plans' ? 'المسجلون لا يصلون إلى الباقات: أبرز زر الاشتراك ومزاياه داخل الدروس والتقارير.'
      : k === 'select' ? 'يشاهدون الباقات ولا يختارون: اختبر صياغة الباقات وعرض القيمة؛ واسأل عينة منهم عن السبب قبل تغيير الأسعار.'
      : k === 'pay' ? 'يختارون الباقة ولا يبدأون الدفع: تحقق من وضوح خطوات الدفع ووسائله المتاحة.'
      : 'يبدأون الدفع ولا يكملونه: راجع الطلبات الفاشلة والملغاة في «الاشتراكات المتوقفة» وتواصل معهم.', 'مؤكد']); }
  if (o.plansViewers >= 5 && o.planSelectors / o.plansViewers < 0.2) REC.push(['قبل تغيير السعر', 'اجمع سبب عدم الاختيار (استطلاع قصير أو اتصال بمن شاهدوا الباقات) — البيانات الحالية لا تثبت أن السعر هو السبب.', 'يحتاج بيانات']);
  if ((R.campaigns || []).length === 0 && (R.sources || []).some(x => x.src === 'facebook')) REC.push(['تتبع الإعلانات', 'زيارات فيسبوك تصل بدون أسماء حملات. أضف روابط UTM لكل إعلان لمعرفة أي إعلان يجلب مشتركين.', 'معلومة']);
  if (LU.length && LU.length < 5) REC.push(['بيانات التعلم', 'عدد الدروس التي فُتحت قليل في هذه الفترة؛ اختر فترة أطول للحكم على الدروس.', 'يحتاج بيانات']);
  return { S, W, REC, NOTE };
}

export async function exportFull(R, names, alerts) {
  const XL = await loadX(); const o = R.overview, X = R.extra || {}; const A = analyze(R, names);
  const wb = XL.utils.book_new(); wb.Workbook = { Views: [{ RTL: true }] };
  const add = (name, rows, widths) => { const ws = XL.utils.aoa_to_sheet(rows); ws['!cols'] = (widths || [34, 18, 18, 18, 18, 18, 18, 18]).map(w => ({ wch: w })); ws['!rightToLeft'] = true; XL.utils.book_append_sheet(wb, ws, name.slice(0, 31)); };
  const T = (title, head, rows) => [[], [title], head, ...rows];
  const per = 'من ' + dt(R.from) + ' إلى ' + dt(R.to);
  const v = (x) => x == null ? '—' : x;
  // 1) الملخص التنفيذي
  add('الملخص التنفيذي', [
    ['التقرير الشامل لمنصة المجتهد'], ['الفترة', per], ['أُعدّ في', dt(Date.now())], ['بدء تتبع سلوك الزوار', R.firstTrack ? dt(R.firstTrack) : 'لم يبدأ بعد'],
    [], ['المؤشر', 'القيمة', 'الفترة السابقة'],
    ['إجمالي الزوار (أشخاص)', o.visitors, v(R.prev && R.prev.visitors)], ['زوار جدد', o.newVisitors, v(R.prev && R.prev.newVisitors)], ['زوار متكررون (عائدون)', o.returning, v(R.prev && R.prev.returning)],
    ['زيارات (جلسات)', o.sessions], ['متوسط مدة الزيارة (ثانية)', o.avgSession], ['حسابات جديدة (من قاعدة البيانات)', o.newAccounts, v(R.prev && R.prev.newAccounts)],
    ['طلاب نشطون هذا الشهر (مسجلون)', o.mauReg], ['نشطون اليوم / الأسبوع / الشهر', o.dau + ' / ' + o.wau + ' / ' + o.mau],
    ['أولياء الأمور (الإجمالي)', (X.roles || {}).parent || 0], ['الطلاب أصحاب الحسابات (الإجمالي)', (X.roles || {}).student || 0],
    ['الاشتراكات الفعالة الآن (مدفوعة)', (X.subsInfo || {}).active], ['اشتراكات جديدة مدفوعة في الفترة', o.subsDone], ['اشتراكات انتهت في الفترة', (X.subsInfo || {}).expired],
    ['شاهدوا الباقات', o.plansViewers], ['بدأوا إجراءات الاشتراك', o.payStarted], ['دفع ناجح', o.payers], ['دفع فاشل', o.failed], ['دفع ملغى', o.cancelled], ['طلبات دفع متروكة', o.abandoned],
    ['الإيراد المؤكد (د.ل)', o.revenue], ['التحويل من زائر إلى مشترك %', o.conversion],
    ['جلسات تعلّم (فيها درس)', X.learnSessions], ['دروس أُكملت', X.lessonsDone], ['محاولات اختبار', X.quizzes], ['متوسط درجات الاختبارات %', v(X.quizAvg)],
    [], ['✅ نقاط القوة', 'التفصيل', 'درجة الثقة'], ...(A.S.length ? A.S : [['لا توجد مؤشرات كافية بعد', '', '']]),
    [], ['⚠️ نقاط الضعف والمشكلات', 'التفصيل', 'درجة الثقة'], ...(A.W.length ? A.W : [['لا توجد مشكلات ظاهرة في هذه الفترة', '', '']]),
    [], ['💡 توصيات التحسين', 'التفصيل', 'درجة الثقة'], ...(A.REC.length ? A.REC : [['لا توصيات قبل توفر بيانات أكثر', '', '']]),
    ...(A.NOTE.length ? [[], ['ℹ️ ملاحظات', 'التفصيل', 'درجة الثقة'], ...A.NOTE] : []),
    [], ['«مؤكد» = مبني على أرقام مسجلة فعلاً. «يحتاج بيانات» = احتمال لا يكفي الدليل الحالي لإثباته.']], [40, 70, 16]);
  // 2) الزوار ورحلة المستخدم
  add('الزوار ورحلة المستخدم', [['الزوار ورحلة المستخدم', per],
    ...T('مسار التحويل', ['الخطوة', 'المسار المتتابع', 'نسبة الانتقال من السابقة %', 'المغادرون', 'كل خطوة على حدة'], R.funnel.map((f, i) => [f.t, f.seq, i ? v(pc(f.seq, R.funnel[i - 1].seq)) : '', i ? Math.max(0, R.funnel[i - 1].seq - f.seq) : '', f.n])),
    ...T('المصادر (حسب أول مصدر للشخص)', ['المصدر', 'أشخاص', 'زيارات', 'سجّلوا', 'شاهدوا الباقات', 'اشتركوا', 'التحويل %'], R.sources.map(x => [SRC[x.src] || x.src, x.persons, x.sessions, x.regs, x.plans, x.paid, v(pc(x.paid, x.persons))])),
    ...T('الحملات (UTM)', ['المصدر', 'الحملة', 'الإعلان', 'أشخاص', 'زيارات', 'سجّلوا', 'شاهدوا الباقات', 'اشتركوا'], R.campaigns.map(x => [SRC[x.src] || x.src, x.cmp, x.cnt, x.persons, x.sessions, x.regs, x.plans, x.paid])),
    ...T('تجربة الدروس', ['المؤشر', 'العدد'], [['فتحوا دروساً (جلسات)', X.learnSessions], ['ضغطوا دعوة للاشتراك من داخل المنصة', X.ctaClicks], ['تخطّوا ترتيب الدروس', X.orderSkips]]),
    ...T('يومياً', ['اليوم', 'زوار', 'جدد', 'حسابات جديدة', 'شاهدوا الباقات', 'طلبات دفع', 'اشتراكات', 'إيراد'], R.daily.map(d => [d.d, d.visitors, d.newV, d.regs, d.plans, d.pay, d.paid, d.revenue])),
    ...T('الأقسام الأكثر زيارة', ['القسم', 'مشاهدات'], R.pages.map(x => [names.page(x.k), x.v]))]);
  // 3) التسجيل والحسابات
  add('التسجيل والحسابات', [['التسجيل والحسابات', per],
    ...T('الحسابات حسب الدور', ['الدور', 'الإجمالي', 'جديد في الفترة'], Object.keys(X.roles || {}).map(k => [ROLE[k] || k, X.roles[k], (X.rolesNew || {})[k] || 0])),
    ...T('حالة الحسابات', ['المؤشر', 'العدد'], [['حسابات جديدة مكتملة (من قاعدة البيانات)', o.newAccounts], ['بدأوا التسجيل ولم يكملوه', o.regIncomplete], ['أنشأوا حساباً ولم يكملوا بياناتهم', X.authNoProfile],
      ['أجهزة أبناء مرتبطة (خاصة ومشتركة)', X.devices ? X.devices.kid : 'غير متاح'], ['أجهزة أسرة (هاتف ولي الأمر)', X.devices ? X.devices.fam : 'غير متاح']]),
    ...T('خطوات التسجيل', ['الخطوة', 'أشخاص'], R.regSteps.map(x => [x.t, x.n])),
    ...T('طرق التسجيل', ['الطريقة', 'أشخاص'], Object.entries(R.regMethods || {}).map(([k, n]) => [({ google: 'Google', email: 'البريد', phone: 'الهاتف' })[k] || k, n])),
    ...T('التسجيلات المتوقفة', ['المعرّف', 'توقف عند', 'آخر خطأ', 'الوقت', 'المصدر', 'عاد لاحقاً؟'], R.stalledReg.map(x => [x.id, x.stepT, x.err || '', dt(x.at), SRC[x.src] || x.src, x.returned ? 'نعم' : 'لا']))]);
  // 4) النشاط التعليمي
  const LU = (X.lessonsUse || []).filter(x => x.opens || x.quiz);
  add('النشاط التعليمي', [['النشاط التعليمي', per],
    ...T('ملخص', ['المؤشر', 'القيمة'], [['جلسات تعلّم', X.learnSessions], ['دروس أُكملت', X.lessonsDone], ['محاولات اختبار', X.quizzes], ['متوسط الدرجات %', v(X.quizAvg)], ['مشاهدات صفحات جدول الضرب', X.tmUse]]),
    ...T('المواد', ['المادة', 'الصف', 'مرات الفتح', 'أشخاص (مجموع الدروس)', 'إكمال', 'محاولات اختبار'], (X.subjUse || []).map(x => [names.subj(x.g, x.s), names.grade(x.g), x.opens, x.persons, x.dones, x.quiz])),
    ...T('الدروس الأكثر استخداماً', ['الدرس', 'المادة', 'الصف', 'أشخاص', 'مرات الفتح', 'أُكمل %', 'غادروا قبل النهاية', 'محاولات اختبار', 'متوسط الدرجة %', 'درجات أقل من 60%'], LU.slice(0, 25).map(x => [names.lesson(x.l), names.subj(x.g, x.s), names.grade(x.g), x.persons, x.opens, x.done, x.leaves, x.quiz, v(x.avg), x.low])),
    ...T('الدروس الأقل استخداماً (من التي فُتحت)', ['الدرس', 'المادة', 'الصف', 'أشخاص', 'مرات الفتح'], [...LU].filter(x => x.opens).sort((a, b) => a.opens - b.opens).slice(0, 15).map(x => [names.lesson(x.l), names.subj(x.g, x.s), names.grade(x.g), x.persons, x.opens])),
    ...T('مؤشرات التعثر المتكرر', ['الدرس', 'محاولات', 'متوسط الدرجة %', 'محاولات أقل من 60%'], LU.filter(x => x.quiz >= 3 && x.avg != null && x.avg < 60).map(x => [names.lesson(x.l), x.quiz, x.avg, x.low])),
    ...T('المواد المجانية', ['المادة', 'زوار', 'مسجلون', 'فتح', 'أكمل', 'انتقل للباقات', 'اشترك'], (R.free || []).map(f => [names.subj('', f.s), f.visitors, f.regs, f.opens, f.dones, f.toPlans, f.toPaid])),
    ...T('أين يغادر الطلاب داخل الدرس', ['نسبة التقدم في الدرس', 'مرات المغادرة'], Object.entries(X.leaveAt || {}).sort().map(([k, n]) => [k, n]))]);
  // 5) الاشتراكات والباقات
  add('الاشتراكات والباقات', [['الاشتراكات والباقات', per],
    ...T('ملخص', ['المؤشر', 'القيمة'], [['فعالة الآن (مدفوعة)', (X.subsInfo || {}).active], ['فترات تجريبية فعالة', (X.subsInfo || {}).activeTrial], ['جديدة مدفوعة في الفترة', o.subsDone], ['بدأت في الفترة (كل الأنواع)', (X.subsInfo || {}).started], ['انتهت في الفترة', (X.subsInfo || {}).expired], ['الإيراد المؤكد د.ل', o.revenue]]),
    ...T('الباقات', ['الباقة', 'شاهدها (أشخاص)', 'مرات المشاهدة', 'اختارها (أشخاص)', 'مرات الاختيار', 'ضغط ادفع', 'طلبات دفع', 'مدفوعة', 'إيراد', 'من المشاهدة إلى الاشتراك %'],
      R.plans.map(x => [names.plan(x.plan), x.shown, x.shownN, x.selected, x.selectedN, x.payClick, x.orders, x.paid, x.revenue, v(pc(x.paid, x.shown))])),
    ...T('من أين يدخلون صفحة الاشتراك', ['المدخل', 'مرات'], (R.entry || []).map(x => [names.page(x.k), x.v])),
    ...T('الدفع', ['المؤشر', 'العدد'], [['طلبات دفع أُنشئت', o.orders], ['مدفوعة ومؤكدة', o.subsDone], ['فشلت', o.failed], ['ألغاها المستخدم', o.cancelled], ['متروكة (+ساعتين)', o.abandoned]]),
    ...T('الاشتراكات المتوقفة', ['الشخص', 'الهاتف', 'توقف عند', 'آخر باقة', 'طلبات دفع', 'آخر طلب', 'الوقت'], R.stalledSub.map(x => [x.reg ? (x.name || 'حساب') : 'زائر ' + x.id, x.phone || '', x.stepT, names.plan(x.plan), x.orders, x.lastOrder, dt(x.at)]))]);
  // 6) المشكلات والتوقفات
  add('المشكلات والتوقفات', [['المشكلات والتوقفات', per],
    ...T('أخطاء التسجيل', ['الطريقة · الخطأ', 'مرات'], (R.regErrors || []).map(x => [names.err ? names.err(x.k) : x.k, x.v])),
    ...T('أخطاء الدفع (من المتصفح)', ['الخطأ', 'مرات'], Object.entries(X.payErrors || {}).map(([k, n]) => [k, n])),
    ...T('العمليات غير المكتملة', ['النوع', 'العدد'], [['تسجيل بدأ ولم يكتمل', o.regIncomplete], ['حساب بلا بيانات', X.authNoProfile], ['دفع فاشل', o.failed], ['دفع ملغى', o.cancelled], ['دفع متروك', o.abandoned]]),
    ...T('أين يتوقف التسجيل', ['الخطوة', 'أشخاص'], Object.entries(X.stallRegSteps || {}).sort((a, b) => b[1] - a[1])),
    ...T('أين يتوقف الاشتراك', ['الخطوة', 'أشخاص'], Object.entries(X.stallSubSteps || {}).sort((a, b) => b[1] - a[1])),
    ...T('طلبات دفع لم تكتمل (تشمل ما قبل التتبع)', ['الاسم', 'الهاتف', 'الباقة', 'المبلغ', 'الحالة', 'التاريخ'], (R.histPending || []).map(x => [x.name, x.phone, x.plan, x.amount, x.status === 'failed' ? 'فشل' : x.cancelled ? 'ألغاه' : 'لم يكمل', dt(x.at)])),
    ...T('تنبيهات النظام في الفترة', ['الوقت', 'التنبيه', 'التفاصيل'], (alerts || []).filter(a => a.at >= R.from && a.at < R.to).map(a => [dt(a.at), a.title, a.body || '']))]);
  const fn = 'mujtahid-full-report-' + new Date(R.to - 1 + 2 * 3600e3).toISOString().slice(0, 10) + '.xlsx';
  XL.writeFile(wb, fn); return { fn, A };
}
