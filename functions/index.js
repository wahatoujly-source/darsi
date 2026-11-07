// ===================== المجتهد — دوال الخادم =====================
// الاشتراكات: تأكيد الهاتف برسالة (resala) قبل الدفع، إنشاء الطلب، الدفع عبر ماي باي، تفعيل الاشتراك.
const {setGlobalOptions} = require("firebase-functions");
const {onCall, onRequest, HttpsError} = require("firebase-functions/https");
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
const GRADES = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
const SUBJECTS = ["ar", "en", "math", "comp", "art", "sci", "soc", "hist", "geo"]; // التربية الإسلامية والوطنية مجانيتان
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
exports.getPlans = onCall(async () => ({prices: await getPrices(), end: seasonEnd().toMillis()}));

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
    if (kidsCount < 1) throw new HttpsError("failed-precondition", "أضف أبناءك أولاً من صفحة «أبنائي»");
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
  if (!u.phoneVerified) throw new HttpsError("failed-precondition", "أكّد رقم هاتفك أولاً");
  const kids = (await db.collection("users").doc(uid).collection("profiles").get()).docs.filter((x) => x.id !== "me").length;
  const {scope, qty} = buildScope(kind, u.role, d, kids);
  if (!KINDS_ON_SALE.includes(kind)) throw new HttpsError("failed-precondition", "هذه الباقة غير متاحة حالياً");
  const unit = (await getPrices())[kind] || 0;
  if (!unit) throw new HttpsError("failed-precondition", "هذه الباقة غير متاحة للشراء بعد");
  const amount = r2(unit * qty);

  const recent = await db.collection("orders").where("uid", "==", uid).where("status", "==", "pending").get();
  const fresh = recent.docs.filter((x) => (x.data().createdAt && x.data().createdAt.toMillis() > Date.now() - HOUR));
  if (fresh.length >= 5) throw new HttpsError("resource-exhausted", "طلبات كثيرة، حاول بعد قليل");

  const oRef = db.collection("orders").doc(); // رقم من 20 حرفاً ورقماً — يُرسل في custom
  await oRef.set({uid, kind, scope, qty, unit, amount, currency: "LYD", status: "pending",
    end: seasonEnd(), createdAt: FieldValue.serverTimestamp()});
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
      body: JSON.stringify({amount: amount.toFixed(2), currency: "LYD", return_url: back, cancel_url: back, custom: oRef.id}),
    });
    const cj = await cr.json();
    const url = cj && cj.data && cj.data.payment_url;
    if (!cr.ok || !url) {
      logger.error("mypay create error", cr.status, JSON.stringify(cj)); throw new Error("create");
    }
    await oRef.update({mypayToken: (cj.data && cj.data.token) || null, paymentUrl: url});
    return url;
  } catch (e) {
    await oRef.update({status: "failed"});
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
  if (b.event !== "payment.success" || b.status !== "success") return res.status(200).send("ignored");
  const orderId = String(b.custom || "");
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
        uid: o.uid, kind: o.kind, scope: o.scope, amount: o.amount, orderId,
        start: FieldValue.serverTimestamp(), end: o.end, active: true,
      });
      return "ok";
    });
    logger.info(`mypayWebhook: ${orderId} -> ${result}`);
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
const ACCESS_KEY = /^(g\d{1,2}|g\d{1,2}-[a-z]{2,8}|l-[a-z0-9-]{3,60})$/;
exports.adminSetAccess = onCall(async (req) => {
  await needAdmin(req);
  const d = req.data || {};
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
const BOOK_KEY = /^(all|g\d{1,2}|g\d{1,2}-[a-z]{2,8})$/;
exports.adminSetBooks = onCall(async (req) => {
  await needAdmin(req);
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
  const [g, s] = meta;
  // المدير يتصفح كل الدروس للمراجعة (بدون اشتراك وبدون حدّ يومي، حتى المغلقة)
  if (req.data && req.data.admin) {
    await needAdmin(req);
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
  const ok = subsSnap.docs.map((d) => d.data()).some((sub) => {
    if (sub.active === false || !sub.end || sub.end.toMillis() <= now) return false;
    const sc = sub.scope || {};
    if (sc.teacherOnly) return role === "teacher" && pid === "me" && (sc.pairs || []).includes(g + ":" + s);
    if (sc.any) return (sc.grades || []).some((x) => x === "*" || x === g);
    if (sc.kids) { if (!pid || pid === "me") return false; } else if (!(role === "student" || (sc.self && pid === "me"))) return false;
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
async function needAdmin(req) {
  const uid = needUser(req);
  const tok = req.auth.token || {};
  if (tok.email && tok.email_verified === true && OWNER_EMAILS.includes(String(tok.email).toLowerCase())) return uid;
  const a = await db.collection("config").doc("admins").get();
  const list = (a.exists && Array.isArray(a.data().uids)) ? a.data().uids : [];
  if (!list.includes(uid)) throw new HttpsError("permission-denied", "هذه الصفحة للإدارة فقط");
  return uid;
}
exports.adminCheck = onCall(async (req) => { await needAdmin(req); return {admin: true}; });

exports.adminStats = onCall({memory: "512MiB"}, async (req) => {
  await needAdmin(req);
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
    if (x.kind !== "gift" && payers[r]) payers[r].add(x.uid);
  });
  let kidsCovered = 0;
  const kidSubUsers = new Set(active.filter((x) => (x.scope || {}).kids).map((x) => x.uid));
  profiles.docs.forEach((d) => { if (d.id !== "me" && kidSubUsers.has(d.ref.parent.parent.id)) kidsCovered++; });
  let revenue = 0; orders.docs.forEach((d) => { revenue += Number(d.data().amount) || 0; });
  const list = active.sort((a, b) => (b.start && b.start.toMillis ? b.start.toMillis() : 0) - (a.start && a.start.toMillis ? a.start.toMillis() : 0))
      .slice(0, 200).map((x) => ({id: x.id, uid: x.uid, kind: x.kind, scope: x.scope, amount: x.amount || 0,
        end: x.end.toMillis(), name: (uinfo[x.uid] || {}).name || "", phone: (uinfo[x.uid] || {}).phone || "", role: (uinfo[x.uid] || {}).role || "", note: x.note || ""}));
  return {
    users: users.size, roles, kids, kidsByGrade, kidsCovered,
    activeSubs: active.length, byKind,
    payingStudents: payers.student.size, payingParents: payers.parent.size, payingTeachers: payers.teacher.size,
    paidOrders: orders.size, revenue: r2(revenue), prices: await getPrices(), list,
  };
});

exports.adminSetPrices = onCall(async (req) => {
  await needAdmin(req);
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
  await needAdmin(req);
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
  const admin = await needAdmin(req);
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
  await needAdmin(req);
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
const T_SUBJ = ["ar", "en", "math", "sci", "isl", "soc", "hist", "geo", "civ", "comp", "art", "phy", "chem", "bio", "other"];
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
    if (op === "submit") { if (c.status === "live") return {ok: true}; await ref.update({status: "pending", note: "", submittedAt: FieldValue.serverTimestamp()}); }
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
    return {ok: true, id: out.id};
  }
  throw new HttpsError("invalid-argument", "عملية غير معروفة");
});

// ---------- لوحة الإدارة: المعلمون والدورات والسحوبات ----------
exports.adminTeach = onCall({secrets: [YT_ID, YT_SECRET, YT_REFRESH], memory: "256MiB"}, async (req) => {
  const adm = await needAdmin(req);
  const d = req.data || {}; const op = String(d.op || "");
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
    const [ts, cs, wd, st] = await Promise.all([db.collection("teachers").get(), db.collection("courses").get(),
      db.collection("withdrawals").where("status", "==", "pending").get(), db.collection("config").doc("teachStats").get()]);
    const wal = await db.collection("wallets").get(); const bal = {}; wal.docs.forEach((x) => { bal[x.id] = x.data(); });
    return {
      teachers: ts.docs.map((x) => { const t = x.data(); return {id: x.id, name: t.name, spec: t.spec, bio: t.bio || "", phone: (t.phone || "").replace("+218", "0"),
        status: t.status, hidden: !!t.hidden, note: t.note || "", courses: t.courses || 0, at: ms(t.createdAt),
        bal: r2((bal[x.id] || {}).bal || 0), earned: r2((bal[x.id] || {}).earned || 0)}; }),
      courses: cs.docs.map((x) => ({...pubCourse(x.id, x.data()), note: x.data().note || "", lessons: (x.data().lessons || []).map((l, i) => ({...l, free: i === 0}))})),
      withdrawals: wd.docs.map((x) => ({id: x.id, ...x.data(), at: ms(x.data().at)})),
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
    await ref.update(up); TLIST = null; return {ok: true};
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
    await ref.update(up); TLIST = null; return {ok: true};
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
  const r = await fetch("http://metadata.google.internal/computeMetadata/v1/instance/service-account/default/token", {headers: {"Metadata-Flavor": "Google"}});
  return (await r.json()).access_token;
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
const ttsKey = (voice, rate, text) => crypto.createHash("sha1").update(voice + "|" + rate + "|" + text).digest("hex");
const TTS_MEM = new Map();

exports.tts = onRequest({memory: "256MiB", concurrency: 40, maxInstances: 5}, async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(204).send("");
  try {
    const cfg = (await getAccessCfg()).tts || {};
    if (!cfg.on) return res.status(404).send("off");
    const which = req.query.v === "m" ? "m" : "f";
    const voice = /^[a-z]{2}-[A-Z]{2}-[A-Za-z0-9-]{3,40}$/.test(cfg[which] || "") ? cfg[which] : TTS_DEF[which];
    const rate = Math.min(1.3, Math.max(0.6, Number(cfg.rate) || TTS_DEF.rate));
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
  await needAdmin(req);
  const d = req.data || {}; const op = String(d.op || "");
  if (op === "voices") {
    const r = await fetch("https://texttospeech.googleapis.com/v1/voices?languageCode=ar-XA", {headers: {"Authorization": "Bearer " + await gcpToken()}});
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new HttpsError("failed-precondition", r.status === 403 ? "خدمة Text-to-Speech غير مفعّلة في مشروع Google Cloud بعد" : "تعذّر جلب الأصوات");
    const st = await db.collection("config").doc("ttsStats").get();
    const today = await db.collection("config").doc("ttsDay_" + new Date().toISOString().slice(0, 10)).get();
    return {voices: (j.voices || []).map((v) => ({name: v.name, g: v.ssmlGender})).sort((a, b) => a.name.localeCompare(b.name)),
      stats: st.exists ? st.data() : {}, today: today.exists ? today.data().chars : 0, def: TTS_DEF};
  }
  if (op === "try") {
    const text = str(d.text, 400); const voice = str(d.voice, 60);
    if (!text || !/^[a-z]{2}-[A-Z]{2}-/.test(voice)) throw new HttpsError("invalid-argument", "النص أو الصوت غير صحيح");
    try { const b = await synth(text, voice, Math.min(1.3, Math.max(0.6, Number(d.rate) || 1))); return {audio: b.toString("base64")}; }
    catch (e) { throw new HttpsError("failed-precondition", e.status === 403 ? "خدمة Text-to-Speech غير مفعّلة في مشروع Google Cloud بعد" : "تعذّر توليد الصوت: " + str(e.message, 150)); }
  }
  if (op === "cfg") {
    const ok = (v) => /^[a-z]{2}-[A-Z]{2}-[A-Za-z0-9-]{3,40}$/.test(v || "");
    const tts = {on: !!d.on, f: ok(d.f) ? d.f : TTS_DEF.f, m: ok(d.m) ? d.m : TTS_DEF.m, rate: Math.min(1.3, Math.max(0.6, Number(d.rate) || TTS_DEF.rate))};
    await db.collection("config").doc("access").set({tts}, {merge: true}); ACCESS = null; return {tts};
  }
  throw new HttpsError("invalid-argument", "عملية غير معروفة");
});
