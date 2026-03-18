/* === エイリアンたおし（ブロック崩し風） === */
/* パドルでボールを打ち返してエイリアンを倒す */
/* 訓練: 追従 + 固視 + 手と眼の協応 */

const canvas = document.getElementById('canvas');
let ctx = setupCanvas(canvas);
const particles = new ParticleSystem(500);
let w, h;
let lastTime = 0;
const aliens = [];
const MAX_ALIENS = 5;

// パドル
const paddle = {
  x: 0,
  y: 0,
  width: 130,
  height: 18,
  hue: 200,
  targetX: 0,
};

// ボール（単一）
let ball = null;
let ballRespawnTimer = 0;

// エイリアンの表情パターン
const FACES = [
  { eyes: '○○', mouth: 'smile', name: 'にこにこ' },
  { eyes: '◎◎', mouth: 'open', name: 'びっくり' },
  { eyes: '><', mouth: 'tongue', name: 'べー' },
  { eyes: '^^', mouth: 'grin', name: 'にやり' },
  { eyes: '@@', mouth: 'wave', name: 'くるくる' },
  { eyes: '★★', mouth: 'smile', name: 'キラリ' },
];

const ALIEN_COLORS = [120, 180, 270, 300, 60, 30]; // hue values

function resize() {
  ctx = setupCanvas(canvas);
  w = canvas._cssWidth;
  h = canvas._cssHeight;
  paddle.y = h - 50;
  paddle.x = w / 2;
  paddle.targetX = w / 2;
}
resize();
onResize(canvas, () => resize());

function createAlien() {
  const face = FACES[randInt(0, FACES.length - 1)];
  const colorHue = ALIEN_COLORS[randInt(0, ALIEN_COLORS.length - 1)];
  const size = rand(50, 70);

  return {
    x: rand(size + 20, w - size - 20),
    y: -size,
    targetY: rand(size + 70, h * 0.55),
    size: size,
    hue: colorHue,
    face: face,
    speed: rand(40, 80),
    wobble: Math.random() * Math.PI * 2,
    wobbleSpeed: rand(1, 3),
    wobbleAmp: rand(10, 25),
    arrived: false,
    hit: false,
    hitTimer: 0,
    rotation: 0,
    scale: 1,
    hoverPhase: Math.random() * Math.PI * 2,
  };
}

function createBreakoutBall(x, y) {
  return {
    x: x,
    y: y,
    vx: 0,
    vy: 0,
    radius: 12,
    hue: rand(0, 360),
    speed: 320,
    trail: [],
    active: true,
    launched: false,
  };
}

// 初期エイリアン
for (let i = 0; i < MAX_ALIENS; i++) {
  const a = createAlien();
  a.y = a.targetY;
  a.arrived = true;
  aliens.push(a);
}

// 初期ボール（パドル上で待機）
function spawnBall() {
  ball = createBreakoutBall(paddle.x, paddle.y - paddle.height / 2 - 14);
}
spawnBall();

function drawAlien(a) {
  ctx.save();
  ctx.translate(a.x, a.y);
  ctx.rotate(a.rotation);
  ctx.scale(a.scale, a.scale);

  const s = a.size;

  // 体（楕円）
  const grad = ctx.createRadialGradient(-s * 0.15, -s * 0.15, s * 0.1, 0, 0, s);
  grad.addColorStop(0, hsl(a.hue, 70, 70));
  grad.addColorStop(1, hsl(a.hue, 70, 45));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(0, 0, s * 0.8, s, 0, 0, Math.PI * 2);
  ctx.fill();

  // 触角
  ctx.strokeStyle = hsl(a.hue, 60, 55);
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-s * 0.2, -s * 0.8);
  ctx.quadraticCurveTo(-s * 0.4, -s * 1.3, -s * 0.5, -s * 1.15);
  ctx.stroke();
  ctx.fillStyle = hsl((a.hue + 60) % 360, 80, 65);
  ctx.beginPath();
  ctx.arc(-s * 0.5, -s * 1.15, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(s * 0.2, -s * 0.8);
  ctx.quadraticCurveTo(s * 0.4, -s * 1.3, s * 0.5, -s * 1.15);
  ctx.stroke();
  ctx.fillStyle = hsl((a.hue + 60) % 360, 80, 65);
  ctx.beginPath();
  ctx.arc(s * 0.5, -s * 1.15, 5, 0, Math.PI * 2);
  ctx.fill();

  // 目
  drawEyes(a.face.eyes, s);
  // 口
  drawMouth(a.face.mouth, s, a.hit);

  ctx.restore();
}

function drawEyes(type, s) {
  const eyeY = -s * 0.15;
  const eyeSpacing = s * 0.3;
  const eyeSize = s * 0.2;

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
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 3;
      [-1, 1].forEach(side => {
        const cx = side * eyeSpacing;
        ctx.beginPath();
        ctx.moveTo(cx - 6, eyeY - 6);
        ctx.lineTo(cx + 6, eyeY + 6);
        ctx.moveTo(cx + 6, eyeY - 6);
        ctx.lineTo(cx - 6, eyeY + 6);
        ctx.stroke();
      });
      break;
    case '^^':
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 3;
      [-1, 1].forEach(side => {
        const cx = side * eyeSpacing;
        ctx.beginPath();
        ctx.arc(cx, eyeY + 4, eyeSize * 0.7, Math.PI, Math.PI * 2);
        ctx.stroke();
      });
      break;
    case '@@':
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 2;
      [-1, 1].forEach(side => {
        const cx = side * eyeSpacing;
        ctx.beginPath();
        for (let a = 0; a < Math.PI * 4; a += 0.1) {
          const r = a * 1.5;
          ctx.lineTo(cx + Math.cos(a) * r, eyeY + Math.sin(a) * r);
        }
        ctx.stroke();
      });
      break;
    case '★★':
      ctx.fillStyle = '#FFD700';
      [-1, 1].forEach(side => {
        drawStar(ctx, side * eyeSpacing, eyeY, eyeSize);
      });
      break;
  }
}

function drawMouth(type, s, isHit) {
  const mouthY = s * 0.35;

  if (isHit) {
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, mouthY, s * 0.2, 0, Math.PI);
    ctx.stroke();
    return;
  }

  switch (type) {
    case 'smile':
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, mouthY - 5, s * 0.25, 0.2, Math.PI - 0.2);
      ctx.stroke();
      break;
    case 'open':
      ctx.fillStyle = '#222';
      ctx.beginPath();
      ctx.ellipse(0, mouthY, s * 0.15, s * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'tongue':
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, mouthY - 5, s * 0.25, 0.2, Math.PI - 0.2);
      ctx.stroke();
      ctx.fillStyle = '#FF6B8A';
      ctx.beginPath();
      ctx.ellipse(0, mouthY + 8, s * 0.12, s * 0.08, 0, 0, Math.PI);
      ctx.fill();
      break;
    case 'grin':
      ctx.fillStyle = '#222';
      ctx.beginPath();
      ctx.arc(0, mouthY - 5, s * 0.25, 0.1, Math.PI - 0.1);
      ctx.closePath();
      ctx.fill();
      break;
    case 'wave':
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-s * 0.2, mouthY);
      ctx.quadraticCurveTo(-s * 0.1, mouthY - 8, 0, mouthY);
      ctx.quadraticCurveTo(s * 0.1, mouthY + 8, s * 0.2, mouthY);
      ctx.stroke();
      break;
  }
}

// パドル描画
function drawPaddle() {
  ctx.save();
  const px = paddle.x - paddle.width / 2;
  const py = paddle.y;
  const r = paddle.height / 2;

  // グロー
  ctx.shadowColor = hsl(paddle.hue, 80, 60);
  ctx.shadowBlur = 15;

  // グラデーション
  const grad = ctx.createLinearGradient(px, py, px, py + paddle.height);
  grad.addColorStop(0, hsl(paddle.hue, 75, 70));
  grad.addColorStop(0.5, hsl(paddle.hue, 80, 60));
  grad.addColorStop(1, hsl(paddle.hue, 75, 50));
  ctx.fillStyle = grad;

  ctx.beginPath();
  ctx.roundRect(px, py, paddle.width, paddle.height, r);
  ctx.fill();

  // ハイライト
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.beginPath();
  ctx.roundRect(px + 10, py + 2, paddle.width - 20, paddle.height * 0.4, r / 2);
  ctx.fill();

  ctx.restore();
}

// ボールの描画
function drawBall(b) {
  // トレイル
  ctx.globalAlpha = 0.3;
  for (let i = 0; i < b.trail.length; i++) {
    const t = b.trail[i];
    const alpha = i / b.trail.length * 0.3;
    ctx.fillStyle = hsla(b.hue, 80, 60, alpha);
    ctx.beginPath();
    ctx.arc(t.x, t.y, b.radius * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // ボール本体
  const grad = ctx.createRadialGradient(
    b.x - b.radius * 0.3, b.y - b.radius * 0.3, b.radius * 0.1,
    b.x, b.y, b.radius
  );
  grad.addColorStop(0, hsl(b.hue, 90, 80));
  grad.addColorStop(1, hsl(b.hue, 90, 55));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
  ctx.fill();

  // グロー
  ctx.save();
  ctx.shadowColor = hsl(b.hue, 80, 60);
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.radius * 0.5, 0, Math.PI * 2);
  ctx.fillStyle = hsl(b.hue, 90, 70);
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

  // エイリアンに直接タッチした場合 → 即ヒット
  let directHit = false;
  for (const a of aliens) {
    if (a.hit) continue;
    if (dist(pos.x, pos.y, a.x, a.y) < a.size * 1.1) {
      hitAlien(a);
      directHit = true;
      break;
    }
  }

  // ボール発射（未発射状態なら）
  if (!directHit && ball && !ball.launched) {
    ball.launched = true;
    ball.vx = rand(-120, 120);
    ball.vy = -ball.speed;
    // 速度を正規化
    normalizeBallSpeed();
    soundManager.play('bounce', 0.5);
  }

  // パドル位置も更新
  paddle.targetX = Math.max(paddle.width / 2, Math.min(w - paddle.width / 2, pos.x));
});

canvas.addEventListener('pointermove', (e) => {
  e.preventDefault();
  const pos = getPointerPos(canvas, e);
  paddle.targetX = Math.max(paddle.width / 2, Math.min(w - paddle.width / 2, pos.x));
});

function normalizeBallSpeed() {
  if (!ball) return;
  const currentSpeed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
  if (currentSpeed > 0) {
    ball.vx = (ball.vx / currentSpeed) * ball.speed;
    ball.vy = (ball.vy / currentSpeed) * ball.speed;
  }
}

function hitAlien(a) {
  a.hit = true;
  a.hitTimer = 1.2;

  particles.emit(a.x, a.y, 25, {
    speedMin: 60, speedMax: 200,
    sizeMin: 4, sizeMax: 12,
    lifeMin: 0.5, lifeMax: 1.5,
    gravity: 40,
    hue: a.hue,
    shape: 'star'
  });
  particles.emit(a.x, a.y, 10, {
    speedMin: 30, speedMax: 100,
    sizeMin: 3, sizeMax: 7,
    lifeMin: 0.4, lifeMax: 1.0,
    gravity: 20,
    hue: (a.hue + 180) % 360,
    shape: 'heart'
  });

  soundManager.play('happy', 0.7);
}

function animate(time) {
  const dt = Math.min((time - lastTime) / 1000, 0.05);
  lastTime = time;

  // 宇宙背景
  ctx.fillStyle = '#0a0a1a';
  ctx.fillRect(0, 0, w, h);

  // 背景の星
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  for (let i = 0; i < 40; i++) {
    const sx = ((i * 137.5) % w);
    const sy = ((i * 73.3) % h);
    const ss = 1 + (i % 3);
    const twinkle = 0.3 + 0.3 * Math.sin(time / 500 + i);
    ctx.globalAlpha = twinkle;
    ctx.beginPath();
    ctx.arc(sx, sy, ss, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // エイリアンの更新
  for (let i = aliens.length - 1; i >= 0; i--) {
    const a = aliens[i];

    if (!a.arrived) {
      a.y += a.speed * dt;
      if (a.y >= a.targetY) {
        a.y = a.targetY;
        a.arrived = true;
      }
    } else if (a.hit) {
      a.hitTimer -= dt;
      a.rotation += 10 * dt;
      a.scale = Math.max(0, a.hitTimer / 1.2);
      a.y -= 80 * dt;

      if (a.hitTimer <= 0) {
        aliens.splice(i, 1);
        continue;
      }
    } else {
      a.wobble += a.wobbleSpeed * dt;
      a.x += Math.sin(a.wobble) * a.wobbleAmp * dt;
      a.hoverPhase += 1.5 * dt;
      a.y = a.targetY + Math.sin(a.hoverPhase) * 8;
    }

    drawAlien(a);
  }

  // エイリアン補充
  while (aliens.length < MAX_ALIENS) {
    aliens.push(createAlien());
  }

  // パドル更新（lerp追従）
  paddle.x += (paddle.targetX - paddle.x) * 0.25;

  // ボール更新
  if (ball && ball.active) {
    if (!ball.launched) {
      // パドル上で待機
      ball.x = paddle.x;
      ball.y = paddle.y - paddle.height / 2 - ball.radius - 2;
    } else {
      // 移動
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;

      // トレイル記録
      ball.trail.push({ x: ball.x, y: ball.y });
      if (ball.trail.length > 10) ball.trail.shift();

      // 左右壁反射
      if (ball.x < ball.radius) {
        ball.x = ball.radius;
        ball.vx = Math.abs(ball.vx);
        soundManager.play('bounce', 0.3);
      } else if (ball.x > w - ball.radius) {
        ball.x = w - ball.radius;
        ball.vx = -Math.abs(ball.vx);
        soundManager.play('bounce', 0.3);
      }

      // 天井反射
      if (ball.y < ball.radius) {
        ball.y = ball.radius;
        ball.vy = Math.abs(ball.vy);
        soundManager.play('bounce', 0.3);
      }

      // パドル反射
      if (ball.vy > 0 &&
          ball.y + ball.radius >= paddle.y &&
          ball.y - ball.radius <= paddle.y + paddle.height &&
          ball.x >= paddle.x - paddle.width / 2 - ball.radius * 0.5 &&
          ball.x <= paddle.x + paddle.width / 2 + ball.radius * 0.5) {
        ball.y = paddle.y - ball.radius;
        // 当たり位置で反射角を変える
        const hitPos = (ball.x - paddle.x) / (paddle.width / 2);
        const maxAngle = Math.PI / 3; // 60度
        const angle = hitPos * maxAngle;
        ball.vx = Math.sin(angle) * ball.speed;
        ball.vy = -Math.cos(angle) * ball.speed;
        // 色を変える
        ball.hue = (ball.hue + 60) % 360;
        soundManager.play('bounce', 0.5);
        // パーティクル
        particles.emit(ball.x, ball.y, 5, {
          speedMin: 20, speedMax: 60,
          sizeMin: 2, sizeMax: 5,
          lifeMin: 0.2, lifeMax: 0.5,
          gravity: 30,
          hue: ball.hue,
          shape: 'circle',
        });
      }

      // エイリアンとの当たり判定
      for (const a of aliens) {
        if (a.hit) continue;
        if (dist(ball.x, ball.y, a.x, a.y) < a.size * 0.9 + ball.radius) {
          hitAlien(a);
          // ボールは消えずに反射
          ball.vy = -ball.vy;
          // 少しずらす（めり込み防止）
          ball.y += ball.vy > 0 ? 5 : -5;
          normalizeBallSpeed();
          break;
        }
      }

      // 底面落下
      if (ball.y > h + ball.radius * 2) {
        ball.active = false;
        ballRespawnTimer = 1.0;
      }
    }

    if (ball.active) {
      drawBall(ball);
    }
  }

  // ボール再生成タイマー
  if (ball && !ball.active) {
    ballRespawnTimer -= dt;
    if (ballRespawnTimer <= 0) {
      spawnBall();
    }
  }
  if (!ball) {
    spawnBall();
  }

  // パドル描画
  drawPaddle();

  particles.update(dt);
  particles.draw(ctx);

  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);

function toggleSound() {
  const enabled = soundManager.toggle();
  document.getElementById('soundBtn').textContent = enabled ? '🔊' : '🔇';
}
