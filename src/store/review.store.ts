import { create } from 'zustand'
import { Card, ReviewSession, Rating } from '@/types'
import { db } from '@/services/db'
import { useDeckStore } from './deck.store'
import { fsrsEngine } from '@/modules/flashcards/fsrs/fsrs-engine'

interface ReviewStore {
  // State
  currentSession: ReviewSession | null
  currentCard: Card | null
  queue: Card[]
  isLoading: boolean
  
  // UI State
  showAnswer: boolean
  userChoice: 'know' | 'dontknow' | null
  
  // Actions
  startReviewSession: () => Promise<void>
  loadNextCard: () => Promise<void>
  setUserChoice: (choice: 'know' | 'dontknow') => void
  submitAnswer: (wasCorrect: boolean) => Promise<void>
  showAnswerAction: () => void
  endSession: () => void
  getCardsForGame: (forFun?: boolean) => Promise<Card[]>
  submitGameAnswer: (card: Card, wasCorrect: boolean, userChoice: 'know' | 'dontknow') => Promise<void>
}

export const useReviewStore = create<ReviewStore>((set, get) => ({
  // Initial state
  currentSession: null,
  currentCard: null,
  queue: [],
  isLoading: false,
  showAnswer: false,
  userChoice: null,
  
  // Start review session
  startReviewSession: async () => {
    set({ isLoading: true })
    
    const { reviewMode, selectedDeckId, selectedDeckIds } = useDeckStore.getState()
    
    // Determine which decks to review
    let deckIds: string[] = []
    if (reviewMode === 'single' && selectedDeckId) {
      deckIds = [selectedDeckId]
    } else if (reviewMode === 'selected') {
      deckIds = selectedDeckIds
    }
    // For 'all' mode, deckIds remains empty (review all decks)
    
    // Get all cards from selected decks
    const allCards: Card[] = []
    if (deckIds.length > 0) {
      for (const deckId of deckIds) {
        const cards = await db.cards.where('deckId').equals(deckId).toArray()
        const mappedCards = cards.map(card => ({
          ...card,
          createdAt: new Date(card.createdAt),
          updatedAt: new Date(card.updatedAt),
          lastReview: card.lastReview ? new Date(card.lastReview) : undefined,
          nextReview: card.nextReview ? new Date(card.nextReview) : undefined
        }))
        allCards.push(...mappedCards)
      }
    } else {
      // All decks
      const cards = await db.cards.toArray()
      const mappedCards = cards.map(card => ({
        ...card,
        createdAt: new Date(card.createdAt),
        updatedAt: new Date(card.updatedAt),
        lastReview: card.lastReview ? new Date(card.lastReview) : undefined,
        nextReview: card.nextReview ? new Date(card.nextReview) : undefined
      }))
      allCards.push(...mappedCards)
    }
    
    // Get cards to review using FSRS
    const cardsToReview = fsrsEngine.getCardsToReview(allCards)
    const sortedCards = fsrsEngine.sortByPriority(cardsToReview)
    
    const session: ReviewSession = {
      mode: reviewMode,
      deckIds,
      queue: sortedCards,
      completed: 0,
      startedAt: new Date()
    }
    
    set({
      currentSession: session,
      queue: sortedCards,
      isLoading: false
    })
    
    // Load first card
    await get().loadNextCard()
  },
  
// Get cards for game (limited set)
  getCardsForGame: async (forFun: boolean = false) => {
    const { reviewMode, selectedDeckId, selectedDeckIds } = useDeckStore.getState()
    
    // Get all cards based on review mode
    const allCards: Card[] = []
    
    if (reviewMode === 'all') {
      // Get cards from all decks
      const cards = await db.cards.toArray()
      const mappedCards = cards.map(card => ({
        ...card,
        createdAt: new Date(card.createdAt),
        updatedAt: new Date(card.updatedAt),
        lastReview: card.lastReview ? new Date(card.lastReview) : undefined,
        nextReview: card.nextReview ? new Date(card.nextReview) : undefined
      }))
      allCards.push(...mappedCards)
    } else if (selectedDeckId) {
      // Get cards from selected deck
      const cards = await db.cards.where('deckId').equals(selectedDeckId).toArray()
      const mappedCards = cards.map(card => ({
        ...card,
        createdAt: new Date(card.createdAt),
        updatedAt: new Date(card.updatedAt),
        lastReview: card.lastReview ? new Date(card.lastReview) : undefined,
        nextReview: card.nextReview ? new Date(card.nextReview) : undefined
      }))
      allCards.push(...mappedCards)
    }
    
    console.log('Total cards available:', allCards.length)
    
    if (forFun) {
      // Mode plaisir : toutes les cartes
      console.log('Fun mode: using all cards')
      return allCards
    }
    
    // Get cards to review using FSRS
    const cardsToReview = fsrsEngine.getCardsToReview(allCards)
    console.log('Cards due for review:', cardsToReview.length)
    
    const sortedCards = fsrsEngine.sortByPriority(cardsToReview)
    
    // Return cards or empty array (let the game component handle the "up to date" message)
    return sortedCards
  },
  
  // Load next card
  loadNextCard: async () => {
    const { queue, currentSession } = get()
    
    if (queue.length === 0) {
      // Session complete
      set({ 
        currentCard: null,
        showAnswer: false,
        userChoice: null
      })
      return
    }
    
    const nextCard = queue[0]
    const remainingQueue = queue.slice(1)
    
    set({
      currentCard: nextCard,
      queue: remainingQueue,
      showAnswer: false,
      userChoice: null
    })
  },
  
  // Set user choice (I know / I don't know)
  setUserChoice: (choice) => {
    set({ userChoice: choice })
  },
  
  // Show answer
  showAnswerAction: () => {
    set({ showAnswer: true })
  },
  
  // Submit answer
  submitAnswer: async (wasCorrect) => {
    const { currentCard, currentSession, userChoice } = get()
    if (!currentCard || !currentSession) return
    
    // Determine rating based on user choice and correctness
    let rating: Rating
    if (userChoice === 'dontknow' || !wasCorrect) {
      rating = Rating.Again
    } else if (userChoice === 'know' && wasCorrect) {
      rating = Rating.Good // Could be Good or Easy based on difficulty
    } else {
      rating = Rating.Hard
    }
    
    // Update card with FSRS algorithm
    const updates = fsrsEngine.processReview(currentCard, rating)
    
    // Save to database
    await db.cards.update(currentCard.id, {
      ...updates,
      lastReview: updates.lastReview?.getTime(),
      nextReview: updates.nextReview?.getTime(),
      updatedAt: Date.now()
    })
    
    // Log review
    await db.logReview({
      cardId: currentCard.id,
      deckId: currentCard.deckId,
      rating,
      state: updates.state || currentCard.state,
      elapsedDays: updates.elapsedDays || currentCard.elapsedDays,
      scheduledDays: updates.scheduledDays || currentCard.scheduledDays
    })
    
    // Update deck counts
    await db.updateDeckCounts(currentCard.deckId)
    
    // Update session
    set(state => ({
      currentSession: state.currentSession
        ? { ...state.currentSession, completed: state.currentSession.completed + 1 }
        : null
    }))
    
    // Load next card
    await get().loadNextCard()
  },

  // Submit answer for game mode (simplified version)
  submitGameAnswer: async (card: Card, wasCorrect: boolean, userChoice: 'know' | 'dontknow') => {
    // Determine rating based on user choice and correctness
    let rating: Rating
    if (userChoice === 'dontknow' || !wasCorrect) {
      rating = Rating.Again
    } else if (userChoice === 'know' && wasCorrect) {
      rating = Rating.Good
    } else {
      rating = Rating.Hard
    }
    
    console.log('Updating card with FSRS:', card.id, 'Rating:', rating)
    
    // Update card with FSRS algorithm
    const updates = fsrsEngine.processReview(card, rating)
    console.log('FSRS updates:', updates)
    
    // Save to database
    await db.cards.update(card.id, {
      ...updates,
      lastReview: updates.lastReview?.getTime(),
      nextReview: updates.nextReview?.getTime(),
      updatedAt: Date.now()
    })
    
    // Log review
    await db.logReview({
      cardId: card.id,
      deckId: card.deckId,
      rating,
      state: updates.state || card.state,
      elapsedDays: updates.elapsedDays || card.elapsedDays,
      scheduledDays: updates.scheduledDays || card.scheduledDays
    })
    
    // Update deck counts
    await db.updateDeckCounts(card.deckId)
    
    console.log('Card updated successfully')
  },
  
  // End session
  endSession: () => {
    set({
      currentSession: null,
      currentCard: null,
      queue: [],
      showAnswer: false,
      userChoice: null
    })
  }
}))