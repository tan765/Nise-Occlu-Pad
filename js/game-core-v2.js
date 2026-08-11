/* === ver2 共通基盤 ===
 * 既存の utils.js / particles.js / audio.js を読み込んだ後に読み込むこと。
 * 公開するグローバルは window.GameV2 のみ。
 * ver2 ゲーム群のタイマー・リザルト・ポインタ処理・音管理をここに集約する。
 */
(() => {
  'use strict';

  const SOUND_KEY = 'kirakira-sound-v2';

  /* --- 音管理: 既存 SoundManager の問題点を修正するサブクラス ---
   * ・createSounds() の毎回再合成を1回きりに
   * ・toggle() が BGM 未開始でも鳴らしてしまう問題を修正
   * ・ON/OFF を localStorage で永続化（ゲーム間で引き継ぐ）
   */
  class SoundManagerV2 extends SoundManager {
    constructor() {
      super();
      this._ready = false;
      this._bgmWanted = false;
      try {
        this.enabled = localStorage.getItem(SOUND_KEY) !== '0';
      } catch (e) { /* プライベートブラウズ等では既定 ON */ }
    }

    /** バッファ合成を1回だけ実行 */
    ensureReady() {
      if (this._ready) return;
      this.init();
      this.createSounds();
      this._createFanfare();
      this._createMiss();
      this._ready = true;
    }

    /** 初回ユーザージェスチャで呼ぶ（ハーネスが自動で呼ぶ） */
    unlock() {
      this.ensureReady();
      if (this.ctx.state === 'suspended') this.ctx.resume();
      if (!this._bgmWanted) {
        this._bgmWanted = true;
        if (this.enabled) this.playBgm();
      }
    }

    toggle() {
      this.enabled = !this.enabled;
      try { localStorage.setItem(SOUND_KEY, this.enabled ? '1' : '0'); } catch (e) {}
      if (!this.enabled) {
        this.stopBgm();
      } else if (this._bgmWanted && this._ready) {
        this.playBgm();
      }
      return this.enabled;
    }

    /** リザルト用ファンファーレ（ド・ミ・ソ・ド↑のアルペジオ） */
    _createFanfare() {
      const sr = this.ctx.sampleRate;
      const notes = [523, 659, 784, 1047];
      const noteDur = 0.16;
      const tailDur = 0.5;
      const len = Math.floor(sr * (notes.length * noteDur + tailDur));
      const buf = this.ctx.createBuffer(1, len, sr);
      const data = buf.getChannelData(0);
      for (let n = 0; n < notes.length; n++) {
        const freq = notes[n];
        const start = Math.floor(n * noteDur * sr);
        const isLast = n === notes.length - 1;
        const dur = isLast ? noteDur + tailDur : noteDur * 1.2;
        const end = Math.min(len, start + Math.floor(dur * sr));
        for (let i = start; i < end; i++) {
          const t = (i - start) / sr;
          const env = Math.exp(-t * (isLast ? 4 : 10));
          data[i] += env * (
            Math.sin(t * freq * Math.PI * 2) * 0.22 +
            Math.sin(t * freq * 2 * Math.PI * 2) * 0.07
          );
        }
      }
      this.buffers.fanfare = buf;
    }

    /** やさしい失敗音（低めに下がるぽよん） */
    _createMiss() {
      const sr = this.ctx.sampleRate;
      const len = Math.floor(sr * 0.3);
      const buf = this.ctx.createBuffer(1, len, sr);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        const t = i / sr;
        const env = Math.exp(-t * 9);
        const freq = 280 - t * 350;
        data[i] = env * Math.sin(t * freq * Math.PI * 2) * 0.25;
      }
      this.buffers.miss = buf;
    }
  }

  const sound = new SoundManagerV2();

  /* --- 汎用描画ヘルパー --- */

  /** Safari 16 未満対応の角丸パス（beginPath 込み） */
  function roundRectPath(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(x, y, w, h, r);
      return;
    }
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /** もこもこ雲（fillStyle は呼び出し側で設定） */
  function drawCloud(ctx, x, y, size) {
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.arc(x + size * 0.8, y - size * 0.2, size * 0.7, 0, Math.PI * 2);
    ctx.arc(x + size * 1.4, y, size * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }

  function hitRect(pos, rect) {
    return pos.x >= rect.x && pos.x <= rect.x + rect.w &&
           pos.y >= rect.y && pos.y <= rect.y + rect.h;
  }

  /* --- ゲームハーネス ---
   * GameV2.run({
   *   duration: 60,            // 秒。null なら時間無制限（タイマー/リザルトなし）
   *   unit: 'こ',              // リザルトのスコア単位
   *   unitSuffix: 'とれたよ！', // スコアの後に出す文言
   *   thresholds: [10,20,30],  // 星1〜3のしきい値（省略時は星なし）
   *   maxParticles: 500,
   *   onInit(g) {},            // 最初に1回（リサイズ確定後）
   *   onResize(g) {},          // リサイズごと
   *   onStart(g) {},           // ready → playing になった瞬間
   *   onUpdate(g, dt, t) {},   // playing 中のみ毎フレーム
   *   onDraw(g, ctx, t) {},    // 毎フレーム（背景含めゲーム側で描く）
   *   onPointerDown(g, pos, e) {},
   *   onPointerMove(g, pos, e) {},
   *   onPointerUp(g, pos, e) {},
   *   onReset(g) {},           // 「もういっかい」時
   * });
   */
  function run(cfg) {
    const canvas = document.getElementById('canvas');
    const timed = cfg.duration != null;

    const g = {
      canvas,
      ctx: null,
      w: 0, h: 0, S: 1,
      state: timed ? 'ready' : 'playing',
      score: 0,
      timeLeft: timed ? cfg.duration : Infinity,
      elapsed: 0,
      combo: 0,
      bestCombo: 0,
      dragging: false,
      sound,
      particles: new ParticleSystem(cfg.maxParticles || 500),
      _texts: [],
      _comboTimer: 0,
      _lastSecs: null,
      _dragId: null,
      _resultAt: 0,
      _replayBtn: { x: 0, y: 0, w: 0, h: 0 },
    };

    /** スコア加算＋コンボ更新。3連続以上で「◯れんぞく！」表示 */
    g.hit = function (points = 1, x = null, y = null) {
      g.score += points;
      g.combo++;
      g._comboTimer = 2.0;
      if (g.combo > g.bestCombo) g.bestCombo = g.combo;
      if (g.combo >= 3 && x !== null) {
        g.addFloatText(`${g.combo}れんぞく！`, x, y - 40 * g.S, { color: '#FFD700', size: 22 });
      }
      return points;
    };

    /** コンボを切る＋やさしい失敗音 */
    g.miss = function () {
      g.combo = 0;
      g._comboTimer = 0;
      sound.play('miss', 0.6);
    };

    /** ふわっと浮かんで消えるテキスト */
    g.addFloatText = function (str, x, y, opts = {}) {
      g._texts.push({
        str, x, y,
        vy: -(opts.rise || 50) * g.S,
        life: opts.life || 0.9,
        maxLife: opts.life || 0.9,
        color: opts.color || '#fff',
        size: opts.size || 20,
      });
    };

    function resize() {
      g.ctx = setupCanvas(canvas);
      g.w = canvas._cssWidth;
      g.h = canvas._cssHeight;
      g.S = getScale(canvas);
      g._replayBtn.w = 220 * g.S;
      g._replayBtn.h = 60 * g.S;
      if (cfg.onResize) cfg.onResize(g);
    }
    resize();
    onResize(canvas, () => resize());

    if (cfg.onInit) cfg.onInit(g);

    /* --- ポインタ処理（isPrimary ガード＋pointerId 追跡） --- */
    canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (!e.isPrimary || g._dragId !== null) return;
      sound.unlock();
      const pos = getPointerPos(canvas, e);

      if (g.state === 'result') {
        // 演出直後の誤タップ防止に 0.5 秒待ってから受け付ける
        if (performance.now() - g._resultAt > 500 && hitRect(pos, g._replayBtn)) {
          resetGame();
        }
        return;
      }

      g._dragId = e.pointerId;
      g.dragging = true;
      try { canvas.setPointerCapture(e.pointerId); } catch (err) {}

      if (g.state === 'ready') {
        g.state = 'playing';
        if (cfg.onStart) cfg.onStart(g);
      }
      if (cfg.onPointerDown) cfg.onPointerDown(g, pos, e);
    });

    canvas.addEventListener('pointermove', (e) => {
      e.preventDefault();
      if (e.pointerId !== g._dragId || g.state !== 'playing') return;
      if (cfg.onPointerMove) cfg.onPointerMove(g, getPointerPos(canvas, e), e);
    });

    function endPointer(e) {
      if (e.pointerId !== g._dragId) return;
      g._dragId = null;
      g.dragging = false;
      if (g.state === 'playing' && cfg.onPointerUp) {
        cfg.onPointerUp(g, getPointerPos(canvas, e), e);
      }
    }
    canvas.addEventListener('pointerup', endPointer);
    canvas.addEventListener('pointercancel', endPointer);

    /* --- 音ボタン --- */
    const soundBtn = document.getElementById('soundBtn');
    if (soundBtn) {
      soundBtn.textContent = sound.enabled ? '🔊' : '🔇';
      soundBtn.addEventListener('click', () => {
        soundBtn.textContent = sound.toggle() ? '🔊' : '🔇';
      });
    }

    /* --- バックグラウンド時は BGM を止め、復帰時に再開 --- */
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        sound.stopBgm();
      } else if (sound.enabled && sound._bgmWanted && sound._ready) {
        sound.playBgm();
      }
    });

    function resetGame() {
      g.score = 0;
      g.combo = 0;
      g.bestCombo = 0;
      g._comboTimer = 0;
      g.elapsed = 0;
      g.timeLeft = timed ? cfg.duration : Infinity;
      g.state = timed ? 'ready' : 'playing';
      g._texts.length = 0;
      g.particles.clear();
      if (cfg.onReset) cfg.onReset(g);
    }

    function finishGame() {
      g.state = 'result';
      g._resultAt = performance.now();
      sound.play('fanfare', 0.8);
      // 紙吹雪
      for (let i = 0; i < 4; i++) {
        g.particles.emit(g.w * (0.2 + i * 0.2), g.h * 0.25, 25, {
          speedMin: 80 * g.S, speedMax: 260 * g.S,
          sizeMin: 4 * g.S, sizeMax: 9 * g.S,
          lifeMin: 0.8, lifeMax: 1.8,
          gravity: 160 * g.S,
          shape: i % 2 === 0 ? 'star' : 'circle',
        });
      }
    }

    /* --- HUD --- */
    function drawHud(ctx, t) {
      if (!timed || g.state !== 'playing') return;
      const S = g.S;
      const secs = Math.ceil(g.timeLeft);
      const urgent = secs <= 10;

      // 残り5秒でカウント音
      if (secs !== g._lastSecs) {
        if (g._lastSecs !== null && secs <= 5 && secs > 0) sound.play('note4', 0.4);
        g._lastSecs = secs;
      }

      ctx.save();
      // タイマーピル（中央上）
      const pulse = urgent ? 1 + 0.08 * Math.sin(t / 120) : 1;
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      roundRectPath(ctx, g.w / 2 - 44 * S, 12 * S, 88 * S, 36 * S, 18 * S);
      ctx.fill();
      ctx.fillStyle = urgent ? '#ff6666' : '#fff';
      ctx.font = scaledFont(Math.round(22 * pulse), S);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${secs}`, g.w / 2, 30 * S);

      // スコアピル（タイマーの右）
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      roundRectPath(ctx, g.w / 2 + 52 * S, 12 * S, 96 * S, 36 * S, 18 * S);
      ctx.fill();
      ctx.fillStyle = '#FFD700';
      ctx.font = scaledFont(20, S);
      ctx.fillText(`⭐ ${g.score}`, g.w / 2 + 100 * S, 30 * S);
      ctx.restore();
    }

    function drawFloatTexts(ctx, dt) {
      for (let i = g._texts.length - 1; i >= 0; i--) {
        const ft = g._texts[i];
        ft.life -= dt;
        if (ft.life <= 0) { g._texts.splice(i, 1); continue; }
        ft.y += ft.vy * dt;
        ctx.save();
        ctx.globalAlpha = Math.min(1, ft.life / (ft.maxLife * 0.5));
        ctx.fillStyle = ft.color;
        ctx.font = scaledFont(ft.size, g.S);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        ctx.lineWidth = 4 * g.S;
        ctx.lineJoin = 'round';
        ctx.strokeText(ft.str, ft.x, ft.y);
        ctx.fillText(ft.str, ft.x, ft.y);
        ctx.restore();
      }
    }

    function drawReadyOverlay(ctx, t) {
      const S = g.S;
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(0, 0, g.w, g.h);
      const pulse = 1 + 0.06 * Math.sin(t / 300);
      ctx.fillStyle = '#fff';
      ctx.font = scaledFont(Math.round(30 * pulse), S);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('タッチしてスタート！', g.w / 2, g.h * 0.5);
      if (cfg.readyHint) {
        ctx.font = scaledFont(18, S);
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        ctx.fillText(cfg.readyHint, g.w / 2, g.h * 0.58);
      }
      ctx.restore();
    }

    function drawResultOverlay(ctx) {
      const S = g.S;
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(0, 0, g.w, g.h);

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff';
      ctx.font = scaledFont(40, S);
      ctx.fillText('おわり！', g.w / 2, g.h * 0.24);

      // 星評価
      if (cfg.thresholds) {
        const stars = cfg.thresholds.filter((th) => g.score >= th).length;
        const starSize = 26 * S;
        const gap = 74 * S;
        for (let i = 0; i < 3; i++) {
          const x = g.w / 2 + (i - 1) * gap;
          const y = g.h * 0.34;
          ctx.fillStyle = i < stars ? '#FFD700' : 'rgba(255,255,255,0.18)';
          drawStar(ctx, x, y, starSize);
        }
      }

      ctx.fillStyle = '#FFD700';
      ctx.font = scaledFont(64, S);
      ctx.fillText(`${g.score}`, g.w / 2, g.h * 0.46);

      ctx.fillStyle = '#fff';
      ctx.font = scaledFont(22, S);
      ctx.fillText(`${cfg.unit || ''}${cfg.unitSuffix || ''}`, g.w / 2, g.h * 0.56);

      if (g.bestCombo >= 3) {
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        ctx.font = scaledFont(17, S);
        ctx.fillText(`さいだい ${g.bestCombo} れんぞく！`, g.w / 2, g.h * 0.615);
      }

      // もういっかいボタン
      const btn = g._replayBtn;
      btn.x = g.w / 2 - btn.w / 2;
      btn.y = g.h * 0.68;
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      roundRectPath(ctx, btn.x, btn.y, btn.w, btn.h, 30 * S);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 2 * S;
      roundRectPath(ctx, btn.x, btn.y, btn.w, btn.h, 30 * S);
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.font = scaledFont(24, S);
      ctx.fillText('もういっかい', g.w / 2, btn.y + btn.h / 2);
      ctx.restore();
    }

    /* --- メインループ --- */
    let lastTime = 0;
    function animate(time) {
      const dt = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;
      const ctx = g.ctx;

      if (g.state === 'playing') {
        g.elapsed += dt;
        if (g._comboTimer > 0) {
          g._comboTimer -= dt;
          if (g._comboTimer <= 0) g.combo = 0;
        }
        if (timed) {
          g.timeLeft -= dt;
          if (g.timeLeft <= 0) {
            g.timeLeft = 0;
            finishGame();
          }
        }
        if (g.state === 'playing' && cfg.onUpdate) cfg.onUpdate(g, dt, time);
      }

      cfg.onDraw(g, ctx, time);

      g.particles.update(dt);
      g.particles.draw(ctx);
      drawFloatTexts(ctx, dt);
      drawHud(ctx, time);

      if (g.state === 'ready') drawReadyOverlay(ctx, time);
      if (g.state === 'result') drawResultOverlay(ctx);

      requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);

    return g;
  }

  window.GameV2 = {
    run,
    sound,
    roundRectPath,
    drawCloud,
    hitRect,
  };
})();
