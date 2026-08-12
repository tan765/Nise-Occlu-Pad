/* === ふうせんポン ver2 === */
/* 浮かぶ風船をタップで割る。訓練: 追従 + 固視 */
/* ver2: スコアに応じて風船が小さく速くなる進行難度・金の風船(3点)・
 *       割れた瞬間のリング＋ひらひら落ちる紐・雲の2層パララックス・コンボ */
(() => {
  'use strict';

  const MAX_BALLOONS = 7;
  const balloons = [];
  const rings = [];    // 割れた瞬間の膨張リング
  const strings = [];  // ひらひら落ちる紐
  let goldCooldown = 10;

  const COLORS = [
    { h: 0, s: 80, l: 60 },
    { h: 30, s: 90, l: 60 },
    { h: 50, s: 90, l: 55 },
    { h: 130, s: 70, l: 50 },
    { h: 200, s: 80, l: 60 },
    { h: 270, s: 70, l: 65 },
    { h: 330, s: 80, l: 65 },
  ];

  /* スコアに応じた難度: 風船が小さく・速くなる */
  function sizeFactor(g) { return Math.max(0.58, 1 - g.score * 0.009); }
  function speedFactor(g) { return 1 + Math.min(0.8, g.score * 0.018); }

  function createBalloon(g, isGold) {
    const S = g.S;
    const color = isGold ? { h: 48, s: 100, l: 55 } : COLORS[randInt(0, COLORS.length - 1)];
    const isFast = !isGold && Math.random() < 0.2;
    const sf = sizeFactor(g);
    const radius = (isFast ? rand(32 * S, 44 * S) : rand(44 * S, 62 * S)) * sf;
    const speed = (isFast ? rand(1.6 * S, 2.4 * S) : rand(0.55 * S, 1.9 * S)) * speedFactor(g) * (isGold ? 1.5 : 1);
    return {
      x: rand(radius, g.w - radius),
      y: g.h + radius + rand(0, 100),
      radius,
      color,
      isGold: !!isGold,
      speed,
      wobblePhase: Math.random() * Math.PI * 2,
      wobbleSpeed: rand(1, 2.5),
      wobbleAmp: rand(15 * S, 30 * S),
    };
  }

  function drawBalloon(g, ctx, b, time) {
    const S = g.S;
    ctx.save();
    ctx.translate(b.x, b.y);

    if (b.isGold) {
      ctx.shadowColor = hsl(50, 100, 65);
      ctx.shadowBlur = 22 * S;
    }

    const grad = ctx.createRadialGradient(
      -b.radius * 0.3, -b.radius * 0.3, b.radius * 0.1,
      0, 0, b.radius
    );
    if (b.isGold) {
      grad.addColorStop(0, '#fff3b0');
      grad.addColorStop(0.6, hsl(48, 100, 60));
      grad.addColorStop(1, hsl(40, 100, 48));
    } else {
      grad.addColorStop(0, hsl(b.color.h, b.color.s, b.color.l + 20));
      grad.addColorStop(1, hsl(b.color.h, b.color.s, b.color.l));
    }
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(0, 0, b.radius * 0.85, b.radius, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // ハイライト
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.ellipse(-b.radius * 0.25, -b.radius * 0.35, b.radius * 0.2, b.radius * 0.3, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // 金の風船には星マーク
    if (b.isGold) {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      drawStar(ctx, 0, 0, b.radius * 0.35);
    }

    // 結び目と紐
    ctx.fillStyle = hsl(b.color.h, b.color.s, b.color.l - 10);
    ctx.beginPath();
    ctx.moveTo(-4 * S, b.radius);
    ctx.lineTo(4 * S, b.radius);
    ctx.lineTo(0, b.radius + 7 * S);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = hsl(b.color.h, b.color.s, b.color.l - 10);
    ctx.lineWidth = 2 * S;
    ctx.beginPath();
    ctx.moveTo(0, b.radius + 6 * S);
    const sway = Math.sin(time / 400 + b.wobblePhase) * 5 * S;
    ctx.quadraticCurveTo(5 * S + sway, b.radius + 18 * S, -3 * S + sway, b.radius + 34 * S);
    ctx.stroke();

    ctx.restore();
  }

  function popBalloon(g, b) {
    const S = g.S;
    const points = b.isGold ? 3 : 1;
    g.hit(points, b.x, b.y);
    if (b.isGold) {
      g.addFloatText('きんのふうせん +3！', b.x, b.y - b.radius - 20 * S, { color: '#FFD700', size: 24 });
    }

    // 破裂パーティクル
    g.particles.emit(b.x, b.y, b.isGold ? 34 : 20, {
      speedMin: 60 * S, speedMax: (b.isGold ? 220 : 180) * S,
      sizeMin: 4 * S, sizeMax: 10 * S,
      lifeMin: 0.5, lifeMax: 1.2,
      gravity: 50 * S,
      hue: b.color.h,
      shape: 'circle',
    });
    g.particles.emit(b.x, b.y, b.isGold ? 14 : 8, {
      speedMin: 30 * S, speedMax: 100 * S,
      sizeMin: 3 * S, sizeMax: 7 * S,
      lifeMin: 0.4, lifeMax: 1.0,
      gravity: 30 * S,
      hue: (b.color.h + 180) % 360,
      shape: 'star',
    });

    // 膨張リング
    rings.push({ x: b.x, y: b.y, r: b.radius * 0.6, vr: b.radius * 6, alpha: 0.9, hue: b.color.h });

    // 紐がひらひら落ちる
    strings.push({
      x: b.x, y: b.y + b.radius * 0.5,
      vy: 60 * S, phase: Math.random() * Math.PI * 2,
      hue: b.color.h, life: 1.6, len: 30 * S,
    });

    g.sound.play('pop', 0.7);
  }

  GameV2.run({
    duration: 60,
    bgm: 'pop',
    unit: 'こ',
    unitSuffix: ' われたよ！',
    thresholds: [15, 30, 45],
    readyHint: 'ふうせんを タッチでわろう！きんいろは 3てん！',
    maxParticles: 400,

    onInit(g) {
      for (let i = 0; i < MAX_BALLOONS; i++) {
        const b = createBalloon(g, false);
        b.y = rand(g.h * 0.2, g.h * 0.9);
        balloons.push(b);
      }
    },

    onReset(g) {
      balloons.length = 0;
      rings.length = 0;
      strings.length = 0;
      goldCooldown = 10;
      for (let i = 0; i < MAX_BALLOONS; i++) {
        const b = createBalloon(g, false);
        b.y = rand(g.h * 0.2, g.h * 0.9);
        balloons.push(b);
      }
    },

    onPointerDown(g, pos) {
      for (let i = balloons.length - 1; i >= 0; i--) {
        const b = balloons[i];
        if (dist(pos.x, pos.y, b.x, b.y) < b.radius * 1.3) {
          popBalloon(g, b);
          balloons.splice(i, 1);
          break;
        }
      }
    },

    onUpdate(g, dt) {
      goldCooldown -= dt;

      for (let i = balloons.length - 1; i >= 0; i--) {
        const b = balloons[i];
        b.y -= b.speed * 60 * dt;
        b.wobblePhase += b.wobbleSpeed * dt;
        b.x += Math.sin(b.wobblePhase) * b.wobbleAmp * dt;
        if (b.y < -b.radius * 2) balloons.splice(i, 1);
      }

      // 補充
      let normal = 0;
      for (const b of balloons) if (!b.isGold) normal++;
      while (normal < MAX_BALLOONS) {
        balloons.push(createBalloon(g, false));
        normal++;
      }
      // 金の風船（レア）
      const hasGold = balloons.some((b) => b.isGold);
      if (!hasGold && goldCooldown <= 0) {
        balloons.push(createBalloon(g, true));
        goldCooldown = 12 + Math.random() * 8;
      }

      // リング更新
      for (let i = rings.length - 1; i >= 0; i--) {
        const r = rings[i];
        r.r += r.vr * dt;
        r.alpha -= dt * 2.2;
        if (r.alpha <= 0) rings.splice(i, 1);
      }

      // 紐更新
      for (let i = strings.length - 1; i >= 0; i--) {
        const s = strings[i];
        s.y += s.vy * dt;
        s.phase += 6 * dt;
        s.life -= dt;
        if (s.life <= 0) strings.splice(i, 1);
      }
    },

    onDraw(g, ctx, time) {
      const { w, h, S } = g;
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#87CEEB');
      grad.addColorStop(1, '#E0F7FA');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // 雲（2層パララックス）
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      const backX = ((time / 110) % (w + 260)) - 130;
      GameV2.drawCloud(ctx, backX, h * 0.08, 42 * S);
      GameV2.drawCloud(ctx, ((backX + w * 0.55) % (w + 260)) - 130, h * 0.3, 36 * S);
      ctx.fillStyle = 'rgba(255,255,255,0.65)';
      const frontX = ((time / 50) % (w + 260)) - 130;
      GameV2.drawCloud(ctx, frontX, h * 0.16, 60 * S);
      GameV2.drawCloud(ctx, ((frontX + w * 0.6) % (w + 260)) - 130, h * 0.24, 46 * S);

      for (const b of balloons) drawBalloon(g, ctx, b, time);

      // 膨張リング
      for (const r of rings) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, r.alpha);
        ctx.strokeStyle = hsl(r.hue, 85, 65);
        ctx.lineWidth = 4 * S * Math.max(0.3, r.alpha);
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // ひらひら落ちる紐
      for (const s of strings) {
        ctx.save();
        ctx.globalAlpha = Math.min(1, s.life);
        ctx.strokeStyle = hsl(s.hue, 70, 45);
        ctx.lineWidth = 2 * S;
        const sway = Math.sin(s.phase) * 10 * S;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.quadraticCurveTo(s.x + sway, s.y + s.len * 0.5, s.x - sway * 0.6, s.y + s.len);
        ctx.stroke();
        ctx.restore();
      }
    },
  });
})();
