/* === タッチでキラキラ === */
/* 画面をタッチすると花火のようなキラキラが飛び散る */
/* 訓練: 固視（特定の点を見つめる） */

const canvas = document.getElementById('canvas');
let ctx = setupCanvas(canvas);
const particles = new ParticleSystem(600);
let w, h;
let lastTime = 0;
let idleTimer = 0;
const shapes = ['circle', 'star', 'heart'];

function resize() {
  ctx = setupCanvas(canvas);
  w = canvas._cssWidth;
  h = canvas._cssHeight;
}

resize();
onResize(canvas, () => resize());

// 背景の星（固定装飾）
const bgStars = [];
function initBgStars() {
  bgStars.length = 0;
  for (let i = 0; i < 50; i++) {
    bgStars.push({
      x: Math.random() * w,
      y: Math.random() * h,
      size: rand(1, 3),
      twinkle: Math.random() * Math.PI * 2,
      speed: rand(1, 3)
    });
  }
}
initBgStars();

// タッチでキラキラ放出
function sparkleAt(x, y) {
  const shape = shapes[randInt(0, shapes.length - 1)];
  const baseHue = Math.random() * 360;

  // メインの花火
  particles.emit(x, y, 25, {
    speedMin: 80,
    speedMax: 280,
    sizeMin: 4,
    sizeMax: 12,
    lifeMin: 0.6,
    lifeMax: 1.5,
    gravity: 60,
    friction: 0.97,
    hue: baseHue,
    shape: shape
  });

  // 追加のキラキラ（色違い）
  particles.emit(x, y, 10, {
    speedMin: 30,
    speedMax: 100,
    sizeMin: 2,
    sizeMax: 6,
    lifeMin: 0.8,
    lifeMax: 2.0,
    gravity: 20,
    friction: 0.99,
    hue: (baseHue + 120) % 360,
    shape: 'star'
  });

  soundManager.play('sparkle', 0.6);
  idleTimer = 0;
}

// イベント
canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  if (!e.isPrimary) return;
  soundManager.init();
  soundManager.createSounds();
  if (!soundManager._bgmStarted) {
    soundManager.playBgm();
    soundManager._bgmStarted = true;
  }
  const pos = getPointerPos(canvas, e);
  sparkleAt(pos.x, pos.y);
});

canvas.addEventListener('pointermove', (e) => {
  if (e.pressure > 0) {
    const pos = getPointerPos(canvas, e);
    // 動いている間もパーティクルを少し出す
    if (Math.random() < 0.3) {
      particles.emit(pos.x, pos.y, 3, {
        speedMin: 20,
        speedMax: 60,
        sizeMin: 2,
        sizeMax: 5,
        lifeMin: 0.3,
        lifeMax: 0.8,
        gravity: 30,
        hue: null,
        shape: 'circle'
      });
    }
    idleTimer = 0;
  }
});

// アニメーションループ
function animate(time) {
  const dt = Math.min((time - lastTime) / 1000, 0.05);
  lastTime = time;

  // 背景
  ctx.fillStyle = '#0f0f23';
  ctx.fillRect(0, 0, w, h);

  // 背景の星
  for (const star of bgStars) {
    star.twinkle += star.speed * dt;
    const alpha = 0.3 + 0.3 * Math.sin(star.twinkle);
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    ctx.fill();
  }

  // アイドル誘導（3秒間操作なしで画面中央にヒント表示）
  idleTimer += dt;
  if (idleTimer > 3) {
    const pulse = 0.5 + 0.5 * Math.sin(time / 300);
    ctx.save();
    ctx.globalAlpha = pulse * 0.6;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('タッチしてね ✨', w / 2, h / 2);
    ctx.restore();

    // 中央で小さなキラキラ
    if (Math.random() < 0.02) {
      particles.emit(w / 2 + rand(-50, 50), h / 2 + rand(-30, 30), 3, {
        speedMin: 10, speedMax: 40,
        sizeMin: 2, sizeMax: 4,
        lifeMin: 0.5, lifeMax: 1.0,
        gravity: 10, hue: null, shape: 'star'
      });
    }
  }

  // パーティクル更新・描画
  particles.update(dt);
  particles.draw(ctx);

  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);

// 音声トグル
function toggleSound() {
  const enabled = soundManager.toggle();
  document.getElementById('soundBtn').textContent = enabled ? '🔊' : '🔇';
}
