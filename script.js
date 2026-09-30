const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const restartBtn = document.getElementById('restart-btn');
const levelIndicator = document.getElementById('level-indicator');

// Елементи магазину
const coinCounter = document.getElementById('coin-counter');
const shopBtn = document.getElementById('shop-btn');
const shopModal = document.getElementById('shop-modal');
const closeShopBtn = document.getElementById('close-shop');
const buyBtns = document.querySelectorAll('.buy-btn');
const soundBtn = document.getElementById('sound-btn');

let soundEnabled = true;
let audioCtx = null;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

function playTone(freq, type, duration, vol=0.1) {
    if (!soundEnabled) return;
    initAudio();
    let osc = audioCtx.createOscillator();
    let gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
    return osc;
}

function playSound(name) {
    if (!soundEnabled) return;
    initAudio();
    
    if (name === 'escape') {
        let osc = playTone(300, 'sine', 0.3, 0.1);
        osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.3);
    } 
    else if (name === 'block') {
        let osc = playTone(150, 'sawtooth', 0.2, 0.1);
        osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.2);
    }
    else if (name === 'win') {
        playTone(400, 'sine', 0.2, 0.1);
        setTimeout(() => playTone(500, 'sine', 0.2, 0.1), 150);
        setTimeout(() => playTone(600, 'sine', 0.4, 0.15), 300);
    }
    else if (name === 'coin') {
        playTone(1200, 'sine', 0.1, 0.05);
        setTimeout(() => playTone(1600, 'sine', 0.3, 0.1), 50);
    }
}

soundBtn.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    soundBtn.textContent = soundEnabled ? '🔊 Звук: Увімк' : '🔈 Звук: Вимк';
    if(soundEnabled) initAudio();
});

const CANVAS_SIZE = 640;
let gridSize = 8;
let cellSize = CANVAS_SIZE / gridSize;

let snakes = [];
let lastTime = 0;
let currentLevel = 0;
let levelTransitioning = false;
let coins = 0;
let purchasedItems = {}; // зберігатимемо куплені речі

const levels = [
    // Level 1
    [
        { id: 1, color: '#ff4757', path: [{x:3, y:6}, {x:4, y:6}, {x:4, y:5}, {x:4, y:4}, {x:3, y:4}, {x:2, y:4}] },
        { id: 2, color: '#1e90ff', path: [{x:6, y:6}, {x:5, y:6}, {x:5, y:5}, {x:5, y:4}, {x:5, y:3}, {x:4, y:3}, {x:3, y:3}, {x:2, y:3}] },
        { id: 3, color: '#2ed573', path: [{x:7, y:4}, {x:7, y:3}, {x:7, y:2}, {x:7, y:1}, {x:6, y:1}, {x:5, y:1}, {x:4, y:1}] },
        { id: 4, color: '#ffa502', path: [{x:0, y:2}, {x:0, y:3}, {x:0, y:4}, {x:1, y:4}, {x:1, y:5}] },
        { id: 5, color: '#3742fa', path: [{x:5, y:7}, {x:6, y:7}, {x:7, y:7}, {x:7, y:6}, {x:7, y:5}] },
        { id: 6, color: '#2f3542', path: [{x:3, y:7}, {x:2, y:7}, {x:1, y:7}] }
    ],
    // Level 2 
    [
        { id: 1, color: '#ff4757', path: [{x:1, y:1}, {x:2, y:1}, {x:3, y:1}] },
        { id: 2, color: '#1e90ff', path: [{x:4, y:1}, {x:4, y:2}, {x:4, y:3}, {x:5, y:3}] },
        { id: 3, color: '#2ed573', path: [{x:6, y:2}, {x:6, y:3}, {x:6, y:4}] },
        { id: 4, color: '#ffa502', path: [{x:7, y:5}, {x:6, y:5}, {x:5, y:5}, {x:4, y:5}] },
        { id: 5, color: '#9b59b6', path: [{x:3, y:4}, {x:3, y:5}, {x:3, y:6}] },
        { id: 6, color: '#2f3542', path: [{x:4, y:7}, {x:3, y:7}, {x:2, y:7}] }
    ],
    // Level 3 
    [
        { id: 1, color: '#e67e22', path: [{x:4, y:2}, {x:4, y:3}] }, 
        { id: 2, color: '#1abc9c', path: [{x:5, y:1}, {x:5, y:2}, {x:5, y:3}] },
        { id: 3, color: '#e74c3c', path: [{x:6, y:5}, {x:5, y:5}, {x:4, y:5}] },
        { id: 4, color: '#34495e', path: [{x:3, y:5}, {x:3, y:4}, {x:2, y:4}, {x:2, y:3}] },
        { id: 5, color: '#9b59b6', path: [{x:3, y:1}, {x:2, y:1}] }, 
        { id: 6, color: '#f1c40f', path: [{x:1, y:2}, {x:1, y:3}, {x:1, y:4}] },
        { id: 7, color: '#ff6b81', path: [{x:6, y:1}, {x:7, y:1}, {x:7, y:2}, {x:7, y:3}, {x:6, y:3}] },
        { id: 8, color: '#7bed9f', path: [{x:6, y:6}, {x:7, y:6}, {x:7, y:5}] } 
    ]
];

function generateProceduralLevel(levelIndex) {
    // Збільшуємо розмір поля для більш складних рівнів!
    gridSize = Math.min(22, 8 + Math.floor((levelIndex - 2) / 1.5));
    cellSize = CANVAS_SIZE / gridSize;
    
    let gridW = gridSize;
    let gridH = gridSize;
    
    // Дуже багато червачків і величезна довжина на високих рівнях!
    let numWorms = Math.min(80, 8 + Math.floor(levelIndex * 2.5));
    let minL = Math.min(30, 4 + Math.floor(levelIndex * 0.8));
    let maxL = Math.min(60, 6 + Math.floor(levelIndex * 1.5));
    
    let genWorms = [];
    let grid = Array(gridH).fill(0).map(() => Array(gridW).fill(null));
    const colors = ['#ff4757', '#1e90ff', '#2ed573', '#ffa502', '#3742fa', '#2f3542', '#ff6b81', '#7bed9f', '#e67e22', '#1abc9c', '#9b59b6', '#e84393', '#00cec9', '#fdcb6e', '#d63031'];

    for (let i = 0; i < numWorms; i++) {
        let placed = false;
        let attempts = 0;
        
        while (!placed && attempts < 2000) { // Більше спроб для щільного пакування
            attempts++;
            let hx = Math.floor(Math.random() * gridW);
            let hy = Math.floor(Math.random() * gridH);
            
            let dirs = [[0,-1], [1,0], [0,1], [-1,0]];
            let dir = dirs[Math.floor(Math.random() * dirs.length)];
            
            let nx = hx - dir[0];
            let ny = hy - dir[1];
            
            if (grid[hy][hx] !== null) continue;
            if (nx < 0 || nx >= gridW || ny < 0 || ny >= gridH || grid[ny][nx] !== null) continue;
            
            let escapeClear = true;
            let ex = hx + dir[0];
            let ey = hy + dir[1];
            while (ex >= 0 && ex < gridW && ey >= 0 && ey < gridH) {
                if (grid[ey][ex] !== null) {
                    escapeClear = false;
                    break;
                }
                ex += dir[0];
                ey += dir[1];
            }
            
            if (!escapeClear) continue;
            
            let targetLen = minL + Math.floor(Math.random() * (maxL - minL + 1));
            let body = [{x: hx, y: hy}, {x: nx, y: ny}];
            let curX = nx;
            let curY = ny;
            
            let tempGrid = Array(gridH).fill(0).map(() => Array(gridW).fill(false));
            tempGrid[hy][hx] = true;
            tempGrid[ny][nx] = true;
            
            ex = hx + dir[0];
            ey = hy + dir[1];
            while (ex >= 0 && ex < gridW && ey >= 0 && ey < gridH) {
                tempGrid[ey][ex] = true;
                ex += dir[0];
                ey += dir[1];
            }

            let len = 2;
            while (len < targetLen) {
                let neighbors = [];
                for (let d of dirs) {
                    let nnx = curX + d[0];
                    let nny = curY + d[1];
                    if (nnx >= 0 && nnx < gridW && nny >= 0 && nny < gridH) {
                        if (grid[nny][nnx] === null && !tempGrid[nny][nnx]) {
                            neighbors.push({x: nnx, y: nny});
                        }
                    }
                }
                if (neighbors.length === 0) break;
                
                let next = neighbors[Math.floor(Math.random() * neighbors.length)];
                body.push(next);
                tempGrid[next.y][next.x] = true;
                curX = next.x;
                curY = next.y;
                len++;
            }
            
            if (len >= minL) {
                for (let pt of body) {
                    grid[pt.y][pt.x] = i;
                }
                genWorms.push({
                    id: i + 1,
                    color: colors[i % colors.length],
                    path: body.reverse()
                });
                placed = true;
            }
        }
    }
    return genWorms;
}

function initGame() {
    levelTransitioning = false;
    levelIndicator.textContent = `Рівень ${currentLevel + 1}`;
    
    let levelData;
    if (currentLevel < levels.length) {
        gridSize = 8;
        cellSize = CANVAS_SIZE / gridSize;
        levelData = levels[currentLevel];
    } else {
        levelData = generateProceduralLevel(currentLevel);
    }
    
    snakes = JSON.parse(JSON.stringify(levelData));
    
    snakes.forEach(snake => {
        snake.len = snake.path.length;
        snake.pos = snake.len - 1;
        snake.state = 'idle';
        snake.shakeTime = 0;
        
        let head = snake.path[snake.path.length - 1];
        let neck = snake.path[snake.path.length - 2];
        if (!neck) neck = { x: head.x, y: head.y - 1 };
        
        let dx = head.x - neck.x;
        let dy = head.y - neck.y;
        
        for (let i = 0; i < 20; i++) {
            head = {x: head.x + dx, y: head.y + dy};
            snake.path.push(head);
        }
    });
}

function getPoint(path, t) {
    if (t <= 0) return path[0];
    if (t >= path.length - 1) return path[path.length - 1];
    let i = Math.floor(t);
    let rem = t - i;
    return {
        x: path[i].x + (path[i+1].x - path[i].x) * rem,
        y: path[i].y + (path[i+1].y - path[i].y) * rem
    };
}

function distToSegment(p, v, w) {
    let l2 = (v.x - w.x)**2 + (v.y - w.y)**2;
    if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
}

function canEscape(snake) {
    for (let step = 1; step <= 20; step++) {
        let occ = [];
        for (let i = 0; i < snake.len; i++) occ.push(snake.pos - snake.len + 1 + step + i);
        
        for (let other of snakes) {
            if (other === snake || other.state !== 'idle') continue;
            let otherOcc = [];
            for (let i = 0; i < other.len; i++) otherOcc.push(other.pos - other.len + 1 + i);
            
            for (let idx of occ) {
                if (idx >= snake.path.length) continue;
                let p1 = snake.path[idx];
                for (let oIdx of otherOcc) {
                    if (oIdx >= other.path.length) continue;
                    let p2 = other.path[oIdx];
                    if (p1.x === p2.x && p1.y === p2.y) return false; 
                }
            }
        }
    }
    return true;
}

canvas.addEventListener('click', (e) => {
    if (levelTransitioning) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    for (let snake of snakes) {
        if (snake.state !== 'idle') continue;
        let hit = false;
        
        if (snake.len === 1) {
             let p = snake.path[0];
             let px = p.x * cellSize + cellSize/2;
             let py = p.y * cellSize + cellSize/2;
             if (Math.hypot(x-px, y-py) < cellSize * 0.4) hit = true;
        } else {
            for (let i = snake.pos - snake.len + 1; i < snake.pos; i++) {
                let p1 = snake.path[i];
                let p2 = snake.path[i+1];
                let px1 = p1.x * cellSize + cellSize/2;
                let py1 = p1.y * cellSize + cellSize/2;
                let px2 = p2.x * cellSize + cellSize/2;
                let py2 = p2.y * cellSize + cellSize/2;
                if (distToSegment({x,y}, {x:px1, y:py1}, {x:px2, y:py2}) < cellSize * 0.4) {
                    hit = true; break;
                }
            }
        }
        
        if (hit) {
            if (canEscape(snake)) {
                snake.state = 'escaping';
                playSound('escape');
            } else {
                snake.shakeTime = 0.3; 
                playSound('block');
            }
            break;
        }
    }
});

function drawSnake(snake) {
    let offsetX = snake.shakeTime > 0 ? Math.sin(snake.shakeTime * 50) * (cellSize * 0.06) : 0;
    
    ctx.save();
    ctx.translate(offsetX, 0);
    
    let startT = snake.pos - snake.len + 1;
    
    ctx.beginPath();
    let pStart = getPoint(snake.path, startT);
    ctx.moveTo(pStart.x * cellSize + cellSize/2, pStart.y * cellSize + cellSize/2);
    for (let i = Math.ceil(startT); i <= Math.floor(snake.pos); i++) {
        let p = snake.path[i];
        ctx.lineTo(p.x * cellSize + cellSize/2, p.y * cellSize + cellSize/2);
    }
    let pEnd = getPoint(snake.path, snake.pos);
    ctx.lineTo(pEnd.x * cellSize + cellSize/2, pEnd.y * cellSize + cellSize/2);
    
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = cellSize * 0.55 + (cellSize > 30 ? 6 : 3);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    
    ctx.strokeStyle = snake.color;
    ctx.lineWidth = cellSize * 0.55;
    ctx.stroke();

    ctx.save();
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = cellSize * 0.55;
    ctx.setLineDash([cellSize * 0.06, cellSize * 0.22]); 
    ctx.lineDashOffset = -snake.pos * cellSize; 
    ctx.stroke();
    ctx.restore();

    let headDirT = snake.pos - 0.1;
    if (headDirT < 0) headDirT = 0;
    let pDir = getPoint(snake.path, headDirT);
    let dx = pEnd.x - pDir.x;
    let dy = pEnd.y - pDir.y;
    let angle = Math.atan2(dy, dx);

    ctx.translate(pEnd.x * cellSize + cellSize/2, pEnd.y * cellSize + cellSize/2);
    ctx.rotate(angle);
    
    ctx.beginPath();
    ctx.moveTo(cellSize * 0.25, 0);
    ctx.lineTo(cellSize * 0.05, -cellSize * 0.18);
    ctx.lineTo(cellSize * 0.05, cellSize * 0.18);
    ctx.fillStyle = snake.color;
    ctx.fill();
    
    let eyeRad = cellSize * 0.08;
    if (eyeRad < 1.5) eyeRad = 1.5;
    let pupilRad = cellSize * 0.035;
    if (pupilRad < 1) pupilRad = 1;

    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(cellSize * 0.05, -cellSize * 0.12, eyeRad, 0, Math.PI*2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cellSize * 0.05, cellSize * 0.12, eyeRad, 0, Math.PI*2);
    ctx.fill();

    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(cellSize * 0.07, -cellSize * 0.12, pupilRad, 0, Math.PI*2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cellSize * 0.07, cellSize * 0.12, pupilRad, 0, Math.PI*2);
    ctx.fill();

    ctx.restore();
}

function gameLoop(time) {
    let dt = (time - lastTime) / 1000;
    lastTime = time;
    if (dt > 0.1) dt = 0.1; 
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#e1e5ea';
    let dotSize = cellSize * 0.06;
    if (dotSize < 2) dotSize = 2;
    for (let x = 0; x < gridSize; x++) {
        for (let y = 0; y < gridSize; y++) {
            ctx.beginPath();
            ctx.arc(x * cellSize + cellSize/2, y * cellSize + cellSize/2, dotSize, 0, Math.PI*2);
            ctx.fill();
        }
    }
    
    let allEscaped = true;
    for (let snake of snakes) {
        if (snake.state !== 'escaped') allEscaped = false;
        
        if (snake.state === 'escaping') {
            snake.pos += dt * 15; 
            if (snake.pos >= snake.path.length - 1) snake.state = 'escaped';
        }
        
        if (snake.shakeTime > 0) snake.shakeTime -= dt;
        if (snake.state !== 'escaped') drawSnake(snake);
    }
    
    let reward = 10 + currentLevel * 5;
    
    if (allEscaped && snakes.length > 0 && !levelTransitioning) {
        levelTransitioning = true;
        playSound('win');
        
        // Нарахування валюти
        coins += reward;
        coinCounter.textContent = coins;
        
        setTimeout(() => {
            currentLevel++;
            initGame();
        }, 2000);
    }

    if (levelTransitioning) {
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fillRect(0,0, canvas.width, canvas.height);
        ctx.fillStyle = '#2c3e50';
        ctx.font = 'bold 48px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText("Супер!", canvas.width/2, canvas.height/2 - 20);
        
        ctx.fillStyle = '#e67e22';
        ctx.font = 'bold 32px sans-serif';
        ctx.fillText(`+${reward} 🍎`, canvas.width/2, canvas.height/2 + 30);
    }
    
    requestAnimationFrame(gameLoop);
}

// Події магазину
shopBtn.addEventListener('click', () => {
    shopModal.classList.remove('hidden');
    updateShopButtons();
});

closeShopBtn.addEventListener('click', () => {
    shopModal.classList.add('hidden');
});

function updateShopButtons() {
    buyBtns.forEach(btn => {
        let cost = parseInt(btn.getAttribute('data-cost'));
        let val = btn.getAttribute('data-val');
        
        if (purchasedItems[val]) {
            btn.textContent = 'Вибрати';
            btn.style.backgroundColor = '#3498db';
            btn.disabled = false;
        } else if (coins >= cost) {
            btn.textContent = 'Купити';
            btn.style.backgroundColor = '#2ed573';
            btn.disabled = false;
        } else {
            btn.textContent = 'Немає 🍎';
            btn.style.backgroundColor = '#bdc3c7';
            btn.disabled = true;
        }
    });
}

buyBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        let cost = parseInt(btn.getAttribute('data-cost'));
        let val = btn.getAttribute('data-val');
        let textColor = btn.getAttribute('data-text') || '#2c3e50';
        
        if (!purchasedItems[val]) {
            if (coins >= cost) {
                coins -= cost;
                coinCounter.textContent = coins;
                purchasedItems[val] = true;
                playSound('coin');
            }
        }
        
        // Застосувати покупку (Фон)
        if (purchasedItems[val]) {
            document.body.style.backgroundColor = val;
            document.body.style.color = textColor;
            shopModal.classList.add('hidden');
        }
    });
});

restartBtn.addEventListener('click', initGame);

initGame();
requestAnimationFrame(gameLoop);
