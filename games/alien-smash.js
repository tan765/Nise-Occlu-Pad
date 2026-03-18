/* === エイリアンたおし === */
/* 色んな顔のエイリアンをタップしてボールで倒す */
/* 訓練: 追従 + 固視 + 手と眼の協応 */

const canvas = document.getElementById('canvas');
let ctx = setupCanvas(canvas);
const particles = new ParticleSystem(500);
let w, h;
let lastTime = 0;
const aliens = [];
const balls = [];
const MAX_ALIENS = 5;

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
}
resize();
onResize(canvas, () => resize());

function createAlien() {
  const face = FACES[randInt(0, FACES.length - 1)];
  const colorHue = ALIEN_COLORS[randInt(0, ALIEN_COLORS.length - 1)];
  const size = rand(50, 70);

  return {
    x: rand(size + 20, w - size - 20),
    y: -size, // 上から降ってくる
    targetY: rand(size + 70, h * 0.65),
    size: size,
    hue: colorHue,
    face: face,
    speed: rand(40, 80),
    wobble: Math.random() * Math.PI * 2,
    wobbleSpeed: rand(1, 3),
    wobbleAmp: rand(10, 25),
    arrived: false,
    // ヒット演出
    hit: false,
    hitTimer: 0,
    rotation: 0,
    scale: 1,
    // ホバーアニメーション
    hoverPhase: Math.random() * Math.PI * 2,
  };
}

function createBall(fromX, fromY, toX, toY) {
  const angle = Math.atan2(toY - fromY, toX - fromX);
  const speed = 500;
  return {
    x: fromX,
    y: fromY,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    radius: 10,
    hue: rand(0, 360),
    life: 1.5,
    trail: [],
  };
}

// 初期エイリアン
for (let i = 0; i < MAX_ALIENS; i++) {
  const a = createAlien();
  a.y = a.targetY;
  a.arrived = true;
  aliens.push(a);
}

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
  // 左触角
  ctx.beginPath();
  ctx.moveTo(-s * 0.2, -s * 0.8);
  ctx.quadraticCurveTo(-s * 0.4, -s * 1.3, -s * 0.5, -s * 1.15);
  ctx.stroke();
  ctx.fillStyle = hsl((a.hue + 60) % 360, 80, 65);
  ctx.beginPath();
  ctx.arc(-s * 0.5, -s * 1.15, 5, 0, Math.PI * 2);
  ctx.fill();
  // 右触角
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
      // 普通の丸目
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
      // びっくり大きな目
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
      // ><目
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
      // ^^目（にっこり閉じ目）
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
      // 渦巻き目
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
      // 星目
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
    // ヒット時は「ぐるぐる」顔
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
      // 舌
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
      hitAlien(a, pos.x, pos.y);
      directHit = true;
      break;
    }
  }

  // 直接当たらなかった場合 → ボールを飛ばす（一番近いエイリアンへ）
  if (!directHit) {
    let closest = null;
    let closestDist = Infinity;
    for (const a of aliens) {
      if (a.hit) continue;
      const d = dist(pos.x, pos.y, a.x, a.y);
      if (d < closestDist) {
        closestDist = d;
        closest = a;
      }
    }
    if (closest) {
      balls.push(createBall(pos.x, h - 30, closest.x, closest.y));
      soundManager.play('bounce', 0.5);
    }
  }
});

function hitAlien(a) {
  a.hit = true;
  a.hitTimer = 1.2;

  // キラキラ演出
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
    // 疑似ランダム（シードベース）で固定位置
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
      // 降下中
      a.y += a.speed * dt;
      if (a.y >= a.targetY) {
        a.y = a.targetY;
        a.arrived = true;
      }
    } else if (a.hit) {
      // ヒット演出
      a.hitTimer -= dt;
      a.rotation += 10 * dt;
      a.scale = Math.max(0, a.hitTimer / 1.2);
      a.y -= 80 * dt; // 上に飛んでいく

      if (a.hitTimer <= 0) {
        aliens.splice(i, 1);
        continue;
      }
    } else {
      // ゆらゆら浮遊
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

  // ボールの更新
  for (let i = balls.length - 1; i >= 0; i--) {
    const b = balls[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;

    // トレイル記録
    b.trail.push({ x: b.x, y: b.y });
    if (b.trail.length > 8) b.trail.shift();

    // エイリアンとの当たり判定
    for (const a of aliens) {
      if (a.hit) continue;
      if (dist(b.x, b.y, a.x, a.y) < a.size * 0.9 + b.radius) {
        hitAlien(a);
        b.life = 0;
        break;
      }
    }

    if (b.life <= 0 || b.x < -50 || b.x > w + 50 || b.y < -50 || b.y > h + 50) {
      balls.splice(i, 1);
      continue;
    }

    drawBall(b);
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
