/**
 * CueRogue - High-performance Particle & Screen Shake Engine
 * Handles impact sparks, shockwaves, smoke, floating Balatro score popups, and camera shakes.
 */

class Particle {
  constructor(x, y, vx, vy, color, size, life, shape = 'circle', alpha = 1.0) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = color;
    this.size = size;
    this.initialSize = size;
    this.life = life;
    this.maxLife = life;
    this.shape = shape;
    this.alpha = alpha;
    this.rotation = Math.random() * Math.PI * 2;
    this.vRot = (Math.random() - 0.5) * 8;
    this.drag = 0.96;
    this.gravity = 0;
  }

  update(dt) {
    this.life -= dt;
    this.vx *= this.drag;
    this.vy *= this.drag;
    this.vy += this.gravity * dt;
    this.x += this.vx * dt * 60;
    this.y += this.vy * dt * 60;
    this.rotation += this.vRot * dt;
    return this.life > 0;
  }

  draw(ctx) {
    const progress = Math.max(0, this.life / this.maxLife);
    const currentAlpha = this.alpha * progress;
    if (currentAlpha <= 0) return;

    ctx.save();
    ctx.globalAlpha = currentAlpha;
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    if (this.shape === 'circle') {
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(0, 0, this.size * progress, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.shape === 'spark') {
      ctx.strokeStyle = this.color;
      ctx.lineWidth = Math.max(1, this.size * 0.5 * progress);
      ctx.beginPath();
      ctx.moveTo(-this.size, 0);
      ctx.lineTo(this.size, 0);
      ctx.stroke();
    } else if (this.shape === 'shard') {
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.moveTo(-this.size * 0.8, -this.size * 0.5);
      ctx.lineTo(this.size * 0.9, -this.size * 0.2);
      ctx.lineTo(this.size * 0.3, this.size * 0.7);
      ctx.closePath();
      ctx.fill();
    } else if (this.shape === 'ring') {
      ctx.strokeStyle = this.color;
      ctx.lineWidth = Math.max(1, 4 * progress);
      ctx.beginPath();
      ctx.arc(0, 0, this.size * (2 - progress), 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }
}

class FloatingText {
  constructor(text, x, y, color = '#ffffff', fontSize = 16, weight = '800', isCritical = false) {
    this.text = text;
    this.x = x;
    this.y = y;
    this.color = color;
    this.fontSize = fontSize;
    this.weight = weight;
    this.isCritical = isCritical;
    this.life = 1.1; // seconds
    this.maxLife = 1.1;
    this.vy = -1.2;
    this.scale = 0.5;
    this.targetScale = isCritical ? 1.4 : 1.0;
  }

  update(dt) {
    this.life -= dt;
    this.y += this.vy * dt * 60;
    this.scale += (this.targetScale - this.scale) * 0.2;
    return this.life > 0;
  }

  draw(ctx) {
    const progress = Math.max(0, this.life / this.maxLife);
    const alpha = Math.min(1.0, progress * 1.8);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(this.x, this.y);
    ctx.scale(this.scale, this.scale);

    ctx.font = `${this.weight} ${this.fontSize}px 'Outfit', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Glow / Outline
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    ctx.lineJoin = 'round';
    ctx.strokeText(this.text, 0, 0);

    ctx.fillStyle = this.color;
    ctx.fillText(this.text, 0, 0);

    ctx.restore();
  }
}

export class ParticleSystem {
  constructor() {
    this.particles = [];
    this.floatingTexts = [];
    this.shakeIntensity = 0;
    this.shakeDuration = 0;
    this.shakeOffset = { x: 0, y: 0 };
  }

  shake(intensity = 6, duration = 0.25) {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    this.shakeDuration = Math.max(this.shakeDuration, duration);
  }

  addText(text, x, y, color = '#ffffff', fontSize = 16, isCritical = false) {
    this.floatingTexts.push(new FloatingText(text, x, y, color, fontSize, '800', isCritical));
  }

  createCueStrikeDust(x, y, angle, powerRatio) {
    const count = Math.floor(10 + powerRatio * 15);
    for (let i = 0; i < count; i++) {
      const spread = (Math.random() - 0.5) * 0.9;
      const speed = (2 + Math.random() * 5) * powerRatio;
      const vx = Math.cos(angle + Math.PI + spread) * speed;
      const vy = Math.sin(angle + Math.PI + spread) * speed;
      const size = 2 + Math.random() * 3;
      const life = 0.3 + Math.random() * 0.3;
      this.particles.push(new Particle(x, y, vx, vy, '#00f0ff', size, life, 'circle', 0.8));
    }
  }

  createBallImpactSparks(x, y, colorA = '#ffffff', colorB = '#ff2a85', intensity = 1.0) {
    const count = Math.floor(8 + intensity * 8);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (2 + Math.random() * 6) * intensity;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const color = Math.random() > 0.5 ? colorA : colorB;
      const size = 3 + Math.random() * 3;
      const life = 0.2 + Math.random() * 0.25;
      this.particles.push(new Particle(x, y, vx, vy, color, size, life, 'spark', 0.9));
    }
  }

  createCushionImpact(x, y, normalAngle, intensity = 1.0) {
    const count = 6;
    for (let i = 0; i < count; i++) {
      const spread = (Math.random() - 0.5) * 1.2;
      const speed = (2 + Math.random() * 4) * intensity;
      const vx = Math.cos(normalAngle + spread) * speed;
      const vy = Math.sin(normalAngle + spread) * speed;
      const life = 0.2 + Math.random() * 0.2;
      this.particles.push(new Particle(x, y, vx, vy, '#00ff88', 2.5, life, 'circle', 0.7));
    }
  }

  createExplosion(x, y) {
    this.shake(16, 0.45);
    // Shockwave ring
    this.particles.push(new Particle(x, y, 0, 0, '#ff3344', 60, 0.4, 'ring', 1.0));
    this.particles.push(new Particle(x, y, 0, 0, '#ffd700', 85, 0.5, 'ring', 0.8));

    // Fire and embers
    for (let i = 0; i < 45; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 11;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const color = ['#ff2a85', '#ff9900', '#ffd700', '#ffffff'][Math.floor(Math.random() * 4)];
      const size = 3 + Math.random() * 5;
      const life = 0.4 + Math.random() * 0.5;
      const p = new Particle(x, y, vx, vy, color, size, life, 'circle', 0.95);
      p.drag = 0.94;
      this.particles.push(p);
    }
  }

  createGlassBreak(x, y) {
    this.shake(6, 0.25);
    for (let i = 0; i < 24; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 8;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const color = ['#ffffff', '#00f0ff', '#e0f7fa'][Math.floor(Math.random() * 3)];
      const size = 4 + Math.random() * 4;
      const life = 0.35 + Math.random() * 0.4;
      const p = new Particle(x, y, vx, vy, color, size, life, 'shard', 0.9);
      p.drag = 0.93;
      this.particles.push(p);
    }
  }

  createPocketSuckVortex(x, y, color = '#c4b5fd') {
    for (let i = 0; i < 14; i++) {
      const dist = 12 + Math.random() * 18;
      const angle = Math.random() * Math.PI * 2;
      const px = x + Math.cos(angle) * dist;
      const py = y + Math.sin(angle) * dist;
      const inwardAngle = angle + Math.PI + 0.3; // Slight swirl
      const speed = 2 + Math.random() * 3;
      const vx = Math.cos(inwardAngle) * speed;
      const vy = Math.sin(inwardAngle) * speed;
      const life = 0.25 + Math.random() * 0.2;
      this.particles.push(new Particle(px, py, vx, vy, color, 3, life, 'circle', 0.8));
    }
  }

  createGoldSparkle(x, y) {
    for (let i = 0; i < 4; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 2;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      this.particles.push(new Particle(x, y, vx, vy, '#ffd700', 2.5, 0.3, 'spark', 0.9));
    }
  }

  createVampireLeech(fromX, fromY, toX, toY) {
    const angle = Math.atan2(toY - fromY, toX - fromX);
    const dist = Math.hypot(toX - fromX, toY - fromY);
    const speed = 6;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    const life = (dist / (speed * 60)) + 0.1;
    this.particles.push(new Particle(fromX, fromY, vx, vy, '#ff1744', 4, life, 'circle', 0.9));
  }

  update(dt) {
    // Screen shake update
    if (this.shakeDuration > 0) {
      this.shakeDuration -= dt;
      const magnitude = this.shakeIntensity * (this.shakeDuration > 0 ? 1 : 0);
      this.shakeOffset.x = (Math.random() * 2 - 1) * magnitude;
      this.shakeOffset.y = (Math.random() * 2 - 1) * magnitude;
      if (this.shakeDuration <= 0) {
        this.shakeIntensity = 0;
        this.shakeOffset.x = 0;
        this.shakeOffset.y = 0;
      }
    }

    // Particles update
    for (let i = this.particles.length - 1; i >= 0; i--) {
      if (!this.particles[i].update(dt)) {
        this.particles.splice(i, 1);
      }
    }

    // Floating text update
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      if (!this.floatingTexts[i].update(dt)) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    // Draw particles
    for (let i = 0; i < this.particles.length; i++) {
      this.particles[i].draw(ctx);
    }

    // Draw floating texts
    for (let i = 0; i < this.floatingTexts.length; i++) {
      this.floatingTexts[i].draw(ctx);
    }
  }

  clear() {
    this.particles = [];
    this.floatingTexts = [];
    this.shakeIntensity = 0;
    this.shakeDuration = 0;
    this.shakeOffset.x = 0;
    this.shakeOffset.y = 0;
  }
}

export const particles = new ParticleSystem();
