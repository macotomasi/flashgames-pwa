// Types pour les Decks (jeux de cartes)
export interface Deck {
  id: string
  name: string
  description?: string
  icon?: string
  cardCount: number
  dueCount: number
  newCount: number
  createdAt: number // timestamp
  updatedAt: number // timestamp
  // settings?: DeckSettings // à garder si utilisé dans la base
}

// Types pour les Flashcards
export interface Card {
  id: string
  deckId: string
  front: string
  back: string
  createdAt: number // timestamp
  updatedAt: number // timestamp
  stability: number
  difficulty: number
  elapsedDays: number
  scheduledDays: number
  reps: number
  lapses: number
  state: CardState
  lastReview?: number // timestamp
  nextReview?: number // timestamp
}

export enum CardState {
  New = 0,
  Learning = 1,
  Review = 2,
  Relearning = 3
}

export enum GameType {
  TETRIS = 'tetris',
  PACMAN = 'pacman',
  SPACE_INVADERS = 'space-invaders',
  PONG = 'pong'
}

export enum ReviewMode {
  SINGLE_DECK = 'single',
  ALL_DECKS = 'all',
  SELECTED_DECKS = 'selected'
}

export enum Rating {
  Again = 1,
  Hard = 2,
  Good = 3,
  Easy = 4
}

export interface ReviewLog {
  id: string
  cardId: string
  deckId: string
  rating: Rating
  state: CardState
  elapsedDays: number
  scheduledDays: number
  reviewedAt: number // timestamp
}

export interface ReviewSession {
  mode: ReviewMode
  deckIds: string[]
  currentCard?: Card
  queue: Card[]
  completed: number
  startedAt: number // timestamp
}

export interface GameSession {
  gameType: GameType
  score: number
  linesCleared: number
  cardsReviewed: number
  startedAt: number // timestamp
  endedAt?: number // timestamp
}

// Types pour la progression (à adapter si besoin)
export interface UserProgress {
  level: MemoryLevel
  totalCards: number
  streak: number
  lastReviewDate?: number // timestamp
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
  unlockedAt: number // timestamp
}

// Re-export progression types
export * from './progression'