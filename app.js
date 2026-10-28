// ==========================================
// DATA SOAL BIOLOGI SMP (HARDCODED)
// Jawaban yang benar: -1 (Kiri), 0 (Tengah), 1 (Kanan)
// ==========================================
const questions = [
    { q: "Organel sel tempat terjadinya respirasi (pernapasan sel) adalah?", l: "Ribosom", c: "Mitokondria", r: "Nukleus", a: 0 },
    { q: "Proses pembuatan makanan pada tumbuhan dibantu oleh matahari disebut?", l: "Fotosintesis", c: "Respirasi", r: "Transpirasi", a: -1 },
    { q: "Hewan pemakan segala (tumbuhan dan daging) disebut?", l: "Karnivora", c: "Herbivora", r: "Omnivora", a: 1 },
    { q: "Sel darah merah yang berfungsi mengikat oksigen adalah?", l: "Eritrosit", c: "Leukosit", r: "Trombosit", a: -1 },
    { q: "Alat pernapasan utama pada ikan adalah?", l: "Paru-paru", c: "Trakea", r: "Insang", a: 1 },
    { q: "Zat hijau daun yang berperan dalam fotosintesis adalah?", l: "Klorofil", c: "Stomata", r: "Kambium", a: -1 },
    { q: "Enzim di lambung yang berfungsi memecah protein adalah?", l: "Ptialin", c: "Pepsin", r: "Amilase", a: 0 },
    { q: "Tempat pertukaran oksigen dan karbon dioksida di paru-paru terjadi di?", l: "Bronkus", c: "Laring", r: "Alveolus", a: 1 },
    { q: "Tumbuhan berbiji terbuka disebut juga dengan kelompok?", l: "Gymnospermae", c: "Angiospermae", r: "Dikotil", a: -1 },
    { q: "Pencernaan mekanik di mulut dibantu oleh?", l: "Gigi", c: "Lidah", r: "Air Liur", a: -1 },
    { q: "Organ pencernaan tempat utama penyerapan sari-sari makanan adalah?", l: "Lambung", c: "Usus Halus", r: "Usus Besar", a: 0 },
    { q: "Simbiosis antara ikan hiu dan ikan remora adalah contoh simbiosis?", l: "Parasitisme", c: "Mutualisme", r: "Komensalisme", a: 1 },
    { q: "Zat sisa metabolisme yang diekskresikan (dibuang) oleh ginjal adalah?", l: "Keringat", c: "Urine", r: "Empedu", a: 0 },
    { q: "Contoh hewan ovipar (bertelur) adalah?", l: "Kucing", c: "Sapi", r: "Ayam", a: 1 },
    { q: "Sel saraf pada manusia disebut juga dengan istilah?", l: "Neuron", c: "Nefron", r: "Akson", a: -1 }
];

// === VARIABEL GLOBAL UI ===
function startGame() {
    if (typeof BABYLON === 'undefined') {
        alert("Gagal memuat 3D Engine! Pastikan internet lancar, lalu refresh."); return;
    }
    
    // Sembunyikan layar awal
    document.getElementById('screen-start').classList.remove('active');
    
    // Tampilkan HUD & Kontrol
    document.getElementById('screen-game-hud').style.display = 'flex';
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
    
    // Sembunyikan HUD dan tampilkan GameOver
    document.getElementById('screen-game-hud').style.display = 'none';
    document.getElementById('mobile-controls').style.display = 'none';
    document.getElementById('screen-quiz').style.display = 'none';
    document.getElementById('screen-game-over').classList.add('active');
}

// ==========================================
// === CORE BABYLON.JS GAME ENGINE ===
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
const GRAVITY = -0.025;
const JUMP_POWER = 0.4;

// Sistem Rintangan
let activeObstacles = [];
let activeCoins = [];
let nextSpawnZ = 20; 

// Sistem Kuis
let gameSpeed = 0.3; // Kecepatan normal
let isQuizActive = false;
let lastQuizDist = 0;
let quizTimerInterval;
let currentQuestion = null;

function initBabylonGame() {
    const canvas = document.getElementById("renderCanvas");
    if (engine) { engine.dispose(); }

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });

    // Reset State
    playerHP = 3; coinsCollected = 0; distanceTraveled = 0; currentLane = 0;
    nextSpawnZ = 20; isJumping = false; velocityY = 0;
    activeObstacles = []; activeCoins = [];
    gameSpeed = 0.3; isQuizActive = false; lastQuizDist = 0;
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
        ground.material = groundMat; ground.position.z = 1000; 

        // Garis Pembatas Jalur
        const lineMat = new BABYLON.StandardMaterial("lineMat", scene);
        lineMat.diffuseColor = new BABYLON.Color3(1, 1, 1);
        const lineLeft = BABYLON.MeshBuilder.CreateBox("lineL", {width: 0.1, height: 0.01, depth: 2500}, scene);
        lineLeft.position = new BABYLON.Vector3(-1, 0.01, 1000); lineLeft.material = lineMat;
        const lineRight = BABYLON.MeshBuilder.CreateBox("lineR", {width: 0.1, height: 0.01, depth: 2500}, scene);
        lineRight.position = new BABYLON.Vector3(1, 0.01, 1000); lineRight.material = lineMat;

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
            coin.rotation.x = Math.PI / 2; coin.position = new BABYLON.Vector3(xPos, 0.5, zPos);
            coin.material = coinMat; activeCoins.push(coin);
        } else {
            let obs = BABYLON.MeshBuilder.CreateBox("obs", {width: 1.2, height: 1, depth: 1.2}, scene);
            obs.position = new BABYLON.Vector3(xPos, 0.5, zPos);
            obs.material = obsMat; activeObstacles.push(obs);
        }
    }

    // === SISTEM KUIS ===
    function startQuiz() {
        isQuizActive = true;
        gameSpeed = 0.08; // Melambat ekstrem (slow motion)
        
        // Pilih soal acak
        currentQuestion = questions[Math.floor(Math.random() * questions.length)];
        
        // Update Teks Kuis
        document.getElementById('quiz-question').innerText = currentQuestion.q;
        document.getElementById('opt-left').innerText = currentQuestion.l;
        document.getElementById('opt-center').innerText = currentQuestion.c;
        document.getElementById('opt-right').innerText = currentQuestion.r;
        
        // Tampilkan Popup Kuis
        document.getElementById('screen-quiz').style.display = 'flex';
        
        let timeLeft = 6; // 5 detik menjawab + 1 detik delay visual
        document.getElementById('quiz-timer').innerText = timeLeft;
        
        quizTimerInterval = setInterval(() => {
            timeLeft--;
            document.getElementById('quiz-timer').innerText = timeLeft;
            if (timeLeft <= 0) {
                clearInterval(quizTimerInterval);
                evaluateQuiz();
            }
        }, 1000);
    }

    function evaluateQuiz() {
        document.getElementById('screen-quiz').style.display = 'none';
        gameSpeed = 0.3; // Kembali normal
        isQuizActive = false;

        // Cek jalur yang ditempati saat waktu habis
        if (currentLane !== currentQuestion.a) {
            // Jawaban Salah -> Langsung kena hukuman damage
            playerHP--;
            updateHUD();
            flashDamage(); 

            if (playerHP <= 0) {
                isPlaying = false;
                triggerGameOver(false, Math.floor(playerMesh.position.z), coinsCollected); 
            }
        } else {
            // Jawaban Benar! Dapat bonus 5 koin
            coinsCollected += 5;
            updateHUD();
        }
    }

    // === KONTROL SWIPE & KEYBOARD ===
    let touchStartX = 0, touchStartY = 0;
    window.addEventListener("touchstart", (e) => {
        if (!isPlaying) return;
        touchStartX = e.changedTouches[0].screenX; touchStartY = e.changedTouches[0].screenY;
    }, {passive: false});

    window.addEventListener("touchend", (e) => {
        if (!isPlaying || e.target.tagName === "BUTTON") return;
        let deltaX = e.changedTouches[0].screenX - touchStartX;
        let deltaY = e.changedTouches[0].screenY - touchStartY;
        
        if (Math.abs(deltaX) > 30 || Math.abs(deltaY) > 30) {
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                if (deltaX > 0 && currentLane < 1) currentLane++; 
                else if (deltaX < 0 && currentLane > -1) currentLane--; 
            } else {
                if (deltaY < 0 && !isJumping) { isJumping = true; velocityY = JUMP_POWER; }
            }
        }
    });

    window.addEventListener("keydown", (e) => {
        if (!isPlaying) return;
        if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
            if (currentLane > -1) currentLane--;
        } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
            if (currentLane < 1) currentLane++;
        } else if (e.key === "ArrowUp" || e.key === "w" || e.key === "W" || e.code === "Space") {
            if (!isJumping) { isJumping = true; velocityY = JUMP_POWER; }
        }
    });

    // Kontrol Tombol UI
    const btnL = document.getElementById("btn-left");
    const btnR = document.getElementById("btn-right");
    const btnJ = document.getElementById("btn-jump");
    if(btnL) btnL.onpointerdown = () => { if (isPlaying && currentLane > -1) currentLane--; };
    if(btnR) btnR.onpointerdown = () => { if (isPlaying && currentLane < 1) currentLane++; };
    if(btnJ) btnJ.onpointerdown = () => { if (isPlaying && !isJumping) { isJumping = true; velocityY = JUMP_POWER; } };

    // === GAME LOOP ===
    engine.runRenderLoop(function () {
        if (isPlaying && scene) {
            
            // Maju sesuai gameSpeed (Bisa melambat saat kuis)
            playerMesh.position.z += gameSpeed; 
            
            const targetX = currentLane * 2;
            playerMesh.position.x = BABYLON.Scalar.Lerp(playerMesh.position.x, targetX, 0.15);

            if (isJumping) {
                velocityY += GRAVITY;
                playerMesh.position.y += velocityY;
                if (playerMesh.position.y <= 0.75) {
                    playerMesh.position.y = 0.75;
                    isJumping = false; velocityY = 0;
                }
            }

            distanceTraveled = playerMesh.position.z;
            let distInt = Math.floor(distanceTraveled);
            if (distInt < 0) distInt = 0;

            // Trigger Kuis setiap kelipatan 80 Meter
            if (distInt > 0 && distInt % 80 === 0 && !isQuizActive && distInt !== lastQuizDist) {
                startQuiz();
                lastQuizDist = distInt;
            }
            
            // Spawner Rintangan (Hanya muncul jika tidak sedang kuis)
            if (!isQuizActive && playerMesh.position.z + 100 > nextSpawnZ) {
                spawnObject(nextSpawnZ);
                nextSpawnZ += 10 + (Math.random() * 15);
            }

            // Tabrakan Koin
            for (let i = activeCoins.length - 1; i >= 0; i--) {
                let coin = activeCoins[i];
                coin.rotation.y += 0.05; 
                if (playerMesh.intersectsMesh(coin, false)) {
                    coinsCollected++; updateHUD();
                    coin.dispose(); activeCoins.splice(i, 1); 
                } 
                else if (coin.position.z < playerMesh.position.z - 5) {
                    coin.dispose(); activeCoins.splice(i, 1);
                }
            }

            // Tabrakan Rintangan
            for (let i = activeObstacles.length - 1; i >= 0; i--) {
                let obs = activeObstacles[i];
                if (playerMesh.intersectsMesh(obs, false)) {
                    playerHP--; updateHUD(); flashDamage(); 
                    obs.dispose(); activeObstacles.splice(i, 1);
                    if (playerHP <= 0) {
                        isPlaying = false;
                        triggerGameOver(false, distInt, coinsCollected); 
                    }
                }
                else if (obs.position.z < playerMesh.position.z - 5) {
                    obs.dispose(); activeObstacles.splice(i, 1);
                }
            }

            // Update Jarak UI
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
    setTimeout(() => { overlay.style.opacity = "0"; }, 200);
}
