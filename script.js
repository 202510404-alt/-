// =========================================================================
// 1. 기본 설정 및 초기화 (ES5 호환)
// =========================================================================
var canvas = document.getElementById('gameCanvas');
var ctx = canvas.getContext('2d');

// --- 게임 상태 및 전역 변수 ---
var gameState = 'mario';
var score = 0;
var keys = {};
var gameTime = 0, startTime = Date.now();

// --- 키보드 입력 감지 ---
document.addEventListener('keydown', function(e) {
    var key = e.key.toLowerCase();
    keys[key] = true;
    if (['w','a','s','d',' '].indexOf(key) !== -1) {
        e.preventDefault();
    }
});
document.addEventListener('keyup', function(e) {
    keys[e.key.toLowerCase()] = false;
});


// =========================================================================
// 2. 게임의 심장 - 게임 루프
// =========================================================================
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

function update() {
    if (gameState === 'mario') {
        updateMario();
    } else if (gameState === 'drone') {
        updateDrone();
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (gameState === 'mario') {
        drawMario();
    } else if (gameState === 'drone') {
        drawDrone();
    }
}


// =========================================================================
// 3. MARIO 파트
// =========================================================================
var marioPlayer, goal, clouds, groundTiles, cleanedGroundTiles, platforms, coins, sewers, particles;
var MARIO_GRAVITY = 0.8;
var MARIO_GOAL_TIME = 120;
var MARIO_SCROLL_THRESHOLD = canvas.width / 2;
var PLATFORM_MIN_GAP = 150, PLATFORM_MAX_GAP = 300;
var COIN_SPAWN_CHANCE = 0.15, SEWER_SPAWN_CHANCE = 0.1;
var PARTICLE_COUNT = 30, PARTICLE_LIFESPAN = 60;

function initMario() {
    gameState = 'mario';
    score = 0;
    startTime = Date.now();
    marioPlayer = { x: 50, y: 400, width: 30, height: 50, speed: 5, vy: 0, isJumping: true };
    goal = { x: 0, y: 0, width: 20, height: 1000, isActive: false };
    clouds = []; groundTiles = []; cleanedGroundTiles = []; platforms = []; coins = []; sewers = []; particles = [];
    
    for (var i = 0; i < 5; i++) { clouds.push({ x: Math.random() * canvas.width * 2, y: Math.random() * 200 + 50, width: Math.random()*50+50, height: Math.random()*20+20, speed: Math.random()*0.5+0.2 }); }
    groundTiles.push({ x: 0, y: 550, width: canvas.width, height: 50 });
    groundTiles.push({ x: canvas.width, y: 550, width: canvas.width, height: 50 });
    
    var currentX = canvas.width / 2;
    for (var i=0; i < 10; i++) {
        currentX = generateMarioObjects(currentX);
    }
}

function generateMarioObjects(currentX) {
    var gap = Math.random() * (PLATFORM_MAX_GAP - PLATFORM_MIN_GAP) + PLATFORM_MIN_GAP;
    var nextX = currentX + gap;
    
    if (Math.random() < 0.8) {
        var width = Math.random() * 70 + 80;
        platforms.push({ x: nextX, y: 430, width: width, height: 15 });
        if (Math.random() < COIN_SPAWN_CHANCE) coins.push({ x: nextX + width/2 - 10, y: 400, width: 20, height: 20 });
    }
    if (Math.random() < SEWER_SPAWN_CHANCE) {
        sewers.push({ x: nextX, y: 550, width: 60, height: 20, isCleaned: false, hitCount: 0 });
    }
    return nextX;
}

function updateMario() {
    gameTime = (Date.now() - startTime) / 1000;
    var scrollSpeed = 0;
    if (keys['d']) {
        if (marioPlayer.x < MARIO_SCROLL_THRESHOLD) { marioPlayer.x += marioPlayer.speed; } 
        else { scrollSpeed = marioPlayer.speed; }
    }
    if (keys['a'] && marioPlayer.x > 0) { marioPlayer.x -= marioPlayer.speed; }

    if (scrollSpeed > 0) {
        var allScrollable = groundTiles.concat(cleanedGroundTiles, clouds, platforms, coins, sewers, [goal]);
        allScrollable.forEach(function(obj) {
            var speed = obj.speed ? scrollSpeed * obj.speed : scrollSpeed;
            if (obj) obj.x -= speed;
        });
    }

    if (keys['w'] && !marioPlayer.isJumping) { marioPlayer.vy = -18; marioPlayer.isJumping = true; }
    marioPlayer.vy += MARIO_GRAVITY;
    marioPlayer.y += marioPlayer.vy;

    var onSomething = false;
    var allGround = groundTiles.concat(cleanedGroundTiles);
    allGround.forEach(function(tile) { if (marioPlayer.y + marioPlayer.height >= tile.y && marioPlayer.x < tile.x + tile.width && marioPlayer.x + marioPlayer.width > tile.x) { marioPlayer.y = tile.y - marioPlayer.height; marioPlayer.vy = 0; onSomething = true; } });
    platforms.forEach(function(p) { if (marioPlayer.vy > 0 && marioPlayer.y + marioPlayer.height >= p.y && marioPlayer.y + marioPlayer.height - marioPlayer.vy <= p.y + 5 && marioPlayer.x < p.x + p.width && marioPlayer.x + marioPlayer.width > p.x) { marioPlayer.y = p.y - marioPlayer.height; marioPlayer.vy = 0; onSomething = true; } });
    marioPlayer.isJumping = !onSomething;
    
    if (keys[' '] && score > 0) {
        keys[' '] = false; score--;
        for (var i = 0; i < PARTICLE_COUNT; i++) { particles.push({ x: marioPlayer.x + 15, y: marioPlayer.y + 25, radius: Math.random() * 2 + 2, vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 5 - 3, lifespan: PARTICLE_LIFESPAN }); }
    }
    for (var i = coins.length - 1; i >= 0; i--) { var c = coins[i]; if (marioPlayer.x < c.x + c.width && marioPlayer.x + marioPlayer.width > c.x && marioPlayer.y < c.y + c.height && marioPlayer.y + marioPlayer.height > c.y) { score++; coins.splice(i, 1); } }
    
    for (var i = particles.length - 1; i >= 0; i--) {
        var p = particles[i];
        p.vy += MARIO_GRAVITY * 0.3; p.x += p.vx; p.y += p.vy; p.lifespan--;
        for (var j = 0; j < sewers.length; j++) { var sewer = sewers[j]; if (!sewer.isCleaned && p.x > sewer.x && p.x < sewer.x + sewer.width && p.y > sewer.y) { sewer.hitCount++; p.lifespan = 0; if (sewer.hitCount >= 3) sewer.isCleaned = true; break; } }
        if (p.lifespan <= 0) particles.splice(i, 1);
    }
    
    var rightmostX = 0; 
    var worldObjects = groundTiles.concat(platforms, sewers);
    worldObjects.forEach(function(obj) { if (obj.x + obj.width > rightmostX) rightmostX = obj.x + obj.width; });
    
    if (!goal.isActive && rightmostX < canvas.width * 2) { generateMarioObjects(rightmostX); }
    groundTiles.forEach(function(t, i) { if (t.x + t.width < 0) { var other = i === 0 ? 1 : 0; t.x = groundTiles[other].x + groundTiles[other].width; } });
    if (cleanedGroundTiles.length > 0) { cleanedGroundTiles.forEach(function(t, i) { if (t.x + t.width < 0) { var other = i === 0 ? 1 : 0; t.x = cleanedGroundTiles[other].x + cleanedGroundTiles[other].width; } }); }

    if (gameTime >= MARIO_GOAL_TIME && !goal.isActive) {
        goal.isActive = true;
        var endOfWorldX = rightmostX;
        goal.x = endOfWorldX;
        cleanedGroundTiles.push({ x: endOfWorldX, y: 550, width: canvas.width * 2, height: 50 });
        cleanedGroundTiles.push({ x: endOfWorldX + canvas.width * 2, y: 550, width: canvas.width * 2, height: 50 });
    }
    if (goal.isActive && marioPlayer.x + marioPlayer.width > goal.x) {
        initDrone();
    }
}

function drawMario() {
    ctx.fillStyle = '#87CEEB'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white'; clouds.forEach(function(c) { ctx.fillRect(c.x, c.y, c.width, c.height); });
    ctx.fillStyle = 'green'; groundTiles.forEach(function(t) { ctx.fillRect(t.x, t.y, t.width, t.height); });
    ctx.fillStyle = 'dodgerblue'; cleanedGroundTiles.forEach(function(t) { ctx.fillRect(t.x, t.y, t.width, t.height); });
    sewers.forEach(function(s) { ctx.fillStyle = s.isCleaned ? 'deepskyblue' : 'black'; ctx.fillRect(s.x, s.y, s.width, s.height); });
    ctx.fillStyle = 'gold'; coins.forEach(function(c) { ctx.beginPath(); ctx.arc(c.x + 10, c.y + 10, 10, 0, Math.PI*2); ctx.fill(); });
    ctx.fillStyle = 'rgba(0, 150, 255, 0.7)'; particles.forEach(function(p) { ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill(); });
    ctx.fillStyle = 'saddlebrown'; platforms.forEach(function(p) { ctx.fillRect(p.x, p.y, p.width, p.height); });
    ctx.fillStyle = 'red'; ctx.fillRect(marioPlayer.x, marioPlayer.y, marioPlayer.width, marioPlayer.height);
    ctx.fillStyle = 'black'; ctx.font = '20px Arial'; ctx.fillText('Time: ' + Math.floor(gameTime) + 's', 10, 30); ctx.fillText('Microbes: ' + score, 10, 60);
}


// =========================================================================
// 4. DRONE 파트
// =========================================================================
var POLLUTANT_COUNT = 1000;
var MICROBE_SPEED = 4;
var MICROBE_LIFESPAN = 300;
var dronePlayer, pollutants;

function initDrone() {
    gameState = 'drone';
    dronePlayer = { x: canvas.width/2 - 25, y: canvas.height - 60, width: 50, height: 30, speed: 7 };
    pollutants = [];
    particles = [];
    for (var i = 0; i < POLLUTANT_COUNT; i++) {
        pollutants.push({ x: Math.random() * canvas.width, y: Math.random() * (canvas.height - 100), radius: Math.random() * 4 + 2 });
    }
}

function updateDrone() {
    if (keys['a']) dronePlayer.x -= dronePlayer.speed; if (keys['d']) dronePlayer.x += dronePlayer.speed;
    if (keys['w']) dronePlayer.y -= dronePlayer.speed; if (keys['s']) dronePlayer.y += dronePlayer.speed;
    if (dronePlayer.x < 0) dronePlayer.x = 0; if (dronePlayer.x + dronePlayer.width > canvas.width) dronePlayer.x = canvas.width - dronePlayer.width;
    if (dronePlayer.y < 0) dronePlayer.y = 0; if (dronePlayer.y + dronePlayer.height > canvas.height) dronePlayer.y = canvas.height - dronePlayer.height;
    
    if (keys[' '] && score > 0) {
        keys[' '] = false; score--;
        for (var i = 0; i < PARTICLE_COUNT; i++) { particles.push({ x: dronePlayer.x + 25, y: dronePlayer.y, radius: 3, lifespan: MICROBE_LIFESPAN }); }
    }
    
    for (var i = particles.length - 1; i >= 0; i--) {
        var microbe = particles[i];
        microbe.lifespan--;
        if (pollutants.length === 0 || microbe.lifespan <= 0) { particles.splice(i, 1); continue; }
        
        var nearestPollutant = null, minDistanceSq = Infinity;
        for (var j = 0; j < pollutants.length; j++) { var pollutant = pollutants[j]; var dx = pollutant.x - microbe.x, dy = pollutant.y - microbe.y; var distSq = dx*dx + dy*dy; if (distSq < minDistanceSq) { minDistanceSq = distSq; nearestPollutant = pollutant; } }
        
        if (nearestPollutant) {
            var distance = Math.sqrt(minDistanceSq);
            if (distance < MICROBE_SPEED) {
                particles.splice(i, 1);
                var p_index = pollutants.indexOf(nearestPollutant);
                if (p_index > -1) pollutants.splice(p_index, 1);
            } else {
                var dirX = (nearestPollutant.x - microbe.x) / distance;
                var dirY = (nearestPollutant.y - microbe.y) / distance;
                microbe.x += dirX * MICROBE_SPEED;
                microbe.y += dirY * MICROBE_SPEED;
            }
        }
    }
}

function drawDrone() {
    ctx.fillStyle = '#1a237e'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(139, 69, 19, 0.6)'; pollutants.forEach(function(p) { ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill(); });
    ctx.fillStyle = '#00e676'; particles.forEach(function(m) { ctx.beginPath(); ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2); ctx.fill(); });
    ctx.fillStyle = 'silver'; ctx.fillRect(dronePlayer.x, dronePlayer.y, dronePlayer.width, dronePlayer.height);
    ctx.fillStyle = 'white'; ctx.font = '20px Arial';
    ctx.fillText('Microbes Left: ' + score, 10, 30);
    ctx.fillText('Pollutants Left: ' + pollutants.length, 10, 60);
}


// =========================================================================
// 5. 게임 시작
// =========================================================================
initMario();
gameLoop();
