/* === おえかき === */
/* 指で自由にお絵かき。虹色トレイルも選べる */
/* 訓練: 手と眼の協応 */

const canvas = document.getElementById('canvas');
let ctx = setupCanvas(canvas);
const particles = new ParticleSystem(200);
let w, h;

const COLORS = [
  { name: 'あか', color: '#FF4444' },
  { name: 'オレンジ', color: '#FF9922' },
  { name: 'きいろ', color: '#FFDD00' },
  { name: 'みどり', color: '#44BB44' },
  { name: 'あお', color: '#4488FF' },
  { name: 'むらさき', color: '#AA44FF' },
  { name: 'ピンク', color: '#FF66AA' },
  { name: 'にじいろ', color: 'rainbow' },
];

let currentColor = COLORS[0].color;
let isDrawing = false;
let lastX = 0, lastY = 0;
let rainbowHue = 0;
let drawingCanvas, drawingCtx; // 描画用の別レイヤー

function resize() {
  ctx = setupCanvas(canvas);
  w = canvas._cssWidth;
  h = canvas._cssHeight;

  // 描画レイヤーを再作成（描画内容は消える）
  if (!drawingCanvas) {
    drawingCanvas = document.createElement('canvas');
  }
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  drawingCanvas.width = w * dpr;
  drawingCanvas.height = h * dpr;
  drawingCtx = drawingCanvas.getContext('2d');
  drawingCtx.scale(dpr, dpr);
  drawingCtx.lineCap = 'round';
  drawingCtx.lineJoin = 'round';
  drawingCtx.lineWidth = 12;
}
resize();
onResize(canvas, () => resize());

// パレット生成
const palette = document.getElementById('palette');
COLORS.forEach((c, i) => {
  const btn = document.createElement('button');
  btn.className = 'color-btn';
  if (c.color === 'rainbow') {
    btn.style.background = 'conic-gradient(red, orange, yellow, green, blue, purple, red)';
  } else {
    btn.style.background = c.color;
  }
  if (i === 0) btn.classList.add('active');
  btn.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    currentColor = c.color;
    document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    soundManager.play('bounce', 0.4);
  });
  palette.appendChild(btn);
});

// クリアボタン
const clearBtn = document.createElement('button');
clearBtn.className = 'clear-btn';
clearBtn.textContent = '✨';
clearBtn.addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  clearDrawing();
});
palette.appendChild(clearBtn);

function clearDrawing() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  drawingCtx.clearRect(0, 0, w * dpr, h * dpr);
  // キラキラアニメーションで「消す」
  for (let i = 0; i < 30; i++) {
    particles.emit(rand(0, w), rand(0, h), 2, {
      speedMin: 10, speedMax: 50,
      sizeMin: 3, sizeMax: 8,
      lifeMin: 0.5, lifeMax: 1.5,
      gravity: -10,
      hue: null,
      shape: 'star'
    });
  }
  soundManager.play('sparkle', 0.5);
}

// 描画イベント
canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  soundManager.init();
  soundManager.createSounds();
  if (!soundManager._bgmStarted) {
    soundManager.playBgm();
    soundManager._bgmStarted = true;
  }
  isDrawing = true;
  const pos = getPointerPos(canvas, e);
  lastX = pos.x;
  lastY = pos.y;
});

canvas.addEventListener('pointermove', (e) => {
  if (!isDrawing) return;
  e.preventDefault();
  const pos = getPointerPos(canvas, e);

  // 色を設定
  if (currentColor === 'rainbow') {
    rainbowHue = (rainbowHue + 3) % 360;
    drawingCtx.strokeStyle = hsl(rainbowHue, 90, 55);
  } else {
    drawingCtx.strokeStyle = currentColor;
  }

  // 線を描画
  drawingCtx.beginPath();
  drawingCtx.moveTo(lastX, lastY);
  drawingCtx.lineTo(pos.x, pos.y);
  drawingCtx.stroke();

  lastX = pos.x;
  lastY = pos.y;
});

canvas.addEventListener('pointerup', () => { isDrawing = false; });
canvas.addEventListener('pointercancel', () => { isDrawing = false; });

// メインループ
let lastTime = 0;
function animate(time) {
  const dt = Math.min((time - lastTime) / 1000, 0.05);
  lastTime = time;

  // 背景
  ctx.fillStyle = '#FFF8F0';
  ctx.fillRect(0, 0, w, h);

  // 描画レイヤーを表示
  ctx.drawImage(drawingCanvas, 0, 0, w, h);

  // パーティクル（クリア時のキラキラ）
  particles.update(dt);
  particles.draw(ctx);

  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);

function toggleSound() {
  const enabled = soundManager.toggle();
  document.getElementById('soundBtn').textContent = enabled ? '🔊' : '🔇';
}
