/* === パーティクルエンジン === */

class Particle {
  constructor() {
    this.reset();
  }

  reset() {
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.life = 0;
    this.maxLife = 0;
    this.size = 0;
    this.hue = 0;
    this.saturation = 90;
    this.lightness = 65;
    this.shape = 'circle'; // 'circle', 'star', 'heart'
    this.gravity = 0;
    this.friction = 1;
    this.active = false;
  }

  update(dt) {
    this.life -= dt;
    if (this.life <= 0) {
      this.active = false;
      return;
    }
    this.vy += this.gravity * dt;
    this.vx *= this.friction;
    this.vy *= this.friction;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }

  get alpha() {
    return Math.max(0, this.life / this.maxLife);
  }

  get currentSize() {
    return this.size * this.alpha;
  }
}

class ParticleSystem {
  constructor(maxParticles = 500) {
    this.pool = [];
    this.active = [];
    for (let i = 0; i < maxParticles; i++) {
      this.pool.push(new Particle());
    }
  }

  acquire() {
    if (this.pool.length > 0) {
      const p = this.pool.pop();
      p.active = true;
      this.active.push(p);
      return p;
    }
    return null;
  }

  /**
   * パーティクルを放出
   * @param {number} x - 中心 X
   * @param {number} y - 中心 Y
   * @param {number} count - 数
   * @param {object} config - オプション
   */
  emit(x, y, count, config = {}) {
    const {
      speedMin = 50,
      speedMax = 200,
      sizeMin = 3,
      sizeMax = 8,
      lifeMin = 0.5,
      lifeMax = 1.2,
      gravity = 80,
      friction = 0.98,
      hue = null,
      shape = 'circle',
      spread = Math.PI * 2
    } = config;

    for (let i = 0; i < count; i++) {
      const p = this.acquire();
      if (!p) break;

      const angle = -Math.PI / 2 + (Math.random() - 0.5) * spread;
      const speed = rand(speedMin, speedMax);

      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.size = rand(sizeMin, sizeMax);
      p.life = rand(lifeMin, lifeMax);
      p.maxLife = p.life;
      p.hue = hue !== null ? hue : Math.random() * 360;
      p.saturation = 90;
      p.lightness = 65;
      p.gravity = gravity;
      p.friction = friction;
      p.shape = shape;
    }
  }

  update(dt) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const p = this.active[i];
      p.update(dt);
      if (!p.active) {
        p.reset();
        this.pool.push(p);
        this.active.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    for (const p of this.active) {
      const s = p.currentSize;
      if (s <= 0) continue;

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = hsl(p.hue, p.saturation, p.lightness);
      ctx.translate(p.x, p.y);

      switch (p.shape) {
        case 'star':
          drawStar(ctx, 0, 0, s);
          break;
        case 'heart':
          drawHeart(ctx, 0, 0, s);
          break;
        default:
          ctx.beginPath();
          ctx.arc(0, 0, s, 0, Math.PI * 2);
          ctx.fill();
      }

      ctx.restore();
    }
  }

  clear() {
    while (this.active.length > 0) {
      const p = this.active.pop();
      p.reset();
      this.pool.push(p);
    }
  }
}

/**
 * 星を描画
 */
function drawStar(ctx, x, y, size) {
  const spikes = 5;
  const outerRadius = size;
  const innerRadius = size * 0.4;
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = (i * Math.PI) / spikes - Math.PI / 2;
    const px = x + Math.cos(angle) * r;
    const py = y + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

/**
 * ハートを描画
 */
function drawHeart(ctx, x, y, size) {
  const s = size * 0.6;
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.3);
  ctx.bezierCurveTo(x, y - s * 0.5, x - s, y - s * 0.5, x - s, y + s * 0.1);
  ctx.bezierCurveTo(x - s, y + s * 0.6, x, y + s, x, y + s);
  ctx.bezierCurveTo(x, y + s, x + s, y + s * 0.6, x + s, y + s * 0.1);
  ctx.bezierCurveTo(x + s, y - s * 0.5, x, y - s * 0.5, x, y + s * 0.3);
  ctx.closePath();
  ctx.fill();
}
