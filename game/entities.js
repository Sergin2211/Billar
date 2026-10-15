/**
 * CueRogue - Game Entities
 * Defines Ball, Pocket, Obstacle, and Cue classes with stylized vector canvas rendering.
 */

// Standard 8-ball colors
const BALL_COLORS = {
  1: '#facc15', // Yellow
  2: '#2563eb', // Blue
  3: '#dc2626', // Red
  4: '#9333ea', // Purple
  5: '#ea580c', // Orange
  6: '#16a34a', // Green
  7: '#854d0e', // Maroon / Brown
  8: '#18181b', // 8-Ball Black
  9: '#facc15',
  10: '#2563eb',
  11: '#dc2626',
  12: '#9333ea',
  13: '#ea580c',
  14: '#16a34a',
  15: '#854d0e'
};

export class Ball {
  constructor(id, number, type = 'standard', x = 0, y = 0, radius = 13.5) {
    this.id = id;
    this.number = number;
    this.type = type; // 'cue', 'standard', 'gold', 'crystal', 'bomb', 'ghost', 'magnet', 'vampire', 'rainbow'
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.radius = radius;
    this.mass = 1.0;

    // Spin dynamics (English: spinX -1 to 1; Top/Back: spinY -1 to 1)
    this.spinX = 0;
    this.spinY = 0;

    // State
    this.inPlay = true;
    this.isSinking = false;
    this.pocketed = false;
    this.sinkProgress = 0;
    this.sinkScale = 1.0;
    this.sinkAlpha = 1.0;
    this.broken = false;

    // Roguelike values & synergies
    this.basePoints = this.calculateInitialBasePoints();
    this.vampireBonus = 0;
    this.cushionHitsThisTurn = 0;
    this.turnCollisions = 0;

    // Styling
    this.isStriped = number >= 9 && number <= 15;
    this.color = this.determineColor();
    this.textColor = (number === 8 || type === 'bomb') ? '#ffffff' : '#18181b';

    // Animation / trail
    this.trail = [];
    this.pulsePhase = Math.random() * Math.PI * 2;
  }

  calculateInitialBasePoints() {
    switch (this.type) {
      case 'cue': return 0;
      case 'gold': return 20;
      case 'crystal': return 30;
      case 'bomb': return 50;
      case 'ghost': return 25;
      case 'magnet': return 25;
      case 'vampire': return 15;
      case 'rainbow': return 20;
      default: return 10 + (this.number || 1);
    }
  }

  determineColor() {
    switch (this.type) {
      case 'cue': return '#f8fafc';
      case 'gold': return '#ffd700';
      case 'crystal': return '#a5f3fc';
      case 'bomb': return '#27272a';
      case 'ghost': return '#c084fc';
      case 'magnet': return '#38bdf8';
      case 'vampire': return '#e11d48';
      case 'rainbow': return '#ec4899';
      default: return BALL_COLORS[this.number] || '#facc15';
    }
  }

  getEffectiveBasePoints() {
    return this.basePoints + this.vampireBonus;
  }

  resetTurnStats() {
    this.cushionHitsThisTurn = 0;
    this.turnCollisions = 0;
    if (this.type === 'cue') {
      this.spinX = 0;
      this.spinY = 0;
    }
  }

  update(dt) {
    if (this.isSinking || this.pocketed) {
      this.sinkProgress += dt * 3.5;
      this.sinkScale = Math.max(0, 1.0 - this.sinkProgress);
      this.sinkAlpha = Math.max(0, 1.0 - this.sinkProgress);
      if (this.sinkProgress >= 1.0) {
        this.inPlay = false;
      }
      return;
    }

    this.pulsePhase += dt * 4;

    // Update trail for fast or special balls
    const speed = Math.hypot(this.vx, this.vy);
    if (speed > 80 || this.type === 'ghost' || this.type === 'rainbow') {
      this.trail.push({ x: this.x, y: this.y, alpha: 0.6 });
      if (this.trail.length > 8) this.trail.shift();
    } else if (this.trail.length > 0) {
      this.trail.shift();
    }
    for (let i = 0; i < this.trail.length; i++) {
      this.trail[i].alpha *= 0.85;
    }
  }

  draw(ctx) {
    if (!this.inPlay && !this.isSinking && !this.pocketed) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    const scale = this.isSinking ? this.sinkScale : 1.0;
    ctx.scale(scale, scale);
    ctx.globalAlpha = this.isSinking ? this.sinkAlpha : (this.type === 'ghost' ? 0.65 : 1.0);

    // 1. Draw trails
    if (this.trail.length > 1 && !this.isSinking) {
      ctx.save();
      for (let i = 0; i < this.trail.length; i++) {
        const pt = this.trail[i];
        ctx.beginPath();
        ctx.arc(pt.x - this.x, pt.y - this.y, this.radius * (0.3 + 0.6 * (i / this.trail.length)), 0, Math.PI * 2);
        ctx.fillStyle = this.getTrailColor(i / this.trail.length);
        ctx.globalAlpha = pt.alpha * 0.4;
        ctx.fill();
      }
      ctx.restore();
    }

    // 2. Drop Shadow
    if (!this.isSinking) {
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(3, 4, this.radius * 0.95, this.radius * 0.6, 0.2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.fill();
      ctx.restore();
    }

    // 3. Special Aura / Pulsing field
    this.drawAura(ctx);

    // 4. Base Sphere with 3D radial gradient
    this.drawBallBody(ctx);

    // 5. Number / Badge / Icon
    this.drawBadgeOrIcon(ctx);

    ctx.restore();
  }

  getTrailColor(ratio) {
    if (this.type === 'rainbow') {
      const hue = (Date.now() * 0.2 + ratio * 360) % 360;
      return `hsl(${hue}, 90%, 60%)`;
    }
    if (this.type === 'vampire') return 'rgba(225, 29, 72, 0.7)';
    if (this.type === 'ghost') return 'rgba(192, 132, 252, 0.5)';
    if (this.type === 'magnet') return 'rgba(56, 189, 248, 0.6)';
    if (this.type === 'bomb') return 'rgba(239, 68, 68, 0.6)';
    if (this.type === 'gold') return 'rgba(255, 215, 0, 0.7)';
    return 'rgba(255, 255, 255, 0.4)';
  }

  drawAura(ctx) {
    if (this.type === 'rainbow') {
      const grad = ctx.createRadialGradient(0, 0, this.radius * 0.8, 0, 0, this.radius * 1.5);
      const hue = (Date.now() * 0.1) % 360;
      grad.addColorStop(0, `hsla(${hue}, 100%, 60%, 0.4)`);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius * 1.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.type === 'magnet') {
      // Pulsing magnetic rings
      const pulse = 1.0 + Math.sin(this.pulsePhase) * 0.2;
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius * 1.4 * pulse, 0, Math.PI * 2);
      ctx.stroke();
    } else if (this.type === 'bomb') {
      const pulse = 1.0 + Math.sin(this.pulsePhase * 2) * 0.15;
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius * 1.3 * pulse, 0, Math.PI * 2);
      ctx.stroke();
    } else if (this.type === 'vampire') {
      const pulse = 1.0 + Math.sin(this.pulsePhase) * 0.15;
      ctx.fillStyle = 'rgba(225, 29, 72, 0.25)';
      ctx.beginPath();
      ctx.arc(0, 0, this.radius * 1.35 * pulse, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawBallBody(ctx) {
    const r = this.radius;

    // Sphere clipping circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.clip();

    // Base Fill
    if (this.isStriped && this.type === 'standard') {
      // White body with colored central stripe
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-r, -r, r * 2, r * 2);

      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(0, 0, r, -0.65, 0.65);
      ctx.arc(0, 0, r, Math.PI - 0.65, Math.PI + 0.65);
      ctx.fill();
    } else if (this.type === 'rainbow') {
      const hue = (Date.now() * 0.08) % 360;
      ctx.fillStyle = `hsl(${hue}, 85%, 55%)`;
      ctx.fillRect(-r, -r, r * 2, r * 2);
    } else if (this.type === 'crystal') {
      ctx.fillStyle = '#cffafe';
      ctx.fillRect(-r, -r, r * 2, r * 2);
    } else {
      ctx.fillStyle = this.color;
      ctx.fillRect(-r, -r, r * 2, r * 2);
    }

    // 3D Shading overlay (lighting from top-left)
    const shadeGrad = ctx.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.1, 0, 0, r * 1.05);
    shadeGrad.addColorStop(0, 'rgba(255, 255, 255, 0.65)');
    shadeGrad.addColorStop(0.4, 'rgba(255, 255, 255, 0.05)');
    shadeGrad.addColorStop(0.8, 'rgba(0, 0, 0, 0.4)');
    shadeGrad.addColorStop(1, 'rgba(0, 0, 0, 0.85)');

    ctx.fillStyle = shadeGrad;
    ctx.fillRect(-r, -r, r * 2, r * 2);

    // Specular highlight
    ctx.beginPath();
    ctx.ellipse(-r * 0.35, -r * 0.35, r * 0.35, r * 0.22, -Math.PI / 4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fill();

    ctx.restore();
  }

  drawBadgeOrIcon(ctx) {
    const r = this.radius;

    if (this.type === 'cue') {
      // Cue ball: tiny red dot indicating current spin/English offset
      const dotX = this.spinX * (r * 0.55);
      const dotY = this.spinY * (r * 0.55);
      ctx.beginPath();
      ctx.arc(dotX, dotY, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ef4444';
      ctx.fill();
      return;
    }

    if (this.type === 'standard') {
      // White circle badge with number
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.46, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#111827';
      ctx.font = `bold ${Math.floor(r * 0.65)}px 'JetBrains Mono', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.number.toString(), 0, 0.5);
      return;
    }

    // Special Ball Icons
    ctx.font = `bold ${Math.floor(r * 0.95)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    let icon = '';
    if (this.type === 'gold') icon = '★';
    else if (this.type === 'crystal') icon = '✦';
    else if (this.type === 'bomb') icon = '💣';
    else if (this.type === 'ghost') icon = '👻';
    else if (this.type === 'magnet') icon = '🧲';
    else if (this.type === 'vampire') icon = '🦇';
    else if (this.type === 'rainbow') icon = '🌈';

    if (icon) {
      if (icon === '★' || icon === '✦') {
        ctx.fillStyle = this.type === 'gold' ? '#92400e' : '#0369a1';
        ctx.fillText(icon, 0, 0);
      } else {
        ctx.fillText(icon, 0, 1);
      }
    }
  }
}

export class Pocket {
  constructor(id, x, y, radius = 24, pullRadius = 40, isCenter = false, isTrap = false) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.pullRadius = pullRadius;
    this.isCenter = isCenter;
    this.isTrap = isTrap;
    this.pulse = 0;
  }

  update(dt) {
    if (this.isTrap) {
      this.pulse += dt * 4;
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    if (this.isTrap) {
      // Menacing red aura
      const glow = 1.0 + Math.sin(this.pulse) * 0.2;
      const trapGrad = ctx.createRadialGradient(0, 0, this.radius * 0.5, 0, 0, this.pullRadius * glow);
      trapGrad.addColorStop(0, 'rgba(239, 68, 68, 0.8)');
      trapGrad.addColorStop(0.6, 'rgba(185, 28, 28, 0.3)');
      trapGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = trapGrad;
      ctx.beginPath();
      ctx.arc(0, 0, this.pullRadius * glow, 0, Math.PI * 2);
      ctx.fill();
    }

    // Outer rim bevel / pocket opening shadow
    ctx.beginPath();
    ctx.arc(0, 0, this.radius + 3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fill();

    // Dark pocket interior depth
    const holeGrad = ctx.createRadialGradient(-2, -3, 2, 0, 0, this.radius);
    holeGrad.addColorStop(0, '#1c1917');
    holeGrad.addColorStop(0.7, '#09090b');
    holeGrad.addColorStop(1, '#000000');

    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = holeGrad;
    ctx.fill();

    // Inner rim edge
    ctx.strokeStyle = this.isTrap ? '#ef4444' : 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    if (this.isTrap) {
      ctx.fillStyle = '#fee2e2';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('☠', 0, 0);
    }

    ctx.restore();
  }
}

export class Obstacle {
  constructor(x, y, width, height, type = 'pillar') {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.type = type;
  }

  draw(ctx) {
    ctx.save();
    // Drop shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(this.x + 4, this.y + 5, this.width, this.height);

    // Dark walnut wood with gold runic inlays
    const grad = ctx.createLinearGradient(this.x, this.y, this.x + this.width, this.y + this.height);
    grad.addColorStop(0, '#3f2212');
    grad.addColorStop(0.5, '#5c3317');
    grad.addColorStop(1, '#2c160b');

    ctx.fillStyle = grad;
    ctx.fillRect(this.x, this.y, this.width, this.height);

    // Bevel borders
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2;
    ctx.strokeRect(this.x, this.y, this.width, this.height);

    // Decorative inner cross / diamond
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x + 4, this.y + 4);
    ctx.lineTo(this.x + this.width - 4, this.y + this.height - 4);
    ctx.moveTo(this.x + this.width - 4, this.y + 4);
    ctx.lineTo(this.x + 4, this.y + this.height - 4);
    ctx.stroke();

    ctx.restore();
  }
}

export class Cue {
  constructor() {
    this.aimAngle = 0;
    this.power = 0; // 0.0 to 1.0
    this.maxPower = 1900; // pixels per second at 100% power
    this.isAiming = false;
    this.isCharging = false;
    this.pullBack = 0; // visual pull-back in pixels
  }

  update(dt) {
    // Visual pullback up to 140px
    const targetPull = this.power * 140;
    this.pullBack += (targetPull - this.pullBack) * 0.35;
  }

  draw(ctx, cueBallX, cueBallY, ballRadius, aimAngle, powerRatio = 0) {
    if (!this.isAiming) return;

    ctx.save();
    ctx.translate(cueBallX, cueBallY);
    // Rotate to aimAngle: forward direction (+aimAngle) is +X.
    // The cue stick is placed BEHIND the ball along negative X (angle aimAngle + Math.PI).
    ctx.rotate(aimAngle);

    // Tip distance behind the cue ball: ballRadius + 8 + (powerRatio * 140)
    const tipDist = ballRadius + 8 + this.pullBack;
    const length = 270;
    const tipWidth = 4;
    const buttWidth = 8.5;

    // 1. Cue stick drop shadow
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
    ctx.beginPath();
    ctx.moveTo(-tipDist, -tipWidth / 2 + 5);
    ctx.lineTo(-(tipDist + length), -buttWidth / 2 + 5);
    ctx.lineTo(-(tipDist + length), buttWidth / 2 + 5);
    ctx.lineTo(-tipDist, tipWidth / 2 + 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // 2. Shaft body (ash wood gradient)
    const shaftGrad = ctx.createLinearGradient(-tipDist, -tipWidth, -tipDist, tipWidth);
    shaftGrad.addColorStop(0, '#fef3c7');
    shaftGrad.addColorStop(0.5, '#fde68a');
    shaftGrad.addColorStop(1, '#d97706');

    ctx.fillStyle = shaftGrad;
    ctx.beginPath();
    ctx.moveTo(-tipDist - 6, -tipWidth / 2);
    ctx.lineTo(-(tipDist + length * 0.62), -tipWidth * 1.3);
    ctx.lineTo(-(tipDist + length * 0.62), tipWidth * 1.3);
    ctx.lineTo(-tipDist - 6, tipWidth / 2);
    ctx.closePath();
    ctx.fill();

    // 3. Butt wrap & grip (dark cyber carbon / purple lacquer)
    const buttGrad = ctx.createLinearGradient(-(tipDist + length * 0.62), 0, -(tipDist + length), 0);
    buttGrad.addColorStop(0, '#7952ec');
    buttGrad.addColorStop(0.5, '#1e1b4b');
    buttGrad.addColorStop(1, '#0f0e17');

    ctx.fillStyle = buttGrad;
    ctx.beginPath();
    ctx.moveTo(-(tipDist + length * 0.62), -tipWidth * 1.3);
    ctx.lineTo(-(tipDist + length), -buttWidth / 2);
    ctx.lineTo(-(tipDist + length), buttWidth / 2);
    ctx.lineTo(-(tipDist + length * 0.62), tipWidth * 1.3);
    ctx.closePath();
    ctx.fill();

    // 4. Brass ferrule
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(-tipDist - 6, -tipWidth / 2, 4, tipWidth);

    // 5. Blue chalked leather tip (facing the cue ball)
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(-tipDist - 2, -tipWidth / 2, 2, tipWidth);

    // 6. Stylish Power Percentage Indicator Badge near cue
    if (this.power > 0.02) {
      ctx.save();
      const badgeX = -tipDist - 35;
      const badgeY = -26;
      const pct = Math.round(this.power * 100);

      // Color coding: cyan -> gold -> neon magenta
      let powerColor = '#00f0ff';
      if (pct > 75) powerColor = '#ff2a85';
      else if (pct > 40) powerColor = '#ffd700';

      ctx.translate(badgeX, badgeY);
      // Keep text readable right-side up regardless of cue rotation
      if (Math.cos(aimAngle) < 0) {
        ctx.rotate(Math.PI);
      }

      // Pill container
      ctx.fillStyle = 'rgba(14, 10, 22, 0.9)';
      ctx.strokeStyle = powerColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(-24, -12, 48, 24, 6);
      ctx.fill();
      ctx.stroke();

      // Percentage Text
      ctx.font = "bold 12px 'JetBrains Mono', monospace";
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = powerColor;
      ctx.fillText(`${pct}%`, 0, 1);

      ctx.restore();
    }

    ctx.restore();
  }
}
