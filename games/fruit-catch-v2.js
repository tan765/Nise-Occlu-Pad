/* === フルーツキャッチ ver2 === */
/* 落ちてくるフルーツをカゴでキャッチ。訓練: 追従 + 手と眼の協応 + 弁別 */
/* ver2: フルーツが画面はしまで落ちるように修正・レア★フルーツ・
 *       イガグリ（とったらダメ）・コンボ・時間経過で難化 */
(() => {
  'use strict';

  const basket = {
    x: 0, y: 0, targetX: 0,
    width: 120, height: 62,
    bounceTimer: 0,
    stunTimer: 0,
  };

  const fruits = [];
  let maxFruits = 2;
  let fruitSpeed = 130;
  let difficultyTimer = 0;
  let starCooldown = 10;
  let burrCooldown = 6;

  const FRUIT_TYPES = [
    { name: 'りんご', hue: 0, points: 1, draw: drawApple },
    { name: 'バナナ', hue: 55, points: 1, draw: drawBanana },
    { name: 'ぶどう', hue: 280, points: 1, draw: drawGrape },
    { name: 'みかん', hue: 30, points: 1, draw: drawOrange },
    { name: 'いちご', hue: 350, points: 1, draw: drawStrawberry },
  ];
  const STAR_TYPE = { name: 'スター', hue: 50, points: 5, draw: drawStarFruit, star: true };
  const BURR_TYPE = { name: 'イガグリ', hue: 25, points: 0, draw: drawBurr, burr: true };

  function createFruit(g, type) {
    const S = g.S;
    const size = type.burr ? rand(70 * S, 90 * S) : rand(80 * S, 110 * S);
    // ver2修正: マージンをフルーツ半径基準にして画面全幅に落とす
    const margin = size * 0.55 + 8 * S;
    return {
      x: rand(margin, g.w - margin),
      y: -size,
      size,
      type,
      speed: fruitSpeed * S * (type.star ? 1.35 : 1) + rand(-20 * S, 20 * S),
      wobblePhase: Math.random() * Math.PI * 2,
      wobbleAmp: rand(15 * S, 30 * S),
      rotation: 0,
      rotSpeed: type.burr ? rand(-4, 4) : rand(-2, 2),
      bouncing: false,
      bounceVy: 0,
      bounceAlpha: 1,
    };
  }

  function pickType() {
    return FRUIT_TYPES[randInt(0, FRUIT_TYPES.length - 1)];
  }

  /* --- フルーツ描画（ctx は引数渡し・線の太さも S でスケール） --- */
  function drawApple(ctx, S, size) {
    ctx.fillStyle = '#e33';
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3a3';
    ctx.beginPath();
    ctx.ellipse(size * 0.1, -size * 0.4, size * 0.15, size * 0.08, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#654';
    ctx.lineWidth = 2.5 * S;
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.35);
    ctx.lineTo(0, -size * 0.5);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.arc(-size * 0.12, -size * 0.12, size * 0.12, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawBanana(ctx, S, size) {
    ctx.save();
    ctx.rotate(-0.35);
    ctx.fillStyle = '#FFD93B';
    ctx.beginPath();
    ctx.arc(0, size * 0.2, size * 0.55, Math.PI * 1.15, Math.PI * 1.85);
    ctx.arc(0, size * 0.12, size * 0.42, Math.PI * 1.85, Math.PI * 1.15, true);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#E6B800';
    ctx.beginPath();
    ctx.arc(0, size * 0.2, size * 0.55, Math.PI * 1.5, Math.PI * 1.85);
    ctx.arc(0, size * 0.12, size * 0.42, Math.PI * 1.85, Math.PI * 1.5, true);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#5D4037';
    ctx.beginPath();
    ctx.arc(-size * 0.5, size * 0.16, size * 0.045, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(size * 0.5, size * 0.16, size * 0.045, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2 * S;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, size * 0.22, size * 0.5, Math.PI * 1.25, Math.PI * 1.55);
    ctx.stroke();
    ctx.restore();
  }

  function drawGrape(ctx, S, size) {
    const r = size * 0.13;
    ctx.fillStyle = '#8855CC';
    const positions = [
      [0, -0.2], [-0.15, 0], [0.15, 0],
      [-0.08, 0.2], [0.08, 0.2], [0, 0.38],
    ];
    for (const [dx, dy] of positions) {
      ctx.beginPath();
      ctx.arc(dx * size, dy * size, r, 0, Math.PI * 2);
      ctx.fill();
    }
    // 粒のハイライト
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    for (const [dx, dy] of positions) {
      ctx.beginPath();
      ctx.arc(dx * size - r * 0.3, dy * size - r * 0.3, r * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = '#3a3';
    ctx.lineWidth = 2.5 * S;
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.3);
    ctx.lineTo(0, -size * 0.45);
    ctx.stroke();
  }

  function drawOrange(ctx, S, size) {
    ctx.fillStyle = '#FF8C00';
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.arc(-size * 0.1, -size * 0.1, size * 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3a3';
    ctx.beginPath();
    ctx.ellipse(0, -size * 0.38, size * 0.08, size * 0.05, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawStrawberry(ctx, S, size) {
    ctx.fillStyle = '#DC143C';
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.35);
    ctx.quadraticCurveTo(size * 0.45, -size * 0.1, size * 0.1, size * 0.4);
    ctx.lineTo(0, size * 0.45);
    ctx.lineTo(-size * 0.1, size * 0.4);
    ctx.quadraticCurveTo(-size * 0.45, -size * 0.1, 0, -size * 0.35);
    ctx.fill();
    ctx.fillStyle = '#FFEB3B';
    const SEED_POSITIONS = [
      [-0.13, -0.08], [0.10, -0.05],
      [-0.05, 0.08], [0.14, 0.12],
      [-0.16, 0.18], [0.04, 0.22],
    ];
    for (const [dx, dy] of SEED_POSITIONS) {
      ctx.beginPath();
      ctx.ellipse(dx * size, dy * size, 2 * S, 3 * S, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#3a3';
    ctx.beginPath();
    ctx.ellipse(0, -size * 0.35, size * 0.2, size * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawStarFruit(ctx, S, size) {
    ctx.save();
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 20 * S;
    ctx.fillStyle = '#FFD700';
    drawStar(ctx, 0, 0, size * 0.5);
    ctx.restore();
    // にこにこ顔
    ctx.fillStyle = '#7a5200';
    ctx.beginPath();
    ctx.arc(-size * 0.1, -size * 0.02, size * 0.035, 0, Math.PI * 2);
    ctx.arc(size * 0.1, -size * 0.02, size * 0.035, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#7a5200';
    ctx.lineWidth = 2.5 * S;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, size * 0.06, size * 0.09, 0.2, Math.PI - 0.2);
    ctx.stroke();
  }

  function drawBurr(ctx, S, size) {
    const r = size * 0.34;
    // トゲトゲ
    ctx.fillStyle = '#7B5B3A';
    const spikes = 12;
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const rr = i % 2 === 0 ? r * 1.45 : r;
      const a = (i * Math.PI) / spikes;
      const px = Math.cos(a) * rr;
      const py = Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    // 本体
    ctx.fillStyle = '#5D4037';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    // こまり顔（「とっちゃダメ」のサイン）
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-r * 0.35, -r * 0.15, r * 0.18, 0, Math.PI * 2);
    ctx.arc(r * 0.35, -r * 0.15, r * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(-r * 0.35, -r * 0.12, r * 0.09, 0, Math.PI * 2);
    ctx.arc(r * 0.35, -r * 0.12, r * 0.09, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2.5 * S;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, r * 0.55, r * 0.25, Math.PI + 0.3, -0.3);
    ctx.stroke();
  }

  function drawBasket(g, ctx, time) {
    const S = g.S;
    const bx = basket.x, by = basket.y;
    const bw = basket.width / 2, bh = basket.height;
    const bounce = basket.bounceTimer > 0 ? Math.sin(basket.bounceTimer * 15) * 5 * S : 0;
    const stunned = basket.stunTimer > 0;

    ctx.save();
    ctx.translate(0, bounce);
    if (stunned) {
      // しびれ中はゆらゆら＋点滅
      ctx.translate(Math.sin(time / 40) * 3 * S, 0);
      ctx.globalAlpha = 0.6 + 0.4 * Math.sin(time / 80);
    }

    const topW = bw * 0.8, bottomW = bw * 1.1;
    ctx.fillStyle = stunned ? '#9E9E9E' : '#D2691E';
    ctx.beginPath();
    ctx.moveTo(bx - topW, by);
    ctx.lineTo(bx - bottomW, by + bh);
    ctx.lineTo(bx + bottomW, by + bh);
    ctx.lineTo(bx + topW, by);
    ctx.closePath();
    ctx.fill();

    // 編み模様（横）
    ctx.strokeStyle = 'rgba(139, 90, 43, 0.5)';
    ctx.lineWidth = 1.5 * S;
    for (let i = 0; i < 4; i++) {
      const t = (i + 1) / 5;
      const ly = by + bh * t;
      const lw = topW + (bottomW - topW) * t;
      ctx.beginPath();
      ctx.moveTo(bx - lw, ly);
      ctx.lineTo(bx + lw, ly);
      ctx.stroke();
    }
    // 編み模様（縦: 台形に沿って外へ開く）
    for (let i = -3; i <= 3; i++) {
      const t0 = (i * bw * 0.35) / topW;
      ctx.beginPath();
      ctx.moveTo(bx + t0 * topW, by);
      ctx.lineTo(bx + t0 * bottomW, by + bh);
      ctx.stroke();
    }

    // 縁
    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 4 * S;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(bx - topW, by);
    ctx.lineTo(bx + topW, by);
    ctx.stroke();

    // しびれ中のクルクル星
    if (stunned) {
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#FFD700';
      for (let i = 0; i < 3; i++) {
        const a = time / 200 + (i * Math.PI * 2) / 3;
        drawStar(ctx, bx + Math.cos(a) * bw * 0.9, by - 24 * S + Math.sin(a) * 8 * S, 8 * S);
      }
    }
    ctx.restore();
  }

  function catchFruit(g, f) {
    if (f.type.burr) {
      // イガグリ: しびれて2秒キャッチ不能＋コンボが切れる
      basket.stunTimer = 2.0;
      g.miss();
      g.addFloatText('イタタ…！', basket.x, basket.y - 50 * g.S, { color: '#ff8a80', size: 24 });
      g.particles.emit(f.x, basket.y, 10, {
        speedMin: 40 * g.S, speedMax: 120 * g.S,
        sizeMin: 2 * g.S, sizeMax: 5 * g.S,
        lifeMin: 0.3, lifeMax: 0.7,
        gravity: 100 * g.S, hue: 25, shape: 'circle',
      });
      return;
    }
    const pts = f.type.points;
    g.hit(pts, f.x, basket.y - 30 * g.S);
    if (f.type.star) {
      g.addFloatText('スター +5！', f.x, basket.y - 60 * g.S, { color: '#FFD700', size: 26 });
      g.sound.play('happy', 0.9);
    } else {
      g.sound.play('catch', 0.7);
    }
    basket.bounceTimer = 0.3;
    g.particles.emit(f.x, basket.y, f.type.star ? 24 : 12, {
      speedMin: 40 * g.S, speedMax: (f.type.star ? 180 : 120) * g.S,
      sizeMin: 3 * g.S, sizeMax: 8 * g.S,
      lifeMin: 0.3, lifeMax: 0.8,
      gravity: 40 * g.S, hue: f.type.hue, shape: 'star',
    });
  }

  function moveBasket(g, pos) {
    basket.targetX = Math.max(basket.width / 2, Math.min(g.w - basket.width / 2, pos.x));
  }

  GameV2.run({
    duration: 60,
    unit: 'こ',
    unitSuffix: ' キャッチしたよ！',
    thresholds: [15, 30, 45],
    readyHint: 'カゴをうごかして フルーツをキャッチ！イガグリはよけてね',
    maxParticles: 400,

    onInit(g) {
      basket.width = 120 * g.S;
      basket.height = 62 * g.S;
      basket.y = g.h - 85 * g.S;
      basket.x = g.w / 2;
      basket.targetX = g.w / 2;
    },

    onResize(g) {
      basket.width = 120 * g.S;
      basket.height = 62 * g.S;
      basket.y = g.h - 85 * g.S;
    },

    onReset(g) {
      fruits.length = 0;
      maxFruits = 2;
      fruitSpeed = 130;
      difficultyTimer = 0;
      starCooldown = 10;
      burrCooldown = 6;
      basket.x = g.w / 2;
      basket.targetX = g.w / 2;
      basket.stunTimer = 0;
    },

    onStart(g) {
      fruits.push(createFruit(g, pickType()));
    },

    onPointerDown(g, pos) { moveBasket(g, pos); },
    onPointerMove(g, pos) { moveBasket(g, pos); },

    onUpdate(g, dt) {
      // 難度上昇: 15秒ごとに同時数と速度が増える
      difficultyTimer += dt;
      if (difficultyTimer > 15) {
        difficultyTimer = 0;
        maxFruits = Math.min(4, maxFruits + 1);
        fruitSpeed += 22;
      }
      starCooldown -= dt;
      burrCooldown -= dt;

      basket.x += (basket.targetX - basket.x) * 0.25;
      if (basket.bounceTimer > 0) basket.bounceTimer -= dt;
      if (basket.stunTimer > 0) basket.stunTimer -= dt;

      for (let i = fruits.length - 1; i >= 0; i--) {
        const f = fruits[i];
        if (f.bouncing) {
          f.bounceVy += 300 * g.S * dt;
          f.y += f.bounceVy * dt;
          f.bounceAlpha -= dt * 1.5;
          f.rotation += f.rotSpeed * dt * 3;
          if (f.bounceAlpha <= 0) fruits.splice(i, 1);
          continue;
        }

        f.y += f.speed * dt;
        f.wobblePhase += 2 * dt;
        f.x += Math.sin(f.wobblePhase) * f.wobbleAmp * dt;
        f.rotation += f.rotSpeed * dt;

        // カゴとの当たり判定（しびれ中はキャッチできない）
        if (basket.stunTimer <= 0 &&
            f.y + f.size * 0.3 >= basket.y &&
            f.y < basket.y + basket.height &&
            f.x >= basket.x - basket.width / 2 - f.size * 0.3 &&
            f.x <= basket.x + basket.width / 2 + f.size * 0.3) {
          catchFruit(g, f);
          fruits.splice(i, 1);
          continue;
        }

        if (f.y > g.h - 30 * g.S) {
          f.bouncing = true;
          f.bounceVy = -80 * g.S;
          f.bounceAlpha = 1;
        }
      }

      // 補充
      const activeFruits = fruits.filter((f) => !f.bouncing && !f.type.burr).length;
      if (activeFruits < maxFruits && Math.random() < dt * 2.0) {
        if (starCooldown <= 0) {
          fruits.push(createFruit(g, STAR_TYPE));
          starCooldown = 14 + Math.random() * 8;
        } else {
          fruits.push(createFruit(g, pickType()));
        }
      }
      // イガグリは20秒経過後から時々降ってくる
      if (g.elapsed > 20 && burrCooldown <= 0) {
        fruits.push(createFruit(g, BURR_TYPE));
        burrCooldown = 9 + Math.random() * 6;
      }
    },

    onDraw(g, ctx, time) {
      const { w, h, S } = g;
      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, '#4FC3F7');
      bgGrad.addColorStop(0.7, '#81D4FA');
      bgGrad.addColorStop(1, '#A5D6A7');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // 雲（2層パララックス）
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      const cloudX = ((time / 60) % (w + 200)) - 100;
      GameV2.drawCloud(ctx, cloudX, h * 0.1, 50 * S);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      const cloudX2 = ((time / 110) % (w + 200)) - 100;
      GameV2.drawCloud(ctx, ((cloudX2 + w * 0.5) % (w + 200)) - 100, h * 0.18, 35 * S);

      // 地面
      ctx.fillStyle = '#8BC34A';
      ctx.fillRect(0, h - 30 * S, w, 30 * S);

      // フルーツ
      for (const f of fruits) {
        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.rotate(f.rotation);
        if (f.bouncing) ctx.globalAlpha = Math.max(0, f.bounceAlpha);
        f.type.draw(ctx, S, f.size);
        ctx.restore();
      }

      drawBasket(g, ctx, time);
    },
  });
})();
