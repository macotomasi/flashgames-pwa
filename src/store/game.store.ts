import { create } from 'zustand'
import { GameType, GameSession, Card } from '@/types'

interface GameStore {
  // State
  currentGame: GameType | null
  isPlaying: boolean
  isPaused: boolean
  score: number
  linesCleared: number
  currentSession: GameSession | null
  
  // Flashcard integration
  flashcardVisible: boolean
  currentFlashcard: Card | null
  piecesSinceLastCard: number
  nextFlashcardThreshold: number
  
  // Actions
  startGame: (gameType: GameType) => void
  endGame: () => void
  pauseGame: () => void
  resumeGame: () => void
  updateScore: (points: number) => void
  addPenaltyLine: () => void
  clearLines: (count: number) => void
  incrementPieceCount: () => void
  showFlashcard: (card: Card) => void
  hideFlashcard: () => void
  setNextThreshold: () => void
  
  // Callbacks
  onPenaltyLine?: () => void
}

export const useGameStore = create<GameStore>((set, get) => ({
  // Initial state
  currentGame: null,
  isPlaying: false,
  isPaused: false,
  score: 0,
  linesCleared: 0,
  currentSession: null,
  flashcardVisible: false,
  currentFlashcard: null,
  piecesSinceLastCard: 0,
  nextFlashcardThreshold: 5, // Start with 5
  
  // Start new game
  startGame: (gameType) => {
    const session: GameSession = {
      gameType,
      score: 0,
      linesCleared: 0,
      cardsReviewed: 0,
      startedAt: new Date()
    }
    
    set({
      currentGame: gameType,
      isPlaying: true,
      isPaused: false,
      score: 0,
      linesCleared: 0,
      currentSession: session,
      piecesSinceLastCard: 0,
      nextFlashcardThreshold: Math.floor(Math.random() * 9) + 3 // 3-11
    })
  },
  
  // End game
  endGame: () => {
    const { currentSession } = get()
    if (currentSession) {
      // TODO: Save session to database
      console.log('Game ended:', currentSession)
    }
    
    set({
      currentGame: null,
      isPlaying: false,
      isPaused: false,
      currentSession: null,
      flashcardVisible: false,
      piecesSinceLastCard: 0
    })
  },
  
  // Pause/Resume
  pauseGame: () => set({ isPaused: true }),
  resumeGame: () => set({ isPaused: false }),
  
  // Score management
  updateScore: (points) => {
    set(state => ({
      score: state.score + points,
      currentSession: state.currentSession 
        ? { ...state.currentSession, score: state.score + points }
        : null
    }))
  },
  
  // Penalty line
  addPenaltyLine: () => {
    const { onPenaltyLine } = get()
    if (onPenaltyLine) {
      onPenaltyLine()
    }
  },
  
  // Line management
  clearLines: (count) => {
    set(state => ({
      linesCleared: state.linesCleared + count,
      currentSession: state.currentSession
        ? { ...state.currentSession, linesCleared: state.linesCleared + count }
        : null
    }))
    
    // Add points for cleared lines
    get().updateScore(count * 100)
  },
  
  // Piece counting for flashcard trigger
  incrementPieceCount: () => {
    const { piecesSinceLastCard, nextFlashcardThreshold } = get()
    const newCount = piecesSinceLastCard + 1
    
    set({ piecesSinceLastCard: newCount })
    
    if (newCount >= nextFlashcardThreshold) {
      // Time to show a flashcard!
      // This will be handled by the game component
      return true
    }
    return false
  },
  
  // Flashcard visibility
  showFlashcard: (card) => {
    set({ 
      flashcardVisible: true,
      currentFlashcard: card,
      piecesSinceLastCard: 0
    })
  },
  
  hideFlashcard: () => {
    set({ 
      flashcardVisible: false,
      currentFlashcard: null
    })
    get().setNextThreshold()
  },
  
  // Set next threshold
  setNextThreshold: () => {
    set({
      nextFlashcardThreshold: Math.floor(Math.random() * 9) + 3 // 3-11
    })
  }
}))