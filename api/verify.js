/**
 * /api/verify (Vercel Serverless)
 * - One-time verify:
 *   1) Read /pending/<did>
 *   2) Token must match
 *   3) Write /verified/<did>
 *   4) Delete /pending/<did>  (cleanup + make link one-time)
 *
 * ENV on Vercel:
 *  - FIREBASE_DB_URL = https://login-dialog-default-rtdb.firebaseio.com
 *  - FIREBASE_SERVICE_ACCOUNT_JSON  (serviceAccount JSON in 1 line)
 *      OR
 *  - FIREBASE_SERVICE_ACCOUNT_B64   (base64 of serviceAccount JSON)
 */

const admin = require("firebase-admin");
const crypto = require("crypto");

function noStore(res) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
}

function sanitizeDid(raw) {
  const cleaned = String(raw || "").trim();
  if (!cleaned) return null;
  return cleaned.replace(/[.#$\[\]\/\\\s]/g, "_").slice(0, 80);
}

function timingSafeEqual(a, b) {
  const ba = Buffer.from(String(a || ""), "utf8");
  const bb = Buffer.from(String(b || ""), "utf8");
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

function getServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  }
  if (process.env.FIREBASE_SERVICE_ACCOUNT_B64) {
    const decoded = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_B64, "base64").toString("utf8");
    return JSON.parse(decoded);
  }
  throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_B64");
}

function initAdmin() {
  if (admin.apps && admin.apps.length) return;

  const databaseURL = process.env.FIREBASE_DB_URL;
  if (!databaseURL) throw new Error("Missing FIREBASE_DB_URL");

  admin.initializeApp({
    credential: admin.credential.cert(getServiceAccount()),
    databaseURL
  });
}

module.exports = async (req, res) => {
  noStore(res);
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  try {
    initAdmin();

    const did = sanitizeDid(req.query.did);
    const token = String(req.query.token || "").trim();

    if (!did || !token) {
      res.status(200).end(JSON.stringify({ ok: false, reason: "missing_params" }));
      return;
    }

    const db = admin.database();
    const pendingRef = db.ref("pending").child(did);
    const pendingSnap = await pendingRef.get();

    if (!pendingSnap.exists()) {
      res.status(200).end(JSON.stringify({ ok: false, reason: "pending_missing" }));
      return;
    }

    const pending = pendingSnap.val() || {};
    const pendingToken = pending.token;

    if (!pendingToken || !timingSafeEqual(pendingToken, token)) {
      res.status(200).end(JSON.stringify({ ok: false, reason: "token_mismatch" }));
      return;
    }

    // Write verified
    await db.ref("verified").child(did).set({
      verified: true,
      verified_at: Date.now(),
      token: token,
      telegram_id: pending.telegram_id || null
    });

    // Cleanup pending => link becomes one-time + no DB junk
    await pendingRef.remove();

    res.status(200).end(JSON.stringify({ ok: true }));
  } catch (e) {
    console.error("verify error:", e);
    res.status(500).end(JSON.stringify({ ok: false, reason: "server_error" }));
  }
};
