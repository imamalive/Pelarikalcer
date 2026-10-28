// ==========================================
// DATA 15 SOAL BIOLOGI SMP
// Jawaban yang benar: -1 (Kiri), 0 (Tengah), 1 (Kanan)
// ==========================================
const questions = [
    { q: "Organel sel tempat terjadinya respirasi (pernapasan sel) adalah?", l: "Ribosom", c: "Mitokondria", r: "Nukleus", a: 0 },
    { q: "Proses pembuatan makanan pada tumbuhan dibantu cahaya matahari disebut?", l: "Fotosintesis", c: "Respirasi", r: "Transpirasi", a: -1 },
    { q: "Hewan pemakan segala (tumbuhan dan daging) disebut?", l: "Karnivora", c: "Herbivora", r: "Omnivora", a: 1 },
    { q: "Sel darah merah yang berfungsi mengikat oksigen adalah?", l: "Eritrosit", c: "Leukosit", r: "Trombosit", a: -1 },
    { q: "Alat pernapasan utama pada ikan adalah?", l: "Paru-paru", c: "Trakea", r: "Insang", a: 1 },
    { q: "Zat hijau daun yang berperan penting dalam fotosintesis adalah?", l: "Klorofil", c: "Stomata", r: "Kambium", a: -1 },
    { q: "Enzim di lambung yang berfungsi memecah protein menjadi pepton adalah?", l: "Ptialin", c: "Pepsin", r: "Amilase", a: 0 },
    { q: "Tempat pertukaran oksigen dan karbon dioksida di paru-paru terjadi di?", l: "Bronkus", c: "Laring", r: "Alveolus", a: 1 },
    { q: "Tumbuhan berbiji terbuka disebut juga dengan kelompok?", l: "Gymnospermae", c: "Angiospermae", r: "Dikotil", a: -1 },
    { q: "Pencernaan mekanik makanan di dalam rongga mulut dibantu oleh?", l: "Gigi", c: "Enzim", r: "Lambung", a: -1 },
    { q: "Organ pencernaan tempat utama penyerapan sari-sari makanan adalah?", l: "Kerongkongan", c: "Usus Halus", r: "Usus Besar", a: 0 },
    { q: "Hubungan antara ikan hiu dan ikan remora adalah contoh simbiosis?", l: "Parasitisme", c: "Mutualisme", r: "Komensalisme", a: 1 },
    { q: "Zat sisa metabolisme yang disaring dan dikeluarkan oleh ginjal berupa?", l: "Keringat", c: "Urine", r: "Empedu", a: 0 },
    { q: "Contoh hewan yang berkembang biak secara ovipar (bertelur) adalah?", l: "Kucing", c: "Sapi", r: "Ayam", a: 1 },
    { q: "Unit terkecil penyusun sistem saraf pada manusia disebut?", l: "Neuron", c: "Nefron", r: "Alveolus", a: -1 }
];

function startGame() {
    if (typeof BABYLON === 'undefined') {
        alert("Gagal memuat 3D Engine! Pastikan internet lancar, lalu muat ulang halaman."); return;
    }
    document.getElementById('screen-start').classList.remove('active');
    document.getElementById('screen-game-hud').style.display = 'flex';
    document.getElementById('mobile-controls').style.display = 'flex';
    
    try {
        initBabylonGame();
    } catch (err) {
        alert("Error saat merender 3D: " + err.message);
    }
}

function triggerGameOver(isWin, finalDistance, finalCoins) {
    document.getElementById('end-title').innerText = isWin ? "🎉 GARIS FINISH! KAMU MENANG!" : "💥 GAME OVER";
    document.getElementById('end-distance').innerText = finalDistance;
    document.getElementById('end-coins').innerText = finalCoins;
    
    document.getElementById('screen-game-hud').style.display = 'none';
    document.getElementById('mobile-controls').style.display = 'none';
    document.getElementById('screen-quiz').style.display = 'none';
    document.getElementById('screen-game-over').classList.add('active');
}

// ==========================================
// === CORE BABYLON.JS GAME ENGINE ===
// ==========================================

let engine, scene, playerRoot;
let leftArm, rightArm, leftLeg, rightLeg;
let currentLane = 0; // -1 (Kiri), 0 (Tengah), 1 (Kanan)
let isPlaying = false;
let distanceTraveled = 0;
let coinsCollected = 0;
let playerHP = 3; 
const MAX_DISTANCE = 1000;

// Variabel Lompat & Animasi
let velocityY = 0;
let isJumping = false;
const GRAVITY = -0.024;
const JUMP_POWER = 0.42;
let walkCycle = 0;

// Sistem Rintangan & Hutan
let activeObstacles = [];
let activeCoins = [];
let nextSpawnZ = 35; // Mulai muncul rintangan agak jauh di awal

// Sistem Kuis
let gameSpeed = 0.32; 
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

    // Reset Variabel
    playerHP = 3; coinsCollected = 0; distanceTraveled = 0; currentLane = 0;
    nextSpawnZ = 35; isJumping = false; velocityY = 0; walkCycle = 0;
    activeObstacles = []; activeCoins = [];
    gameSpeed = 0.32; isQuizActive = false; lastQuizDist = 0;
    if (quizTimerInterval) clearInterval(quizTimerInterval);
    updateHUD();

    let shadowGen;

    const createScene = function () {
        const scene = new BABYLON.Scene(engine);
        
        // Atmosfer & Kabut Hutan Realistis (Fog)
        scene.clearColor = new BABYLON.Color3(0.55, 0.82, 0.95);
        scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
        scene.fogDensity = 0.008;
        scene.fogColor = new BABYLON.Color3(0.55, 0.82, 0.95);

        // Kamera Follow
        const camera = new BABYLON.FollowCamera("FollowCam", new BABYLON.Vector3(0, 5, -10), scene);
        camera.radius = 7.5; 
        camera.heightOffset = 3.2; 
        camera.rotationOffset = 180;
        camera.cameraAcceleration = 0.06; 
        camera.maxCameraSpeed = 20;

        // Pencahayaan Alami + Matahari untuk Bayangan (Shadows)
        const hemiLight = new BABYLON.HemisphericLight("hemiLight", new BABYLON.Vector3(0, 1, 0), scene);
        hemiLight.intensity = 0.65;
        hemiLight.groundColor = new BABYLON.Color3(0.2, 0.3, 0.15);

        const dirLight = new BABYLON.DirectionalLight("dirLight", new BABYLON.Vector3(-0.5, -1, 0.5), scene);
        dirLight.position = new BABYLON.Vector3(20, 40, -20);
        dirLight.intensity = 0.85;

        // Generator Bayangan Realistis
        shadowGen = new BABYLON.ShadowGenerator(1024, dirLight);
        shadowGen.useBlurExponentialShadowMap = true;
        shadowGen.blurKernel = 16;

        // === LINGKUNGAN HUTAN & LINTASAN ===
        // 1. Rumput Hutan di Kiri & Kanan
        const grass = BABYLON.MeshBuilder.CreateGround("grass", {width: 120, height: 2600}, scene);
        const grassMat = new BABYLON.StandardMaterial("grassMat", scene);
        grassMat.diffuseColor = new BABYLON.Color3(0.22, 0.52, 0.18);
        grassMat.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05);
        grass.material = grassMat;
        grass.position = new BABYLON.Vector3(0, -0.05, 1000);
        grass.receiveShadows = true;

        // 2. Jalan Tanah Hutan (3 Jalur)
        const road = BABYLON.MeshBuilder.CreateGround("road", {width: 7.5, height: 2600}, scene);
        const roadMat = new BABYLON.StandardMaterial("roadMat", scene);
        roadMat.diffuseColor = new BABYLON.Color3(0.55, 0.38, 0.22);
        roadMat.specularColor = new BABYLON.Color3(0.08, 0.06, 0.04);
        road.material = roadMat;
        road.position = new BABYLON.Vector3(0, 0, 1000);
        road.receiveShadows = true;

        // 3. Pembatas Pinggir Jalan & Garis Jalur
        const lineMat = new BABYLON.StandardMaterial("lineMat", scene);
        lineMat.diffuseColor = new BABYLON.Color3(0.85, 0.78, 0.65);
        const lineL = BABYLON.MeshBuilder.CreateBox("lineL", {width: 0.08, height: 0.02, depth: 2600}, scene);
        lineL.position = new BABYLON.Vector3(-1, 0.01, 1000); lineL.material = lineMat;
        const lineR = BABYLON.MeshBuilder.CreateBox("lineR", {width: 0.08, height: 0.02, depth: 2600}, scene);
        lineR.position = new BABYLON.Vector3(1, 0.01, 1000); lineR.material = lineMat;

        // 4. Membuat Pepohonan Hutan & Pondok di Samping Lintasan
        const trunkMat = new BABYLON.StandardMaterial("trunkMat", scene);
        trunkMat.diffuseColor = new BABYLON.Color3(0.4, 0.25, 0.12);
        const leafMat = new BABYLON.StandardMaterial("leafMat", scene);
        leafMat.diffuseColor = new BABYLON.Color3(0.15, 0.45, 0.15);
        leafMat.specularColor = new BABYLON.Color3(0.05, 0.1, 0.05);

        for (let z = 10; z < 1100; z += 14) {
            [-1, 1].forEach(side => {
                let xPos = side * (5.5 + Math.random() * 5);
                
                // Batang Pohon
                let trunk = BABYLON.MeshBuilder.CreateCylinder("trunk", {diameterTop: 0.4, diameterBottom: 0.6, height: 2.5}, scene);
                trunk.position = new BABYLON.Vector3(xPos, 1.25, z + Math.random() * 5);
                trunk.material = trunkMat;
                trunk.freezeWorldMatrix();

                // Daun Pohon Rindang (2 tumpuk)
                let leaves1 = BABYLON.MeshBuilder.CreateCylinder("leaves1", {diameterTop: 0.2, diameterBottom: 2.8, height: 2.8, tessellation: 7}, scene);
                leaves1.position = new BABYLON.Vector3(trunk.position.x, 3.2, trunk.position.z);
                leaves1.material = leafMat;
                leaves1.freezeWorldMatrix();

                let leaves2 = BABYLON.MeshBuilder.CreateCylinder("leaves2", {diameterTop: 0, diameterBottom: 2.2, height: 2.2, tessellation: 7}, scene);
                leaves2.position = new BABYLON.Vector3(trunk.position.x, 4.5, trunk.position.z);
                leaves2.material = leafMat;
                leaves2.freezeWorldMatrix();
            });
        }

        // 5. Gapura Garis Finish di 1000m
        const finishPoleL = BABYLON.MeshBuilder.CreateCylinder("fPoleL", {diameter: 0.4, height: 5}, scene);
        finishPoleL.position = new BABYLON.Vector3(-3.5, 2.5, MAX_DISTANCE);
        const finishPoleR = BABYLON.MeshBuilder.CreateCylinder("fPoleR", {diameter: 0.4, height: 5}, scene);
        finishPoleR.position = new BABYLON.Vector3(3.5, 2.5, MAX_DISTANCE);
        const finishBanner = BABYLON.MeshBuilder.CreateBox("fBanner", {width: 7.5, height: 1, depth: 0.2}, scene);
        finishBanner.position = new BABYLON.Vector3(0, 4.5, MAX_DISTANCE);
        const bannerMat = new BABYLON.StandardMaterial("bMat", scene);
        bannerMat.diffuseColor = new BABYLON.Color3(1, 0.8, 0);
        finishBanner.material = bannerMat;

        // === MEMBUAT KARAKTER ANAK SEKOLAH 3D (DENGAN ANIMASI LARI) ===
        playerRoot = new BABYLON.TransformNode("playerRoot", scene);
        playerRoot.position = new BABYLON.Vector3(0, 0, 0);

        const skinMat = new BABYLON.StandardMaterial("skinMat", scene);
        skinMat.diffuseColor = new BABYLON.Color3(0.95, 0.76, 0.62);
        const shirtMat = new BABYLON.StandardMaterial("shirtMat", scene);
        shirtMat.diffuseColor = new BABYLON.Color3(0.95, 0.95, 0.95); // Baju putih
        const pantsMat = new BABYLON.StandardMaterial("pantsMat", scene);
        pantsMat.diffuseColor = new BABYLON.Color3(0.15, 0.25, 0.55); // Celana biru SMP
        const bagMat = new BABYLON.StandardMaterial("bagMat", scene);
        bagMat.diffuseColor = new BABYLON.Color3(0.85, 0.2, 0.2); // Tas ransel merah
        const hairMat = new BABYLON.StandardMaterial("hairMat", scene);
        hairMat.diffuseColor = new BABYLON.Color3(0.15, 0.12, 0.1);

        // Badan (Torso)
        const torso = BABYLON.MeshBuilder.CreateBox("torso", {width: 0.7, height: 0.85, depth: 0.4}, scene);
        torso.position.y = 1.1;
        torso.material = shirtMat;
        torso.parent = playerRoot;
        shadowGen.addShadowCaster(torso);

        // Tas Ransel (Mirip gambar referensi)
        const backpack = BABYLON.MeshBuilder.CreateBox("bag", {width: 0.55, height: 0.65, depth: 0.28}, scene);
        backpack.position = new BABYLON.Vector3(0, 1.12, -0.3);
        backpack.material = bagMat;
        backpack.parent = playerRoot;
        shadowGen.addShadowCaster(backpack);

        // Kepala & Rambut
        const head = BABYLON.MeshBuilder.CreateSphere("head", {diameter: 0.58}, scene);
        head.position.y = 1.82;
        head.material = skinMat;
        head.parent = playerRoot;
        shadowGen.addShadowCaster(head);

        const hair = BABYLON.MeshBuilder.CreateSphere("hair", {diameter: 0.62, slice: 0.6}, scene);
        hair.position.y = 1.86;
        hair.material = hairMat;
        hair.parent = playerRoot;

        // Kaki Kiri & Kanan
        leftLeg = BABYLON.MeshBuilder.CreateBox("leftLeg", {width: 0.26, height: 0.7, depth: 0.28}, scene);
        leftLeg.position = new BABYLON.Vector3(-0.18, 0.35, 0);
        leftLeg.material = pantsMat;
        leftLeg.parent = playerRoot;
        shadowGen.addShadowCaster(leftLeg);

        rightLeg = BABYLON.MeshBuilder.CreateBox("rightLeg", {width: 0.26, height: 0.7, depth: 0.28}, scene);
        rightLeg.position = new BABYLON.Vector3(0.18, 0.35, 0);
        rightLeg.material = pantsMat;
        rightLeg.parent = playerRoot;
        shadowGen.addShadowCaster(rightLeg);

        // Lengan Kiri & Kanan
        leftArm = BABYLON.MeshBuilder.CreateBox("leftArm", {width: 0.22, height: 0.65, depth: 0.22}, scene);
        leftArm.position = new BABYLON.Vector3(-0.48, 1.1, 0);
        leftArm.material = skinMat;
        leftArm.parent = playerRoot;

        rightArm = BABYLON.MeshBuilder.CreateBox("rightArm", {width: 0.22, height: 0.65, depth: 0.22}, scene);
        rightArm.position = new BABYLON.Vector3(0.48, 1.1, 0);
        rightArm.material = skinMat;
        rightArm.parent = playerRoot;

        camera.lockedTarget = torso;
        return scene;
    };

    scene = createScene();
    isPlaying = true; 

    // === MATERIAL RINTANGAN REALISTIS (BATU, KAYU, ULAR) & KOIN ===
    const rockMat = new BABYLON.StandardMaterial("rockMat", scene);
    rockMat.diffuseColor = new BABYLON.Color3(0.45, 0.47, 0.48);
    rockMat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);

    const logMat = new BABYLON.StandardMaterial("logMat", scene);
    logMat.diffuseColor = new BABYLON.Color3(0.42, 0.26, 0.12);

    const snakeMat = new BABYLON.StandardMaterial("snakeMat", scene);
    snakeMat.diffuseColor = new BABYLON.Color3(0.2, 0.75, 0.25);

    const coinMat = new BABYLON.StandardMaterial("coinMat", scene);
    coinMat.diffuseColor = new BABYLON.Color3(1, 0.84, 0); 
    coinMat.emissiveColor = new BABYLON.Color3(0.4, 0.3, 0);
    coinMat.specularColor = new BABYLON.Color3(1, 1, 0.8);

    // FUNGSI MEMUNCULKAN RINTANGAN HUTAN & KOIN
    function spawnObject(zPos) {
        const lane = Math.floor(Math.random() * 3) - 1; 
        const xPos = lane * 2;
        const isCoin = Math.random() > 0.35;

        if (isCoin) {
            let coin = BABYLON.MeshBuilder.CreateCylinder("coin", {diameter: 0.75, height: 0.12}, scene);
            coin.rotation.z = Math.PI / 2; 
            coin.position = new BABYLON.Vector3(xPos, 0.7, zPos);
            coin.material = coinMat;
            shadowGen.addShadowCaster(coin);
            activeCoins.push(coin);
        } else {
            // Pilih rintangan acak: 0 = Batu Cadas, 1 = Batang Kayu, 2 = Ular Hutan
            const obsType = Math.floor(Math.random() * 3);
            let obs;

            if (obsType === 0) {
                // Batu Cadas (Polyhedron bersegi kasar)
                obs = BABYLON.MeshBuilder.CreatePolyhedron("rock", {type: 1, size: 0.65}, scene);
                obs.scaling = new BABYLON.Vector3(1.1, 0.9, 1.0);
                obs.position = new BABYLON.Vector3(xPos, 0.55, zPos);
                obs.material = rockMat;
            } else if (obsType === 1) {
                // Batang Kayu Tumbang Melintang
                obs = BABYLON.MeshBuilder.CreateCylinder("log", {diameter: 0.65, height: 1.6, tessellation: 12}, scene);
                obs.rotation.z = Math.PI / 2;
                obs.position = new BABYLON.Vector3(xPos, 0.35, zPos);
                obs.material = logMat;
            } else {
                // Ular Hutan Melingkar (Torus + Kepala)
                obs = BABYLON.MeshBuilder.CreateTorus("snake", {diameter: 1.0, thickness: 0.28, tessellation: 16}, scene);
                obs.position = new BABYLON.Vector3(xPos, 0.2, zPos);
                obs.material = snakeMat;

                let sHead = BABYLON.MeshBuilder.CreateSphere("sHead", {diameter: 0.38}, scene);
                sHead.position = new BABYLON.Vector3(0, 0.35, -0.35);
                sHead.material = snakeMat;
                sHead.parent = obs;
            }

            shadowGen.addShadowCaster(obs);
            activeObstacles.push(obs);
        }
    }

    // FUNGSI MEMBERSIHKAN JALAN SAAT & SETELAH SOAL (REVISI UTAMA)
    function clearUpcomingPath(bufferDistance) {
        for (let i = activeObstacles.length - 1; i >= 0; i--) {
            if (activeObstacles[i].position.z > playerRoot.position.z - 2) {
                activeObstacles[i].dispose();
                activeObstacles.splice(i, 1);
            }
        }
        for (let i = activeCoins.length - 1; i >= 0; i--) {
            if (activeCoins[i].position.z > playerRoot.position.z - 2) {
                activeCoins[i].dispose();
                activeCoins.splice(i, 1);
            }
        }
        // Dorong titik muncul rintangan berikutnya jauh ke depan (zona aman)
        nextSpawnZ = playerRoot.position.z + bufferDistance;
    }

    // === SISTEM KUIS ===
    function startQuiz() {
        isQuizActive = true;
        gameSpeed = 0.09; // Melambat (Slow motion)
        
        // Bersihkan seluruh rintangan di depan agar pemain fokus membaca soal!
        clearUpcomingPath(80);
        
        currentQuestion = questions[Math.floor(Math.random() * questions.length)];
        
        document.getElementById('quiz-question').innerText = currentQuestion.q;
        document.getElementById('opt-left').innerText = currentQuestion.l;
        document.getElementById('opt-center').innerText = currentQuestion.c;
        document.getElementById('opt-right').innerText = currentQuestion.r;
        highlightSelectedOption();
        
        document.getElementById('screen-quiz').style.display = 'flex';
        
        let timeLeft = 6;
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
        
        // REVISI: Pastikan setelah soal selesai, jalanan di depan kosong sejauh 45 meter!
        // Jadi rintangan baru akan muncul setelah pemain berlari santai beberapa saat.
        clearUpcomingPath(45);

        if (currentLane !== currentQuestion.a) {
            // Jawaban Salah -> Muncul batu besar mendadak tepat di depan karakter!
            let punishRock = BABYLON.MeshBuilder.CreatePolyhedron("punishRock", {type: 1, size: 0.85}, scene);
            punishRock.position = new BABYLON.Vector3(currentLane * 2, 0.7, playerRoot.position.z + 2.2);
            punishRock.material = rockMat;
            
            setTimeout(() => { punishRock.dispose(); }, 600);

            playerHP--;
            updateHUD();
            flashDamage(); 

            if (playerHP <= 0) {
                isPlaying = false;
                triggerGameOver(false, Math.floor(playerRoot.position.z), coinsCollected); 
                return;
            }
        } else {
            // Jawaban Benar! Bonus 5 Koin
            coinsCollected += 5;
            updateHUD();
        }

        gameSpeed = 0.32; // Kecepatan kembali normal
        isQuizActive = false;
    }

    function highlightSelectedOption() {
        document.getElementById('box-left').classList.toggle('selected-lane', currentLane === -1);
        document.getElementById('box-center').classList.toggle('selected-lane', currentLane === 0);
        document.getElementById('box-right').classList.toggle('selected-lane', currentLane === 1);
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
                highlightSelectedOption();
            } else {
                if (deltaY < 0 && !isJumping) { isJumping = true; velocityY = JUMP_POWER; }
            }
        }
    });

    window.addEventListener("keydown", (e) => {
        if (!isPlaying) return;
        if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
            if (currentLane > -1) currentLane--;
            highlightSelectedOption();
        } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
            if (currentLane < 1) currentLane++;
            highlightSelectedOption();
        } else if (e.key === "ArrowUp" || e.key === "w" || e.key === "W" || e.code === "Space") {
            if (!isJumping) { isJumping = true; velocityY = JUMP_POWER; }
        }
    });

    const btnL = document.getElementById("btn-left");
    const btnR = document.getElementById("btn-right");
    const btnJ = document.getElementById("btn-jump");
    if(btnL) btnL.onpointerdown = () => { if (isPlaying && currentLane > -1) { currentLane--; highlightSelectedOption(); } };
    if(btnR) btnR.onpointerdown = () => { if (isPlaying && currentLane < 1) { currentLane++; highlightSelectedOption(); } };
    if(btnJ) btnJ.onpointerdown = () => { if (isPlaying && !isJumping) { isJumping = true; velocityY = JUMP_POWER; } };

    // === GAME LOOP ===
    engine.runRenderLoop(function () {
        if (isPlaying && scene) {
            
            // 1. Maju sesuai gameSpeed
            playerRoot.position.z += gameSpeed; 
            
            // 2. Pindah Jalur Mulus
            const targetX = currentLane * 2;
            playerRoot.position.x = BABYLON.Scalar.Lerp(playerRoot.position.x, targetX, 0.16);

            // 3. Animasi Ayunan Tangan & Kaki saat Berlari
            if (!isJumping) {
                walkCycle += gameSpeed * 1.1;
                leftLeg.rotation.x = Math.sin(walkCycle) * 0.65;
                rightLeg.rotation.x = -Math.sin(walkCycle) * 0.65;
                leftArm.rotation.x = -Math.sin(walkCycle) * 0.55;
                rightArm.rotation.x = Math.sin(walkCycle) * 0.55;
            } else {
                // Posisi kaki saat melompat
                leftLeg.rotation.x = 0.4;
                rightLeg.rotation.x = -0.4;
            }

            // 4. Fisika Lompat
            if (isJumping) {
                velocityY += GRAVITY;
                playerRoot.position.y += velocityY;
                if (playerRoot.position.y <= 0) {
                    playerRoot.position.y = 0;
                    isJumping = false; velocityY = 0;
                }
            }

            distanceTraveled = playerRoot.position.z;
            let distInt = Math.floor(distanceTraveled);
            if (distInt < 0) distInt = 0;

            // 5. Trigger Kuis setiap kelipatan 80 Meter
            if (distInt > 0 && distInt % 80 === 0 && !isQuizActive && distInt !== lastQuizDist && distInt < MAX_DISTANCE - 30) {
                startQuiz();
                lastQuizDist = distInt;
            }
            
            // 6. Spawner Rintangan (Hanya muncul jika TIDAK sedang kuis, dan jarak pandang 75m)
            if (!isQuizActive && playerRoot.position.z + 75 > nextSpawnZ && nextSpawnZ < MAX_DISTANCE - 20) {
                spawnObject(nextSpawnZ);
                nextSpawnZ += 13 + (Math.random() * 14);
            }

            // 7. Deteksi Ambil Koin (Berdasarkan jarak koordinat yang akurat)
            for (let i = activeCoins.length - 1; i >= 0; i--) {
                let coin = activeCoins[i];
                coin.rotation.y += 0.06; 
                
                let dz = Math.abs(playerRoot.position.z - coin.position.z);
                let dx = Math.abs(playerRoot.position.x - coin.position.x);
                let dy = playerRoot.position.y;

                if (dz < 0.85 && dx < 0.85 && dy < 1.3) {
                    coinsCollected++; updateHUD();
                    coin.dispose(); activeCoins.splice(i, 1); 
                } 
                else if (coin.position.z < playerRoot.position.z - 6) {
                    coin.dispose(); activeCoins.splice(i, 1);
                }
            }

            // 8. Deteksi Tabrakan Rintangan (Batu, Kayu, Ular)
            for (let i = activeObstacles.length - 1; i >= 0; i--) {
                let obs = activeObstacles[i];
                
                let dz = Math.abs(playerRoot.position.z - obs.position.z);
                let dx = Math.abs(playerRoot.position.x - obs.position.x);
                let dy = playerRoot.position.y;

                // Jika karakter berada di jalur yang sama dan tidak melompat cukup tinggi (dy < 0.85)
                if (dz < 0.75 && dx < 0.8 && dy < 0.85) {
                    playerHP--; updateHUD(); flashDamage(); 
                    obs.dispose(); activeObstacles.splice(i, 1);
                    if (playerHP <= 0) {
                        isPlaying = false;
                        triggerGameOver(false, distInt, coinsCollected); 
                    }
                }
                else if (obs.position.z < playerRoot.position.z - 6) {
                    obs.dispose(); activeObstacles.splice(i, 1);
                }
            }

            // 9. Update Progress Bar UI
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
    overlay.style.opacity = "1";
    setTimeout(() => { overlay.style.opacity = "0"; }, 250);
}
