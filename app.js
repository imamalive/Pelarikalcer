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
    // Tampilkan tombol kontrol di HP
    document.getElementById('mobile-controls').style.display = 'flex';
    
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
    document.getElementById('mobile-controls').style.display = 'none';
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
// === FASE 4 UPDATE: LOMPAT & TOMBOL UI ===
// ==========================================

let engine, scene, playerMesh;
let currentLane = 0; 
let isPlaying = false;
let distanceTraveled = 0;
let coinsCollected = 0;
let playerHP = 3; 
const MAX_DISTANCE = 1000;

// Variabel Lompat
let velocityY = 0;
let isJumping = false;
const GRAVITY = -0.02;
const JUMP_POWER = 0.35;

let activeObstacles = [];
let activeCoins = [];
let nextSpawnZ = 20; 

function initBabylonGame() {
    const canvas = document.getElementById("renderCanvas");
    if (engine) { engine.dispose(); }

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });

    playerHP = 3;
    coinsCollected = 0;
    distanceTraveled = 0;
    currentLane = 0;
    nextSpawnZ = 20;
    isJumping = false;
    velocityY = 0;
    activeObstacles = [];
    activeCoins = [];
    updateHUD();

    const createScene = function () {
        const scene = new BABYLON.Scene(engine);
        scene.clearColor = new BABYLON.Color3(0.4, 0.7, 1); 

        const camera = new BABYLON.FollowCamera("FollowCam", new BABYLON.Vector3(0, 5, -10), scene);
        camera.radius = 7; camera.heightOffset = 3; camera.rotationOffset = 180;
        camera.cameraAcceleration = 0.05; camera.maxCameraSpeed = 20;

        const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);
        light.intensity = 0.9;

        const ground = BABYLON.MeshBuilder.CreateGround("ground", {width: 12, height: 2500}, scene);
        const groundMat = new BABYLON.StandardMaterial("groundMat", scene);
        groundMat.diffuseColor = new BABYLON.Color3(0.5, 0.35, 0.2); 
        ground.material = groundMat;
        ground.position.z = 1000; 

        const lineMat = new BABYLON.StandardMaterial("lineMat", scene);
        lineMat.diffuseColor = new BABYLON.Color3(1, 1, 1);
        const lineLeft = BABYLON.MeshBuilder.CreateBox("lineL", {width: 0.1, height: 0.01, depth: 2500}, scene);
        lineLeft.position = new BABYLON.Vector3(-1, 0.01, 1000); lineLeft.material = lineMat;
        const lineRight = BABYLON.MeshBuilder.CreateBox("lineR", {width: 0.1, height: 0.01, depth: 2500}, scene);
        lineRight.position = new BABYLON.Vector3(1, 0.01, 1000); lineRight.material = lineMat;

        playerMesh = BABYLON.MeshBuilder.CreateBox("playerBody", {width: 1, height: 1.5, depth: 1}, scene);
        playerMesh.position.y = 0.75; // Posisi dasar (tanah)
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

    const obsMat = new BABYLON.StandardMaterial("obsMat", scene);
    obsMat.diffuseColor = new BABYLON.Color3(0.8, 0.2, 0.2); 

    const coinMat = new BABYLON.StandardMaterial("coinMat", scene);
    coinMat.diffuseColor = new BABYLON.Color3(1, 0.8, 0); 
    coinMat.emissiveColor = new BABYLON.Color3(0.5, 0.4, 0); 

    function spawnObject(zPos) {
        const lane = Math.floor(Math.random() * 3) - 1; 
        const xPos = lane * 2;
        const isCoin = Math.random() > 0.3;

        if (isCoin) {
            let coin = BABYLON.MeshBuilder.CreateCylinder("coin", {diameter: 0.8, height: 0.1}, scene);
            coin.rotation.x = Math.PI / 2; 
            coin.position = new BABYLON.Vector3(xPos, 0.5, zPos);
            coin.material = coinMat;
            activeCoins.push(coin);
        } else {
            // Tinggi rintangan 1. Pemain harus lompat melebihi Y = 1.0 untuk menghindar.
            let obs = BABYLON.MeshBuilder.CreateBox("obs", {width: 1.2, height: 1, depth: 1.2}, scene);
            obs.position = new BABYLON.Vector3(xPos, 0.5, zPos);
            obs.material = obsMat;
            activeObstacles.push(obs);
        }
    }

    // === KONTROL KEYBOARD ===
    window.addEventListener("keydown", (e) => {
        if (!isPlaying) return;
        if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
            if (currentLane > -1) currentLane--;
        } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
            if (currentLane < 1) currentLane++;
        } else if (e.key === "ArrowUp" || e.key === "w" || e.key === "W" || e.code === "Space") {
            if (!isJumping) {
                isJumping = true;
                velocityY = JUMP_POWER;
            }
        }
    });

    // === KONTROL TOMBOL LAYAR HP ===
    document.getElementById("btn-left").onpointerdown = () => {
        if (isPlaying && currentLane > -1) currentLane--;
    };
    document.getElementById("btn-right").onpointerdown = () => {
        if (isPlaying && currentLane < 1) currentLane++;
    };
    document.getElementById("btn-jump").onpointerdown = () => {
        if (isPlaying && !isJumping) {
            isJumping = true;
            velocityY = JUMP_POWER;
        }
    };

    engine.runRenderLoop(function () {
        if (isPlaying && scene) {
            
            playerMesh.position.z += 0.3; 
            
            const targetX = currentLane * 2;
            playerMesh.position.x = BABYLON.Scalar.Lerp(playerMesh.position.x, targetX, 0.15);

            // LOGIKA LOMPAT
            if (isJumping) {
                velocityY += GRAVITY;
                playerMesh.position.y += velocityY;
                
                // Jika sudah menyentuh tanah kembali
                if (playerMesh.position.y <= 0.75) {
                    playerMesh.position.y = 0.75;
                    isJumping = false;
                    velocityY = 0;
                }
            }

            distanceTraveled = playerMesh.position.z;
            let distInt = Math.floor(distanceTraveled);
            if (distInt < 0) distInt = 0;
            
            if (playerMesh.position.z + 100 > nextSpawnZ) {
                spawnObject(nextSpawnZ);
                nextSpawnZ += 10 + (Math.random() * 15);
            }

            for (let i = activeCoins.length - 1; i >= 0; i--) {
                let coin = activeCoins[i];
                coin.rotation.y += 0.05; 
                
                if (playerMesh.intersectsMesh(coin, false)) {
                    coinsCollected++;
                    updateHUD();
                    coin.dispose(); 
                    activeCoins.splice(i, 1); 
                } 
                else if (coin.position.z < playerMesh.position.z - 5) {
                    coin.dispose();
                    activeCoins.splice(i, 1);
                }
            }

            for (let i = activeObstacles.length - 1; i >= 0; i--) {
                let obs = activeObstacles[i];
                
                if (playerMesh.intersectsMesh(obs, false)) {
                    playerHP--;
                    updateHUD();
                    flashDamage(); 
                    
                    obs.dispose();
                    activeObstacles.splice(i, 1);

                    if (playerHP <= 0) {
                        isPlaying = false;
                        triggerGameOver(false, distInt, coinsCollected); 
                    }
                }
                else if (obs.position.z < playerMesh.position.z - 5) {
                    obs.dispose();
                    activeObstacles.splice(i, 1);
                }
            }

            document.getElementById('distance-score').innerText = distInt;
            let progress = (distInt / MAX_DISTANCE) * 100;
            document.getElementById('progress-fill').style.width = Math.min(progress, 100) + "%";

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

function updateHUD() {
    let hearts = "";
    for(let i=0; i<playerHP; i++) { hearts += "❤️"; }
    if(playerHP === 0) { hearts = "💀"; }
    document.getElementById('hp-text').innerText = hearts;
    document.getElementById('coin-score').innerText = coinsCollected;
}

function flashDamage() {
    const overlay = document.getElementById('damage-overlay');
    overlay.style.opacity = "0.5";
    setTimeout(() => {
        overlay.style.opacity = "0";
    }, 200);
}
