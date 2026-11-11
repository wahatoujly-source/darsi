// ===================== المجتهد — نظام التحليلات والتحويلات =====================
// المجموعات (يكتبها الخادم فقط، ولا يقرؤها أحد إلا عبر adminAx):
//   ax_events/{eid}    حدث واحد (معرّفه من المتصفح ⇒ إعادة الإرسال لا تكرره)
//   ax_sessions/{sid}  جلسة: بداية، آخر نشاط، عدد الصفحات، المصدر
//   ax_visitors/{vid}  زائر ثابت (معرّف في المتصفح): أول/آخر زيارة، أيام النشاط، المصدر، الحساب المرتبط، آخر وقت لكل خطوة
//   ax_alerts/{id}     تنبيهات لوحة الإدارة
// لا تُسجَّل كلمات المرور ولا بيانات الدفع ولا نصوص يكتبها المستخدم.
"use strict";

const EVENTS = new Set(["session_start", "page_view", "ping", "upgrade_click", "plans_view", "plan_select", "plan_info", "pay_click", "pay_redirect",
  "pay_return", "pay_cancel", "pay_confirmed", "pay_unconfirmed", "pay_error", "reg_open", "reg_method", "reg_input", "reg_submit", "reg_error", "reg_auth",
  "onboard_open", "signup_done", "login_done", "kid_add", "tour_step", "tour_done", "tour_skip", "tip_click", "lesson_open", "lesson_done", "lesson_leave", "cta_click", "lesson_score", "mastered_view"]);
// الخطوات التي نحفظ آخر وقت لها في ملف الزائر (لقوائم «توقف عند…»)
const MILESTONES = ["reg_open", "reg_method", "reg_input", "reg_submit", "reg_error", "reg_auth", "onboard_open", "signup_done", "login_done", "upgrade_click",
  "plans_view", "plan_select", "pay_click", "pay_redirect", "pay_return", "pay_cancel", "pay_confirmed", "pay_error", "lesson_open", "lesson_done", "kid_add", "tour_done", "tour_skip"];
const FREE = ["isl", "civ"];
const DAY = 864e5;
const tday = (ms) => new Date(ms + 2 * 36e5).toISOString().slice(0, 10); // يوم طرابلس
const clean = (v, d = 0) => {
  if (v == null) return null;
  if (typeof v === "number") return isFinite(v) ? Math.round(v * 100) / 100 : null;
  if (typeof v === "boolean") return v;
  if (typeof v === "string") return v.slice(0, 80);
  if (Array.isArray(v) && d < 1) return v.slice(0, 12).map((x) => clean(x, d + 1)).filter((x) => x != null && typeof x !== "object");
  return null;
};
// قائمة بيضاء لأسماء الخصائص: أي شيء آخر (مثل نص أدخله المستخدم) يُرمى ولا يُحفظ
const PROPS = new Set(["r", "x", "l", "g", "s", "f", "n", "at", "st", "plans", "plan", "price", "who", "logged", "m", "mode", "code", "role", "via", "oid", "amt", "msg",
  "from", "src", "med", "cmp", "cnt", "trm", "ref", "land", "paid", "pwa", "dev", "ret", "i", "k", "t", "sc", "lock", "all"]);
const cleanProps = (p) => { const o = {}; if (!p || typeof p !== "object") return o; let n = 0;
  for (const k of Object.keys(p)) { if (n++ > 24 || !PROPS.has(k)) continue; const v = clean(p[k]); if (v != null) o[k] = v; } return o; };
const okId = (x, re) => typeof x === "string" && re.test(x);

module.exports = function makeAx(ctx) {
  const {db, FieldValue, onRequest, onCall, onSchedule, HttpsError, logger, admin, needAdmin, pushStaff, staffUids} = ctx;

  // ---------- استقبال الأحداث من المتصفح ----------
  const ax = onRequest({memory: "256MiB", concurrency: 80, maxInstances: 10, cors: false}, async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    if (req.method === "OPTIONS") { res.set("Access-Control-Allow-Methods", "POST"); res.set("Access-Control-Allow-Headers", "Content-Type"); return res.status(204).send(""); }
    if (req.method !== "POST") return res.status(405).send("");
    const raw = req.rawBody; if (!raw || raw.length > 48000) return res.status(413).send("");
    let b; try { b = JSON.parse(raw.toString("utf8")); } catch (e) { return res.status(400).send(""); }
    const vid = b.v, sid = b.s;
    if (!okId(vid, /^v[a-z0-9]{10,20}$/) || !okId(sid, /^s[a-z0-9]{8,16}$/)) return res.status(400).send("");
    const now = Date.now();
    // الحساب: نثق فقط برمز Firebase الموقَّع (لا نقبل uid يرسله المتصفح)
    let uid = null, kidOf = null;
    if (typeof b.tok === "string" && b.tok.length > 100 && b.tok.length < 4000) {
      try { const t = await admin.auth().verifyIdToken(b.tok); if (t.firebase && t.firebase.sign_in_provider === "anonymous") kidOf = t.kidOf || null; else uid = t.uid; } catch (e) { /* رمز منتهٍ: نسجل كزائر */ }
    }
    const ev = Array.isArray(b.ev) ? b.ev.slice(0, 40) : [];
    const batch = db.batch(); const vis = {}; const ses = {}; let pv = 0, alerts = [];
    const skew = (t) => (typeof t === "number" && Math.abs(t - now) < 2 * DAY ? t : now);
    for (const e of ev) {
      if (!e || !EVENTS.has(e.n) || !okId(e.id, /^[a-z0-9]{10,24}$/)) continue;
      const t = skew(e.t), p = cleanProps(e.p);
      if (e.n === "ping") continue; // النبضة تحدّث آخر نشاط فقط
      if (e.n === "page_view") pv++;
      batch.set(db.collection("ax_events").doc(e.id), {n: e.n, t, d: tday(t), vid, sid, uid: uid || null, kid: kidOf ? 1 : 0, p});
      if (MILESTONES.includes(e.n)) vis["st." + e.n] = t;
      if (e.n === "session_start") {
        Object.assign(ses, {src: p.src || "direct", med: p.med || "", cmp: p.cmp || "", cnt: p.cnt || "", trm: p.trm || "", land: p.land || "", ref: p.ref || "", paid: !!p.paid});
        vis.sessN = FieldValue.increment(1); vis.lastSrc = p.src || "direct"; if (p.cmp) vis.lastCmp = p.cmp;
      }
      if (e.n === "plans_view" && Array.isArray(p.plans)) p.plans.forEach((x) => { if (/^[a-z0-9_]{1,30}$/i.test(x)) vis["pv." + x] = FieldValue.increment(1); });
      if (e.n === "plan_select" && /^[a-z0-9_]{1,30}$/i.test(p.plan || "")) { vis["ps." + p.plan] = FieldValue.increment(1); vis.lastPlan = p.plan; }
      if (e.n === "pay_click" && p.plan) vis.lastPlan = p.plan;
      if (e.n === "lesson_open" && FREE.includes(p.s)) vis["fr." + p.s] = FieldValue.increment(1);
      if (e.n === "reg_error") vis.lastErr = String(p.code || "").slice(0, 60);
      if (e.n === "signup_done" && uid) alerts.push({id: "reg_" + uid, type: "reg", title: "تسجيل حساب جديد", body: (p.role === "parent" ? "ولي أمر" : p.role === "student" ? "طالب" : p.role === "teacher" ? "معلم" : "حساب") + " أكمل التسجيل", uid});
      if (e.n === "pay_cancel" && uid && /^[A-Za-z0-9]{10,40}$/.test(p.oid || "")) {
        const oRef = db.collection("orders").doc(p.oid);
        await db.runTransaction(async (tx) => { const o = await tx.get(oRef); if (o.exists && o.data().uid === uid && o.data().status === "pending") tx.update(oRef, {cancelledAt: now}); }).catch(() => {});
      }
    }
    // الجلسة
    const sRef = db.collection("ax_sessions").doc(sid);
    const s0 = skew(b.s0);
    batch.set(sRef, {vid, uid: uid || null, s0, d: tday(s0), last: now, n: Math.max(1, Number(b.sn) || 1), ...ses, ...(pv ? {pv: FieldValue.increment(pv)} : {}),
      ...(b.dev ? {dev: String(b.dev).slice(0, 20)} : {}), pwa: !!b.pwa}, {merge: true});
    // الزائر
    const ft = b.ft && typeof b.ft === "object" ? cleanProps(b.ft) : null;
    const vRef = db.collection("ax_visitors").doc(vid);
    const vData = {f: Math.min(skew(b.f), s0), last: now, days: FieldValue.arrayUnion(tday(now)), ...(uid ? {uid} : {}), ...(kidOf ? {kidOf} : {}), ...(ft ? {ft: {src: ft.src || "direct", med: ft.med || "", cmp: ft.cmp || "", cnt: ft.cnt || "", paid: !!ft.paid}} : {})};
    // المفاتيح المنقّطة لا تعمل مع set(merge) — نحوّلها إلى خرائط متداخلة
    for (const [k, v] of Object.entries(vis)) { const [a, c] = k.split("."); if (c) { vData[a] = vData[a] || {}; vData[a][c] = v; } else vData[a] = v; }
    batch.set(vRef, vData, {merge: true});
    if (uid) batch.set(db.collection("ax_users").doc(uid), {last: now, days: FieldValue.arrayUnion(tday(now)), vids: FieldValue.arrayUnion(vid)}, {merge: true});
    try { await batch.commit(); } catch (e) { logger.warn("ax commit", e.message); return res.status(503).send(""); }
    for (const a of alerts) await addAlert(a).catch(() => {});
    return res.status(204).send("");
  });

  // ---------- التنبيهات ----------
  async function addAlert(a, push) {
    const ref = db.collection("ax_alerts").doc(a.id);
    const made = await db.runTransaction(async (tx) => { const x = await tx.get(ref); if (x.exists) return false;
      tx.set(ref, {type: a.type, title: a.title, body: a.body || "", at: Date.now(), read: false, uid: a.uid || null, lvl: a.lvl || "info"}); return true; });
    if (made && push && pushStaff) await pushStaff("ax", {title: a.title, body: a.body || "", link: "#admin-ax"}).catch(() => {});
    return made;
  }

  // ---------- التقرير: يُحسب من البيانات الخام لفترة محددة ----------
  async function loadAll(from, to) {
    const [evs, sess, viss, users, orders, subs, axu, staff] = await Promise.all([
      db.collection("ax_events").where("t", ">=", from).where("t", "<", to).select("n", "t", "vid", "sid", "uid", "kid", "p").get(),
      db.collection("ax_sessions").where("s0", ">=", from - DAY).where("s0", "<", to).get(),
      db.collection("ax_visitors").get(),
      db.collection("users").select("role", "name", "phone", "email", "createdAt").get(),
      db.collection("orders").select("uid", "status", "amount", "plan", "planName", "kind", "createdAt", "paidAt", "cancelledAt", "gwEvent").get(),
      db.collection("subscriptions").select("uid", "kind", "amount", "start", "end", "active").get(),
      db.collection("ax_users").get(),
      staffUids(),
    ]);
    const ms = (x) => (x && x.toMillis ? x.toMillis() : typeof x === "number" ? x : 0);
    return {
      events: evs.docs.map((d) => d.data()),
      sessions: sess.docs.map((d) => ({id: d.id, ...d.data()})),
      visitors: viss.docs.map((d) => ({id: d.id, ...d.data()})),
      users: users.docs.map((d) => { const u = d.data(); return {id: d.id, role: u.role, name: u.name || "", phone: String(u.phone || "").replace("+218", "0"), email: u.email || "", created: ms(u.createdAt)}; }),
      orders: orders.docs.map((d) => { const o = d.data(); return {id: d.id, uid: o.uid, status: o.status, amount: Number(o.amount) || 0, plan: o.plan || o.kind, planName: o.planName || "", kind: o.kind,
        created: ms(o.createdAt), paid: ms(o.paidAt), cancelled: o.cancelledAt || 0, gw: o.gwEvent || ""}; }),
      subs: subs.docs.map((d) => { const s = d.data(); return {id: d.id, uid: s.uid, kind: s.kind, amount: Number(s.amount) || 0, start: ms(s.start), end: ms(s.end), active: s.active !== false}; }),
      axUsers: axu.docs.map((d) => ({id: d.id, ...d.data()})),
      staff: new Set(staff),
    };
  }

  const adminAx = onCall({memory: "1GiB", timeoutSec: 120}, async (req) => {
    await needAdmin(req, "ax");
    const d = req.data || {}; const op = String(d.op || "report");
    if (op === "alerts") {
      const q = await db.collection("ax_alerts").orderBy("at", "desc").limit(150).get();
      return {list: q.docs.map((x) => ({id: x.id, ...x.data()}))};
    }
    if (op === "read") {
      const ids = (Array.isArray(d.ids) ? d.ids : []).filter((x) => /^[A-Za-z0-9_-]{1,80}$/.test(x)).slice(0, 200);
      const b = db.batch(); ids.forEach((id) => b.update(db.collection("ax_alerts").doc(id), {read: true})); await b.commit().catch(() => {});
      return {ok: true};
    }
    const to = Math.min(Number(d.to) || Date.now(), Date.now() + DAY), from = Math.max(Number(d.from) || to - 7 * DAY, to - 400 * DAY);
    const data = await loadAll(from, to);
    // فترة سابقة مماثلة للمقارنة (أرقام النظرة العامة فقط)
    let prev = null;
    if (d.compare !== false && to - from <= 92 * DAY) {
      const pf = from - (to - from);
      const pe = await db.collection("ax_events").where("t", ">=", pf).where("t", "<", from).select("n", "t", "vid", "sid", "uid", "kid", "p").get();
      prev = computeReport({...data, events: pe.docs.map((x) => x.data())}, pf, from, {light: true});
    }
    const r = computeReport(data, from, to, {});
    r.prev = prev && r.firstTrack && r.firstTrack <= from - (to - from) ? prev.overview : null; // لا مقارنة بفترة لم يكن التتبع يعمل فيها
    return r;
  });

  // ---------- مراقبة دورية: تنبيهات عند تغيّر ملحوظ ----------
  const axWatch = onSchedule({schedule: "15 21 * * *", timeZone: "Africa/Tripoli", memory: "1GiB", timeoutSec: 300}, async () => {
    const now = Date.now(); const day = tday(now);
    const data = await loadAll(now - 8 * DAY, now);
    const cur = computeReport(data, now - DAY, now, {light: true}).overview;
    const base = computeReport(data, now - 8 * DAY, now - DAY, {light: true}).overview; // متوسط 7 أيام سابقة
    const avg = (k) => (base[k] || 0) / 7;
    const pct = (a, b) => (b ? Math.round((a - b) * 100 / b) : 0);
    const A = [];
    if (cur.regStarted >= 5 && cur.regIncomplete > Math.max(3, avg("regIncomplete") * 1.5))
      A.push({type: "reg_drop", lvl: "warn", title: "ارتفاع التسجيلات غير المكتملة", body: `${cur.regIncomplete} بدأوا التسجيل ولم يكملوه اليوم (المعتاد ${avg("regIncomplete").toFixed(1)} يومياً).`});
    const exitsNow = cur.plansViewers - cur.planSelectors, exitsAvg = (base.plansViewers - base.planSelectors) / 7;
    if (cur.plansViewers >= 5 && exitsNow > Math.max(3, exitsAvg * 1.5))
      A.push({type: "plans_exit", lvl: "warn", title: "خروج كثير من صفحة الباقات", body: `${exitsNow} شاهدوا الباقات ولم يختاروا أي باقة اليوم (المعتاد ${exitsAvg.toFixed(1)}).`});
    if (cur.returning >= 5 && cur.returning > avg("returning") * 1.3)
      A.push({type: "ret_up", lvl: "good", title: "زيادة في الزوار العائدين", body: `${cur.returning} عادوا اليوم (+${pct(cur.returning, avg("returning"))}% عن المعتاد).`});
    if (avg("visitors") >= 10 && cur.visitors < avg("visitors") * 0.6)
      A.push({type: "act_down", lvl: "warn", title: "انخفاض ملحوظ في النشاط", body: `${cur.visitors} زائراً اليوم مقابل ${avg("visitors").toFixed(0)} في المتوسط (${pct(cur.visitors, avg("visitors"))}%).`});
    for (const a of A) await addAlert({...a, id: a.type + "_" + day}, a.lvl === "warn");
    logger.info("axWatch", {day, alerts: A.length});
  });

  return {ax, adminAx, axWatch, addAlert};
};

// ======================================================================
// حساب التقرير (دالة خالصة: تُختبر محلياً ببيانات تجريبية)
// ======================================================================
function computeReport(data, from, to, opt = {}) {
  const {events, sessions, visitors, users, orders, subs, axUsers, staff} = data;
  const inR = (t) => t >= from && t < to;
  const U = Object.fromEntries(users.map((u) => [u.id, u]));
  const V = Object.fromEntries(visitors.map((v) => [v.id, v]));
  // الشخص: الحساب إن عُرف، وإلا الزائر. نستبعد المالك والمشرفين وأجهزة الأبناء
  const vidUid = {}; visitors.forEach((v) => { if (v.uid) vidUid[v.id] = v.uid; });
  const isStaff = (uid) => uid && staff.has(uid);
  const pkey = (vid, uid) => { const u = uid || vidUid[vid]; return u ? "u:" + u : "v:" + vid; };
  const evs = events.filter((e) => !e.kid && !isStaff(e.uid || vidUid[e.vid]) && inR(e.t));
  const by = {}; // اسم الحدث → مجموعة الأشخاص
  const add = (n, k) => { (by[n] = by[n] || new Set()).add(k); };
  const cnt = {}; evs.forEach((e) => { const k = pkey(e.vid, e.uid); add(e.n, k); cnt[e.n] = (cnt[e.n] || 0) + 1; });
  const S = (n) => (by[n] ? by[n].size : 0);
  const union = (...ns) => { const s = new Set(); ns.forEach((n) => (by[n] || []).forEach((x) => s.add(x))); return s; };

  // الزوار في الفترة
  const sessR = sessions.filter((s) => inR(s.s0) && !isStaff(s.uid || vidUid[s.vid]) && !(V[s.vid] && V[s.vid].kidOf));
  const activeVids = new Set(sessR.map((s) => s.vid)); evs.forEach((e) => activeVids.add(e.vid));
  const persons = new Set([...activeVids].map((v) => pkey(v)));
  const newV = [...activeVids].filter((v) => V[v] && inR(V[v].f)).length;
  const returningV = [...activeVids].filter((v) => V[v] && V[v].f < from).length + [...activeVids].filter((v) => V[v] && inR(V[v].f) && (V[v].days || []).length > 1).length;
  const durs = sessR.map((s) => Math.max(0, Math.min((s.last || s.s0) - s.s0, 4 * 3600e3)));
  const avgSession = durs.length ? Math.round(durs.reduce((a, b) => a + b, 0) / durs.length / 1000) : 0;

  // التسجيل: الحقيقة من قاعدة البيانات (الحسابات التي أُنشئت فعلاً) + الخطوات من الأحداث
  const newAccounts = users.filter((u) => inR(u.created) && !isStaff(u.id));
  const regStartedSet = union("reg_method", "reg_input", "reg_submit");
  const regDoneSet = union("signup_done");
  const regIncomplete = [...regStartedSet].filter((k) => !regDoneSet.has(k) && !(k.startsWith("u:") && U[k.slice(2)])).length;

  // الدفع: الحقيقة من الطلبات والاشتراكات (إشعار ماي باي)
  const ordR = orders.filter((o) => o.kind !== "course" && inR(o.created) && !isStaff(o.uid));
  const paidR = orders.filter((o) => o.kind !== "course" && o.status === "paid" && inR(o.paid || o.created) && !isStaff(o.uid));
  const revenue = Math.round(paidR.reduce((a, o) => a + o.amount, 0) * 100) / 100;
  const payStartedSet = new Set([...union("pay_click")].concat(ordR.map((o) => "u:" + o.uid)));
  const paidSet = new Set(paidR.map((o) => "u:" + o.uid));
  const failed = ordR.filter((o) => o.status === "failed").length;
  const cancelled = ordR.filter((o) => o.status === "pending" && o.cancelled).length;
  const abandoned = ordR.filter((o) => o.status === "pending" && !o.cancelled && Date.now() - o.created > 2 * 3600e3).length;

  const overview = {
    visitors: persons.size, newVisitors: newV, returning: returningV, sessions: sessR.length, avgSession,
    regStarted: regStartedSet.size, regDone: regDoneSet.size, newAccounts: newAccounts.length, regIncomplete,
    plansViewers: S("plans_view"), planSelectors: S("plan_select"), payStarted: payStartedSet.size, orders: ordR.length,
    subsDone: paidR.length, payers: paidSet.size, revenue, failed, cancelled, abandoned,
    conversion: persons.size ? Math.round(paidSet.size * 10000 / persons.size) / 100 : 0,
  };
  if (opt.light) return {overview};

  // نشاط يومي/أسبوعي/شهري (حتى نهاية الفترة)
  const endDay = tday(to - 1); const dayMs = Date.parse(endDay + "T00:00:00Z");
  const lastN = (n) => { const s = new Set(); for (let i = 0; i < n; i++) s.add(new Date(dayMs - i * DAY).toISOString().slice(0, 10)); return s; };
  const pdays = {}; // الشخص → أيام النشاط
  visitors.forEach((v) => { if (v.kidOf || isStaff(v.uid)) return; const k = pkey(v.id); const s = pdays[k] = pdays[k] || new Set(); (v.days || []).forEach((x) => s.add(x)); });
  const activeIn = (set, reg) => Object.entries(pdays).filter(([k, ds]) => (reg == null || k.startsWith("u:") === reg) && [...ds].some((x) => set.has(x))).length;
  const D1 = lastN(1), D7 = lastN(7), D30 = lastN(30);
  overview.dau = activeIn(D1); overview.wau = activeIn(D7); overview.mau = activeIn(D30);
  overview.dauReg = activeIn(D1, true); overview.wauReg = activeIn(D7, true); overview.mauReg = activeIn(D30, true);
  overview.totalVisitors = Object.keys(pdays).length;

  // يومياً داخل الفترة
  const daily = {};
  const dd = (d) => (daily[d] = daily[d] || {visitors: new Set(), newV: 0, regs: 0, plans: new Set(), pay: 0, paid: 0, revenue: 0});
  sessR.forEach((s) => dd(tday(s.s0)).visitors.add(pkey(s.vid)));
  visitors.forEach((v) => { if (inR(v.f) && !v.kidOf) dd(tday(v.f)).newV++; });
  newAccounts.forEach((u) => dd(tday(u.created)).regs++);
  evs.filter((e) => e.n === "plans_view").forEach((e) => dd(tday(e.t)).plans.add(pkey(e.vid, e.uid)));
  ordR.forEach((o) => dd(tday(o.created)).pay++);
  paidR.forEach((o) => { const x = dd(tday(o.paid || o.created)); x.paid++; x.revenue += o.amount; });
  const dailyRows = Object.keys(daily).sort().map((d) => ({d, visitors: daily[d].visitors.size, newV: daily[d].newV, regs: daily[d].regs, plans: daily[d].plans.size, pay: daily[d].pay, paid: daily[d].paid, revenue: Math.round(daily[d].revenue)}));

  // مسار التحويل
  const funnel = [
    ["visit", "زائر", persons.size],
    ["reg_start", "بدأ التسجيل", regStartedSet.size],
    ["reg_done", "أكمل التسجيل", Math.max(regDoneSet.size, newAccounts.length)],
    ["plans", "شاهد الباقات", S("plans_view")],
    ["select", "اختار باقة", S("plan_select")],
    ["pay", "بدأ الدفع", payStartedSet.size],
    ["paid", "أكمل الاشتراك", paidSet.size],
  ].map(([k, t, n]) => ({k, t, n}));
  // المسار المتتابع: كم شخصاً مرّ بكل الخطوات السابقة بالترتيب
  const registered = new Set([...persons].filter((k) => k.startsWith("u:") && U[k.slice(2)]));
  const seqSteps = [null, new Set([...regStartedSet, ...registered]), new Set([...regDoneSet, ...registered]), by.plans_view || new Set(), by.plan_select || new Set(), payStartedSet, paidSet];
  let alive = new Set(persons); const seq = [alive.size];
  for (let i = 1; i < seqSteps.length; i++) { alive = new Set([...alive].filter((k) => seqSteps[i].has(k))); seq.push(alive.size); }
  funnel.forEach((f, i) => { f.seq = seq[i]; });

  // صفحات وأقسام
  const pages = {}, pagesX = {};
  evs.filter((e) => e.n === "page_view").forEach((e) => { const r = (e.p && e.p.r) || "?"; pages[r] = (pages[r] || 0) + 1; if (e.p && e.p.x) { const k = r + ":" + e.p.x; pagesX[k] = (pagesX[k] || 0) + 1; } });
  const top = (o, n) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => ({k, v}));

  // المصادر والحملات (المصدر الأول للزائر = نسب التحويل إليه)
  const srcAgg = {}, cmpAgg = {};
  const personSrc = {};
  [...activeVids].forEach((v) => { const ft = (V[v] && V[v].ft) || {}; personSrc[pkey(v)] = personSrc[pkey(v)] || ft; });
  const SA = (k) => (srcAgg[k] = srcAgg[k] || {sessions: 0, persons: new Set()});
  persons.forEach((k) => SA((personSrc[k] && personSrc[k].src) || "direct").persons.add(k)); // الأشخاص حسب أول مصدر جاؤوا منه
  sessR.forEach((s) => { SA(s.src || "direct").sessions++;
    if (s.cmp || s.cnt) { const k = (s.src || "") + " | " + (s.cmp || "—") + " | " + (s.cnt || "—"); const c = cmpAgg[k] = cmpAgg[k] || {src: s.src, cmp: s.cmp, cnt: s.cnt, sessions: 0, persons: new Set()}; c.sessions++; c.persons.add(pkey(s.vid)); } });
  const conv = (set) => ({regs: [...set].filter((k) => regDoneSet.has(k) || (k.startsWith("u:") && newAccounts.some((u) => "u:" + u.id === k))).length, plans: [...set].filter((k) => (by.plans_view || new Set()).has(k)).length, paid: [...set].filter((k) => paidSet.has(k)).length});
  const sources = Object.entries(srcAgg).map(([k, a]) => ({src: k, sessions: a.sessions, persons: a.persons.size, ...conv(a.persons)})).sort((a, b) => b.persons - a.persons);
  const campaigns = Object.values(cmpAgg).map((a) => ({src: a.src, cmp: a.cmp, cnt: a.cnt, sessions: a.sessions, persons: a.persons.size, ...conv(a.persons)})).sort((a, b) => b.persons - a.persons).slice(0, 60);

  // خطوات التسجيل بالتفصيل + الأخطاء
  const regSteps = [["reg_open", "فتح صفحة التسجيل"], ["reg_method", "اختار طريقة التسجيل"], ["reg_input", "بدأ إدخال البيانات"], ["reg_submit", "ضغط إنشاء الحساب"], ["reg_auth", "أُنشئ الحساب"], ["onboard_open", "فتح صفحة بياناته (الاسم والدور)"], ["signup_done", "أكمل التسجيل"]]
      .map(([k, t]) => ({k, t, n: S(k)}));
  const methods = {}; evs.filter((e) => e.n === "reg_method").forEach((e) => { const m = (e.p && e.p.m) || "?"; methods[m] = methods[m] || new Set(); methods[m].add(pkey(e.vid, e.uid)); });
  const regErrors = {}; evs.filter((e) => e.n === "reg_error").forEach((e) => { const k = ((e.p && e.p.m) || "?") + " · " + ((e.p && e.p.code) || "?"); regErrors[k] = (regErrors[k] || 0) + 1; });

  // الأشخاص (جدول الزوار والمستخدمين)
  const pinfo = {};
  visitors.forEach((v) => { if (v.kidOf || isStaff(v.uid)) return; const k = pkey(v.id); const p = pinfo[k] = pinfo[k] || {k, vids: [], f: Infinity, last: 0, sessN: 0, days: new Set(), src: null, st: {}, pv: {}, ps: {}, fr: {}, lastPlan: "", lastErr: ""};
    p.vids.push(v.id); p.f = Math.min(p.f, v.f || Infinity); p.last = Math.max(p.last, v.last || 0); p.sessN += v.sessN || 0; (v.days || []).forEach((x) => p.days.add(x));
    if (!p.src || (v.f && v.f <= p.f)) p.src = v.ft || p.src; Object.entries(v.st || {}).forEach(([n, t]) => { p.st[n] = Math.max(p.st[n] || 0, t); });
    Object.entries(v.pv || {}).forEach(([n, c]) => { p.pv[n] = (p.pv[n] || 0) + c; }); Object.entries(v.ps || {}).forEach(([n, c]) => { p.ps[n] = (p.ps[n] || 0) + c; });
    Object.entries(v.fr || {}).forEach(([n, c]) => { p.fr[n] = (p.fr[n] || 0) + c; }); if (v.lastPlan) p.lastPlan = v.lastPlan; if (v.lastErr) p.lastErr = v.lastErr; });
  const everPaid = new Set(orders.filter((o) => o.status === "paid" && o.kind !== "course").map((o) => o.uid));
  const subNow = new Set(subs.filter((s) => s.active && s.end > Date.now() && s.kind !== "trial").map((s) => s.uid));
  const rowOf = (p) => { const uid = p.k.startsWith("u:") ? p.k.slice(2) : null; const u = uid ? U[uid] : null;
    return {id: uid ? uid.slice(0, 8) : p.k.slice(2, 12), uid, reg: !!u, name: u ? u.name : "", role: u ? u.role : "", phone: u ? u.phone : "", f: p.f === Infinity ? 0 : p.f, last: p.last, visits: p.sessN, days: p.days.size,
      src: (p.src && p.src.src) || "", cmp: (p.src && p.src.cmp) || "", returned: p.days.size > 1, plans: !!p.st.plans_view, sub: uid ? everPaid.has(uid) : false, subNow: uid ? subNow.has(uid) : false}; };
  const people = Object.values(pinfo).filter((p) => p.last >= from && p.f < to).sort((a, b) => b.last - a.last);
  const peopleRows = people.slice(0, 1500).map(rowOf);

  // التسجيلات المتوقفة: بدأ ولم يكمل (لا حساب مكتمل بعد)
  const REG_ORDER = ["reg_open", "reg_method", "reg_input", "reg_submit", "reg_auth", "onboard_open"];
  const REG_T = {reg_open: "فتح صفحة التسجيل", reg_method: "اختار الطريقة", reg_input: "بدأ الإدخال", reg_submit: "ضغط إنشاء الحساب", reg_auth: "أنشأ الحساب ولم يكمل بياناته", onboard_open: "فتح صفحة بياناته ولم يحفظها"};
  const stalledReg = Object.values(pinfo).filter((p) => { const uid = p.k.startsWith("u:") ? p.k.slice(2) : null; if (uid && U[uid]) return false; if (p.st.signup_done) return false;
    const t = Math.max(...REG_ORDER.map((n) => p.st[n] || 0)); return t >= from && t < to; })
      .map((p) => { const step = REG_ORDER.filter((n) => p.st[n]).sort((a, b) => REG_ORDER.indexOf(b) - REG_ORDER.indexOf(a))[0]; return {...rowOf(p), step, stepT: REG_T[step] || step, at: p.st[step], err: p.lastErr}; })
      .sort((a, b) => b.at - a.at).slice(0, 500);

  // الاشتراكات المتوقفة: شاهد الباقات/اختار/بدأ الدفع ولم يدفع
  const SUB_ORDER = ["upgrade_click", "plans_view", "plan_select", "pay_click", "pay_redirect", "pay_cancel"];
  const SUB_T = {upgrade_click: "دخل صفحة الاشتراك", plans_view: "شاهد الباقات", plan_select: "اختار باقة", pay_click: "ضغط «ادفع»", pay_redirect: "انتقل إلى صفحة الدفع", pay_cancel: "ألغى الدفع"};
  const ordByUid = {}; orders.filter((o) => o.kind !== "course").forEach((o) => { (ordByUid[o.uid] = ordByUid[o.uid] || []).push(o); });
  const stalledSub = Object.values(pinfo).filter((p) => { const uid = p.k.startsWith("u:") ? p.k.slice(2) : null; if (uid && everPaid.has(uid)) return false;
    const t = Math.max(...SUB_ORDER.map((n) => p.st[n] || 0)); return t >= from && t < to; })
      .map((p) => { const uid = p.k.startsWith("u:") ? p.k.slice(2) : null; const step = SUB_ORDER.filter((n) => p.st[n]).sort((a, b) => SUB_ORDER.indexOf(b) - SUB_ORDER.indexOf(a))[0];
        const os = uid ? (ordByUid[uid] || []) : []; const lo = os.sort((a, b) => b.created - a.created)[0];
        const seen = Object.entries(p.pv).map(([k, v]) => k + "×" + v).join("، "); const sel = Object.entries(p.ps).map(([k, v]) => k + "×" + v).join("، ");
        return {...rowOf(p), step, stepT: SUB_T[step] || step, at: p.st[step], plan: p.lastPlan || (lo && lo.plan) || "", seen, sel, orders: os.length, lastOrder: lo ? lo.status + (lo.cancelled ? " (ألغى)" : "") : ""}; })
      .sort((a, b) => b.at - a.at).slice(0, 500);
  // طلبات دفع قديمة (قبل بدء التتبع) لم تكتمل — بيانات تاريخية حقيقية من قاعدة البيانات
  const firstTrack = visitors.reduce((m, v) => Math.min(m, v.f || Infinity), Infinity);
  const histPending = orders.filter((o) => o.kind !== "course" && o.status !== "paid" && !isStaff(o.uid) && (!everPaid.has(o.uid)))
      .map((o) => ({oid: o.id, uid: o.uid, name: (U[o.uid] || {}).name || "", phone: (U[o.uid] || {}).phone || "", role: (U[o.uid] || {}).role || "", plan: o.planName || o.plan, amount: o.amount, status: o.status, cancelled: !!o.cancelled, at: o.created, before: o.created < firstTrack}))
      .sort((a, b) => b.at - a.at).slice(0, 300);

  // الباقات
  const planAgg = {};
  const P = (id) => (planAgg[id] = planAgg[id] || {plan: id, shown: new Set(), shownN: 0, selected: new Set(), selectedN: 0, payClick: new Set(), orders: 0, paid: 0, revenue: 0});
  evs.forEach((e) => { const k = pkey(e.vid, e.uid);
    if (e.n === "plans_view" && Array.isArray(e.p && e.p.plans)) e.p.plans.forEach((id) => { const a = P(id); a.shown.add(k); a.shownN++; });
    if (e.n === "plan_select" && e.p && e.p.plan) { const a = P(e.p.plan); a.selected.add(k); a.selectedN++; }
    if (e.n === "pay_click" && e.p && e.p.plan) P(e.p.plan).payClick.add(k); });
  ordR.forEach((o) => { P(o.plan).orders++; }); paidR.forEach((o) => { const a = P(o.plan); a.paid++; a.revenue += o.amount; });
  const plans = Object.values(planAgg).map((a) => ({plan: a.plan, shown: a.shown.size, shownN: a.shownN, selected: a.selected.size, selectedN: a.selectedN, payClick: a.payClick.size, orders: a.orders, paid: a.paid, revenue: Math.round(a.revenue)}));
  const entry = {}; evs.filter((e) => e.n === "upgrade_click").forEach((e) => { const f = (e.p && e.p.from) || "?"; entry[f] = (entry[f] || 0) + 1; });

  // المواد المجانية
  const free = {};
  const FR = (s) => (free[s] = free[s] || {s, visitors: new Set(), regs: new Set(), opens: 0, dones: 0, per: {}});
  const lessonEvs = events.filter((e) => !e.kid && !isStaff(e.uid || vidUid[e.vid]) && /^lesson_/.test(e.n) && e.p && FREE.includes(e.p.s));
  lessonEvs.filter((e) => inR(e.t)).forEach((e) => { const a = FR(e.p.s); const k = pkey(e.vid, e.uid); const reg = !!(e.uid || vidUid[e.vid]);
    (reg ? a.regs : a.visitors).add(k);
    const q = a.per[k] = a.per[k] || {k, g: e.p.g, opened: new Set(), done: new Set(), sess: new Set(), last: "", lastT: 0, lastAt: 0, n: 0, firstT: e.t};
    if (e.n === "lesson_open") { a.opens++; q.opened.add(e.p.l); q.sess.add(e.sid); }
    if (e.n === "lesson_done") { a.dones++; q.done.add(e.p.l); }
    if (e.t >= q.lastT) { q.lastT = e.t; q.last = e.p.l; q.lastAt = e.n === "lesson_done" ? e.p.n : e.p.at || 1; q.n = e.p.n || 0; q.g = e.p.g || q.g; }
    q.firstT = Math.min(q.firstT, e.t); });
  const freeRep = Object.values(free).map((a) => { const per = Object.values(a.per);
    const toPlans = per.filter((q) => { const p = pinfo[q.k]; return p && (p.st.plans_view || 0) > q.firstT; }).length;
    const toPaid = per.filter((q) => { const uid = q.k.startsWith("u:") ? q.k.slice(2) : null; return uid && orders.some((o) => o.uid === uid && o.status === "paid" && (o.paid || o.created) > q.firstT); }).length;
    return {s: a.s, visitors: a.visitors.size, regs: a.regs.size, opens: a.opens, dones: a.dones, people: per.length, toPlans, toPaid,
      avgOpened: per.length ? Math.round(per.reduce((x, q) => x + q.opened.size, 0) * 10 / per.length) / 10 : 0,
      avgDone: per.length ? Math.round(per.reduce((x, q) => x + q.done.size, 0) * 10 / per.length) / 10 : 0,
      returns: per.filter((q) => q.sess.size > 1).length,
      rows: per.sort((x, y) => y.lastT - x.lastT).slice(0, 400).map((q) => { const p = pinfo[q.k]; const r = p ? rowOf(p) : {id: q.k.slice(2, 12), reg: q.k.startsWith("u:")};
        return {id: r.id, reg: r.reg, name: r.name || "", g: q.g, opened: q.opened.size, done: q.done.size, doneIds: [...q.done], sess: q.sess.size, last: q.last, lastAt: q.lastAt, n: q.n, lastT: q.lastT,
          toPlans: !!(p && (p.st.plans_view || 0) > q.firstT), sub: r.sub || false}; })}; });

  // العودة (أفواج حسب أول زيارة)
  const P2 = Object.entries(pdays).map(([k, ds]) => { const arr = [...ds].sort(); const p = pinfo[k]; const f = p && p.f !== Infinity ? tday(p.f) : arr[0]; return {k, f, arr, reg: k.startsWith("u:")}; });
  const dnum = (s) => Math.round(Date.parse(s + "T00:00:00Z") / DAY);
  const today = dnum(tday(Date.now()));
  const cohort = (list) => { const n = list.length; const ret = list.filter((x) => x.arr.some((d) => dnum(d) > dnum(x.f))).length;
    const el = (k) => list.filter((x) => today - dnum(x.f) >= k); const r = (k, exact) => { const e = el(k); const c = e.filter((x) => x.arr.some((d) => exact ? dnum(d) - dnum(x.f) === k : dnum(d) - dnum(x.f) >= k)).length; return {elig: e.length, n: c, pct: e.length ? Math.round(c * 1000 / e.length) / 10 : null}; };
    return {n, ret, retPct: n ? Math.round(ret * 1000 / n) / 10 : 0, d1: r(1, true), d7: r(7), d30: r(30)}; };
  const inCo = P2.filter((x) => { const t = Date.parse(x.f + "T00:00:00Z") - 2 * 36e5; return t >= from - DAY && t < to; });
  const weeks = [];
  for (let w = 0; w < 8; w++) { const end = today - w * 7, st = end - 6; const L = P2.filter((x) => { const d = dnum(x.f); return d >= st && d <= end; });
    weeks.push({from: new Date(st * DAY).toISOString().slice(0, 10), to: new Date(end * DAY).toISOString().slice(0, 10), all: cohort(L), reg: cohort(L.filter((x) => x.reg))}); }
  const visitsDist = {"1": 0, "2": 0, "3-5": 0, "6-10": 0, "11+": 0};
  P2.filter((x) => inCo.includes(x)).forEach((x) => { const n = x.arr.length; visitsDist[n === 1 ? "1" : n === 2 ? "2" : n <= 5 ? "3-5" : n <= 10 ? "6-10" : "11+"]++; });
  const regNoReturn = users.filter((u) => !isStaff(u.id) && inR(u.created)).filter((u) => { const ds = pdays["u:" + u.id]; return !ds || ds.size <= 1; })
      .map((u) => ({uid: u.id, name: u.name, role: u.role, phone: u.phone, created: u.created, lastSeen: ((pinfo["u:" + u.id] || {}).last) || 0})).slice(0, 400);
  const usedNoSub = Object.values(pinfo).filter((p) => p.k.startsWith("u:") && U[p.k.slice(2)] && p.days.size >= 2 && !everPaid.has(p.k.slice(2)) && p.last >= from)
      .sort((a, b) => b.days.size - a.days.size).slice(0, 400).map(rowOf);
  const retention = {all: cohort(inCo), reg: cohort(inCo.filter((x) => x.reg)), visitorsOnly: cohort(inCo.filter((x) => !x.reg)), weeks, visitsDist, regNoReturn, usedNoSub};

  // نتائج اختبارات الدروس والإقفال بعد الإتقان
  const scAgg = {}; const scRows = [];
  evs.filter((e) => e.n === "lesson_score" && e.p && e.p.l).forEach((e) => { const k = pkey(e.vid, e.uid);
    const a = scAgg[e.p.l] = scAgg[e.p.l] || {l: e.p.l, g: e.p.g || "", s: e.p.s || "", attempts: 0, persons: new Set(), sum: 0, best: {}, locked: new Set(), paid: new Set()};
    a.attempts++; a.persons.add(k); a.sum += Number(e.p.sc) || 0; a.best[k] = Math.max(a.best[k] || 0, Number(e.p.sc) || 0); if (e.p.lock) a.locked.add(k); if (e.p.paid) a.paid.add(k);
    const p = pinfo[k]; const r = p ? rowOf(p) : {id: k.slice(2, 12), reg: k.startsWith("u:")};
    scRows.push({t: e.t, id: r.id, reg: r.reg, name: r.name || "", role: r.role || "", l: e.p.l, g: e.p.g || "", s: e.p.s || "", sc: Number(e.p.sc) || 0, lock: !!e.p.lock, paid: !!e.p.paid}); });
  const scores = {lessons: Object.values(scAgg).map((a) => { const b = Object.values(a.best); return {l: a.l, g: a.g, s: a.s, attempts: a.attempts, persons: a.persons.size,
    avg: a.attempts ? Math.round(a.sum / a.attempts) : 0, avgBest: b.length ? Math.round(b.reduce((x, y) => x + y, 0) / b.length) : 0, over80: b.filter((x) => x >= 80).length, locked: a.locked.size, paid: a.paid.size}; })
      .sort((a, b) => b.persons - a.persons), rows: scRows.sort((a, b) => b.t - a.t).slice(0, 600),
    lockedPersons: new Set(evs.filter((e) => e.n === "lesson_score" && e.p && e.p.lock).map((e) => pkey(e.vid, e.uid))).size,
    lockViews: S("mastered_view"), lockCta: evs.filter((e) => e.n === "cta_click" && e.p && e.p.from === "mastered").length};
  return {scores, from, to, gen: Date.now(), firstTrack: firstTrack === Infinity ? 0 : firstTrack, overview, daily: dailyRows, funnel, pages: top(pages, 20), pagesX: top(pagesX, 40),
    sources, campaigns, regSteps, regMethods: Object.fromEntries(Object.entries(methods).map(([k, s]) => [k, s.size])), regErrors: top(regErrors, 30),
    people: peopleRows, peopleTotal: people.length, stalledReg, stalledSub, histPending, plans, entry: top(entry, 20), free: freeRep, retention, events: cnt};
}
module.exports.computeReport = computeReport;
module.exports.tday = tday;
