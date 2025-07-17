// Types pour les Decks (jeux de cartes)
export interface Deck {
  id: string
  name: string
  description?: string
  icon?: string
  cardCount: number
  dueCount: number
  newCount: number
  createdAt: Date
  updatedAt: Date
  settings?: DeckSettings
}

export interface DeckSettings {
  newCardsPerDay: number
  reviewsPerDay: number
  autoPlay: boolean
}

// Types pour les Flashcards
export interface Card {
  id: string
  deckId: string
  front: string
  back: string
  createdAt: Date
  updatedAt: Date
  
  // FSRS Algorithm Data
  stability: number
  difficulty: number
  elapsedDays: number
  scheduledDays: number
  reps: number
  lapses: number
  state: CardState
  lastReview?: Date
  nextReview?: Date
}

export enum CardState {
  New = 0,
  Learning = 1,
  Review = 2,
  Relearning = 3
}

// Types pour les révisions
export interface ReviewLog {
  id: string
  cardId: string
  deckId: string
  rating: Rating
  state: CardState
  elapsedDays: number
  scheduledDays: number
  reviewedAt: Date
}

export enum Rating {
  Again = 1,
  Hard = 2,
  Good = 3,
  Easy = 4
}

// Types pour le mode de révision
export enum ReviewMode {
  SINGLE_DECK = 'single',
  ALL_DECKS = 'all',
  SELECTED_DECKS = 'selected'
}

export interface ReviewSession {
  mode: ReviewMode
  deckIds: string[]
  currentCard?: Card
  queue: Card[]
  completed: number
  startedAt: Date
}

// Types pour les jeux
export enum GameType {
  TETRIS = 'tetris',
  PACMAN = 'pacman',
  SPACE_INVADERS = 'space-invaders',
  PONG = 'pong'
}

export interface GameSession {
  gameType: GameType
  score: number
  linesCleared: number
  cardsReviewed: number
  startedAt: Date
  endedAt?: Date
}

// Types pour la progression
export interface UserProgress {
  level: MemoryLevel
  totalCards: number
  streak: number
  lastReviewDate?: Date
  dailyCards: number
  achievements: Achievement[]
}

export interface MemoryLevel {
  id: string
  name: string
  icon: string
  requiredCards: number
  requiredDays: number
}

export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  unlockedAt: Date
}