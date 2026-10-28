// === KONFIGURASI FIREBASE ===
const firebaseConfig = {
    apiKey: "AIzaSyBE_6Vg_6oHWoJuPsk3DazmewptlgZh0sw",
    authDomain: "game-edukasi-4f1f7.firebaseapp.com",
    projectId: "game-edukasi-4f1f7",
    storageBucket: "game-edukasi-4f1f7.firebasestorage.app",
    messagingSenderId: "76125773493",
    appId: "1:76125773493:web:f364b22df64b0cb1dba8fc"
};

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

// === FUNGSI MEMULAI GAME DENGAN PENDETEKSI ERROR ===
function startGame() {
    const nameInput = document.getElementById('student-name').value;
    if (nameInput.trim() === "") {
        alert("Silakan isi nama lengkap kamu dulu ya!");
        return;
    }

    // Pengecekan apakah script Babylon sudah berhasil didownload oleh HP
    if (typeof BABYLON === 'undefined') {
        alert("Gagal memuat 3D Engine! Pastikan internet lancar, lalu refresh (muat ulang) halaman ini.");
        return;
    }

    playerName = nameInput;
    showScreen('screen-game-hud');
    
    // Gunakan try-catch agar jika error, muncul peringatan
    try {
        initBabylonGame();
    } catch (err) {
        alert("Error saat merender 3D: " + err.message);
    }
}

function triggerGameOver(isWin, finalDistance, finalCoins) {
    document.getElementById('end-title').innerText = isWin ? "KAMU MENANG!" : "GAME OVER";
    document.getElementById('end-distance').innerText = finalDistance;
    document.getElementById('end-coins').innerText = finalCoins;
    showScreen('screen-game-over');
}

// === FUNGSI FIREBASE (GURU) ===
async function saveQuestion() {
    // ... [Kode simpan firebase seperti sebelumnya] ...
    const qText = document.getElementById('q-text').value;
    const qLeft = document.getElementById('q-left').value;
    const qCenter = document.getElementById('q-center').value;
    const qRight = document.getElementById('q-right').value;
    const qAnswer = document.getElementById('q-answer').value;

    if (!qText || !qLeft || !qCenter || !qRight) {
        alert("Harap isi semua kolom soal!"); return;
    }
    try {
        await db.collection("questions").add({
            question: qText, optionLeft: qLeft, optionCenter: qCenter, optionRight: qRight, correctAnswer: qAnswer,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        alert("Berhasil! Soal telah tersimpan.");
        document.getElementById('q-text').value = ""; document.getElementById('q-left').value = "";
        document.getElementById('q-center').value = ""; document.getElementById('q-right').value = "";
    } catch (error) {
        alert("Gagal menyimpan soal.");
    }
}

// ==========================================
// === FASE 3: CORE BABYLON.JS GAME ENGINE ==
// ==========================================

let engine, scene, playerMesh;
let currentLane = 0; // -1 (Kiri), 0 (Tengah), 1 (Kanan)
let isPlaying = false;
let distanceTraveled = 0;
let coinsCollected = 0;
const MAX_DISTANCE = 1000;

function initBabylonGame() {
    const canvas = document.getElementById("renderCanvas");
    
    // Jika main ulang tanpa refresh
    if (engine) { engine.dispose(); }

    // Paksa ukuran canvas agar tidak nge-bug di layar HP
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });

    const createScene = function () {
        const scene = new BABYLON.Scene(engine);
        scene.clearColor = new BABYLON.Color3(0.4, 0.7, 1); // Warna langit biru cerah

        // Kamera Follow
        const camera = new BABYLON.FollowCamera("FollowCam", new BABYLON.Vector3(0, 5, -10), scene);
        camera.radius = 7; camera.heightOffset = 3; camera.rotationOffset = 180;
        camera.cameraAcceleration = 0.05; camera.maxCameraSpeed = 20;

        // Cahaya
        const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);
        light.intensity = 0.9;

        // Lintasan
        const ground = BABYLON.MeshBuilder.CreateGround("ground", {width: 12, height: 2500}, scene);
        const groundMat = new BABYLON.StandardMaterial("groundMat", scene);
        groundMat.diffuseColor = new BABYLON.Color3(0.5, 0.35, 0.2); 
        ground.material = groundMat;
        ground.position.z = 1000; 

        // Garis jalur
        const lineMat = new BABYLON.StandardMaterial("lineMat", scene);
        lineMat.diffuseColor = new BABYLON.Color3(1, 1, 1);
        const lineLeft = BABYLON.MeshBuilder.CreateBox("lineL", {width: 0.1, height: 0.01, depth: 2500}, scene);
        lineLeft.position = new BABYLON.Vector3(-1, 0.01, 1000); lineLeft.material = lineMat;
        const lineRight = BABYLON.MeshBuilder.CreateBox("lineR", {width: 0.1, height: 0.01, depth: 2500}, scene);
        lineRight.position = new BABYLON.Vector3(1, 0.01, 1000); lineRight.material = lineMat;

        // Pemain (Balok Biru)
        playerMesh = BABYLON.MeshBuilder.CreateBox("playerBody", {width: 1, height: 1.5, depth: 1}, scene);
        playerMesh.position.y = 0.75;
        const playerHead = BABYLON.MeshBuilder.CreateSphere("playerHead", {diameter: 0.8}, scene);
        playerHead.position.y = 1.15; playerHead.parent = playerMesh;
        
        const playerMat = new BABYLON.StandardMaterial("playerMat", scene);
        playerMat.diffuseColor = new BABYLON.Color3(0.2, 0.4, 0.8);
        playerMesh.material = playerMat;

        camera.lockedTarget = playerMesh;
        return scene;
    };

    scene = createScene();
    isPlaying = true; distanceTraveled = 0; currentLane = 0;

    // KONTROL KEYBOARD & SWIPE LAYAR (Untuk HP)
    window.addEventListener("keydown", (e) => {
        if (!isPlaying) return;
        if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
            if (currentLane > -1) currentLane--;
        } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
            if (currentLane < 1) currentLane++;
        }
    });

    // Kontrol Layar Sentuh HP (Tap Kiri/Kanan Layar)
    window.addEventListener("pointerdown", (e) => {
        if (!isPlaying) return;
        if (e.clientX < window.innerWidth / 2) {
            if (currentLane > -1) currentLane--; // Tap Kiri
        } else {
            if (currentLane < 1) currentLane++; // Tap Kanan
        }
    });

    // GAME LOOP
    engine.runRenderLoop(function () {
        if (isPlaying && scene) {
            try {
                // Maju perlahan
                playerMesh.position.z += 0.3; 
                
                // Pindah jalur
                const targetX = currentLane * 2;
                playerMesh.position.x = BABYLON.Scalar.Lerp(playerMesh.position.x, targetX, 0.15);

                // Update UI Skor
                distanceTraveled = playerMesh.position.z;
                let distInt = Math.floor(distanceTraveled);
                if (distInt < 0) distInt = 0;
                
                document.getElementById('distance-score').innerText = distInt;
                let progress = (distInt / MAX_DISTANCE) * 100;
                document.getElementById('progress-fill').style.width = Math.min(progress, 100) + "%";

                // Finish
                if (distInt >= MAX_DISTANCE) {
                    isPlaying = false;
                    triggerGameOver(true, distInt, coinsCollected);
                }

                scene.render();
            } catch (err) {
                console.error("Render error:", err);
            }
        }
    });

    // Sesuaikan ukuran jika layar HP diputar
    window.addEventListener("resize", function () {
        engine.resize();
    });
    // Paksa ukuran beradaptasi sesaat setelah mulai
    setTimeout(() => { engine.resize(); }, 200);
}
