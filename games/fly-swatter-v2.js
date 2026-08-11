/* === ハエたたき ver2 === */
/* 飛び回るハエをタップでたたく。訓練: 追従 + 固視 + 手と眼の協応 */
/* ver2: 飛行⇔着地の2相挙動（着地中=1点でねらいやすい、飛行中=2点で追従強化）・
 *       金バエ(3点)・指に追従するハエたたき・コンボ・時間経過で難化 */
(() => {
  'use strict';

  const flies = [];
  const splats = [];
  let goldCooldown = 12;

  const swatter = {
    x: 0, y: 0,
    visible: false,
    smackTimer: 0,
    hit: false,
  };

  const difficulty = {
    timer: 0,
    interval: 15,
    maxFlies: 3,
    speedMultiplier: 1.0,
  };

  function resetDifficulty() {
    difficulty.timer = 0;
    difficulty.maxFlies = 3;
    difficulty.speedMultiplier = 1.0;
  }

  function createFly(g, isGold) {
    const S = g.S;
    const margin = 60 * S;
    return {
      x: rand(margin, g.w - margin),
      y: rand(margin, g.h - margin),
      targetX: rand(margin, g.w - margin),
      targetY: rand(margin, g.h - margin),
      speed: rand(80 * S, 150 * S) * difficulty.speedMultiplier * (isGold ? 1.6 : 1),
      size: rand(26 * S, 36 * S),
      isGold: !!isGold,
      wingPhase: Math.random() * Math.PI * 2,
      wingSpeed: rand(15, 25),
      wobblePhase: Math.random() * Math.PI * 2,
      wobbleAmp: rand(20 * S, 40 * S),
      // 飛行⇔着地の2相
      state: 'fly', // 'fly' | 'land'
      landTimer: 0,
      landPulse: 0,
    };
  }

  function spawnFromEdge(g, isGold) {
    const S = g.S;
    const nf = createFly(g, isGold);
    const side = randInt(0, 3);
    if (side === 0) { nf.x = -20; nf.y = rand(60 * S, g.h - 60 * S); }
    else if (side === 1) { nf.x = g.w + 20; nf.y = rand(60 * S, g.h - 60 * S); }
    else if (side === 2) { nf.y = -20; nf.x = rand(60 * S, g.w - 60 * S); }
    else { nf.y = g.h + 20; nf.x = rand(60 * S, g.w - 60 * S); }
    return nf;
  }

  function drawFly(g, ctx, f, time) {
    const S = g.S;
    ctx.save();
    ctx.translate(f.x, f.y);
    const s = f.size;
    const landed = f.state === 'land';

    // 金バエの発光
    if (f.isGold) {
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = 18 * S;
    }

    // 着地中はまわりにリング（ここをねらう合図＝固視の誘導）
    if (landed) {
      const pulse = 1 + 0.15 * Math.sin(time / 200);
      ctx.save();
      ctx.strokeStyle = f.isGold ? 'rgba(255,215,0,0.6)' : 'rgba(255,140,60,0.5)';
      ctx.lineWidth = 3 * S;
      ctx.setLineDash([6 * S, 6 * S]);
      ctx.beginPath();
      ctx.arc(0, 0, s * 1.6 * pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 羽（着地中はたたんでほぼ止まる）
    const wingAngle = landed ? 0.08 : Math.sin(f.wingPhase) * 0.4;
    ctx.fillStyle = 'rgba(200, 220, 255, 0.45)';
    ctx.strokeStyle = 'rgba(150, 180, 220, 0.3)';
    ctx.lineWidth = 1 * S;
    ctx.save();
    ctx.rotate(-0.5 + wingAngle);
    ctx.beginPath();
    ctx.ellipse(-s * 0.35, -s * 0.25, s * 0.5, s * 0.25, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.restore();
    ctx.save();
    ctx.rotate(0.5 - wingAngle);
    ctx.beginPath();
    ctx.ellipse(s * 0.35, -s * 0.25, s * 0.5, s * 0.25, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.restore();

    // 体
    const bodyGrad = ctx.createRadialGradient(-s * 0.05, -s * 0.05, s * 0.05, 0, 0, s * 0.4);
    if (f.isGold) {
      bodyGrad.addColorStop(0, '#ffe066');
      bodyGrad.addColorStop(1, '#b8860b');
    } else {
      bodyGrad.addColorStop(0, '#555');
      bodyGrad.addColorStop(1, '#222');
    }
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.3, s * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // しましま
    ctx.strokeStyle = f.isGold ? 'rgba(120,90,20,0.5)' : 'rgba(100, 100, 60, 0.4)';
    ctx.lineWidth = 1.5 * S;
    for (let i = -2; i <= 2; i++) {
      const ly = i * s * 0.08;
      const hw = Math.sqrt(Math.max(0, (s * 0.3) ** 2 * (1 - (ly / (s * 0.45)) ** 2)));
      if (hw > 2) {
        ctx.beginPath();
        ctx.moveTo(-hw, ly);
        ctx.lineTo(hw, ly);
        ctx.stroke();
      }
    }

    // 目
    ctx.fillStyle = '#c44';
    ctx.beginPath();
    ctx.arc(-s * 0.15, -s * 0.35, s * 0.16, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(s * 0.15, -s * 0.35, s * 0.16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    ctx.arc(-s * 0.1, -s * 0.4, s * 0.06, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(s * 0.1, -s * 0.4, s * 0.06, 0, Math.PI * 2);
    ctx.fill();

    // 足
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1.5 * S;
    ctx.lineCap = 'round';
    for (let side = -1; side <= 1; side += 2) {
      for (let j = 0; j < 3; j++) {
        const ly = -s * 0.15 + j * s * 0.18;
        const lx = side * s * 0.28;
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.lineTo(lx + side * s * 0.2, ly + s * 0.12);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawSplat(g, ctx, sp) {
    const S = g.S;
    ctx.save();
    ctx.globalAlpha = Math.min(1, sp.timer * 2);
    ctx.translate(sp.x, sp.y);
    ctx.fillStyle = sp.gold ? 'rgba(200, 160, 30, 0.5)' : 'rgba(80, 80, 40, 0.5)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 18 * S, 12 * S, sp.angle || 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = sp.gold ? 'rgba(170, 130, 20, 0.4)' : 'rgba(60, 60, 30, 0.4)';
    for (let i = 0; i < 5; i++) {
      const dx = ((i * 7.3 + sp.x) % 20 - 10) * S;
      const dy = ((i * 5.7 + sp.y) % 14 - 7) * S;
      ctx.beginPath();
      ctx.arc(dx, dy, 2 * S, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawSwatter(g, ctx) {
    if (!swatter.visible && swatter.smackTimer <= 0) return;
    const S = g.S;
    const smacking = swatter.smackTimer > 0;
    const t = smacking ? swatter.smackTimer / 0.3 : 0;

    ctx.save();
    ctx.translate(swatter.x, swatter.y);
    if (smacking) {
      // たたく瞬間: ぐっと縮んで戻る＋ちょっと回る
      const squash = 1 + (1 - t) * 0.5;
      ctx.scale(squash, squash);
      ctx.rotate((1 - t) * 0.3);
      ctx.globalAlpha = Math.min(1, t * 3);
    } else {
      // 指に追従中はうっすら表示
      ctx.globalAlpha = 0.45;
    }

    const r = 34 * S;
    ctx.fillStyle = smacking && swatter.hit ? 'rgba(255, 80, 80, 0.7)' : 'rgba(160, 160, 160, 0.6)';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // 網目
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 1 * S;
    ctx.beginPath();
    for (let i = -r; i <= r; i += 10 * S) {
      const halfW = Math.sqrt(Math.max(0, r * r - i * i));
      ctx.moveTo(-halfW, i); ctx.lineTo(halfW, i);
      ctx.moveTo(i, -halfW); ctx.lineTo(i, halfW);
    }
    ctx.stroke();

    ctx.strokeStyle = smacking && swatter.hit ? '#c33' : '#888';
    ctx.lineWidth = 2.5 * S;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();

    // 柄
    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 6 * S;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(r * 0.5, r * 0.5);
    ctx.lineTo(r * 1.8, r * 1.8);
    ctx.stroke();
    ctx.restore();
  }

  function drawWindow(g, ctx) {
    const S = g.S;
    const winW = Math.min(180 * S, g.w * 0.25);
    const winH = winW * 1.3;
    const winX = g.w * 0.82 - winW / 2;
    const winY = g.h * 0.15;
    ctx.fillStyle = 'rgba(135, 206, 235, 0.4)';
    GameV2.roundRectPath(ctx, winX, winY, winW, winH, 8 * S);
    ctx.fill();
    ctx.strokeStyle = 'rgba(180, 160, 130, 0.5)';
    ctx.lineWidth = 4 * S;
    ctx.beginPath();
    ctx.moveTo(winX + winW / 2, winY);
    ctx.lineTo(winX + winW / 2, winY + winH);
    ctx.moveTo(winX, winY + winH / 2);
    ctx.lineTo(winX + winW, winY + winH / 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(150, 130, 100, 0.4)';
    ctx.lineWidth = 3 * S;
    GameV2.roundRectPath(ctx, winX, winY, winW, winH, 8 * S);
    ctx.stroke();
  }

  function swatFly(g, f, pos) {
    const S = g.S;
    const points = f.isGold ? 3 : (f.state === 'fly' ? 2 : 1);
    g.hit(points, f.x, f.y);
    if (f.isGold) {
      g.addFloatText('きんバエ +3！', f.x, f.y - f.size - 16 * S, { color: '#FFD700', size: 24 });
    } else if (points === 2) {
      g.addFloatText('とんでるとこ +2！', f.x, f.y - f.size - 16 * S, { color: '#ff9f43', size: 20 });
    } else {
      g.addFloatText('+1', f.x, f.y - f.size - 12 * S, { color: '#654', size: 20 });
    }
    g.sound.play('swat', 0.7);
    g.particles.emit(f.x, f.y, 15, {
      speedMin: 40 * S, speedMax: 150 * S,
      sizeMin: 3 * S, sizeMax: 8 * S,
      lifeMin: 0.3, lifeMax: 0.8,
      gravity: 60 * S, hue: f.isGold ? 50 : 60, shape: 'circle',
    });
    g.particles.emit(f.x, f.y, f.isGold ? 12 : 5, {
      speedMin: 20 * S, speedMax: 80 * S,
      sizeMin: 4 * S, sizeMax: 10 * S,
      lifeMin: 0.4, lifeMax: 1.0,
      gravity: 30 * S, hue: f.isGold ? 45 : 30, shape: 'star',
    });
    splats.push({ x: f.x, y: f.y, timer: 2.5, angle: rand(-0.3, 0.3), gold: f.isGold });
  }

  GameV2.run({
    duration: 60,
    unit: 'ぴき',
    unitSuffix: ' やっつけたよ！',
    thresholds: [15, 30, 48],
    readyHint: 'とまっているハエは 1てん、とんでいるハエは 2てん！',
    maxParticles: 500,

    onInit(g) {
      for (let i = 0; i < difficulty.maxFlies; i++) flies.push(createFly(g, false));
    },

    onReset(g) {
      resetDifficulty();
      goldCooldown = 12;
      flies.length = 0;
      splats.length = 0;
      swatter.visible = false;
      swatter.smackTimer = 0;
      for (let i = 0; i < difficulty.maxFlies; i++) flies.push(createFly(g, false));
    },

    onPointerDown(g, pos) {
      swatter.x = pos.x;
      swatter.y = pos.y;
      swatter.visible = true;
      swatter.smackTimer = 0.3;
      swatter.hit = false;

      for (let i = flies.length - 1; i >= 0; i--) {
        const f = flies[i];
        if (dist(pos.x, pos.y, f.x, f.y) < f.size * 1.5 + 20 * g.S) {
          swatter.hit = true;
          swatFly(g, f, pos);
          flies.splice(i, 1);
          break;
        }
      }
      if (!swatter.hit) g.sound.play('bounce', 0.3);
    },

    onPointerMove(g, pos) {
      swatter.x = pos.x;
      swatter.y = pos.y;
      swatter.visible = true;
    },

    onPointerUp() {
      swatter.visible = false;
    },

    onUpdate(g, dt) {
      const S = g.S;

      // 難易度
      difficulty.timer += dt;
      if (difficulty.timer >= difficulty.interval) {
        difficulty.timer = 0;
        if (difficulty.maxFlies < 8) {
          difficulty.maxFlies++;
          difficulty.speedMultiplier += 0.15;
        }
      }
      goldCooldown -= dt;

      if (swatter.smackTimer > 0) swatter.smackTimer -= dt;

      // スプラット
      for (let i = splats.length - 1; i >= 0; i--) {
        splats[i].timer -= dt;
        if (splats[i].timer <= 0) splats.splice(i, 1);
      }

      // ハエ更新（飛行⇔着地の2相）
      for (const f of flies) {
        f.wingPhase += f.wingSpeed * dt;

        if (f.state === 'land') {
          f.landTimer -= dt;
          if (f.landTimer <= 0) {
            f.state = 'fly';
            f.targetX = rand(60 * S, g.w - 60 * S);
            f.targetY = rand(60 * S, g.h - 60 * S);
          }
          continue;
        }

        const dx = f.targetX - f.x;
        const dy = f.targetY - f.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < 20 * S) {
          // 目的地に到着: 35%で着地してとまる（金バエはとまらない）
          if (!f.isGold && Math.random() < 0.35) {
            f.state = 'land';
            f.landTimer = rand(1.2, 2.4);
          } else {
            f.targetX = rand(60 * S, g.w - 60 * S);
            f.targetY = rand(60 * S, g.h - 60 * S);
          }
        } else {
          const moveSpeed = f.speed * dt;
          f.x += (dx / d) * moveSpeed;
          f.y += (dy / d) * moveSpeed;
          f.wobblePhase += 3 * dt;
          const perpX = -dy / d;
          const perpY = dx / d;
          f.x += perpX * Math.sin(f.wobblePhase) * f.wobbleAmp * dt;
          f.y += perpY * Math.sin(f.wobblePhase) * f.wobbleAmp * dt;
        }
        f.x = Math.max(f.size, Math.min(g.w - f.size, f.x));
        f.y = Math.max(f.size, Math.min(g.h - f.size, f.y));
      }

      // 補充
      while (flies.filter((f) => !f.isGold).length < difficulty.maxFlies) {
        flies.push(spawnFromEdge(g, false));
      }
      // 金バエ（レア）
      const hasGold = flies.some((f) => f.isGold);
      if (!hasGold && goldCooldown <= 0) {
        flies.push(spawnFromEdge(g, true));
        goldCooldown = 14 + Math.random() * 8;
      }
    },

    onDraw(g, ctx, time) {
      const bgGrad = ctx.createLinearGradient(0, 0, 0, g.h);
      bgGrad.addColorStop(0, '#FFF8E7');
      bgGrad.addColorStop(1, '#FFE4B5');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, g.w, g.h);

      drawWindow(g, ctx);
      for (const sp of splats) drawSplat(g, ctx, sp);
      for (const f of flies) drawFly(g, ctx, f, time);
      drawSwatter(g, ctx);
    },
  });
})();
