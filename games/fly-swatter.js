/* === ハエたたき === */
/* 画面を飛び回るハエをタップでたたく */
/* 訓練: 追従 + 固視 + 手と眼の協応 */

const canvas = document.getElementById('canvas');
let ctx = setupCanvas(canvas);
const particles = new ParticleSystem(500);
let w, h;
let lastTime = 0;
const flies = [];
const splats = [];
let score = 0;

// たたきアニメーション
const swatter = {
  x: 0, y: 0,
  active: false,
  timer: 0,
  duration: 0.3,
  hit: false,
};

// 難易度
const difficulty = {
  level: 1,
  timer: 0,
  interval: 15,
  maxFlies: 3,
  speedMultiplier: 1.0,
};

function resize() {
  ctx = setupCanvas(canvas);
  w = canvas._cssWidth;
  h = canvas._cssHeight;
}
resize();
onResize(canvas, () => resize());

// --- ハエの生成 ---
function createFly() {
  return {
    x: rand(60, w - 60),
    y: rand(60, h - 60),
    targetX: rand(60, w - 60),
    targetY: rand(60, h - 60),
    speed: rand(80, 150) * difficulty.speedMultiplier,
    size: rand(24, 34),
    wingPhase: Math.random() * Math.PI * 2,
    wingSpeed: rand(15, 25),
    alive: true,
    splatTimer: 0,
    wobblePhase: Math.random() * Math.PI * 2,
    wobbleAmp: rand(20, 40),
    restTimer: 0,
    resting: false,
    // 向き（移動方向に体を向ける）
    angle: 0,
  };
}

// 初期ハエ
for (let i = 0; i < difficulty.maxFlies; i++) {
  flies.push(createFly());
}

// --- ハエの描画 ---
function drawFly(f) {
  ctx.save();
  ctx.translate(f.x, f.y);

  const s = f.size;

  // 羽（半透明の楕円2枚、wingPhaseでパタパタ）
  const wingAngle = Math.sin(f.wingPhase) * 0.4;
  ctx.fillStyle = 'rgba(200, 220, 255, 0.45)';
  ctx.strokeStyle = 'rgba(150, 180, 220, 0.3)';
  ctx.lineWidth = 1;

  // 左羽
  ctx.save();
  ctx.rotate(-0.5 + wingAngle);
  ctx.beginPath();
  ctx.ellipse(-s * 0.35, -s * 0.25, s * 0.5, s * 0.25, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // 右羽
  ctx.save();
  ctx.rotate(0.5 - wingAngle);
  ctx.beginPath();
  ctx.ellipse(s * 0.35, -s * 0.25, s * 0.5, s * 0.25, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // 体（楕円、暗い色）
  const bodyGrad = ctx.createRadialGradient(-s * 0.05, -s * 0.05, s * 0.05, 0, 0, s * 0.4);
  bodyGrad.addColorStop(0, '#555');
  bodyGrad.addColorStop(1, '#222');
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.ellipse(0, 0, s * 0.3, s * 0.45, 0, 0, Math.PI * 2);
  ctx.fill();

  // しましま模様
  ctx.strokeStyle = 'rgba(100, 100, 60, 0.4)';
  ctx.lineWidth = 1.5;
  for (let i = -2; i <= 2; i++) {
    const ly = i * s * 0.08;
    const hw = Math.sqrt(Math.max(0, (s * 0.3) ** 2 * (1 - (ly / (s * 0.45)) ** 2)));
    if (hw > 2) {
      ctx.beginPath();
      ctx.moveTo(-hw, ly);
      ctx.lineTo(hw, ly);
      ctx.stroke();
    }
  }

  // 目（大きな赤い複眼、かわいく）
  ctx.fillStyle = '#c44';
  ctx.beginPath();
  ctx.arc(-s * 0.15, -s * 0.35, s * 0.16, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(s * 0.15, -s * 0.35, s * 0.16, 0, Math.PI * 2);
  ctx.fill();

  // 目のハイライト
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath();
  ctx.arc(-s * 0.1, -s * 0.4, s * 0.06, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(s * 0.1, -s * 0.4, s * 0.06, 0, Math.PI * 2);
  ctx.fill();

  // 足（6本、簡略化）
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';
  for (let side = -1; side <= 1; side += 2) {
    for (let j = 0; j < 3; j++) {
      const ly = -s * 0.15 + j * s * 0.18;
      const lx = side * s * 0.28;
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.lineTo(lx + side * s * 0.2, ly + s * 0.12);
      ctx.stroke();
    }
  }

  ctx.restore();
}

// --- つぶれたハエ (スプラット) ---
function drawSplat(sp) {
  ctx.save();
  ctx.globalAlpha = Math.min(1, sp.timer * 2);
  ctx.translate(sp.x, sp.y);

  // つぶれた跡
  ctx.fillStyle = 'rgba(80, 80, 40, 0.5)';
  ctx.beginPath();
  ctx.ellipse(0, 0, 18, 12, rand(-0.3, 0.3), 0, Math.PI * 2);
  ctx.fill();

  // 小さな点々
  ctx.fillStyle = 'rgba(60, 60, 30, 0.4)';
  for (let i = 0; i < 5; i++) {
    const dx = (i * 7.3 + sp.x) % 20 - 10;
    const dy = (i * 5.7 + sp.y) % 14 - 7;
    ctx.beginPath();
    ctx.arc(dx, dy, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// --- たたきの描画 ---
function drawSwatter() {
  if (!swatter.active) return;
  const t = swatter.timer / swatter.duration;
  const scale = 1 + (1 - t) * 0.5;

  ctx.save();
  ctx.translate(swatter.x, swatter.y);
  ctx.scale(scale, scale);
  ctx.globalAlpha = Math.min(1, t * 3);

  // たたき面（円 + 格子）
  const r = 32;
  ctx.fillStyle = swatter.hit ? 'rgba(255, 80, 80, 0.7)' : 'rgba(160, 160, 160, 0.6)';
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  // 格子模様
  ctx.strokeStyle = 'rgba(0,0,0,0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = -r; i <= r; i += 10) {
    const halfW = Math.sqrt(Math.max(0, r * r - i * i));
    ctx.moveTo(-halfW, i);
    ctx.lineTo(halfW, i);
    ctx.moveTo(i, -halfW);
    ctx.lineTo(i, halfW);
  }
  ctx.stroke();

  // 外枠
  ctx.strokeStyle = swatter.hit ? '#c33' : '#888';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();

  // 持ち手
  ctx.strokeStyle = '#8B4513';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(r * 0.5, r * 0.5);
  ctx.lineTo(r * 1.8, r * 1.8);
  ctx.stroke();

  ctx.restore();
}

// --- スコア表示 ---
function drawScore() {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.beginPath();
  ctx.roundRect(w / 2 - 60, 12, 120, 36, 18);
  ctx.fill();

  ctx.fillStyle = '#654';
  ctx.font = 'bold 22px "Hiragino Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${score} ぴき`, w / 2, 30);
  ctx.restore();
}

// --- タッチハンドラ ---
canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  soundManager.init();
  soundManager.createSounds();
  if (!soundManager._bgmStarted) {
    soundManager.playBgm();
    soundManager._bgmStarted = true;
  }

  const pos = getPointerPos(canvas, e);

  // たたきアニメーション開始
  swatter.x = pos.x;
  swatter.y = pos.y;
  swatter.active = true;
  swatter.timer = swatter.duration;
  swatter.hit = false;

  // ヒット判定（判定を大きめに: 子供向け）
  for (let i = flies.length - 1; i >= 0; i--) {
    const f = flies[i];
    if (!f.alive) continue;
    if (dist(pos.x, pos.y, f.x, f.y) < f.size * 1.5 + 20) {
      f.alive = false;
      swatter.hit = true;
      score++;
      soundManager.play('swat', 0.7);

      // パーティクル
      particles.emit(f.x, f.y, 15, {
        speedMin: 40, speedMax: 150,
        sizeMin: 3, sizeMax: 8,
        lifeMin: 0.3, lifeMax: 0.8,
        gravity: 60,
        hue: 60,
        shape: 'circle',
      });
      particles.emit(f.x, f.y, 5, {
        speedMin: 20, speedMax: 80,
        sizeMin: 4, sizeMax: 10,
        lifeMin: 0.4, lifeMax: 1.0,
        gravity: 30,
        hue: 30,
        shape: 'star',
      });

      // スプラット追加
      splats.push({ x: f.x, y: f.y, timer: 2.5 });
      break;
    }
  }

  if (!swatter.hit) {
    soundManager.play('bounce', 0.3);
  }
});

// --- アニメーションループ ---
function animate(time) {
  const dt = Math.min((time - lastTime) / 1000, 0.05);
  lastTime = time;

  // 背景（明るいクリーム系グラデーション）
  const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
  bgGrad.addColorStop(0, '#FFF8E7');
  bgGrad.addColorStop(1, '#FFE4B5');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  // 窓の装飾（シンプルなシルエット）
  drawWindow();

  // 難易度タイマー更新
  difficulty.timer += dt;
  if (difficulty.timer >= difficulty.interval) {
    difficulty.timer = 0;
    if (difficulty.maxFlies < 8) {
      difficulty.level++;
      difficulty.maxFlies++;
      difficulty.speedMultiplier += 0.15;
    }
  }

  // スプラット描画（ハエより先に描画して下に）
  for (let i = splats.length - 1; i >= 0; i--) {
    splats[i].timer -= dt;
    if (splats[i].timer <= 0) {
      splats.splice(i, 1);
      continue;
    }
    drawSplat(splats[i]);
  }

  // ハエ更新
  for (let i = flies.length - 1; i >= 0; i--) {
    const f = flies[i];

    if (!f.alive) {
      flies.splice(i, 1);
      continue;
    }

    // 羽ばたき
    f.wingPhase += f.wingSpeed * dt;

    if (f.resting) {
      // 休憩中
      f.restTimer -= dt;
      if (f.restTimer <= 0) {
        f.resting = false;
        f.targetX = rand(60, w - 60);
        f.targetY = rand(60, h - 60);
      }
    } else {
      // ウェイポイントに向かって移動
      const dx = f.targetX - f.x;
      const dy = f.targetY - f.y;
      const d = Math.sqrt(dx * dx + dy * dy);

      if (d < 20) {
        // 到着 → 次の行き先 or 休憩
        if (Math.random() < 0.2) {
          f.resting = true;
          f.restTimer = rand(0.5, 1.5);
        } else {
          f.targetX = rand(60, w - 60);
          f.targetY = rand(60, h - 60);
        }
      } else {
        const moveSpeed = f.speed * dt;
        f.x += (dx / d) * moveSpeed;
        f.y += (dy / d) * moveSpeed;

        // ジグザグ感
        f.wobblePhase += 3 * dt;
        const perpX = -dy / d;
        const perpY = dx / d;
        f.x += perpX * Math.sin(f.wobblePhase) * f.wobbleAmp * dt;
        f.y += perpY * Math.sin(f.wobblePhase) * f.wobbleAmp * dt;
      }

      // 画面内にクランプ
      f.x = Math.max(f.size, Math.min(w - f.size, f.x));
      f.y = Math.max(f.size, Math.min(h - f.size, f.y));
    }

    drawFly(f);
  }

  // ハエ補充
  while (flies.length < difficulty.maxFlies) {
    const nf = createFly();
    // 画面端から出現
    const side = randInt(0, 3);
    if (side === 0) { nf.x = -20; nf.y = rand(60, h - 60); }
    else if (side === 1) { nf.x = w + 20; nf.y = rand(60, h - 60); }
    else if (side === 2) { nf.y = -20; nf.x = rand(60, w - 60); }
    else { nf.y = h + 20; nf.x = rand(60, w - 60); }
    flies.push(nf);
  }

  // たたきアニメーション
  if (swatter.active) {
    swatter.timer -= dt;
    if (swatter.timer <= 0) {
      swatter.active = false;
    }
  }
  drawSwatter();

  // スコア
  drawScore();

  // パーティクル
  particles.update(dt);
  particles.draw(ctx);

  requestAnimationFrame(animate);
}

// 窓の装飾
function drawWindow() {
  const winW = Math.min(180, w * 0.25);
  const winH = winW * 1.3;
  const winX = w * 0.82 - winW / 2;
  const winY = h * 0.15;

  // 窓枠
  ctx.fillStyle = 'rgba(135, 206, 235, 0.4)';
  ctx.beginPath();
  ctx.roundRect(winX, winY, winW, winH, 8);
  ctx.fill();

  // 十字の桟
  ctx.strokeStyle = 'rgba(180, 160, 130, 0.5)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(winX + winW / 2, winY);
  ctx.lineTo(winX + winW / 2, winY + winH);
  ctx.moveTo(winX, winY + winH / 2);
  ctx.lineTo(winX + winW, winY + winH / 2);
  ctx.stroke();

  // 窓枠の縁
  ctx.strokeStyle = 'rgba(150, 130, 100, 0.4)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(winX, winY, winW, winH, 8);
  ctx.stroke();
}

requestAnimationFrame(animate);

function toggleSound() {
  const enabled = soundManager.toggle();
  document.getElementById('soundBtn').textContent = enabled ? '🔊' : '🔇';
}
