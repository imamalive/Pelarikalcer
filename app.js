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

// === VARIABEL GLOBAL UI ===
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
        alert("PIN Salah!");
    }
}

function startGame() {
    const nameInput = document.getElementById('student-name').value;
    if (nameInput.trim() === "") {
        alert("Silakan isi nama lengkap kamu dulu ya!"); return;
    }
    if (typeof BABYLON === 'undefined') {
        alert("Gagal memuat 3D Engine! Pastikan internet lancar, lalu refresh."); return;
    }

    playerName = nameInput;
    showScreen('screen-game-hud');
    
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
// === FASE 4: KOIN, RINTANGAN, TABRAKAN ===
// ==========================================

let engine, scene, playerMesh;
let currentLane = 0; 
let isPlaying = false;
let distanceTraveled = 0;
let coinsCollected = 0;
let playerHP = 3; // Nyawa Pemain
const MAX_DISTANCE = 1000;

// Array untuk menyimpan objek yang sedang ada di layar
let activeObstacles = [];
let activeCoins = [];
let nextSpawnZ = 20; // Jarak untuk memunculkan benda pertama

function initBabylonGame() {
    const canvas = document.getElementById("renderCanvas");
    if (engine) { engine.dispose(); }

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });

    // Reset Variabel Game
    playerHP = 3;
    coinsCollected = 0;
    distanceTraveled = 0;
    currentLane = 0;
    nextSpawnZ = 20;
    activeObstacles = [];
    activeCoins = [];
    updateHUD();

    const createScene = function () {
        const scene = new BABYLON.Scene(engine);
        scene.clearColor = new BABYLON.Color3(0.4, 0.7, 1); 

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
    isPlaying = true; 

    // === MATERIAL UNTUK RINTANGAN & KOIN ===
    const obsMat = new BABYLON.StandardMaterial("obsMat", scene);
    obsMat.diffuseColor = new BABYLON.Color3(0.8, 0.2, 0.2); // Merah

    const coinMat = new BABYLON.StandardMaterial("coinMat", scene);
    coinMat.diffuseColor = new BABYLON.Color3(1, 0.8, 0); // Emas
    coinMat.emissiveColor = new BABYLON.Color3(0.5, 0.4, 0); // Sedikit bercahaya

    // FUNGSI MEMUNCULKAN BENDA
    function spawnObject(zPos) {
        // Pilih jalur acak: -1 (kiri), 0 (tengah), 1 (kanan)
        const lane = Math.floor(Math.random() * 3) - 1; 
        const xPos = lane * 2;

        // Acak 70% muncul koin, 30% muncul rintangan
        const isCoin = Math.random() > 0.3;

        if (isCoin) {
            // Buat koin (pipih seperti koin)
            let coin = BABYLON.MeshBuilder.CreateCylinder("coin", {diameter: 0.8, height: 0.1}, scene);
            coin.rotation.x = Math.PI / 2; // Berdirikan koin
            coin.position = new BABYLON.Vector3(xPos, 0.5, zPos);
            coin.material = coinMat;
            activeCoins.push(coin);
        } else {
            // Buat rintangan (Batu/Kotak)
            let obs = BABYLON.MeshBuilder.CreateBox("obs", {width: 1.2, height: 1, depth: 1.2}, scene);
            obs.position = new BABYLON.Vector3(xPos, 0.5, zPos);
            obs.material = obsMat;
            activeObstacles.push(obs);
        }
    }

    // KONTROL KEYBOARD & SWIPE LAYAR
    window.addEventListener("keydown", (e) => {
        if (!isPlaying) return;
        if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
            if (currentLane > -1) currentLane--;
        } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
            if (currentLane < 1) currentLane++;
        }
    });

    window.addEventListener("pointerdown", (e) => {
        if (!isPlaying) return;
        // Hindari bentrok dengan klik tombol UI
        if(e.target.tagName === "BUTTON") return; 

        if (e.clientX < window.innerWidth / 2) {
            if (currentLane > -1) currentLane--; // Tap Kiri
        } else {
            if (currentLane < 1) currentLane++; // Tap Kanan
        }
    });

    // GAME LOOP (Setiap Frame)
    engine.runRenderLoop(function () {
        if (isPlaying && scene) {
            
            // 1. Pemain Maju
            playerMesh.position.z += 0.3; 
            
            // 2. Pindah Jalur Halus
            const targetX = currentLane * 2;
            playerMesh.position.x = BABYLON.Scalar.Lerp(playerMesh.position.x, targetX, 0.15);

            // 3. Update Jarak
            distanceTraveled = playerMesh.position.z;
            let distInt = Math.floor(distanceTraveled);
            if (distInt < 0) distInt = 0;
            
            // 4. Sistem Spawner (Memunculkan rintangan/koin di depan)
            if (playerMesh.position.z + 100 > nextSpawnZ) {
                spawnObject(nextSpawnZ);
                // Jarak antar objek diacak antara 10m sampai 25m
                nextSpawnZ += 10 + (Math.random() * 15);
            }

            // 5. Cek Tabrakan dengan Koin
            for (let i = activeCoins.length - 1; i >= 0; i--) {
                let coin = activeCoins[i];
                coin.rotation.y += 0.05; // Animasi koin berputar
                
                // Jika tertabrak pemain
                if (playerMesh.intersectsMesh(coin, false)) {
                    coinsCollected++;
                    updateHUD();
                    coin.dispose(); // Hapus koin dari 3D
                    activeCoins.splice(i, 1); // Hapus dari array
                } 
                // Jika sudah terlewat di belakang pemain (hapus agar tidak lag)
                else if (coin.position.z < playerMesh.position.z - 5) {
                    coin.dispose();
                    activeCoins.splice(i, 1);
                }
            }

            // 6. Cek Tabrakan dengan Rintangan Merah
            for (let i = activeObstacles.length - 1; i >= 0; i--) {
                let obs = activeObstacles[i];
                
                // Jika tertabrak
                if (playerMesh.intersectsMesh(obs, false)) {
                    playerHP--;
                    updateHUD();
                    flashDamage(); // Layar kedip merah
                    
                    obs.dispose();
                    activeObstacles.splice(i, 1);

                    // Cek jika mati
                    if (playerHP <= 0) {
                        isPlaying = false;
                        triggerGameOver(false, distInt, coinsCollected); // false = Kalah
                    }
                }
                // Hapus jika terlewat
                else if (obs.position.z < playerMesh.position.z - 5) {
                    obs.dispose();
                    activeObstacles.splice(i, 1);
                }
            }

            // 7. Update Progress Bar UI
            document.getElementById('distance-score').innerText = distInt;
            let progress = (distInt / MAX_DISTANCE) * 100;
            document.getElementById('progress-fill').style.width = Math.min(progress, 100) + "%";

            // 8. Cek Menang
            if (distInt >= MAX_DISTANCE) {
                isPlaying = false;
                triggerGameOver(true, distInt, coinsCollected);
            }

            scene.render();
        }
    });

    window.addEventListener("resize", function () { engine.resize(); });
    setTimeout(() => { engine.resize(); }, 200);
}

// Fungsi Update UI HP dan Koin
function updateHUD() {
    let hearts = "";
    for(let i=0; i<playerHP; i++) { hearts += "❤️"; }
    if(playerHP === 0) { hearts = "💀"; }
    document.getElementById('hp-text').innerText = hearts;
    document.getElementById('coin-score').innerText = coinsCollected;
}

// Fungsi Efek Layar Berkedip Merah saat kena damage
function flashDamage() {
    const overlay = document.getElementById('damage-overlay');
    overlay.style.opacity = "0.5";
    setTimeout(() => {
        overlay.style.opacity = "0";
    }, 200);
}
