// ===== Firebase Config =====
const firebaseConfig = {
  apiKey: "AIzaSyBiWTGD94Ouv4E-XmvlV4y4iEztI65605g",
  authDomain: "login-dialog.firebaseapp.com",
  databaseURL: "https://login-dialog-default-rtdb.firebaseio.com",
  projectId: "login-dialog"
};

// ===== Load Firebase SDK =====
(function(){
  const a = document.createElement("script");
  a.src = "https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js";
  document.head.appendChild(a);

  const b = document.createElement("script");
  b.src = "https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js";
  document.head.appendChild(b);

  b.onload = init;
})();

function qs(name){
  return new URLSearchParams(location.search).get(name);
}

function clearUrl(){
  history.replaceState({}, document.title, location.pathname);
}

function init(){
  firebase.initializeApp(firebaseConfig);
  const db = firebase.database();

  const did = qs("did");
  const token = qs("token");
  const status = document.getElementById("status");
  const btn = document.getElementById("verifyBtn");

  if(!did || !token){
    status.textContent = "Link verifikasi sudah tidak valid.";
    btn.disabled = true;
    clearUrl();
    return;
  }

  btn.onclick = async () => {
    btn.disabled = true;
    status.textContent = "Memverifikasi perangkat...";

    try {
      await db.ref("verified/" + did).set({
        verified: true,
        verified_at: Date.now(),
        token: token
      });

      clearUrl();
      status.textContent = "✅ Verifikasi berhasil. Mengalihkan ke bot...";

      setTimeout(() => {
        location.replace("https://t.me/" + (qs("bot") || ""));
      }, 1500);

    } catch (e){
      status.textContent = "❌ Verifikasi gagal atau link kadaluarsa.";
    }
  };
}
