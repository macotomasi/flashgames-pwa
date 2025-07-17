export interface MemoryLevel {
  id: string
  name: string
  icon: string
  requiredCards: number
  description: string
}

export const MEMORY_LEVELS: MemoryLevel[] = [
  { id: 'worm', name: 'Ver de terre', icon: '🪱', requiredCards: 5, description: 'Une mémoire naissante' },
  { id: 'ant', name: 'Fourmi', icon: '🐜', requiredCards: 10, description: 'Petit mais déterminé' },
  { id: 'dory', name: 'Dory', icon: '🐠', requiredCards: 15, description: 'Je me souviens... parfois' },
  { id: 'goldfish', name: 'Poisson rouge', icon: '🐟', requiredCards: 20, description: 'Mémoire courte mais stable' },
  { id: 'homer', name: 'Homer', icon: '🍩', requiredCards: 30, description: 'D\'oh! Je me souviens' },
  { id: 'obelix', name: 'Obélix', icon: '🗿', requiredCards: 40, description: 'Mémoire solide comme un menhir' },
  { id: 'asterix', name: 'Astérix', icon: '⚔️', requiredCards: 50, description: 'Rusé et mémorisant' },
  { id: 'cat', name: 'Chat', icon: '🐱', requiredCards: 70, description: 'Mémoire féline' },
  { id: 'dolphin', name: 'Dauphin', icon: '🐬', requiredCards: 100, description: 'Intelligence aquatique' },
  { id: 'whale', name: 'Cachalot', icon: '🐋', requiredCards: 150, description: 'Mémoire océanique' },
  { id: 'elephant', name: 'Éléphant', icon: '🐘', requiredCards: 200, description: 'N\'oublie jamais' },
  { id: 'yoda', name: 'Yoda', icon: '🧘', requiredCards: 300, description: 'La Force de la mémoire' },
  { id: 'sherlock', name: 'Sherlock Holmes', icon: '🔍', requiredCards: 400, description: 'Palais mental' },
  { id: 'curie', name: 'Marie Curie', icon: '⚛️', requiredCards: 500, description: 'Mémoire scientifique' },
  { id: 'walle', name: 'Wall-E', icon: '🤖', requiredCards: 600, description: 'Mémoire robotique' },
  { id: 'einstein', name: 'Albert Einstein', icon: '🧠', requiredCards: 700, description: 'E=MC²' },
  { id: 'hal9000', name: 'HAL 9000', icon: '👁️', requiredCards: 800, description: 'Je ne peux pas faire ça' },
  { id: 'c3po', name: 'C-3PO', icon: '🤖', requiredCards: 900, description: 'Maîtrise 6 millions de formes' },
  { id: 'chatgpt', name: 'ChatGPT', icon: '💬', requiredCards: 1000, description: 'IA de mémoire' },
  { id: 'deepblue', name: 'Deep Blue', icon: '♟️', requiredCards: 1100, description: 'Mémoire d\'échecs' }
]

export interface DailyReward {
  id: string
  name: string
  icon: string
  requiredNewCards: number
  description: string
}

export const DAILY_REWARDS: DailyReward[] = [
  { id: 'candle', name: 'Bougie', icon: '🕯️', requiredNewCards: 5, description: 'Une lueur de connaissance' },
  { id: 'fire', name: 'Feu', icon: '🔥', requiredNewCards: 10, description: 'La flamme du savoir' },
  { id: 'bulb', name: 'Ampoule', icon: '💡', requiredNewCards: 15, description: 'Illumination!' },
  { id: 'flash', name: 'Flash', icon: '📸', requiredNewCards: 20, description: 'Éclair de génie' },
  { id: 'lightning', name: 'Éclair', icon: '⚡', requiredNewCards: 25, description: 'Puissance électrique' },
  { id: 'comet', name: 'Comète', icon: '☄️', requiredNewCards: 30, description: 'Trajectoire brillante (+1 jour de streak)' },
  { id: 'star', name: 'Étoile', icon: '⭐', requiredNewCards: 35, description: 'Brille dans le ciel' },
  { id: 'galaxy', name: 'Galaxie', icon: '🌌', requiredNewCards: 40, description: 'Univers de connaissances (+3 jours de streak)' }
]

export interface UserProgress {
  // Memory level
  currentLevel: string
  memorizedCards: number // Cards with interval >= 3 days
  
  // Daily progress
  dailyReward: string | null
  newCardsToday: number
  lastResetDate: string // ISO date string
  
  // Streak
  currentStreak: number
  lastStreakDate: string // ISO date string
  streakBonus: number // Extra days from rewards
  
  // Game stats
  bestScore: number
  totalGamesPlayed: number
  consecutiveCorrectAnswers: number
  
  // Achievements
  unlockedAchievements: string[]
  lastAchievementDate?: string
}

export interface BossCardSession {
  isActive: boolean
  cardId: string | null
  attemptsCount: number
}