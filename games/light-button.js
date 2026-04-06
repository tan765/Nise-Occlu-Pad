/* === ひかるボタン === */
/* 光った順番を覚えてタップ */
/* 訓練: 固視 + 記憶 + 手と眼の協応 */

const canvas = document.getElementById('canvas');
let ctx = setupCanvas(canvas);
const particles = new ParticleSystem(500);
let w, h, S = 1;
let lastTime = 0;

// タイマー
const GAME_TIME = 90;
let gameTimer = GAME_TIME;
let gameStarted = false;
let showingResults = false;
const replayBtn = { x: 0, y: 0, w: 200, h: 56 };

// ボタン設定
const BUTTON_COLORS = [
  { hue: 0, name: '赤', note: 'note1', dark: '#8B0000', light: '#FF4444', bright: '#FF8888' },
  { hue: 220, name: '青', note: 'note2', dark: '#00008B', light: '#4444FF', bright: '#8888FF' },
  { hue: 120, name: '緑', note: 'note3', dark: '#006400', light: '#44CC44', bright: '#88FF88' },
  { hue: 55, name: '黄', note: 'note4', dark: '#8B8B00', light: '#DDDD22', bright: '#FFFF88' },
];

const buttons = [];
let level = 1;
let sequence = [];
let showingSequence = false;
let sequenceIndex = 0;
let sequenceTimer = 0;
let playerIndex = 0;
let state = 'idle'; // idle, showing, input, levelup, wrong
let stateTimer = 0;
let flashButton = -1;
let flashTimer = 0;

function resize() {
  ctx = setupCanvas(canvas);
  w = canvas._cssWidth;
  h = canvas._cssHeight;
  S = getScale(canvas);
  replayBtn.w = 200 * S;
  replayBtn.h = 56 * S;
  layoutButtons();
}

function layoutButtons() {
  buttons.length = 0;
  const gap = 16 * S;
  const btnSize = Math.min((w - gap * 3) / 2, (h - gap * 3 - 100 * S) / 2, 200 * S);
  const totalW = btnSize * 2 + gap;
  const totalH = btnSize * 2 + gap;
  const startX = (w - totalW) / 2;
  const startY = (h - totalH) / 2 + 20 * S;

  for (let i = 0; i < 4; i++) {
    const col = i % 2, row = Math.floor(i / 2);
    buttons.push({
      x: startX + col * (btnSize + gap),
      y: startY + row * (btnSize + gap),
      w: btnSize,
      h: btnSize,
      color: BUTTON_COLORS[i],
      lit: 0, // 0=dark, 0-1=brightness
      pressScale: 1,
    });
  }
}

resize();
onResize(canvas, () => resize());

function startSequence() {
  // 新しい要素を追加
  sequence.push(randInt(0, 3));
  state = 'showing';
  sequenceIndex = 0;
  sequenceTimer = 0.6; // 最初のディレイ
  playerIndex = 0;
}

function resetGame() {
  gameTimer = GAME_TIME;
  gameStarted = false;
  showingResults = false;
  level = 1;
  sequence = [];
  state = 'idle';
  stateTimer = 0;
  flashButton = -1;
  flashTimer = 0;
  for (const b of buttons) { b.lit = 0; b.pressScale = 1; }
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

  if (!gameStarted) {
    gameStarted = true;
    startSequence();
    return;
  }

  if (state !== 'input') return;

  // ボタンヒット判定
  for (let i = 0; i < buttons.length; i++) {
    const b = buttons[i];
    if (pos.x >= b.x && pos.x <= b.x + b.w && pos.y >= b.y && pos.y <= b.y + b.h) {
      b.lit = 1;
      b.pressScale = 0.92;
      soundManager.play(b.color.note, 0.7);

      if (i === sequence[playerIndex]) {
        // 正解
        flashButton = i;
        flashTimer = 0.3;
        playerIndex++;

        if (playerIndex >= sequence.length) {
          // レベルクリア！
          state = 'levelup';
          stateTimer = 1.0;
          level++;
          // 大きなパーティクル
          const cx = w / 2, cy = h / 2;
          particles.emit(cx, cy, 30, {
            speedMin: 80 * S, speedMax: 250 * S,
            sizeMin: 5 * S, sizeMax: 14 * S,
            lifeMin: 0.5, lifeMax: 1.5,
            gravity: 40 * S,
            hue: BUTTON_COLORS[i].hue,
            shape: 'star',
          });
        }
      } else {
        // 間違い → もう一度見せる
        state = 'wrong';
        stateTimer = 1.0;
      }
      break;
    }
  }
});

function drawButton(b, index) {
  ctx.save();
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
  ctx.translate(cx, cy);
  ctx.scale(b.pressScale, b.pressScale);

  const r = Math.min(b.w, b.h) * 0.12;

  if (b.lit > 0.1) {
    // 光っている
    ctx.shadowColor = b.color.bright;
    ctx.shadowBlur = 30 * S * b.lit;
    ctx.fillStyle = b.color.bright;
  } else {
    ctx.fillStyle = b.color.dark;
  }

  ctx.beginPath();
  ctx.roundRect(-b.w / 2, -b.h / 2, b.w, b.h, r);
  ctx.fill();

  // 内側のグラデーション
  if (b.lit > 0.1) {
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, b.w * 0.6);
    grad.addColorStop(0, `rgba(255,255,255,${0.3 * b.lit})`);
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(-b.w / 2, -b.h / 2, b.w, b.h, r);
    ctx.fill();
  }

  ctx.shadowBlur = 0;

  // ハイライト
  ctx.fillStyle = `rgba(255,255,255,${b.lit > 0.1 ? 0.15 : 0.08})`;
  ctx.beginPath();
  ctx.roundRect(-b.w / 2 + 8 * S, -b.h / 2 + 6 * S, b.w - 16 * S, b.h * 0.35, r * 0.8);
  ctx.fill();

  ctx.restore();
}

function drawGameTimer() {
  if (!gameStarted || showingResults) return;
  const secs = Math.ceil(gameTimer);
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  ctx.beginPath(); ctx.roundRect(w / 2 - 40 * S, 12 * S, 80 * S, 32 * S, 16 * S); ctx.fill();
  ctx.fillStyle = secs <= 10 ? '#f66' : 'rgba(255,255,255,0.7)';
  ctx.font = scaledFont(20, S);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(`${secs}`, w / 2, 28 * S);

  // レベル表示
  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  ctx.beginPath(); ctx.roundRect(w / 2 + 50 * S, 12 * S, 110 * S, 32 * S, 16 * S); ctx.fill();
  ctx.fillStyle = '#FFD700';
  ctx.font = scaledFont(18, S);
  ctx.fillText(`レベル ${level}`, w / 2 + 105 * S, 28 * S);
  ctx.restore();
}

function drawResults() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  ctx.fillStyle = '#fff';
  ctx.font = scaledFont(38, S);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('おわり！', w / 2, h * 0.3);
  ctx.font = scaledFont(56, S);
  ctx.fillStyle = '#FFD700';
  ctx.fillText(`レベル ${level}`, w / 2, h * 0.44);
  ctx.font = scaledFont(22, S);
  ctx.fillStyle = '#fff';
  ctx.fillText('まで いけたよ！', w / 2, h * 0.54);

  replayBtn.x = w / 2 - replayBtn.w / 2;
  replayBtn.y = h * 0.66;
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.beginPath(); ctx.roundRect(replayBtn.x, replayBtn.y, replayBtn.w, replayBtn.h, 28 * S); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(replayBtn.x, replayBtn.y, replayBtn.w, replayBtn.h, 28 * S); ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = scaledFont(22, S);
  ctx.fillText('もういっかい', w / 2, replayBtn.y + replayBtn.h / 2);
  ctx.restore();
}

function animate(time) {
  const dt = Math.min((time - lastTime) / 1000, 0.05);
  lastTime = time;

  if (gameStarted && !showingResults) {
    gameTimer -= dt;
    if (gameTimer <= 0) { gameTimer = 0; showingResults = true; state = 'idle'; }
  }

  // 背景（暗いグラデーション）
  const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
  bgGrad.addColorStop(0, '#1a1a2e');
  bgGrad.addColorStop(1, '#16213e');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  // 状態管理
  switch (state) {
    case 'showing':
      sequenceTimer -= dt;
      if (sequenceTimer <= 0) {
        if (sequenceIndex < sequence.length) {
          const btnIdx = sequence[sequenceIndex];
          buttons[btnIdx].lit = 1;
          soundManager.play(buttons[btnIdx].color.note, 0.6);
          flashButton = btnIdx;
          flashTimer = 0.5;
          sequenceIndex++;
          sequenceTimer = 0.7;
        } else {
          state = 'input';
          playerIndex = 0;
        }
      }
      break;

    case 'levelup':
      stateTimer -= dt;
      if (stateTimer <= 0) {
        startSequence();
      }
      break;

    case 'wrong':
      stateTimer -= dt;
      if (stateTimer <= 0) {
        // もう一度同じシーケンスを見せる
        state = 'showing';
        sequenceIndex = 0;
        sequenceTimer = 0.5;
        playerIndex = 0;
      }
      break;
  }

  // ボタンの光をフェードアウト
  for (const b of buttons) {
    if (b.lit > 0) b.lit = Math.max(0, b.lit - dt * 3);
    if (b.pressScale < 1) b.pressScale = Math.min(1, b.pressScale + dt * 5);
  }
  if (flashTimer > 0) {
    flashTimer -= dt;
    if (flashButton >= 0) buttons[flashButton].lit = Math.max(buttons[flashButton].lit, flashTimer / 0.5);
  }

  // ボタン描画
  for (let i = 0; i < buttons.length; i++) {
    drawButton(buttons[i], i);
  }

  // レベルアップ表示
  if (state === 'levelup') {
    ctx.save();
    ctx.fillStyle = '#FFD700';
    ctx.font = scaledFont(32, S);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const pulse = 1 + Math.sin(stateTimer * 10) * 0.1;
    ctx.translate(w / 2, h * 0.12);
    ctx.scale(pulse, pulse);
    ctx.fillText('すごい！', 0, 0);
    ctx.restore();
  }

  // 間違い表示
  if (state === 'wrong') {
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = scaledFont(26, S);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('もういっかい みるよ', w / 2, h * 0.12);
    ctx.restore();
  }

  // 待機中の表示
  if (state === 'idle' && !showingResults && !gameStarted) {
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = scaledFont(24, S);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const pulse = 0.7 + Math.sin(time / 400) * 0.3;
    ctx.globalAlpha = pulse;
    ctx.fillText('タッチしてスタート！', w / 2, h * 0.12);
    ctx.restore();
  }

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
