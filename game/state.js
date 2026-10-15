/**
 * CueRogue - State Machine & Turn Manager
 * Manages game transitions: MENU -> AIMING -> BALLS_MOVING -> EVALUATING -> SHOP/WIN/GAMEOVER
 */

export const GameStates = {
  MENU: 'MENU',
  AIMING: 'AIMING',
  BALL_IN_HAND: 'BALL_IN_HAND',
  BALLS_MOVING: 'BALLS_MOVING',
  EVALUATING_SHOT: 'EVALUATING_SHOT',
  ROUND_OVER: 'ROUND_OVER',
  SHOP: 'SHOP',
  GAME_OVER: 'GAME_OVER',
  VICTORY: 'VICTORY'
};

export class GameStateManager {
  constructor() {
    this.currentState = GameStates.MENU;
    this.previousState = null;
    this.stateTime = 0;

    // Track shots and score on state manager with strict non-negative clamping
    this._shots = 0;
    this._score = 0;
    this._targetScore = 0;

    // Active shot statistics for Balatro scoring
    this.turnStats = this.createEmptyTurnStats();
  }

  get shots() {
    return Math.max(0, this._shots || 0);
  }

  set shots(val) {
    this._shots = Math.max(0, val || 0);
  }

  get score() {
    return Math.max(0, this._score || 0);
  }

  set score(val) {
    this._score = Math.max(0, val || 0);
  }

  get targetScore() {
    return Math.max(0, this._targetScore || 0);
  }

  set targetScore(val) {
    this._targetScore = Math.max(0, val || 0);
  }

  createEmptyTurnStats() {
    return {
      cushionsHit: 0,
      carambolas: 0,
      ballsPocketed: [],
      scratch: false,
      basePoints: 0,
      multiplier: 1,
      spinUsed: false,
      totalScoreCalculated: 0
    };
  }

  resetTurnStats() {
    this.turnStats = this.createEmptyTurnStats();
  }

  changeState(newState) {
    if (this.currentState === newState) return;
    this.previousState = this.currentState;
    this.currentState = newState;
    this.stateTime = 0;
  }

  update(dt) {
    this.stateTime += dt;
  }

  isState(state) {
    return this.currentState === state;
  }
}
