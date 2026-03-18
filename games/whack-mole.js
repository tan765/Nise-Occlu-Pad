/* === もぐらたたき === */
/* 穴からぴょこっと出るもぐらをタップ */
/* 訓練: 固視 + 反応速度 + 手と眼の協応 */

const canvas = document.getElementById('canvas');
let ctx = setupCanvas(canvas);
const particles = new ParticleSystem(500);
let w, h;
let lastTime = 0;

// タイマー
const GAME_TIME = 90;
let gameTimer = GAME_TIME;
let gameStarted = false;
let gameScore = 0;
let showingResults = false;
const replayBtn = { x: 0, y: 0, w: 200, h: 56 };

// 穴の配置 (3列×2行)
const COLS = 3, ROWS = 2;
const holes = [];

// 難易度
let popUpDuration = 2.0;
let maxActive = 1;
let difficultyTimer = 0;

function resize() {
  ctx = setupCanvas(canvas);
  w = canvas._cssWidth;
  h = canvas._cssHeight;
  layoutHoles();
}

function layoutHoles() {
  holes.length = 0;
  const marginX = w * 0.12, marginTop = h * 0.2, marginBottom = h * 0.15;
  const areaW = w - marginX * 2;
  const areaH = h - marginTop - marginBottom;
  const cellW = areaW / COLS, cellH = areaH / ROWS;

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      holes.push({
        x: marginX + cellW * (c + 0.5),
        y: marginTop + cellH * (r + 0.5) + cellH * 0.15,
        holeW: Math.min(cellW * 0.7, 120),
        holeH: Math.min(cellH * 0.25, 35),
        moleUp: 0, // 0=hidden, 0-1=rising, 1=fully up
        state: 'hidden', // hidden, rising, up, whacked, hiding
        timer: rand(0.5, 2.5),
        whackPhase: 0,
      });
    }
  }
}

resize();
onResize(canvas, () => resize());

function drawHole(hole) {
  const { x, y, holeW, holeH } = hole;

  // 穴の影
  ctx.fillStyle = 'rgba(60, 40, 20, 0.7)';
  ctx.beginPath();
  ctx.ellipse(x, y, holeW / 2, holeH / 2, 0, 0, Math.PI * 2);
  ctx.fill();

  // 穴の縁
  ctx.strokeStyle = 'rgba(100, 70, 30, 0.5)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(x, y, holeW / 2 + 2, holeH / 2 + 2, 0, 0, Math.PI * 2);
  ctx.stroke();
}

function drawMole(hole) {
  if (hole.moleUp <= 0) return;
  const { x, y, holeW, holeH, moleUp } = hole;
  const moleSize = Math.min(holeW * 0.55, 55);
  const riseHeight = moleSize * 1.6;
  const moleY = y - riseHeight * moleUp;

  // クリッピング（穴の上だけ表示）
  ctx.save();
  ctx.beginPath();
  ctx.rect(x - holeW, y - riseHeight - moleSize, holeW * 2, riseHeight + moleSize);
  ctx.clip();

  ctx.save();
  ctx.translate(x, moleY);

  // 叩かれた時のぐるぐる
  if (hole.state === 'whacked') {
    const wobble = Math.sin(hole.whackPhase * 15) * 0.15;
    ctx.rotate(wobble);
  }

  // 体（茶色の丸）
  const bodyGrad = ctx.createRadialGradient(-moleSize * 0.1, -moleSize * 0.1, moleSize * 0.1, 0, 0, moleSize);
  bodyGrad.addColorStop(0, '#B8860B');
  bodyGrad.addColorStop(1, '#8B6914');
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.ellipse(0, 0, moleSize * 0.75, moleSize, 0, 0, Math.PI * 2);
  ctx.fill();

  // お腹（明るい部分）
  ctx.fillStyle = '#D2B48C';
  ctx.beginPath();
  ctx.ellipse(0, moleSize * 0.15, moleSize * 0.45, moleSize * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // 目
  if (hole.state === 'whacked') {
    // × 目
    ctx.strokeStyle = '#222'; ctx.lineWidth = 3;
    [-1, 1].forEach(side => {
      const ex = side * moleSize * 0.25, ey = -moleSize * 0.25;
      ctx.beginPath();
      ctx.moveTo(ex - 5, ey - 5); ctx.lineTo(ex + 5, ey + 5);
      ctx.moveTo(ex + 5, ey - 5); ctx.lineTo(ex - 5, ey + 5);
      ctx.stroke();
    });
  } else {
    // 丸い目
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-moleSize * 0.25, -moleSize * 0.25, moleSize * 0.18, 0, Math.PI * 2);
    ctx.arc(moleSize * 0.25, -moleSize * 0.25, moleSize * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(-moleSize * 0.25, -moleSize * 0.22, moleSize * 0.09, 0, Math.PI * 2);
    ctx.arc(moleSize * 0.25, -moleSize * 0.22, moleSize * 0.09, 0, Math.PI * 2);
    ctx.fill();
  }

  // 鼻（ピンク）
  ctx.fillStyle = '#FF9999';
  ctx.beginPath();
  ctx.ellipse(0, -moleSize * 0.05, moleSize * 0.12, moleSize * 0.09, 0, 0, Math.PI * 2);
  ctx.fill();

  // 前歯
  ctx.fillStyle = '#fff';
  ctx.fillRect(-moleSize * 0.06, moleSize * 0.05, moleSize * 0.05, moleSize * 0.1);
  ctx.fillRect(moleSize * 0.01, moleSize * 0.05, moleSize * 0.05, moleSize * 0.1);

  // ヒゲ
  ctx.strokeStyle = '#555'; ctx.lineWidth = 1.5;
  [-1, 1].forEach(side => {
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(side * moleSize * 0.15, -moleSize * 0.02 + i * 6);
      ctx.lineTo(side * moleSize * 0.55, -moleSize * 0.08 + i * 8);
      ctx.stroke();
    }
  });

  ctx.restore();
  ctx.restore();

  // 穴の手前の半分を再描画（もぐらを穴の中に見せる）
  ctx.fillStyle = 'rgba(60, 40, 20, 0.7)';
  ctx.beginPath();
  ctx.ellipse(x, y, holeW / 2, holeH / 2, 0, 0, Math.PI);
  ctx.fill();
}

function drawGameTimer() {
  if (!gameStarted || showingResults) return;
  const secs = Math.ceil(gameTimer);
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath(); ctx.roundRect(w / 2 - 40, 12, 80, 32, 16); ctx.fill();
  ctx.fillStyle = secs <= 10 ? '#e55' : '#654';
  ctx.font = 'bold 20px "Hiragino Sans", sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(`${secs}`, w / 2, 28);

  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath(); ctx.roundRect(w / 2 + 50, 12, 100, 32, 16); ctx.fill();
  ctx.fillStyle = '#654';
  ctx.font = 'bold 18px "Hiragino Sans", sans-serif';
  ctx.fillText(`${gameScore} ひき`, w / 2 + 100, 28);
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
  ctx.fillText('ひき たたいたよ！', w / 2, h * 0.54);

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
  popUpDuration = 2.0;
  maxActive = 1;
  difficultyTimer = 0;
  for (const h of holes) {
    h.state = 'hidden'; h.moleUp = 0; h.timer = rand(0.5, 2.5);
  }
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

  // もぐらヒット判定
  for (const hole of holes) {
    if (hole.state !== 'up' && hole.state !== 'rising') continue;
    if (hole.moleUp < 0.5) continue;
    const moleSize = Math.min(hole.holeW * 0.55, 55);
    const riseHeight = moleSize * 1.6;
    const moleY = hole.y - riseHeight * hole.moleUp;

    if (dist(pos.x, pos.y, hole.x, moleY) < moleSize * 1.3) {
      hole.state = 'whacked';
      hole.timer = 0.6;
      hole.whackPhase = 0;
      gameScore++;
      soundManager.play('whack', 0.7);
      particles.emit(hole.x, moleY, 20, {
        speedMin: 50, speedMax: 180,
        sizeMin: 4, sizeMax: 10,
        lifeMin: 0.4, lifeMax: 1.0,
        gravity: 50, hue: 45, shape: 'star',
      });
      break;
    }
  }
});

function animate(time) {
  const dt = Math.min((time - lastTime) / 1000, 0.05);
  lastTime = time;

  if (gameStarted && !showingResults) {
    gameTimer -= dt;
    if (gameTimer <= 0) { gameTimer = 0; showingResults = true; }

    // 難易度上昇
    difficultyTimer += dt;
    if (difficultyTimer > 15) {
      difficultyTimer = 0;
      popUpDuration = Math.max(0.8, popUpDuration - 0.3);
      maxActive = Math.min(3, maxActive + 1);
    }
  }

  // 背景（草原）
  const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
  bgGrad.addColorStop(0, '#87CEEB');
  bgGrad.addColorStop(0.4, '#90EE90');
  bgGrad.addColorStop(1, '#6B8E23');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  // 穴の更新と描画
  if (!showingResults && gameStarted) {
    // アクティブなもぐらの数を数える
    let activeCount = 0;
    for (const hole of holes) {
      if (hole.state !== 'hidden') activeCount++;
    }

    for (const hole of holes) {
      switch (hole.state) {
        case 'hidden':
          hole.timer -= dt;
          if (hole.timer <= 0 && activeCount < maxActive) {
            hole.state = 'rising';
            hole.moleUp = 0;
            activeCount++;
          }
          break;
        case 'rising':
          hole.moleUp += dt * 3;
          if (hole.moleUp >= 1) {
            hole.moleUp = 1;
            hole.state = 'up';
            hole.timer = popUpDuration;
          }
          break;
        case 'up':
          hole.timer -= dt;
          if (hole.timer <= 0) {
            hole.state = 'hiding';
          }
          break;
        case 'whacked':
          hole.whackPhase += dt;
          hole.timer -= dt;
          if (hole.timer <= 0) {
            hole.state = 'hiding';
          }
          break;
        case 'hiding':
          hole.moleUp -= dt * 3;
          if (hole.moleUp <= 0) {
            hole.moleUp = 0;
            hole.state = 'hidden';
            hole.timer = rand(0.8, 2.5);
          }
          break;
      }
    }
  }

  // 穴を先に描画
  for (const hole of holes) drawHole(hole);
  // もぐらをその上に描画
  for (const hole of holes) drawMole(hole);

  particles.update(dt);
  particles.draw(ctx);

  drawGameTimer();
  if (showingResults) drawResults();

  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);

function toggleSound() {
  const enabled = soundManager.toggle();
  document.getElementById('soundBtn').textContent = enabled ? '🔊' : '🔇';
}
