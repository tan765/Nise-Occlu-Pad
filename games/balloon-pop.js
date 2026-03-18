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
  const radius = rand(40, 60);
  return {
    x: rand(radius, w - radius),
    y: h + radius + rand(0, 100),
    radius: radius,
    color: color,
    speed: rand(0.4, 0.9),
    wobblePhase: Math.random() * Math.PI * 2,
    wobbleSpeed: rand(1, 2.5),
    wobbleAmp: rand(15, 30),
    popped: false,
    popTimer: 0,
    popScale: 1,
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
  ctx.scale(b.popScale, b.popScale);

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

  for (let i = balloons.length - 1; i >= 0; i--) {
    const b = balloons[i];
    if (b.popped) continue;
    // 判定を大きめに（3歳児向け）
    if (dist(pos.x, pos.y, b.x, b.y) < b.radius * 1.3) {
      popBalloon(b);
      break;
    }
  }
});

function animate(time) {
  const dt = Math.min((time - lastTime) / 1000, 0.05);
  lastTime = time;

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

    // 画面上端を超えたら静かにリサイクル
    if (b.y < -b.radius * 2) {
      balloons.splice(i, 1);
    }

    drawBalloon(b);
  }

  // 風船補充
  while (balloons.length < MAX_BALLOONS) {
    balloons.push(createBalloon());
  }

  particles.update(dt);
  particles.draw(ctx);

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
