/* === 音声管理 (Web Audio API) === */

class SoundManager {
  constructor() {
    this.ctx = null;
    this.buffers = {};
    this.enabled = true;
    this.initialized = false;
  }

  /**
   * 最初のユーザー操作時に呼ぶ
   */
  init() {
    if (this.initialized) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.initialized = true;
    // suspended 状態なら resume
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  /**
   * 効果音を生成（外部ファイル不要のシンセ音）
   */
  createSounds() {
    this.init();
    // すべての効果音をプログラム的に生成
    this._createPop();
    this._createSparkle();
    this._createSplash();
    this._createHappy();
    this._createBounce();
    this._createBgm();
  }

  /** ポン！（風船、シャボン玉） */
  _createPop() {
    const sr = this.ctx.sampleRate;
    const len = sr * 0.15;
    const buf = this.ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const env = Math.exp(-t * 30);
      data[i] = env * (Math.random() * 2 - 1) * 0.5 +
                env * Math.sin(t * 800 * Math.PI * 2) * 0.3;
    }
    this.buffers.pop = buf;
  }

  /** キラキラ（タッチでキラキラ、きらきらさかな） */
  _createSparkle() {
    const sr = this.ctx.sampleRate;
    const len = sr * 0.3;
    const buf = this.ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const env = Math.exp(-t * 8);
      data[i] = env * (
        Math.sin(t * 2000 * Math.PI * 2) * 0.2 +
        Math.sin(t * 3000 * Math.PI * 2) * 0.15 +
        Math.sin(t * 4500 * Math.PI * 2) * 0.1
      );
    }
    this.buffers.sparkle = buf;
  }

  /** しゃわ（おえかきの線） */
  _createSplash() {
    const sr = this.ctx.sampleRate;
    const len = sr * 0.1;
    const buf = this.ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const env = Math.exp(-t * 20);
      data[i] = env * Math.sin(t * 600 * Math.PI * 2) * 0.2;
    }
    this.buffers.splash = buf;
  }

  /** ピロリン！（ヒット時のハッピー音） */
  _createHappy() {
    const sr = this.ctx.sampleRate;
    const len = sr * 0.4;
    const buf = this.ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const env = Math.exp(-t * 5);
      // 上昇音程
      const freq = 600 + t * 1200;
      data[i] = env * Math.sin(t * freq * Math.PI * 2) * 0.25;
    }
    this.buffers.happy = buf;
  }

  /** ぽよん（バウンス音） */
  _createBounce() {
    const sr = this.ctx.sampleRate;
    const len = sr * 0.2;
    const buf = this.ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const env = Math.exp(-t * 15);
      const freq = 300 * Math.exp(-t * 5);
      data[i] = env * Math.sin(t * freq * Math.PI * 2) * 0.3;
    }
    this.buffers.bounce = buf;
  }

  /** 穏やかな BGM ループ */
  _createBgm() {
    const sr = this.ctx.sampleRate;
    const bpm = 80;
    const beatLen = 60 / bpm;
    const bars = 4;
    const totalLen = Math.floor(sr * beatLen * 4 * bars);
    const buf = this.ctx.createBuffer(1, totalLen, sr);
    const data = buf.getChannelData(0);

    // シンプルなペンタトニックメロディ
    const notes = [262, 294, 330, 392, 440, 392, 330, 294,
                   330, 392, 440, 523, 440, 392, 330, 262];
    const noteLen = totalLen / notes.length;

    for (let n = 0; n < notes.length; n++) {
      const freq = notes[n];
      const start = Math.floor(n * noteLen);
      const end = Math.floor((n + 1) * noteLen);
      for (let i = start; i < end && i < totalLen; i++) {
        const t = (i - start) / sr;
        const localT = (i - start) / (end - start);
        // フェードイン・フェードアウト
        const env = Math.sin(localT * Math.PI) * 0.12;
        data[i] = env * Math.sin(t * freq * Math.PI * 2);
      }
    }
    this.buffers.bgm = buf;
  }

  /**
   * 効果音を再生
   */
  play(name, volume = 1.0) {
    if (!this.enabled || !this.ctx || !this.buffers[name]) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const source = this.ctx.createBufferSource();
    source.buffer = this.buffers[name];
    const gain = this.ctx.createGain();
    gain.gain.value = volume;
    source.connect(gain);
    gain.connect(this.ctx.destination);
    source.start(0);
  }

  /**
   * BGM をループ再生
   */
  playBgm() {
    if (!this.enabled || !this.ctx || !this.buffers.bgm) return;
    this.stopBgm();
    if (this.ctx.state === 'suspended') this.ctx.resume();

    this._bgmSource = this.ctx.createBufferSource();
    this._bgmSource.buffer = this.buffers.bgm;
    this._bgmSource.loop = true;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.3;
    this._bgmSource.connect(gain);
    gain.connect(this.ctx.destination);
    this._bgmSource.start(0);
    this._bgmGain = gain;
  }

  stopBgm() {
    if (this._bgmSource) {
      try { this._bgmSource.stop(); } catch (e) {}
      this._bgmSource = null;
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    if (!this.enabled) {
      this.stopBgm();
    } else {
      this.playBgm();
    }
    return this.enabled;
  }
}

// グローバルインスタンス
const soundManager = new SoundManager();
