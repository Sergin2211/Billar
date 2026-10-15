/**
 * CueRogue - Roguelike Progression & Synergies Engine
 * Relics catalog, special balls catalog, table configurations, scoring formulas, economy.
 */

export const RELICS_CATALOG = {
  carbon_cue: {
    id: 'carbon_cue',
    name: 'Taco de Carbono',
    icon: '🦯',
    cost: 6,
    description: '+30% de potencia máxima de tiro.',
    category: 'taco'
  },
  laser_sight: {
    id: 'laser_sight',
    name: 'Mira Láser',
    icon: '🔴',
    cost: 5,
    description: 'Extiende la línea de predicción de tiro al doble de longitud.',
    category: 'apuntado'
  },
  magic_chalk: {
    id: 'magic_chalk',
    name: 'Tiza Mágica',
    icon: '🧊',
    cost: 6,
    description: 'Los tiros con Top Spin o Back Spin otorgan +2 de Multiplicador.',
    category: 'spin'
  },
  sacred_geometry: {
    id: 'sacred_geometry',
    name: 'Geometría Sagrada',
    icon: '📐',
    cost: 7,
    description: 'Cada rebote en banda suma +15 Puntos Base al tiro actual.',
    category: 'combo'
  },
  black_hole: {
    id: 'black_hole',
    name: 'Agujero Negro',
    icon: '🕳️',
    cost: 8,
    description: 'Aumenta el radio de captura de las troneras en un +25%.',
    category: 'tronera'
  },
  broken_pockets: {
    id: 'broken_pockets',
    name: 'Bolsillos Rotos',
    icon: '🎱',
    cost: 7,
    description: 'Otorga +2 Tiros adicionales al inicio de cada mesa.',
    category: 'tiros'
  },
  quantum_physics: {
    id: 'quantum_physics',
    name: 'Física Cuántica',
    icon: '⚛️',
    cost: 8,
    description: 'El primer choque de cada tiro duplica el Multiplicador actual (x2).',
    category: 'combo'
  },
  lucky_coin: {
    id: 'lucky_coin',
    name: 'Moneda de la Suerte',
    icon: '🪙',
    cost: 5,
    description: 'Embocar en las troneras centrales otorga $2 instantáneos.',
    category: 'dinero'
  },
  ice_cloth: {
    id: 'ice_cloth',
    name: 'Paño de Hielo',
    icon: '❄️',
    cost: 6,
    description: 'Reduce la fricción de la mesa en un 40% (las bolas ruedan mucho más).',
    category: 'mesa'
  },
  last_breath: {
    id: 'last_breath',
    name: 'Último Aliento',
    icon: '💀',
    cost: 9,
    description: 'En tu último tiro disponible de la mesa, el Multiplicador se triplica (x3).',
    category: 'clutch'
  }
};

export const SPECIAL_BALLS_CATALOG = {
  gold: {
    type: 'gold',
    name: 'Bola de Oro',
    icon: '🪙',
    cost: 5,
    description: 'Otorga 20 pts base y genera +$3 en efectivo al ser embocada.'
  },
  crystal: {
    type: 'crystal',
    name: 'Bola de Cristal',
    icon: '💎',
    cost: 6,
    description: 'Multiplica x2 el Multiplicador final al embocarse. 25% riesgo de romperse al chocar fuerte.'
  },
  bomb: {
    type: 'bomb',
    name: 'Bola Explosiva',
    icon: '💣',
    cost: 7,
    description: 'Al embocarla o chocar a alta velocidad, genera una onda expansiva y otorga 50 pts.'
  },
  ghost: {
    type: 'ghost',
    name: 'Bola Fantasma',
    icon: '👻',
    cost: 5,
    description: 'Atraviesa otras bolas sin colisionar. Rebota en bandas y otorga 25 pts al embocarse.'
  },
  magnet: {
    type: 'magnet',
    name: 'Bola Imán',
    icon: '🧲',
    cost: 6,
    description: 'Atrae ligeramente hacia su trayectoria a las bolas cercanas.'
  },
  vampire: {
    type: 'vampire',
    name: 'Bola Vampiro',
    icon: '🦇',
    cost: 6,
    description: 'Roba 5 pts base a cada bola que golpea y los añade a sí misma en la mesa.'
  },
  rainbow: {
    type: 'rainbow',
    name: 'Bola Arcoíris',
    icon: '🌈',
    cost: 7,
    description: 'Suma +3 al Multiplicador por cada banda que toque antes de entrar.'
  }
};

export const TABLE_CONFIGS = [
  // ACT 1: EL CLUB CLANDESTINO
  { act: 1, table: 1, targetScore: 150, shots: 5, boss: null, title: 'Mesa de Calentamiento' },
  { act: 1, table: 2, targetScore: 320, shots: 5, boss: null, title: 'Tapete Callejero' },
  { act: 1, table: 3, targetScore: 550, shots: 5, boss: null, title: 'Apuestas Bajas' },
  {
    act: 1,
    table: 4,
    targetScore: 900,
    shots: 5,
    boss: 'arquitecto',
    title: 'JEFE: El Arquitecto',
    description: 'Dos pilares sólidos en el centro de la mesa obstruyen tus tiros.'
  },

  // ACT 2: EL CASINO CYBERPUNK
  { act: 2, table: 1, targetScore: 1400, shots: 5, boss: null, title: 'Salón Neón' },
  { act: 2, table: 2, targetScore: 2200, shots: 5, boss: null, title: 'Mesa Alta Tensión' },
  { act: 2, table: 3, targetScore: 3300, shots: 5, boss: null, title: 'El Foso de las Luces' },
  {
    act: 2,
    table: 4,
    targetScore: 4800,
    shots: 5,
    boss: 'usurero',
    title: 'JEFE: El Usurero',
    description: 'Cada tiro te cobra $1 de tu banco en concepto de comisión.'
  },

  // ACT 3: LA CRIPTA DEL ABISMO
  { act: 3, table: 1, targetScore: 6800, shots: 5, boss: null, title: 'Mesa de Diamante' },
  { act: 3, table: 2, targetScore: 9800, shots: 5, boss: null, title: 'La Sala Oscura' },
  { act: 3, table: 3, targetScore: 13800, shots: 5, boss: null, title: 'El Gran Tapete' },
  {
    act: 3,
    table: 4,
    targetScore: 19000,
    shots: 5,
    boss: 'abismo',
    title: 'JEFE FINAL: El Abismo',
    description: 'Dos troneras son trampas rojas mortales: no dan puntos y restan 1 tiro.'
  }
];

export class RoguelikeManager {
  constructor() {
    this.act = 1;
    this.tableIndex = 0; // 0 to 11 (12 tables total)
    this.money = 10;
    this.score = 0;
    this.totalCareerScore = 0;
    this.tablesCleared = 0;
    this._shotsRemaining = 5;

    // Relics owned (Set of IDs)
    this.relics = new Set();
    this.maxRelics = 5;

    // Special balls pool in deck (will spawn on table along standard balls)
    this.specialBallsDeck = [];

    // Current table config
    this.currentTable = TABLE_CONFIGS[0];
  }

  get shotsRemaining() {
    return Math.max(0, this._shotsRemaining || 0);
  }

  set shotsRemaining(val) {
    this._shotsRemaining = Math.max(0, val || 0);
  }

  reset() {
    this.act = 1;
    this.tableIndex = 0;
    this.money = 10;
    this.score = 0;
    this.totalCareerScore = 0;
    this.tablesCleared = 0;
    this.relics.clear();
    this.specialBallsDeck = [];
    this.loadTable(0);
  }

  loadTable(index) {
    this.tableIndex = index;
    this.currentTable = TABLE_CONFIGS[this.tableIndex];
    this.act = this.currentTable.act;
    this.score = 0;

    // Shots modified by Broken Pockets relic (+2 shots)
    let initialShots = this.currentTable.shots;
    if (this.relics.has('broken_pockets')) {
      initialShots += 2;
    }
    this.shotsRemaining = initialShots;
  }

  hasRelic(id) {
    return this.relics.has(id);
  }

  addRelic(id) {
    if (this.relics.size >= this.maxRelics) return false;
    this.relics.add(id);
    return true;
  }

  addSpecialBall(type) {
    this.specialBallsDeck.push(type);
  }

  /**
   * Generates random shop items avoiding duplicates.
   */
  generateShopOfferings() {
    // Pick 3 available relics not already owned
    const availableRelics = Object.values(RELICS_CATALOG).filter(r => !this.relics.has(r.id));
    this.shuffle(availableRelics);
    const shopRelics = availableRelics.slice(0, 3);

    // Pick 2 special balls
    const allBalls = Object.values(SPECIAL_BALLS_CATALOG);
    this.shuffle(allBalls);
    const shopBalls = allBalls.slice(0, 2);

    return { relics: shopRelics, balls: shopBalls };
  }

  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /**
   * Calculate end of table reward.
   */
  calculateRoundClearReward() {
    const baseWin = 5;
    const safeShots = Math.max(0, this.shotsRemaining);
    const shotsBonus = safeShots * 1;
    // Interest: $1 per $5 saved (max $5)
    const interest = Math.min(5, Math.floor(this.money / 5));
    const totalEarned = baseWin + shotsBonus + interest;

    return {
      baseWin,
      shotsBonus,
      interest,
      totalEarned
    };
  }
}
