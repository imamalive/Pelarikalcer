// === KONFIGURASI FIREBASE ===
const firebaseConfig = {
    apiKey: "AIzaSyBE_6Vg_6oHWoJuPsk3DazmewptlgZh0sw",
    authDomain: "game-edukasi-4f1f7.firebaseapp.com",
    projectId: "game-edukasi-4f1f7",
    storageBucket: "game-edukasi-4f1f7.firebasestorage.app",
    messagingSenderId: "76125773493",
    appId: "1:76125773493:web:f364b22df64b0cb1dba8fc"
};

// Inisialisasi Firebase Compat Version
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// === VARIABEL GLOBAL & NAVIGASI UI ===
let playerName = "";
const TEACHER_PIN = "GURU123";

function showScreen(screenId) {
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => screen.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

function loginTeacher() {
    const inputPin = document.getElementById('teacher-pin').value;
    if (inputPin === TEACHER_PIN) {
        document.getElementById('teacher-pin').value = ""; 
        showScreen('screen-teacher-dashboard');
    } else {
        alert("PIN Salah! Silakan coba lagi.");
    }
}

function startGame() {
    const nameInput = document.getElementById('student-name').value;
    if (nameInput.trim() === "") {
        alert("Silakan isi nama lengkap kamu dulu ya!");
        return;
    }
    playerName = nameInput;
    console.log("Pemain:", playerName, "memulai game.");
    showScreen('screen-game-hud');
    // initBabylonGame(); // (Akan diaktifkan di Fase 3)
}

function triggerGameOver(isWin, finalDistance, finalCoins) {
    document.getElementById('end-title').innerText = isWin ? "KAMU MENANG!" : "GAME OVER";
    document.getElementById('end-distance').innerText = finalDistance;
    document.getElementById('end-coins').innerText = finalCoins;
    showScreen('screen-game-over');
}

// === FUNGSI FIREBASE (FASE 2) ===

// Menyimpan soal ke Firestore
async function saveQuestion() {
    const qText = document.getElementById('q-text').value;
    const qLeft = document.getElementById('q-left').value;
    const qCenter = document.getElementById('q-center').value;
    const qRight = document.getElementById('q-right').value;
    const qAnswer = document.getElementById('q-answer').value;

    if (!qText || !qLeft || !qCenter || !qRight) {
        alert("Harap isi semua kolom soal!");
        return;
    }

    try {
        await db.collection("questions").add({
            question: qText,
            optionLeft: qLeft,
            optionCenter: qCenter,
            optionRight: qRight,
            correctAnswer: qAnswer,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        alert("Berhasil! Soal telah tersimpan ke database Firestore.");
        
        // Kosongkan form input
        document.getElementById('q-text').value = "";
        document.getElementById('q-left').value = "";
        document.getElementById('q-center').value = "";
        document.getElementById('q-right').value = "";
        
    } catch (error) {
        console.error("Error saving question: ", error);
        alert("Gagal menyimpan soal. Pastikan aturan 'Rules' Firestore Anda mengizinkan penulisan data (test mode).");
    }
}
