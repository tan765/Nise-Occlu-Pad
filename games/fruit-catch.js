/* === フルーツキャッチ === */
/* 落ちてくるフルーツをカゴでキャッチ */
/* 訓練: 追従 + 手と眼の協応 */

const canvas = document.getElementById('canvas');
let ctx = setupCanvas(canvas);
const particles = new ParticleSystem(400);
let w, h;
let lastTime = 0;

// タイマー
const GAME_TIME = 90;
let gameTimer = GAME_TIME;
let gameStarted = false;
let gameScore = 0;
let showingResults = false;
const replayBtn = { x: 0, y: 0, w: 200, h: 56 };

// カゴ
const basket = {
  x: 0, y: 0, targetX: 0,
  width: 110, height: 60,
  bounceTimer: 0,
};

// フルーツ
const fruits = [];
let maxFruits = 2;
let fruitSpeed = 130;
let difficultyTimer = 0;
let firstFruitSpawned = false;

// フルーツの種類
const FRUIT_TYPES = [
  { name: 'りんご', hue: 0, draw: drawApple },
  { name: 'バナナ', hue: 55, draw: drawBanana },
  { name: 'ぶどう', hue: 280, draw: drawGrape },
  { name: 'みかん', hue: 30, draw: drawOrange },
  { name: 'いちご', hue: 350, draw: drawStrawberry },
];

function resize() {
  ctx = setupCanvas(canvas);
  w = canvas._cssWidth;
  h = canvas._cssHeight;
  basket.y = h - 80;
  basket.x = w / 2;
  basket.targetX = w / 2;
}
resize();
onResize(canvas, () => resize());

function createFruit() {
  const type = FRUIT_TYPES[randInt(0, FRUIT_TYPES.length - 1)];
  const size = rand(80, 110);
  return {
    x: rand(size + 20, w - size - 20),
    y: -size,
    size,
    type,
    speed: fruitSpeed + rand(-20, 20),
    wobblePhase: Math.random() * Math.PI * 2,
    wobbleAmp: rand(15, 30),
    rotation: 0,
    rotSpeed: rand(-2, 2),
    active: true,
    // 落下後バウンスアニメ
    bouncing: false,
    bounceVy: 0,
    bounceAlpha: 1,
  };
}

// フルーツ描画関数
function drawApple(x, y, size) {
  ctx.fillStyle = '#e33';
  ctx.beginPath();
  ctx.arc(x, y, size * 0.45, 0, Math.PI * 2);
  ctx.fill();
  // 葉
  ctx.fillStyle = '#3a3';
  ctx.beginPath();
  ctx.ellipse(x + size * 0.1, y - size * 0.4, size * 0.15, size * 0.08, 0.3, 0, Math.PI * 2);
  ctx.fill();
  // 茎
  ctx.strokeStyle = '#654';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y - size * 0.35);
  ctx.lineTo(x, y - size * 0.5);
  ctx.stroke();
  // ハイライト
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.beginPath();
  ctx.arc(x - size * 0.12, y - size * 0.12, size * 0.12, 0, Math.PI * 2);
  ctx.fill();
}

function drawBanana(x, y, size) {
  ctx.fillStyle = '#FFD700';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(x, y, size * 0.2, size * 0.5, 0.3, 0, Math.PI);
  ctx.fill();
  ctx.fillStyle = '#E6C200';
  ctx.beginPath();
  ctx.ellipse(x, y, size * 0.18, size * 0.45, 0.3, 0, Math.PI);
  ctx.fill();
}

function drawGrape(x, y, size) {
  const r = size * 0.12;
  ctx.fillStyle = '#8855CC';
  const positions = [
    [0, -0.2], [-0.15, 0], [0.15, 0],
    [-0.08, 0.2], [0.08, 0.2], [0, 0.38],
  ];
  for (const [dx, dy] of positions) {
    ctx.beginPath();
    ctx.arc(x + dx * size, y + dy * size, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = '#3a3';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y - size * 0.3);
  ctx.lineTo(x, y - size * 0.45);
  ctx.stroke();
}

function drawOrange(x, y, size) {
  ctx.fillStyle = '#FF8C00';
  ctx.beginPath();
  ctx.arc(x, y, size * 0.42, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.beginPath();
  ctx.arc(x - size * 0.1, y - size * 0.1, size * 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3a3';
  ctx.beginPath();
  ctx.ellipse(x, y - size * 0.38, size * 0.08, size * 0.05, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawStrawberry(x, y, size) {
  ctx.fillStyle = '#DC143C';
  ctx.beginPath();
  ctx.moveTo(x, y - size * 0.35);
  ctx.quadraticCurveTo(x + size * 0.45, y - size * 0.1, x + size * 0.1, y + size * 0.4);
  ctx.lineTo(x, y + size * 0.45);
  ctx.lineTo(x - size * 0.1, y + size * 0.4);
  ctx.quadraticCurveTo(x - size * 0.45, y - size * 0.1, x, y - size * 0.35);
  ctx.fill();
  // 種
  ctx.fillStyle = '#FFD700';
  for (let i = 0; i < 4; i++) {
    const sx = x + (Math.random() - 0.5) * size * 0.3;
    const sy = y + (Math.random() - 0.5) * size * 0.3;
    ctx.beginPath();
    ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
  // 葉
  ctx.fillStyle = '#3a3';
  ctx.beginPath();
  ctx.ellipse(x, y - size * 0.35, size * 0.2, size * 0.06, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawBasket() {
  const bx = basket.x, by = basket.y;
  const bw = basket.width / 2, bh = basket.height;
  const bounce = basket.bounceTimer > 0 ? Math.sin(basket.bounceTimer * 15) * 5 : 0;

  ctx.save();
  ctx.translate(0, bounce);

  // カゴ本体（台形）
  const topW = bw * 0.8, bottomW = bw * 1.1;
  ctx.fillStyle = '#D2691E';
  ctx.beginPath();
  ctx.moveTo(bx - topW, by);
  ctx.lineTo(bx - bottomW, by + bh);
  ctx.lineTo(bx + bottomW, by + bh);
  ctx.lineTo(bx + topW, by);
  ctx.closePath();
  ctx.fill();

  // 編み模様
  ctx.strokeStyle = 'rgba(139, 90, 43, 0.5)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 4; i++) {
    const t = (i + 1) / 5;
    const ly = by + bh * t;
    const lw = topW + (bottomW - topW) * t;
    ctx.beginPath();
    ctx.moveTo(bx - lw, ly);
    ctx.lineTo(bx + lw, ly);
    ctx.stroke();
  }
  for (let i = -3; i <= 3; i++) {
    const lx = bx + i * bw * 0.35;
    ctx.beginPath();
    ctx.moveTo(lx, by);
    ctx.lineTo(lx + (bottomW - topW) / bh * bh * (i > 0 ? 0.3 : -0.3), by + bh);
    ctx.stroke();
  }

  // 縁
  ctx.strokeStyle = '#8B4513';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(bx - topW, by);
  ctx.lineTo(bx + topW, by);
  ctx.stroke();

  ctx.restore();
}

function drawGameTimer() {
  if (!gameStarted || showingResults) return;
  const secs = Math.ceil(gameTimer);
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath(); ctx.roundRect(w / 2 - 40, 12, 80, 32, 16); ctx.fill();
  ctx.fillStyle = secs <= 10 ? '#e55' : '#fff';
  ctx.font = 'bold 20px "Hiragino Sans", sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(`${secs}`, w / 2, 28);

  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath(); ctx.roundRect(w / 2 + 50, 12, 100, 32, 16); ctx.fill();
  ctx.fillStyle = '#FFD700';
  ctx.font = 'bold 18px "Hiragino Sans", sans-serif';
  ctx.fillText(`${gameScore} こ`, w / 2 + 100, 28);
  ctx.restore();
}

function drawResults() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 38px "Hiragino Sans", sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('おわり！', w / 2, h * 0.3);
  ctx.font = 'bold 60px "Hiragino Sans", sans-serif';
  ctx.fillStyle = '#FFD700';
  ctx.fillText(`${gameScore}`, w / 2, h * 0.44);
  ctx.font = 'bold 22px "Hiragino Sans", sans-serif';
  ctx.fillStyle = '#fff';
  ctx.fillText('こ キャッチしたよ！', w / 2, h * 0.54);

  replayBtn.x = w / 2 - replayBtn.w / 2;
  replayBtn.y = h * 0.66;
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.beginPath(); ctx.roundRect(replayBtn.x, replayBtn.y, replayBtn.w, replayBtn.h, 28); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(replayBtn.x, replayBtn.y, replayBtn.w, replayBtn.h, 28); ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 22px "Hiragino Sans", sans-serif';
  ctx.fillText('もういっかい', w / 2, replayBtn.y + replayBtn.h / 2);
  ctx.restore();
}

function resetGame() {
  gameTimer = GAME_TIME;
  gameStarted = false;
  gameScore = 0;
  showingResults = false;
  maxFruits = 2;
  fruitSpeed = 130;
  difficultyTimer = 0;
  firstFruitSpawned = false;
  fruits.length = 0;
  basket.x = w / 2;
  basket.targetX = w / 2;
}

canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  soundManager.init();
  soundManager.createSounds();
  if (!soundManager._bgmStarted) { soundManager.playBgm(); soundManager._bgmStarted = true; }
  const pos = getPointerPos(canvas, e);

  if (showingResults) {
    if (pos.x >= replayBtn.x && pos.x <= replayBtn.x + replayBtn.w &&
        pos.y >= replayBtn.y && pos.y <= replayBtn.y + replayBtn.h) { resetGame(); }
    return;
  }

  if (!gameStarted) gameStarted = true;
  basket.targetX = Math.max(basket.width / 2, Math.min(w - basket.width / 2, pos.x));
});

canvas.addEventListener('pointermove', (e) => {
  e.preventDefault();
  if (showingResults) return;
  const pos = getPointerPos(canvas, e);
  basket.targetX = Math.max(basket.width / 2, Math.min(w - basket.width / 2, pos.x));
});

function animate(time) {
  const dt = Math.min((time - lastTime) / 1000, 0.05);
  lastTime = time;

  if (gameStarted && !showingResults) {
    gameTimer -= dt;
    if (gameTimer <= 0) { gameTimer = 0; showingResults = true; }

    difficultyTimer += dt;
    if (difficultyTimer > 15) {
      difficultyTimer = 0;
      maxFruits = Math.min(5, maxFruits + 1);
      fruitSpeed += 20;
    }
  }

  // 背景（青空）
  const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
  bgGrad.addColorStop(0, '#4FC3F7');
  bgGrad.addColorStop(0.7, '#81D4FA');
  bgGrad.addColorStop(1, '#A5D6A7');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  // 雲
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  const cloudX = ((time / 60) % (w + 200)) - 100;
  drawCloud(cloudX, h * 0.1, 50);
  drawCloud(((cloudX + w * 0.5) % (w + 200)) - 100, h * 0.18, 35);

  // 地面
  ctx.fillStyle = '#8BC34A';
  ctx.fillRect(0, h - 30, w, 30);

  if (!showingResults) {
    // カゴ更新
    basket.x += (basket.targetX - basket.x) * 0.25;
    if (basket.bounceTimer > 0) basket.bounceTimer -= dt;

    // フルーツ更新
    for (let i = fruits.length - 1; i >= 0; i--) {
      const f = fruits[i];
      if (f.bouncing) {
        f.bounceVy += 300 * dt;
        f.y += f.bounceVy * dt;
        f.bounceAlpha -= dt * 1.5;
        f.rotation += f.rotSpeed * dt * 3;
        if (f.bounceAlpha <= 0) { fruits.splice(i, 1); continue; }
      } else {
        f.y += f.speed * dt;
        f.wobblePhase += 2 * dt;
        f.x += Math.sin(f.wobblePhase) * f.wobbleAmp * dt;
        f.rotation += f.rotSpeed * dt;

        // カゴとの当たり判定
        if (f.y + f.size * 0.3 >= basket.y &&
            f.y < basket.y + basket.height &&
            f.x >= basket.x - basket.width / 2 - f.size * 0.3 &&
            f.x <= basket.x + basket.width / 2 + f.size * 0.3) {
          gameScore++;
          basket.bounceTimer = 0.3;
          soundManager.play('catch', 0.7);
          particles.emit(f.x, basket.y, 12, {
            speedMin: 40, speedMax: 120,
            sizeMin: 3, sizeMax: 8,
            lifeMin: 0.3, lifeMax: 0.8,
            gravity: 40, hue: f.type.hue, shape: 'star',
          });
          fruits.splice(i, 1);
          continue;
        }

        // 地面に落下
        if (f.y > h - 30) {
          f.bouncing = true;
          f.bounceVy = -80;
          f.bounceAlpha = 1;
        }
      }

      // 描画
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.rotate(f.rotation);
      if (f.bouncing) ctx.globalAlpha = f.bounceAlpha;
      f.type.draw(0, 0, f.size);
      ctx.restore();
    }

    // フルーツ補充
    const activeFruits = fruits.filter(f => !f.bouncing).length;
    if (activeFruits < maxFruits && gameStarted) {
      if (!firstFruitSpawned) {
        fruits.push(createFruit());
        firstFruitSpawned = true;
      } else if (Math.random() < dt * 2.0) {
        fruits.push(createFruit());
      }
    }
  }

  drawBasket();

  particles.update(dt);
  particles.draw(ctx);

  drawGameTimer();
  if (showingResults) drawResults();

  requestAnimationFrame(animate);
}

function drawCloud(x, y, size) {
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.arc(x + size * 0.8, y - size * 0.2, size * 0.7, 0, Math.PI * 2);
  ctx.arc(x + size * 1.4, y, size * 0.6, 0, Math.PI * 2);
  ctx.fill();
}

requestAnimationFrame(animate);

function toggleSound() {
  const enabled = soundManager.toggle();
  document.getElementById('soundBtn').textContent = enabled ? '🔊' : '🔇';
}
