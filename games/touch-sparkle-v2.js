/* === タッチでキラキラ ver2 === */
/* 画面をタッチすると花火が飛び散る。訓練: 固視 + 衝動性眼球運動 */
/* ver2: 花火の2段バースト・ドラッグで虹色トレイル（pointerId追跡で安定）・
 *       ときどき出る★固視ターゲット（タッチで特大花火）・スケーリング対応 */
(() => {
  'use strict';

  const shapes = ['circle', 'star', 'heart'];
  const bgStars = [];
  const crackles = []; // 2段目の小爆発の予約
  let idleTimer = 0;
  let trailHue = 0;

  // ★固視ターゲット
  let target = null;
  let targetCooldown = 8;

  function initBgStars(g) {
    bgStars.length = 0;
    for (let i = 0; i < 50; i++) {
      bgStars.push({
        x: Math.random() * g.w,
        y: Math.random() * g.h,
        size: rand(1, 3) * g.S,
        twinkle: Math.random() * Math.PI * 2,
        speed: rand(1, 3),
      });
    }
  }

  function sparkleAt(g, x, y) {
    const S = g.S;
    const shape = shapes[randInt(0, shapes.length - 1)];
    const baseHue = Math.random() * 360;

    // 1段目: メインの花火
    g.particles.emit(x, y, 25, {
      speedMin: 80 * S, speedMax: 280 * S,
      sizeMin: 4 * S, sizeMax: 12 * S,
      lifeMin: 0.6, lifeMax: 1.5,
      gravity: 60 * S, friction: 0.97,
      hue: baseHue, shape,
    });
    g.particles.emit(x, y, 10, {
      speedMin: 30 * S, speedMax: 100 * S,
      sizeMin: 2 * S, sizeMax: 6 * S,
      lifeMin: 0.8, lifeMax: 2.0,
      gravity: 20 * S, friction: 0.99,
      hue: (baseHue + 120) % 360, shape: 'star',
    });

    // 2段目: 少し遅れて周囲に小さな爆発（クラックル）
    const count = randInt(3, 5);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = rand(60, 140) * S;
      crackles.push({
        x: x + Math.cos(a) * d,
        y: y + Math.sin(a) * d - 30 * S,
        delay: rand(0.25, 0.55),
        hue: (baseHue + rand(-40, 40) + 360) % 360,
      });
    }

    g.sound.play('sparkle', 0.6);
    idleTimer = 0;
  }

  function spawnTarget(g) {
    const S = g.S;
    const margin = 120 * S;
    target = {
      x: rand(margin, g.w - margin),
      y: rand(margin + 60 * S, g.h - margin),
      age: 0,
      hue: rand(0, 360),
    };
  }

  function hitTarget(g) {
    const S = g.S;
    const { x, y } = target;
    // 特大花火（3色）
    for (let i = 0; i < 3; i++) {
      g.particles.emit(x, y, 30, {
        speedMin: 100 * S, speedMax: (300 + i * 60) * S,
        sizeMin: 5 * S, sizeMax: 14 * S,
        lifeMin: 0.8, lifeMax: 2.0,
        gravity: 50 * S, friction: 0.97,
        hue: (target.hue + i * 120) % 360,
        shape: i === 1 ? 'star' : 'circle',
      });
    }
    for (let i = 0; i < 5; i++) {
      crackles.push({
        x: x + rand(-160, 160) * S,
        y: y + rand(-160, 60) * S,
        delay: rand(0.3, 0.9),
        hue: rand(0, 360),
      });
    }
    g.addFloatText('やったね！✨', x, y - 60 * S, { color: '#FFD700', size: 28, life: 1.2 });
    g.sound.play('happy', 0.9);
    target = null;
    targetCooldown = rand(8, 12);
  }

  function drawTarget(g, ctx, time) {
    const S = g.S;
    const pulse = 1 + 0.18 * Math.sin(time / 250);
    const size = 46 * S * pulse;
    // 出現・消滅はふわっと
    let alpha = Math.min(1, target.age / 0.5);
    if (target.age > 17) alpha = Math.max(0, (20 - target.age) / 3);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(target.x, target.y);
    ctx.rotate(Math.sin(time / 900) * 0.15);
    ctx.shadowColor = hsl(target.hue, 90, 65);
    ctx.shadowBlur = 30 * S;
    ctx.fillStyle = hsl(target.hue, 90, 65);
    drawStar(ctx, 0, 0, size);
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    drawStar(ctx, 0, 0, size * 0.45);
    ctx.restore();

    // まわりにキラキラ
    if (Math.random() < 0.1 * alpha) {
      g.particles.emit(target.x + rand(-size, size), target.y + rand(-size, size), 1, {
        speedMin: 5 * S, speedMax: 20 * S,
        sizeMin: 2 * S, sizeMax: 4 * S,
        lifeMin: 0.4, lifeMax: 0.9,
        gravity: -8 * S, hue: target.hue, shape: 'star',
      });
    }
  }

  GameV2.run({
    duration: null, // 時間無制限のおもちゃモード
    maxParticles: 700,

    onInit(g) { initBgStars(g); },
    onResize(g) { initBgStars(g); },

    onPointerDown(g, pos) {
      if (target && dist(pos.x, pos.y, target.x, target.y) < 80 * g.S) {
        hitTarget(g);
        return;
      }
      sparkleAt(g, pos.x, pos.y);
    },

    onPointerMove(g, pos) {
      // ドラッグ中は虹色トレイル（pointerId追跡なので指でも安定）
      trailHue = (trailHue + 8) % 360;
      g.particles.emit(pos.x, pos.y, 3, {
        speedMin: 20 * g.S, speedMax: 60 * g.S,
        sizeMin: 3 * g.S, sizeMax: 6 * g.S,
        lifeMin: 0.3, lifeMax: 0.8,
        gravity: 30 * g.S,
        hue: trailHue, shape: 'circle',
      });
      if (target && dist(pos.x, pos.y, target.x, target.y) < 80 * g.S) {
        hitTarget(g);
      }
      idleTimer = 0;
    },

    onUpdate(g, dt) {
      // 2段目バーストの発火
      for (let i = crackles.length - 1; i >= 0; i--) {
        const c = crackles[i];
        c.delay -= dt;
        if (c.delay <= 0) {
          g.particles.emit(c.x, c.y, 10, {
            speedMin: 40 * g.S, speedMax: 120 * g.S,
            sizeMin: 2 * g.S, sizeMax: 6 * g.S,
            lifeMin: 0.3, lifeMax: 0.9,
            gravity: 40 * g.S, friction: 0.97,
            hue: c.hue, shape: 'star',
          });
          crackles.splice(i, 1);
        }
      }

      // ★固視ターゲットの出現管理
      if (target) {
        target.age += dt;
        if (target.age > 20) {
          target = null;
          targetCooldown = rand(8, 12);
        }
      } else {
        targetCooldown -= dt;
        if (targetCooldown <= 0) spawnTarget(g);
      }
    },

    onDraw(g, ctx, time) {
      const dt = 1 / 60;
      ctx.fillStyle = '#0f0f23';
      ctx.fillRect(0, 0, g.w, g.h);

      for (const star of bgStars) {
        star.twinkle += star.speed * dt;
        const alpha = 0.3 + 0.3 * Math.sin(star.twinkle);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      }

      if (target) drawTarget(g, ctx, time);

      // アイドル誘導
      idleTimer += dt;
      if (idleTimer > 3 && !target) {
        const pulse = 0.5 + 0.5 * Math.sin(time / 300);
        ctx.save();
        ctx.globalAlpha = pulse * 0.6;
        ctx.fillStyle = '#fff';
        ctx.font = scaledFont(28, g.S);
        ctx.textAlign = 'center';
        ctx.fillText('タッチしてね ✨', g.w / 2, g.h / 2);
        ctx.restore();
        if (Math.random() < 0.02) {
          g.particles.emit(g.w / 2 + rand(-50, 50) * g.S, g.h / 2 + rand(-30, 30) * g.S, 3, {
            speedMin: 10 * g.S, speedMax: 40 * g.S,
            sizeMin: 2 * g.S, sizeMax: 4 * g.S,
            lifeMin: 0.5, lifeMax: 1.0,
            gravity: 10 * g.S, shape: 'star',
          });
        }
      }
    },
  });
})();
