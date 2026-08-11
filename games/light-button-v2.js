/* === ひかるボタン ver2 === */
/* 光った順番を覚えてタップ。訓練: 固視 + 記憶 + 手と眼の協応 */
/* ver2: まちがえたら正解をゆっくり再提示する救済・進行ドットの視覚化・
 *       レベル5から6ボタンに増える・「みてね/きみのばん」の状態表示・演出強化 */
(() => {
  'use strict';

  const BUTTON_COLORS = [
    { hue: 0, note: 'note1', dark: '#8B0000', bright: '#FF8888' },
    { hue: 220, note: 'note2', dark: '#00008B', bright: '#8888FF' },
    { hue: 120, note: 'note3', dark: '#006400', bright: '#88FF88' },
    { hue: 55, note: 'note4', dark: '#8B8B00', bright: '#FFFF88' },
    { hue: 30, note: 'note5', dark: '#8B4500', bright: '#FFBB66' },
    { hue: 280, note: 'note6', dark: '#4B0082', bright: '#CC88FF' },
  ];

  const buttons = [];
  let level = 1;
  let sequence = [];
  let sequenceIndex = 0;
  let sequenceTimer = 0;
  let playerIndex = 0;
  let state = 'idle'; // idle, showing, input, levelup, wrong
  let stateTimer = 0;
  let flashButton = -1;
  let flashTimer = 0;
  let slowReplay = false; // まちがえた後はゆっくり見せる

  function buttonCount() { return level >= 5 ? 6 : 4; }
  function showInterval() { return slowReplay ? 1.15 : 0.7; }
  function litDuration() { return slowReplay ? 0.85 : 0.5; }

  function layoutButtons(g) {
    buttons.length = 0;
    const { w, h, S } = g;
    const count = buttonCount();
    const cols = 2, rows = count / 2;
    const gap = 16 * S;
    const btnSize = Math.min(
      (w - gap * (cols + 1)) / cols,
      (h * 0.62 - gap * (rows - 1)) / rows,
      200 * S
    );
    const totalW = btnSize * cols + gap * (cols - 1);
    const totalH = btnSize * rows + gap * (rows - 1);
    const startX = (w - totalW) / 2;
    const startY = (h - totalH) / 2 + 20 * S;

    for (let i = 0; i < count; i++) {
      const col = i % cols, row = Math.floor(i / cols);
      buttons.push({
        x: startX + col * (btnSize + gap),
        y: startY + row * (btnSize + gap),
        w: btnSize,
        h: btnSize,
        color: BUTTON_COLORS[i],
        lit: 0,
        pressScale: 1,
      });
    }
  }

  function ensureExtraNotes(g) {
    // 5・6ボタン用の音（レ・ミの高音）を一度だけ合成
    if (!g.sound.buffers.note5) {
      g.sound._createNote('note5', 587);
      g.sound._createNote('note6', 659);
    }
  }

  function startSequence(g) {
    sequence.push(randInt(0, buttonCount() - 1));
    state = 'showing';
    sequenceIndex = 0;
    sequenceTimer = 0.6;
    playerIndex = 0;
  }

  function drawButton(g, ctx, b) {
    const S = g.S;
    ctx.save();
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    ctx.translate(cx, cy);
    ctx.scale(b.pressScale, b.pressScale);

    const r = Math.min(b.w, b.h) * 0.12;

    if (b.lit > 0.1) {
      ctx.shadowColor = b.color.bright;
      ctx.shadowBlur = 30 * S * b.lit;
      ctx.fillStyle = b.color.bright;
    } else {
      ctx.fillStyle = b.color.dark;
    }
    GameV2.roundRectPath(ctx, -b.w / 2, -b.h / 2, b.w, b.h, r);
    ctx.fill();

    if (b.lit > 0.1) {
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, b.w * 0.6);
      grad.addColorStop(0, `rgba(255,255,255,${0.3 * b.lit})`);
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      GameV2.roundRectPath(ctx, -b.w / 2, -b.h / 2, b.w, b.h, r);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    ctx.fillStyle = `rgba(255,255,255,${b.lit > 0.1 ? 0.15 : 0.08})`;
    GameV2.roundRectPath(ctx, -b.w / 2 + 8 * S, -b.h / 2 + 6 * S, b.w - 16 * S, b.h * 0.35, r * 0.8);
    ctx.fill();

    ctx.restore();
  }

  /* おぼえる長さの進行ドット（いま何番目かが見える） */
  function drawProgressDots(g, ctx) {
    if (state !== 'input' && state !== 'showing') return;
    const S = g.S;
    const n = sequence.length;
    const dotR = 7 * S;
    const gap = 24 * S;
    const totalW = (n - 1) * gap;
    const y = g.h * 0.9;
    for (let i = 0; i < n; i++) {
      const x = g.w / 2 - totalW / 2 + i * gap;
      const done = state === 'input' && i < playerIndex;
      const showing = state === 'showing' && i < sequenceIndex;
      ctx.fillStyle = done ? '#FFD700' : (showing ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.2)');
      ctx.beginPath();
      ctx.arc(x, y, dotR, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function statusText(g, ctx, time) {
    const S = g.S;
    let text = null, color = 'rgba(255,255,255,0.7)';
    if (state === 'showing') { text = slowReplay ? 'ゆっくり みててね' : 'みてね！'; }
    else if (state === 'input') { text = 'きみのばん！'; color = '#8ecfff'; }
    else if (state === 'levelup') { text = 'すごい！'; color = '#FFD700'; }
    else if (state === 'wrong') { text = 'おしい！もういちど みせるね'; color = '#ff9f9f'; }
    if (!text) return;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.font = scaledFont(26, S);
    if (state === 'levelup') {
      const pulse = 1 + Math.sin(stateTimer * 10) * 0.1;
      ctx.translate(g.w / 2, g.h * 0.12);
      ctx.scale(pulse, pulse);
      ctx.fillText(text, 0, 0);
    } else {
      ctx.fillText(text, g.w / 2, g.h * 0.12);
    }
    ctx.restore();
  }

  GameV2.run({
    duration: 60,
    unit: '',
    unitSuffix: 'レベルまで いけたよ！',
    thresholds: [4, 6, 8],
    readyHint: 'ひかったじゅんばんを おぼえてタッチ！',
    maxParticles: 500,

    onInit(g) {
      layoutButtons(g);
      g.score = 1;
    },
    onResize(g) { layoutButtons(g); },

    onReset(g) {
      level = 1;
      sequence = [];
      state = 'idle';
      stateTimer = 0;
      flashButton = -1;
      flashTimer = 0;
      slowReplay = false;
      layoutButtons(g);
      g.score = 1;
    },

    onStart(g) {
      ensureExtraNotes(g);
      startSequence(g);
    },

    onPointerDown(g, pos) {
      if (state !== 'input') return;

      for (let i = 0; i < buttons.length; i++) {
        const b = buttons[i];
        if (GameV2.hitRect(pos, b)) {
          b.lit = 1;
          b.pressScale = 0.92;
          g.sound.play(b.color.note, 0.7);

          if (i === sequence[playerIndex]) {
            flashButton = i;
            flashTimer = 0.3;
            playerIndex++;
            // 正しいタッチごとに小さなキラキラ
            g.particles.emit(b.x + b.w / 2, b.y + b.h / 2, 6, {
              speedMin: 30 * g.S, speedMax: 100 * g.S,
              sizeMin: 3 * g.S, sizeMax: 6 * g.S,
              lifeMin: 0.3, lifeMax: 0.7,
              gravity: 30 * g.S, hue: b.color.hue, shape: 'star',
            });

            if (playerIndex >= sequence.length) {
              state = 'levelup';
              stateTimer = 1.0;
              slowReplay = false;
              const prevCount = buttonCount();
              level++;
              g.score = level;
              if (buttonCount() !== prevCount) {
                layoutButtons(g);
                g.addFloatText('ボタンが ふえるよ！', g.w / 2, g.h * 0.2, { color: '#8ecfff', size: 24, life: 1.4 });
              }
              g.sound.play('happy', 0.8);
              g.particles.emit(g.w / 2, g.h / 2, 30, {
                speedMin: 80 * g.S, speedMax: 250 * g.S,
                sizeMin: 5 * g.S, sizeMax: 14 * g.S,
                lifeMin: 0.5, lifeMax: 1.5,
                gravity: 40 * g.S, hue: b.color.hue, shape: 'star',
              });
            }
          } else {
            // まちがい → ゆっくりもう一度見せる（救済）
            state = 'wrong';
            stateTimer = 1.2;
            slowReplay = true;
            g.sound.play('miss', 0.6);
          }
          break;
        }
      }
    },

    onUpdate(g, dt) {
      switch (state) {
        case 'showing':
          sequenceTimer -= dt;
          if (sequenceTimer <= 0) {
            if (sequenceIndex < sequence.length) {
              const btnIdx = sequence[sequenceIndex];
              buttons[btnIdx].lit = 1;
              g.sound.play(buttons[btnIdx].color.note, 0.6);
              flashButton = btnIdx;
              flashTimer = litDuration();
              sequenceIndex++;
              sequenceTimer = showInterval();
            } else {
              state = 'input';
              playerIndex = 0;
            }
          }
          break;
        case 'levelup':
          stateTimer -= dt;
          if (stateTimer <= 0) startSequence(g);
          break;
        case 'wrong':
          stateTimer -= dt;
          if (stateTimer <= 0) {
            state = 'showing';
            sequenceIndex = 0;
            sequenceTimer = 0.5;
            playerIndex = 0;
          }
          break;
      }

      for (const b of buttons) {
        if (b.lit > 0) b.lit = Math.max(0, b.lit - dt * 3);
        if (b.pressScale < 1) b.pressScale = Math.min(1, b.pressScale + dt * 5);
      }
      if (flashTimer > 0) {
        flashTimer -= dt;
        if (flashButton >= 0 && buttons[flashButton]) {
          buttons[flashButton].lit = Math.max(buttons[flashButton].lit, flashTimer / litDuration());
        }
      }
    },

    onDraw(g, ctx, time) {
      const bgGrad = ctx.createLinearGradient(0, 0, 0, g.h);
      bgGrad.addColorStop(0, '#1a1a2e');
      bgGrad.addColorStop(1, '#16213e');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, g.w, g.h);

      for (const b of buttons) drawButton(g, ctx, b);
      drawProgressDots(g, ctx);
      statusText(g, ctx, time);
    },
  });
})();
