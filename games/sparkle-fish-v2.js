/* === きらきらさかな ver2 === */
/* 泳ぐ魚をタッチしてつかまえる。訓練: 追従 + 固視 */
/* ver2: スケーリング対応・60秒タイマー・スコア/コンボ・
 *       高コントラストな魚・スコアに応じて小さく速くなる進行難度 */
(() => {
  'use strict';

  const NORMAL_FISH_COUNT = 4;
  const FISH_HUES = [0, 30, 50, 150, 280, 330];

  const fishes = [];
  const bubbles = [];
  const weeds = [];
  let goldCooldown = 8;

  /* スコアに応じた難度: 魚が徐々に小さく・速くなる */
  function sizeFactor(g) { return Math.max(0.62, 1 - g.score * 0.014); }
  function speedFactor(g) { return 1 + Math.min(0.7, g.score * 0.022); }

  function pickPattern() {
    const r = Math.random();
    if (r < 0.4) return 'straight';
    if (r < 0.65) return 'zigzag';
    if (r < 0.85) return 'dash';
    return 'pause';
  }

  function createFish(g, startOnScreen, isGold) {
    const S = g.S;
    const dir = Math.random() < 0.5 ? 1 : -1;
    const base = isGold ? rand(120, 150) : rand(110, 150);
    const fishW = base * S * sizeFactor(g);
    const fishH = fishW * 0.55;
    const pattern = isGold ? 'gold' : pickPattern();

    let baseSpeed;
    switch (pattern) {
      case 'gold':   baseSpeed = rand(100, 140); break;
      case 'dash':   baseSpeed = rand(38, 58); break;
      case 'zigzag': baseSpeed = rand(38, 58); break;
      case 'pause':  baseSpeed = rand(32, 52); break;
      default:       baseSpeed = rand(32, 62); break;
    }
    baseSpeed *= S * speedFactor(g);

    return {
      x: startOnScreen ? rand(fishW, g.w - fishW) : (dir === 1 ? -fishW : g.w + fishW),
      y: rand(fishH + 80 * S, g.h - fishH - 40 * S),
      w: fishW,
      h: fishH,
      hue: isGold ? 48 : FISH_HUES[randInt(0, FISH_HUES.length - 1)],
      isGold: !!isGold,
      pattern,
      dir,
      speed: baseSpeed,
      baseSpeed,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: rand(1, 2),
      wobbleAmp: rand(5, 15) * S,
      patternTimer: rand(2, 5),
      patternPhase: 'normal',
      zigzagPhase: Math.random() * Math.PI * 2,
      zigzagAmp: rand(70, 110) * S,
      tailPhase: Math.random() * Math.PI * 2,
      mouthPhase: Math.random() * Math.PI * 2,
      caught: false,
      caughtTimer: 0,
      rotation: 0,
    };
  }

  function initScene(g) {
    bubbles.length = 0;
    for (let i = 0; i < 15; i++) {
      bubbles.push({
        x: rand(0, g.w),
        y: rand(0, g.h),
        r: rand(3, 10) * g.S,
        speed: rand(15, 40) * g.S,
        wobble: Math.random() * Math.PI * 2,
      });
    }
    weeds.length = 0;
    const count = Math.max(4, Math.round(g.w / (140 * g.S)));
    for (let i = 0; i < count; i++) {
      weeds.push({
        x: (i + 0.5) * (g.w / count) + rand(-20, 20) * g.S,
        len: rand(60, 120) * g.S,
        phase: Math.random() * Math.PI * 2,
        hue: rand(120, 160),
      });
    }
  }

  function drawBackground(g, ctx, time) {
    const { w, h, S } = g;
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#1a6ba8');
    grad.addColorStop(0.5, '#0d4f8a');
    grad.addColorStop(1, '#0a3060');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // 水面から差し込む光の柱
    ctx.save();
    for (let i = 0; i < 3; i++) {
      const cx = w * (0.2 + i * 0.3) + Math.sin(time / 3000 + i * 2) * 40 * S;
      const rayGrad = ctx.createLinearGradient(cx, 0, cx + 80 * S, h * 0.8);
      rayGrad.addColorStop(0, 'rgba(255,255,255,0.10)');
      rayGrad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = rayGrad;
      ctx.beginPath();
      ctx.moveTo(cx - 30 * S, 0);
      ctx.lineTo(cx + 30 * S, 0);
      ctx.lineTo(cx + 140 * S, h * 0.85);
      ctx.lineTo(cx - 60 * S, h * 0.85);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // ゆらゆら海藻
    ctx.save();
    ctx.lineCap = 'round';
    for (const wd of weeds) {
      const sway = Math.sin(time / 900 + wd.phase);
      ctx.strokeStyle = hsla(wd.hue, 60, 35, 0.7);
      ctx.lineWidth = 8 * S;
      ctx.beginPath();
      ctx.moveTo(wd.x, h);
      ctx.quadraticCurveTo(
        wd.x + sway * 18 * S, h - wd.len * 0.6,
        wd.x + sway * 34 * S, h - wd.len
      );
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawBubbles(g, ctx, dt) {
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    for (const b of bubbles) {
      b.y -= b.speed * dt;
      b.wobble += dt;
      b.x += Math.sin(b.wobble) * 10 * g.S * dt;
      if (b.y < -b.r) {
        b.y = g.h + b.r;
        b.x = rand(0, g.w);
      }
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawFish(g, ctx, f, time) {
    const S = g.S;
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(f.rotation);
    // つかまえた魚はふくらんでから消える
    if (f.caught) {
      const p = Math.min(1, f.caughtTimer / 0.7);
      const scale = 1 + 0.25 * Math.sin(p * Math.PI);
      ctx.globalAlpha = 1 - p;
      ctx.scale(scale, scale);
    }
    ctx.scale(f.dir, 1);

    const hw = f.w / 2;
    const hh = f.h / 2;

    if (f.isGold) {
      ctx.save();
      ctx.shadowColor = hsl(50, 100, 70);
      ctx.shadowBlur = 25 * S;
      ctx.fillStyle = hsla(50, 100, 80, 0.001);
      ctx.beginPath();
      ctx.ellipse(0, 0, hw * 1.1, hh * 1.1, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 尾びれ（ぱたぱた動く）
    const tailSwing = Math.sin(f.tailPhase) * 0.35;
    ctx.save();
    ctx.translate(-hw * 0.6, 0);
    ctx.rotate(tailSwing);
    ctx.fillStyle = hsl(f.hue, 80, 55);
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 3.5 * S;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-hw * 0.6, -hh * 0.7);
    ctx.lineTo(-hw * 0.6, hh * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // 本体（太い白フチで高コントラスト）
    const grad = ctx.createRadialGradient(hw * 0.1, -hh * 0.2, hw * 0.1, 0, 0, hw);
    if (f.isGold) {
      grad.addColorStop(0, '#fff8dc');
      grad.addColorStop(0.6, hsl(50, 100, 70));
      grad.addColorStop(1, hsl(40, 100, 50));
    } else {
      grad.addColorStop(0, hsl(f.hue, 85, 75));
      grad.addColorStop(1, hsl(f.hue, 85, 50));
    }
    ctx.fillStyle = grad;
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 4 * S;
    ctx.beginPath();
    ctx.ellipse(0, 0, hw, hh, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 背びれ
    ctx.fillStyle = hsl(f.hue, 75, 60);
    ctx.beginPath();
    ctx.moveTo(hw * 0.1, -hh);
    ctx.lineTo(-hw * 0.3, -hh * 1.3);
    ctx.lineTo(-hw * 0.5, -hh * 0.8);
    ctx.closePath();
    ctx.fill();

    // しま模様（コントラスト強化）
    ctx.strokeStyle = hsla(f.hue, 90, 30, 0.35);
    ctx.lineWidth = 5 * S;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.arc(i * hw * 0.28, 0, hh * 0.75, -Math.PI * 0.35, Math.PI * 0.35);
      ctx.stroke();
    }

    // 目
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(hw * 0.4, -hh * 0.15, hh * 0.32, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(hw * 0.45, -hh * 0.1, hh * 0.16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(hw * 0.48, -hh * 0.2, hh * 0.07, 0, Math.PI * 2);
    ctx.fill();

    // 口パク
    const mouthOpen = Math.abs(Math.sin(f.mouthPhase)) * 3 * S;
    ctx.fillStyle = hsl(f.hue, 70, 35);
    ctx.beginPath();
    ctx.ellipse(hw * 0.78, hh * 0.1, 4 * S, mouthOpen + S, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // 一時停止中はキラキラで固視をさそう
    if (f.patternPhase === 'pause' && Math.random() < 0.05) {
      g.particles.emit(f.x + rand(-f.w * 0.4, f.w * 0.4), f.y + rand(-f.h * 0.4, f.h * 0.4), 1, {
        speedMin: 5 * S, speedMax: 15 * S,
        sizeMin: 1.5 * S, sizeMax: 3 * S,
        lifeMin: 0.4, lifeMax: 0.8,
        gravity: -5 * S,
        hue: f.hue,
        shape: 'star',
      });
    }
  }

  function updatePattern(g, f, dt) {
    switch (f.pattern) {
      case 'straight':
        f.x += f.dir * f.speed * dt;
        f.wobble += f.wobbleSpeed * dt;
        f.y += Math.sin(f.wobble) * f.wobbleAmp * dt;
        break;

      case 'zigzag':
        f.x += f.dir * f.speed * dt;
        f.zigzagPhase += 1.8 * dt;
        f.y += Math.sin(f.zigzagPhase) * f.zigzagAmp * dt;
        if (f.y < f.h) f.y = f.h;
        if (f.y > g.h - f.h) f.y = g.h - f.h;
        break;

      case 'dash':
        f.patternTimer -= dt;
        if (f.patternPhase === 'normal') {
          f.speed = f.baseSpeed;
          if (f.patternTimer <= 0) {
            f.patternPhase = 'dash';
            f.patternTimer = rand(0.7, 1.2);
          }
        } else {
          f.speed = f.baseSpeed * 3.2;
          if (f.patternTimer <= 0) {
            f.patternPhase = 'normal';
            f.patternTimer = rand(2.5, 5);
          }
        }
        f.x += f.dir * f.speed * dt;
        f.wobble += f.wobbleSpeed * dt;
        f.y += Math.sin(f.wobble) * f.wobbleAmp * dt;
        break;

      case 'pause':
        f.patternTimer -= dt;
        if (f.patternPhase === 'normal') {
          if (f.patternTimer <= 0) {
            f.patternPhase = 'pause';
            f.patternTimer = rand(2, 3.5);
          }
          f.x += f.dir * f.speed * dt;
          f.wobble += f.wobbleSpeed * dt;
          f.y += Math.sin(f.wobble) * f.wobbleAmp * dt;
        } else {
          if (f.patternTimer <= 0) {
            f.patternPhase = 'normal';
            f.patternTimer = rand(3, 6);
          }
          f.wobble += 0.8 * dt;
          f.y += Math.sin(f.wobble) * 6 * g.S * dt;
        }
        break;

      case 'gold':
        f.x += f.dir * f.speed * dt;
        f.wobble += f.wobbleSpeed * 0.6 * dt;
        f.y += Math.sin(f.wobble) * 4 * g.S * dt;
        break;
    }
  }

  function isOffscreen(g, f) {
    return (f.dir === 1 && f.x > g.w + f.w) || (f.dir === -1 && f.x < -f.w);
  }

  function catchFish(g, f, pos) {
    f.caught = true;
    f.caughtTimer = 0;
    const points = f.isGold ? 3 : 1;
    g.hit(points, f.x, f.y);
    if (f.isGold) {
      g.addFloatText('きんぎょ +3！', f.x, f.y - f.h, { color: '#FFD700', size: 26 });
    } else {
      g.addFloatText('+1', f.x, f.y - f.h, { color: '#fff', size: 22 });
    }
    g.particles.emit(f.x, f.y, f.isGold ? 32 : 16, {
      speedMin: 40 * g.S, speedMax: (f.isGold ? 180 : 130) * g.S,
      sizeMin: 3 * g.S, sizeMax: (f.isGold ? 11 : 8) * g.S,
      lifeMin: 0.5, lifeMax: 1.4,
      gravity: 20 * g.S,
      hue: f.hue,
      shape: 'star',
    });
    g.sound.play('happy', f.isGold ? 0.9 : 0.6);
  }

  GameV2.run({
    duration: 60,
    bgm: 'calm',
    unit: 'ひき',
    unitSuffix: ' つかまえたよ！',
    thresholds: [10, 20, 32],
    readyHint: 'およいでいる さかなを タッチ！',
    maxParticles: 400,

    onInit(g) {
      initScene(g);
      for (let i = 0; i < NORMAL_FISH_COUNT; i++) {
        fishes.push(createFish(g, true, false));
      }
    },

    onResize(g) {
      initScene(g);
    },

    onReset(g) {
      fishes.length = 0;
      goldCooldown = 8;
      for (let i = 0; i < NORMAL_FISH_COUNT; i++) {
        fishes.push(createFish(g, true, false));
      }
    },

    onPointerDown(g, pos) {
      for (let i = fishes.length - 1; i >= 0; i--) {
        const f = fishes[i];
        if (f.caught) continue;
        if (Math.abs(pos.x - f.x) < f.w * 0.62 && Math.abs(pos.y - f.y) < f.h * 0.75) {
          catchFish(g, f, pos);
          return;
        }
      }
    },

    onUpdate(g, dt) {
      goldCooldown -= dt;

      for (let i = fishes.length - 1; i >= 0; i--) {
        const f = fishes[i];
        f.tailPhase += (6 + f.speed / (30 * g.S)) * dt;
        f.mouthPhase += 3 * dt;

        if (f.caught) {
          f.caughtTimer += dt;
          f.rotation += 8 * dt;
          if (f.caughtTimer >= 0.7) fishes.splice(i, 1);
          continue;
        }

        updatePattern(g, f, dt);
        if (isOffscreen(g, f)) fishes.splice(i, 1);
      }

      // 通常魚の補充
      let normalCount = 0;
      for (const f of fishes) if (!f.isGold && !f.caught) normalCount++;
      while (normalCount < NORMAL_FISH_COUNT) {
        fishes.push(createFish(g, false, false));
        normalCount++;
      }

      // 金魚の出現管理
      const hasGold = fishes.some((f) => f.isGold && !f.caught);
      if (!hasGold && goldCooldown <= 0) {
        fishes.push(createFish(g, false, true));
        goldCooldown = 15 + Math.random() * 10;
      }
    },

    onDraw(g, ctx, time) {
      const dt = 1 / 60;
      drawBackground(g, ctx, time);
      drawBubbles(g, ctx, dt);
      for (const f of fishes) drawFish(g, ctx, f, time);
    },
  });
})();
