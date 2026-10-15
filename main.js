/**
 * CueRogue - Main Game Loop & Coordinator
 * Integrates physics, audio, particles, state machine, roguelike mechanics, and HUD.
 */

import { PhysicsEngine } from './engine/physics.js';
import { audio } from './engine/audio.js';
import { particles } from './engine/particles.js';
import { Ball, Pocket, Obstacle, Cue } from './game/entities.js';
import { GameStateManager, GameStates } from './game/state.js';
import { RoguelikeManager, TABLE_CONFIGS } from './game/roguelike.js';
import { HUDManager } from './ui/hud.js';

class Game {
  constructor() {
    this.canvas = document.getElementById('pool-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.container = document.getElementById('canvas-wrapper');

    // Virtual Table Dimensions (aspect ratio 2:1)
    this.virtualWidth = 1000;
    this.virtualHeight = 500;
    this.scale = 1.0;

    // Table Felt Bounds
    this.bounds = {
      minX: 50,
      maxX: 950,
      minY: 45,
      maxY: 455
    };

    // Sub-systems
    this.state = new GameStateManager();
    this.roguelike = new RoguelikeManager();
    this.physics = new PhysicsEngine(this);
    this.hud = new HUDManager(this);

    // Entities
    this.balls = [];
    this.cueBall = null;
    this.pockets = [];
    this.obstacles = [];
    this.cue = new Cue();

    // Input state
    this.mouse = { x: 0, y: 0, isDown: false, startX: 0, startY: 0 };
    this.aimAngle = 0;
    this.holdPower = 0;
    this.dragPower = 0;
    this.isBallInHandDragging = false;
    this.lastTime = performance.now();

    // Slow motion / Hit-stop controller
    this.timeDilation = 1.0;
    this.slowMoTimer = 0;

    this.initPockets();
    this.setupResize();
    this.setupInputs();
    this.setupTable();

    // Start Animation Loop
    requestAnimationFrame((t) => this.loop(t));
  }

  setupResize() {
    const resize = () => {
      const containerWidth = this.container.clientWidth - 20;
      const containerHeight = this.container.clientHeight - 20;

      const targetRatio = this.virtualWidth / this.virtualHeight;
      let w = containerWidth;
      let h = containerWidth / targetRatio;

      if (h > containerHeight) {
        h = containerHeight;
        w = containerHeight * targetRatio;
      }

      this.scale = w / this.virtualWidth;
      const dpr = window.devicePixelRatio || 1;

      this.canvas.width = w * dpr;
      this.canvas.height = h * dpr;
      this.canvas.style.width = `${w}px`;
      this.canvas.style.height = `${h}px`;

      this.ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset
      this.ctx.scale(dpr * this.scale, dpr * this.scale);
    };

    window.addEventListener('resize', resize);
    resize();
  }

  initPockets() {
    const { minX, maxX, minY, maxY } = this.bounds;
    const cornerRadius = 26;
    const middleRadius = 23;
    const pullDist = 42;

    this.pockets = [
      new Pocket(1, minX + 2, minY + 2, cornerRadius, pullDist, false),     // Top-Left
      new Pocket(2, (minX + maxX) / 2, minY - 2, middleRadius, pullDist, true), // Top-Mid
      new Pocket(3, maxX - 2, minY + 2, cornerRadius, pullDist, false),    // Top-Right
      new Pocket(4, minX + 2, maxY - 2, cornerRadius, pullDist, false),    // Bottom-Left
      new Pocket(5, (minX + maxX) / 2, maxY + 2, middleRadius, pullDist, true),// Bottom-Mid
      new Pocket(6, maxX - 2, maxY - 2, cornerRadius, pullDist, false)     // Bottom-Right
    ];
  }

  setupTable() {
    this.balls = [];
    this.obstacles = [];
    this.physics.firstCollisionOccurred = false;

    const currentTable = this.roguelike.currentTable;

    // Reset pockets and apply Boss "El Abismo" hazard if applicable
    this.initPockets();
    if (currentTable.boss === 'abismo') {
      // 2 center pockets become deadly trap pockets
      this.pockets[1].isTrap = true;
      this.pockets[4].isTrap = true;
    }

    // Apply Boss "El Arquitecto" hazard
    if (currentTable.boss === 'arquitecto') {
      const centerX = (this.bounds.minX + this.bounds.maxX) / 2;
      const centerY = (this.bounds.minY + this.bounds.maxY) / 2;
      this.obstacles.push(new Obstacle(centerX - 16, centerY - 95, 32, 50, 'pillar'));
      this.obstacles.push(new Obstacle(centerX - 16, centerY + 45, 32, 50, 'pillar'));
    }

    // Spawn Cue Ball at head string (1/4 table width)
    const cueBallX = this.bounds.minX + (this.bounds.maxX - this.bounds.minX) * 0.28;
    const cueBallY = (this.bounds.minY + this.bounds.maxY) / 2;
    this.cueBall = new Ball('cue', 0, 'cue', cueBallX, cueBallY, 13.5);
    this.cueBall.spinX = this.hud.spinX;
    this.cueBall.spinY = this.hud.spinY;
    this.balls.push(this.cueBall);

    // Build standard triangle rack of balls + include bought special balls
    const rackStartX = this.bounds.minX + (this.bounds.maxX - this.bounds.minX) * 0.72;
    const rackStartY = (this.bounds.minY + this.bounds.maxY) / 2;
    const r = 13.5;
    const rowOffset = r * Math.sqrt(3) + 1.2;

    const ballNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
    this.roguelike.shuffle(ballNumbers);

    // Ensure 8-ball is placed in the center of rack (row 3, index 4)
    const eightIdx = ballNumbers.indexOf(8);
    if (eightIdx !== -1) {
      ballNumbers.splice(eightIdx, 1);
      ballNumbers.splice(4, 0, 8);
    }

    // Determine special balls from deck to substitute into rack
    const specialDeck = [...this.roguelike.specialBallsDeck];
    let specialDeckIdx = 0;

    let ballIndex = 0;
    const rows = 5;
    for (let row = 0; row < rows; row++) {
      const rowX = rackStartX + row * rowOffset;
      const startY = rackStartY - (row * r);

      for (let col = 0; col <= row; col++) {
        const x = rowX;
        const y = startY + col * (r * 2 + 1.2);
        const num = ballNumbers[ballIndex++];

        let type = 'standard';
        // Replace with special ball if available from deck (except 8-ball)
        if (num !== 8 && specialDeckIdx < specialDeck.length) {
          type = specialDeck[specialDeckIdx++];
        }

        const ball = new Ball(`ball_${num}`, num, type, x, y, r);
        this.balls.push(ball);
      }
    }

    this.hud.updateHeader(this.roguelike);
    this.hud.updateRelics(this.roguelike);
    this.hud.updateBallsList(this.balls);
    this.hud.updateBalatroScore(0, 1);
  }

  setupInputs() {
    const getVirtualPos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const clientX = e.clientX || (e.touches && e.touches[0].clientX);
      const clientY = e.clientY || (e.touches && e.touches[0].clientY);
      return {
        x: (clientX - rect.left) / this.scale,
        y: (clientY - rect.top) / this.scale
      };
    };

    this.canvas.addEventListener('mousedown', (e) => {
      audio.ensureContext();
      const pos = getVirtualPos(e);
      this.mouse.x = pos.x;
      this.mouse.y = pos.y;
      this.mouse.startX = pos.x;
      this.mouse.startY = pos.y;
      this.mouse.isDown = true;

      // BALL IN HAND placement
      if (this.state.isState(GameStates.BALL_IN_HAND)) {
        if (this.canPlaceCueBall(pos.x, pos.y)) {
          this.cueBall.x = pos.x;
          this.cueBall.y = pos.y;
          this.cueBall.vx = 0;
          this.cueBall.vy = 0;
          this.cueBall.inPlay = true;
          this.cueBall.isSinking = false;
          this.cueBall.sinkProgress = 0;
          this.cueBall.sinkScale = 1.0;
          this.cueBall.sinkAlpha = 1.0;

          audio.playCushionHit(400);
          this.hud.hideBanner();
          this.state.changeState(GameStates.AIMING);
          this.mouse.isDown = false;
        }
        return;
      }

      // AIMING / CHARGING
      if (this.state.isState(GameStates.AIMING) && this.cueBall && this.cueBall.inPlay) {
        this.aimAngle = Math.atan2(pos.y - this.cueBall.y, pos.x - this.cueBall.x);
        this.cue.aimAngle = this.aimAngle;
        this.cue.isCharging = true;
        this.holdPower = 0;
        this.dragPower = 0;
        this.cue.power = 0;
      }
    });

    window.addEventListener('mousemove', (e) => {
      const pos = getVirtualPos(e);
      this.mouse.x = pos.x;
      this.mouse.y = pos.y;

      if (this.state.isState(GameStates.BALL_IN_HAND) && this.cueBall) {
        // Move ghost cue ball to follow cursor
        this.cueBall.x = Math.max(this.bounds.minX + this.cueBall.radius, Math.min(this.bounds.maxX - this.cueBall.radius, pos.x));
        this.cueBall.y = Math.max(this.bounds.minY + this.cueBall.radius, Math.min(this.bounds.maxY - this.cueBall.radius, pos.y));
        return;
      }

      if (this.state.isState(GameStates.AIMING) && this.cueBall) {
        if (!this.cue.isCharging) {
          // Normal aiming: direction from cueBall towards cursor
          this.aimAngle = Math.atan2(pos.y - this.cueBall.y, pos.x - this.cueBall.x);
          this.cue.aimAngle = this.aimAngle;
        } else {
          // Drag-back power charging from click anchor with 10px deadzone and 240px max pull
          const dragDist = Math.hypot(pos.x - this.mouse.startX, pos.y - this.mouse.startY);
          if (dragDist <= 10) {
            this.dragPower = 0;
          } else {
            this.dragPower = Math.min(1.0, (dragDist - 10) / (240 - 10));
          }
          this.cue.power = Math.min(1.0, Math.max(this.dragPower, this.holdPower));
          this.hud.setPowerGauge(this.cue.power);
        }
      }
    });

    window.addEventListener('mouseup', () => {
      if (!this.mouse.isDown) return;
      this.mouse.isDown = false;

      if (this.state.isState(GameStates.AIMING) && this.cue.isCharging) {
        this.cue.isCharging = false;
        this.hud.setPowerGauge(0);

        if (this.cue.power > 0.04) {
          this.executeShot();
        } else {
          this.cue.power = 0;
          this.holdPower = 0;
          this.dragPower = 0;
        }
      }
    });
  }

  canPlaceCueBall(x, y) {
    const r = this.cueBall ? this.cueBall.radius : 13.5;
    if (x - r < this.bounds.minX || x + r > this.bounds.maxX) return false;
    if (y - r < this.bounds.minY || y + r > this.bounds.maxY) return false;

    // Check overlap with active balls
    for (let i = 0; i < this.balls.length; i++) {
      const b = this.balls[i];
      if (b === this.cueBall || !b.inPlay || b.isSinking) continue;
      if (Math.hypot(b.x - x, b.y - y) < r + b.radius + 2) {
        return false;
      }
    }
    return true;
  }

  executeShot() {
    // Check Boss "El Usurero" tax: Each shot costs $1
    if (this.roguelike.currentTable.boss === 'usurero') {
      if (this.roguelike.money > 0) {
        this.roguelike.money -= 1;
        this.hud.showBanner('¡EL USURERO TE COBRA $1 POR EL TIRO!', 2000);
        audio.playScoreTally(1);
      }
    }

    // Reset physics flags and turn tracking
    this.physics.firstCollisionOccurred = false;
    this.state.resetTurnStats();
    this.hud.clearComboLog();

    // Synergies: Magic Chalk (+2 Mult if spin is applied)
    const hasSpin = Math.abs(this.cueBall.spinX) > 0.1 || Math.abs(this.cueBall.spinY) > 0.1;
    if (hasSpin && this.roguelike.hasRelic('magic_chalk')) {
      this.state.turnStats.multiplier += 2;
      this.hud.logCombo('✦ Tiza Mágica: +2 Mult por efecto', 'bonus');
      particles.addText('TIZA MÁGICA +2 MULT', this.cueBall.x, this.cueBall.y - 30, '#00f0ff', 16, true);
    }

    // Relic: Carbon Cue (+30% max power)
    let maxPower = this.cue.maxPower; // 1900 px/sec
    if (this.roguelike.hasRelic('carbon_cue')) {
      maxPower *= 1.3;
    }

    // Non-linear power curve: Math.pow(power, 1.35) gives delicate precision for soft shots
    const effectivePowerRatio = Math.pow(this.cue.power, 1.35);
    const impulseSpeed = effectivePowerRatio * maxPower;
    const shotAngle = this.aimAngle; // Shoot forward in direction of prediction line!

    this.cueBall.vx = Math.cos(shotAngle) * impulseSpeed;
    this.cueBall.vy = Math.sin(shotAngle) * impulseSpeed;

    // Audio and particles
    audio.playCueHit(effectivePowerRatio);
    particles.createCueStrikeDust(this.cueBall.x, this.cueBall.y, shotAngle, effectivePowerRatio);
    particles.shake(effectivePowerRatio * 8, 0.25);

    // Consume 1 shot
    this.roguelike.shotsRemaining--;
    this.hud.updateHeader(this.roguelike);

    // Transition to simulation state
    this.state.changeState(GameStates.BALLS_MOVING);
    this.cue.power = 0;
    this.holdPower = 0;
    this.dragPower = 0;
  }

  onBallPocketed(ball, pocket, turnStats, relics) {
    if (!ball || !pocket) return;
    try {
      if (pocket.isTrap) {
        // Deadly trap pocket from Boss "El Abismo"
        particles.addText('¡TRAMPA DEL ABISMO! -1 TIRO', pocket.x, pocket.y - 25, '#ef4444', 18, true);
        this.roguelike.shotsRemaining = Math.max(0, this.roguelike.shotsRemaining - 1);
        this.hud.updateHeader(this.roguelike);
        this.hud.logCombo('☠ ¡Bola tragada por el Abismo! Pierdes 1 tiro', 'danger');
        return;
      }

      if (ball.type === 'cue') {
        turnStats.scratch = true;
        particles.addText('¡SCRATCH!', pocket.x, pocket.y - 20, '#ef4444', 20, true);
        audio.playScratch();
        this.hud.logCombo('✖ ¡Scratch! La bola blanca cayó en la tronera', 'danger');
        return;
      }

      // Register valid pocketed ball
      turnStats.ballsPocketed.push(ball);

      // Calculate ball base points
      const pts = ball.getEffectiveBasePoints();
      turnStats.basePoints += pts;

      // Relic: Lucky Coin (Pocketing in center pockets awards $2)
      if (pocket.isCenter && relics && relics.has('lucky_coin')) {
        this.roguelike.money += 2;
        audio.playScoreTally(5);
        particles.addText('+$2 MONEDA', pocket.x, pocket.y - 35, '#ffd700', 16, true);
        this.hud.logCombo('🪙 Moneda de la Suerte: +$2 por tronera central', 'bonus');
      }

      // Special Ball Synergies
      if (ball.type === 'gold') {
        this.roguelike.money += 3;
        audio.playScoreTally(6);
        particles.createGoldSparkle(pocket.x, pocket.y);
        particles.addText('+$3 ORO', pocket.x, pocket.y - 20, '#ffd700', 18, true);
        this.hud.logCombo('★ Bola de Oro: +$3 en efectivo', 'bonus');
      } else if (ball.type === 'crystal') {
        turnStats.multiplier *= 2;
        particles.addText('¡CRISTAL! x2 MULT', pocket.x, pocket.y - 20, '#00f0ff', 20, true);
        this.hud.logCombo('💎 Bola de Cristal: Multiplicador x2', 'highlight');
      } else if (ball.type === 'rainbow') {
        const extraMult = ball.cushionHitsThisTurn * 3;
        turnStats.multiplier += extraMult;
        particles.addText(`¡ARCOÍRIS! +${extraMult} MULT`, pocket.x, pocket.y - 20, '#ec4899', 18, true);
        this.hud.logCombo(`🌈 Bola Arcoíris: +${extraMult} Mult acumulado`, 'highlight');
      } else {
        this.hud.logCombo(`✦ Embocada Bola #${ball.number}: +${pts} Pts`, 'normal');
      }

      // Update floating Balatro ticker in real-time
      this.hud.updateBalatroScore(turnStats.basePoints, turnStats.multiplier, true);

      // Hit-stop / Slow motion if winning or high score moment (clamped >= 0.25)
      const potentialScore = turnStats.basePoints * turnStats.multiplier;
      if (this.roguelike.score + potentialScore >= this.roguelike.currentTable.targetScore) {
        this.triggerSlowMotion(0.25, 0.6); // Dramatic bullet-time!
      }
    } catch (err) {
      console.error('Error handling onBallPocketed:', err);
    }
  }

  triggerSlowMotion(dilation = 0.25, duration = 0.5) {
    this.timeDilation = Math.max(0.2, Math.min(1.0, dilation));
    this.slowMoTimer = Math.max(0.1, duration);
  }

  startNewGame() {
    this.roguelike.reset();
    this.setupTable();
    this.state.changeState(GameStates.AIMING);
    this.hud.showBanner('¡NUEVA PARTIDA ROGUELIKE INICIADA!', 2500);
    audio.playWin();
  }

  openShop() {
    this.state.changeState(GameStates.SHOP);
    this.currentShopOfferings = this.roguelike.generateShopOfferings();
    this.hud.renderShop(this.currentShopOfferings, this.roguelike);
  }

  rerollShop() {
    if (this.roguelike.money >= 2) {
      this.roguelike.money -= 2;
      audio.playReroll();
      this.currentShopOfferings = this.roguelike.generateShopOfferings();
      this.hud.renderShop(this.currentShopOfferings, this.roguelike);
    }
  }

  buyRelic(relic) {
    if (this.roguelike.money >= relic.cost && this.roguelike.addRelic(relic.id)) {
      this.roguelike.money -= relic.cost;
      audio.playShopBuy();
      this.hud.updateRelics(this.roguelike);
      return true;
    }
    return false;
  }

  buySpecialBall(ball) {
    if (this.roguelike.money >= ball.cost) {
      this.roguelike.money -= ball.cost;
      this.roguelike.addSpecialBall(ball.type);
      audio.playShopBuy();
      return true;
    }
    return false;
  }

  proceedToNextTable() {
    const nextTableIndex = this.roguelike.tableIndex + 1;
    if (nextTableIndex >= TABLE_CONFIGS.length) {
      // Completed all 12 tables: Grand Victory!
      this.state.changeState(GameStates.VICTORY);
      audio.playWin();
      this.hud.showVictory(this.roguelike.totalCareerScore, this.roguelike.money);
      return;
    }

    this.roguelike.loadTable(nextTableIndex);
    this.setupTable();
    this.state.changeState(GameStates.AIMING);
    this.hud.showBanner(`¡BIENVENIDO A ${this.roguelike.currentTable.title.toUpperCase()}!`, 3000);
  }

  evaluateShotEnd() {
    const stats = this.state.turnStats;

    // Scratch Penalty
    if (stats.scratch) {
      stats.basePoints = 0;
      stats.multiplier = 1;
      this.cueBall.inPlay = true;
      this.cueBall.isSinking = false;
      this.cueBall.pocketed = false;
      this.cueBall.sinkProgress = 0;
      this.cueBall.sinkScale = 1.0;
      this.cueBall.sinkAlpha = 0.85;
      this.cueBall.vx = 0;
      this.cueBall.vy = 0;
      this.hud.updateBalatroScore(0, 1);
      this.hud.showBanner('¡SCRATCH! PIERDES 1 TIRO Y BOLA EN MANO', 3000);
      this.state.changeState(GameStates.BALL_IN_HAND);
      return;
    }

    // Pocketed Balls Combo
    if (stats.ballsPocketed.length > 0) {
      // Combo multiplier bonus for pocketing multiple balls in one shot
      if (stats.ballsPocketed.length > 1) {
        stats.multiplier += (stats.ballsPocketed.length - 1) * 2;
        this.hud.logCombo(`🔥 ¡COMBO x${stats.ballsPocketed.length} BOLAS! +${(stats.ballsPocketed.length - 1) * 2} Mult`, 'highlight');
      }

      // Relic: Último Aliento (On last available shot, Mult is x3)
      if (this.roguelike.shotsRemaining === 0 && this.roguelike.hasRelic('last_breath')) {
        stats.multiplier *= 3;
        particles.addText('¡ÚLTIMO ALIENTO! x3 MULT', this.bounds.maxX / 2, this.bounds.maxY / 2, '#ffd700', 24, true);
        this.hud.logCombo('💀 ¡Último Aliento! Multiplicador x3', 'bonus');
      }

      const totalShotScore = stats.basePoints * stats.multiplier;
      this.roguelike.score += totalShotScore;
      this.roguelike.totalCareerScore += totalShotScore;

      audio.playScoreTally(8);
      particles.addText(`+${totalShotScore.toLocaleString()} PTS!`, (this.bounds.minX + this.bounds.maxX) / 2, 80, '#ffd700', 28, true);
    } else {
      this.hud.logCombo('Sin bolas embocadas este tiro.', 'normal');
    }

    this.hud.updateHeader(this.roguelike);
    this.hud.updateBallsList(this.balls);

    // Check Win / Table Clear condition
    if (this.roguelike.score >= this.roguelike.currentTable.targetScore) {
      this.roguelike.tablesCleared++;
      const reward = this.roguelike.calculateRoundClearReward();
      this.roguelike.money += reward.totalEarned;

      this.state.changeState(GameStates.ROUND_OVER);
      audio.playWin();

      // Check if Act 3 Boss cleared
      if (this.roguelike.tableIndex === TABLE_CONFIGS.length - 1) {
        this.hud.showVictory(this.roguelike.totalCareerScore, this.roguelike.money);
      } else {
        this.hud.showRoundClear(reward, this.roguelike.score, this.roguelike.shotsRemaining);
      }
      return;
    }

    // Check Defeat / Out of Shots
    if (this.roguelike.shotsRemaining <= 0) {
      this.state.changeState(GameStates.GAME_OVER);
      audio.playGameOver();
      this.hud.showGameOver(this.roguelike.totalCareerScore, this.roguelike.tablesCleared);
      return;
    }

    // Check if table is out of target balls (re-rack if necessary)
    const activeBalls = this.balls.filter(b => b.inPlay && b.type !== 'cue');
    if (activeBalls.length === 0) {
      this.setupTable();
      this.hud.showBanner('¡NUEVO RACK EN LA MESA!', 2000);
    }

    // Return to AIMING
    this.state.changeState(GameStates.AIMING);
  }

  loop(timestamp) {
    const rawDt = Math.min(0.05, Math.max(0.001, (timestamp - this.lastTime) / 1000));
    this.lastTime = timestamp;

    // Handle slow motion
    if (this.slowMoTimer > 0) {
      this.slowMoTimer -= rawDt;
      if (this.slowMoTimer <= 0) {
        this.timeDilation = 1.0;
        this.slowMoTimer = 0;
      }
    } else {
      this.timeDilation = 1.0;
    }
    const dt = Math.max(0.001, rawDt * Math.max(0.2, this.timeDilation));

    // Update Sub-systems
    this.state.update(dt);
    particles.update(dt);

    // Charge power smoothly if holding click (1.65 seconds to reach 100%)
    if (this.state.isState(GameStates.AIMING) && this.cue.isCharging) {
      this.holdPower = Math.min(1.0, this.holdPower + rawDt / 1.65);
      this.cue.power = Math.min(1.0, Math.max(this.dragPower, this.holdPower));
      this.hud.setPowerGauge(this.cue.power);
    }
    this.cue.update(dt);

    for (let i = 0; i < this.balls.length; i++) {
      this.balls[i].update(dt);
    }
    for (let i = 0; i < this.pockets.length; i++) {
      this.pockets[i].update(dt);
    }

    // Physics Simulation during BALLS_MOVING
    if (this.state.isState(GameStates.BALLS_MOVING)) {
      this.physics.update(
        this.balls,
        this.pockets,
        this.obstacles,
        this.state.turnStats,
        this.roguelike.relics,
        dt
      );

      // Check if all balls have come to a complete stop
      if (this.physics.areAllBallsResting(this.balls)) {
        this.state.changeState(GameStates.EVALUATING_SHOT);
        setTimeout(() => this.evaluateShotEnd(), 400);
      }
    }

    // Render Canvas Frame
    this.render();

    requestAnimationFrame((t) => this.loop(t));
  }

  render() {
    const ctx = this.ctx;
    ctx.save();

    // Clear background
    ctx.fillStyle = '#060408';
    ctx.fillRect(0, 0, this.virtualWidth, this.virtualHeight);

    // Apply Screen Shake
    if (particles.shakeDuration > 0) {
      ctx.translate(particles.shakeOffset.x, particles.shakeOffset.y);
    }

    // 1. Draw Billiard Table Outer Wood Frame & Cushions
    this.drawTableStructure(ctx);

    // 2. Draw Table Felt Cloth
    this.drawFelt(ctx);

    // 3. Draw Obstacles (Boss Hazard)
    for (let i = 0; i < this.obstacles.length; i++) {
      this.obstacles[i].draw(ctx);
    }

    // 4. Draw Pockets
    for (let i = 0; i < this.pockets.length; i++) {
      this.pockets[i].draw(ctx);
    }

    // 5. Draw Aim Line & Prediction Raycasting
    if (this.state.isState(GameStates.AIMING) && this.cueBall && this.cueBall.inPlay) {
      const isFoggy = this.roguelike.currentTable.boss === 'neblina';
      this.drawAimPrediction(ctx, isFoggy);
    }

    // 6. Draw Balls
    for (let i = 0; i < this.balls.length; i++) {
      this.balls[i].draw(ctx);
    }

    // 7. Draw Cue Stick
    if (this.state.isState(GameStates.AIMING) && this.cueBall && this.cueBall.inPlay) {
      this.cue.isAiming = true;
      this.cue.draw(ctx, this.cueBall.x, this.cueBall.y, this.cueBall.radius, this.aimAngle, this.cue.power);
    } else {
      this.cue.isAiming = false;
    }

    // 8. Draw Ball-in-Hand Ghost Indicator
    if (this.state.isState(GameStates.BALL_IN_HAND) && this.cueBall) {
      ctx.save();
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(this.cueBall.x, this.cueBall.y, this.cueBall.radius + 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 9. Draw Particle System & Floating Texts
    particles.draw(ctx);

    ctx.restore();
  }

  drawTableStructure(ctx) {
    // Rich mahogany outer rail frame
    const railGrad = ctx.createLinearGradient(0, 0, this.virtualWidth, this.virtualHeight);
    railGrad.addColorStop(0, '#1c1024');
    railGrad.addColorStop(0.5, '#281738');
    railGrad.addColorStop(1, '#150a1d');

    ctx.fillStyle = railGrad;
    ctx.fillRect(10, 10, this.virtualWidth - 20, this.virtualHeight - 20);

    // Outer rim border
    ctx.strokeStyle = 'rgba(121, 82, 236, 0.4)';
    ctx.lineWidth = 3;
    ctx.strokeRect(10, 10, this.virtualWidth - 20, this.virtualHeight - 20);

    // Pearl Diamond Markers along rails
    ctx.fillStyle = '#f8fafc';
    const markersTopBottom = [200, 350, 500, 650, 800];
    markersTopBottom.forEach(x => {
      this.drawDiamondMarker(ctx, x, 26);
      this.drawDiamondMarker(ctx, x, this.virtualHeight - 26);
    });
    const markersLeftRight = [150, 250, 350];
    markersLeftRight.forEach(y => {
      this.drawDiamondMarker(ctx, 28, y);
      this.drawDiamondMarker(ctx, this.virtualWidth - 28, y);
    });
  }

  drawDiamondMarker(ctx, x, y) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-3, -3, 6, 6);
    ctx.restore();
  }

  drawFelt(ctx) {
    const { minX, maxX, minY, maxY } = this.bounds;
    const w = maxX - minX;
    const h = maxY - minY;

    // Felt drop shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(minX - 4, minY - 4, w + 8, h + 8);

    // Deep Neon-Noir Cyber-Felt
    const feltGrad = ctx.createRadialGradient(
      (minX + maxX) / 2, (minY + maxY) / 2, 50,
      (minX + maxX) / 2, (minY + maxY) / 2, 550
    );
    feltGrad.addColorStop(0, '#0c4a4a');
    feltGrad.addColorStop(0.5, '#063032');
    feltGrad.addColorStop(1, '#031c1e');

    ctx.fillStyle = feltGrad;
    ctx.fillRect(minX, minY, w, h);

    // Inner Cushion Rail Edges
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.25;
    ctx.strokeRect(minX, minY, w, h);
    ctx.globalAlpha = 1.0;

    // Head string line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    const headStringX = minX + w * 0.28;
    ctx.beginPath();
    ctx.moveTo(headStringX, minY);
    ctx.lineTo(headStringX, maxY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Foot spot
    const footSpotX = minX + w * 0.72;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.beginPath();
    ctx.arc(footSpotX, (minY + maxY) / 2, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  drawAimPrediction(ctx, isFoggy) {
    if (isFoggy) return;

    const shotAngle = this.aimAngle;
    const pred = this.physics.calculatePrediction(this.cueBall, shotAngle, this.roguelike.relics, isFoggy);
    if (!pred) return;

    ctx.save();

    // 1. Ray from cue ball to target
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(pred.startX, pred.startY);
    ctx.lineTo(pred.endX, pred.endY);
    ctx.stroke();
    ctx.setLineDash([]);

    // 2. Ghost cue ball at impact point
    if (pred.hit && pred.hit.type === 'ball') {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(pred.hit.impactX, pred.hit.impactY, this.cueBall.radius, 0, Math.PI * 2);
      ctx.stroke();

      // Target ball path
      if (pred.targetLine) {
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(pred.targetLine.startX, pred.targetLine.startY);
        ctx.lineTo(pred.targetLine.endX, pred.targetLine.endY);
        ctx.stroke();

        // Arrow head on target line
        const headAngle = Math.atan2(pred.targetLine.endY - pred.targetLine.startY, pred.targetLine.endX - pred.targetLine.startX);
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.moveTo(pred.targetLine.endX, pred.targetLine.endY);
        ctx.lineTo(pred.targetLine.endX - 8 * Math.cos(headAngle - 0.5), pred.targetLine.endY - 8 * Math.sin(headAngle - 0.5));
        ctx.lineTo(pred.targetLine.endX - 8 * Math.cos(headAngle + 0.5), pred.targetLine.endY - 8 * Math.sin(headAngle + 0.5));
        ctx.closePath();
        ctx.fill();
      }

      // Cue ball deflection path
      if (pred.cueDeflectLine) {
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(pred.cueDeflectLine.startX, pred.cueDeflectLine.startY);
        ctx.lineTo(pred.cueDeflectLine.endX, pred.cueDeflectLine.endY);
        ctx.stroke();
      }
    } else if (pred.cushionBounceLine) {
      // Cushion reflection line
      ctx.strokeStyle = 'rgba(0, 255, 136, 0.7)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(pred.cushionBounceLine.startX, pred.cushionBounceLine.startY);
      ctx.lineTo(pred.cushionBounceLine.endX, pred.cushionBounceLine.endY);
      ctx.stroke();
    }

    ctx.restore();
  }
}

// Instantiate game when DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
  window.gameInstance = new Game();
});
