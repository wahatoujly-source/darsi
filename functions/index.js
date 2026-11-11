// ===================== المجتهد — دوال الخادم =====================
// الاشتراكات: تأكيد الهاتف برسالة (resala) قبل الدفع، إنشاء الطلب، الدفع عبر ماي باي، تفعيل الاشتراك.
const {setGlobalOptions} = require("firebase-functions");
const {onCall, onRequest, HttpsError} = require("firebase-functions/https");
const {onSchedule} = require("firebase-functions/scheduler");
const {defineString, defineSecret} = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const crypto = require("node:crypto");

admin.initializeApp();
const db = admin.firestore();
const {FieldValue, Timestamp} = admin.firestore;
setGlobalOptions({maxInstances: 10, region: "europe-west1", invoker: "public"});

// ---------- الإعدادات ----------
// وضع الرسائل: "false" = إرسال حقيقي عبر resala (الافتراضي الآن) | "test" | "true" = بلا رسائل
// لإيقاف الرسائل مؤقتاً أضف السطر OTP_SEND_MODE=true في ملف .env ثم أعد الرفع
const OTP_MODE = defineString("OTP_SEND_MODE", {default: "false"});
const TEST_PHONES = defineString("TEST_PHONES", {default: ""});
const SITE_URL = defineString("SITE_URL", {default: "https://wahatoujly-source.github.io/darsi/"});
const P = {
  student_subject: defineString("PRICE_STUDENT_SUBJECT", {default: "0"}),
  student_grade: defineString("PRICE_STUDENT_GRADE", {default: "0"}),
  parent_grade: defineString("PRICE_PARENT_GRADE", {default: "0"}),
  parent_all: defineString("PRICE_PARENT_ALL", {default: "0"}),
  teacher: defineString("PRICE_TEACHER_ITEM", {default: "0"}),
};
// ---------- الأسرار (Secret Manager) ----------
const RESALA_KEY = defineSecret("RESALA_API_KEY");
const MYPAY_ID = defineSecret("MYPAY_CLIENT_ID");
const MYPAY_SECRET = defineSecret("MYPAY_CLIENT_SECRET");
const MYPAY_WEBHOOK = defineSecret("MYPAY_WEBHOOK_SECRET");
const MYPAY_BASE = "https://mypay.ly/pay/api/v1";
// يوتيوب: المعلم يرفع الفيديو من داخل المنصة مباشرة إلى قناة المنصة (غير مدرج)
const YT_ID = defineSecret("YT_CLIENT_ID");
const YT_SECRET = defineSecret("YT_CLIENT_SECRET");
const YT_REFRESH = defineSecret("YT_REFRESH_TOKEN");
const YT_REDIRECT = "https://europe-west1-mujtahid-810d7.cloudfunctions.net/ytAuth";

const SERVICE_NAME = "المجتهد";
const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;
const PHONE_RE = /^09[1-5]\d{7}$/;
const GLOBAL_DAILY_CAP = 100;
const TEST_CODE = "0000";
const GRADES = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "s1", "s2sci"];
const SUBJECTS = ["ar", "en", "math", "comp", "art", "sci", "soc", "hist", "geo", "phy", "chem", "bio", "it", "socio", "stat"]; // التربية الإسلامية والوطنية مجانيتان
const r2 = (x) => Math.round(x * 100) / 100;
const sha = (s) => crypto.createHash("sha256").update(s).digest("hex");
const toE164 = (local) => "+218" + local.slice(1);

function needUser(req) {
  const uid = req.auth && req.auth.uid;
  if (!uid) throw new HttpsError("unauthenticated", "سجّل الدخول أولاً");
  return uid;
}
// أرقام التجربة: رمزها الثابت 0000 بلا رسالة ولا تكلفة (أضف غيرها في TEST_PHONES داخل ملف .env)
const OWNER_TEST_PHONES = ["0913253372"];
const isTestPhone = (local) => OWNER_TEST_PHONES.includes(local) ||
  TEST_PHONES.value().split(",").map((s) => s.trim()).filter(Boolean).includes(local);

// نهاية العام الدراسي: 31 أغسطس (بتوقيت ليبيا)
function seasonEnd(now = new Date()) {
  const y = now.getUTCMonth() >= 8 ? now.getUTCFullYear() + 1 : now.getUTCFullYear(); // سبتمبر فما بعد → السنة القادمة
  return Timestamp.fromDate(new Date(Date.UTC(y, 7, 31, 21, 59, 59))); // 31/8 الساعة 23:59 بتوقيت طرابلس
}

// ===================== حدود الرسائل =====================
async function takeSlot(ref, limit, message, windowMs = DAY) {
  const now = Date.now();
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const sends = ((snap.exists && snap.data().sends) || []).filter((t) => t > now - windowMs);
    if (sends.length >= limit) throw new HttpsError("resource-exhausted", message);
    sends.push(now);
    tx.set(ref, {sends}, {merge: true});
  });
}
// إرجاع المحاولة إذا فشل الإرسال من جهة الخدمة (حتى لا يُحرم المستخدم بسبب عطل عندنا)
async function refundSlot(ref) {
  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const sends = (snap.exists && snap.data().sends) || [];
      if (sends.length) { sends.pop(); tx.set(ref, {sends}, {merge: true}); }
    });
  } catch (e) { logger.warn("refund failed", e.message); }
}
async function takeGlobal() {
  const ref = db.collection("otpGlobal").doc(new Date().toISOString().slice(0, 10));
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const n = (snap.exists && snap.data().count) || 0;
    if (n >= GLOBAL_DAILY_CAP) {
      logger.error("OTP global daily cap reached");
      throw new HttpsError("resource-exhausted", "الخدمة مشغولة حالياً، حاول لاحقاً");
    }
    tx.set(ref, {count: n + 1});
  });
}
async function requestPin(local, live) {
  const params = new URLSearchParams({service_name: SERVICE_NAME, len: "4", lang: "ar"});
  if (!live) params.set("test", "test");
  let res;
  try {
    res = await fetch("https://dev.resala.ly/api/v1/pins?" + params, {
      method: "POST",
      headers: {"Authorization": "Bearer " + RESALA_KEY.value(), "Content-Type": "application/json"},
      body: JSON.stringify({phone: local.slice(1)}),
      signal: AbortSignal.timeout(15000),
    });
  } catch (e) {
    logger.error("resala network error", {message: String(e && e.message)});
    throw new HttpsError("unavailable", "تعذّر الاتصال بخدمة الرسائل، حاول لاحقاً");
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    logger.error("resala error", {status: res.status, type: body && body.type, request_id: body && body.request_id});
    if (body && body.type === "InputValidation") throw new HttpsError("invalid-argument", "رقم الهاتف غير صالح");
    throw new HttpsError("unavailable", "خدمة الرسائل غير متاحة حالياً، حاول لاحقاً");
  }
  return body;
}

// ===================== تأكيد رقم الهاتف (مرة واحدة، قبل أول دفع) =====================
exports.sendOtp = onCall({secrets: [RESALA_KEY]}, async (req) => {
  const uid = needUser(req);
  const phone = String((req.data && req.data.phone) || "").trim();
  const deviceId = String((req.data && req.data.deviceId) || "");
  if (!PHONE_RE.test(phone)) throw new HttpsError("invalid-argument", "اكتب رقماً ليبياً صحيحاً يبدأ بـ 091 إلى 095");
  if (deviceId.length < 8) throw new HttpsError("invalid-argument", "الجهاز غير معروف");
  const e164 = toE164(phone);

  const owner = await db.collection("phoneOwners").doc(e164).get();
  if (owner.exists && owner.data().uid !== uid) throw new HttpsError("already-exists", "هذا الرقم مؤكَّد في حساب آخر");

  const ref = db.collection("otpRequests").doc(uid);
  if (isTestPhone(phone)) {
    const s0 = crypto.randomBytes(8).toString("hex");
    await ref.set({phone: e164, salt: s0, hash: sha(s0 + TEST_CODE), expiresAt: Date.now() + 30 * 60 * 1000, wrongTries: 0}, {merge: true});
    return {ok: true, test: true};
  }
  const mode = OTP_MODE.value();
  if (!["true", "test", "false"].includes(mode)) throw new HttpsError("failed-precondition", "الخدمة غير جاهزة");

  const slots = [db.collection("otpPhones").doc(e164), db.collection("otpUsers").doc(uid), db.collection("otpDevices").doc(sha(deviceId))];
  await takeSlot(slots[0], 3, "تجاوزت الحدّ المسموح (3 رسائل كل 24 ساعة). حاول لاحقاً");
  await takeSlot(slots[1], 5, "تجاوز حسابك الحدّ المسموح من الرسائل. حاول لاحقاً");
  await takeSlot(slots[2], 5, "تجاوز هذا الجهاز الحدّ المسموح. حاول لاحقاً");
  const fwd = String((req.rawRequest && req.rawRequest.headers["x-forwarded-for"]) || "");
  const ip = fwd.split(",")[0].trim() || (req.rawRequest && req.rawRequest.ip) || "unknown";
  await takeSlot(db.collection("otpIps").doc(sha(ip)), 30, "طلبات كثيرة من هذا الاتصال. حاول لاحقاً", HOUR);
  await takeGlobal();

  let code;
  if (mode === "true") {
    code = String(crypto.randomInt(0, 10000)).padStart(4, "0");
    logger.info("OTP LOCAL", {phone: e164, code});
  } else {
    let r;
    try { r = await requestPin(phone, mode === "false"); } catch (e) { await Promise.all(slots.map(refundSlot)); throw e; }
    code = String(r.pin || "");
    if (!/^\d{4}$/.test(code)) throw new HttpsError("internal", "تعذّر إنشاء الرمز، حاول لاحقاً");
    if (mode === "test") logger.info("OTP TEST", {phone: e164, pin: code});
  }
  const salt = crypto.randomBytes(8).toString("hex");
  await ref.set({phone: e164, salt, hash: sha(salt + code), expiresAt: Date.now() + 5 * 60 * 1000, wrongTries: 0}, {merge: true});
  return {ok: true};
});

exports.verifyOtp = onCall(async (req) => {
  const uid = needUser(req);
  const code = String((req.data && req.data.code) || "");
  if (!/^\d{4}$/.test(code)) throw new HttpsError("invalid-argument", "الرمز من 4 أرقام");
  const ref = db.collection("otpRequests").doc(uid);
  return await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const d = snap.exists ? snap.data() : null;
    if (!d || !d.hash || Date.now() > d.expiresAt) throw new HttpsError("failed-precondition", "انتهت صلاحية الرمز، اطلب رمزاً جديداً");
    if ((d.wrongTries || 0) >= 3) throw new HttpsError("resource-exhausted", "تجاوزت عدد المحاولات، اطلب رمزاً جديداً");
    const a = Buffer.from(sha(d.salt + code));
    const b = Buffer.from(d.hash);
    if (!(a.length === b.length && crypto.timingSafeEqual(a, b))) {
      const tries = (d.wrongTries || 0) + 1;
      tx.update(ref, {wrongTries: tries});
      return {ok: false, left: 3 - tries};
    }
    const ownerRef = db.collection("phoneOwners").doc(d.phone);
    const owner = await tx.get(ownerRef);
    if (owner.exists && owner.data().uid !== uid) throw new HttpsError("already-exists", "هذا الرقم مؤكَّد في حساب آخر");
    tx.set(ownerRef, {uid, at: FieldValue.serverTimestamp()});
    tx.set(db.collection("users").doc(uid), {phone: d.phone, phoneVerified: true}, {merge: true});
    tx.update(ref, {hash: null, salt: null, verifiedAt: Date.now()});
    return {ok: true, phone: d.phone};
  });
});

// ===================== الباقات والأسعار =====================
// الأسعار تُعدَّل من لوحة الإدارة (config/prices)، وإن لم تُحدَّد تُقرأ من ملف .env
const KINDS_ON_SALE = ["student_subject", "student_grade", "parent_grade", "parent_all"];
async function getPrices() {
  const snap = await db.collection("config").doc("prices").get();
  const fsP = snap.exists ? snap.data() : {};
  const out = {};
  for (const k of KINDS_ON_SALE) {
    const v = Number(fsP[k] != null ? fsP[k] : (P[k] ? P[k].value() : NaN));
    out[k] = isFinite(v) && v > 0 ? r2(v) : 0;
  }
  return out;
}
// ===================== الباقات المرنة (config/plans) =====================
// كل باقة: نوع أساسي (مادة/صف للطالب، صف/كل الصفوف لولي الأمر) + سعر + مدة (حتى 31 أغسطس، أو عدد أيام من الاشتراك، أو حتى تاريخ محدد)
// + حد للأبناء (مثلاً باقة «ابنان فقط»). تُدار بالكامل من لوحة الإدارة.
const BASES = ["student_subject", "student_grade", "parent_grade", "parent_all"];
const PARENT_BASES = ["parent_grade", "parent_all"];
function defaultPlans(pr) {
  const P0 = (id, base, name, desc, extra = {}) => ({id, on: true, base, name, desc, price: pr[base] || 0, dur: {t: "season"}, kids: PARENT_BASES.includes(base) ? 5 : 0, ...extra});
  return [
    P0("student_subject", "student_subject", "مادة واحدة", "مادة واحدة في صف واحد"),
    P0("student_grade", "student_grade", "الصف كاملاً", "كل مواد صف واحد"),
    P0("parent_grade", "parent_grade", "العائلة — صف واحد", "كل مواد صف واحد لأبنائك (حتى 5)"),
    P0("parent_all", "parent_all", "العائلة — كل الصفوف", "كل الصفوف والمواد لأبنائك (حتى 5)"),
    P0("parent2_grade", "parent_grade", "ابنان — صف واحد", "كل مواد صف واحد لابنين فقط", {on: false, price: 0, kids: 2}),
    P0("parent2_all", "parent_all", "ابنان — كل الصفوف", "كل الصفوف والمواد لابنين فقط", {on: false, price: 0, kids: 2}),
    P0("student_grade_m1", "student_grade", "الصف كاملاً — شهر", "كل مواد صف واحد لمدة شهر", {on: false, price: 0, dur: {t: "days", days: 30}}),
    P0("parent_all_m1", "parent_all", "العائلة — شهر", "كل الصفوف لأبنائك لمدة شهر", {on: false, price: 0, dur: {t: "days", days: 30}}),
  ];
}
async function getPlansCfg() {
  const snap = await db.collection("config").doc("plans").get();
  if (snap.exists && Array.isArray(snap.data().list) && snap.data().list.length) return snap.data().list;
  return defaultPlans(await getPrices());
}
const tripEnd = (y, m, d) => Timestamp.fromDate(new Date(Date.UTC(y, m, d, 21, 59, 59))); // 23:59 بتوقيت طرابلس
function planEnd(p, from = Date.now()) {
  const dur = p.dur || {t: "season"};
  if (dur.t === "days") { const x = new Date(from + Number(dur.days) * DAY + 2 * HOUR); return tripEnd(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate()); }
  if (dur.t === "until") { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dur.until || ""); if (m) return tripEnd(+m[1], +m[2] - 1, +m[3]); }
  return seasonEnd();
}
const planLive = (p) => p.on && p.price > 0 && planEnd(p).toMillis() > Date.now();
exports.getPlans = onCall(async () => {
  const list = await getPlansCfg();
  const plans = list.filter(planLive).map((p) => ({id: p.id, base: p.base, name: p.name, desc: p.desc || "", price: p.price,
    dur: p.dur || {t: "season"}, kids: p.kids || 0, end: planEnd(p).toMillis()}));
  const prices = {}; plans.forEach((p) => { if (prices[p.base] == null && (p.dur || {}).t === "season") prices[p.base] = p.price; });
  return {plans, prices, end: seasonEnd().toMillis()};
});
exports.adminSetPlans = onCall(async (req) => {
  await needAdmin(req, "plans");
  const src = Array.isArray(req.data && req.data.list) ? req.data.list.slice(0, 24) : [];
  const list = [], ids = new Set();
  for (const x of src) {
    const id = String(x.id || "").trim();
    if (!/^[a-z0-9_]{3,24}$/.test(id) || ids.has(id)) throw new HttpsError("invalid-argument", "معرّف الباقة غير صحيح أو مكرر: " + id);
    ids.add(id);
    if (!BASES.includes(x.base)) throw new HttpsError("invalid-argument", "نوع الباقة غير صحيح");
    const name = String(x.name || "").trim().slice(0, 40); if (name.length < 2) throw new HttpsError("invalid-argument", "اكتب اسم الباقة");
    const price = Number(x.price); if (!isFinite(price) || price < 0 || price > 5000) throw new HttpsError("invalid-argument", "سعر غير صحيح: " + name);
    const d = x.dur || {}; let dur = {t: "season"};
    if (d.t === "days") { const n = Math.round(Number(d.days)); if (!(n >= 1 && n <= 400)) throw new HttpsError("invalid-argument", "عدد الأيام غير صحيح: " + name); dur = {t: "days", days: n}; }
    if (d.t === "until") { if (!/^\d{4}-\d{2}-\d{2}$/.test(d.until || "")) throw new HttpsError("invalid-argument", "تاريخ النهاية غير صحيح: " + name); dur = {t: "until", until: d.until}; }
    const kids = PARENT_BASES.includes(x.base) ? Math.min(5, Math.max(1, Math.round(Number(x.kids) || 5))) : 0;
    list.push({id, on: !!x.on, base: x.base, name, desc: String(x.desc || "").trim().slice(0, 120), price: r2(price), dur, kids});
  }
  await db.collection("config").doc("plans").set({list, updatedAt: FieldValue.serverTimestamp()});
  return {list};
});
exports.adminGetPlans = onCall(async (req) => { await needAdmin(req, "plans"); return {list: await getPlansCfg()}; });

// يحدّد نطاق الاشتراك ويحسب سعره في الخادم فقط
function buildScope(kind, role, d, kidsCount) {
  const grade = String(d.grade || "");
  const subject = String(d.subject || "");
  if (kind === "student_subject") {
    if (!["student", "teacher"].includes(role)) throw new HttpsError("permission-denied", "هذه الباقة للطالب أو المعلم");
    if (!GRADES.includes(grade) || !SUBJECTS.includes(subject)) throw new HttpsError("invalid-argument", "اختر الصف والمادة");
    return {scope: {grades: [grade], subjects: [subject], self: true}, qty: 1};
  }
  if (kind === "student_grade") {
    if (!["student", "teacher"].includes(role)) throw new HttpsError("permission-denied", "هذه الباقة للطالب أو المعلم");
    if (!GRADES.includes(grade)) throw new HttpsError("invalid-argument", "اختر الصف");
    return {scope: {grades: [grade], subjects: ["*"], self: true}, qty: 1};
  }
  if (kind === "parent_grade" || kind === "parent_all") {
    if (!["parent", "teacher"].includes(role)) throw new HttpsError("permission-denied", "هذه الباقة لولي الأمر");
    if (kind === "parent_grade") {
      if (!GRADES.includes(grade)) throw new HttpsError("invalid-argument", "اختر الصف");
      return {scope: {grades: [grade], subjects: ["*"], kids: true}, qty: 1};
    }
    return {scope: {grades: ["*"], subjects: ["*"], kids: true}, qty: 1};
  }
  if (kind === "teacher") {
    if (role !== "teacher") throw new HttpsError("permission-denied", "هذه الباقة للمعلم");
    const items = Array.isArray(d.items) ? d.items.slice(0, 30) : [];
    const pairs = [];
    for (const it of items) {
      const g = String(it && it.grade || ""), s = String(it && it.subject || "");
      if (!GRADES.includes(g) || !SUBJECTS.includes(s)) throw new HttpsError("invalid-argument", "اختيار غير صحيح");
      const k = g + ":" + s;
      if (!pairs.includes(k)) pairs.push(k);
    }
    if (!pairs.length) throw new HttpsError("invalid-argument", "اختر مادة واحدة على الأقل");
    return {scope: {pairs, teacherOnly: true}, qty: pairs.length};
  }
  throw new HttpsError("invalid-argument", "باقة غير معروفة");
}

// ===================== إنشاء طلب دفع =====================
exports.createOrder = onCall({secrets: [MYPAY_ID, MYPAY_SECRET], memory: "256MiB"}, async (req) => {
  const uid = needUser(req);
  const d = req.data || {};
  const kind = String(d.kind || "");
  const us = await db.collection("users").doc(uid).get();
  if (!us.exists) throw new HttpsError("failed-precondition", "أكمل بيانات حسابك أولاً");
  const u = us.data();
  // الدفع مباشرة بدون رسالة تأكيد الهاتف وبدون إضافة الأبناء مسبقاً (تبسيط للمبتدئين)
  const kidIds = (await db.collection("users").doc(uid).collection("profiles").get()).docs.filter((x) => x.id !== "me").map((x) => x.id);
  const plan = (await getPlansCfg()).find((p) => p.id === String(d.plan || kind));
  if (!plan || !planLive(plan)) throw new HttpsError("failed-precondition", "هذه الباقة غير متاحة حالياً");
  const {scope, qty} = buildScope(plan.base, u.role, d, kidIds.length);
  if (PARENT_BASES.includes(plan.base) && plan.kids && plan.kids < 5) {
    if (kidIds.length > plan.kids) throw new HttpsError("failed-precondition", `هذه الباقة ${plan.kids === 2 ? "لابنين" : "لـ" + plan.kids + " أبناء"} فقط، وعندك ${kidIds.length}. اختر باقة العائلة.`);
    if (kidIds.length) scope.kidIds = kidIds; else scope.maxKids = plan.kids; // بدون أبناء بعد: أول N أبناء يضيفهم
  }
  const unit = plan.price;
  const amount = r2(unit * qty);
  // الباقات بالأيام: إذا كان عنده اشتراك فعّال من نفس الباقة ونفس الصف/المادة تُضاف المدة بعد نهايته
  let from = Date.now();
  const active = (await db.collection("subscriptions").where("uid", "==", uid).get()).docs.map((x) => x.data())
      .filter((x) => x.active !== false && x.end && x.end.toMillis() > from);
  const isDays = (plan.dur || {}).t === "days";
  if (isDays) {
    active.filter((x) => x.plan === plan.id && JSON.stringify((x.scope || {}).grades) === JSON.stringify(scope.grades) && JSON.stringify((x.scope || {}).subjects) === JSON.stringify(scope.subjects))
        .forEach((x) => { from = Math.max(from, x.end.toMillis()); });
  }
  // منع الشراء المكرر: اشتراك فعّال يشمل نفس الصفوف والمواد ونفس المستفيدين، ويستمر حتى نهاية الباقة الجديدة أو بعدها
  const newEnd = planEnd(plan, from).toMillis();
  const covering = active.find((x) => {
    if (isDays && x.plan === plan.id) return false; // تجديد نفس الباقة الشهرية مسموح (تُضاف المدة)
    if (x.kind === "trial") return false;
    const sc = x.scope || {};
    if (sc.teacherOnly) return false;
    const who = sc.any || (scope.kids ? (sc.kids && (!sc.kidIds || kidIds.every((k) => sc.kidIds.includes(k)))) : (sc.self || (!sc.kids && u.role === "student")));
    const inc = (have, want) => (have || []).includes("*") || (want || []).every((v) => (have || []).includes(v));
    return who && inc(sc.grades, scope.grades) && (sc.any || inc(sc.subjects, scope.subjects)) && x.end.toMillis() >= newEnd - DAY;
  });
  if (covering) {
    const dt = new Date(covering.end.toMillis()).toLocaleDateString("ar-LY-u-nu-latn", {timeZone: "Africa/Tripoli", day: "numeric", month: "long", year: "numeric"});
    throw new HttpsError("already-exists", `أنت مشترك بالفعل${covering.planName ? " في «" + covering.planName + "»" : ""} حتى ${dt}، وهو يشمل ما اخترته. لا حاجة لاشتراك جديد.`);
  }

  const recent = await db.collection("orders").where("uid", "==", uid).where("status", "==", "pending").get();
  const fresh = recent.docs.filter((x) => (x.data().createdAt && x.data().createdAt.toMillis() > Date.now() - HOUR));
  if (fresh.length >= 5) throw new HttpsError("resource-exhausted", "طلبات كثيرة، حاول بعد قليل");

  const oRef = db.collection("orders").doc(); // رقم من 20 حرفاً ورقماً — يُرسل في custom
  await oRef.set({uid, kind: plan.base, plan: plan.id, planName: plan.name, scope, qty, unit, amount, currency: "LYD", status: "pending",
    end: planEnd(plan, from), createdAt: FieldValue.serverTimestamp()});
  const back = "https://mujtahid.ly/#paid-" + oRef.id; // النطاق الرسمي
  const url = await mypayCreate(oRef, amount, back);
  return {ok: true, url, orderId: oRef.id, amount};
});

// إنشاء رابط دفع في ماي باي لطلب محفوظ (يُستعمل للاشتراكات ودورات المعلمين)
async function mypayCreate(oRef, amount, back) {
  try {
    const tr = await fetch(`${MYPAY_BASE}/authentication/token`, {
      method: "POST", headers: {"Content-Type": "application/json"},
      body: JSON.stringify({client_id: MYPAY_ID.value(), secret_id: MYPAY_SECRET.value()}),
    });
    const tj = await tr.json();
    const access = tj && tj.data && tj.data.access_token;
    if (!tr.ok || !access) {
      logger.error("mypay token error", tr.status, JSON.stringify(tj)); throw new Error("token");
    }
    const cr = await fetch(`${MYPAY_BASE}/payment/create`, {
      method: "POST", headers: {"Content-Type": "application/json", "Authorization": `Bearer ${access}`},
      body: JSON.stringify({amount: amount.toFixed(2), currency: "LYD", return_url: back, cancel_url: /#paid-[A-Za-z0-9]+$/.test(back) ? back + "-x" : back, custom: oRef.id}),
    });
    const cj = await cr.json();
    const url = cj && cj.data && cj.data.payment_url;
    if (!cr.ok || !url) {
      logger.error("mypay create error", cr.status, JSON.stringify(cj)); throw new Error("create");
    }
    await oRef.update({mypayToken: (cj.data && cj.data.token) || null, paymentUrl: url});
    return url;
  } catch (e) {
    await oRef.update({status: "failed", gwEvent: "create_error"});
    AXM.addAlert({id: "payerr_" + oRef.id, type: "payfail", lvl: "warn", title: "تعذّر إنشاء طلب دفع", body: `خطأ من بوابة الدفع عند إنشاء طلب بقيمة ${amount} د.ل. راجع سجلات الدالة createOrder.`}, true).catch(() => {});
    throw new HttpsError("internal", "تعذّر إنشاء طلب الدفع، حاول لاحقاً");
  }
}

// ===================== إشعار ماي باي بعد الدفع =====================
function sigOk(raw, header, secret) {
  if (!raw || !header) return false;
  const h = String(header).trim().replace(/^sha256=/i, "");
  const hex = crypto.createHmac("sha256", secret).update(raw).digest("hex");
  const b64 = crypto.createHmac("sha256", secret).update(raw).digest("base64");
  const eq = (a, b) => {
    const x = Buffer.from(a), y = Buffer.from(b);
    return x.length === y.length && crypto.timingSafeEqual(x, y);
  };
  return eq(h.toLowerCase(), hex) || eq(h, b64);
}

exports.mypayWebhook = onRequest({secrets: [MYPAY_WEBHOOK], memory: "256MiB", cors: false}, async (req, res) => {
  if (req.method !== "POST") return res.status(405).send("method");
  const raw = req.rawBody;
  if (!sigOk(raw, req.get("X-MyPay-Signature"), MYPAY_WEBHOOK.value())) {
    logger.warn("mypayWebhook: bad signature"); return res.status(401).send("bad signature");
  }
  let b;
  try { b = JSON.parse(raw.toString("utf8")); } catch (e) { return res.status(400).send("bad json"); }
  const orderId = String(b.custom || "");
  if (b.event !== "payment.success" || b.status !== "success") {
    // فشل أو إلغاء من بوابة الدفع: نسجّله فقط (للتحليلات والتنبيهات) دون أي تغيير على اشتراك قائم
    if (/^[A-Za-z0-9]{10,40}$/.test(orderId)) {
      try { const oRef = db.collection("orders").doc(orderId); let o = null;
        await db.runTransaction(async (tx) => { const os = await tx.get(oRef); if (!os.exists || os.data().status !== "pending") return; o = os.data();
          tx.update(oRef, {status: "failed", failedAt: FieldValue.serverTimestamp(), gwEvent: String(b.event || "").slice(0, 40), gwStatus: String(b.status || "").slice(0, 40)}); });
        if (o && o.kind !== "course") await AXM.addAlert({id: "payfail_" + orderId, type: "payfail", lvl: "warn", title: "فشل عملية دفع", body: `${o.planName || o.plan || "باقة"} — ${o.amount} د.ل (${String(b.event || b.status || "").slice(0, 40)})`, uid: o.uid}, true);
      } catch (e) { logger.warn("mypayWebhook fail-record", e.message); }
    }
    return res.status(200).send("ignored");
  }
  if (!/^[A-Za-z0-9]{10,40}$/.test(orderId)) return res.status(200).send("ignored");

  const oRef = db.collection("orders").doc(orderId);
  try {
    const result = await db.runTransaction(async (tx) => {
      const os = await tx.get(oRef);
      if (!os.exists) return "unknown";
      const o = os.data();
      if (o.status === "paid") return "duplicate";
      if (String(b.currency || "").toUpperCase() !== "LYD") return "currency";
      const paid = Number(b.amount);
      if (!isFinite(paid) || Math.abs(paid - Number(o.amount)) > 0.001) return "amount-mismatch";
      tx.update(oRef, {status: "paid", paidAt: FieldValue.serverTimestamp(),
        mypayTransactionId: b.transaction_id || null, gateway: b.gateway || null});
      if (o.kind === "course") { courseSaleTx(tx, o, orderId); return "ok"; }
      tx.set(db.collection("subscriptions").doc(orderId), {
        uid: o.uid, kind: o.kind, plan: o.plan || o.kind, planName: o.planName || null, scope: o.scope, amount: o.amount, orderId,
        start: FieldValue.serverTimestamp(), end: o.end, active: true,
      });
      return "ok";
    });
    logger.info(`mypayWebhook: ${orderId} -> ${result}`);
    if (result === "ok") { const o = (await oRef.get()).data() || {};
      if (o.kind === "course") { await pushUser(o.uid, {title: "✅ تم الاشتراك في الدورة", body: o.title || "", link: "#crs-" + o.cid}, {rule: "events"});
        await pushUser(o.tid, {title: "🎉 مشترك جديد في دورتك", body: (o.title || "") + " — أُضيف نصيبك إلى محفظتك.", link: "#studio"}, {rule: "events"}); }
      else { await refPaid(o.uid).catch((e) => logger.warn("refPaid", e.message));
        await AXM.addAlert({id: "sub_" + orderId, type: "sub", lvl: "good", title: "🎉 اشتراك جديد", body: `${o.planName || o.plan || "باقة"} — ${o.amount} د.ل`, uid: o.uid}, true).catch(() => {});
        await pushUser(o.uid, {title: "✅ تم تفعيل اشتراكك", body: (o.planName || "اشتراك المجتهد") + " — كل الدروس المشمولة مفتوحة الآن.", link: "#home"}, {rule: "events"}); } }
    return res.status(200).send(result);
  } catch (e) {
    logger.error("mypayWebhook error", e);
    return res.status(503).send("retry");
  }
});

// ===================== الدروس المدفوعة: تُسلَّم للمشترك فقط =====================
// الدروس محفوظة داخل الدالة نفسها (lessons/g*.json.gz) ولا تُنشر في الموقع العام.
const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");
const LESSON_INDEX = JSON.parse(fs.readFileSync(path.join(__dirname, "lessons", "index.json"), "utf8"));
const _bundles = {};
function lessonFrom(g, id) {
  if (!_bundles[g]) {
    const buf = fs.readFileSync(path.join(__dirname, "lessons", `g${g}.json.gz`));
    _bundles[g] = JSON.parse(zlib.gunzipSync(buf).toString("utf8"));
  }
  return _bundles[g][id] || null;
}
const DAILY_LESSONS = 400;

// ===================== فتح وإغلاق المحتوى من لوحة الإدارة =====================
// config/access: {maint:{on,msg}, openAll:bool, closed:[keys], subsOnly:[keys], extraFree:[keys]}
// key = "g7" (صف) أو "g7-math" (مادة في صف) أو "l-<lessonId>" (درس)
let ACCESS = null, ACCESS_AT = 0;
async function getAccessCfg() {
  if (ACCESS && Date.now() - ACCESS_AT < 60000) return ACCESS;
  const d = await db.collection("config").doc("access").get();
  ACCESS = d.exists ? d.data() : {}; ACCESS_AT = Date.now(); return ACCESS;
}
const accKeys = (g, s, id) => ["g" + g, "g" + g + "-" + s, "l-" + id];
const accHas = (list, g, s, id) => (list || []).some((k) => accKeys(g, s, id).includes(k));
const ACCESS_KEY = /^(g(?:\d{1,2}|s\d(?:sci|lit)?)|g(?:\d{1,2}|s\d(?:sci|lit)?)-[a-z]{2,8}|l-[a-z0-9-]{3,60})$/;
exports.adminSetAccess = onCall(async (req) => {
  await needAdmin(req, "access");
  const d = req.data || {};
  if (d.op === "master") { // قفل الدرس بعد الإتقان: تشغيل/إيقاف + النسبة (افتراضياً 80%)
    const pct = Math.max(50, Math.min(100, Math.round(Number(d.pct) || 80)));
    await db.collection("config").doc("access").set({master: {on: !!d.on, pct, order: d.order !== false}}, {merge: true}); ACCESS = null; return {ok: true, pct};
  }
  const list = (x) => [...new Set((Array.isArray(x) ? x : []).map(String).filter((k) => ACCESS_KEY.test(k)))].slice(0, 500);
  const out = {
    maint: {on: !!(d.maint && d.maint.on), msg: String((d.maint && d.maint.msg) || "").slice(0, 200)},
    openAll: !!d.openAll, closed: list(d.closed), subsOnly: list(d.subsOnly), extraFree: list(d.extraFree),
    updatedAt: FieldValue.serverTimestamp(),
  };
  await db.collection("config").doc("access").set(out, {merge: true});
  ACCESS = null;
  return {ok: true};
});

// textbooks visibility: {all|gN|gN-subj: "all"|"subs"|"off"}
const BOOK_KEY = /^(all|g(?:\d{1,2}|s\d(?:sci|lit)?)|g(?:\d{1,2}|s\d(?:sci|lit)?)-[a-z]{2,8})$/;
exports.adminSetBooks = onCall(async (req) => {
  await needAdmin(req, "access");
  const src = (req.data && req.data.books) || {};
  const books = {};
  for (const [k, v] of Object.entries(src).slice(0, 300)) if (BOOK_KEY.test(k) && ["all", "subs", "off"].includes(v)) books[k] = v;
  await db.collection("config").doc("access").update({books, updatedAt: FieldValue.serverTimestamp()}).catch(() =>
    db.collection("config").doc("access").set({books, updatedAt: FieldValue.serverTimestamp()}, {merge: true}));
  ACCESS = null;
  return {ok: true};
});

exports.getLesson = onCall({memory: "512MiB"}, async (req) => {
  let uid = needUser(req);
  const id = String((req.data && req.data.id) || "");
  let pid = req.data && req.data.pid ? String(req.data.pid) : null;
  // جهاز ابن مربوط بولي أمره: يستعمل اشتراك ولي الأمر لملف هذا الابن فقط
  const tk = req.auth.token || {};
  if (tk.kidOf) {
    const dev = await db.collection("users").doc(tk.kidOf).collection("kidDevices").doc(uid).get();
    if (!dev.exists) throw new HttpsError("permission-denied", "أُلغي ربط هذا الجهاز. اطلب رمزاً جديداً من ولي أمرك.");
    uid = tk.kidOf; pid = tk.kidPid;
  } else if (tk.coOf) { uid = await ownerOf(req); }
  const meta = LESSON_INDEX[id];
  if (!meta) throw new HttpsError("not-found", "الدرس غير موجود");
  const [g, s, rank] = meta;
  // المدير يتصفح كل الدروس للمراجعة (بدون اشتراك وبدون حدّ يومي، حتى المغلقة)
  if (req.data && req.data.admin) {
    await needAdmin(req, "browse");
    const lesson = lessonFrom(g, id);
    if (!lesson) throw new HttpsError("not-found", "الدرس غير موجود");
    return {lesson};
  }
  const acc = await getAccessCfg();
  if (acc.maint && acc.maint.on) throw new HttpsError("unavailable", acc.maint.msg || "المنصة في صيانة قصيرة. عُد بعد قليل.");
  if (accHas(acc.closed, g, s, id)) throw new HttpsError("unavailable", "هذا الدرس مغلق مؤقتاً للمراجعة. عُد إليه لاحقاً.");
  const openFree = acc.openAll || accHas(acc.extraFree, g, s, id);

  const [us, subsSnap] = await Promise.all([
    db.collection("users").doc(uid).get(),
    db.collection("subscriptions").where("uid", "==", uid).get(),
  ]);
  if (!us.exists && !openFree) throw new HttpsError("failed-precondition", "أكمل بيانات حسابك أولاً");
  const role = us.exists ? us.data().role : null;
  if (pid) {
    const ps = await db.collection("users").doc(uid).collection("profiles").doc(pid).get();
    if (!ps.exists) throw new HttpsError("permission-denied", "اختر الطالب من «من يدرس الآن؟»");
  }
  const now = Date.now();
  let firstKids = [];
  if (subsSnap.docs.some((d) => ((d.data().scope || {}).maxKids))) firstKids = (await db.collection("users").doc(uid).collection("profiles").get()).docs.filter((x) => x.id !== "me")
      .sort((a, b) => ((a.data().createdAt && a.data().createdAt.toMillis()) || 0) - ((b.data().createdAt && b.data().createdAt.toMillis()) || 0)).map((x) => x.id);
  const ok = subsSnap.docs.map((d) => d.data()).some((sub) => {
    if (sub.active === false || !sub.end || sub.end.toMillis() <= now) return false;
    const sc = sub.scope || {};
    if (sub.kind === "trial") return rank != null && rank < (sc.trialN || 5) && (sc.grades || []).includes(g); // أيام مجانية: صف واحد يختاره، أول N دروس من كل كتاب
    if (sc.teacherOnly) return role === "teacher" && pid === "me" && (sc.pairs || []).includes(g + ":" + s);
    if (sc.any) return (sc.grades || []).some((x) => x === "*" || x === g);
    if (sc.kids) { if (!pid || pid === "me" || (sc.kidIds && !sc.kidIds.includes(pid)) || (!sc.kidIds && sc.maxKids && !firstKids.slice(0, sc.maxKids).includes(pid))) return false; } else if (!(role === "student" || (sc.self && pid === "me"))) return false;
    return (sc.grades || []).some((x) => x === "*" || x === g) && (sc.subjects || []).some((x) => x === "*" || x === s);
  });
  if (!ok && !openFree) throw new HttpsError("permission-denied", "هذا الدرس للمشتركين. اشترك لتفتحه.");

  // حدّ يومي يمنع سحب المنهج كاملاً
  const qRef = db.collection("lessonQuota").doc(uid + "_" + new Date().toISOString().slice(0, 10));
  await db.runTransaction(async (tx) => {
    const q = await tx.get(qRef);
    const n = (q.exists && q.data().n) || 0;
    if (n >= DAILY_LESSONS) throw new HttpsError("resource-exhausted", "فتحت دروساً كثيرة اليوم. أكمل غداً.");
    tx.set(qRef, {n: n + 1, uid});
  });
  const lesson = lessonFrom(g, id);
  if (!lesson) throw new HttpsError("not-found", "الدرس غير موجود");
  return {lesson};
});


// ===================== ربط جهاز الابن (رمز من 6 أرقام أو QR) =====================
// ولي الأمر ينشئ رمزاً لملف ابن → الابن يفتح المنصة على جهازه (دخول مجهول) ويدخل الرمز
// → يحصل الجهاز على صلاحية ملف هذا الابن فقط (kidOf/kidPid)، ويستطيع ولي الأمر إلغاءها متى شاء.
const LINK_TTL = 15 * 60 * 1000;
// a co-parent acts on the main parent's account (after checking the link still exists)
async function ownerOf(req) {
  const uid = needUser(req); const tk = req.auth.token || {};
  if (tk.coOf) { const d = await db.collection("users").doc(tk.coOf).collection("coParents").doc(uid).get(); if (d.exists) return tk.coOf; }
  return uid;
}
const MAX_KID_DEVICES = 3;
exports.createLinkCode = onCall(async (req) => {
  needUser(req); const uid = await ownerOf(req);
  if ((req.auth.token || {}).kidOf) throw new HttpsError("permission-denied", "غير مسموح");
  const pid = String((req.data && req.data.pid) || "");
  if (!pid || pid === "me") throw new HttpsError("invalid-argument", "اختر الابن");
  const ps = await db.collection("users").doc(uid).collection("profiles").doc(pid).get();
  if (!ps.exists) throw new HttpsError("not-found", "الابن غير موجود");
  const devs = await db.collection("users").doc(uid).collection("kidDevices").where("pid", "==", pid).get();
  if (devs.size >= MAX_KID_DEVICES) throw new HttpsError("resource-exhausted", "لهذا الابن " + MAX_KID_DEVICES + " أجهزة مربوطة. ألغِ ربط جهاز قديم أولاً.");
  const hr = db.collection("linkRate").doc(uid + "_" + new Date().toISOString().slice(0, 13));
  await db.runTransaction(async (tx) => { const d = await tx.get(hr); const n = (d.exists && d.data().n) || 0;
    if (n >= 15) throw new HttpsError("resource-exhausted", "طلبت رموزاً كثيرة. حاول بعد ساعة."); tx.set(hr, {n: n + 1}); });
  for (let i = 0; i < 6; i++) {
    const code = String(crypto.randomInt(0, 1000000)).padStart(6, "0");
    const ref = db.collection("linkCodes").doc(code);
    const ok = await db.runTransaction(async (tx) => { const d = await tx.get(ref);
      if (d.exists && !d.data().used && d.data().exp > Date.now()) return false;
      tx.set(ref, {uid, pid, exp: Date.now() + LINK_TTL, used: false, at: FieldValue.serverTimestamp()}); return true; });
    if (ok) return {code, exp: Date.now() + LINK_TTL, name: ps.data().name || ""};
  }
  throw new HttpsError("unavailable", "حاول مرة أخرى");
});
exports.redeemLinkCode = onCall(async (req) => {
  const kid = needUser(req);
  const tk = req.auth.token || {};
  if ((tk.firebase || {}).sign_in_provider !== "anonymous") throw new HttpsError("failed-precondition", "سجّل الخروج من الحساب الحالي أولاً");
  const code = String((req.data && req.data.code) || "").replace(/\D/g, "");
  if (code.length !== 6) throw new HttpsError("invalid-argument", "الرمز 6 أرقام");
  const tr = db.collection("linkRate").doc("k_" + kid);
  await db.runTransaction(async (tx) => { const d = await tx.get(tr); const n = (d.exists && d.data().n) || 0;
    if (n >= 8) throw new HttpsError("resource-exhausted", "محاولات كثيرة. اطلب رمزاً جديداً من ولي أمرك."); tx.set(tr, {n: n + 1}); });
  const ref = db.collection("linkCodes").doc(code);
  const info = await db.runTransaction(async (tx) => { const d = await tx.get(ref);
    if (!d.exists || d.data().used || d.data().exp < Date.now()) throw new HttpsError("not-found", "الرمز غير صحيح أو انتهت صلاحيته");
    tx.update(ref, {used: true, by: kid}); return d.data(); });
  const ps = await db.collection("users").doc(info.uid).collection("profiles").doc(info.pid).get();
  if (!ps.exists) throw new HttpsError("not-found", "الابن غير موجود");
  await admin.auth().setCustomUserClaims(kid, {kidOf: info.uid, kidPid: info.pid});
  const dev = String((req.data && req.data.device) || "").slice(0, 80);
  await db.collection("users").doc(info.uid).collection("kidDevices").doc(kid).set({pid: info.pid, name: ps.data().name || "", device: dev, at: FieldValue.serverTimestamp()});
  return {pid: info.pid, name: ps.data().name || ""};
});
exports.unlinkKidDevice = onCall(async (req) => {
  needUser(req); const uid = await ownerOf(req);
  const kid = String((req.data && req.data.kid) || "");
  const ref = db.collection("users").doc(uid).collection("kidDevices").doc(kid);
  const d = await ref.get();
  if (!d.exists) throw new HttpsError("not-found", "الجهاز غير موجود");
  await ref.delete();
  try { await admin.auth().deleteUser(kid); } catch (e) { logger.warn("unlink deleteUser", e.message); }
  return {ok: true};
});

// ===================== ولي أمر ثانٍ (مثلاً الأم) =====================
// ولي الأمر الأساسي ينشئ رمزاً → الطرف الثاني يسجّل الدخول بحسابه ويدخل الرمز → يرى الأبناء ويتابعهم بنفس الصلاحيات ما عدا إضافة أو حذف ابن.
exports.createCoCode = onCall(async (req) => {
  const uid = needUser(req); const tk = req.auth.token || {};
  if (tk.kidOf || tk.coOf || (tk.firebase || {}).sign_in_provider === "anonymous") throw new HttpsError("permission-denied", "هذه الخاصية لولي الأمر الأساسي فقط");
  const us = await db.collection("users").doc(uid).get();
  if (!us.exists || !["parent", "teacher"].includes(us.data().role)) throw new HttpsError("permission-denied", "هذه الخاصية لحساب ولي الأمر");
  const cos = await db.collection("users").doc(uid).collection("coParents").get();
  if (cos.size >= 3) throw new HttpsError("resource-exhausted", "يمكن ربط 3 أولياء أمور كحد أقصى.");
  for (let i = 0; i < 6; i++) {
    const code = String(crypto.randomInt(0, 1000000)).padStart(6, "0");
    const ref = db.collection("coCodes").doc(code);
    const ok = await db.runTransaction(async (tx) => { const d = await tx.get(ref);
      if (d.exists && !d.data().used && d.data().exp > Date.now()) return false;
      tx.set(ref, {uid, exp: Date.now() + LINK_TTL, used: false, name: us.data().name || ""}); return true; });
    if (ok) return {code, exp: Date.now() + LINK_TTL};
  }
  throw new HttpsError("unavailable", "حاول مرة أخرى");
});
exports.redeemCoCode = onCall(async (req) => {
  const me = needUser(req); const tk = req.auth.token || {};
  if ((tk.firebase || {}).sign_in_provider === "anonymous" || tk.kidOf) throw new HttpsError("failed-precondition", "سجّل الدخول بحسابك (رقم الهاتف أو البريد) أولاً");
  const code = String((req.data && req.data.code) || "").replace(/\D/g, "");
  if (code.length !== 6) throw new HttpsError("invalid-argument", "الرمز 6 أرقام");
  const tr = db.collection("linkRate").doc("c_" + me);
  await db.runTransaction(async (tx) => { const d = await tx.get(tr); const n = (d.exists && d.data().n) || 0;
    if (n >= 8) throw new HttpsError("resource-exhausted", "محاولات كثيرة. اطلب رمزاً جديداً."); tx.set(tr, {n: n + 1}); });
  const ref = db.collection("coCodes").doc(code);
  const info = await db.runTransaction(async (tx) => { const d = await tx.get(ref);
    if (!d.exists || d.data().used || d.data().exp < Date.now()) throw new HttpsError("not-found", "الرمز غير صحيح أو انتهت صلاحيته");
    if (d.data().uid === me) throw new HttpsError("failed-precondition", "هذا رمز حسابك نفسه. افتحه من حساب ولي الأمر الآخر.");
    tx.update(ref, {used: true, by: me}); return d.data(); });
  const mine = await db.collection("users").doc(me).get();
  const nm = (mine.exists && mine.data().name) || String((req.data && req.data.name) || "").slice(0, 60) || "ولي أمر";
  if (!mine.exists) await db.collection("users").doc(me).set({role: "parent", name: nm, phoneVerified: false, createdAt: FieldValue.serverTimestamp()});
  await admin.auth().setCustomUserClaims(me, {coOf: info.uid});
  await db.collection("users").doc(info.uid).collection("coParents").doc(me).set({name: nm, at: FieldValue.serverTimestamp()});
  return {owner: info.name || ""};
});
exports.removeCoParent = onCall(async (req) => {
  const me = needUser(req); const tk = req.auth.token || {};
  const co = String((req.data && req.data.co) || (tk.coOf ? me : ""));
  const owner = tk.coOf && co === me ? tk.coOf : me;
  const ref = db.collection("users").doc(owner).collection("coParents").doc(co);
  const d = await ref.get(); if (!d.exists) throw new HttpsError("not-found", "غير موجود");
  await ref.delete();
  try { await admin.auth().setCustomUserClaims(co, {}); await admin.auth().revokeRefreshTokens(co); } catch (e) { logger.warn("removeCo", e.message); }
  return {ok: true};
});

// ===================== لوحة الإدارة =====================
// المدير: من يوجد معرّفه (uid) في المستند config/admins داخل الحقل uids (يُضاف من كونسول Firebase مرة واحدة).
// حسابات Google الخاصة بالمالك: من يدخل بها (بحساب Google) يصبح مديراً تلقائياً
const OWNER_EMAILS = ["wahatoujly@gmail.com", "laffatkly@gmail.com"];
// المشرفون: config/admins.staff = {uid: {name, phone, perms: [...]}} — يضيفهم المالك من لوحة الإدارة بصلاحيات محددة
const PERMS = ["ax", "stats", "grant", "plans", "access", "tts", "push", "teach_req", "teach_courses", "teach_wd", "browse"];
async function staffOf(req) {
  if (!req.auth) return null;
  const uid = req.auth.uid; const tok = req.auth.token || {};
  if (tok.email && tok.email_verified === true && OWNER_EMAILS.includes(String(tok.email).toLowerCase())) return {uid, owner: true, perms: PERMS};
  const a = await db.collection("config").doc("admins").get(); const A = a.exists ? a.data() : {};
  if (Array.isArray(A.uids) && A.uids.includes(uid)) return {uid, owner: true, perms: PERMS};
  const st = (A.staff || {})[uid];
  if (st && !st.off) return {uid, owner: false, perms: (st.perms || []).filter((x) => PERMS.includes(x)), name: st.name || ""};
  return null;
}
// perm: بدون = أي مشرف · "owner" = المالك فقط · غير ذلك = صلاحية محددة
async function needAdmin(req, perm) {
  needUser(req);
  const s = await staffOf(req);
  if (!s) throw new HttpsError("permission-denied", "هذه الصفحة للإدارة فقط");
  if (perm === "owner" && !s.owner) throw new HttpsError("permission-denied", "هذه العملية لمالك المنصة فقط");
  if (perm && perm !== "owner" && !s.owner) {
    const any = Array.isArray(perm) ? perm : [perm];
    if (!any.some((x) => s.perms.includes(x))) throw new HttpsError("permission-denied", "ليست لديك صلاحية لهذه العملية");
  }
  return s.uid;
}
exports.adminCheck = onCall(async (req) => { needUser(req); const s = await staffOf(req);
  if (!s) throw new HttpsError("permission-denied", "هذه الصفحة للإدارة فقط");
  return {admin: true, owner: s.owner, perms: s.perms}; });
exports.adminStaff = onCall(async (req) => {
  await needAdmin(req, "owner");
  const d = req.data || {}; const ref = db.collection("config").doc("admins");
  const snap = await ref.get(); const staff = (snap.exists && snap.data().staff) || {};
  if (d.op === "set") {
    const uid = String(d.uid || "");
    const us = await db.collection("users").doc(uid).get(); if (!us.exists) throw new HttpsError("not-found", "المستخدم غير موجود");
    const perms = (Array.isArray(d.perms) ? d.perms : []).filter((x) => PERMS.includes(x));
    if (!perms.length) throw new HttpsError("invalid-argument", "اختر صلاحية واحدة على الأقل");
    staff[uid] = {name: us.data().name || "", phone: String(us.data().phone || "").replace("+218", "0"), email: us.data().email || "", perms, off: false,
      at: (staff[uid] && staff[uid].at) || Date.now()};
    await ref.set({staff}, {merge: true});
  } else if (d.op === "remove") {
    delete staff[String(d.uid || "")];
    await ref.set({staff: FieldValue.delete()}, {merge: true}); await ref.set({staff}, {merge: true});
  }
  return {staff: Object.entries(staff).map(([uid, x]) => ({uid, ...x})), perms: PERMS};
});

exports.adminStats = onCall({memory: "512MiB"}, async (req) => {
  await needAdmin(req, "stats");
  const now = Date.now();
  const [users, profiles, subs, orders] = await Promise.all([
    db.collection("users").select("role", "name", "phone", "email", "phoneVerified").get(),
    db.collectionGroup("profiles").select("grade").get(),
    db.collection("subscriptions").get(),
    db.collection("orders").where("status", "==", "paid").select("amount", "kind", "paidAt", "uid").get(),
  ]);
  const roles = {student: 0, parent: 0, teacher: 0};
  const uinfo = {};
  users.docs.forEach((d) => { const u = d.data(); roles[u.role] = (roles[u.role] || 0) + 1; uinfo[d.id] = u; });
  const kids = profiles.docs.filter((d) => d.id !== "me").length;
  const kidsByGrade = {};
  profiles.docs.filter((d) => d.id !== "me").forEach((d) => { const g = d.data().grade || "?"; kidsByGrade[g] = (kidsByGrade[g] || 0) + 1; });
  const active = subs.docs.map((d) => ({id: d.id, ...d.data()})).filter((x) => x.active !== false && x.end && x.end.toMillis() > now);
  const byKind = {};
  const payers = {student: new Set(), parent: new Set(), teacher: new Set()};
  active.forEach((x) => {
    byKind[x.kind] = (byKind[x.kind] || 0) + 1;
    const r = (uinfo[x.uid] || {}).role;
    if (x.kind !== "gift" && x.kind !== "trial" && payers[r]) payers[r].add(x.uid);
  });
  let kidsCovered = 0;
  const kidSubUsers = new Set(active.filter((x) => (x.scope || {}).kids).map((x) => x.uid));
  profiles.docs.forEach((d) => { if (d.id !== "me" && kidSubUsers.has(d.ref.parent.parent.id)) kidsCovered++; });
  let revenue = 0; orders.docs.forEach((d) => { revenue += Number(d.data().amount) || 0; });
  const list = active.sort((a, b) => (b.start && b.start.toMillis ? b.start.toMillis() : 0) - (a.start && a.start.toMillis ? a.start.toMillis() : 0))
      .slice(0, 200).map((x) => ({id: x.id, uid: x.uid, kind: x.kind, planName: x.planName || "", scope: x.scope, amount: x.amount || 0,
        end: x.end.toMillis(), name: (uinfo[x.uid] || {}).name || "", phone: (uinfo[x.uid] || {}).phone || "", role: (uinfo[x.uid] || {}).role || "", note: x.note || ""}));
  return {
    users: users.size, roles, kids, kidsByGrade, kidsCovered,
    activeSubs: active.length, byKind,
    payingStudents: payers.student.size, payingParents: payers.parent.size, payingTeachers: payers.teacher.size,
    paidOrders: orders.size, revenue: r2(revenue), prices: await getPrices(), list,
  };
});

exports.adminSetPrices = onCall(async (req) => {
  await needAdmin(req, "plans");
  const d = req.data || {};
  const out = {};
  for (const k of KINDS_ON_SALE) {
    const v = Number(d[k]);
    if (!isFinite(v) || v < 0 || v > 5000) throw new HttpsError("invalid-argument", "سعر غير صحيح");
    out[k] = r2(v);
  }
  await db.collection("config").doc("prices").set({...out, updatedAt: FieldValue.serverTimestamp()});
  return {prices: out};
});

// البحث عن مستخدم برقم الهاتف أو البريد
exports.adminFindUser = onCall(async (req) => {
  await needAdmin(req, "grant");
  const q = String((req.data && req.data.q) || "").trim();
  let snap;
  if (/^09[1-5]\d{7}$/.test(q)) snap = await db.collection("users").where("phone", "==", toE164(q)).limit(5).get();
  else if (q.includes("@")) snap = await db.collection("users").where("email", "==", q.toLowerCase()).limit(5).get();
  else throw new HttpsError("invalid-argument", "اكتب رقم هاتف (09xxxxxxxx) أو بريداً إلكترونياً");
  const out = [];
  for (const d of snap.docs) {
    const u = d.data();
    const ps = await d.ref.collection("profiles").get();
    out.push({uid: d.id, name: u.name, role: u.role, phone: u.phone || "", email: u.email || "",
      profiles: ps.docs.map((p) => ({id: p.id, name: p.data().name, grade: p.data().grade || null}))});
  }
  return {users: out};
});

// منح اشتراك مجاني (أقارب، أبناء…) لصف معيّن أو لكل الصفوف
exports.adminGrant = onCall(async (req) => {
  const admin = await needAdmin(req, "grant");
  const d = req.data || {};
  const uid = String(d.uid || "");
  const grade = String(d.grade || "*");
  if (grade !== "*" && !GRADES.includes(grade)) throw new HttpsError("invalid-argument", "الصف غير صحيح");
  const us = await db.collection("users").doc(uid).get();
  if (!us.exists) throw new HttpsError("not-found", "المستخدم غير موجود");
  // المنحة تشمل كل ملفات الحساب: صاحب الحساب وكل أبنائه
  const scope = {grades: [grade], subjects: ["*"], any: true};
  const ref = db.collection("subscriptions").doc("gift_" + uid + "_" + grade.replace("*", "all"));
  await ref.set({uid, kind: "gift", scope, amount: 0, orderId: null, start: FieldValue.serverTimestamp(),
    end: seasonEnd(), active: true, grantedBy: admin, note: String(d.note || "").slice(0, 80)});
  return {ok: true};
});

exports.adminRevoke = onCall(async (req) => {
  await needAdmin(req, "grant");
  const id = String((req.data && req.data.id) || "");
  if (!/^[A-Za-z0-9_*-]{5,120}$/.test(id)) throw new HttpsError("invalid-argument", "معرّف غير صحيح");
  await db.collection("subscriptions").doc(id).update({active: false, revokedAt: FieldValue.serverTimestamp()});
  return {ok: true};
});

// ===================== منصة المعلمين: دورات فيديو مدفوعة =====================
// الإعداد في config/access.teach = {on, show, apply} يُضبط من لوحة الإدارة.
// المعلم يقدّم طلباً ← توافق الإدارة ← ينشئ دورات (دروس فيديو) ويرسلها للمراجعة ←
// الإدارة ترفع الفيديو على يوتيوب (غير مدرج) وتضع الرابط ← تُنشر الدورة.
// الدرس الأول مجاني. عند الشراء: 70% لمحفظة المعلم و30% للمنصة (رسوم البوابة من نصيب المنصة).
// السحب: رصيد 200 د.ل فأكثر، ومرة واحدة كل 30 يوماً.
const T = {MIN: 30, MAX: 500, SHARE: 0.7, MIN_WD: 200, GAP: 30 * DAY, MAX_LESSONS: 60, TERMS_V: 1};
const T_KINDS = ["course", "boost", "exam", "skill"];
const T_SUBJ = ["ar", "en", "math", "sci", "isl", "soc", "hist", "geo", "civ", "comp", "art", "phy", "chem", "bio", "it", "socio", "other"];
const str = (x, n) => String(x == null ? "" : x).trim().slice(0, n);
const tcfg = async () => ((await getAccessCfg()).teach || {});
async function tOwner(req) { // صاحب الحساب: ولي الأمر لجهاز الابن المربوط أو للوالد الثاني
  const uid = needUser(req); const tk = req.auth.token || {};
  if (tk.kidOf) { const dev = await db.collection("users").doc(tk.kidOf).collection("kidDevices").doc(uid).get(); if (dev.exists) return tk.kidOf;
    throw new HttpsError("permission-denied", "أُلغي ربط هذا الجهاز"); }
  return ownerOf(req);
}
const ytId = (u) => { const s = String(u || "").trim();
  const m = /(?:youtu\.be\/|v=|\/embed\/|\/shorts\/|\/live\/)([A-Za-z0-9_-]{11})/.exec(s) || /^([A-Za-z0-9_-]{11})$/.exec(s);
  return m ? m[1] : null; };
const ms = (t) => (t && t.toMillis ? t.toMillis() : null);
const pubCourse = (id, c) => ({id, tid: c.tid, tname: c.tname, title: c.title, desc: c.desc || "", cat: c.cat, grade: c.grade || "",
  subject: c.subject || "", skill: c.skill || "", kind: c.kind, price: c.price, status: c.status, students: c.students || 0,
  lessons: (c.lessons || []).map((l, i) => ({id: l.id, title: l.title, min: l.min || 0, free: i === 0, ready: !!l.ready})),
  at: ms(c.publishedAt) || ms(c.createdAt)});
const pubTeacher = (id, t) => ({id, name: t.name, bio: t.bio || "", spec: t.spec || "", courses: t.courses || 0});

// تُستدعى داخل معاملة إشعار الدفع
function courseSaleTx(tx, o, orderId) {
  const tShare = r2(o.amount * T.SHARE);
  tx.set(db.collection("enroll").doc(o.uid + "_" + o.cid), {uid: o.uid, cid: o.cid, tid: o.tid, price: o.amount, orderId,
    at: FieldValue.serverTimestamp()});
  tx.set(db.collection("wallets").doc(o.tid), {bal: FieldValue.increment(tShare), earned: FieldValue.increment(tShare),
    sales: FieldValue.increment(1)}, {merge: true});
  tx.set(db.collection("wallets").doc(o.tid).collection("tx").doc(orderId), {t: "sale", amt: tShare, price: o.amount,
    cid: o.cid, title: o.title || "", at: FieldValue.serverTimestamp()});
  tx.set(db.collection("courses").doc(o.cid), {students: FieldValue.increment(1)}, {merge: true});
  tx.set(db.collection("config").doc("teachStats"), {sales: FieldValue.increment(1), gross: FieldValue.increment(o.amount),
    teachers: FieldValue.increment(tShare), platform: FieldValue.increment(r2(o.amount - tShare))}, {merge: true});
}

let TLIST = null, TLIST_AT = 0;
async function liveList() {
  if (TLIST && Date.now() - TLIST_AT < 60000) return TLIST;
  const [cs, ts] = await Promise.all([db.collection("courses").where("status", "==", "live").get(),
    db.collection("teachers").where("status", "==", "approved").get()]);
  const teachers = {};
  ts.docs.forEach((d) => { if (!d.data().hidden) teachers[d.id] = pubTeacher(d.id, d.data()); });
  const courses = cs.docs.map((d) => pubCourse(d.id, d.data())).filter((c) => teachers[c.tid]);
  TLIST = {courses, teachers}; TLIST_AT = Date.now(); return TLIST;
}
function cleanLessons(arr, old) {
  const prev = {}; (old || []).forEach((l) => { prev[l.id] = l; });
  const out = [], seen = new Set();
  for (const l of (Array.isArray(arr) ? arr : []).slice(0, T.MAX_LESSONS)) {
    const title = str(l && l.title, 90); if (!title) continue;
    let id = str(l.id, 12); if (!/^[a-z0-9]{4,12}$/.test(id) || seen.has(id)) id = crypto.randomBytes(4).toString("hex");
    seen.add(id);
    const src = str(l.src, 400); const p = prev[id];
    out.push({id, title, src, min: Math.max(0, Math.min(600, Math.round(Number(l.min) || 0))),
      ready: !!(p && p.ready && p.src === src)});
  }
  return out;
}

// ---------- يوتيوب ----------
let YT_TOK = null, YT_TOK_AT = 0, YT_UPL = null;
async function ytToken() {
  if (YT_TOK && Date.now() - YT_TOK_AT < 45 * 60000) return YT_TOK;
  const rt = String(YT_REFRESH.value() || "").trim();
  if (rt.length < 20) throw new HttpsError("failed-precondition", "قناة يوتيوب غير مربوطة بعد. اربطها من لوحة الإدارة.");
  const r = await fetch("https://oauth2.googleapis.com/token", {method: "POST", headers: {"Content-Type": "application/x-www-form-urlencoded"},
    body: new URLSearchParams({client_id: YT_ID.value(), client_secret: YT_SECRET.value(), refresh_token: rt, grant_type: "refresh_token"})});
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) { logger.error("yt token", r.status, j.error); throw new HttpsError("unavailable", "تعذّر الاتصال بقناة يوتيوب. أعد ربط القناة من لوحة الإدارة."); }
  YT_TOK = j.access_token; YT_TOK_AT = Date.now(); return YT_TOK;
}
async function yt(pathQ, opt = {}) {
  const r = await fetch((pathQ.startsWith("https://") ? "" : "https://www.googleapis.com/youtube/v3/") + pathQ, {...opt, headers: {"Authorization": "Bearer " + await ytToken(), ...(opt.headers || {})}});
  if (opt.raw) return r;
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { logger.error("yt api", pathQ.split("?")[0], r.status, JSON.stringify(j.error || {}).slice(0, 300)); throw new HttpsError("unavailable", "خطأ من يوتيوب، حاول لاحقاً"); }
  return j;
}
const ytSafe = (x, n) => String(x || "").replace(/[<>]/g, "").slice(0, n);
const ORIGINS = ["https://mujtahid.ly", "https://www.mujtahid.ly", "https://wahatoujly-source.github.io", "http://localhost:8771"];
async function findUpload(ref) { // يبحث في آخر الفيديوهات المرفوعة عن الوسم ref
  if (!YT_UPL) { const c = await yt("channels?part=contentDetails&mine=true"); YT_UPL = c.items && c.items[0] && c.items[0].contentDetails.relatedPlaylists.uploads; }
  if (!YT_UPL) return null;
  const p = await yt("playlistItems?part=snippet&maxResults=50&playlistId=" + YT_UPL);
  const it = (p.items || []).find((x) => String(x.snippet.description || "").includes(ref));
  return it ? it.snippet.resourceId.videoId : null;
}

// ربط القناة: المدير يفتح رابط الموافقة من Google، وهذه الصفحة تعرض رمز التحديث ليضعه في Secret Manager
exports.ytAuth = onRequest({secrets: [YT_ID, YT_SECRET], memory: "256MiB"}, async (req, res) => {
  const page = (body) => res.status(200).set("Content-Type", "text/html; charset=utf-8").send(`<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ربط قناة يوتيوب</title>
<style>body{font-family:system-ui,Tahoma;max-width:640px;margin:30px auto;padding:0 16px;line-height:1.8;background:#f4f6fb;color:#111}.b{background:#fff;border-radius:16px;padding:18px;box-shadow:0 2px 12px #0001}textarea{width:100%;direction:ltr;font-family:monospace;font-size:13px;padding:8px;box-sizing:border-box}code{background:#eef;padding:2px 6px;border-radius:6px;direction:ltr;display:inline-block}button{background:#1d4ed8;color:#fff;border:0;border-radius:10px;padding:10px 16px;font:inherit;cursor:pointer}</style></head><body><div class="b">${body}</div></body></html>`);
  const state = String(req.query.state || ""), code = String(req.query.code || "");
  if (req.query.error) return page("<h2>❌ لم تتم الموافقة</h2><p>" + ytSafe(req.query.error, 80) + "</p>");
  const nRef = db.collection("config").doc("ytNonce"); const ns = await nRef.get();
  if (!ns.exists || ns.data().n !== state || !/^[a-f0-9]{32}$/.test(state) || Date.now() - ns.data().at > 20 * 60000) return page("<h2>⛔ الرابط منتهي أو غير صالح</h2><p>ابدأ الربط من جديد من لوحة الإدارة.</p>");
  await nRef.delete();
  const r = await fetch("https://oauth2.googleapis.com/token", {method: "POST", headers: {"Content-Type": "application/x-www-form-urlencoded"},
    body: new URLSearchParams({code, client_id: YT_ID.value(), client_secret: YT_SECRET.value(), redirect_uri: YT_REDIRECT, grant_type: "authorization_code"})});
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.refresh_token) return page("<h2>❌ تعذّر الحصول على الصلاحية</h2><p>" + ytSafe(j.error_description || j.error || "لم يُرجع Google رمز التحديث", 200) + "</p>");
  const ch = await fetch("https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true", {headers: {"Authorization": "Bearer " + j.access_token}}).then((x) => x.json()).catch(() => ({}));
  const c = ch.items && ch.items[0];
  const name = c ? ytSafe(c.snippet.title, 80) + (c.snippet.customUrl ? " (" + ytSafe(c.snippet.customUrl, 40) + ")" : "") : "؟";
  const tok = ytSafe(j.refresh_token, 300).replace(/[^A-Za-z0-9/_.\-]/g, "");
  return page(`<h2>✅ تمت الموافقة</h2><p>القناة: <b>${name}</b></p><p>إذا كانت هذه قناتك الصحيحة، انسخ الرمز التالي:</p>
<textarea id="t" rows="4" readonly>${tok}</textarea><p><button onclick="navigator.clipboard.writeText(document.getElementById('t').value);this.textContent='✓ نُسخ'">نسخ الرمز</button></p>
<p>ثم في الطرفية (Terminal) داخل مجلد المشروع شغّل:</p><p><code>firebase functions:secrets:set YT_REFRESH_TOKEN</code></p><p>والصق الرمز عندما يُطلب، ثم:</p><p><code>firebase deploy --only functions:teach,functions:adminTeach</code></p>
<p>⚠️ لا ترسل هذا الرمز لأحد، ولا تضعه في الكود. أغلق هذه الصفحة بعد النسخ.</p>`);
});

exports.teach = onCall({secrets: [MYPAY_ID, MYPAY_SECRET, YT_ID, YT_SECRET, YT_REFRESH], memory: "256MiB", timeoutSec: 120}, async (req) => {
  const d = req.data || {}; const op = String(d.op || "");
  const cfg = await tcfg();
  let isAdm = false;
  if (req.auth) { try { await needAdmin(req); isAdm = true; } catch (e) { isAdm = false; } }
  const uid = req.auth && req.auth.uid;
  if (!cfg.on && !isAdm && op !== "me") throw new HttpsError("failed-precondition", "منصة المعلمين غير مفعّلة حالياً");

  // ---------- للعامة ----------
  if (op === "list") {
    if (!cfg.show && !isAdm) return {courses: [], teachers: {}, off: true};
    return await liveList();
  }
  if (op === "course") {
    const cid = str(d.cid, 40); const cs = await db.collection("courses").doc(cid).get();
    if (!cs.exists) throw new HttpsError("not-found", "الدورة غير موجودة");
    const c = cs.data(); const mine = uid && c.tid === uid;
    const ts = await db.collection("teachers").doc(c.tid).get(); const t = ts.exists ? ts.data() : {};
    const visible = c.status === "live" && t.status === "approved" && !t.hidden && cfg.show;
    if (!visible && !mine && !isAdm) throw new HttpsError("not-found", "الدورة غير متاحة حالياً");
    let owned = false, phone = "";
    if (uid) {
      const own = await tOwner(req);
      owned = (await db.collection("enroll").doc(own + "_" + cid).get()).exists;
      const us = await db.collection("users").doc(own).get(); phone = us.exists ? String(us.data().phone || "").replace("+218", "0") : "";
    }
    const pv = await db.collection("courses").doc(cid).collection("priv").doc("v").get(); const map = (pv.exists && pv.data().map) || {};
    const full = owned || mine || isAdm;
    const vids = {};
    (c.lessons || []).forEach((l, i) => { if (l.ready && map[l.id] && (full || i === 0)) vids[l.id] = map[l.id]; });
    return {course: pubCourse(cid, c), teacher: pubTeacher(c.tid, t), owned, mine: !!mine, admin: isAdm, vids, wm: phone || (uid ? uid.slice(0, 8) : "")};
  }
  if (op === "teacher") {
    const tid = str(d.tid, 40); const ts = await db.collection("teachers").doc(tid).get();
    if (!ts.exists || ts.data().status !== "approved" || (ts.data().hidden && !isAdm)) throw new HttpsError("not-found", "المعلم غير موجود");
    const L = await liveList();
    return {teacher: pubTeacher(tid, ts.data()), courses: L.courses.filter((c) => c.tid === tid)};
  }
  if (op === "buy") {
    needUser(req);
    const t = req.auth.token || {};
    if (t.kidOf) throw new HttpsError("permission-denied", "اطلب من ولي أمرك شراء الدورة من حسابه");
    const own = await tOwner(req);
    const cid = str(d.cid, 40); const cs = await db.collection("courses").doc(cid).get();
    if (!cs.exists || cs.data().status !== "live" || !cfg.show) throw new HttpsError("not-found", "الدورة غير متاحة للشراء");
    const c = cs.data();
    if (c.tid === own) throw new HttpsError("failed-precondition", "هذه دورتك");
    if ((await db.collection("enroll").doc(own + "_" + cid).get()).exists) return {owned: true};
    const us = await db.collection("users").doc(own).get();
    if (!us.exists) throw new HttpsError("failed-precondition", "أكمل بيانات حسابك أولاً");
    if (!us.data().phoneVerified) throw new HttpsError("failed-precondition", "أكّد رقم هاتفك أولاً");
    const recent = await db.collection("orders").where("uid", "==", own).where("status", "==", "pending").get();
    if (recent.docs.filter((x) => ms(x.data().createdAt) > Date.now() - HOUR).length >= 5) throw new HttpsError("resource-exhausted", "طلبات كثيرة، حاول بعد قليل");
    const amount = r2(Number(c.price));
    const oRef = db.collection("orders").doc();
    await oRef.set({uid: own, kind: "course", cid, tid: c.tid, title: c.title, amount, currency: "LYD", status: "pending",
      createdAt: FieldValue.serverTimestamp()});
    const url = await mypayCreate(oRef, amount, "https://mujtahid.ly/#cpaid-" + oRef.id);
    return {url, orderId: oRef.id, amount};
  }
  if (op === "paid") {
    const own = await tOwner(req); const oid = str(d.orderId, 40);
    const os = await db.collection("orders").doc(oid).get();
    if (!os.exists || os.data().uid !== own) throw new HttpsError("not-found", "الطلب غير موجود");
    return {status: os.data().status, cid: os.data().cid || null, title: os.data().title || ""};
  }
  if (op === "mine") { // الدورات التي اشتراها الحساب
    const own = await tOwner(req);
    const es = await db.collection("enroll").where("uid", "==", own).get();
    const out = [];
    for (const e of es.docs.slice(0, 50)) { const c = await db.collection("courses").doc(e.data().cid).get(); if (c.exists) out.push(pubCourse(c.id, c.data())); }
    return {courses: out};
  }

  // ---------- للمعلم ----------
  const me = needUser(req);
  if ((req.auth.token || {}).kidOf || req.auth.token.firebase.sign_in_provider === "anonymous") throw new HttpsError("permission-denied", "سجّل الدخول بحسابك");
  const tRef = db.collection("teachers").doc(me);
  if (op === "me") {
    const ts = await tRef.get();
    if (!ts.exists) return {teacher: null, cfg: {on: !!cfg.on, apply: cfg.apply !== false}, terms: T, admin: isAdm};
    const [cs, ws, txs, wds] = await Promise.all([db.collection("courses").where("tid", "==", me).get(), db.collection("wallets").doc(me).get(),
      db.collection("wallets").doc(me).collection("tx").orderBy("at", "desc").limit(50).get(),
      db.collection("withdrawals").where("tid", "==", me).get()]);
    const t = ts.data(); const w = ws.exists ? ws.data() : {};
    return {teacher: {...pubTeacher(me, t), status: t.status, hidden: !!t.hidden, note: t.note || "", banks: t.banks || [], phone: t.phone || ""},
      courses: cs.docs.map((x) => ({...pubCourse(x.id, x.data()), note: x.data().note || "", lessons: (x.data().lessons || []).map((l, i) => ({...l, free: i === 0}))}))
          .sort((a, b) => (b.at || 0) - (a.at || 0)),
      wallet: {bal: r2(w.bal || 0), earned: r2(w.earned || 0), paid: r2(w.paid || 0), sales: w.sales || 0, lastWd: ms(w.lastWd)},
      tx: txs.docs.map((x) => ({...x.data(), at: ms(x.data().at)})),
      wds: wds.docs.map((x) => ({id: x.id, amount: x.data().amount, status: x.data().status, at: ms(x.data().at), bank: (x.data().bank || {}).bank || "", note: x.data().note || ""}))
          .sort((a, b) => (b.at || 0) - (a.at || 0)),
      cfg: {on: !!cfg.on}, terms: T, admin: isAdm};
  }
  if (op === "apply") {
    if (cfg.apply === false) throw new HttpsError("failed-precondition", "استقبال طلبات المعلمين متوقف حالياً");
    const us = await db.collection("users").doc(me).get();
    if (!us.exists || !us.data().phoneVerified) throw new HttpsError("failed-precondition", "أكّد رقم هاتفك أولاً");
    if (d.agree !== true) throw new HttpsError("invalid-argument", "يجب الموافقة على شروط المنصة");
    const name = str(d.name, 50), spec = str(d.spec, 80), bio = str(d.bio, 500);
    if (name.length < 3 || spec.length < 2) throw new HttpsError("invalid-argument", "اكتب اسمك وتخصصك");
    const ts = await tRef.get();
    if (ts.exists && ts.data().status === "approved") throw new HttpsError("already-exists", "أنت معلم معتمد");
    if (ts.exists && ts.data().status === "blocked") throw new HttpsError("permission-denied", "الحساب موقوف، تواصل مع الإدارة");
    pushStaff("teach_req", {title: "👩‍🏫 طلب انضمام معلم جديد", body: name + " — " + spec});
    await tRef.set({name, spec, bio, phone: us.data().phone || "", status: "pending", hidden: false, banks: (ts.exists && ts.data().banks) || [],
      agreed: {v: T.TERMS_V, at: FieldValue.serverTimestamp()}, createdAt: (ts.exists && ts.data().createdAt) || FieldValue.serverTimestamp()}, {merge: true});
    return {ok: true};
  }
  const ts = await tRef.get();
  if (!ts.exists || ts.data().status !== "approved") throw new HttpsError("permission-denied", "حساب المعلم غير معتمد بعد");
  const t = ts.data();
  if (op === "profile") {
    const name = str(d.name, 50), spec = str(d.spec, 80), bio = str(d.bio, 500);
    if (name.length < 3) throw new HttpsError("invalid-argument", "الاسم قصير");
    await tRef.update({name, spec, bio}); TLIST = null;
    const cs = await db.collection("courses").where("tid", "==", me).get();
    await Promise.all(cs.docs.map((x) => x.ref.update({tname: name})));
    return {ok: true};
  }
  if (op === "save") {
    const cid = str(d.cid, 40);
    const ref = cid ? db.collection("courses").doc(cid) : db.collection("courses").doc();
    const old = cid ? await ref.get() : null;
    if (cid && (!old.exists || old.data().tid !== me)) throw new HttpsError("not-found", "الدورة غير موجودة");
    const o = old && old.exists ? old.data() : null;
    const title = str(d.title, 90); if (title.length < 4) throw new HttpsError("invalid-argument", "اكتب عنواناً واضحاً للدورة");
    const price = Math.round(Number(d.price));
    if (!(price >= T.MIN && price <= T.MAX)) throw new HttpsError("invalid-argument", `السعر بين ${T.MIN} و${T.MAX} دينار`);
    const cat = d.cat === "skill" ? "skill" : "cur";
    const grade = cat === "cur" ? str(d.grade, 2) : ""; if (cat === "cur" && !GRADES.includes(grade)) throw new HttpsError("invalid-argument", "اختر الصف");
    const subject = cat === "cur" ? str(d.subject, 8) : ""; if (cat === "cur" && !T_SUBJ.includes(subject)) throw new HttpsError("invalid-argument", "اختر المادة");
    const skill = cat === "skill" ? str(d.skill, 60) : ""; if (cat === "skill" && skill.length < 2) throw new HttpsError("invalid-argument", "اكتب اسم المهارة");
    const kind = T_KINDS.includes(d.kind) ? d.kind : (cat === "skill" ? "skill" : "course");
    const lessons = cleanLessons(d.lessons, o && o.lessons);
    if (!lessons.length) throw new HttpsError("invalid-argument", "أضف درساً واحداً على الأقل");
    const live = o && o.status === "live";
    const data = {tid: me, tname: t.name, title, desc: str(d.desc, 1500), cat, grade, subject, skill, kind, price, lessons,
      updatedAt: FieldValue.serverTimestamp()};
    if (!o) Object.assign(data, {status: "draft", students: 0, createdAt: FieldValue.serverTimestamp()});
    else if (!live && o.status !== "pending") data.status = "draft";
    await ref.set(data, {merge: true});
    if (o) { // احذف روابط الدروس التي تغيّر مصدرها أو حُذفت
      const pv = ref.collection("priv").doc("v"); const ps = await pv.get();
      if (ps.exists) { const map = ps.data().map || {}; const keep = {}; lessons.forEach((l) => { if (l.ready && map[l.id]) keep[l.id] = map[l.id]; }); await pv.set({map: keep}); }
    }
    if (!o) await tRef.update({courses: FieldValue.increment(1)});
    TLIST = null;
    return {cid: ref.id, live, waiting: lessons.filter((l) => !l.ready).length};
  }
  if (op === "submit" || op === "unpublish" || op === "delete") {
    const ref = db.collection("courses").doc(str(d.cid, 40)); const cs = await ref.get();
    if (!cs.exists || cs.data().tid !== me) throw new HttpsError("not-found", "الدورة غير موجودة");
    const c = cs.data();
    if (op === "submit") { if (c.status === "live") return {ok: true}; await ref.update({status: "pending", note: "", submittedAt: FieldValue.serverTimestamp()});
      pushStaff("teach_courses", {title: "🎬 دورة جديدة تنتظر المراجعة", body: c.title + " — " + t.name}); }
    if (op === "unpublish") await ref.update({status: "draft"});
    if (op === "delete") { if (c.students) throw new HttpsError("failed-precondition", "لا يمكن حذف دورة اشترك فيها طلاب؛ يمكنك إيقافها"); await ref.delete(); await tRef.update({courses: FieldValue.increment(-1)}); }
    TLIST = null; return {ok: true};
  }
  if (op === "upInit" || op === "upDone") {
    const cid = str(d.cid, 40), lid = str(d.lid, 12);
    const cRef = db.collection("courses").doc(cid); const cs = await cRef.get();
    if (!cs.exists || cs.data().tid !== me) throw new HttpsError("not-found", "الدورة غير موجودة");
    const c = cs.data(); const li = (c.lessons || []).findIndex((l) => l.id === lid);
    if (li < 0) throw new HttpsError("not-found", "احفظ الدرس أولاً");
    const L = c.lessons[li]; const ref = "ref:" + cid + "/" + lid;
    if (op === "upInit") {
      const size = Math.floor(Number(d.size)); const type = /^video\/[a-z0-9.+-]{1,30}$/.test(d.type) ? d.type : "video/*";
      if (!(size > 10000 && size < 8 * 1024 * 1024 * 1024)) throw new HttpsError("invalid-argument", "حجم الفيديو غير مقبول (حتى 8 جيجا)");
      const origin = ORIGINS.includes(d.origin) ? d.origin : ORIGINS[0];
      const dayRef = db.collection("config").doc("ytDay_" + new Date().toISOString().slice(0, 10));
      await takeSlot(dayRef, 90, "تم الوصول للحد اليومي لرفع الفيديوهات، حاول غداً", DAY);
      const kids = c.cat === "cur" && Number(c.grade) <= 6;
      const body = {snippet: {title: ytSafe(c.title + " — " + (li + 1) + ". " + L.title, 100), categoryId: "27",
        description: ytSafe(c.title + "\n" + L.title + "\n" + t.name + "\nمنصة المجتهد — https://mujtahid.ly\n" + ref, 4900)},
      status: {privacyStatus: "unlisted", embeddable: true, selfDeclaredMadeForKids: kids}};
      const r = await yt("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status", {method: "POST", raw: true,
        headers: {"Content-Type": "application/json; charset=UTF-8", "X-Upload-Content-Length": String(size), "X-Upload-Content-Type": type, "Origin": origin},
        body: JSON.stringify(body)});
      const url = r.headers.get("location");
      if (!r.ok || !url) { logger.error("yt upInit", r.status, (await r.text()).slice(0, 300)); throw new HttpsError("unavailable", "تعذّر بدء الرفع، حاول لاحقاً"); }
      await db.collection("uploads").doc(cid + "_" + lid).set({tid: me, cid, lid, size, at: FieldValue.serverTimestamp()});
      return {url};
    }
    let vid = /^[A-Za-z0-9_-]{11}$/.test(d.vid || "") ? d.vid : null;
    if (vid) { const v = await yt("videos?part=snippet&id=" + vid); const it = v.items && v.items[0];
      if (!it || !String(it.snippet.description || "").includes(ref)) vid = null; }
    if (!vid) vid = await findUpload(ref);
    if (!vid) throw new HttpsError("not-found", "لم نجد الفيديو بعد. انتظر دقيقة ثم اضغط «تحقق».");
    const pv = cRef.collection("priv").doc("v"); const ps = await pv.get(); const map = (ps.exists && ps.data().map) || {};
    const old = map[lid]; map[lid] = vid; await pv.set({map});
    const lessons = c.lessons.map((l) => l.id === lid ? {...l, ready: true, src: ""} : l);
    const min = Math.round(Number(d.min)); if (min > 0 && !L.min) lessons[li].min = Math.min(600, min);
    await cRef.update({lessons}); TLIST = null;
    if (old && old !== vid) yt("videos?id=" + old, {method: "DELETE", raw: true}).catch(() => {});
    return {ok: true, vid};
  }
  if (op === "banks") {
    const banks = [];
    for (const b of (Array.isArray(d.banks) ? d.banks : []).slice(0, 5)) {
      const bank = str(b.bank, 60), branch = str(b.branch, 60), holder = str(b.holder, 60);
      const iban = str(b.iban, 40).replace(/\s+/g, "").toUpperCase(), acct = str(b.acct, 30).replace(/\s+/g, ""), phone = str(b.phone, 10);
      if (!bank || !branch || holder.length < 3) throw new HttpsError("invalid-argument", "أكمل اسم المصرف والفرع واسم صاحب الحساب");
      if (!/^LY\d{23}$/.test(iban)) throw new HttpsError("invalid-argument", "رقم IBAN يبدأ بـ LY ثم 23 رقماً");
      if (!/^\d{5,20}$/.test(acct)) throw new HttpsError("invalid-argument", "رقم الحساب أرقام فقط");
      if (!PHONE_RE.test(phone)) throw new HttpsError("invalid-argument", "رقم الهاتف 09xxxxxxxx");
      banks.push({id: /^[a-z0-9]{4,12}$/.test(b.id) ? b.id : crypto.randomBytes(4).toString("hex"), bank, branch, holder, iban, acct, phone});
    }
    await tRef.update({banks}); return {banks};
  }
  if (op === "withdraw") {
    const bank = (t.banks || []).find((b) => b.id === d.bankId);
    if (!bank) throw new HttpsError("invalid-argument", "اختر الحساب المصرفي");
    const amount = r2(Number(d.amount));
    const wRef = db.collection("wallets").doc(me); const out = db.collection("withdrawals").doc();
    await db.runTransaction(async (tx) => {
      const ws = await tx.get(wRef); const w = ws.exists ? ws.data() : {}; const bal = r2(w.bal || 0);
      if (bal < T.MIN_WD) throw new HttpsError("failed-precondition", `أقل رصيد للسحب ${T.MIN_WD} دينار`);
      if (!(amount >= T.MIN_WD && amount <= bal)) throw new HttpsError("invalid-argument", `المبلغ بين ${T.MIN_WD} و${bal} دينار`);
      const last = ms(w.lastWd);
      if (last && Date.now() - last < T.GAP) {
        const days = Math.ceil((T.GAP - (Date.now() - last)) / DAY);
        throw new HttpsError("failed-precondition", `يمكنك طلب سحب جديد بعد ${days} يوماً`);
      }
      tx.set(wRef, {bal: r2(bal - amount), lastWd: FieldValue.serverTimestamp(), prevWd: w.lastWd || null}, {merge: true});
      tx.set(out, {tid: me, tname: t.name, phone: t.phone || "", amount, bank, status: "pending", at: FieldValue.serverTimestamp()});
      tx.set(wRef.collection("tx").doc("wd_" + out.id), {t: "wd", amt: -amount, at: FieldValue.serverTimestamp(), bank: bank.bank});
    });
    pushStaff("teach_wd", {title: "💸 طلب سحب رصيد", body: t.name + " — " + amount + " د.ل"});
    return {ok: true, id: out.id};
  }
  throw new HttpsError("invalid-argument", "عملية غير معروفة");
});

// ---------- لوحة الإدارة: المعلمون والدورات والسحوبات ----------
exports.adminTeach = onCall({secrets: [YT_ID, YT_SECRET, YT_REFRESH], memory: "256MiB"}, async (req) => {
  const d = req.data || {}; const op = String(d.op || "");
  const OP_PERM = {cfg: "owner", ytLink: "owner", ytStatus: ["teach_courses", "teach_req"], load: ["teach_req", "teach_courses", "teach_wd"],
    teacher: "teach_req", videos: "teach_courses", vmap: "teach_courses", course: "teach_courses", withdrawal: "teach_wd", grant: "grant"};
  const adm = await needAdmin(req, OP_PERM[op] || "owner");
  if (op === "cfg") {
    const teach = {on: !!d.on, show: !!d.show, apply: !!d.apply};
    await db.collection("config").doc("access").set({teach}, {merge: true}); ACCESS = null; return {teach};
  }
  if (op === "ytLink") {
    const n = crypto.randomBytes(16).toString("hex");
    await db.collection("config").doc("ytNonce").set({n, at: Date.now(), by: adm});
    return {url: "https://accounts.google.com/o/oauth2/v2/auth?" + new URLSearchParams({client_id: YT_ID.value(), redirect_uri: YT_REDIRECT,
      response_type: "code", scope: "https://www.googleapis.com/auth/youtube", access_type: "offline", prompt: "consent", state: n})};
  }
  if (op === "ytStatus") {
    try { const c = await yt("channels?part=snippet,statistics&mine=true"); const it = c.items && c.items[0];
      return {ok: !!it, name: it ? it.snippet.title : "", url: it && it.snippet.customUrl ? "https://www.youtube.com/" + it.snippet.customUrl : "", videos: it ? Number(it.statistics.videoCount) : 0};
    } catch (e) { return {ok: false, err: e.message}; }
  }
  if (op === "load") {
    const me = await staffOf(req); const canWd = me.owner || me.perms.includes("teach_wd");
    const [ts, cs, wd, st] = await Promise.all([db.collection("teachers").get(), db.collection("courses").get(),
      db.collection("withdrawals").where("status", "==", "pending").get(), db.collection("config").doc("teachStats").get()]);
    const wal = await db.collection("wallets").get(); const bal = {}; wal.docs.forEach((x) => { bal[x.id] = x.data(); });
    return {
      teachers: ts.docs.map((x) => { const t = x.data(); return {id: x.id, name: t.name, spec: t.spec, bio: t.bio || "", phone: (t.phone || "").replace("+218", "0"),
        status: t.status, hidden: !!t.hidden, note: t.note || "", courses: t.courses || 0, at: ms(t.createdAt),
        bal: r2((bal[x.id] || {}).bal || 0), earned: r2((bal[x.id] || {}).earned || 0)}; }),
      courses: cs.docs.map((x) => ({...pubCourse(x.id, x.data()), note: x.data().note || "", lessons: (x.data().lessons || []).map((l, i) => ({...l, free: i === 0}))})),
      withdrawals: canWd ? wd.docs.map((x) => ({id: x.id, ...x.data(), at: ms(x.data().at)})) : [],
      stats: st.exists ? st.data() : {},
    };
  }
  if (op === "teacher") {
    const ref = db.collection("teachers").doc(str(d.tid, 40)); if (!(await ref.get()).exists) throw new HttpsError("not-found", "غير موجود");
    const up = {};
    if (["approved", "rejected", "blocked", "pending"].includes(d.status)) up.status = d.status;
    if (typeof d.hidden === "boolean") up.hidden = d.hidden;
    if (d.note != null) up.note = str(d.note, 200);
    up.reviewedBy = adm; up.reviewedAt = FieldValue.serverTimestamp();
    await ref.update(up); TLIST = null;
    if (up.status === "approved") pushUser(ref.id, {title: "🎉 تم قبولك معلماً في المجتهد", body: "ابدأ الآن بإنشاء دورتك الأولى ورفع فيديوهاتها.", link: "#studio"}, {rule: "events"});
    if (up.status === "rejected") pushUser(ref.id, {title: "طلبك كمعلم يحتاج تعديلاً", body: up.note || "افتح منصة المعلم لمعرفة التفاصيل.", link: "#studio"}, {rule: "events"});
    return {ok: true};
  }
  if (op === "videos") { // روابط يوتيوب للدروس: {cid, vids:{lessonId: url}}
    const ref = db.collection("courses").doc(str(d.cid, 40)); const cs = await ref.get();
    if (!cs.exists) throw new HttpsError("not-found", "الدورة غير موجودة");
    const pv = ref.collection("priv").doc("v"); const ps = await pv.get(); const map = (ps.exists && ps.data().map) || {};
    const lessons = (cs.data().lessons || []).map((l) => {
      if (d.vids && Object.prototype.hasOwnProperty.call(d.vids, l.id)) {
        const raw = String(d.vids[l.id] || "").trim();
        if (!raw) { delete map[l.id]; return {...l, ready: false}; }
        const id = ytId(raw); if (!id) throw new HttpsError("invalid-argument", "رابط يوتيوب غير صحيح: " + l.title);
        map[l.id] = id; return {...l, ready: true};
      }
      return l;
    });
    await pv.set({map}); await ref.update({lessons}); TLIST = null;
    return {ok: true, map};
  }
  if (op === "vmap") {
    const ps = await db.collection("courses").doc(str(d.cid, 40)).collection("priv").doc("v").get();
    return {map: (ps.exists && ps.data().map) || {}};
  }
  if (op === "course") {
    const ref = db.collection("courses").doc(str(d.cid, 40)); const cs = await ref.get();
    if (!cs.exists) throw new HttpsError("not-found", "الدورة غير موجودة");
    const st = d.status;
    if (!["live", "rejected", "off", "draft", "pending"].includes(st)) throw new HttpsError("invalid-argument", "حالة غير صحيحة");
    if (st === "live") {
      const ls = cs.data().lessons || [];
      if (!ls.length || !ls[0].ready) throw new HttpsError("failed-precondition", "ضع رابط يوتيوب للدرس الأول على الأقل قبل النشر");
    }
    const up = {status: st, note: str(d.note, 300), reviewedBy: adm};
    if (st === "live" && !cs.data().publishedAt) up.publishedAt = FieldValue.serverTimestamp();
    await ref.update(up); TLIST = null;
    const c0 = cs.data();
    if (st === "live" && c0.status !== "live") pushUser(c0.tid, {title: "🎉 نُشرت دورتك", body: c0.title + " — أصبحت متاحة للطلاب الآن.", link: "#crs-" + cs.id}, {rule: "events"});
    if (st === "rejected") pushUser(c0.tid, {title: "دورتك تحتاج تعديلاً", body: c0.title + (up.note ? " — " + up.note : ""), link: "#studio-" + cs.id}, {rule: "events"});
    return {ok: true};
  }
  if (op === "withdrawal") {
    const ref = db.collection("withdrawals").doc(str(d.id, 40));
    await db.runTransaction(async (tx) => {
      const ws = await tx.get(ref); if (!ws.exists) throw new HttpsError("not-found", "غير موجود");
      const w = ws.data(); if (w.status !== "pending") throw new HttpsError("failed-precondition", "تمت معالجته");
      const wal = db.collection("wallets").doc(w.tid); const wv = await tx.get(wal);
      if (d.status === "paid") {
        tx.update(ref, {status: "paid", doneAt: FieldValue.serverTimestamp(), note: str(d.note, 200), by: adm});
        tx.set(wal, {paid: FieldValue.increment(w.amount)}, {merge: true});
        pushUser(w.tid, {title: "💸 تم تحويل " + w.amount + " د.ل إلى حسابك", body: (w.bank && w.bank.bank) || "", link: "#studio"}, {rule: "events"});
      } else if (d.status === "rejected") {
        tx.update(ref, {status: "rejected", doneAt: FieldValue.serverTimestamp(), note: str(d.note, 200), by: adm});
        tx.set(wal, {bal: FieldValue.increment(w.amount), lastWd: (wv.exists && wv.data().prevWd) || null}, {merge: true});
        tx.set(wal.collection("tx").doc("wdback_" + ref.id), {t: "wd-back", amt: w.amount, at: FieldValue.serverTimestamp()});
      } else throw new HttpsError("invalid-argument", "حالة غير صحيحة");
    });
    return {ok: true};
  }
  if (op === "grant") { // منح دورة مجاناً لحساب
    const uid = str(d.uid, 60), cid = str(d.cid, 40);
    const cs = await db.collection("courses").doc(cid).get(); if (!cs.exists) throw new HttpsError("not-found", "الدورة غير موجودة");
    await db.collection("enroll").doc(uid + "_" + cid).set({uid, cid, tid: cs.data().tid, price: 0, orderId: null, gift: adm, at: FieldValue.serverTimestamp()});
    return {ok: true};
  }
  throw new HttpsError("invalid-argument", "عملية غير معروفة");
});

// ===================== الأصوات: قراءة النص العربي بصوت Google (Chirp 3 HD) مع حفظ دائم =====================
// يُنشأ ملف الصوت لأول من يحتاج الجملة، ويُحفظ في Firestore (ttsCache) ثم يخدم الجميع من الحفظ.
// الإعداد في config/access.tts = {on, f: اسم صوت الصفوف 1–6, m: اسم صوت الصفوف 7–9, rate}
const TTS_DEF = {f: "ar-XA-Chirp3-HD-Aoede", m: "ar-XA-Chirp3-HD-Charon", rate: 0.9};
const TTS_DAY_CAP = 300000; // أقصى عدد أحرف جديدة يومياً (حماية من الإساءة)
async function gcpToken() {
  const r = await fetch("http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token", {headers: {"Metadata-Flavor": "Google"}});
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) throw new Error("metadata token " + r.status);
  return j.access_token;
}
async function synth(text, voice, rate) {
  const lang = voice.slice(0, 5);
  const body = {input: {text}, voice: {languageCode: lang, name: voice}, audioConfig: {audioEncoding: "MP3", sampleRateHertz: 24000}};
  if (rate && Math.abs(rate - 1) > 0.01) body.audioConfig.speakingRate = rate;
  const r = await fetch("https://texttospeech.googleapis.com/v1/text:synthesize", {method: "POST",
    headers: {"Authorization": "Bearer " + await gcpToken(), "Content-Type": "application/json"}, body: JSON.stringify(body)});
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.audioContent) {
    logger.error("tts", r.status, JSON.stringify(j.error || {}).slice(0, 300));
    const e = new Error((j.error && j.error.message) || "tts failed"); e.status = r.status; throw e;
  }
  return Buffer.from(j.audioContent, "base64");
}
// توحيد الإعداد: {on, p: {rate, a, b, mode: single|alt|subject, subj: {مادة: صوت}}, s: {...}} (مع دعم الشكل القديم {f, m, rate})
const VOICE_RE = /^[a-z]{2}-[A-Z]{2}-[A-Za-z0-9-]{3,40}$/;
const clampRate = (r, d) => Math.min(1.3, Math.max(0.6, Number(r) || d));
function ttsNorm(t) {
  const st = (x, oldVoice, oldRate) => { x = x || {}; const subj = {};
    Object.entries(x.subj || {}).forEach(([k, v]) => { if (/^[a-z]{2,8}$/.test(k) && VOICE_RE.test(v || "")) subj[k] = v; });
    return {rate: clampRate(x.rate != null ? x.rate : oldRate, TTS_DEF.rate), a: VOICE_RE.test(x.a || "") ? x.a : (VOICE_RE.test(oldVoice || "") ? oldVoice : null),
      b: VOICE_RE.test(x.b || "") ? x.b : null, mode: ["single", "alt", "subject"].includes(x.mode) ? x.mode : "single", subj}; };
  const p = st(t.p, t.f, t.rate), s2 = st(t.s, t.m, t.rate);
  if (!p.a) p.a = TTS_DEF.f; if (!s2.a) s2.a = TTS_DEF.m;
  return {on: !!t.on, p, s: s2};
}
const ttsKey = (voice, rate, text) => crypto.createHash("sha1").update(voice + "|" + rate + "|" + text).digest("hex");
const TTS_MEM = new Map();

exports.tts = onRequest({memory: "256MiB", concurrency: 40, maxInstances: 5}, async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(204).send("");
  try {
    const cfg = ttsNorm((await getAccessCfg()).tts || {});
    if (!cfg.on) return res.status(404).send("off");
    // st: p = الصفوف 1–6، s = 7–9 · v: اسم الصوت (يجب أن يكون من الأصوات المختارة في الإعداد) · v=f/m للنسخ القديمة
    const st = req.query.st === "s" || req.query.v === "m" ? "s" : "p"; const S = cfg[st];
    const allowed = new Set([S.a, S.b, ...Object.values(S.subj || {})].filter(Boolean));
    const voice = allowed.has(String(req.query.v || "")) ? String(req.query.v) : S.a;
    const rate = S.rate;
    const text = String(req.query.t || "").replace(/\s+/g, " ").trim();
    if (!text || text.length > 400 || !/[ء-ي]/.test(text) || /[<>{}]/.test(text)) return res.status(400).send("bad");
    const k = ttsKey(voice, rate, text);
    let buf = TTS_MEM.get(k);
    if (!buf) {
      const ref = db.collection("ttsCache").doc(k); const ds = await ref.get();
      if (ds.exists) buf = Buffer.from(ds.data().b, "base64");
      else {
        const day = db.collection("config").doc("ttsDay_" + new Date().toISOString().slice(0, 10));
        const used = await db.runTransaction(async (tx) => { const s = await tx.get(day); const n = (s.exists ? s.data().chars : 0) + text.length;
          if (n > TTS_DAY_CAP) return -1; tx.set(day, {chars: n, items: FieldValue.increment(1)}, {merge: true}); return n; });
        if (used < 0) return res.status(429).send("cap");
        buf = await synth(text, voice, rate);
        await ref.set({b: buf.toString("base64"), t: text.slice(0, 400), v: voice, r: rate, n: text.length, at: FieldValue.serverTimestamp()});
        db.collection("config").doc("ttsStats").set({items: FieldValue.increment(1), chars: FieldValue.increment(text.length)}, {merge: true}).catch(() => {});
      }
      if (TTS_MEM.size > 3000) TTS_MEM.clear();
      TTS_MEM.set(k, buf);
    }
    res.set("Content-Type", "audio/mpeg").set("Cache-Control", "public, max-age=31536000, immutable").send(buf);
  } catch (e) {
    logger.error("tts endpoint", e.message);
    res.status(e.status === 403 ? 503 : 500).send("error");
  }
});

exports.adminTts = onCall({memory: "256MiB"}, async (req) => {
  await needAdmin(req, "tts");
  try { return await adminTtsOp(req); } catch (e) {
    if (e instanceof HttpsError) throw e;
    logger.error("adminTts", e && e.stack);
    throw new HttpsError("failed-precondition", "خطأ في خدمة الأصوات: " + String((e && e.message) || e).slice(0, 200));
  }
});
async function adminTtsOp(req) {
  const d = req.data || {}; const op = String(d.op || "");
  if (op === "voices") {
    const r = await fetch("https://texttospeech.googleapis.com/v1/voices?languageCode=ar-XA", {headers: {"Authorization": "Bearer " + await gcpToken()}});
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { logger.error("tts voices", r.status, JSON.stringify(j.error || {}).slice(0, 400));
      throw new HttpsError("failed-precondition", r.status === 403 ? "خدمة Text-to-Speech غير مفعّلة في مشروع Google Cloud بعد (أو لا صلاحية): " + String((j.error && j.error.message) || "").slice(0, 160) : "تعذّر جلب الأصوات (" + r.status + ")"); }
    const st = await db.collection("config").doc("ttsStats").get();
    const today = await db.collection("config").doc("ttsDay_" + new Date().toISOString().slice(0, 10)).get();
    return {voices: (j.voices || []).map((v) => ({name: v.name, g: v.ssmlGender})).sort((a, b) => a.name.localeCompare(b.name)),
      stats: st.exists ? st.data() : {}, today: today.exists ? today.data().chars : 0, def: TTS_DEF, cfg: ttsNorm((await getAccessCfg()).tts || {})};
  }
  if (op === "try") {
    const text = str(d.text, 400); const voice = str(d.voice, 60);
    if (!text || !VOICE_RE.test(voice)) throw new HttpsError("invalid-argument", "النص أو الصوت غير صحيح");
    try { const b = await synth(text, voice, Math.min(1.3, Math.max(0.6, Number(d.rate) || 1))); return {audio: b.toString("base64")}; }
    catch (e) { throw new HttpsError("failed-precondition", e.status === 403 ? "خدمة Text-to-Speech غير مفعّلة في مشروع Google Cloud بعد" : "تعذّر توليد الصوت: " + str(e.message, 150)); }
  }
  if (op === "cfg") {
    const tts = ttsNorm({on: !!d.on, p: d.p, s: d.s, f: d.f, m: d.m, rate: d.rate});
    await db.collection("config").doc("access").update({tts}).catch(() => db.collection("config").doc("access").set({tts}, {merge: true})); ACCESS = null; return {tts};
  }
  throw new HttpsError("invalid-argument", "عملية غير معروفة");
}


// ===================== الإشعارات (Firebase Cloud Messaging — Web Push) =====================
// pushTokens/{sha1}: {t, uid (صاحب الحساب), pid, kid, role, os, at, seen}
// config/push: {auto: {اسم القاعدة: {on, title, body}}} — قواعد آلية تُشغَّل يومياً 18:30 بتوقيت ليبيا + أحداث فورية
// pushState/{uid}: آخر وقت أُرسل فيه كل نوع (منع التكرار)
const PUSH_AUTO = {
  nosub: {on: true, title: "منصة المجتهد ما زالت مفتوحة لكم 🎒", body: "جرّبوا الدروس المجانية مع أبنائكم، والاشتراك بسعر رمزي يفتح كل الدروس."},
  inactive: {on: true, title: "اشتقنا لكم في المجتهد 💙", body: "مرّ وقت على آخر درس. خمس دقائق اليوم تصنع فرقاً كبيراً — هيا نكمل!"},
  expiry: {on: true, title: "اشتراكك ينتهي بعد {days} أيام ⏳", body: "جدّد اشتراكك الآن حتى لا تتوقف الدروس."},
  lowday: {on: true, title: "", body: ""},
  weekly: {on: true, title: "", body: ""},
  streak: {on: true, title: "لا تكسر سلسلتك! 🔥", body: "سلسلتك {n} أيام. درس قصير اليوم يحافظ عليها."},
  events: {on: true, title: "", body: ""},
  staff: {on: true, title: "", body: ""},
};
async function pushCfg() { const d = await db.collection("config").doc("push").get(); const a = (d.exists && d.data().auto) || {};
  const out = {}; for (const k in PUSH_AUTO) out[k] = {...PUSH_AUTO[k], ...(a[k] || {})}; return out; }
const tokId = (t) => crypto.createHash("sha1").update(t).digest("hex");
const firstName = (n) => String(n || "").trim().split(/\s+/)[0] || "ابنك";
const tripDay = (ms = Date.now()) => new Date(ms + 2 * HOUR).toISOString().slice(0, 10);

async function sendDocs(docs, msg, log) {
  const seen = new Set(); const list = docs.filter((d) => { const t = d.data().t; if (!t || seen.has(t)) return false; seen.add(t); return true; });
  let ok = 0, fail = 0;
  for (let i = 0; i < list.length; i += 500) {
    const part = list.slice(i, i + 500);
    const r = await admin.messaging().sendEachForMulticast({tokens: part.map((d) => d.data().t),
      data: {title: String(msg.title || "المجتهد").slice(0, 120), body: String(msg.body || "").slice(0, 400), link: String(msg.link || "#home").slice(0, 200), tag: String(msg.tag || "")},
      webpush: {headers: {Urgency: "high", TTL: "172800"}}});
    r.responses.forEach((x, j) => { if (x.success) ok++; else { fail++; const c = (x.error && x.error.code) || "";
      if (/registration-token-not-registered|invalid-registration-token|invalid-argument/.test(c)) part[j].ref.delete().catch(() => {}); } });
  }
  if (log) await db.collection("pushLog").add({...log, title: msg.title, body: msg.body, link: msg.link || "", n: list.length, ok, fail, at: FieldValue.serverTimestamp()}).catch(() => {});
  return {n: list.length, ok, fail};
}
const tokensOf = async (uid, onlyAdult = true) => (await db.collection("pushTokens").where("uid", "==", uid).get()).docs.filter((d) => !onlyAdult || !d.data().kid);
async function pushUser(uid, msg, opt = {}) {
  try { const cfg = await pushCfg(); if (opt.rule && cfg[opt.rule] && !cfg[opt.rule].on) return;
    const docs = await tokensOf(uid, opt.adultsOnly !== false); if (docs.length) await sendDocs(docs, msg); } catch (e) { logger.warn("pushUser", e.message); }
}
// تنبيه فريق الإدارة (المالك + المشرفون أصحاب الصلاحية)
async function pushStaff(perm, msg) {
  try { const cfg = await pushCfg(); if (!cfg.staff.on) return;
    const a = await db.collection("config").doc("admins").get(); const A = a.exists ? a.data() : {};
    const uids = new Set(A.uids || []);
    Object.entries(A.staff || {}).forEach(([u, x]) => { if (!x.off && (x.perms || []).includes(perm)) uids.add(u); });
    const owners = await db.collection("users").where("email", "in", OWNER_EMAILS).get().catch(() => ({docs: []}));
    owners.docs.forEach((d) => uids.add(d.id));
    for (const u of uids) { const docs = await tokensOf(u); if (docs.length) await sendDocs(docs, {...msg, link: msg.link || "#admin"}); }
  } catch (e) { logger.warn("pushStaff", e.message); }
}

exports.pushReg = onCall(async (req) => {
  const uid = needUser(req); const tk = req.auth.token || {}; const d = req.data || {};
  const t = String(d.token || "");
  if (t && !/^[A-Za-z0-9:_\-.]{100,400}$/.test(t)) throw new HttpsError("invalid-argument", "رمز غير صحيح");
  let owner = uid, pid = String(d.pid || "me").slice(0, 30), kid = false;
  if (tk.kidOf) { owner = tk.kidOf; pid = tk.kidPid; kid = true; } else if (tk.coOf) owner = await ownerOf(req);
  else if (tk.firebase && tk.firebase.sign_in_provider === "anonymous") throw new HttpsError("permission-denied", "سجّل الدخول أولاً");
  const us = await db.collection("users").doc(owner).get(); const role = kid ? "kid" : (us.exists ? us.data().role : "");
  if (t) await db.collection("pushTokens").doc(tokId(t)).set({t, uid: owner, by: uid, pid, kid, role, os: String(d.os || "").slice(0, 12),
    at: FieldValue.serverTimestamp(), seen: Date.now()}, {merge: true});
  if (d.off && t) await db.collection("pushTokens").doc(tokId(t)).delete();
  await db.collection("users").doc(owner).set({lastSeen: Date.now()}, {merge: true}).catch(() => {});
  return {ok: true};
});

// ---------- الجمهور: من يستلم؟ ----------
async function audience(a) {
  const [toks, users, subs, profs] = await Promise.all([db.collection("pushTokens").get(),
    db.collection("users").select("role", "phone", "lastSeen", "createdAt").get(), db.collection("subscriptions").get(), db.collectionGroup("profiles").select("grade", "stats.lastDay").get()]);
  const now = Date.now(); const U = {}; users.docs.forEach((d) => { U[d.id] = d.data(); });
  const subbed = new Set(); subs.docs.forEach((d) => { const x = d.data(); if (x.kind !== "trial" && x.active !== false && x.end && x.end.toMillis() > now) subbed.add(x.uid); });
  const grades = {}, last = {};
  profs.docs.forEach((d) => { const uid = d.ref.parent.parent.id; const x = d.data(); (grades[uid] = grades[uid] || new Set()).add(String(x.grade || ""));
    (grades[uid + "/" + d.id] = new Set([String(x.grade || "")]));
    const ld = x.stats && x.stats.lastDay; if (ld) { const t = Date.parse(ld); if (t && t > (last[uid] || 0)) last[uid] = t; } });
  const phone = a.phone ? toE164(String(a.phone)) : null;
  return toks.docs.filter((d) => {
    const x = d.data(); const u = U[x.uid] || {};
    if (phone) return u.phone === phone && !x.kid;
    if (a.role === "kids") { if (!x.kid && !(u.role === "student")) return false; }
    else if (a.role && a.role !== "all") { if (x.kid || u.role !== a.role) return false; }
    else if (x.kid && !a.kids) return false;
    if (a.sub === "yes" && !subbed.has(x.uid)) return false;
    if (a.sub === "no" && subbed.has(x.uid)) return false;
    if (a.grade) { const g = x.kid ? grades[x.uid + "/" + x.pid] : grades[x.uid]; if (!g || !g.has(String(a.grade))) return false; }
    if (a.inactive) { const l = Math.max(u.lastSeen || 0, last[x.uid] || 0); if (now - l < a.inactive * DAY) return false; }
    return true;
  });
}
const cleanAud = (a = {}) => ({role: ["all", "parent", "student", "teacher", "kids"].includes(a.role) ? a.role : "all", sub: ["yes", "no"].includes(a.sub) ? a.sub : "",
  grade: GRADES.includes(String(a.grade || "")) ? String(a.grade) : "", inactive: [7, 14, 30, 60].includes(Number(a.inactive)) ? Number(a.inactive) : 0,
  phone: /^09[1-5]\d{7}$/.test(String(a.phone || "")) ? String(a.phone) : "", kids: !!a.kids});

exports.adminPush = onCall({memory: "512MiB", timeoutSec: 300}, async (req) => {
  const by = await needAdmin(req, "push");
  const d = req.data || {}; const op = String(d.op || "");
  if (op === "info") {
    const [toks, log, cfg] = await Promise.all([db.collection("pushTokens").get(), db.collection("pushLog").orderBy("at", "desc").limit(20).get(), pushCfg()]);
    const by = {parent: 0, student: 0, teacher: 0, kid: 0}; toks.docs.forEach((x) => { const r = x.data().role || "?"; by[r] = (by[r] || 0) + 1; });
    return {devices: toks.size, byRole: by, cfg, log: log.docs.map((x) => ({...x.data(), at: ms(x.data().at)}))};
  }
  if (op === "count") return {n: (await audience(cleanAud(d.aud))).length};
  if (op === "send") {
    const title = str(d.title, 120), body = str(d.body, 400), link = /^#[a-z0-9-]{1,60}$/.test(d.link || "") ? d.link : "#home";
    if (title.length < 3 || body.length < 3) throw new HttpsError("invalid-argument", "اكتب العنوان والنص");
    const aud = cleanAud(d.aud);
    const docs = await audience(aud);
    if (!docs.length) throw new HttpsError("failed-precondition", "لا يوجد أحد في هذه الفئة فعّل الإشعارات بعد");
    return await sendDocs(docs, {title, body, link}, {by, aud, manual: true});
  }
  if (op === "test") { const docs = await tokensOf(req.auth.uid, false); if (!docs.length) throw new HttpsError("failed-precondition", "فعّل الإشعارات على جهازك أولاً من «حسابي»");
    return await sendDocs(docs, {title: str(d.title, 120) || "تجربة إشعار ✅", body: str(d.body, 400) || "الإشعارات تعمل على جهازك.", link: d.link || "#home"}); }
  if (op === "cfg") {
    await needAdmin(req, "owner");
    const auto = {}; for (const k in PUSH_AUTO) { const x = (d.auto || {})[k] || {}; auto[k] = {on: !!x.on, title: str(x.title, 120), body: str(x.body, 400)}; }
    await db.collection("config").doc("push").set({auto}, {merge: true}); return {cfg: await pushCfg()};
  }
  throw new HttpsError("invalid-argument", "عملية غير معروفة");
});

// ---------- القواعد الآلية: كل يوم 18:30 بتوقيت ليبيا ----------
exports.pushAuto = onSchedule({schedule: "30 18 * * *", timeZone: "Africa/Tripoli", memory: "512MiB", timeoutSeconds: 540}, async () => {
  const cfg = await pushCfg(); const now = Date.now(); const today = tripDay(now); const dow = new Date(now + 2 * HOUR).getUTCDay(); // 4 = الخميس
  const [toks, users, subs, profs, states] = await Promise.all([db.collection("pushTokens").get(), db.collection("users").get(), db.collection("subscriptions").get(),
    db.collectionGroup("profiles").get(), db.collection("pushState").get()]);
  const T = {}; toks.docs.forEach((d) => { const x = d.data(); (T[x.uid] = T[x.uid] || []).push(d); });
  const S = {}; states.docs.forEach((d) => { S[d.id] = d.data(); });
  const active = {}; subs.docs.forEach((d) => { const x = d.data(); if (x.kind !== "trial" && x.active !== false && x.end && x.end.toMillis() > now) (active[x.uid] = active[x.uid] || []).push(x); });
  await refActivate().catch((e) => logger.warn("refActivate", e.message));
  const P = {}; profs.docs.forEach((d) => { const uid = d.ref.parent.parent.id; (P[uid] = P[uid] || []).push({id: d.id, ...d.data()}); });
  const fill = (t, v) => String(t || "").replace(/\{(\w+)\}/g, (m, k) => v[k] != null ? v[k] : m);
  const sent = {}; const mark = async (uid, k, extra = {}) => { await db.collection("pushState").doc(uid).set({[k]: now, ...extra}, {merge: true}); };
  const adultDocs = (uid) => (T[uid] || []).filter((d) => !d.data().kid);
  const kidDocs = (uid, pid) => (T[uid] || []).filter((d) => d.data().kid && d.data().pid === pid);
  const cnt = (k) => { sent[k] = (sent[k] || 0) + 1; };
  for (const u of users.docs) {
    const uid = u.id, x = u.data(), st = S[uid] || {}, subsU = active[uid] || [], profsU = (P[uid] || []);
    const kids = profsU.filter((p) => p.id !== "me");
    const lastAct = Math.max(x.lastSeen || 0, ...profsU.map((p) => (p.stats && Date.parse(p.stats.lastDay)) || 0));
    const created = (x.createdAt && x.createdAt.toMillis) ? x.createdAt.toMillis() : 0;
    const adults = adultDocs(uid);
    try {
      // 1) سجّل ولم يشترك: بعد 2 و7 و14 و30 يوماً
      if (cfg.nosub.on && adults.length && !subsU.length && created && ["parent", "student"].includes(x.role)) {
        const age = Math.floor((now - created) / DAY); const step = [2, 7, 14, 30].filter((n) => age >= n).pop();
        if (step && (st.nosubStep || 0) < step) { await sendDocs(adults, {title: cfg.nosub.title, body: cfg.nosub.body, link: x.role === "parent" ? "#subscribe" : "#home", tag: "nosub"}); await mark(uid, "nosub", {nosubStep: step}); cnt("nosub"); continue; }
      }
      // 2) انتهاء الاشتراك بعد 3 أيام
      if (cfg.expiry.on && adults.length && subsU.length) {
        const maxEnd = Math.max(...subsU.map((s) => s.end.toMillis())); const left = Math.ceil((maxEnd - now) / DAY);
        if (left <= 3 && left >= 1 && (!st.expiry || now - st.expiry > 5 * DAY)) { await sendDocs(adults, {title: fill(cfg.expiry.title, {days: left}), body: cfg.expiry.body, link: "#subscribe", tag: "expiry"}); await mark(uid, "expiry"); cnt("expiry"); continue; }
      }
      // 3) غياب طويل: 14 يوماً بلا نشاط، ومرة كل 14 يوماً
      if (cfg.inactive.on && adults.length && lastAct && now - lastAct > 14 * DAY && (!st.inactive || now - st.inactive > 14 * DAY)) {
        await sendDocs(adults, {title: cfg.inactive.title, body: cfg.inactive.body, link: "#home", tag: "inactive"}); await mark(uid, "inactive"); cnt("inactive"); continue;
      }
      // 4) تقرير أسبوعي لولي الأمر (الخميس)
      if (cfg.weekly.on && dow === 4 && adults.length && kids.length && st.weekly !== today) {
        const lines = kids.map((k) => { const m = (k.stats && k.stats.mins) || {}; let w = 0; for (let i = 0; i < 7; i++) w += m[tripDay(now - i * DAY)] || 0;
          return firstName(k.name) + ": " + Math.round(w) + " دقيقة"; });
        await sendDocs(adults, {title: "📊 تقرير الأسبوع", body: "وقت الدراسة هذا الأسبوع — " + lines.join("، ") + ". اضغط لرؤية التفاصيل.", link: "#who", tag: "weekly"});
        await mark(uid, "weeklyAt", {weekly: today}); cnt("weekly"); continue;
      }
      // 5) ابنك درس اليوم أقل من هدفه (مرتان أسبوعياً على الأكثر لكل ابن)
      if (cfg.lowday.on && adults.length && kids.length && dow !== 5 && dow !== 6) {
        const low = kids.find((k) => { const g = Number(k.goal || (k.stats && k.stats.goal) || 0); const m = Number(((k.stats && k.stats.mins) || {})[today] || 0);
          const recent = k.stats && k.stats.lastDay && now - Date.parse(k.stats.lastDay) < 7 * DAY; const lk = "low_" + k.id;
          return g > 0 && recent && m < g * 0.5 && (!st[lk] || now - st[lk] > 3.5 * DAY); });
        if (low) { const m = Math.round(((low.stats && low.stats.mins) || {})[today] || 0); const g = Number(low.goal || low.stats.goal);
          await sendDocs(adults, {title: "📚 " + firstName(low.name) + " درس اليوم " + m + " دقيقة", body: "هدفه اليومي " + g + " دقيقة. شجّعه على درس قصير قبل النوم 💪", link: "#kid-" + low.id, tag: "lowday"});
          await mark(uid, "low_" + low.id); cnt("lowday"); continue; }
      }
      // 6) سلسلة الطالب (على جهاز الطالب أو جهاز الابن)
      if (cfg.streak.on) for (const p of profsU) {
        const s2 = p.stats || {}; const devs = p.id === "me" ? (x.role === "student" ? adults : []) : kidDocs(uid, p.id);
        if (devs.length && (s2.streak || 0) >= 2 && s2.lastDay && s2.lastDay !== today && dow !== 5 && dow !== 6 && st["streak_" + p.id] !== today) {
          await sendDocs(devs, {title: cfg.streak.title, body: fill(cfg.streak.body, {n: s2.streak}), link: "#home", tag: "streak"}); await mark(uid, "s", {["streak_" + p.id]: today}); cnt("streak"); }
      }
    } catch (e) { logger.warn("pushAuto user", uid, e.message); }
  }
  await db.collection("pushLog").add({auto: true, title: "الإشعارات الآلية اليومية", body: JSON.stringify(sent), n: Object.values(sent).reduce((a, b) => a + b, 0), at: FieldValue.serverTimestamp()});
  logger.info("pushAuto", sent);
});

// ===================== لوحة الأبطال والنشاط للإدارة =====================
// تُحسب من إحصاءات كل ملف طالب المتزامنة (stats.log / stats.mins) — تشمل المشتركين والتجريبيين المسجّلين
const ptsOf = (L, m) => (L.st || 0) * 10 + (L.r || 0) * 2 + Math.round(m || 0);
exports.adminActivity = onCall({memory: "1GiB", timeoutSec: 120}, async (req) => {
  await needAdmin(req, "stats");
  const d = req.data || {}; const op = String(d.op || "overview");
  if (op === "student") {
    const uid = str(d.uid, 60), pid = str(d.pid, 40);
    const [ps, us, subs] = await Promise.all([db.collection("users").doc(uid).collection("profiles").doc(pid).get(), db.collection("users").doc(uid).get(),
      db.collection("subscriptions").where("uid", "==", uid).get()]);
    if (!ps.exists) throw new HttpsError("not-found", "الطالب غير موجود");
    const p = ps.data(), u = us.exists ? us.data() : {}, st = p.stats || {};
    const now = Date.now();
    const act = subs.docs.map((x) => x.data()).filter((x) => x.active !== false && x.end && x.end.toMillis() > now)
        .map((x) => ({name: x.planName || x.kind, end: x.end.toMillis(), gift: x.kind === "gift"}));
    return {name: p.name || "", grade: p.grade || "", av: p.avatar || "🙂", goal: p.goal || st.goal || 0,
      owner: {name: u.name || "", role: u.role || "", phone: String(u.phone || "").replace("+218", "0"), email: u.email || "", lastSeen: u.lastSeen || 0, created: ms(u.createdAt)},
      stats: {stars: st.stars || 0, level: st.level || "", streak: st.streak || 0, lastDay: st.lastDay || "", mins: st.mins || {}, log: st.log || {}, lr: st.lr || {}, qz: (st.qz || []).slice(-60), act: (st.act || []).slice(-60)},
      subs: act};
  }
  // overview: النشاط اليومي + الترتيب لفترة وصف
  const [profs, users, subs] = await Promise.all([db.collectionGroup("profiles").get(), db.collection("users").select("name", "role", "phone").get(), db.collection("subscriptions").get()]);
  const now = Date.now(); const U = {}; users.docs.forEach((x) => { U[x.id] = x.data(); });
  const subbed = new Set(); subs.docs.forEach((x) => { const s = x.data(); if (s.active !== false && s.end && s.end.toMillis() > now) subbed.add(s.uid); });
  const days = []; for (let i = 0; i < 30; i++) days.push(tripDay(now - i * DAY));
  const period = {today: days.slice(0, 1), yesterday: days.slice(1, 2), week: days.slice(0, 7), month: days.slice(0, 30)}[d.period] || days.slice(0, 1);
  const grade = GRADES.includes(String(d.grade || "")) ? String(d.grade) : "";
  const dau = Object.fromEntries(days.map((x) => [x, 0])); const byGrade = {}; const rows = [];
  let total = 0, everActive = 0;
  for (const doc of profs.docs) {
    const p = doc.data(); const st = p.stats; if (!st) continue;
    const uid = doc.ref.parent.parent.id; total++;
    const log = st.log || {}, mins = st.mins || {};
    let any = false;
    for (const day of days) { const L = log[day] || {}; if ((mins[day] || 0) > 0 || L.r || L.w || L.st) { dau[day]++; any = true; if (day === days[0]) byGrade[p.grade || "?"] = (byGrade[p.grade || "?"] || 0) + 1; } }
    if (any) everActive++;
    if (grade && String(p.grade || "") !== grade) continue;
    let pts = 0, r = 0, w = 0, s2 = 0, m = 0, lessons = new Set();
    for (const day of period) { const L = log[day] || {}; pts += ptsOf(L, mins[day]); r += L.r || 0; w += L.w || 0; s2 += L.st || 0; m += mins[day] || 0; (L.l || []).forEach((x) => lessons.add(x)); }
    if (!pts && !m) continue;
    const u = U[uid] || {};
    rows.push({uid, pid: doc.id, name: p.name || u.name || "", av: p.avatar || "🙂", grade: String(p.grade || ""), pts, r, w, st: s2, m: Math.round(m), lessons: lessons.size,
      acc: r + w ? Math.round(r * 100 / (r + w)) : null, stars: st.stars || 0, level: st.level || "", streak: st.streak || 0, sub: subbed.has(uid), role: u.role || "",
      owner: doc.id === "me" ? "" : (u.name || "")});
  }
  rows.sort((a, b) => b.pts - a.pts);
  return {days, dau, byGrade, total, everActive, rows: rows.slice(0, 300), count: rows.length};
});


// ===================== الدعوات والأيام المجانية =====================
// config/access.ref = {on, reg: أيام للداعي عند تسجيل صديق نشِط, pay: أيام إضافية عند دفع الصديق, invitee: أيام للمدعو, cap: حد أيام التسجيلات, trialN: عدد الدروس المفتوحة من كل كتاب}
const REF_DEF = {on: true, reg: 2, pay: 5, invitee: 3, cap: 30, trialN: 5};
const refCfg = async () => ({...REF_DEF, ...((await getAccessCfg()).ref || {})});
// يضيف أياماً: المشترك تُمدَّد نهاية اشتراكه، وغير المشترك يحصل على «أيام مجانية» تفتح أول N دروس من كل كتاب
async function grantDays(uid, days, why) {
  if (!(days > 0)) return null;
  const now = Date.now(); const subs = (await db.collection("subscriptions").where("uid", "==", uid).get()).docs;
  const paid = subs.filter((d) => { const x = d.data(); return x.kind !== "trial" && x.active !== false && x.end && x.end.toMillis() > now; })
      .sort((a, b) => b.data().end.toMillis() - a.data().end.toMillis());
  if (paid.length) { await paid[0].ref.update({end: Timestamp.fromMillis(paid[0].data().end.toMillis() + days * DAY), bonusDays: FieldValue.increment(days)}); return "extended"; }
  const cfg = await refCfg(); const ref = db.collection("subscriptions").doc("trial_" + uid); const cur = await ref.get();
  const base = cur.exists && cur.data().end && cur.data().end.toMillis() > now ? cur.data().end.toMillis() : now;
  // صف واحد فقط: يبقى كما اختاره سابقاً، والطالب يُضبط على صفه تلقائياً
  let grades = (cur.exists && cur.data().scope && cur.data().scope.grades) || [];
  if (!grades.length) { const [us, me] = await Promise.all([db.collection("users").doc(uid).get(), db.collection("users").doc(uid).collection("profiles").doc("me").get()]);
    if (us.exists && us.data().role === "student" && me.exists && GRADES.includes(String(me.data().grade || ""))) grades = [String(me.data().grade)]; }
  await ref.set({uid, kind: "trial", plan: "trial", planName: "أيام مجانية — صف واحد، أول " + cfg.trialN + " دروس من كل كتاب", scope: {grades, subjects: ["*"], any: true, trialN: cfg.trialN},
    amount: 0, orderId: null, start: FieldValue.serverTimestamp(), end: Timestamp.fromMillis(base + days * DAY), active: true, why: String(why || "").slice(0, 40), days: FieldValue.increment(days)}, {merge: true});
  return "trial";
}
const REF_ABC = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
exports.refMine = onCall(async (req) => {
  const uid = needUser(req); const tk = req.auth.token || {};
  if (tk.kidOf || (tk.firebase && tk.firebase.sign_in_provider === "anonymous")) throw new HttpsError("permission-denied", "سجّل الدخول بحسابك");
  const owner = tk.coOf ? await ownerOf(req) : uid;
  const uRef = db.collection("users").doc(owner); const us = await uRef.get(); if (!us.exists) throw new HttpsError("failed-precondition", "أكمل بيانات حسابك أولاً");
  let code = us.data().refCode;
  if (!code) {
    for (let i = 0; i < 6 && !code; i++) { const c = Array.from(crypto.randomBytes(6)).map((b) => REF_ABC[b % REF_ABC.length]).join("");
      const cr = db.collection("refCodes").doc(c); const ok = await db.runTransaction(async (tx) => { if ((await tx.get(cr)).exists) return false; tx.set(cr, {uid: owner, at: FieldValue.serverTimestamp()}); return true; });
      if (ok) code = c; }
    await uRef.set({refCode: code}, {merge: true});
  }
  const refs = (await db.collection("refs").where("by", "==", owner).get()).docs.map((x) => x.data());
  return {code, cfg: await refCfg(), stats: {invited: refs.length, active: refs.filter((x) => x.active).length, paid: refs.filter((x) => x.paid).length,
    days: refs.reduce((a, x) => a + (x.regDays || 0) + (x.payDays || 0), 0)}};
});
exports.refClaim = onCall(async (req) => {
  const uid = needUser(req); const tk = req.auth.token || {};
  if (tk.kidOf || tk.coOf || (tk.firebase && tk.firebase.sign_in_provider === "anonymous")) return {ok: false};
  const cfg = await refCfg(); if (!cfg.on) return {ok: false, off: true};
  const code = String((req.data && req.data.code) || "").toUpperCase(); if (!/^[2-9A-HJ-NP-Z]{6}$/.test(code)) throw new HttpsError("invalid-argument", "رمز الدعوة غير صحيح");
  const cs = await db.collection("refCodes").doc(code).get(); if (!cs.exists) throw new HttpsError("not-found", "رمز الدعوة غير موجود");
  const by = cs.data().uid; if (by === uid) throw new HttpsError("failed-precondition", "لا يمكنك استعمال رابطك أنت");
  const uRef = db.collection("users").doc(uid);
  const done = await db.runTransaction(async (tx) => {
    const us = await tx.get(uRef); if (!us.exists) throw new HttpsError("failed-precondition", "أكمل بيانات حسابك أولاً");
    const u = us.data(); if (u.refBy) return false;
    const created = u.createdAt && u.createdAt.toMillis ? u.createdAt.toMillis() : 0;
    if (!created || Date.now() - created > 3 * DAY) throw new HttpsError("failed-precondition", "رابط الدعوة للحسابات الجديدة فقط");
    tx.set(uRef, {refBy: by}, {merge: true});
    tx.set(db.collection("refs").doc(uid), {by, uid, name: u.name || "", at: FieldValue.serverTimestamp(), active: false, paid: false, regDays: 0, payDays: 0});
    return true;
  });
  if (!done) return {ok: false, already: true};
  const r = await grantDays(uid, cfg.invitee, "invitee");
  pushUser(by, {title: "🎁 عائلة جديدة سجّلت من رابطك", body: "ستحصل على " + cfg.reg + " يوم مجاني عندما يبدأ أبناؤهم الدراسة، و" + cfg.pay + " أيام أخرى إذا اشتركوا.", link: "#account"}, {rule: "events"});
  return {ok: true, days: cfg.invitee, kind: r};
});
// الصديق صار نشِطاً (درس فعلاً) → أيام التسجيل للداعي (حتى الحد الأقصى)
async function refActivate() {
  const cfg = await refCfg(); if (!cfg.on) return;
  const pend = await db.collection("refs").where("active", "==", false).get();
  for (const d of pend.docs) {
    const x = d.data(); const ps = await db.collection("users").doc(x.uid).collection("profiles").get();
    if (!ps.docs.some((p) => p.data().stats && p.data().stats.lastDay)) continue;
    const mine = (await db.collection("refs").where("by", "==", x.by).get()).docs.reduce((a, r) => a + (r.data().regDays || 0), 0);
    const give = Math.max(0, Math.min(cfg.reg, cfg.cap - mine));
    await d.ref.update({active: true, regDays: give, activeAt: FieldValue.serverTimestamp()});
    if (give) { await grantDays(x.by, give, "ref-reg"); await pushUser(x.by, {title: "🎉 حصلت على " + give + " يوم مجاني", body: "عائلة دعوتها بدأت الدراسة في المجتهد. شكراً لك!", link: "#account"}, {rule: "events"}); }
  }
}
// الصديق دفع → أيام إضافية للداعي (بلا حد)
async function refPaid(uid) {
  const cfg = await refCfg(); if (!cfg.on) return;
  const r = db.collection("refs").doc(uid); const rs = await r.get(); if (!rs.exists || rs.data().paid) return;
  await r.update({paid: true, payDays: cfg.pay, paidAt: FieldValue.serverTimestamp()});
  await grantDays(rs.data().by, cfg.pay, "ref-pay");
  await pushUser(rs.data().by, {title: "🎉 حصلت على " + cfg.pay + " أيام مجانية", body: "عائلة دعوتها اشتركت في المجتهد. شكراً لأنك تنشر الخير!", link: "#account"}, {rule: "events"});
}
// اختيار صف الأيام المجانية — مرة واحدة ولا يتغير
exports.trialGrade = onCall(async (req) => {
  const uid = needUser(req); const tk = req.auth.token || {}; const owner = tk.coOf ? await ownerOf(req) : uid;
  if (tk.kidOf) throw new HttpsError("permission-denied", "يختار ولي الأمر الصف من حسابه");
  const g = String((req.data && req.data.grade) || ""); if (!GRADES.includes(g)) throw new HttpsError("invalid-argument", "اختر الصف");
  const ref = db.collection("subscriptions").doc("trial_" + owner);
  return await db.runTransaction(async (tx) => {
    const s = await tx.get(ref); if (!s.exists || !s.data().end || s.data().end.toMillis() < Date.now()) throw new HttpsError("failed-precondition", "لا توجد أيام مجانية فعّالة");
    const sc = s.data().scope || {}; if ((sc.grades || []).length) throw new HttpsError("failed-precondition", "الصف مختار مسبقاً ولا يمكن تغييره");
    tx.update(ref, {"scope.grades": [g]}); return {ok: true, grade: g};
  });
});
exports.adminRefs = onCall(async (req) => {
  const d = req.data || {};
  if (d.op === "cfg") {
    await needAdmin(req, "plans");
    const n = (v, lo, hi, def) => { const x = Math.round(Number(v)); return x >= lo && x <= hi ? x : def; };
    const ref = {on: !!d.on, reg: n(d.reg, 0, 30, 2), pay: n(d.pay, 0, 60, 5), invitee: n(d.invitee, 0, 30, 3), cap: n(d.cap, 0, 365, 30), trialN: n(d.trialN, 1, 20, 5)};
    await db.collection("config").doc("access").set({ref}, {merge: true}); ACCESS = null; return {cfg: ref};
  }
  await needAdmin(req, ["plans", "stats"]);
  const refs = (await db.collection("refs").get()).docs.map((x) => x.data()); const by = {};
  refs.forEach((x) => { const b = by[x.by] = by[x.by] || {uid: x.by, invited: 0, active: 0, paid: 0, days: 0}; b.invited++; if (x.active) b.active++; if (x.paid) b.paid++; b.days += (x.regDays || 0) + (x.payDays || 0); });
  const top = Object.values(by).sort((a, b) => b.paid - a.paid || b.active - a.active || b.invited - a.invited).slice(0, 30);
  for (const t of top) { const u = await db.collection("users").doc(t.uid).get(); t.name = u.exists ? u.data().name || "" : ""; t.phone = u.exists ? String(u.data().phone || "").replace("+218", "0") : ""; }
  const since = Date.now() - 30 * DAY;
  const tests = await db.collection("testLogs").where("at", ">", Timestamp.fromMillis(since)).get();
  const tByDay = {}; tests.docs.forEach((x) => { const k = tripDay(x.data().at.toMillis()); tByDay[k] = (tByDay[k] || 0) + 1; });
  return {cfg: await refCfg(), total: {invited: refs.length, active: refs.filter((x) => x.active).length, paid: refs.filter((x) => x.paid).length}, top,
    tests: {n: tests.size, byDay: tByDay, reg: tests.docs.filter((x) => x.data().uid).length}};
});

// ===================== اختبار المستوى المجاني (بدون تسجيل) =====================
exports.testLog = onCall(async (req) => {
  const d = req.data || {}; const g = String(d.g || "");
  if (!GRADES.includes(g) || !["add", "sub", "mul", "div", "mix"].includes(d.skill)) return {ok: false};
  const n = Math.min(40, Math.max(1, Math.round(Number(d.n) || 0))), sc = Math.min(n, Math.max(0, Math.round(Number(d.sc) || 0)));
  await db.collection("testLogs").add({g, skill: d.skill, n, sc, secs: Math.min(3600, Math.max(0, Math.round(Number(d.secs) || 0))), lvl: str(d.lvl, 20),
    uid: req.auth ? req.auth.uid : null, at: FieldValue.serverTimestamp()});
  return {ok: true};
});

// ===================== ساحة المسابقات المباشرة (رياضيات) =====================
// config/access.arena = {on, who: all|sub, every: كل كم ساعة, start: أول ساعة, seats, minP, n: عدد الأسئلة, secs: ثواني السؤال, open: دقائق فتح الحجز قبل البداية, levels:[1..6]}
// arena/{cid}: مسابقة واحدة (موعد + مستوى) · arena/{cid}/p/{uid}: لاعب · arena/{cid}/priv/q: الأسئلة والإجابات (لا تُرسل إلا وقت السؤال)
const ARENA_DEF = {on: false, who: "all", every: 3, start: 0, seats: 20, minP: 2, n: 15, secs: 12, open: 60, levels: [1, 2, 3, 4, 5, 6]};
const ARENA_GAP = 4; // ثوانٍ لعرض الإجابة والترتيب بين الأسئلة
const arenaCfg = async () => ({...ARENA_DEF, ...((await getAccessCfg()).arena || {})});
const LV_AR = ["", "المستوى 1 — بداية", "المستوى 2 — سهل", "المستوى 3 — متوسط", "المستوى 4 — جيد", "المستوى 5 — متقدم", "المستوى 6 — أبطال"];
const gradeLevel = (g) => /^s/.test(String(g)) ? 6 : Math.min(6, Math.max(1, Number(g) - 1)); // الصف 2 → 1 ... الصف 7 فما فوق → 6
// المواعيد بتوقيت ليبيا (UTC+2): كل every ساعات بدءاً من start
function arenaSlots(cfg, from, k) {
  const out = []; const H = 3600000; let t = Math.ceil((from + 2 * H) / H) * H - 2 * H; // بداية الساعة القادمة (UTC ms)
  for (let i = 0; i < 24 * 8 && out.length < k; i++, t += H) { const h = new Date(t + 2 * H).getUTCHours(); if (((h - cfg.start) % cfg.every + cfg.every) % cfg.every === 0) out.push(t); }
  return out;
}
const slotId = (t) => new Date(t + 2 * HOUR).toISOString().slice(0, 13).replace(/[-T]/g, "");
const arenaTimes = (c) => ({openAt: (i) => c.at + i * (c.secs + ARENA_GAP) * 1000, closeAt: (i) => c.at + i * (c.secs + ARENA_GAP) * 1000 + c.secs * 1000, end: c.at + c.n * (c.secs + ARENA_GAP) * 1000});
const RI = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
function arenaQ(lv) {
  const ops = lv <= 1 ? ["+", "−", "×"] : ["+", "−", "×", "÷"]; const op = ops[RI(0, ops.length - 1)]; let a, b, c;
  const AS = [0, 20, 100, 1000, 10000, 100000, 100000][lv];
  if (op === "+") { a = RI(1, Math.floor(AS * .6)); b = RI(1, AS - a); c = a + b; }
  else if (op === "−") { a = RI(Math.ceil(AS / 4), AS); b = RI(1, a - 1); c = a - b; }
  else if (op === "×") {
    if (lv <= 1) { a = [2, 5, 10][RI(0, 2)]; b = RI(1, 10); } else if (lv === 2) { a = RI(2, 6); b = RI(1, 10); } else if (lv === 3) { a = RI(2, 10); b = RI(2, 10); }
    else if (lv === 4) { a = RI(2, 12); b = RI(2, 12); } else if (lv === 5) { a = RI(11, 99); b = RI(2, 9); } else { a = RI(11, 49); b = RI(11, 25); }
    if (Math.random() < .5) [a, b] = [b, a]; c = a * b;
  } else {
    let d, q; if (lv === 2) { d = RI(2, 5); q = RI(1, 10); } else if (lv === 3) { d = RI(2, 10); q = RI(1, 10); } else if (lv === 4) { d = RI(2, 12); q = RI(2, 12); }
    else if (lv === 5) { d = RI(2, 9); q = RI(11, 99); } else { d = RI(11, 25); q = RI(6, 40); }
    a = d * q; b = d; c = q;
  }
  const near = new Set([c]); const cand = [c + 1, c - 1, c + 2, c - 2, c + 10, c - 10, c + (op === "×" ? b : 3), c - (op === "×" ? a : 3), Number(String(c).split("").reverse().join(""))].sort(() => Math.random() - .5);
  for (const x of cand) { if (near.size >= 4) break; if (x >= 0 && x !== c) near.add(x); }
  while (near.size < 4) near.add(c + RI(3, 20));
  return {a, op, b, c, opts: [...near].sort(() => Math.random() - .5)};
}
function arenaQs(lv, n) { const seen = new Set(), qs = []; for (let k = 0; qs.length < n && k < n * 50; k++) { const q = arenaQ(lv); const key = q.a + q.op + q.b; if (!seen.has(key)) { seen.add(key); qs.push(q); } } return qs; }

async function arenaComp(cfg, at, lv, create) {
  const cid = slotId(at) + "_L" + lv; const ref = db.collection("arena").doc(cid); let s = await ref.get();
  if (!s.exists && create) {
    await db.runTransaction(async (tx) => { const s2 = await tx.get(ref); if (s2.exists) return;
      tx.set(ref, {at, lv, n: cfg.n, secs: cfg.secs, seats: cfg.seats, minP: cfg.minP, count: 0, status: "open", createdAt: FieldValue.serverTimestamp()});
      tx.set(ref.collection("priv").doc("q"), {qs: arenaQs(lv, cfg.n)}); });
    s = await ref.get();
  }
  return s.exists ? {cid, ref, ...s.data()} : null;
}
async function arenaFinalize(c) {
  if (c.status === "done" || c.status === "cancelled") return c.status;
  const ps = await c.ref.collection("p").orderBy("score", "desc").limit(3).get();
  const now = Date.now(); const batch = db.batch(); const medals = ["gold", "silver", "bronze"];
  ps.docs.forEach((d, i) => { const p = d.data(); if (!(p.score > 0)) return;
    batch.set(db.collection("arenaWins").doc(c.cid + "_" + d.id), {cid: c.cid, uid: d.id, at: c.at, lv: c.lv, rank: i + 1, medal: medals[i], score: p.score, right: p.right || 0,
      name: p.name, city: p.city || "", school: p.school || "", show: p.show !== false, reg: !!p.reg, createdAt: FieldValue.serverTimestamp()}); });
  batch.update(c.ref, {status: "done", doneAt: now}); await batch.commit();
  ps.docs.slice(0, 3).forEach((d, i) => { if (d.data().reg && d.data().score > 0) pushUser(d.id, {title: ["🥇", "🥈", "🥉"][i] + " مبروك! المركز " + (i + 1) + " في مسابقة " + LV_AR[c.lv], body: "حصلت على وسام جديد في خزانة أوسمتك.", link: "#arena"}, {rule: "events"}); });
  return "done";
}

exports.arena = onCall({memory: "256MiB"}, async (req) => {
  const d = req.data || {}; const op = String(d.op || ""); const cfg = await arenaCfg(); const now = Date.now();
  let isAdm = false; if (req.auth) { try { await needAdmin(req); isAdm = true; } catch (e) { isAdm = false; } }
  if (!cfg.on && !isAdm) return {off: true, now};
  const uid = req.auth && req.auth.uid; const tk = (req.auth && req.auth.token) || {};
  const anon = !!(tk.firebase && tk.firebase.sign_in_provider === "anonymous") && !tk.kidOf;
  if (op === "hub") {
    const slots = arenaSlots(cfg, now - 1000 * (cfg.n * (cfg.secs + ARENA_GAP)), 3);
    const out = [];
    for (const at of slots) {
      const levels = [];
      for (const lv of cfg.levels) { const s = await db.collection("arena").doc(slotId(at) + "_L" + lv).get(); const x = s.exists ? s.data() : {};
        let mine = false; if (uid && s.exists) mine = (await s.ref.collection("p").doc(uid).get()).exists;
        levels.push({lv, cid: slotId(at) + "_L" + lv, count: x.count || 0, status: x.status || "open", mine}); }
      out.push({at, end: at + cfg.n * (cfg.secs + ARENA_GAP) * 1000, openAt: at - cfg.open * 60000, levels});
    }
    const dayStart = Date.parse(tripDay(now) + "T00:00:00Z") - 2 * HOUR;
    const wins = await db.collection("arenaWins").where("at", ">=", dayStart - 6 * DAY).get();
    const heroes = wins.docs.map((x) => x.data()).filter((x) => x.show).sort((a, b) => b.at - a.at || a.rank - b.rank).slice(0, 60)
        .map((x) => ({name: x.name, city: x.city, school: x.school, rank: x.rank, lv: x.lv, at: x.at, score: x.score}));
    let mine = []; if (uid) mine = (await db.collection("arenaWins").where("uid", "==", uid).get()).docs.map((x) => x.data()).sort((a, b) => b.at - a.at).slice(0, 50)
        .map((x) => ({rank: x.rank, lv: x.lv, at: x.at, score: x.score}));
    let grade = null; if (uid && !anon) { const owner = tk.kidOf || uid; const pid = tk.kidPid || (/^[\w-]{1,40}$/.test(String(d.pid || "")) ? String(d.pid) : "me"); const pp = await db.collection("users").doc(owner).collection("profiles").doc(pid).get(); if (pp.exists && pp.data().grade) grade = String(pp.data().grade); }
    return {now, cfg: {who: cfg.who, seats: cfg.seats, minP: cfg.minP, n: cfg.n, secs: cfg.secs, gap: ARENA_GAP, open: cfg.open, levels: cfg.levels, every: cfg.every}, slots: out, heroes, mine,
      minLv: grade ? gradeLevel(grade) : 1, grade, LV: LV_AR};
  }
  needUser(req);
  if (op === "book") {
    if (anon) throw new HttpsError("permission-denied", "سجّل الدخول (مجاناً) أولاً لتدخل المسابقة.");
    if (cfg.who === "sub" && !isAdm) { const owner = tk.kidOf || uid;
      const ok = (await db.collection("subscriptions").where("uid", "==", owner).get()).docs.map((x) => x.data()).some((x) => x.active !== false && x.kind !== "trial" && x.end && x.end.toMillis() > now);
      if (!ok) throw new HttpsError("permission-denied", "المسابقات الآن للمشتركين فقط. اشترك لتشارك 🏆"); }
    const at = Number(d.at), lv = Number(d.lv);
    if (!arenaSlots(cfg, now - 1000, 3).includes(at)) throw new HttpsError("invalid-argument", "موعد غير صحيح");
    if (!cfg.levels.includes(lv)) throw new HttpsError("invalid-argument", "المستوى غير متاح");
    if (now < at - cfg.open * 60000) throw new HttpsError("failed-precondition", "الحجز يُفتح قبل البداية بـ" + cfg.open + " دقيقة");
    if (now >= at) throw new HttpsError("failed-precondition", "بدأت المسابقة");
    const name = str(d.name, 30), city = str(d.city, 30), school = str(d.school, 50);
    if (name.length < 2 || city.length < 2) throw new HttpsError("invalid-argument", "اكتب الاسم والمدينة");
    if (!anon) { const owner = tk.kidOf || uid; const pid = tk.kidPid || (/^[\w-]{1,40}$/.test(String(d.pid || "")) ? String(d.pid) : "me"); const pp = await db.collection("users").doc(owner).collection("profiles").doc(pid).get();
      if (pp.exists && pp.data().grade && lv < gradeLevel(pp.data().grade) && !isAdm) throw new HttpsError("failed-precondition", "مستواك يبدأ من " + LV_AR[gradeLevel(pp.data().grade)]); }
    // حجز واحد في كل موعد
    for (const l of cfg.levels) { if (l === lv) continue; const o = await db.collection("arena").doc(slotId(at) + "_L" + l).collection("p").doc(uid).get(); if (o.exists) throw new HttpsError("already-exists", "حجزت مسابقة أخرى في نفس الموعد"); }
    const c = await arenaComp(cfg, at, lv, true);
    await db.runTransaction(async (tx) => { const cs = await tx.get(c.ref); const pRef = c.ref.collection("p").doc(uid); const ps = await tx.get(pRef);
      if (ps.exists) { tx.update(pRef, {name, city, school, show: d.show !== false}); return; }
      if ((cs.data().count || 0) >= cs.data().seats) throw new HttpsError("resource-exhausted", "اكتملت المقاعد — اختر مستوى آخر أو الموعد القادم");
      tx.set(pRef, {name, city, school, show: d.show !== false, reg: !anon, score: 0, right: 0, ans: {}, at: FieldValue.serverTimestamp()});
      tx.update(c.ref, {count: FieldValue.increment(1)}); });
    return {ok: true, cid: c.cid, at};
  }
  const cid = str(d.cid, 40); const ref = db.collection("arena").doc(cid); const cs = await ref.get();
  if (!cs.exists) throw new HttpsError("not-found", "المسابقة غير موجودة");
  const c = {cid, ref, ...cs.data()}; const T = arenaTimes(c);
  if (c.status === "open" && now >= c.at && (c.count || 0) < c.minP) { await ref.update({status: "cancelled"}); c.status = "cancelled"; }
  const pRef = ref.collection("p").doc(uid);
  if (op === "cancel") { if (now >= c.at) throw new HttpsError("failed-precondition", "بدأت المسابقة");
    await db.runTransaction(async (tx) => { const ps = await tx.get(pRef); if (!ps.exists) return; tx.delete(pRef); tx.update(ref, {count: FieldValue.increment(-1)}); }); return {ok: true}; }
  if (op === "room") {
    const ps = await ref.collection("p").orderBy("at").limit(60).get(); const me = ps.docs.find((x) => x.id === uid);
    return {now, cid, at: c.at, lv: c.lv, lvName: LV_AR[c.lv], n: c.n, secs: c.secs, gap: ARENA_GAP, seats: c.seats, minP: c.minP, count: c.count || 0, status: c.status,
      players: ps.docs.map((x) => ({name: x.data().name, city: x.data().city})), joined: !!me};
  }
  const ps = await pRef.get(); if (!ps.exists) throw new HttpsError("permission-denied", "أنت غير مسجّل في هذه المسابقة");
  if (c.status === "cancelled") return {cancelled: true, now};
  if (op === "q") {
    const i = Math.floor(Number(d.i)); if (!(i >= 0 && i < c.n)) throw new HttpsError("invalid-argument", "سؤال غير صحيح");
    if (now < T.openAt(i) - 800) return {wait: T.openAt(i) - now, now};
    const qd = await ref.collection("priv").doc("q").get(); const q = qd.data().qs[i];
    if (c.status === "open") ref.update({status: "live"}).catch(() => {});
    return {now, i, a: q.a, op: q.op, b: q.b, opts: q.opts, openAt: T.openAt(i), closeAt: T.closeAt(i)};
  }
  if (op === "a") {
    const i = Math.floor(Number(d.i)); if (!(i >= 0 && i < c.n)) throw new HttpsError("invalid-argument", "سؤال غير صحيح");
    if (now < T.openAt(i) - 500 || now > T.closeAt(i) + 1500) return {late: true, now};
    const qd = await ref.collection("priv").doc("q").get(); const q = qd.data().qs[i];
    const ok = Number(d.v) === q.c; const el = Math.max(0, Math.min(c.secs * 1000, now - T.openAt(i)));
    const pts = ok ? 500 + Math.round(500 * (1 - el / (c.secs * 1000))) : 0;
    const res = await db.runTransaction(async (tx) => { const p = (await tx.get(pRef)).data(); if (p.ans && p.ans[i] != null) return {dup: true};
      tx.update(pRef, {["ans." + i]: pts, score: FieldValue.increment(pts), right: FieldValue.increment(ok ? 1 : 0), ms: FieldValue.increment(el)}); return {}; });
    if (res.dup) return {dup: true, now};
    return {now, ok, pts, right: q.c};
  }
  if (op === "board") {
    const i = Math.floor(Number(d.i));
    if (now > T.end && c.status !== "done") { await arenaFinalize(c); c.status = "done"; }
    const top = await ref.collection("p").orderBy("score", "desc").limit(10).get();
    const myScore = ps.data().score || 0;
    const higher = (await ref.collection("p").where("score", ">", myScore).count().get()).data().count;
    return {now, i, top: top.docs.map((x) => ({name: x.data().name, city: x.data().city, score: x.data().score, me: x.id === uid})), rank: higher + 1, score: myScore, right: ps.data().right || 0,
      count: c.count || 0, done: c.status === "done"};
  }
  throw new HttpsError("invalid-argument", "عملية غير معروفة");
});

// تذكير قبل البداية + إنهاء المسابقات المنتهية (كل 15 دقيقة)
exports.arenaTick = onSchedule({schedule: "*/15 * * * *", timeZone: "Africa/Tripoli", memory: "256MiB"}, async () => {
  const cfg = await arenaCfg(); if (!cfg.on) return; const now = Date.now();
  const soon = await db.collection("arena").where("at", ">", now).where("at", "<=", now + 20 * 60000).get();
  for (const s of soon.docs) { if (s.data().reminded) continue; await s.ref.update({reminded: true});
    const ps = await s.ref.collection("p").get(); const mins = Math.round((s.data().at - now) / 60000);
    for (const p of ps.docs) if (p.data().reg) await pushUser(p.id, {title: "🏟️ مسابقتك تبدأ بعد " + mins + " دقيقة!", body: LV_AR[s.data().lv] + " — كن جاهزاً، الأسرع والأدق يفوز 🏆", link: "#arena-" + s.id}, {rule: "events", adultsOnly: false}); }
  const ended = await db.collection("arena").where("at", "<", now - 5 * 60000).where("at", ">", now - 2 * DAY).get();
  for (const s of ended.docs) { const c = {cid: s.id, ref: s.ref, ...s.data()}; if (["done", "cancelled"].includes(c.status)) continue;
    if (now > arenaTimes(c).end) { if ((c.count || 0) < c.minP) await s.ref.update({status: "cancelled"}); else await arenaFinalize(c); } }
});

exports.adminArena = onCall({memory: "256MiB"}, async (req) => {
  const d = req.data || {};
  if (d.op === "cfg") {
    await needAdmin(req, "owner");
    const n = (v, lo, hi, def) => { const x = Math.round(Number(v)); return x >= lo && x <= hi ? x : def; };
    const arena = {on: !!d.on, who: d.who === "sub" ? "sub" : "all", every: [1, 2, 3, 4, 6, 8, 12, 24].includes(Number(d.every)) ? Number(d.every) : 3, start: n(d.start, 0, 23, 0),
      seats: n(d.seats, 2, 100, 20), minP: n(d.minP, 2, 20, 2), n: n(d.n, 5, 30, 15), secs: n(d.secs, 5, 30, 12), open: n(d.open, 10, 720, 60),
      levels: (Array.isArray(d.levels) ? d.levels : []).map(Number).filter((x) => x >= 1 && x <= 6).sort()};
    if (!arena.levels.length) arena.levels = [1, 2, 3, 4, 5, 6];
    await db.collection("config").doc("access").update({arena}).catch(() => db.collection("config").doc("access").set({arena}, {merge: true})); ACCESS = null; return {cfg: arena};
  }
  await needAdmin(req, ["stats", "push"]);
  const since = Date.now() - 14 * DAY;
  const [comps, wins] = await Promise.all([db.collection("arena").where("at", ">", since).get(), db.collection("arenaWins").where("at", ">", since).get()]);
  const W = {}; wins.docs.forEach((x) => { const w = x.data(); (W[w.cid] = W[w.cid] || []).push(w); });
  const list = comps.docs.map((x) => ({cid: x.id, ...x.data(), winners: (W[x.id] || []).sort((a, b) => a.rank - b.rank)})).sort((a, b) => b.at - a.at).slice(0, 60);
  for (const c of list) for (const w of c.winners) { if (w.reg) { const u = await db.collection("users").doc(w.uid).get(); w.phone = u.exists ? String(u.data().phone || "").replace("+218", "0") : ""; } }
  return {cfg: await arenaCfg(), list: list.map((c) => ({cid: c.cid, at: c.at, lv: c.lv, count: c.count || 0, status: c.status, winners: c.winners.map((w) => ({rank: w.rank, name: w.name, city: w.city, school: w.school, score: w.score, phone: w.phone || ""}))})),
    totals: {comps: list.length, players: list.reduce((a, c) => a + (c.count || 0), 0)}};
});


// ===================== التحليلات والتحويلات (ax.js) =====================
async function staffUids() {
  const a = await db.collection("config").doc("admins").get(); const A = a.exists ? a.data() : {};
  const out = new Set([...(A.uids || []), ...Object.keys(A.staff || {})]);
  const owners = await db.collection("users").where("email", "in", OWNER_EMAILS).get().catch(() => ({docs: []}));
  owners.docs.forEach((d) => out.add(d.id));
  return [...out];
}
const AXM = require("./ax.js")({db, FieldValue, onRequest, onCall, onSchedule, HttpsError, logger, admin, needAdmin, pushStaff, staffUids});
exports.ax = AXM.ax;
exports.adminAx = AXM.adminAx;
exports.axWatch = AXM.axWatch;
