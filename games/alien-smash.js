/* === エイリアンたおし（ブロック崩し風） === */
/* パドルでボールを打ち返してエイリアンを倒す */
/* 訓練: 追従 + 固視 + 手と眼の協応 */

const canvas = document.getElementById('canvas');
let ctx = setupCanvas(canvas);
const particles = new ParticleSystem(500);
let w, h, S = 1;
let lastTime = 0;
const aliens = [];
const MAX_ALIENS = 5;

// タイマー
const GAME_TIME = 90;
let gameTimer = GAME_TIME;
let gameStarted = false;
let gameScore = 0;
let showingResults = false;
const replayBtn = { x: 0, y: 0, w: 200, h: 56 };

// パドル
const paddle = {
  x: 0, y: 0,
  width: 130, height: 18,
  hue: 200, targetX: 0,
};

let ball = null;
let ballRespawnTimer = 0;

const FACES = [
  { eyes: '○○', mouth: 'smile' },
  { eyes: '◎◎', mouth: 'open' },
  { eyes: '><', mouth: 'tongue' },
  { eyes: '^^', mouth: 'grin' },
  { eyes: '@@', mouth: 'wave' },
  { eyes: '★★', mouth: 'smile' },
];
const ALIEN_COLORS = [120, 180, 270, 300, 60, 30];

function resize() {
  ctx = setupCanvas(canvas);
  w = canvas._cssWidth;
  h = canvas._cssHeight;
  S = getScale(canvas);
  paddle.width = 130 * S;
  paddle.height = 18 * S;
  paddle.y = h - 50 * S;
  paddle.x = w / 2;
  paddle.targetX = w / 2;
  replayBtn.w = 200 * S;
  replayBtn.h = 56 * S;
}
resize();
onResize(canvas, () => resize());

function createAlien() {
  const face = FACES[randInt(0, FACES.length - 1)];
  const colorHue = ALIEN_COLORS[randInt(0, ALIEN_COLORS.length - 1)];
  const size = rand(50 * S, 70 * S);
  return {
    x: rand(size + 20, w - size - 20),
    y: -size,
    targetY: rand(size + 70 * S, h * 0.55),
    size, hue: colorHue, face, speed: rand(40 * S, 80 * S),
    wobble: Math.random() * Math.PI * 2,
    wobbleSpeed: rand(1, 3), wobbleAmp: rand(10 * S, 25 * S),
    arrived: false, hit: false, hitTimer: 0,
    rotation: 0, scale: 1,
    hoverPhase: Math.random() * Math.PI * 2,
  };
}

function createBreakoutBall(x, y) {
  return { x, y, vx: 0, vy: 0, radius: 12 * S, hue: rand(0, 360), speed: 320 * S, trail: [], active: true, launched: false };
}

for (let i = 0; i < MAX_ALIENS; i++) {
  const a = createAlien();
  a.y = a.targetY; a.arrived = true;
  aliens.push(a);
}

function spawnBall() {
  ball = createBreakoutBall(paddle.x, paddle.y - paddle.height / 2 - 14 * S);
}
spawnBall();

function drawAlien(a) {
  ctx.save();
  ctx.translate(a.x, a.y);
  ctx.rotate(a.rotation);
  ctx.scale(a.scale, a.scale);
  const s = a.size;

  const grad = ctx.createRadialGradient(-s * 0.15, -s * 0.15, s * 0.1, 0, 0, s);
  grad.addColorStop(0, hsl(a.hue, 70, 70));
  grad.addColorStop(1, hsl(a.hue, 70, 45));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(0, 0, s * 0.8, s, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = hsl(a.hue, 60, 55);
  ctx.lineWidth = 3 * S; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-s * 0.2, -s * 0.8);
  ctx.quadraticCurveTo(-s * 0.4, -s * 1.3, -s * 0.5, -s * 1.15);
  ctx.stroke();
  ctx.fillStyle = hsl((a.hue + 60) % 360, 80, 65);
  ctx.beginPath(); ctx.arc(-s * 0.5, -s * 1.15, 5 * S, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(s * 0.2, -s * 0.8);
  ctx.quadraticCurveTo(s * 0.4, -s * 1.3, s * 0.5, -s * 1.15);
  ctx.stroke();
  ctx.fillStyle = hsl((a.hue + 60) % 360, 80, 65);
  ctx.beginPath(); ctx.arc(s * 0.5, -s * 1.15, 5 * S, 0, Math.PI * 2); ctx.fill();

  drawEyes(a.face.eyes, s);
  drawMouth(a.face.mouth, s, a.hit);
  ctx.restore();
}

function drawEyes(type, s) {
  const eyeY = -s * 0.15, eyeSpacing = s * 0.3, eyeSize = s * 0.2;
  switch (type) {
    case '○○':
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(-eyeSpacing, eyeY, eyeSize, 0, Math.PI * 2);
      ctx.arc(eyeSpacing, eyeY, eyeSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#222';
      ctx.beginPath();
      ctx.arc(-eyeSpacing, eyeY, eyeSize * 0.5, 0, Math.PI * 2);
      ctx.arc(eyeSpacing, eyeY, eyeSize * 0.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    case '◎◎':
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(-eyeSpacing, eyeY, eyeSize * 1.2, 0, Math.PI * 2);
      ctx.arc(eyeSpacing, eyeY, eyeSize * 1.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#222';
      ctx.beginPath();
      ctx.arc(-eyeSpacing, eyeY, eyeSize * 0.4, 0, Math.PI * 2);
      ctx.arc(eyeSpacing, eyeY, eyeSize * 0.4, 0, Math.PI * 2);
      ctx.fill();
      break;
    case '><':
      ctx.strokeStyle = '#222'; ctx.lineWidth = 3 * S;
      [-1, 1].forEach(side => {
        const cx = side * eyeSpacing;
        const d = 6 * S;
        ctx.beginPath();
        ctx.moveTo(cx - d, eyeY - d); ctx.lineTo(cx + d, eyeY + d);
        ctx.moveTo(cx + d, eyeY - d); ctx.lineTo(cx - d, eyeY + d);
        ctx.stroke();
      });
      break;
    case '^^':
      ctx.strokeStyle = '#222'; ctx.lineWidth = 3;
      [-1, 1].forEach(side => {
        ctx.beginPath();
        ctx.arc(side * eyeSpacing, eyeY + 4, eyeSize * 0.7, Math.PI, Math.PI * 2);
        ctx.stroke();
      });
      break;
    case '@@':
      ctx.strokeStyle = '#222'; ctx.lineWidth = 2;
      [-1, 1].forEach(side => {
        const cx = side * eyeSpacing;
        ctx.beginPath();
        for (let a = 0; a < Math.PI * 4; a += 0.1) {
          ctx.lineTo(cx + Math.cos(a) * a * 1.5, eyeY + Math.sin(a) * a * 1.5);
        }
        ctx.stroke();
      });
      break;
    case '★★':
      ctx.fillStyle = '#FFD700';
      [-1, 1].forEach(side => { drawStar(ctx, side * eyeSpacing, eyeY, eyeSize); });
      break;
  }
}

function drawMouth(type, s, isHit) {
  const mouthY = s * 0.35;
  if (isHit) {
    ctx.strokeStyle = '#222'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, mouthY, s * 0.2, 0, Math.PI); ctx.stroke();
    return;
  }
  switch (type) {
    case 'smile':
      ctx.strokeStyle = '#222'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, mouthY - 5, s * 0.25, 0.2, Math.PI - 0.2); ctx.stroke();
      break;
    case 'open':
      ctx.fillStyle = '#222';
      ctx.beginPath(); ctx.ellipse(0, mouthY, s * 0.15, s * 0.2, 0, 0, Math.PI * 2); ctx.fill();
      break;
    case 'tongue':
      ctx.strokeStyle = '#222'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, mouthY - 5, s * 0.25, 0.2, Math.PI - 0.2); ctx.stroke();
      ctx.fillStyle = '#FF6B8A';
      ctx.beginPath(); ctx.ellipse(0, mouthY + 8, s * 0.12, s * 0.08, 0, 0, Math.PI); ctx.fill();
      break;
    case 'grin':
      ctx.fillStyle = '#222';
      ctx.beginPath(); ctx.arc(0, mouthY - 5, s * 0.25, 0.1, Math.PI - 0.1); ctx.closePath(); ctx.fill();
      break;
    case 'wave':
      ctx.strokeStyle = '#222'; ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-s * 0.2, mouthY);
      ctx.quadraticCurveTo(-s * 0.1, mouthY - 8, 0, mouthY);
      ctx.quadraticCurveTo(s * 0.1, mouthY + 8, s * 0.2, mouthY);
      ctx.stroke();
      break;
  }
}

function drawPaddle() {
  ctx.save();
  const px = paddle.x - paddle.width / 2, py = paddle.y, r = paddle.height / 2;
  ctx.shadowColor = hsl(paddle.hue, 80, 60);
  ctx.shadowBlur = 15 * S;
  const grad = ctx.createLinearGradient(px, py, px, py + paddle.height);
  grad.addColorStop(0, hsl(paddle.hue, 75, 70));
  grad.addColorStop(0.5, hsl(paddle.hue, 80, 60));
  grad.addColorStop(1, hsl(paddle.hue, 75, 50));
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.roundRect(px, py, paddle.width, paddle.height, r); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.beginPath(); ctx.roundRect(px + 10 * S, py + 2 * S, paddle.width - 20 * S, paddle.height * 0.4, r / 2); ctx.fill();
  ctx.restore();
}

function drawBall(b) {
  ctx.globalAlpha = 0.3;
  for (let i = 0; i < b.trail.length; i++) {
    const t = b.trail[i];
    ctx.fillStyle = hsla(b.hue, 80, 60, i / b.trail.length * 0.3);
    ctx.beginPath(); ctx.arc(t.x, t.y, b.radius * 0.6, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  const grad = ctx.createRadialGradient(b.x - b.radius * 0.3, b.y - b.radius * 0.3, b.radius * 0.1, b.x, b.y, b.radius);
  grad.addColorStop(0, hsl(b.hue, 90, 80));
  grad.addColorStop(1, hsl(b.hue, 90, 55));
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2); ctx.fill();
  ctx.save();
  ctx.shadowColor = hsl(b.hue, 80, 60); ctx.shadowBlur = 10 * S;
  ctx.beginPath(); ctx.arc(b.x, b.y, b.radius * 0.5, 0, Math.PI * 2);
  ctx.fillStyle = hsl(b.hue, 90, 70); ctx.fill();
  ctx.restore();
}

function drawGameTimer() {
  if (!gameStarted || showingResults) return;
  const secs = Math.ceil(gameTimer);
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.roundRect(w / 2 - 40 * S, 12 * S, 80 * S, 32 * S, 16 * S); ctx.fill();
  ctx.fillStyle = secs <= 10 ? '#f66' : '#fff';
  ctx.font = scaledFont(20, S);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(`${secs}`, w / 2, 28 * S);

  // スコア
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.roundRect(w / 2 + 50 * S, 12 * S, 100 * S, 32 * S, 16 * S); ctx.fill();
  ctx.fillStyle = '#FFD700';
  ctx.font = scaledFont(18, S);
  ctx.fillText(`${gameScore} たい`, w / 2 + 100 * S, 28 * S);
  ctx.restore();
}

function drawResultsScreen() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  ctx.fillStyle = '#fff';
  ctx.font = scaledFont(38, S);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('おわり！', w / 2, h * 0.3);
  ctx.font = scaledFont(60, S);
  ctx.fillStyle = '#FFD700';
  ctx.fillText(`${gameScore}`, w / 2, h * 0.44);
  ctx.font = scaledFont(22, S);
  ctx.fillStyle = '#fff';
  ctx.fillText('たい たおしたよ！', w / 2, h * 0.54);

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

function resetGame() {
  gameTimer = GAME_TIME;
  gameStarted = false;
  gameScore = 0;
  showingResults = false;
  aliens.length = 0;
  for (let i = 0; i < MAX_ALIENS; i++) {
    const a = createAlien(); a.y = a.targetY; a.arrived = true;
    aliens.push(a);
  }
  spawnBall();
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

  let directHit = false;
  for (const a of aliens) {
    if (a.hit) continue;
    if (dist(pos.x, pos.y, a.x, a.y) < a.size * 1.1) {
      hitAlien(a); directHit = true; break;
    }
  }

  if (!directHit && ball && !ball.launched) {
    ball.launched = true;
    ball.vx = rand(-120 * S, 120 * S);
    ball.vy = -ball.speed;
    normalizeBallSpeed();
    soundManager.play('bounce', 0.5);
  }
  paddle.targetX = Math.max(paddle.width / 2, Math.min(w - paddle.width / 2, pos.x));
});

canvas.addEventListener('pointermove', (e) => {
  e.preventDefault();
  if (showingResults) return;
  const pos = getPointerPos(canvas, e);
  paddle.targetX = Math.max(paddle.width / 2, Math.min(w - paddle.width / 2, pos.x));
});

function normalizeBallSpeed() {
  if (!ball) return;
  const cs = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
  if (cs > 0) { ball.vx = (ball.vx / cs) * ball.speed; ball.vy = (ball.vy / cs) * ball.speed; }
}

function hitAlien(a) {
  a.hit = true; a.hitTimer = 1.2;
  gameScore++;
  particles.emit(a.x, a.y, 25, { speedMin: 60 * S, speedMax: 200 * S, sizeMin: 4 * S, sizeMax: 12 * S, lifeMin: 0.5, lifeMax: 1.5, gravity: 40 * S, hue: a.hue, shape: 'star' });
  particles.emit(a.x, a.y, 10, { speedMin: 30 * S, speedMax: 100 * S, sizeMin: 3 * S, sizeMax: 7 * S, lifeMin: 0.4, lifeMax: 1.0, gravity: 20 * S, hue: (a.hue + 180) % 360, shape: 'heart' });
  soundManager.play('happy', 0.7);
}

function animate(time) {
  const dt = Math.min((time - lastTime) / 1000, 0.05);
  lastTime = time;

  if (gameStarted && !showingResults) {
    gameTimer -= dt;
    if (gameTimer <= 0) { gameTimer = 0; showingResults = true; }
  }

  ctx.fillStyle = '#0a0a1a';
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  for (let i = 0; i < 40; i++) {
    const sx = ((i * 137.5) % w), sy = ((i * 73.3) % h), ss = 1 + (i % 3);
    ctx.globalAlpha = 0.3 + 0.3 * Math.sin(time / 500 + i);
    ctx.beginPath(); ctx.arc(sx, sy, ss, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  if (!showingResults) {
    for (let i = aliens.length - 1; i >= 0; i--) {
      const a = aliens[i];
      if (!a.arrived) {
        a.y += a.speed * dt;
        if (a.y >= a.targetY) { a.y = a.targetY; a.arrived = true; }
      } else if (a.hit) {
        a.hitTimer -= dt; a.rotation += 10 * dt;
        a.scale = Math.max(0, a.hitTimer / 1.2); a.y -= 80 * S * dt;
        if (a.hitTimer <= 0) { aliens.splice(i, 1); continue; }
      } else {
        a.wobble += a.wobbleSpeed * dt;
        a.x += Math.sin(a.wobble) * a.wobbleAmp * dt;
        a.hoverPhase += 1.5 * dt;
        a.y = a.targetY + Math.sin(a.hoverPhase) * 8 * S;
      }
      drawAlien(a);
    }

    while (aliens.length < MAX_ALIENS) aliens.push(createAlien());

    paddle.x += (paddle.targetX - paddle.x) * 0.25;

    if (ball && ball.active) {
      if (!ball.launched) {
        ball.x = paddle.x;
        ball.y = paddle.y - paddle.height / 2 - ball.radius - 2 * S;
      } else {
        ball.x += ball.vx * dt; ball.y += ball.vy * dt;
        ball.trail.push({ x: ball.x, y: ball.y });
        if (ball.trail.length > 10) ball.trail.shift();

        if (ball.x < ball.radius) { ball.x = ball.radius; ball.vx = Math.abs(ball.vx); soundManager.play('bounce', 0.3); }
        else if (ball.x > w - ball.radius) { ball.x = w - ball.radius; ball.vx = -Math.abs(ball.vx); soundManager.play('bounce', 0.3); }
        if (ball.y < ball.radius) { ball.y = ball.radius; ball.vy = Math.abs(ball.vy); soundManager.play('bounce', 0.3); }

        if (ball.vy > 0 && ball.y + ball.radius >= paddle.y && ball.y - ball.radius <= paddle.y + paddle.height &&
            ball.x >= paddle.x - paddle.width / 2 - ball.radius * 0.5 && ball.x <= paddle.x + paddle.width / 2 + ball.radius * 0.5) {
          ball.y = paddle.y - ball.radius;
          const hitPos = (ball.x - paddle.x) / (paddle.width / 2);
          const angle = hitPos * (Math.PI / 3);
          ball.vx = Math.sin(angle) * ball.speed;
          ball.vy = -Math.cos(angle) * ball.speed;
          ball.hue = (ball.hue + 60) % 360;
          soundManager.play('bounce', 0.5);
          particles.emit(ball.x, ball.y, 5, { speedMin: 20 * S, speedMax: 60 * S, sizeMin: 2 * S, sizeMax: 5 * S, lifeMin: 0.2, lifeMax: 0.5, gravity: 30 * S, hue: ball.hue, shape: 'circle' });
        }

        for (const a of aliens) {
          if (a.hit) continue;
          if (dist(ball.x, ball.y, a.x, a.y) < a.size * 0.9 + ball.radius) {
            hitAlien(a);
            ball.vy = -ball.vy;
            ball.y += ball.vy > 0 ? 5 * S : -5 * S;
            normalizeBallSpeed();
            break;
          }
        }

        if (ball.y > h + ball.radius * 2) { ball.active = false; ballRespawnTimer = 1.0; }
      }
      if (ball.active) drawBall(ball);
    }

    if (ball && !ball.active) { ballRespawnTimer -= dt; if (ballRespawnTimer <= 0) spawnBall(); }
    if (!ball) spawnBall();

    drawPaddle();
  }

  particles.update(dt);
  particles.draw(ctx);

  drawGameTimer();
  if (showingResults) drawResultsScreen();

  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);

function toggleSound() {
  const enabled = soundManager.toggle();
  document.getElementById('soundBtn').textContent = enabled ? '🔊' : '🔇';
}
