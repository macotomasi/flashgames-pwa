import { create } from 'zustand'
import { Deck, ReviewMode } from '@/types'
import { db } from '@/services/db'
import { errorHandler } from '@/utils/errorHandler'
import { logger } from '@/utils/logger'

interface DeckStore {
  // State
  decks: Deck[]
  selectedDeckId: string | null
  reviewMode: ReviewMode
  selectedDeckIds: string[]
  isLoading: boolean
  
  // Actions
  loadDecks: () => Promise<void>
  createDeck: (name: string, description?: string, icon?: string) => Promise<string>
  updateDeck: (id: string, updates: Partial<Deck>) => Promise<void>
  deleteDeck: (id: string) => Promise<void>
  selectDeck: (id: string | null) => void
  setReviewMode: (mode: ReviewMode, deckIds?: string[]) => void
  refreshDeckCounts: () => Promise<void>
}

export const useDeckStore = create<DeckStore>((set, get) => ({
  // Initial state
  decks: [],
  selectedDeckId: null,
  reviewMode: ReviewMode.ALL_DECKS,
  selectedDeckIds: [],
  isLoading: false,
  
  // Load all decks
  loadDecks: async () => {
    set({ isLoading: true })
    try {
      logger.debug('Loading all decks')
      const decks = await db.getAllDecks()
      logger.info('Decks loaded successfully', { count: decks.length })
      set({ decks, isLoading: false })
    } catch (error) {
      errorHandler.handleError(
        error instanceof Error ? error : new Error(String(error)),
        { operation: 'loadDecks' }
      )
      set({ isLoading: false })
    }
  },
  
  // Create new deck
  createDeck: async (name, description, icon = '📚') => {
    try {
      logger.debug('Creating new deck', { name, description, icon })
      const deckId = await db.createDeck({ name, description, icon })
      await get().loadDecks()
      logger.info('Deck created successfully', { deckId, name })
      return deckId
    } catch (error) {
      const errorMessage = 'Failed to create deck'
      errorHandler.handleError(
        error instanceof Error ? error : new Error(String(error)),
        { name, description, icon }
      )
      throw new Error(errorMessage)
    }
  },
  
  // Update deck
  updateDeck: async (id, updates) => {
    try {
      logger.debug('Updating deck', { id, updates })
      await db.decks.update(id, {
        ...updates,
        updatedAt: Date.now()
      })
      await get().loadDecks()
      logger.info('Deck updated successfully', { id })
    } catch (error) {
      const errorMessage = 'Failed to update deck'
      errorHandler.handleError(
        error instanceof Error ? error : new Error(String(error)),
        { id, updates }
      )
      throw new Error(errorMessage)
    }
  },
  
  // Delete deck
  deleteDeck: async (id) => {
    try {
      logger.debug('Deleting deck', { id })
      // Delete all cards in the deck first
      const cardsCount = await db.cards.where('deckId').equals(id).count()
      await db.cards.where('deckId').equals(id).delete()
      // Delete the deck
      await db.decks.delete(id)
      
      // Update state
      const { selectedDeckId, selectedDeckIds } = get()
      if (selectedDeckId === id) {
        set({ selectedDeckId: null })
      }
      set({ 
        selectedDeckIds: selectedDeckIds.filter(deckId => deckId !== id) 
      })
      
      await get().loadDecks()
      logger.info('Deck deleted successfully', { id, cardsDeleted: cardsCount })
    } catch (error) {
      const errorMessage = 'Failed to delete deck'
      errorHandler.handleError(
        error instanceof Error ? error : new Error(String(error)),
        { id }
      )
      throw new Error(errorMessage)
    }
  },
  
  // Select deck for single deck mode
  selectDeck: (id) => {
    set({ selectedDeckId: id })
  },
  
  // Set review mode
  setReviewMode: (mode, deckIds = []) => {
    set({ 
      reviewMode: mode,
      selectedDeckIds: deckIds 
    })
  },
  
  // Refresh deck counts
  refreshDeckCounts: async () => {
    try {
      logger.debug('Refreshing deck counts')
      const { decks } = get()
      for (const deck of decks) {
        await db.updateDeckCounts(deck.id)
      }
      await get().loadDecks()
      logger.info('Deck counts refreshed successfully', { deckCount: decks.length })
    } catch (error) {
      errorHandler.handleError(
        error instanceof Error ? error : new Error(String(error)),
        { operation: 'refreshDeckCounts' }
      )
      // Don't throw here, just log the error
    }
  }
}))