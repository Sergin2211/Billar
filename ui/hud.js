/**
 * CueRogue - UI & HUD Manager
 * Renders Balatro score displays, interactive shop, spin controller, inventory tooltips, and modals.
 */

import { RELICS_CATALOG, SPECIAL_BALLS_CATALOG } from '../game/roguelike.js';
import { audio } from '../engine/audio.js';

export class HUDManager {
  constructor(game) {
    this.game = game;

    // Cache DOM Elements
    this.dom = {
      // Top bar
      actDisplay: document.getElementById('act-display'),
      tableDisplay: document.getElementById('table-display'),
      bossBadge: document.getElementById('boss-badge'),
      targetScoreVal: document.getElementById('target-score-val'),
      currentScoreVal: document.getElementById('current-score-val'),
      scoreProgressBar: document.getElementById('score-progress-bar'),
      moneyDisplay: document.getElementById('money-display'),
      shotsDisplay: document.getElementById('shots-display'),
      audioToggleBtn: document.getElementById('audio-toggle-btn'),

      // Left sidebar - Balatro Box
      shotPointsVal: document.getElementById('shot-points-val'),
      shotMultVal: document.getElementById('shot-mult-val'),
      shotTotalVal: document.getElementById('shot-total-val'),
      pointsBox: document.querySelector('.points-box'),
      multBox: document.querySelector('.mult-box'),
      comboLog: document.getElementById('combo-log'),

      // Relics
      relicsCount: document.getElementById('relics-count'),
      relicsList: document.getElementById('relics-list'),

      // Spin
      spinCanvas: document.getElementById('spin-canvas'),
      resetSpinBtn: document.getElementById('reset-spin-btn'),

      // Center alerts & gauges
      tableAlertBanner: document.getElementById('table-alert-banner'),
      tableAlertText: document.getElementById('table-alert-text'),
      powerGaugeOverlay: document.getElementById('power-gauge-overlay'),
      powerBarFill: document.getElementById('power-bar-fill'),

      // Right sidebar
      ballsCount: document.getElementById('balls-count'),
      ballsInventoryList: document.getElementById('balls-inventory-list'),

      // Modals
      menuModal: document.getElementById('menu-modal'),
      startGameBtn: document.getElementById('start-game-btn'),
      shopModal: document.getElementById('shop-modal'),
      shopMoneyDisplay: document.getElementById('shop-money-display'),
      shopRelicsList: document.getElementById('shop-relics-list'),
      shopBallsList: document.getElementById('shop-balls-list'),
      shopRerollBtn: document.getElementById('shop-reroll-btn'),
      shopContinueBtn: document.getElementById('shop-continue-btn'),

      // Victory / Defeat modals
      roundClearModal: document.getElementById('round-clear-modal'),
      summaryScore: document.getElementById('summary-score'),
      summaryShotsLeft: document.getElementById('summary-shots-left'),
      summaryShotsBonus: document.getElementById('summary-shots-bonus'),
      summaryInterestBonus: document.getElementById('summary-interest-bonus'),
      summaryTotalCash: document.getElementById('summary-total-cash'),
      goToShopBtn: document.getElementById('go-to-shop-btn'),

      gameOverModal: document.getElementById('game-over-modal'),
      defeatFinalScore: document.getElementById('defeat-final-score'),
      defeatTablesCleared: document.getElementById('defeat-tables-cleared'),
      restartGameBtn: document.getElementById('restart-game-btn'),

      victoryModal: document.getElementById('victory-modal'),
      victoryFinalScore: document.getElementById('victory-final-score'),
      victoryFinalCash: document.getElementById('victory-final-cash'),
      victoryRestartBtn: document.getElementById('victory-restart-btn'),

      // Floating Tooltip
      globalTooltip: document.getElementById('global-tooltip')
    };

    // Spin Controller Setup
    this.spinCtx = this.dom.spinCanvas.getContext('2d');
    this.spinX = 0; // -1 to 1
    this.spinY = 0; // -1 to 1 (negative = back spin, positive = top spin)
    this.isDraggingSpin = false;

    this.initSpinController();
    this.bindEvents();
  }

  initSpinController() {
    this.renderSpinCanvas();

    const handleSpinMove = (e) => {
      if (!this.isDraggingSpin && e.type !== 'click') return;
      const rect = this.dom.spinCanvas.getBoundingClientRect();
      const clientX = e.clientX || (e.touches && e.touches[0].clientX);
      const clientY = e.clientY || (e.touches && e.touches[0].clientY);
      const rawX = clientX - rect.left - rect.width / 2;
      const rawY = clientY - rect.top - rect.height / 2;
      const radius = rect.width / 2 - 6;

      const dist = Math.hypot(rawX, rawY);
      const clampedDist = Math.min(radius, dist);
      const angle = Math.atan2(rawY, rawX);

      this.spinX = (Math.cos(angle) * clampedDist) / radius;
      // Invert Y so up is Top Spin (positive) and down is Back Spin (negative)
      this.spinY = -(Math.sin(angle) * clampedDist) / radius;

      // Update cue ball entity
      if (this.game.cueBall) {
        this.game.cueBall.spinX = this.spinX;
        this.game.cueBall.spinY = this.spinY;
      }
      this.renderSpinCanvas();
    };

    this.dom.spinCanvas.addEventListener('mousedown', (e) => {
      this.isDraggingSpin = true;
      handleSpinMove(e);
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isDraggingSpin) handleSpinMove(e);
    });

    window.addEventListener('mouseup', () => {
      this.isDraggingSpin = false;
    });

    this.dom.resetSpinBtn.addEventListener('click', () => {
      this.spinX = 0;
      this.spinY = 0;
      if (this.game.cueBall) {
        this.game.cueBall.spinX = 0;
        this.game.cueBall.spinY = 0;
      }
      this.renderSpinCanvas();
    });
  }

  renderSpinCanvas() {
    const ctx = this.spinCtx;
    const w = this.dom.spinCanvas.width;
    const h = this.dom.spinCanvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const r = cx - 6;

    ctx.clearRect(0, 0, w, h);

    // Ball 3D Gradient
    const grad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.7, '#e2e8f0');
    grad.addColorStop(1, '#94a3b8');

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Crosshairs
    ctx.strokeStyle = 'rgba(71, 85, 105, 0.4)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(cx, cy - r + 4);
    ctx.lineTo(cx, cy + r - 4);
    ctx.moveTo(cx - r + 4, cy);
    ctx.lineTo(cx + r - 4, cy);
    ctx.stroke();
    ctx.setLineDash([]);

    // Red contact point
    const dotX = cx + this.spinX * (r - 6);
    const dotY = cy - this.spinY * (r - 6); // Note inversion: spinY positive is up

    ctx.beginPath();
    ctx.arc(dotX, dotY, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#ef4444';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Subtle glow on dot
    ctx.beginPath();
    ctx.arc(dotX, dotY, 7, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  bindEvents() {
    // Audio toggle
    this.dom.audioToggleBtn.addEventListener('click', () => {
      audio.ensureContext();
      const isMuted = audio.toggleMute();
      this.dom.audioToggleBtn.textContent = isMuted ? '🔇' : '🔊';
      this.dom.audioToggleBtn.title = isMuted ? 'Activar Sonido' : 'Silenciar Sonido';
    });

    // Start Game
    this.dom.startGameBtn.addEventListener('click', () => {
      audio.ensureContext();
      this.dom.menuModal.classList.add('hidden');
      this.game.startNewGame();
    });

    // Go to shop
    this.dom.goToShopBtn.addEventListener('click', () => {
      this.dom.roundClearModal.classList.add('hidden');
      this.game.openShop();
    });

    // Shop Reroll
    this.dom.shopRerollBtn.addEventListener('click', () => {
      this.game.rerollShop();
    });

    // Shop Continue / Next Table
    this.dom.shopContinueBtn.addEventListener('click', () => {
      this.dom.shopModal.classList.add('hidden');
      this.game.proceedToNextTable();
    });

    // Restart after game over
    this.dom.restartGameBtn.addEventListener('click', () => {
      this.dom.gameOverModal.classList.add('hidden');
      this.game.startNewGame();
    });

    // Restart after victory
    this.dom.victoryRestartBtn.addEventListener('click', () => {
      this.dom.victoryModal.classList.add('hidden');
      this.game.startNewGame();
    });
  }

  updateHeader(roguelike) {
    this.dom.actDisplay.textContent = `ACTO ${roguelike.act}`;
    const tableNum = ((roguelike.tableIndex) % 4) + 1;
    this.dom.tableDisplay.textContent = `MESA ${tableNum}/4`;

    const isBoss = roguelike.currentTable.boss !== null;
    if (isBoss) {
      this.dom.bossBadge.classList.remove('hidden');
      this.dom.bossBadge.textContent = roguelike.currentTable.title;
      this.dom.bossBadge.title = roguelike.currentTable.description;
    } else {
      this.dom.bossBadge.classList.add('hidden');
    }

    this.dom.targetScoreVal.textContent = roguelike.currentTable.targetScore.toLocaleString();
    this.dom.currentScoreVal.textContent = roguelike.score.toLocaleString();

    const progress = Math.min(100, Math.floor((roguelike.score / roguelike.currentTable.targetScore) * 100));
    this.dom.scoreProgressBar.style.width = `${progress}%`;

    this.dom.moneyDisplay.textContent = `$${roguelike.money}`;
    const safeShots = Math.max(0, roguelike.shotsRemaining);
    this.dom.shotsDisplay.textContent = `${safeShots} Tiros`;
  }

  updateBalatroScore(basePoints, multiplier, isBump = false) {
    this.dom.shotPointsVal.textContent = basePoints;
    this.dom.shotMultVal.textContent = multiplier;
    this.dom.shotTotalVal.textContent = (basePoints * multiplier).toLocaleString();

    if (isBump) {
      this.dom.pointsBox.classList.add('bump');
      this.dom.multBox.classList.add('bump');
      setTimeout(() => {
        this.dom.pointsBox.classList.remove('bump');
        this.dom.multBox.classList.remove('bump');
      }, 150);
    }
  }

  logCombo(text, type = 'normal') {
    const item = document.createElement('div');
    item.className = `combo-item ${type}`;
    item.textContent = text;
    this.dom.comboLog.appendChild(item);
    this.dom.comboLog.scrollTop = this.dom.comboLog.scrollHeight;

    while (this.dom.comboLog.children.length > 5) {
      this.dom.comboLog.removeChild(this.dom.comboLog.firstChild);
    }
  }

  clearComboLog() {
    this.dom.comboLog.innerHTML = '<div class="combo-item highlight">¡Nuevo tiro en marcha!</div>';
  }

  updateRelics(roguelike) {
    this.dom.relicsCount.textContent = `${roguelike.relics.size}/${roguelike.maxRelics}`;
    this.dom.relicsList.innerHTML = '';

    const ownedList = Array.from(roguelike.relics);
    for (let i = 0; i < roguelike.maxRelics; i++) {
      const slot = document.createElement('div');
      if (i < ownedList.length) {
        const relic = RELICS_CATALOG[ownedList[i]];
        slot.className = 'relic-slot active';
        slot.textContent = relic.icon;
        slot.addEventListener('mouseenter', (e) => {
          this.showTooltip(relic.name, relic.description, e.clientX, e.clientY);
        });
        slot.addEventListener('mouseleave', () => this.hideTooltip());
      } else {
        slot.className = 'relic-slot empty';
        slot.innerHTML = '<span>+</span>';
      }
      this.dom.relicsList.appendChild(slot);
    }
  }

  updateBallsList(balls) {
    const activeBalls = balls.filter(b => b.inPlay && b.type !== 'cue');
    this.dom.ballsCount.textContent = activeBalls.length;
    this.dom.ballsInventoryList.innerHTML = '';

    activeBalls.forEach(ball => {
      const token = document.createElement('div');
      token.className = 'ball-token';
      token.style.backgroundColor = ball.color;
      token.style.color = ball.textColor;
      token.textContent = ball.type === 'standard' ? ball.number : (ball.type === 'gold' ? '★' : ball.type === 'bomb' ? '💣' : ball.type === 'crystal' ? '✦' : ball.type[0].toUpperCase());

      token.addEventListener('mouseenter', (e) => {
        let name = `Bola #${ball.number} (${ball.basePoints} pts)`;
        let desc = 'Bola estándar de billar.';
        if (ball.type !== 'standard') {
          const spec = SPECIAL_BALLS_CATALOG[ball.type];
          if (spec) {
            name = `${spec.name} (${ball.getEffectiveBasePoints()} pts)`;
            desc = spec.description;
            if (ball.vampireBonus > 0) {
              desc += ` [Bono Vampiro: +${ball.vampireBonus} pts]`;
            }
          }
        }
        this.showTooltip(name, desc, e.clientX, e.clientY);
      });
      token.addEventListener('mouseleave', () => this.hideTooltip());

      this.dom.ballsInventoryList.appendChild(token);
    });
  }

  showBanner(text, duration = 2500) {
    this.dom.tableAlertText.textContent = text;
    this.dom.tableAlertBanner.classList.remove('hidden');
    if (this.bannerTimeout) clearTimeout(this.bannerTimeout);
    this.bannerTimeout = setTimeout(() => {
      this.dom.tableAlertBanner.classList.add('hidden');
    }, duration);
  }

  hideBanner() {
    this.dom.tableAlertBanner.classList.add('hidden');
  }

  setPowerGauge(ratio) {
    if (ratio > 0) {
      this.dom.powerGaugeOverlay.classList.remove('hidden');
      this.dom.powerBarFill.style.width = `${Math.min(100, Math.floor(ratio * 100))}%`;
    } else {
      this.dom.powerGaugeOverlay.classList.add('hidden');
      this.dom.powerBarFill.style.width = '0%';
    }
  }

  renderShop(offerings, roguelike) {
    this.dom.shopMoneyDisplay.textContent = `$${roguelike.money}`;
    this.dom.shopRelicsList.innerHTML = '';
    this.dom.shopBallsList.innerHTML = '';

    // Render Relics
    offerings.relics.forEach(relic => {
      const card = document.createElement('div');
      card.className = 'shop-item-card';

      const canAfford = roguelike.money >= relic.cost && roguelike.relics.size < roguelike.maxRelics;
      const isMaxRelics = roguelike.relics.size >= roguelike.maxRelics;

      card.innerHTML = `
        <div class="shop-item-left">
          <div class="shop-item-icon">${relic.icon}</div>
          <div class="shop-item-info">
            <span class="shop-item-name">${relic.name}</span>
            <span class="shop-item-desc">${relic.description}</span>
          </div>
        </div>
        <button class="shop-buy-btn" ${!canAfford ? 'disabled' : ''}>
          ${isMaxRelics ? 'LLENO' : `$${relic.cost}`}
        </button>
      `;

      const buyBtn = card.querySelector('.shop-buy-btn');
      buyBtn.addEventListener('click', () => {
        if (this.game.buyRelic(relic)) {
          card.style.opacity = '0.3';
          buyBtn.disabled = true;
          buyBtn.textContent = 'COMPRADO';
          this.dom.shopMoneyDisplay.textContent = `$${roguelike.money}`;
        }
      });

      this.dom.shopRelicsList.appendChild(card);
    });

    // Render Special Balls
    offerings.balls.forEach(ball => {
      const card = document.createElement('div');
      card.className = 'shop-item-card';

      const canAfford = roguelike.money >= ball.cost;

      card.innerHTML = `
        <div class="shop-item-left">
          <div class="shop-item-icon">${ball.icon}</div>
          <div class="shop-item-info">
            <span class="shop-item-name">${ball.name}</span>
            <span class="shop-item-desc">${ball.description}</span>
          </div>
        </div>
        <button class="shop-buy-btn" ${!canAfford ? 'disabled' : ''}>
          $${ball.cost}
        </button>
      `;

      const buyBtn = card.querySelector('.shop-buy-btn');
      buyBtn.addEventListener('click', () => {
        if (this.game.buySpecialBall(ball)) {
          card.style.opacity = '0.3';
          buyBtn.disabled = true;
          buyBtn.textContent = 'AÑADIDO';
          this.dom.shopMoneyDisplay.textContent = `$${roguelike.money}`;
        }
      });

      this.dom.shopBallsList.appendChild(card);
    });

    this.dom.shopModal.classList.remove('hidden');
  }

  showRoundClear(reward, finalScore, shotsLeft) {
    this.dom.summaryScore.textContent = finalScore.toLocaleString();
    this.dom.summaryShotsLeft.textContent = Math.max(0, shotsLeft);
    this.dom.summaryShotsBonus.textContent = `+$${reward.shotsBonus}`;
    this.dom.summaryInterestBonus.textContent = `+$${reward.interest}`;
    this.dom.summaryTotalCash.textContent = `+$${reward.totalEarned}`;
    this.dom.roundClearModal.classList.remove('hidden');
  }

  showGameOver(finalScore, tablesCleared) {
    this.dom.defeatFinalScore.textContent = finalScore.toLocaleString();
    this.dom.defeatTablesCleared.textContent = tablesCleared;
    this.dom.gameOverModal.classList.remove('hidden');
  }

  showVictory(finalScore, money) {
    this.dom.victoryFinalScore.textContent = finalScore.toLocaleString();
    this.dom.victoryFinalCash.textContent = `$${money}`;
    this.dom.victoryModal.classList.remove('hidden');
  }

  showTooltip(title, desc, clientX, clientY) {
    const tip = this.dom.globalTooltip;
    tip.innerHTML = `
      <div class="tooltip-title">${title}</div>
      <div class="tooltip-desc">${desc}</div>
    `;
    tip.classList.remove('hidden');

    const tipWidth = 230;
    const tipHeight = tip.offsetHeight || 60;
    let x = clientX + 16;
    let y = clientY + 16;

    if (x + tipWidth > window.innerWidth) x = clientX - tipWidth - 10;
    if (y + tipHeight > window.innerHeight) y = clientY - tipHeight - 10;

    tip.style.left = `${x}px`;
    tip.style.top = `${y}px`;
  }

  hideTooltip() {
    this.dom.globalTooltip.classList.add('hidden');
  }
}
