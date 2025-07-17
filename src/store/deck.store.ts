import { create } from 'zustand'
import { Deck, ReviewMode } from '@/types'
import { db } from '@/services/db'

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
      const decks = await db.getAllDecks()
      set({ decks, isLoading: false })
    } catch (error) {
      console.error('Failed to load decks:', error)
      set({ isLoading: false })
    }
  },
  
  // Create new deck
  createDeck: async (name, description, icon = '📚') => {
    const deckId = await db.createDeck({ name, description, icon })
    await get().loadDecks()
    return deckId
  },
  
  // Update deck
  updateDeck: async (id, updates) => {
    await db.decks.update(id, {
      ...updates,
      updatedAt: Date.now()
    })
    await get().loadDecks()
  },
  
  // Delete deck
  deleteDeck: async (id) => {
    // Delete all cards in the deck first
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
    const { decks } = get()
    for (const deck of decks) {
      await db.updateDeckCounts(deck.id)
    }
    await get().loadDecks()
  }
}))