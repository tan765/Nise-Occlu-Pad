/* === 共通ユーティリティ === */

/**
 * Canvas を Retina 対応でセットアップ
 * @param {HTMLCanvasElement} canvas
 * @returns {CanvasRenderingContext2D}
 */
function setupCanvas(canvas) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  // CSS サイズを保持（描画座標は CSS ピクセルで統一）
  canvas._cssWidth = rect.width;
  canvas._cssHeight = rect.height;
  return ctx;
}

/**
 * リサイズ時に Canvas を再セットアップ
 */
function onResize(canvas, callback) {
  let timeout;
  window.addEventListener('resize', () => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      const ctx = setupCanvas(canvas);
      if (callback) callback(ctx);
    }, 100);
  });
}

/**
 * Pointer イベントから CSS 座標を取得
 */
function getPointerPos(canvas, e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  };
}

/**
 * ランダムな色（高彩度・明るめ）を生成
 */
function randomBrightColor() {
  const hue = Math.random() * 360;
  return `hsl(${hue}, 90%, 65%)`;
}

/**
 * 範囲内のランダム値
 */
function rand(min, max) {
  return min + Math.random() * (max - min);
}

/**
 * 範囲内のランダム整数
 */
function randInt(min, max) {
  return Math.floor(rand(min, max + 1));
}

/**
 * 2点間の距離
 */
function dist(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * HSL 文字列を生成
 */
function hsl(h, s, l) {
  return `hsl(${h}, ${s}%, ${l}%)`;
}

/**
 * HSLA 文字列を生成
 */
function hsla(h, s, l, a) {
  return `hsla(${h}, ${s}%, ${l}%, ${a})`;
}

/**
 * 画面幅ベースのスケール係数（iPhone 375px 基準）
 * タブレットではオブジェクト・速度を比例拡大
 */
function getScale(canvas) {
  return Math.max(1, Math.min(3, canvas._cssWidth / 375));
}

/**
 * スケーリング付きフォント文字列
 */
function scaledFont(basePx, scale, weight) {
  return `${weight || 'bold'} ${Math.round(basePx * scale)}px "Hiragino Sans", sans-serif`;
}
