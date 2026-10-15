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

    // Active shot statistics for Balatro scoring
    this.turnStats = this.createEmptyTurnStats();
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
