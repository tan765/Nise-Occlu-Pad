/* === もぐらたたき ver2 === */
/* 穴から出るもぐらをタップ。訓練: 固視 + 反応速度 + 手と眼の協応 + 抑制 */
/* ver2: ちら見→ひょっこりの3段アニメーション・うさぎ（たたいちゃダメ＝抑制訓練）・
 *       土ぼこり演出・コンボ・時間経過で難化 */
(() => {
  'use strict';

  const COLS = 3, ROWS = 2;
  const holes = [];
  let popUpDuration = 2.0;
  let maxActive = 1;
  let difficultyTimer = 0;

  function easeOutBack(t) {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  function layoutHoles(g) {
    holes.length = 0;
    const { w, h, S } = g;
    const marginX = w * 0.12, marginTop = h * 0.2, marginBottom = h * 0.15;
    const areaW = w - marginX * 2;
    const areaH = h - marginTop - marginBottom;
    const cellW = areaW / COLS, cellH = areaH / ROWS;

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        holes.push({
          x: marginX + cellW * (c + 0.5),
          y: marginTop + cellH * (r + 0.5) + cellH * 0.15,
          holeW: Math.min(cellW * 0.7, 130 * S),
          holeH: Math.min(cellH * 0.25, 38 * S),
          moleUp: 0,
          state: 'hidden', // hidden, peek, rising, up, whacked, hiding
          timer: rand(0.5, 2.5),
          riseT: 0,
          whackPhase: 0,
          creature: 'mole', // 'mole' | 'rabbit'
        });
      }
    }
  }

  function resetHoles() {
    for (const hole of holes) {
      hole.state = 'hidden';
      hole.moleUp = 0;
      hole.timer = rand(0.5, 2.5);
      hole.creature = 'mole';
    }
  }

  function creatureSize(g, hole) {
    return Math.min(hole.holeW * 0.55, 60 * g.S);
  }

  function drawHole(g, ctx, hole) {
    const { x, y, holeW, holeH } = hole;
    ctx.fillStyle = 'rgba(60, 40, 20, 0.7)';
    ctx.beginPath();
    ctx.ellipse(x, y, holeW / 2, holeH / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(100, 70, 30, 0.5)';
    ctx.lineWidth = 3 * g.S;
    ctx.beginPath();
    ctx.ellipse(x, y, holeW / 2 + 2 * g.S, holeH / 2 + 2 * g.S, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  function drawMoleFace(ctx, S, size, whacked) {
    if (whacked) {
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 3 * S;
      for (const side of [-1, 1]) {
        const ex = side * size * 0.25, ey = -size * 0.25;
        const d = 5 * S;
        ctx.beginPath();
        ctx.moveTo(ex - d, ey - d); ctx.lineTo(ex + d, ey + d);
        ctx.moveTo(ex + d, ey - d); ctx.lineTo(ex - d, ey + d);
        ctx.stroke();
      }
    } else {
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(-size * 0.25, -size * 0.25, size * 0.18, 0, Math.PI * 2);
      ctx.arc(size * 0.25, -size * 0.25, size * 0.18, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#222';
      ctx.beginPath();
      ctx.arc(-size * 0.25, -size * 0.22, size * 0.09, 0, Math.PI * 2);
      ctx.arc(size * 0.25, -size * 0.22, size * 0.09, 0, Math.PI * 2);
      ctx.fill();
    }
    // 鼻
    ctx.fillStyle = '#FF9999';
    ctx.beginPath();
    ctx.ellipse(0, -size * 0.05, size * 0.12, size * 0.09, 0, 0, Math.PI * 2);
    ctx.fill();
    // 前歯
    ctx.fillStyle = '#fff';
    ctx.fillRect(-size * 0.06, size * 0.05, size * 0.05, size * 0.1);
    ctx.fillRect(size * 0.01, size * 0.05, size * 0.05, size * 0.1);
    // ヒゲ
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1.5 * S;
    for (const side of [-1, 1]) {
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(side * size * 0.15, -size * 0.02 + i * 6 * S);
        ctx.lineTo(side * size * 0.55, -size * 0.08 + i * 8 * S);
        ctx.stroke();
      }
    }
  }

  function drawRabbitFace(ctx, S, size, whacked) {
    // 長い耳
    for (const side of [-1, 1]) {
      ctx.fillStyle = '#f5f5f5';
      ctx.beginPath();
      ctx.ellipse(side * size * 0.3, -size * 1.1, size * 0.16, size * 0.5, side * 0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFC0CB';
      ctx.beginPath();
      ctx.ellipse(side * size * 0.3, -size * 1.05, size * 0.08, size * 0.32, side * 0.15, 0, Math.PI * 2);
      ctx.fill();
    }
    if (whacked) {
      // なみだ目
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 2.5 * S;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(side * size * 0.25, -size * 0.2, size * 0.12, Math.PI * 0.15, Math.PI * 0.85);
        ctx.stroke();
      }
      ctx.fillStyle = '#66ccff';
      ctx.beginPath();
      ctx.arc(-size * 0.25, -size * 0.02, size * 0.06, 0, Math.PI * 2);
      ctx.arc(size * 0.25, -size * 0.02, size * 0.06, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#222';
      ctx.beginPath();
      ctx.arc(-size * 0.25, -size * 0.22, size * 0.1, 0, Math.PI * 2);
      ctx.arc(size * 0.25, -size * 0.22, size * 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(-size * 0.22, -size * 0.26, size * 0.035, 0, Math.PI * 2);
      ctx.arc(size * 0.28, -size * 0.26, size * 0.035, 0, Math.PI * 2);
      ctx.fill();
    }
    // 鼻と口（Y字）
    ctx.fillStyle = '#FF9999';
    ctx.beginPath();
    ctx.ellipse(0, -size * 0.03, size * 0.08, size * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#c98a8a';
    ctx.lineWidth = 2 * S;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, size * 0.08);
    ctx.moveTo(0, size * 0.08);
    ctx.lineTo(-size * 0.08, size * 0.15);
    ctx.moveTo(0, size * 0.08);
    ctx.lineTo(size * 0.08, size * 0.15);
    ctx.stroke();
  }

  function drawCreature(g, ctx, hole) {
    if (hole.moleUp <= 0) return;
    const S = g.S;
    const { x, y, holeW } = hole;
    const size = creatureSize(g, hole);
    const riseHeight = size * 1.6;
    const topY = y - riseHeight * hole.moleUp;
    const isRabbit = hole.creature === 'rabbit';

    ctx.save();
    ctx.beginPath();
    ctx.rect(x - holeW, y - riseHeight - size * 1.8, holeW * 2, riseHeight + size * 1.8);
    ctx.clip();

    ctx.save();
    ctx.translate(x, topY);
    if (hole.state === 'whacked') {
      ctx.rotate(Math.sin(hole.whackPhase * 15) * 0.15);
    }

    // 体
    const bodyGrad = ctx.createRadialGradient(-size * 0.1, -size * 0.1, size * 0.1, 0, 0, size);
    if (isRabbit) {
      bodyGrad.addColorStop(0, '#ffffff');
      bodyGrad.addColorStop(1, '#d8d8d8');
    } else {
      bodyGrad.addColorStop(0, '#B8860B');
      bodyGrad.addColorStop(1, '#8B6914');
    }
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.75, size, 0, 0, Math.PI * 2);
    ctx.fill();

    // お腹
    ctx.fillStyle = isRabbit ? '#fff' : '#D2B48C';
    ctx.beginPath();
    ctx.ellipse(0, size * 0.15, size * 0.45, size * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    if (isRabbit) drawRabbitFace(ctx, S, size, hole.state === 'whacked');
    else drawMoleFace(ctx, S, size, hole.state === 'whacked');

    ctx.restore();
    ctx.restore();

    // 穴の手前半分を上描きして中に見せる
    ctx.fillStyle = 'rgba(60, 40, 20, 0.7)';
    ctx.beginPath();
    ctx.ellipse(x, y, hole.holeW / 2, hole.holeH / 2, 0, 0, Math.PI);
    ctx.fill();
  }

  function popDirt(g, hole) {
    // 穴から土ぼこり
    g.particles.emit(hole.x, hole.y, 8, {
      speedMin: 30 * g.S, speedMax: 90 * g.S,
      sizeMin: 2 * g.S, sizeMax: 5 * g.S,
      lifeMin: 0.3, lifeMax: 0.6,
      gravity: 150 * g.S,
      hue: 30, shape: 'circle', spread: Math.PI * 0.8,
    });
  }

  GameV2.run({
    duration: 60,
    unit: 'ひき',
    unitSuffix: ' たたいたよ！',
    thresholds: [12, 24, 36],
    readyHint: 'もぐらをタッチ！うさぎは たたいちゃダメだよ',
    maxParticles: 500,

    onInit(g) { layoutHoles(g); },
    onResize(g) { layoutHoles(g); },

    onReset(g) {
      popUpDuration = 2.0;
      maxActive = 1;
      difficultyTimer = 0;
      resetHoles();
    },

    onPointerDown(g, pos) {
      for (const hole of holes) {
        if (hole.state !== 'up' && hole.state !== 'rising') continue;
        if (hole.moleUp < 0.5) continue;
        const size = creatureSize(g, hole);
        const topY = hole.y - size * 1.6 * hole.moleUp;
        if (dist(pos.x, pos.y, hole.x, topY) < size * 1.3) {
          hole.state = 'whacked';
          hole.timer = 0.6;
          hole.whackPhase = 0;
          if (hole.creature === 'rabbit') {
            // うさぎはたたいちゃダメ: -1点＋コンボが切れる
            g.score = Math.max(0, g.score - 1);
            g.miss();
            g.addFloatText('うさぎさん ごめんね…', hole.x, topY - size, { color: '#ff8a80', size: 20 });
          } else {
            g.hit(1, hole.x, topY);
            g.sound.play('whack', 0.7);
            g.particles.emit(hole.x, topY, 20, {
              speedMin: 50 * g.S, speedMax: 180 * g.S,
              sizeMin: 4 * g.S, sizeMax: 10 * g.S,
              lifeMin: 0.4, lifeMax: 1.0,
              gravity: 50 * g.S, hue: 45, shape: 'star',
            });
          }
          break;
        }
      }
    },

    onUpdate(g, dt) {
      // 難易度上昇: 15秒ごとに出現時間短縮＆同時数アップ
      difficultyTimer += dt;
      if (difficultyTimer > 15) {
        difficultyTimer = 0;
        popUpDuration = Math.max(0.8, popUpDuration - 0.3);
        maxActive = Math.min(3, maxActive + 1);
      }

      let activeCount = 0;
      for (const hole of holes) {
        if (hole.state !== 'hidden') activeCount++;
      }

      for (const hole of holes) {
        switch (hole.state) {
          case 'hidden':
            hole.timer -= dt;
            if (hole.timer <= 0 && activeCount < maxActive) {
              // 20秒経過後は20%でうさぎが出る
              hole.creature = (g.elapsed > 20 && Math.random() < 0.2) ? 'rabbit' : 'mole';
              hole.state = 'peek';
              hole.moleUp = 0;
              hole.riseT = 0;
              hole.timer = rand(0.25, 0.5); // ちら見の長さ
              activeCount++;
              popDirt(g, hole);
            }
            break;
          case 'peek':
            // ちら見: 目だけひょこっ（固視の予告）
            hole.moleUp = Math.min(0.3, hole.moleUp + dt * 2.5);
            hole.timer -= dt;
            if (hole.timer <= 0) {
              hole.state = 'rising';
              hole.riseT = 0;
            }
            break;
          case 'rising':
            hole.riseT += dt * 4;
            hole.moleUp = 0.3 + 0.7 * easeOutBack(Math.min(1, hole.riseT));
            if (hole.riseT >= 1) {
              hole.moleUp = 1;
              hole.state = 'up';
              hole.timer = popUpDuration * (hole.creature === 'rabbit' ? 0.9 : 1);
            }
            break;
          case 'up':
            hole.timer -= dt;
            if (hole.timer <= 0) hole.state = 'hiding';
            break;
          case 'whacked':
            hole.whackPhase += dt;
            hole.timer -= dt;
            if (hole.timer <= 0) hole.state = 'hiding';
            break;
          case 'hiding':
            hole.moleUp -= dt * 3.5;
            if (hole.moleUp <= 0) {
              hole.moleUp = 0;
              hole.state = 'hidden';
              hole.timer = rand(0.8, 2.5);
            }
            break;
        }
      }
    },

    onDraw(g, ctx, time) {
      const { w, h, S } = g;
      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, '#87CEEB');
      bgGrad.addColorStop(0.4, '#90EE90');
      bgGrad.addColorStop(1, '#6B8E23');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // 遠くの雲
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      const cloudX = ((time / 90) % (w + 220)) - 110;
      GameV2.drawCloud(ctx, cloudX, h * 0.08, 40 * S);
      GameV2.drawCloud(ctx, ((cloudX + w * 0.55) % (w + 220)) - 110, h * 0.13, 30 * S);

      // 草むら（ちょんちょんと生えた草）
      ctx.strokeStyle = 'rgba(60, 120, 40, 0.5)';
      ctx.lineWidth = 2 * S;
      ctx.lineCap = 'round';
      for (let i = 0; i < 24; i++) {
        const gx = ((i * 173.3) % w);
        const gy = h * 0.35 + ((i * 97.7) % (h * 0.55));
        const sway = Math.sin(time / 800 + i) * 2 * S;
        ctx.beginPath();
        ctx.moveTo(gx, gy);
        ctx.quadraticCurveTo(gx + sway, gy - 8 * S, gx + sway * 2, gy - 14 * S);
        ctx.stroke();
      }

      for (const hole of holes) drawHole(g, ctx, hole);
      for (const hole of holes) drawCreature(g, ctx, hole);
    },
  });
})();
