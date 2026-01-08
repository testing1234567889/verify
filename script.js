// ===== Firebase Config (ISI SESUAI PROJECT) =====
const firebaseConfig = {
  apiKey: "AIzaSyBiWTGD94Ouv4E-XmvlV4y4iEztI65605g",
  authDomain: "login-dialog.firebaseapp.com",
  databaseURL: "https://login-dialog-default-rtdb.firebaseio.com",
  projectId: "login-dialog"
};

// ===== Load Firebase SDK =====
(function(){
  const s1 = document.createElement("script");
  s1.src = "https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js";
  document.head.appendChild(s1);

  const s2 = document.createElement("script");
  s2.src = "https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js";
  document.head.appendChild(s2);

  s2.onload = init;
})();

function qs(name){
  return new URLSearchParams(window.location.search).get(name);
}

function init(){
  firebase.initializeApp(firebaseConfig);
  const db = firebase.database();

  const did = qs("did");
  const token = qs("token");

  const status = document.getElementById("status");
  const btn = document.getElementById("verifyBtn");

  if(!did || !token){
    status.textContent = "Parameter verifikasi tidak valid.";
    btn.disabled = true;
    return;
  }

  btn.onclick = async () => {
    btn.disabled = true;
    status.textContent = "Memproses verifikasi...";

    try {
      await db.ref("verified/" + did).set({
        verified: true,
        verified_at: Date.now(),
        token: token
      });

      status.textContent = "✅ Verifikasi berhasil. Silakan kembali ke aplikasi.";
      document.getElementById("desc").textContent =
        "Perangkat Anda telah berhasil diverifikasi.";
    } catch (e){
      status.textContent = "❌ Verifikasi gagal: " + e.message;
      btn.disabled = false;
    }
  };
}
