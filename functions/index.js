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
function priceOf(kind) {
  const v = Number(P[kind] ? P[kind].value() : NaN);
  return isFinite(v) && v > 0 ? r2(v) : 0;
}
exports.getPlans = onCall(async () => {
  const out = {};
  for (const k of Object.keys(P)) out[k] = priceOf(k);
  return {prices: out, end: seasonEnd().toMillis()};
});

// يحدّد نطاق الاشتراك ويحسب سعره في الخادم فقط
function buildScope(kind, role, d, kidsCount) {
  const grade = String(d.grade || "");
  const subject = String(d.subject || "");
  if (kind === "student_subject") {
    if (role !== "student") throw new HttpsError("permission-denied", "هذه الباقة للطالب");
    if (!GRADES.includes(grade) || !SUBJECTS.includes(subject)) throw new HttpsError("invalid-argument", "اختر الصف والمادة");
    return {scope: {grades: [grade], subjects: [subject]}, qty: 1};
  }
  if (kind === "student_grade") {
    if (role !== "student") throw new HttpsError("permission-denied", "هذه الباقة للطالب");
    if (!GRADES.includes(grade)) throw new HttpsError("invalid-argument", "اختر الصف");
    return {scope: {grades: [grade], subjects: ["*"]}, qty: 1};
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
  const unit = priceOf(kind);
  if (!unit) throw new HttpsError("failed-precondition", "هذه الباقة غير متاحة للشراء بعد");
  const amount = r2(unit * qty);

  const recent = await db.collection("orders").where("uid", "==", uid).where("status", "==", "pending").get();
  const fresh = recent.docs.filter((x) => (x.data().createdAt && x.data().createdAt.toMillis() > Date.now() - HOUR));
  if (fresh.length >= 5) throw new HttpsError("resource-exhausted", "طلبات كثيرة، حاول بعد قليل");

  const oRef = db.collection("orders").doc(); // رقم من 20 حرفاً ورقماً — يُرسل في custom
  await oRef.set({uid, kind, scope, qty, unit, amount, currency: "LYD", status: "pending",
    end: seasonEnd(), createdAt: FieldValue.serverTimestamp()});
  const back = SITE_URL.value() + "#paid-" + oRef.id;
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
    return {ok: true, url, orderId: oRef.id, amount};
  } catch (e) {
    await oRef.update({status: "failed"});
    throw new HttpsError("internal", "تعذّر إنشاء طلب الدفع، حاول لاحقاً");
  }
});

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

exports.getLesson = onCall({memory: "512MiB"}, async (req) => {
  const uid = needUser(req);
  const id = String((req.data && req.data.id) || "");
  const pid = req.data && req.data.pid ? String(req.data.pid) : null;
  const meta = LESSON_INDEX[id];
  if (!meta) throw new HttpsError("not-found", "الدرس غير موجود");
  const [g, s] = meta;

  const [us, subsSnap] = await Promise.all([
    db.collection("users").doc(uid).get(),
    db.collection("subscriptions").where("uid", "==", uid).get(),
  ]);
  if (!us.exists) throw new HttpsError("failed-precondition", "أكمل بيانات حسابك أولاً");
  const role = us.data().role;
  if (pid) {
    const ps = await db.collection("users").doc(uid).collection("profiles").doc(pid).get();
    if (!ps.exists) throw new HttpsError("permission-denied", "اختر الطالب من «من يدرس الآن؟»");
  }
  const now = Date.now();
  const ok = subsSnap.docs.map((d) => d.data()).some((sub) => {
    if (sub.active === false || !sub.end || sub.end.toMillis() <= now) return false;
    const sc = sub.scope || {};
    if (sc.teacherOnly) return role === "teacher" && pid === "me" && (sc.pairs || []).includes(g + ":" + s);
    if (sc.kids) { if (!pid || pid === "me") return false; } else if (role !== "student") return false;
    return (sc.grades || []).some((x) => x === "*" || x === g) && (sc.subjects || []).some((x) => x === "*" || x === s);
  });
  if (!ok) throw new HttpsError("permission-denied", "هذا الدرس للمشتركين. اشترك لتفتحه.");

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
