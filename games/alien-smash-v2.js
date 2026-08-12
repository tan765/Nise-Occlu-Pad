/* === エイリアンたおし ver2（ブロック崩し風） === */
/* パドルでボールを打ち返してエイリアンを倒す。訓練: 追従 + 固視 + 手と眼の協応 */
/* ver2: レベル制フォーメーション・パワーアップカプセル3種・
 *       ボール上限バグ修正・エイリアンの目がボールを追う・線の太さのスケール統一 */
(() => {
  'use strict';

  const MAX_BALLS = 3;
  const BASE_BALL_SPEED = 320;

  const aliens = [];
  const balls = [];
  const items = [];
  let level = 1;
  let levelClearTimer = 0;
  let widePaddleTimer = 0;
  let slowBallTimer = 0;

  const paddle = { x: 0, y: 0, baseWidth: 130, width: 130, height: 18, hue: 200, targetX: 0 };

  const FACES = [
    { eyes: 'round', mouth: 'smile' },
    { eyes: 'big', mouth: 'open' },
    { eyes: 'cross', mouth: 'tongue' },
    { eyes: 'happy', mouth: 'grin' },
    { eyes: 'round', mouth: 'wave' },
    { eyes: 'star', mouth: 'smile' },
  ];
  const ALIEN_COLORS = [120, 180, 270, 300, 60, 30];

  const ITEM_KINDS = [
    { kind: 'multi', label: '×3', hue: 50 },
    { kind: 'wide', label: 'ワイド', hue: 200 },
    { kind: 'slow', label: 'ゆっくり', hue: 130 },
  ];

  /* --- フォーメーション（レベルごとに切り替え） --- */
  function formationSlots(g, lvl) {
    const S = g.S;
    const slots = [];
    const pattern = (lvl - 1) % 3;
    const topY = 120 * S;
    const size = Math.max(42 * S, (58 - Math.floor((lvl - 1) / 3) * 4) * S);
    const gapX = size * 2.4;
    const gapY = size * 2.5;

    if (pattern === 0) {
      // 横2列
      for (let row = 0; row < 2; row++) {
        const count = 4;
        for (let i = 0; i < count; i++) {
          slots.push({
            x: g.w / 2 + (i - (count - 1) / 2) * gapX,
            y: topY + row * gapY,
            size,
          });
        }
      }
    } else if (pattern === 1) {
      // ピラミッド
      const rows = [2, 3, 4];
      for (let r = 0; r < rows.length; r++) {
        for (let i = 0; i < rows[r]; i++) {
          slots.push({
            x: g.w / 2 + (i - (rows[r] - 1) / 2) * gapX,
            y: topY + r * gapY * 0.9,
            size,
          });
        }
      }
    } else {
      // 市松もよう
      for (let row = 0; row < 3; row++) {
        for (let i = 0; i < 4; i++) {
          if ((row + i) % 2 === 1) continue;
          slots.push({
            x: g.w / 2 + (i - 1.5) * gapX,
            y: topY + row * gapY * 0.85,
            size,
          });
        }
      }
    }
    return slots;
  }

  function spawnFormation(g) {
    aliens.length = 0;
    const slots = formationSlots(g, level);
    for (const slot of slots) {
      aliens.push({
        x: slot.x,
        y: -slot.size * (1 + Math.random() * 2),
        targetY: slot.y,
        anchorX: slot.x,
        size: slot.size,
        hue: ALIEN_COLORS[randInt(0, ALIEN_COLORS.length - 1)],
        face: FACES[randInt(0, FACES.length - 1)],
        speed: rand(180, 260) * g.S,
        hoverPhase: Math.random() * Math.PI * 2,
        swayPhase: Math.random() * Math.PI * 2,
        arrived: false,
        hit: false,
        hitTimer: 0,
        rotation: 0,
        scale: 1,
      });
    }
  }

  function ballSpeed(g) {
    const levelBoost = 1 + Math.min(0.5, (level - 1) * 0.07);
    const slow = slowBallTimer > 0 ? 0.65 : 1;
    return BASE_BALL_SPEED * g.S * levelBoost * slow;
  }

  function createBall(g, x, y) {
    return { x, y, vx: 0, vy: 0, radius: 13 * g.S, hue: rand(0, 360), trail: [], launched: false };
  }

  function spawnBall(g) {
    balls.push(createBall(g, paddle.x, paddle.y - paddle.height / 2 - 15 * g.S));
  }

  function normalizeBall(g, b) {
    const sp = ballSpeed(g);
    const cs = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
    if (cs > 0) { b.vx = (b.vx / cs) * sp; b.vy = (b.vy / cs) * sp; }
  }

  /* --- 描画 --- */
  function nearestBall(x, y) {
    let best = null, bestD = Infinity;
    for (const b of balls) {
      if (!b.launched) continue;
      const d = dist(x, y, b.x, b.y);
      if (d < bestD) { bestD = d; best = b; }
    }
    return best;
  }

  function drawAlien(g, ctx, a) {
    const S = g.S;
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

    // 触角
    ctx.strokeStyle = hsl(a.hue, 60, 55);
    ctx.lineWidth = 3 * S;
    ctx.lineCap = 'round';
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(side * s * 0.2, -s * 0.8);
      ctx.quadraticCurveTo(side * s * 0.4, -s * 1.3, side * s * 0.5, -s * 1.15);
      ctx.stroke();
      ctx.fillStyle = hsl((a.hue + 60) % 360, 80, 65);
      ctx.beginPath();
      ctx.arc(side * s * 0.5, -s * 1.15, 5 * S, 0, Math.PI * 2);
      ctx.fill();
    }

    // 目（ボールを目で追う＝追従の誘目）
    const nb = nearestBall(a.x, a.y);
    let lookX = 0, lookY = 0;
    if (nb) {
      const d = dist(a.x, a.y, nb.x, nb.y);
      if (d > 1) {
        lookX = (nb.x - a.x) / d;
        lookY = (nb.y - a.y) / d;
      }
    }
    drawEyes(ctx, S, a.face.eyes, s, lookX, lookY);
    drawMouth(ctx, S, a.face.mouth, s, a.hit);
    ctx.restore();
  }

  function drawEyes(ctx, S, type, s, lookX, lookY) {
    const eyeY = -s * 0.15, eyeSpacing = s * 0.3, eyeSize = s * 0.2;
    const px = lookX * eyeSize * 0.4;
    const py = lookY * eyeSize * 0.4;
    switch (type) {
      case 'round':
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(-eyeSpacing, eyeY, eyeSize, 0, Math.PI * 2);
        ctx.arc(eyeSpacing, eyeY, eyeSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#222';
        ctx.beginPath();
        ctx.arc(-eyeSpacing + px, eyeY + py, eyeSize * 0.5, 0, Math.PI * 2);
        ctx.arc(eyeSpacing + px, eyeY + py, eyeSize * 0.5, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'big':
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(-eyeSpacing, eyeY, eyeSize * 1.2, 0, Math.PI * 2);
        ctx.arc(eyeSpacing, eyeY, eyeSize * 1.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#222';
        ctx.beginPath();
        ctx.arc(-eyeSpacing + px * 1.4, eyeY + py * 1.4, eyeSize * 0.4, 0, Math.PI * 2);
        ctx.arc(eyeSpacing + px * 1.4, eyeY + py * 1.4, eyeSize * 0.4, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'cross':
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 3 * S;
        for (const side of [-1, 1]) {
          const cx = side * eyeSpacing;
          const d = 6 * S;
          ctx.beginPath();
          ctx.moveTo(cx - d, eyeY - d); ctx.lineTo(cx + d, eyeY + d);
          ctx.moveTo(cx + d, eyeY - d); ctx.lineTo(cx - d, eyeY + d);
          ctx.stroke();
        }
        break;
      case 'happy':
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 3 * S;
        for (const side of [-1, 1]) {
          ctx.beginPath();
          ctx.arc(side * eyeSpacing, eyeY + 4 * S, eyeSize * 0.7, Math.PI, Math.PI * 2);
          ctx.stroke();
        }
        break;
      case 'star':
        ctx.fillStyle = '#FFD700';
        for (const side of [-1, 1]) drawStar(ctx, side * eyeSpacing, eyeY, eyeSize);
        break;
    }
  }

  function drawMouth(ctx, S, type, s, isHit) {
    const mouthY = s * 0.35;
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 3 * S;
    if (isHit) {
      ctx.beginPath();
      ctx.arc(0, mouthY, s * 0.2, 0, Math.PI);
      ctx.stroke();
      return;
    }
    switch (type) {
      case 'smile':
        ctx.beginPath();
        ctx.arc(0, mouthY - 5 * S, s * 0.25, 0.2, Math.PI - 0.2);
        ctx.stroke();
        break;
      case 'open':
        ctx.fillStyle = '#222';
        ctx.beginPath();
        ctx.ellipse(0, mouthY, s * 0.15, s * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'tongue':
        ctx.beginPath();
        ctx.arc(0, mouthY - 5 * S, s * 0.25, 0.2, Math.PI - 0.2);
        ctx.stroke();
        ctx.fillStyle = '#FF6B8A';
        ctx.beginPath();
        ctx.ellipse(0, mouthY + 8 * S, s * 0.12, s * 0.08, 0, 0, Math.PI);
        ctx.fill();
        break;
      case 'grin':
        ctx.fillStyle = '#222';
        ctx.beginPath();
        ctx.arc(0, mouthY - 5 * S, s * 0.25, 0.1, Math.PI - 0.1);
        ctx.closePath();
        ctx.fill();
        break;
      case 'wave':
        ctx.beginPath();
        ctx.moveTo(-s * 0.2, mouthY);
        ctx.quadraticCurveTo(-s * 0.1, mouthY - 8 * S, 0, mouthY);
        ctx.quadraticCurveTo(s * 0.1, mouthY + 8 * S, s * 0.2, mouthY);
        ctx.stroke();
        break;
    }
  }

  function drawPaddle(g, ctx) {
    const S = g.S;
    ctx.save();
    const px = paddle.x - paddle.width / 2, py = paddle.y, r = paddle.height / 2;
    ctx.shadowColor = hsl(paddle.hue, 80, 60);
    ctx.shadowBlur = 15 * S;
    const grad = ctx.createLinearGradient(px, py, px, py + paddle.height);
    grad.addColorStop(0, hsl(paddle.hue, 75, 70));
    grad.addColorStop(0.5, hsl(paddle.hue, 80, 60));
    grad.addColorStop(1, hsl(paddle.hue, 75, 50));
    ctx.fillStyle = grad;
    GameV2.roundRectPath(ctx, px, py, paddle.width, paddle.height, r);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    GameV2.roundRectPath(ctx, px + 10 * S, py + 2 * S, paddle.width - 20 * S, paddle.height * 0.4, r / 2);
    ctx.fill();
    ctx.restore();
  }

  function drawBall(g, ctx, b) {
    const S = g.S;
    for (let i = 0; i < b.trail.length; i++) {
      const t = b.trail[i];
      ctx.fillStyle = hsla(b.hue, 80, 60, (i / b.trail.length) * 0.3);
      ctx.beginPath();
      ctx.arc(t.x, t.y, b.radius * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
    const grad = ctx.createRadialGradient(b.x - b.radius * 0.3, b.y - b.radius * 0.3, b.radius * 0.1, b.x, b.y, b.radius);
    grad.addColorStop(0, hsl(b.hue, 90, 80));
    grad.addColorStop(1, hsl(b.hue, 90, 55));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.shadowColor = hsl(b.hue, 80, 60);
    ctx.shadowBlur = 10 * S;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = hsl(b.hue, 90, 70);
    ctx.fill();
    ctx.restore();
  }

  function drawItem(g, ctx, item) {
    const S = g.S;
    ctx.save();
    ctx.translate(item.x, item.y);
    ctx.rotate(item.rotation);
    ctx.fillStyle = hsl(item.def.hue, 90, 60);
    ctx.shadowColor = hsl(item.def.hue, 90, 60);
    ctx.shadowBlur = 10 * S;
    GameV2.roundRectPath(ctx, -item.size, -item.size * 0.62, item.size * 2, item.size * 1.24, item.size * 0.5);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.font = scaledFont(item.def.kind === 'multi' ? 16 : 12, S);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(item.def.label, 0, 0);
    ctx.restore();
  }

  function hitAlien(g, a) {
    a.hit = true;
    a.hitTimer = 1.2;
    g.hit(1, a.x, a.y);
    g.particles.emit(a.x, a.y, 25, {
      speedMin: 60 * g.S, speedMax: 200 * g.S,
      sizeMin: 4 * g.S, sizeMax: 12 * g.S,
      lifeMin: 0.5, lifeMax: 1.5,
      gravity: 40 * g.S, hue: a.hue, shape: 'star',
    });
    g.sound.play('happy', 0.7);
    // 20% でパワーアップカプセルを落とす
    if (Math.random() < 0.2) {
      const def = ITEM_KINDS[randInt(0, ITEM_KINDS.length - 1)];
      items.push({ x: a.x, y: a.y, vy: 130 * g.S, size: 24 * g.S, rotation: 0, def });
    }
  }

  function applyItem(g, item) {
    g.sound.play('catch', 0.8);
    g.particles.emit(paddle.x, paddle.y, 15, {
      speedMin: 40 * g.S, speedMax: 140 * g.S,
      sizeMin: 3 * g.S, sizeMax: 8 * g.S,
      lifeMin: 0.3, lifeMax: 0.8,
      gravity: 30 * g.S, hue: item.def.hue, shape: 'star',
    });
    switch (item.def.kind) {
      case 'multi': {
        // ver2修正: 上限3を超えないように追加数を制限する
        const src = balls.find((b) => b.launched) || balls[0];
        const room = MAX_BALLS - balls.length;
        if (!src || room <= 0) break;
        for (let k = 0; k < Math.min(2, room); k++) {
          const nb = createBall(g, src.x, src.y);
          nb.launched = true;
          const spreadAngle = k === 0 ? -0.6 : 0.6;
          nb.vx = src.vx * Math.cos(spreadAngle) - src.vy * Math.sin(spreadAngle);
          nb.vy = src.vx * Math.sin(spreadAngle) + src.vy * Math.cos(spreadAngle);
          normalizeBall(g, nb);
          balls.push(nb);
        }
        g.addFloatText('ボール ×3！', paddle.x, paddle.y - 40 * g.S, { color: '#FFD700', size: 22 });
        break;
      }
      case 'wide':
        widePaddleTimer = 8;
        g.addFloatText('パドルが おおきく！', paddle.x, paddle.y - 40 * g.S, { color: '#8ecfff', size: 22 });
        break;
      case 'slow':
        slowBallTimer = 6;
        g.addFloatText('ボールが ゆっくり！', paddle.x, paddle.y - 40 * g.S, { color: '#9dff9d', size: 22 });
        break;
    }
  }

  function movePaddle(g, pos) {
    paddle.targetX = Math.max(paddle.width / 2, Math.min(g.w - paddle.width / 2, pos.x));
  }

  GameV2.run({
    duration: 60,
    bgm: 'action',
    unit: 'たい',
    unitSuffix: ' たおしたよ！',
    thresholds: [8, 16, 26],
    readyHint: 'パドルでボールをはねかえして エイリアンをたおそう！',
    maxParticles: 500,

    onInit(g) {
      paddle.baseWidth = 130 * g.S;
      paddle.height = 18 * g.S;
      paddle.y = g.h - 60 * g.S;
      paddle.x = g.w / 2;
      paddle.targetX = g.w / 2;
      spawnFormation(g);
      spawnBall(g);
    },

    onResize(g) {
      paddle.baseWidth = 130 * g.S;
      paddle.height = 18 * g.S;
      paddle.y = g.h - 60 * g.S;
    },

    onReset(g) {
      level = 1;
      levelClearTimer = 0;
      widePaddleTimer = 0;
      slowBallTimer = 0;
      balls.length = 0;
      items.length = 0;
      paddle.x = g.w / 2;
      paddle.targetX = g.w / 2;
      spawnFormation(g);
      spawnBall(g);
    },

    onPointerDown(g, pos) {
      for (const b of balls) {
        if (!b.launched) {
          b.launched = true;
          b.vx = rand(-120 * g.S, 120 * g.S);
          b.vy = -ballSpeed(g);
          normalizeBall(g, b);
          g.sound.play('bounce', 0.5);
          break;
        }
      }
      movePaddle(g, pos);
    },

    onPointerMove(g, pos) { movePaddle(g, pos); },

    onUpdate(g, dt) {
      const S = g.S;
      if (widePaddleTimer > 0) widePaddleTimer -= dt;
      if (slowBallTimer > 0) slowBallTimer -= dt;
      paddle.width = paddle.baseWidth * (widePaddleTimer > 0 ? 1.55 : 1);
      paddle.x += (paddle.targetX - paddle.x) * 0.25;

      // レベルクリア演出中
      if (levelClearTimer > 0) {
        levelClearTimer -= dt;
        if (levelClearTimer <= 0) {
          level++;
          spawnFormation(g);
          g.addFloatText(`レベル ${level}！`, g.w / 2, g.h * 0.4, { color: '#FFD700', size: 32, life: 1.4 });
        }
      }

      // エイリアン更新
      for (let i = aliens.length - 1; i >= 0; i--) {
        const a = aliens[i];
        if (!a.arrived) {
          a.y += a.speed * dt;
          if (a.y >= a.targetY) { a.y = a.targetY; a.arrived = true; }
        } else if (a.hit) {
          a.hitTimer -= dt;
          a.rotation += 10 * dt;
          a.scale = Math.max(0, a.hitTimer / 1.2);
          a.y -= 80 * S * dt;
          if (a.hitTimer <= 0) { aliens.splice(i, 1); continue; }
        } else {
          a.hoverPhase += 1.5 * dt;
          a.swayPhase += 0.8 * dt;
          a.y = a.targetY + Math.sin(a.hoverPhase) * 8 * S;
          a.x = a.anchorX + Math.sin(a.swayPhase) * 10 * S;
        }
      }

      // 全滅チェック → 次のレベルへ
      if (aliens.length === 0 && levelClearTimer <= 0) {
        levelClearTimer = 1.2;
        g.sound.play('fanfare', 0.6);
        g.addFloatText('レベルクリア！', g.w / 2, g.h * 0.4, { color: '#FFD700', size: 30, life: 1.2 });
      }

      // ボール更新
      for (let bi = balls.length - 1; bi >= 0; bi--) {
        const b = balls[bi];
        if (!b.launched) {
          b.x = paddle.x;
          b.y = paddle.y - paddle.height / 2 - b.radius - 2 * S;
          continue;
        }
        normalizeBall(g, b);
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.trail.push({ x: b.x, y: b.y });
        if (b.trail.length > 10) b.trail.shift();

        if (b.x < b.radius) { b.x = b.radius; b.vx = Math.abs(b.vx); g.sound.play('bounce', 0.3); }
        else if (b.x > g.w - b.radius) { b.x = g.w - b.radius; b.vx = -Math.abs(b.vx); g.sound.play('bounce', 0.3); }
        if (b.y < b.radius) { b.y = b.radius; b.vy = Math.abs(b.vy); g.sound.play('bounce', 0.3); }

        // パドル反射
        if (b.vy > 0 && b.y + b.radius >= paddle.y && b.y - b.radius <= paddle.y + paddle.height &&
            b.x >= paddle.x - paddle.width / 2 - b.radius * 0.5 && b.x <= paddle.x + paddle.width / 2 + b.radius * 0.5) {
          b.y = paddle.y - b.radius;
          const hitPos = (b.x - paddle.x) / (paddle.width / 2);
          const angle = hitPos * (Math.PI / 3);
          const sp = ballSpeed(g);
          b.vx = Math.sin(angle) * sp;
          b.vy = -Math.cos(angle) * sp;
          b.hue = (b.hue + 60) % 360;
          g.sound.play('bounce', 0.5);
          g.particles.emit(b.x, b.y, 5, {
            speedMin: 20 * S, speedMax: 60 * S,
            sizeMin: 2 * S, sizeMax: 5 * S,
            lifeMin: 0.2, lifeMax: 0.5,
            gravity: 30 * S, hue: b.hue, shape: 'circle',
          });
        }

        // エイリアンとの衝突
        for (const a of aliens) {
          if (a.hit || !a.arrived) continue;
          if (dist(b.x, b.y, a.x, a.y) < a.size * 0.9 + b.radius) {
            hitAlien(g, a);
            b.vy = -b.vy;
            b.y += b.vy > 0 ? 5 * S : -5 * S;
            normalizeBall(g, b);
            break;
          }
        }

        if (b.y > g.h + b.radius * 2) balls.splice(bi, 1);
      }
      if (balls.length === 0) spawnBall(g);

      // アイテム更新
      for (let ii = items.length - 1; ii >= 0; ii--) {
        const item = items[ii];
        item.y += item.vy * dt;
        item.rotation += 2 * dt;
        if (item.y + item.size >= paddle.y &&
            item.x >= paddle.x - paddle.width / 2 && item.x <= paddle.x + paddle.width / 2) {
          applyItem(g, item);
          items.splice(ii, 1);
          continue;
        }
        if (item.y > g.h + item.size) items.splice(ii, 1);
      }
    },

    onDraw(g, ctx, time) {
      const { w, h } = g;
      ctx.fillStyle = '#0a0a1a';
      ctx.fillRect(0, 0, w, h);

      // 星空
      for (let i = 0; i < 40; i++) {
        const sx = (i * 137.5) % w, sy = (i * 73.3) % h, ss = 1 + (i % 3);
        ctx.globalAlpha = 0.3 + 0.3 * Math.sin(time / 500 + i);
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.beginPath();
        ctx.arc(sx, sy, ss, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      for (const a of aliens) drawAlien(g, ctx, a);
      for (const item of items) drawItem(g, ctx, item);
      for (const b of balls) drawBall(g, ctx, b);
      drawPaddle(g, ctx);

      // レベル表示（左上）
      if (g.state === 'playing') {
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        GameV2.roundRectPath(ctx, 12 * g.S, g.h - 48 * g.S, 110 * g.S, 34 * g.S, 17 * g.S);
        ctx.fill();
        ctx.fillStyle = '#8ecfff';
        ctx.font = scaledFont(17, g.S);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`レベル ${level}`, 67 * g.S, g.h - 31 * g.S);
        ctx.restore();
      }
    },
  });
})();
