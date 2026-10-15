/**
 * CueRogue - 2D Billiards Physics Engine
 * Features sub-stepping, elastic collisions, cloth friction, gravitational pockets,
 * raycast trajectory prediction with spin/english, and obstacle resolution.
 */

import { audio } from './audio.js';
import { particles } from './particles.js';

export class PhysicsEngine {
  constructor(table) {
    this.table = table;
    this.subSteps = 8; // High sub-stepping prevents tunneling at max power
    this.baseFriction = 0.988; // Cloth friction per sub-step
    this.restitutionBall = 0.96; // Ball-ball elasticity
    this.restitutionCushion = 0.85; // Cushion elasticity
    this.epsilonVelocity = 1.2; // Velocity threshold to stop
    this.firstCollisionOccurred = false;
  }

  /**
   * Main physics step.
   * @param {Array} balls 
   * @param {Array} pockets 
   * @param {Array} obstacles 
   * @param {Object} turnStats 
   * @param {Object} relics 
   * @param {number} dt 
   */
  update(balls, pockets, obstacles, turnStats, relics, dt) {
    // Time-dependent cloth friction damping:
    // 0.55 means the ball naturally retains 55% of its speed after 1 full second
    let frictionDecay = 0.55;
    if (relics.has('ice_cloth')) {
      // Ice cloth (-40% friction) retains 75% speed per second
      frictionDecay = 0.75;
    }

    const subDt = dt / this.subSteps;
    const damping = Math.pow(frictionDecay, subDt);
    const newlyPocketed = [];

    for (let step = 0; step < this.subSteps; step++) {
      // 1. Move balls & apply friction
      for (let i = 0; i < balls.length; i++) {
        const b = balls[i];
        if (!b.inPlay || b.isSinking || b.pocketed) continue;

        // Position integration in pixels per second
        b.x += b.vx * subDt;
        b.y += b.vy * subDt;

        // Apply time-dependent exponential damping
        b.vx *= damping;
        b.vy *= damping;

        // Linear rolling deceleration at low speeds for smooth, natural stopping
        const speed = Math.hypot(b.vx, b.vy);
        if (speed < 120) {
          const stopDecel = 35 * subDt;
          if (speed <= stopDecel || speed < 6) {
            b.vx = 0;
            b.vy = 0;
          } else {
            b.vx -= (b.vx / speed) * stopDecel;
            b.vy -= (b.vy / speed) * stopDecel;
          }
        }

        // Magnet Ball attraction effect
        if (b.type === 'magnet') {
          this.applyMagneticField(b, balls, subDt);
        }
      }

      // 2. Ball-to-Ball Collisions
      for (let i = 0; i < balls.length; i++) {
        for (let j = i + 1; j < balls.length; j++) {
          const b1 = balls[i];
          const b2 = balls[j];
          if (!b1.inPlay || !b2.inPlay || b1.isSinking || b2.isSinking || b1.pocketed || b2.pocketed) continue;

          // Ghost ball ignores other balls
          if (b1.type === 'ghost' || b2.type === 'ghost') continue;

          this.resolveBallBallCollision(b1, b2, turnStats, relics);
        }
      }

      // 3. Ball-to-Cushion (Rails) Collisions
      for (let i = 0; i < balls.length; i++) {
        const b = balls[i];
        if (!b.inPlay || b.isSinking || b.pocketed) continue;
        this.resolveCushionCollisions(b, turnStats, relics);
      }

      // 4. Ball-to-Obstacle Collisions
      if (obstacles && obstacles.length > 0) {
        for (let i = 0; i < balls.length; i++) {
          const b = balls[i];
          if (!b.inPlay || b.isSinking || b.pocketed) continue;
          for (let o = 0; o < obstacles.length; o++) {
            this.resolveObstacleCollision(b, obstacles[o], turnStats);
          }
        }
      }

      // 5. Pocket Suction & Sinking
      for (let i = 0; i < balls.length; i++) {
        const b = balls[i];
        if (!b.inPlay || b.isSinking || b.pocketed) continue;
        this.resolvePocketInteraction(b, pockets, subDt, newlyPocketed, relics);
      }
    }

    // Process pocketed balls once after substeps complete (no duplicate events or substep mutations!)
    for (let k = 0; k < newlyPocketed.length; k++) {
      const { ball, pocket } = newlyPocketed[k];
      try {
        particles.createPocketSuckVortex(pocket.x, pocket.y, pocket.isTrap ? '#ef4444' : ball.color);
        audio.playPocket(ball.type !== 'standard' && ball.type !== 'cue', pocket.isTrap);
        this.table.onBallPocketed(ball, pocket, turnStats, relics);
      } catch (err) {
        console.error('Error handling pocketed ball:', err);
      }
    }
  }

  applyMagneticField(magnetBall, balls, subDt) {
    const magnetRadius = 160;
    const forceStrength = 240; // px/sec acceleration

    for (let i = 0; i < balls.length; i++) {
      const other = balls[i];
      if (other === magnetBall || !other.inPlay || other.isSinking || other.type === 'ghost') continue;

      const dx = magnetBall.x - other.x;
      const dy = magnetBall.y - other.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 0 && dist < magnetRadius) {
        const factor = (1 - dist / magnetRadius) * forceStrength * subDt;
        other.vx += (dx / dist) * factor;
        other.vy += (dy / dist) * factor;
      }
    }
  }

  resolveBallBallCollision(b1, b2, turnStats, relics) {
    const dx = b2.x - b1.x;
    const dy = b2.y - b1.y;
    const dist = Math.hypot(dx, dy);
    const minDist = b1.radius + b2.radius;

    if (dist >= minDist || dist === 0) return;

    // Normal unit vector
    const nx = dx / dist;
    const ny = dy / dist;

    // Separate overlapping balls
    const overlap = minDist - dist;
    b1.x -= nx * overlap * 0.5;
    b1.y -= ny * overlap * 0.5;
    b2.x += nx * overlap * 0.5;
    b2.y += ny * overlap * 0.5;

    // Relative velocity
    const dvx = b1.vx - b2.vx;
    const dvy = b1.vy - b2.vy;
    const velAlongNormal = dvx * nx + dvy * ny;

    // Do not resolve if velocities are separating
    if (velAlongNormal <= 0) return;

    // Impulse scalar
    const impulse = ((1 + this.restitutionBall) * velAlongNormal) / (b1.mass + b2.mass);

    // Apply impulse
    b1.vx -= impulse * b2.mass * nx;
    b1.vy -= impulse * b2.mass * ny;
    b2.vx += impulse * b1.mass * nx;
    b2.vy += impulse * b1.mass * ny;

    // Spin / English transfer on Cue Ball impact
    if (b1.type === 'cue' || b2.type === 'cue') {
      const cue = b1.type === 'cue' ? b1 : b2;
      // Top Spin (positive spinY): pushes forward along impact normal
      // Back Spin (negative spinY): pulls backward opposite impact normal
      if (cue.spinY !== 0) {
        const spinForce = cue.spinY * 360;
        cue.vx += nx * (b1.type === 'cue' ? spinForce : -spinForce);
        cue.vy += ny * (b1.type === 'cue' ? spinForce : -spinForce);
      }
      // Side Spin (English spinX): adds sideways deflection
      if (cue.spinX !== 0) {
        const sideForce = cue.spinX * 280;
        cue.vx += -ny * sideForce;
        cue.vy += nx * sideForce;
      }
    }

    // Audio & particles
    const impactSpeed = Math.abs(velAlongNormal);
    audio.playBallHit(impactSpeed, b1.type, b2.type);
    particles.createBallImpactSparks(
      (b1.x + b2.x) / 2,
      (b1.y + b2.y) / 2,
      b1.color,
      b2.color,
      Math.min(2.0, impactSpeed / 400)
    );

    // Track carambolas / turn stats
    turnStats.carambolas++;
    b1.turnCollisions++;
    b2.turnCollisions++;

    // Relic: Quantum Physics (First collision doubles Multiplier)
    if (!this.firstCollisionOccurred && relics.has('quantum_physics')) {
      this.firstCollisionOccurred = true;
      turnStats.multiplier *= 2;
      particles.addText('¡FÍSICA CUÁNTICA! x2 MULT', (b1.x + b2.x) / 2, (b1.y + b2.y) / 2 - 20, '#00f0ff', 18, true);
    }

    // Special Ball: Vampire Ball (Steals 5 base points from target)
    if (b1.type === 'vampire' && b2.type !== 'cue') {
      this.applyVampireBite(b1, b2);
    } else if (b2.type === 'vampire' && b1.type !== 'cue') {
      this.applyVampireBite(b2, b1);
    }

    // Special Ball: Crystal Ball (25% break chance on hard hit > 650 px/s)
    if ((b1.type === 'crystal' || b2.type === 'crystal') && impactSpeed > 650) {
      const crystalBall = b1.type === 'crystal' ? b1 : b2;
      if (Math.random() < 0.25 && !crystalBall.broken) {
        crystalBall.broken = true;
        crystalBall.inPlay = false;
        audio.playGlassBreak();
        particles.createGlassBreak(crystalBall.x, crystalBall.y);
        particles.addText('¡BOLA DE CRISTAL ROTA!', crystalBall.x, crystalBall.y, '#e0f7fa', 16, true);
      }
    }

    // Special Ball: Bomb Ball (detonates on hard impact > 800 px/s)
    if ((b1.type === 'bomb' || b2.type === 'bomb') && impactSpeed > 800) {
      const bomb = b1.type === 'bomb' ? b1 : b2;
      if (!bomb.isSinking && bomb.inPlay) {
        this.detonateBomb(bomb, turnStats);
      }
    }
  }

  applyVampireBite(vampireBall, victim) {
    if (victim.basePoints > 2) {
      const stolen = Math.min(5, victim.basePoints - 2);
      victim.basePoints -= stolen;
      vampireBall.vampireBonus += stolen;
      audio.playScoreTally(3);
      particles.createVampireLeech(victim.x, victim.y, vampireBall.x, vampireBall.y);
      particles.addText(`+${stolen} VAMPIRO!`, vampireBall.x, vampireBall.y - 18, '#ff1744', 15);
    }
  }

  detonateBomb(bomb, turnStats) {
    bomb.inPlay = false;
    audio.playExplosion();
    particles.createExplosion(bomb.x, bomb.y);
    particles.addText('¡BOOM! +50 PTS', bomb.x, bomb.y - 25, '#ffd700', 22, true);
    turnStats.basePoints += 50;

    // Push away all nearby balls with high impulse
    const blastRadius = 240;
    const blastPower = 1200;
    for (let i = 0; i < this.table.balls.length; i++) {
      const other = this.table.balls[i];
      if (other === bomb || !other.inPlay || other.isSinking) continue;

      const dx = other.x - bomb.x;
      const dy = other.y - bomb.y;
      const dist = Math.hypot(dx, dy);
      if (dist < blastRadius) {
        const factor = (1 - dist / blastRadius) * blastPower;
        const angle = Math.atan2(dy, dx);
        other.vx += Math.cos(angle) * factor;
        other.vy += Math.sin(angle) * factor;
      }
    }
  }

  resolveCushionCollisions(ball, turnStats, relics) {
    const { minX, maxX, minY, maxY } = this.table.bounds;
    let bounced = false;
    let normalAngle = 0;

    // Left cushion
    if (ball.x - ball.radius < minX) {
      ball.x = minX + ball.radius;
      ball.vx = -ball.vx * this.restitutionCushion;
      bounced = true;
      normalAngle = 0;
    }
    // Right cushion
    else if (ball.x + ball.radius > maxX) {
      ball.x = maxX - ball.radius;
      ball.vx = -ball.vx * this.restitutionCushion;
      bounced = true;
      normalAngle = Math.PI;
    }

    // Top cushion
    if (ball.y - ball.radius < minY) {
      ball.y = minY + ball.radius;
      ball.vy = -ball.vy * this.restitutionCushion;
      bounced = true;
      normalAngle = Math.PI / 2;
    }
    // Bottom cushion
    else if (ball.y + ball.radius > maxY) {
      ball.y = maxY - ball.radius;
      ball.vy = -ball.vy * this.restitutionCushion;
      bounced = true;
      normalAngle = -Math.PI / 2;
    }

    if (bounced) {
      const speed = Math.hypot(ball.vx, ball.vy);
      audio.playCushionHit(speed);
      particles.createCushionImpact(ball.x, ball.y, normalAngle, Math.min(1.5, speed / 400));

      ball.cushionHitsThisTurn++;
      turnStats.cushionsHit++;

      // Balatro scoring: Each cushion bounce adds +1 to Multiplier!
      turnStats.multiplier += 1;
      particles.addText('+1 MULT (BANDA)', ball.x, ball.y - 12, '#ff2a85', 13);

      // Relic: Sacred Geometry (Each cushion bounce adds +15 Base Points)
      if (relics.has('sacred_geometry')) {
        turnStats.basePoints += 15;
        particles.addText('+15 PTS (GEOMETRÍA)', ball.x, ball.y - 28, '#00f0ff', 13);
      }

      // Special Ball: Rainbow Ball (+3 Multiplier per cushion it hits)
      if (ball.type === 'rainbow') {
        turnStats.multiplier += 3;
        particles.addText('¡ARCOÍRIS! +3 MULT', ball.x, ball.y - 20, '#ec4899', 15, true);
      }
    }
  }

  resolveObstacleCollision(ball, obs, turnStats) {
    // Circle vs AABB Collision
    const closestX = Math.max(obs.x, Math.min(ball.x, obs.x + obs.width));
    const closestY = Math.max(obs.y, Math.min(ball.y, obs.y + obs.height));

    const dx = ball.x - closestX;
    const dy = ball.y - closestY;
    const dist = Math.hypot(dx, dy);

    if (dist < ball.radius) {
      // Collision normal
      let nx = dx / (dist || 1);
      let ny = dy / (dist || 1);

      // Separate ball
      const overlap = ball.radius - dist;
      ball.x += nx * overlap;
      ball.y += ny * overlap;

      // Reflect velocity
      const dot = ball.vx * nx + ball.vy * ny;
      if (dot < 0) {
        ball.vx = (ball.vx - 2 * dot * nx) * this.restitutionCushion;
        ball.vy = (ball.vy - 2 * dot * ny) * this.restitutionCushion;

        const speed = Math.hypot(ball.vx, ball.vy);
        audio.playCushionHit(speed);
        particles.createCushionImpact(ball.x, ball.y, Math.atan2(ny, nx), Math.min(1.5, speed / 400));
        turnStats.cushionsHit++;
        turnStats.multiplier += 1;
        particles.addText('¡PILAR! +1 MULT', ball.x, ball.y - 14, '#ffd700', 14);
      }
    }
  }

  resolvePocketInteraction(ball, pockets, subDt, newlyPocketed, relics) {
    if (!ball.inPlay || ball.isSinking || ball.pocketed) return;

    // Relic: Black Hole (+25% pocket capture radius)
    const radiusMultiplier = (relics && relics.has('black_hole')) ? 1.25 : 1.0;

    for (let p = 0; p < pockets.length; p++) {
      const pocket = pockets[p];
      const captureRadius = pocket.radius * radiusMultiplier;
      const pullRadius = pocket.pullRadius * radiusMultiplier;

      const dx = pocket.x - ball.x;
      const dy = pocket.y - ball.y;
      const dist = Math.hypot(dx, dy);

      // Prevent NaN division by zero
      if (dist < 0.0001) continue;

      // Sunk in pocket!
      if (dist < captureRadius) {
        ball.isSinking = true;
        ball.pocketed = true;
        ball.vx = 0;
        ball.vy = 0;
        newlyPocketed.push({ ball, pocket });
        break;
      }

      // Inward gravitational pull at the edge of the pocket
      if (dist < pullRadius && dist > captureRadius * 0.7) {
        const pullForce = (1 - dist / pullRadius) * 450 * subDt;
        ball.vx += (dx / dist) * pullForce;
        ball.vy += (dy / dist) * pullForce;
      }
    }
  }

  /**
   * Raycasting prediction trajectory with deflection vectors and spin.
   */
  calculatePrediction(cueBall, angle, relics, isFoggy = false) {
    if (isFoggy) return null; // Boss "La Neblina" disables predictions!

    const maxRayLength = relics.has('laser_sight') ? 950 : 450;
    const dirX = Math.cos(angle);
    const dirY = Math.sin(angle);

    let closestHit = null;
    let minT = maxRayLength;

    // Check intersection with all active balls
    for (let i = 0; i < this.table.balls.length; i++) {
      const b = this.table.balls[i];
      if (b === cueBall || !b.inPlay || b.isSinking || b.type === 'ghost') continue;

      // Ray-circle intersection
      const ox = cueBall.x - b.x;
      const oy = cueBall.y - b.y;
      const combinedRadius = cueBall.radius + b.radius;

      const a = dirX * dirX + dirY * dirY; // = 1.0
      const bCoeff = 2 * (ox * dirX + oy * dirY);
      const c = ox * ox + oy * oy - combinedRadius * combinedRadius;

      const discriminant = bCoeff * bCoeff - 4 * a * c;
      if (discriminant >= 0) {
        const sqrtD = Math.sqrt(discriminant);
        const t1 = (-bCoeff - sqrtD) / (2 * a);
        if (t1 > 0 && t1 < minT) {
          minT = t1;
          closestHit = {
            type: 'ball',
            target: b,
            distance: t1,
            impactX: cueBall.x + dirX * t1,
            impactY: cueBall.y + dirY * t1
          };
        }
      }
    }

    // Check intersection with cushions
    const { minX, maxX, minY, maxY } = this.table.bounds;
    const r = cueBall.radius;

    if (dirX > 0) {
      const t = (maxX - r - cueBall.x) / dirX;
      if (t > 0 && t < minT) {
        minT = t;
        closestHit = { type: 'cushion', normal: { x: -1, y: 0 }, distance: t, impactX: cueBall.x + dirX * t, impactY: cueBall.y + dirY * t };
      }
    } else if (dirX < 0) {
      const t = (minX + r - cueBall.x) / dirX;
      if (t > 0 && t < minT) {
        minT = t;
        closestHit = { type: 'cushion', normal: { x: 1, y: 0 }, distance: t, impactX: cueBall.x + dirX * t, impactY: cueBall.y + dirY * t };
      }
    }

    if (dirY > 0) {
      const t = (maxY - r - cueBall.y) / dirY;
      if (t > 0 && t < minT) {
        minT = t;
        closestHit = { type: 'cushion', normal: { x: 0, y: -1 }, distance: t, impactX: cueBall.x + dirX * t, impactY: cueBall.y + dirY * t };
      }
    } else if (dirY < 0) {
      const t = (minY + r - cueBall.y) / dirY;
      if (t > 0 && t < minT) {
        minT = t;
        closestHit = { type: 'cushion', normal: { x: 0, y: 1 }, distance: t, impactX: cueBall.x + dirX * t, impactY: cueBall.y + dirY * t };
      }
    }

    // Build prediction result object
    const result = {
      startX: cueBall.x,
      startY: cueBall.y,
      endX: cueBall.x + dirX * minT,
      endY: cueBall.y + dirY * minT,
      hit: closestHit
    };

    if (closestHit && closestHit.type === 'ball') {
      const target = closestHit.target;
      // Normal vector from cue ball impact center to target ball center
      const nx = (target.x - closestHit.impactX);
      const ny = (target.y - closestHit.impactY);
      const normLen = Math.hypot(nx, ny) || 1;
      const targetDirX = nx / normLen;
      const targetDirY = ny / normLen;

      // Tangent vector for cue ball deflection
      const cueDeflectX = -targetDirY;
      const cueDeflectY = targetDirX;

      result.targetLine = {
        startX: target.x,
        startY: target.y,
        endX: target.x + targetDirX * 130,
        endY: target.y + targetDirY * 130
      };

      result.cueDeflectLine = {
        startX: closestHit.impactX,
        startY: closestHit.impactY,
        endX: closestHit.impactX + (dirX - targetDirX * 0.7) * 90,
        endY: closestHit.impactY + (dirY - targetDirY * 0.7) * 90
      };
    } else if (closestHit && closestHit.type === 'cushion') {
      const n = closestHit.normal;
      const dot = dirX * n.x + dirY * n.y;
      const reflX = dirX - 2 * dot * n.x;
      const reflY = dirY - 2 * dot * n.y;
      result.cushionBounceLine = {
        startX: closestHit.impactX,
        startY: closestHit.impactY,
        endX: closestHit.impactX + reflX * 120,
        endY: closestHit.impactY + reflY * 120
      };
    }

    return result;
  }

  areAllBallsResting(balls) {
    for (let i = 0; i < balls.length; i++) {
      const b = balls[i];
      if (b.inPlay && !b.isSinking && !b.pocketed) {
        if (b.vx !== 0 || b.vy !== 0) {
          return false;
        }
      }
    }
    return true;
  }
}
