// Variabel Global Game (Sementara)
let playerName = "";
const TEACHER_PIN = "GURU123"; // PIN statis untuk masuk

// Fungsi untuk mengganti tampilan layar
function showScreen(screenId) {
    // Sembunyikan semua layar
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => {
        screen.classList.remove('active');
    });

    // Tampilkan layar yang dituju
    document.getElementById(screenId).classList.add('active');
}

// Fungsi Login Guru
function loginTeacher() {
    const inputPin = document.getElementById('teacher-pin').value;
    if (inputPin === TEACHER_PIN) {
        document.getElementById('teacher-pin').value = ""; // bersihkan input
        showScreen('screen-teacher-dashboard');
    } else {
        alert("PIN Salah! Silakan coba lagi.");
    }
}

// Fungsi Memulai Game (Siswa)
function startGame() {
    const nameInput = document.getElementById('student-name').value;
    if (nameInput.trim() === "") {
        alert("Silakan isi nama lengkap kamu dulu ya!");
        return;
    }
    
    playerName = nameInput;
    console.log("Pemain:", playerName, "memulai game.");
    
    // Tampilkan HUD Game
    showScreen('screen-game-hud');

    // NANTI DI FASE 3: Fungsi inisialisasi Babylon.js dipanggil di sini
    // initBabylonGame(); 
}

// Contoh fungsi sementara untuk memunculkan layar kuis (Nanti dipanggil oleh logika Babylon.js)
function triggerQuizUI() {
    document.getElementById('screen-quiz').classList.add('active');
}
// Contoh fungsi sementara untuk Game Over
function triggerGameOver(isWin, finalDistance, finalCoins) {
    document.getElementById('end-title').innerText = isWin ? "KAMU MENANG!" : "GAME OVER";
    document.getElementById('end-distance').innerText = finalDistance;
    document.getElementById('end-coins').innerText = finalCoins;
    showScreen('screen-game-over');
}