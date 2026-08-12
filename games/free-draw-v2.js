/* === おえかき ver2 === */
/* 指で自由にお絵かき。訓練: 手と眼の協応 */
/* ver2: アンドゥ・ペンの太さ3段階・スタンプモード（★♥はな）・
 *       ペン先のキラキラ・リサイズしても絵が消えない（ストローク再生方式） */
(() => {
  'use strict';

  const COLORS = [
    { name: 'あか', color: '#FF4444' },
    { name: 'オレンジ', color: '#FF9922' },
    { name: 'きいろ', color: '#FFDD00' },
    { name: 'みどり', color: '#44BB44' },
    { name: 'あお', color: '#4488FF' },
    { name: 'むらさき', color: '#AA44FF' },
    { name: 'ピンク', color: '#FF66AA' },
    { name: 'にじいろ', color: 'rainbow' },
  ];
  const PEN_SIZES = [8, 16, 28];
  const STAMP_SHAPES = ['star', 'heart', 'flower'];
  const MAX_STROKES = 200;

  let currentColor = COLORS[0].color;
  let currentSize = PEN_SIZES[1];
  let stampMode = false;
  let stampIndex = 0;
  let rainbowHue = 0;

  // 絵はストローク（ベクター）で保持し、オフスクリーンに描く。
  // アンドゥ・リサイズ時はストロークを再生して復元する。
  const strokes = [];
  let liveStroke = null;
  let drawingCanvas = null;
  let drawingCtx = null;

  function setupLayer(g) {
    if (!drawingCanvas) drawingCanvas = document.createElement('canvas');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    drawingCanvas.width = g.w * dpr;
    drawingCanvas.height = g.h * dpr;
    drawingCtx = drawingCanvas.getContext('2d');
    drawingCtx.scale(dpr, dpr);
    drawingCtx.lineCap = 'round';
    drawingCtx.lineJoin = 'round';
    redrawAll(g);
  }

  function nextColor() {
    if (currentColor === 'rainbow') {
      rainbowHue = (rainbowHue + 4) % 360;
      return hsl(rainbowHue, 90, 55);
    }
    return currentColor;
  }

  function drawSegment(p1, p2, size) {
    drawingCtx.strokeStyle = p2.color;
    drawingCtx.lineWidth = size;
    drawingCtx.beginPath();
    drawingCtx.moveTo(p1.x, p1.y);
    drawingCtx.lineTo(p2.x, p2.y);
    drawingCtx.stroke();
  }

  function drawStamp(stamp) {
    const c = drawingCtx;
    c.save();
    c.translate(stamp.x, stamp.y);
    c.rotate(stamp.rotation);
    c.fillStyle = stamp.color;
    switch (stamp.shape) {
      case 'star':
        drawStar(c, 0, 0, stamp.size);
        break;
      case 'heart':
        drawHeart(c, 0, 0, stamp.size * 1.4);
        break;
      case 'flower': {
        const petal = stamp.size * 0.55;
        for (let i = 0; i < 6; i++) {
          const a = (i * Math.PI * 2) / 6;
          c.beginPath();
          c.ellipse(Math.cos(a) * petal, Math.sin(a) * petal, petal * 0.7, petal * 0.45, a, 0, Math.PI * 2);
          c.fill();
        }
        c.fillStyle = '#FFDD55';
        c.beginPath();
        c.arc(0, 0, petal * 0.5, 0, Math.PI * 2);
        c.fill();
        break;
      }
    }
    c.restore();
  }

  function redrawAll(g) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    drawingCtx.clearRect(0, 0, drawingCanvas.width / dpr, drawingCanvas.height / dpr);
    for (const st of strokes) {
      if (st.stamp) {
        drawStamp(st);
      } else {
        for (let i = 1; i < st.points.length; i++) {
          drawSegment(st.points[i - 1], st.points[i], st.size);
        }
        if (st.points.length === 1) {
          // 点だけのタップも丸として残す
          const p = st.points[0];
          drawingCtx.fillStyle = p.color;
          drawingCtx.beginPath();
          drawingCtx.arc(p.x, p.y, st.size / 2, 0, Math.PI * 2);
          drawingCtx.fill();
        }
      }
    }
  }

  function pushStroke(st) {
    strokes.push(st);
    if (strokes.length > MAX_STROKES) strokes.shift();
  }

  /* --- パレット UI --- */
  let gRef = null; // パレットのイベントから参照する

  function buildPalette() {
    const palette = document.getElementById('palette');
    const row1 = document.createElement('div');
    row1.className = 'palette-row';
    const row2 = document.createElement('div');
    row2.className = 'palette-row';
    palette.appendChild(row1);
    palette.appendChild(row2);

    // 色ボタン
    COLORS.forEach((c, i) => {
      const btn = document.createElement('button');
      btn.className = 'color-btn';
      btn.style.background = c.color === 'rainbow'
        ? 'conic-gradient(red, orange, yellow, green, blue, purple, red)'
        : c.color;
      if (i === 0) btn.classList.add('active');
      btn.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        currentColor = c.color;
        document.querySelectorAll('.color-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        GameV2.sound.play('bounce', 0.4);
      });
      row1.appendChild(btn);
    });

    // ペンの太さ
    const sizeBtns = [];
    PEN_SIZES.forEach((size, i) => {
      const btn = document.createElement('button');
      btn.className = 'tool-btn';
      if (size === currentSize) btn.classList.add('active');
      const dot = document.createElement('span');
      dot.className = 'size-dot';
      dot.style.width = `${8 + i * 7}px`;
      dot.style.height = `${8 + i * 7}px`;
      btn.appendChild(dot);
      btn.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        currentSize = size;
        stampMode = false;
        sizeBtns.forEach((b) => b.classList.remove('active'));
        stampBtn.classList.remove('active');
        btn.classList.add('active');
        GameV2.sound.play('bounce', 0.4);
      });
      sizeBtns.push(btn);
      row2.appendChild(btn);
    });

    // スタンプモード
    const stampBtn = document.createElement('button');
    stampBtn.className = 'tool-btn';
    stampBtn.textContent = '⭐';
    stampBtn.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      stampMode = !stampMode;
      stampBtn.classList.toggle('active', stampMode);
      if (stampMode) sizeBtns.forEach((b) => b.classList.remove('active'));
      else sizeBtns[PEN_SIZES.indexOf(currentSize)].classList.add('active');
      GameV2.sound.play('sparkle', 0.4);
    });
    row2.appendChild(stampBtn);

    // アンドゥ
    const undoBtn = document.createElement('button');
    undoBtn.className = 'tool-btn';
    undoBtn.textContent = '↩';
    undoBtn.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      if (strokes.length === 0 || !gRef) return;
      strokes.pop();
      redrawAll(gRef);
      GameV2.sound.play('pop', 0.4);
    });
    row2.appendChild(undoBtn);

    // ぜんぶけす
    const clearBtn = document.createElement('button');
    clearBtn.className = 'tool-btn';
    clearBtn.textContent = '✨';
    clearBtn.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      if (!gRef) return;
      strokes.length = 0;
      redrawAll(gRef);
      for (let i = 0; i < 30; i++) {
        gRef.particles.emit(rand(0, gRef.w), rand(0, gRef.h), 2, {
          speedMin: 10, speedMax: 50,
          sizeMin: 3, sizeMax: 8,
          lifeMin: 0.5, lifeMax: 1.5,
          gravity: -10, shape: 'star',
        });
      }
      GameV2.sound.play('sparkle', 0.5);
    });
    row2.appendChild(clearBtn);
  }

  function placeStamp(g, pos) {
    const stamp = {
      stamp: true,
      x: pos.x,
      y: pos.y,
      shape: STAMP_SHAPES[stampIndex % STAMP_SHAPES.length],
      color: nextColor(),
      size: 26 * g.S,
      rotation: rand(-0.3, 0.3),
    };
    stampIndex++;
    pushStroke(stamp);
    drawStamp(stamp);
    g.particles.emit(pos.x, pos.y, 8, {
      speedMin: 20 * g.S, speedMax: 80 * g.S,
      sizeMin: 2 * g.S, sizeMax: 5 * g.S,
      lifeMin: 0.3, lifeMax: 0.8,
      gravity: 20 * g.S, shape: 'star',
    });
    GameV2.sound.play('happy', 0.5);
  }

  GameV2.run({
    duration: null, // タイマーなしの自由あそび
    bgm: 'calm',
    maxParticles: 250,

    onInit(g) {
      gRef = g;
      setupLayer(g);
      buildPalette();
    },

    onResize(g) {
      setupLayer(g); // ストローク再生で絵は消えない
    },

    onPointerDown(g, pos) {
      if (stampMode) {
        placeStamp(g, pos);
        return;
      }
      liveStroke = {
        size: currentSize * Math.max(1, g.S * 0.85),
        points: [{ x: pos.x, y: pos.y, color: nextColor() }],
      };
      pushStroke(liveStroke);
      GameV2.sound.play('splash', 0.3);
    },

    onPointerMove(g, pos) {
      if (!liveStroke) return;
      const prev = liveStroke.points[liveStroke.points.length - 1];
      const p = { x: pos.x, y: pos.y, color: nextColor() };
      liveStroke.points.push(p);
      drawSegment(prev, p, liveStroke.size);
      // ペン先のキラキラ
      if (Math.random() < 0.35) {
        g.particles.emit(pos.x, pos.y, 1, {
          speedMin: 10 * g.S, speedMax: 40 * g.S,
          sizeMin: 2 * g.S, sizeMax: 4 * g.S,
          lifeMin: 0.3, lifeMax: 0.7,
          gravity: 30 * g.S,
          hue: currentColor === 'rainbow' ? rainbowHue : null,
          shape: 'star',
        });
      }
    },

    onPointerUp(g) {
      if (liveStroke && liveStroke.points.length === 1) {
        redrawAll(g); // タップだけの点を丸として確定
      }
      liveStroke = null;
    },

    onDraw(g, ctx) {
      ctx.fillStyle = '#FFF8F0';
      ctx.fillRect(0, 0, g.w, g.h);
      ctx.drawImage(drawingCanvas, 0, 0, g.w, g.h);
    },
  });
})();
