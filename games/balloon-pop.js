/* === ふうせんポン === */
/* ゆっくり浮かぶ風船をタップで割る */
/* 訓練: 追従 + 固視 */

const canvas = document.getElementById('canvas');
let ctx = setupCanvas(canvas);
const particles = new ParticleSystem(400);
let w, h;
let lastTime = 0;
const balloons = [];
const MAX_BALLOONS = 7;

// タイマー
const GAME_TIME = 60;
let gameTimer = GAME_TIME;
let gameStarted = false;
let gameScore = 0;
let showingResults = false;
const replayBtn = { x: 0, y: 0, w: 200, h: 56 };

const COLORS = [
  { h: 0, s: 80, l: 60 },    // 赤
  { h: 30, s: 90, l: 60 },   // オレンジ
  { h: 50, s: 90, l: 55 },   // 黄
  { h: 130, s: 70, l: 50 },  // 緑
  { h: 200, s: 80, l: 60 },  // 水色
  { h: 270, s: 70, l: 65 },  // 紫
  { h: 330, s: 80, l: 65 },  // ピンク
];

function resize() {
  ctx = setupCanvas(canvas);
  w = canvas._cssWidth;
  h = canvas._cssHeight;
}
resize();
onResize(canvas, () => resize());

function createBalloon() {
  const color = COLORS[randInt(0, COLORS.length - 1)];
  // 20% の確率で速くて小さい風船
  const isFast = Math.random() < 0.2;
  const radius = isFast ? rand(30, 42) : rand(40, 60);
  const speed = isFast ? rand(1.5, 2.2) : rand(0.5, 1.8);
  return {
    x: rand(radius, w - radius),
    y: h + radius + rand(0, 100),
    radius: radius,
    color: color,
    speed: speed,
    wobblePhase: Math.random() * Math.PI * 2,
    wobbleSpeed: rand(1, 2.5),
    wobbleAmp: rand(15, 30),
    popped: false,
  };
}

// 初期配置
for (let i = 0; i < MAX_BALLOONS; i++) {
  const b = createBalloon();
  b.y = rand(h * 0.2, h * 0.9);
  balloons.push(b);
}

function drawBalloon(b) {
  if (b.popped) return;

  ctx.save();
  ctx.translate(b.x, b.y);

  // 本体
  const grad = ctx.createRadialGradient(
    -b.radius * 0.3, -b.radius * 0.3, b.radius * 0.1,
    0, 0, b.radius
  );
  grad.addColorStop(0, hsl(b.color.h, b.color.s, b.color.l + 20));
  grad.addColorStop(1, hsl(b.color.h, b.color.s, b.color.l));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(0, 0, b.radius * 0.85, b.radius, 0, 0, Math.PI * 2);
  ctx.fill();

  // ハイライト
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.beginPath();
  ctx.ellipse(-b.radius * 0.25, -b.radius * 0.35, b.radius * 0.2, b.radius * 0.3, -0.3, 0, Math.PI * 2);
  ctx.fill();

  // 紐
  ctx.strokeStyle = hsl(b.color.h, b.color.s, b.color.l - 10);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, b.radius);
  ctx.quadraticCurveTo(5, b.radius + 15, -3, b.radius + 30);
  ctx.stroke();

  ctx.restore();
}

function popBalloon(b) {
  b.popped = true;
  gameScore++;
  particles.emit(b.x, b.y, 20, {
    speedMin: 60, speedMax: 180,
    sizeMin: 4, sizeMax: 10,
    lifeMin: 0.5, lifeMax: 1.2,
    gravity: 50,
    hue: b.color.h,
    shape: 'circle'
  });
  particles.emit(b.x, b.y, 8, {
    speedMin: 30, speedMax: 100,
    sizeMin: 3, sizeMax: 7,
    lifeMin: 0.4, lifeMax: 1.0,
    gravity: 30,
    hue: (b.color.h + 180) % 360,
    shape: 'star'
  });
  soundManager.play('pop', 0.7);
}

function resetGame() {
  gameTimer = GAME_TIME;
  gameStarted = false;
  gameScore = 0;
  showingResults = false;
  balloons.length = 0;
  for (let i = 0; i < MAX_BALLOONS; i++) {
    const b = createBalloon();
    b.y = rand(h * 0.2, h * 0.9);
    balloons.push(b);
  }
}

// タッチ
canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  soundManager.init();
  soundManager.createSounds();
  if (!soundManager._bgmStarted) {
    soundManager.playBgm();
    soundManager._bgmStarted = true;
  }
  const pos = getPointerPos(canvas, e);

  // リプレイ判定
  if (showingResults) {
    if (pos.x >= replayBtn.x && pos.x <= replayBtn.x + replayBtn.w &&
        pos.y >= replayBtn.y && pos.y <= replayBtn.y + replayBtn.h) {
      resetGame();
    }
    return;
  }

  // ゲーム開始
  if (!gameStarted) gameStarted = true;

  for (let i = balloons.length - 1; i >= 0; i--) {
    const b = balloons[i];
    if (b.popped) continue;
    if (dist(pos.x, pos.y, b.x, b.y) < b.radius * 1.3) {
      popBalloon(b);
      break;
    }
  }
});

function drawTimer() {
  if (!gameStarted || showingResults) return;
  const secs = Math.ceil(gameTimer);
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  ctx.roundRect(w / 2 - 40, 12, 80, 32, 16);
  ctx.fill();
  ctx.fillStyle = secs <= 10 ? '#e55' : '#fff';
  ctx.font = 'bold 20px "Hiragino Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${secs}`, w / 2, 28);
  ctx.restore();
}

function drawResults() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 38px "Hiragino Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('おわり！', w / 2, h * 0.3);

  ctx.font = 'bold 60px "Hiragino Sans", sans-serif';
  ctx.fillStyle = '#FFD700';
  ctx.fillText(`${gameScore}`, w / 2, h * 0.44);

  ctx.font = 'bold 22px "Hiragino Sans", sans-serif';
  ctx.fillStyle = '#fff';
  ctx.fillText('こ われたよ！', w / 2, h * 0.54);

  // もういっかいボタン
  replayBtn.x = w / 2 - replayBtn.w / 2;
  replayBtn.y = h * 0.66;
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.beginPath();
  ctx.roundRect(replayBtn.x, replayBtn.y, replayBtn.w, replayBtn.h, 28);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(replayBtn.x, replayBtn.y, replayBtn.w, replayBtn.h, 28);
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 22px "Hiragino Sans", sans-serif';
  ctx.fillText('もういっかい', w / 2, replayBtn.y + replayBtn.h / 2);
  ctx.restore();
}

function animate(time) {
  const dt = Math.min((time - lastTime) / 1000, 0.05);
  lastTime = time;

  // タイマー更新
  if (gameStarted && !showingResults) {
    gameTimer -= dt;
    if (gameTimer <= 0) {
      gameTimer = 0;
      showingResults = true;
    }
  }

  // 背景（空のグラデーション）
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#87CEEB');
  grad.addColorStop(1, '#E0F7FA');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // 雲（装飾）
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  const cloudX = ((time / 50) % (w + 200)) - 100;
  drawCloud(cloudX, h * 0.15, 60);
  drawCloud(((cloudX + w * 0.6) % (w + 200)) - 100, h * 0.25, 45);

  if (!showingResults) {
    // 風船更新
    for (let i = balloons.length - 1; i >= 0; i--) {
      const b = balloons[i];
      if (b.popped) {
        balloons.splice(i, 1);
        continue;
      }

      b.y -= b.speed * 60 * dt;
      b.wobblePhase += b.wobbleSpeed * dt;
      b.x += Math.sin(b.wobblePhase) * b.wobbleAmp * dt;

      if (b.y < -b.radius * 2) {
        balloons.splice(i, 1);
      }

      drawBalloon(b);
    }

    // 風船補充
    while (balloons.length < MAX_BALLOONS) {
      balloons.push(createBalloon());
    }
  }

  particles.update(dt);
  particles.draw(ctx);

  drawTimer();

  if (showingResults) {
    drawResults();
  }

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
