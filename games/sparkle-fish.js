/* === きらきらさかな === */
/* ゆっくり泳ぐ魚をタッチするとキラキラ回転 */
/* 訓練: 追従 + 固視 */

const canvas = document.getElementById('canvas');
let ctx = setupCanvas(canvas);
const particles = new ParticleSystem(400);
let w, h;
let lastTime = 0;
const fishes = [];
const MAX_FISH = 5;
const bubbles = []; // 装飾用の泡

const FISH_COLORS = [
  { body: 0, name: '赤' },
  { body: 30, name: 'オレンジ' },
  { body: 50, name: '黄' },
  { body: 150, name: '緑' },
  { body: 280, name: '紫' },
  { body: 330, name: 'ピンク' },
];

function resize() {
  ctx = setupCanvas(canvas);
  w = canvas._cssWidth;
  h = canvas._cssHeight;
}
resize();
onResize(canvas, () => resize());

function createFish(startOnScreen) {
  const color = FISH_COLORS[randInt(0, FISH_COLORS.length - 1)];
  const dir = Math.random() < 0.5 ? 1 : -1;
  const fishW = rand(80, 120);
  const fishH = fishW * 0.55;

  return {
    x: startOnScreen ? rand(fishW, w - fishW) : (dir === 1 ? -fishW : w + fishW),
    y: rand(fishH + 60, h - fishH - 20),
    w: fishW,
    h: fishH,
    hue: color.body,
    dir: dir,
    speed: rand(30, 60),
    wobble: Math.random() * Math.PI * 2,
    wobbleSpeed: rand(1, 2),
    wobbleAmp: rand(5, 15),
    // キラキラ回転
    sparkleTimer: 0,
    rotation: 0,
    // 口パク
    mouthOpen: 0,
    mouthPhase: Math.random() * Math.PI * 2,
  };
}

// 初期配置
for (let i = 0; i < MAX_FISH; i++) {
  fishes.push(createFish(true));
}

// 装飾泡の初期化
for (let i = 0; i < 15; i++) {
  bubbles.push({
    x: rand(0, w),
    y: rand(0, h),
    r: rand(3, 10),
    speed: rand(15, 40),
    wobble: Math.random() * Math.PI * 2,
  });
}

function drawFish(f) {
  ctx.save();
  ctx.translate(f.x, f.y);
  ctx.rotate(f.rotation);
  ctx.scale(f.dir, 1); // 向きを反転

  const hw = f.w / 2;
  const hh = f.h / 2;

  // 尾びれ
  ctx.fillStyle = hsl(f.hue, 80, 55);
  ctx.beginPath();
  ctx.moveTo(-hw * 0.6, 0);
  ctx.lineTo(-hw * 1.2, -hh * 0.7);
  ctx.lineTo(-hw * 1.2, hh * 0.7);
  ctx.closePath();
  ctx.fill();

  // 本体
  const grad = ctx.createRadialGradient(hw * 0.1, -hh * 0.2, hw * 0.1, 0, 0, hw);
  grad.addColorStop(0, hsl(f.hue, 85, 75));
  grad.addColorStop(1, hsl(f.hue, 80, 55));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(0, 0, hw, hh, 0, 0, Math.PI * 2);
  ctx.fill();

  // 背びれ
  ctx.fillStyle = hsl(f.hue, 75, 60);
  ctx.beginPath();
  ctx.moveTo(hw * 0.1, -hh);
  ctx.lineTo(-hw * 0.3, -hh * 1.3);
  ctx.lineTo(-hw * 0.5, -hh * 0.8);
  ctx.closePath();
  ctx.fill();

  // 目（白）
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(hw * 0.4, -hh * 0.15, hh * 0.3, 0, Math.PI * 2);
  ctx.fill();

  // 目（黒）
  ctx.fillStyle = '#222';
  ctx.beginPath();
  ctx.arc(hw * 0.45, -hh * 0.1, hh * 0.15, 0, Math.PI * 2);
  ctx.fill();

  // 目のハイライト
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(hw * 0.48, -hh * 0.2, hh * 0.06, 0, Math.PI * 2);
  ctx.fill();

  // 口
  const mouthOpen = Math.abs(Math.sin(f.mouthPhase)) * 3;
  ctx.fillStyle = hsl(f.hue, 70, 40);
  ctx.beginPath();
  ctx.ellipse(hw * 0.75, hh * 0.1, 4, mouthOpen + 1, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
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

  for (const f of fishes) {
    // 判定を大きめに（+20%）
    const hitW = f.w * 0.6;
    const hitH = f.h * 0.6;
    if (Math.abs(pos.x - f.x) < hitW && Math.abs(pos.y - f.y) < hitH) {
      // キラキラ回転開始
      f.sparkleTimer = 1.0;
      particles.emit(f.x, f.y, 15, {
        speedMin: 40, speedMax: 120,
        sizeMin: 3, sizeMax: 8,
        lifeMin: 0.5, lifeMax: 1.2,
        gravity: 20,
        hue: f.hue,
        shape: 'star'
      });
      soundManager.play('happy', 0.6);
      break;
    }
  }
});

function animate(time) {
  const dt = Math.min((time - lastTime) / 1000, 0.05);
  lastTime = time;

  // 海の背景
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#1a6ba8');
  grad.addColorStop(0.5, '#0d4f8a');
  grad.addColorStop(1, '#0a3060');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // 海底の波模様
  ctx.fillStyle = 'rgba(255,255,255,0.03)';
  for (let i = 0; i < 5; i++) {
    const waveY = h - 30 + Math.sin(time / 1000 + i) * 10;
    ctx.beginPath();
    ctx.moveTo(0, waveY);
    for (let x = 0; x < w; x += 20) {
      ctx.lineTo(x, waveY + Math.sin(x / 50 + time / 500 + i) * 8);
    }
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.fill();
  }

  // 装飾泡
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  for (const b of bubbles) {
    b.y -= b.speed * dt;
    b.wobble += dt;
    b.x += Math.sin(b.wobble) * 10 * dt;
    if (b.y < -b.r) {
      b.y = h + b.r;
      b.x = rand(0, w);
    }
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // 魚の更新・描画
  for (let i = fishes.length - 1; i >= 0; i--) {
    const f = fishes[i];

    // 移動
    f.x += f.dir * f.speed * dt;
    f.wobble += f.wobbleSpeed * dt;
    f.y += Math.sin(f.wobble) * f.wobbleAmp * dt;
    f.mouthPhase += 3 * dt;

    // キラキラ回転
    if (f.sparkleTimer > 0) {
      f.sparkleTimer -= dt;
      f.rotation += 8 * dt;
      // 回転中もキラキラ
      if (Math.random() < 0.3) {
        particles.emit(f.x + rand(-20, 20), f.y + rand(-15, 15), 1, {
          speedMin: 10, speedMax: 30,
          sizeMin: 2, sizeMax: 5,
          lifeMin: 0.3, lifeMax: 0.7,
          gravity: -10,
          hue: f.hue,
          shape: 'star'
        });
      }
    } else {
      f.rotation *= 0.9; // 回転をゆっくり戻す
    }

    // 画面外に出たらリサイクル
    if ((f.dir === 1 && f.x > w + f.w) || (f.dir === -1 && f.x < -f.w)) {
      fishes.splice(i, 1);
      continue;
    }

    drawFish(f);
  }

  // 魚の補充
  while (fishes.length < MAX_FISH) {
    fishes.push(createFish(false));
  }

  particles.update(dt);
  particles.draw(ctx);

  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);

function toggleSound() {
  const enabled = soundManager.toggle();
  document.getElementById('soundBtn').textContent = enabled ? '🔊' : '🔇';
}
