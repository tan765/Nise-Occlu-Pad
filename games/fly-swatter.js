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

// タイマー
const GAME_TIME = 90;
let gameTimer = GAME_TIME;
let gameStarted = false;
let showingResults = false;
const replayBtn = { x: 0, y: 0, w: 200, h: 56 };

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
    wobblePhase: Math.random() * Math.PI * 2,
    wobbleAmp: rand(20, 40),
    restTimer: 0,
    resting: false,
  };
}

for (let i = 0; i < difficulty.maxFlies; i++) {
  flies.push(createFly());
}

function drawFly(f) {
  ctx.save();
  ctx.translate(f.x, f.y);
  const s = f.size;

  const wingAngle = Math.sin(f.wingPhase) * 0.4;
  ctx.fillStyle = 'rgba(200, 220, 255, 0.45)';
  ctx.strokeStyle = 'rgba(150, 180, 220, 0.3)';
  ctx.lineWidth = 1;

  ctx.save();
  ctx.rotate(-0.5 + wingAngle);
  ctx.beginPath();
  ctx.ellipse(-s * 0.35, -s * 0.25, s * 0.5, s * 0.25, 0, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.rotate(0.5 - wingAngle);
  ctx.beginPath();
  ctx.ellipse(s * 0.35, -s * 0.25, s * 0.5, s * 0.25, 0, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();
  ctx.restore();

  const bodyGrad = ctx.createRadialGradient(-s * 0.05, -s * 0.05, s * 0.05, 0, 0, s * 0.4);
  bodyGrad.addColorStop(0, '#555');
  bodyGrad.addColorStop(1, '#222');
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.ellipse(0, 0, s * 0.3, s * 0.45, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(100, 100, 60, 0.4)';
  ctx.lineWidth = 1.5;
  for (let i = -2; i <= 2; i++) {
    const ly = i * s * 0.08;
    const hw = Math.sqrt(Math.max(0, (s * 0.3) ** 2 * (1 - (ly / (s * 0.45)) ** 2)));
    if (hw > 2) {
      ctx.beginPath();
      ctx.moveTo(-hw, ly); ctx.lineTo(hw, ly);
      ctx.stroke();
    }
  }

  ctx.fillStyle = '#c44';
  ctx.beginPath();
  ctx.arc(-s * 0.15, -s * 0.35, s * 0.16, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(s * 0.15, -s * 0.35, s * 0.16, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath();
  ctx.arc(-s * 0.1, -s * 0.4, s * 0.06, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(s * 0.1, -s * 0.4, s * 0.06, 0, Math.PI * 2);
  ctx.fill();

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

function drawSplat(sp) {
  ctx.save();
  ctx.globalAlpha = Math.min(1, sp.timer * 2);
  ctx.translate(sp.x, sp.y);
  ctx.fillStyle = 'rgba(80, 80, 40, 0.5)';
  ctx.beginPath();
  ctx.ellipse(0, 0, 18, 12, sp.angle || 0, 0, Math.PI * 2);
  ctx.fill();
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

function drawSwatter() {
  if (!swatter.active) return;
  const t = swatter.timer / swatter.duration;
  const scale = 1 + (1 - t) * 0.5;
  ctx.save();
  ctx.translate(swatter.x, swatter.y);
  ctx.scale(scale, scale);
  ctx.globalAlpha = Math.min(1, t * 3);

  const r = 32;
  ctx.fillStyle = swatter.hit ? 'rgba(255, 80, 80, 0.7)' : 'rgba(160, 160, 160, 0.6)';
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(0,0,0,0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = -r; i <= r; i += 10) {
    const halfW = Math.sqrt(Math.max(0, r * r - i * i));
    ctx.moveTo(-halfW, i); ctx.lineTo(halfW, i);
    ctx.moveTo(i, -halfW); ctx.lineTo(i, halfW);
  }
  ctx.stroke();

  ctx.strokeStyle = swatter.hit ? '#c33' : '#888';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = '#8B4513';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(r * 0.5, r * 0.5);
  ctx.lineTo(r * 1.8, r * 1.8);
  ctx.stroke();
  ctx.restore();
}

function drawGameTimer() {
  if (!gameStarted || showingResults) return;
  const secs = Math.ceil(gameTimer);
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.beginPath();
  ctx.roundRect(w / 2 - 40, 12, 80, 32, 16);
  ctx.fill();
  ctx.fillStyle = secs <= 10 ? '#e55' : '#654';
  ctx.font = 'bold 20px "Hiragino Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${secs}`, w / 2, 28);
  ctx.restore();
}

function drawScore() {
  if (showingResults) return;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.beginPath();
  ctx.roundRect(w / 2 + 50, 12, 100, 32, 16);
  ctx.fill();
  ctx.fillStyle = '#654';
  ctx.font = 'bold 18px "Hiragino Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${score} ぴき`, w / 2 + 100, 28);
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
  ctx.fillText(`${score}`, w / 2, h * 0.44);

  ctx.font = 'bold 22px "Hiragino Sans", sans-serif';
  ctx.fillStyle = '#fff';
  ctx.fillText('ぴき やっつけたよ！', w / 2, h * 0.54);

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

function resetGame() {
  gameTimer = GAME_TIME;
  gameStarted = false;
  showingResults = false;
  score = 0;
  difficulty.level = 1;
  difficulty.timer = 0;
  difficulty.maxFlies = 3;
  difficulty.speedMultiplier = 1.0;
  flies.length = 0;
  splats.length = 0;
  for (let i = 0; i < difficulty.maxFlies; i++) {
    flies.push(createFly());
  }
}

canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  soundManager.init();
  soundManager.createSounds();
  if (!soundManager._bgmStarted) {
    soundManager.playBgm();
    soundManager._bgmStarted = true;
  }
  const pos = getPointerPos(canvas, e);

  if (showingResults) {
    if (pos.x >= replayBtn.x && pos.x <= replayBtn.x + replayBtn.w &&
        pos.y >= replayBtn.y && pos.y <= replayBtn.y + replayBtn.h) {
      resetGame();
    }
    return;
  }

  if (!gameStarted) gameStarted = true;

  swatter.x = pos.x;
  swatter.y = pos.y;
  swatter.active = true;
  swatter.timer = swatter.duration;
  swatter.hit = false;

  for (let i = flies.length - 1; i >= 0; i--) {
    const f = flies[i];
    if (!f.alive) continue;
    if (dist(pos.x, pos.y, f.x, f.y) < f.size * 1.5 + 20) {
      f.alive = false;
      swatter.hit = true;
      score++;
      soundManager.play('swat', 0.7);
      particles.emit(f.x, f.y, 15, {
        speedMin: 40, speedMax: 150,
        sizeMin: 3, sizeMax: 8,
        lifeMin: 0.3, lifeMax: 0.8,
        gravity: 60, hue: 60, shape: 'circle',
      });
      particles.emit(f.x, f.y, 5, {
        speedMin: 20, speedMax: 80,
        sizeMin: 4, sizeMax: 10,
        lifeMin: 0.4, lifeMax: 1.0,
        gravity: 30, hue: 30, shape: 'star',
      });
      splats.push({ x: f.x, y: f.y, timer: 2.5, angle: rand(-0.3, 0.3) });
      break;
    }
  }
  if (!swatter.hit) {
    soundManager.play('bounce', 0.3);
  }
});

function animate(time) {
  const dt = Math.min((time - lastTime) / 1000, 0.05);
  lastTime = time;

  // タイマー
  if (gameStarted && !showingResults) {
    gameTimer -= dt;
    if (gameTimer <= 0) {
      gameTimer = 0;
      showingResults = true;
    }
  }

  const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
  bgGrad.addColorStop(0, '#FFF8E7');
  bgGrad.addColorStop(1, '#FFE4B5');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  drawWindow();

  if (!showingResults) {
    // 難易度
    if (gameStarted) {
      difficulty.timer += dt;
      if (difficulty.timer >= difficulty.interval) {
        difficulty.timer = 0;
        if (difficulty.maxFlies < 8) {
          difficulty.level++;
          difficulty.maxFlies++;
          difficulty.speedMultiplier += 0.15;
        }
      }
    }

    // スプラット
    for (let i = splats.length - 1; i >= 0; i--) {
      splats[i].timer -= dt;
      if (splats[i].timer <= 0) { splats.splice(i, 1); continue; }
      drawSplat(splats[i]);
    }

    // ハエ更新
    for (let i = flies.length - 1; i >= 0; i--) {
      const f = flies[i];
      if (!f.alive) { flies.splice(i, 1); continue; }
      f.wingPhase += f.wingSpeed * dt;

      if (f.resting) {
        f.restTimer -= dt;
        if (f.restTimer <= 0) {
          f.resting = false;
          f.targetX = rand(60, w - 60);
          f.targetY = rand(60, h - 60);
        }
      } else {
        const dx = f.targetX - f.x;
        const dy = f.targetY - f.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < 20) {
          if (Math.random() < 0.2) { f.resting = true; f.restTimer = rand(0.5, 1.5); }
          else { f.targetX = rand(60, w - 60); f.targetY = rand(60, h - 60); }
        } else {
          const moveSpeed = f.speed * dt;
          f.x += (dx / d) * moveSpeed;
          f.y += (dy / d) * moveSpeed;
          f.wobblePhase += 3 * dt;
          const perpX = -dy / d;
          const perpY = dx / d;
          f.x += perpX * Math.sin(f.wobblePhase) * f.wobbleAmp * dt;
          f.y += perpY * Math.sin(f.wobblePhase) * f.wobbleAmp * dt;
        }
        f.x = Math.max(f.size, Math.min(w - f.size, f.x));
        f.y = Math.max(f.size, Math.min(h - f.size, f.y));
      }
      drawFly(f);
    }

    while (flies.length < difficulty.maxFlies) {
      const nf = createFly();
      const side = randInt(0, 3);
      if (side === 0) { nf.x = -20; nf.y = rand(60, h - 60); }
      else if (side === 1) { nf.x = w + 20; nf.y = rand(60, h - 60); }
      else if (side === 2) { nf.y = -20; nf.x = rand(60, w - 60); }
      else { nf.y = h + 20; nf.x = rand(60, w - 60); }
      flies.push(nf);
    }
  }

  if (swatter.active) {
    swatter.timer -= dt;
    if (swatter.timer <= 0) swatter.active = false;
  }
  drawSwatter();

  drawScore();
  drawGameTimer();

  particles.update(dt);
  particles.draw(ctx);

  if (showingResults) drawResults();

  requestAnimationFrame(animate);
}

function drawWindow() {
  const winW = Math.min(180, w * 0.25);
  const winH = winW * 1.3;
  const winX = w * 0.82 - winW / 2;
  const winY = h * 0.15;
  ctx.fillStyle = 'rgba(135, 206, 235, 0.4)';
  ctx.beginPath();
  ctx.roundRect(winX, winY, winW, winH, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(180, 160, 130, 0.5)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(winX + winW / 2, winY);
  ctx.lineTo(winX + winW / 2, winY + winH);
  ctx.moveTo(winX, winY + winH / 2);
  ctx.lineTo(winX + winW, winY + winH / 2);
  ctx.stroke();
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
