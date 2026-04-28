/* === きらきらさかな === */
/* ゆっくり泳ぐ魚をタッチするとキラキラ回転 */
/* 訓練: 追従 + 固視 */

const canvas = document.getElementById('canvas');
let ctx = setupCanvas(canvas);
const particles = new ParticleSystem(400);
let w, h;
let lastTime = 0;
const fishes = [];
const NORMAL_FISH_COUNT = 4;
const bubbles = []; // 装飾用の泡

// 金魚（レア）の管理
let goldCooldown = 8; // 初回出現まで少し待つ（秒）
const GOLD_MIN_INTERVAL = 15; // 次の金魚までの最小間隔（秒）
const GOLD_MAX_EXTRA = 10;    // それに加えてランダムで延びる秒数

const FISH_COLORS = [
  { body: 0, name: '赤' },
  { body: 30, name: 'オレンジ' },
  { body: 50, name: '黄' },
  { body: 150, name: '緑' },
  { body: 280, name: '紫' },
  { body: 330, name: 'ピンク' },
];

// 動きパターン（通常魚）
const PATTERNS = ['straight', 'zigzag', 'dash', 'pause'];

function resize() {
  ctx = setupCanvas(canvas);
  w = canvas._cssWidth;
  h = canvas._cssHeight;
}
resize();
onResize(canvas, () => resize());

function pickPattern() {
  // 偏らないようにランダム選択（straight多め）
  const r = Math.random();
  if (r < 0.4) return 'straight';
  if (r < 0.65) return 'zigzag';
  if (r < 0.85) return 'dash';
  return 'pause';
}

function createFish(startOnScreen, isGold) {
  const dir = Math.random() < 0.5 ? 1 : -1;
  const fishW = isGold ? rand(95, 130) : rand(80, 120);
  const fishH = fishW * 0.55;
  const pattern = isGold ? 'gold' : pickPattern();

  const color = isGold
    ? { body: 48, name: '金' } // 金色
    : FISH_COLORS[randInt(0, FISH_COLORS.length - 1)];

  // パターンごとの基準速度
  let baseSpeed;
  switch (pattern) {
    case 'gold':   baseSpeed = rand(90, 130); break;
    case 'dash':   baseSpeed = rand(35, 55);  break;
    case 'zigzag': baseSpeed = rand(35, 55);  break;
    case 'pause':  baseSpeed = rand(30, 50);  break;
    default:       baseSpeed = rand(30, 60);  break;
  }

  return {
    x: startOnScreen ? rand(fishW, w - fishW) : (dir === 1 ? -fishW : w + fishW),
    y: rand(fishH + 60, h - fishH - 20),
    w: fishW,
    h: fishH,
    hue: color.body,
    isGold: !!isGold,
    pattern: pattern,
    dir: dir,
    speed: baseSpeed,
    baseSpeed: baseSpeed,
    wobble: Math.random() * Math.PI * 2,
    wobbleSpeed: rand(1, 2),
    wobbleAmp: rand(5, 15),
    // パターン用
    patternTimer: rand(2, 5),
    patternPhase: 'normal',  // 'normal' | 'dash' | 'pause'
    zigzagPhase: Math.random() * Math.PI * 2,
    zigzagAmp: rand(70, 110),
    // キラキラ回転
    sparkleTimer: 0,
    rotation: 0,
    // 口パク
    mouthPhase: Math.random() * Math.PI * 2,
  };
}

// 初期配置
for (let i = 0; i < NORMAL_FISH_COUNT; i++) {
  fishes.push(createFish(true, false));
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

  // 金魚の発光
  if (f.isGold) {
    ctx.save();
    ctx.shadowColor = hsl(50, 100, 70);
    ctx.shadowBlur = 25;
    ctx.fillStyle = hsla(50, 100, 80, 0.001);
    ctx.beginPath();
    ctx.ellipse(0, 0, hw * 1.1, hh * 1.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

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
  if (f.isGold) {
    grad.addColorStop(0, '#fff8dc');
    grad.addColorStop(0.6, hsl(50, 100, 70));
    grad.addColorStop(1, hsl(40, 100, 50));
  } else {
    grad.addColorStop(0, hsl(f.hue, 85, 75));
    grad.addColorStop(1, hsl(f.hue, 80, 55));
  }
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

  // 一時停止中の固視マーカー（小さなキラキラ）
  if (f.patternPhase === 'pause' && Math.random() < 0.05) {
    particles.emit(f.x + rand(-f.w * 0.4, f.w * 0.4), f.y + rand(-f.h * 0.4, f.h * 0.4), 1, {
      speedMin: 5, speedMax: 15,
      sizeMin: 1, sizeMax: 3,
      lifeMin: 0.4, lifeMax: 0.8,
      gravity: -5,
      hue: f.hue,
      shape: 'star'
    });
  }
}

// タッチ
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

  for (const f of fishes) {
    // 判定を大きめに
    const hitW = f.w * 0.6;
    const hitH = f.h * 0.6;
    if (Math.abs(pos.x - f.x) < hitW && Math.abs(pos.y - f.y) < hitH) {
      // キラキラ回転開始
      f.sparkleTimer = 1.0;
      const burst = f.isGold ? 28 : 15;
      particles.emit(f.x, f.y, burst, {
        speedMin: 40, speedMax: f.isGold ? 160 : 120,
        sizeMin: 3, sizeMax: f.isGold ? 10 : 8,
        lifeMin: 0.5, lifeMax: 1.4,
        gravity: 20,
        hue: f.hue,
        shape: 'star'
      });
      soundManager.play('happy', f.isGold ? 0.9 : 0.6);
      break;
    }
  }
});

function updatePattern(f, dt) {
  switch (f.pattern) {
    case 'straight':
      // 既存挙動: 直進＋小波状
      f.x += f.dir * f.speed * dt;
      f.wobble += f.wobbleSpeed * dt;
      f.y += Math.sin(f.wobble) * f.wobbleAmp * dt;
      break;

    case 'zigzag':
      // 大きく上下するジグザグ
      f.x += f.dir * f.speed * dt;
      f.zigzagPhase += 1.8 * dt;
      f.y += Math.sin(f.zigzagPhase) * f.zigzagAmp * dt;
      // 画面端で戻す
      if (f.y < f.h) f.y = f.h;
      if (f.y > h - f.h) f.y = h - f.h;
      break;

    case 'dash': {
      // 数秒ごとに短時間ダッシュ
      f.patternTimer -= dt;
      if (f.patternPhase === 'normal') {
        f.speed = f.baseSpeed;
        if (f.patternTimer <= 0) {
          f.patternPhase = 'dash';
          f.patternTimer = rand(0.7, 1.2);
        }
      } else { // 'dash'
        f.speed = f.baseSpeed * 3.2;
        if (f.patternTimer <= 0) {
          f.patternPhase = 'normal';
          f.patternTimer = rand(2.5, 5);
        }
      }
      f.x += f.dir * f.speed * dt;
      f.wobble += f.wobbleSpeed * dt;
      f.y += Math.sin(f.wobble) * f.wobbleAmp * dt;
      break;
    }

    case 'pause': {
      // 数秒ごとにその場で漂って固視
      f.patternTimer -= dt;
      if (f.patternPhase === 'normal') {
        if (f.patternTimer <= 0) {
          f.patternPhase = 'pause';
          f.patternTimer = rand(2, 3.5);
        }
        f.x += f.dir * f.speed * dt;
        f.wobble += f.wobbleSpeed * dt;
        f.y += Math.sin(f.wobble) * f.wobbleAmp * dt;
      } else { // 'pause'
        if (f.patternTimer <= 0) {
          f.patternPhase = 'normal';
          f.patternTimer = rand(3, 6);
        }
        // ほぼ停止、ゆっくり呼吸するように上下
        f.wobble += 0.8 * dt;
        f.y += Math.sin(f.wobble) * 6 * dt;
      }
      break;
    }

    case 'gold':
      // 高速で画面を横切る
      f.x += f.dir * f.speed * dt;
      f.wobble += f.wobbleSpeed * 0.6 * dt;
      f.y += Math.sin(f.wobble) * 4 * dt;
      break;
  }
}

function isOffscreen(f) {
  return (f.dir === 1 && f.x > w + f.w) || (f.dir === -1 && f.x < -f.w);
}

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

    updatePattern(f, dt);
    f.mouthPhase += 3 * dt;

    // キラキラ回転
    if (f.sparkleTimer > 0) {
      f.sparkleTimer -= dt;
      f.rotation += 8 * dt;
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
      f.rotation *= 0.9;
    }

    // 画面外に出たらリサイクル
    if (isOffscreen(f)) {
      fishes.splice(i, 1);
      continue;
    }

    drawFish(f);
  }

  // 通常魚の補充
  let normalCount = 0;
  for (const f of fishes) if (!f.isGold) normalCount++;
  while (normalCount < NORMAL_FISH_COUNT) {
    fishes.push(createFish(false, false));
    normalCount++;
  }

  // 金魚の出現管理
  goldCooldown -= dt;
  const hasGold = fishes.some(f => f.isGold);
  if (!hasGold && goldCooldown <= 0) {
    fishes.push(createFish(false, true));
    goldCooldown = GOLD_MIN_INTERVAL + Math.random() * GOLD_MAX_EXTRA;
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
