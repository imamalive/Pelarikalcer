// === KONFIGURASI FIREBASE ===
const firebaseConfig = {
    apiKey: "AIzaSyBE_6Vg_6oHWoJuPsk3DazmewptlgZh0sw",
    authDomain: "game-edukasi-4f1f7.firebaseapp.com",
    projectId: "game-edukasi-4f1f7",
    storageBucket: "game-edukasi-4f1f7.firebasestorage.app",
    messagingSenderId: "76125773493",
    appId: "1:76125773493:web:f364b22df64b0cb1dba8fc"
};

// Inisialisasi Firebase
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

// Fungsi mulai dimodifikasi untuk memanggil Babylon.js
function startGame() {
    const nameInput = document.getElementById('student-name').value;
    if (nameInput.trim() === "") {
        alert("Silakan isi nama lengkap kamu dulu ya!");
        return;
    }
    playerName = nameInput;
    showScreen('screen-game-hud');
    
    // Inisialisasi dan jalankan game 3D
    initBabylonGame();
}

function triggerGameOver(isWin, finalDistance, finalCoins) {
    document.getElementById('end-title').innerText = isWin ? "KAMU MENANG!" : "GAME OVER";
    document.getElementById('end-distance').innerText = finalDistance;
    document.getElementById('end-coins').innerText = finalCoins;
    showScreen('screen-game-over');
}

// === FUNGSI FIREBASE (GURU) ===
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
            question: qText, optionLeft: qLeft, optionCenter: qCenter, optionRight: qRight, correctAnswer: qAnswer,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        alert("Berhasil! Soal telah tersimpan ke database.");
        document.getElementById('q-text').value = "";
        document.getElementById('q-left').value = "";
        document.getElementById('q-center').value = "";
        document.getElementById('q-right').value = "";
    } catch (error) {
        console.error("Error saving question: ", error);
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
    canvas.focus(); // Pastikan canvas aktif agar keyboard berfungsi

    // Jika engine sudah ada (main ulang tanpa refresh), bersihkan dulu
    if (engine) {
        engine.dispose();
    }

    engine = new BABYLON.Engine(canvas, true);

    const createScene = function () {
        const scene = new BABYLON.Scene(engine);
        scene.clearColor = new BABYLON.Color3(0.4, 0.7, 1); // Warna langit biru cerah

        // Kamera (Mengikuti pemain dari belakang)
        const camera = new BABYLON.FollowCamera("FollowCam", new BABYLON.Vector3(0, 5, -10), scene);
        camera.radius = 7; // Jarak kamera
        camera.heightOffset = 3; // Ketinggian kamera
        camera.rotationOffset = 180; // Posisi di belakang
        camera.cameraAcceleration = 0.05;
        camera.maxCameraSpeed = 20;

        // Pencahayaan
        const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);
        light.intensity = 0.9;

        // === MEMBUAT LINGKUNGAN / LINTASAN ===
        const ground = BABYLON.MeshBuilder.CreateGround("ground", {width: 12, height: 2500}, scene);
        const groundMat = new BABYLON.StandardMaterial("groundMat", scene);
        groundMat.diffuseColor = new BABYLON.Color3(0.5, 0.35, 0.2); // Warna tanah coklat
        ground.material = groundMat;
        ground.position.z = 1000; // Rentangkan ke depan

        // Garis jalur (opsional untuk memperjelas 3 jalur)
        const lineMat = new BABYLON.StandardMaterial("lineMat", scene);
        lineMat.diffuseColor = new BABYLON.Color3(1, 1, 1);
        const lineLeft = BABYLON.MeshBuilder.CreateBox("lineL", {width: 0.1, height: 0.01, depth: 2500}, scene);
        lineLeft.position = new BABYLON.Vector3(-1, 0.01, 1000);
        lineLeft.material = lineMat;
        const lineRight = BABYLON.MeshBuilder.CreateBox("lineR", {width: 0.1, height: 0.01, depth: 2500}, scene);
        lineRight.position = new BABYLON.Vector3(1, 0.01, 1000);
        lineRight.material = lineMat;


        // === MEMBUAT PEMAIN (PROTOTIPE) ===
        // Badan kotak
        playerMesh = BABYLON.MeshBuilder.CreateBox("playerBody", {width: 1, height: 1.5, depth: 1}, scene);
        playerMesh.position.y = 0.75; // Angkat setengah tingginya agar di atas tanah
        
        // Kepala bola
        const playerHead = BABYLON.MeshBuilder.CreateSphere("playerHead", {diameter: 0.8}, scene);
        playerHead.position.y = 1.15; // Taruh di atas badan
        playerHead.parent = playerMesh; // Gabungkan kepala ke badan

        // Warna pemain (Biru)
        const playerMat = new BABYLON.StandardMaterial("playerMat", scene);
        playerMat.diffuseColor = new BABYLON.Color3(0.2, 0.4, 0.8);
        playerMesh.material = playerMat;

        // Kunci kamera ke pemain
        camera.lockedTarget = playerMesh;

        return scene;
    };

    scene = createScene();
    isPlaying = true;
    distanceTraveled = 0;
    currentLane = 0;

    // === KONTROL KEYBOARD ===
    window.addEventListener("keydown", (e) => {
        if (!isPlaying) return;
        
        if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
            if (currentLane > -1) {
                currentLane--;
            }
        } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
            if (currentLane < 1) {
                currentLane++;
            }
        }
    });

    // === GAME LOOP (Dijalankan setiap frame) ===
    engine.runRenderLoop(function () {
        if (isPlaying && scene) {
            
            // 1. Karakter otomatis maju
            playerMesh.position.z += 0.3; // Kecepatan Lari
            
            // 2. Transisi perpindahan jalur yang mulus (Lerp)
            // Jalur: Kiri (X: -2), Tengah (X: 0), Kanan (X: 2)
            const targetX = currentLane * 2;
            playerMesh.position.x = BABYLON.Scalar.Lerp(playerMesh.position.x, targetX, 0.15);

            // 3. Update Skor Jarak
            distanceTraveled = playerMesh.position.z;
            let distInt = Math.floor(distanceTraveled);
            if (distInt < 0) distInt = 0;
            
            // Update Text UI
            document.getElementById('distance-score').innerText = distInt;
            
            // Update Lebar Progress Bar
            let progress = (distInt / MAX_DISTANCE) * 100;
            document.getElementById('progress-fill').style.width = Math.min(progress, 100) + "%";

            // 4. Cek Garis Finish (Menang)
            if (distInt >= MAX_DISTANCE) {
                isPlaying = false;
                triggerGameOver(true, distInt, coinsCollected);
            }
        }
        
        scene.render();
    });

    // Agar kanvas merespons jika ukuran layar berubah (responsif)
    window.addEventListener("resize", function () {
        engine.resize();
    });
}
