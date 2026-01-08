// ================== EDIT INI (wajib) ==================
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBiWTGD94Ouv4E-XmvlV4y4iEztI65605g",
  authDomain: "login-dialog.firebaseapp.com",
  databaseURL: "https://login-dialog-default-rtdb.firebaseio.com",
  projectId: "login-dialog"
};

// Kalau bot kamu selalu sama, isi di sini sebagai fallback (tanpa @).
// Kalau link bot selalu mengirim parameter &bot=NamaBot, ini boleh dikosongkan.
const DEFAULT_BOT_USERNAME = ""; // contoh: "NamaBotKamu"
// =======================================================

(function () {
  const statusEl = document.getElementById("status");

  const qs = new URLSearchParams(location.search);
  const did = qs.get("did");
  const token = qs.get("token");
  const bot = qs.get("bot") || DEFAULT_BOT_USERNAME;
  const okPayload = qs.get("ok") || "verified";
  const badPayload = qs.get("bad") || "invalid";

  // Simpan bot + last result supaya REFRESH tetap redirect (tanpa query).
  if (bot) sessionStorage.setItem("tg_bot", bot);

  function clearUrl() {
    history.replaceState({}, document.title, location.pathname);
  }

  function redirectToBot(payload) {
    const b = sessionStorage.getItem("tg_bot");
    if (!b) {
      statusEl.textContent = "Done. Back to Telegram.";
      return;
    }

    // Try deep link first (lebih ngegas buka app), lalu fallback https.
    const deep = payload ? `tg://resolve?domain=${b}&start=${encodeURIComponent(payload)}` : `tg://resolve?domain=${b}`;
    const web = payload ? `https://t.me/${b}?start=${encodeURIComponent(payload)}` : `https://t.me/${b}`;

    // Beberapa webview blokir tg://; fallback tetap jalan.
    try { location.href = deep; } catch (_) {}
    setTimeout(() => { location.replace(web); }, 650);
  }

  function finish(ok) {
    sessionStorage.setItem("verify_last", ok ? "ok" : "bad");
    clearUrl();
    statusEl.textContent = ok ? "✅ Verifikasi berhasil. Mengalihkan ke bot..." : "❌ Link tidak valid / sudah dipakai. Mengalihkan...";
    setTimeout(() => redirectToBot(ok ? okPayload : badPayload), 850);
  }

  // Jika URL sudah bersih (tidak ada did/token), langsung redirect sesuai last result.
  if (!did || !token) {
    const last = sessionStorage.getItem("verify_last");
    statusEl.textContent = "Selesai. Mengalihkan...";
    clearUrl();
    setTimeout(() => redirectToBot(last === "ok" ? okPayload : badPayload), 650);
    return;
  }

  // Bersihin URL secepat mungkin supaya parameter tidak nyangkut di address bar
  clearUrl();
  statusEl.textContent = "Menghubungi Firebase...";

  // Load Firebase SDKs (compat) dynamically
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  async function run() {
    try {
      await loadScript("https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js");
      await loadScript("https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js");

      firebase.initializeApp(FIREBASE_CONFIG);
      const db = firebase.database();

      // Step 1: tulis verified (rules kamu validasi token terhadap pending)
      statusEl.textContent = "Menulis status verifikasi...";
      await db.ref("verified/" + did).set({
        verified: true,
        verified_at: Date.now(),
        token: token
      });

      // Step 2: hapus pending biar:
      // - link jadi SEKALI PAKAI
      // - DB gak jadi sampah
      statusEl.textContent = "Membersihkan data sementara...";
      await db.ref("pending/" + did).remove();

      // Done
      finish(true);
    } catch (e) {
      // Permission denied / pending hilang / token salah => dianggap invalid
      finish(false);
    }
  }

  run();
})();
