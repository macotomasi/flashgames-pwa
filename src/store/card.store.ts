import { create } from 'zustand'
import { Card } from '@/types'
import { db } from '@/services/db'

interface CardStore {
  // Actions
  createCard: (deckId: string, front: string, back: string) => Promise<string>
  updateCard: (id: string, updates: Partial<Card>) => Promise<void>
  deleteCard: (id: string) => Promise<void>
  getCard: (id: string) => Promise<Card | undefined>
  getCardsFromDeck: (deckId: string) => Promise<Card[]>
  searchCards: (query: string, deckId?: string) => Promise<Card[]>
}

export const useCardStore = create<CardStore>(() => ({
  // Create new card
  createCard: async (deckId, front, back) => {
    const cardId = await db.createCard({ deckId, front, back })
    return cardId
  },
  
  // Update card
  updateCard: async (id, updates) => {
    await db.cards.update(id, {
      ...updates,
      updatedAt: Date.now()
    })
    
    if (updates.deckId) {
      const card = await db.cards.get(id)
      if (card) {
        await db.updateDeckCounts(card.deckId)
        if (updates.deckId !== card.deckId) {
          await db.updateDeckCounts(updates.deckId)
        }
      }
    }
  },
  
  // Delete card
  deleteCard: async (id) => {
    const card = await db.cards.get(id)
    if (card) {
      await db.cards.delete(id)
      await db.updateDeckCounts(card.deckId)
    }
  },
  
  // Get single card
  getCard: async (id) => {
    return await db.getCard(id)
  },
  
  // Get all cards from a deck
  getCardsFromDeck: async (deckId) => {
    const cards = await db.cards
      .where('deckId')
      .equals(deckId)
      .toArray()
    
    return cards.map(card => ({
      ...card,
      createdAt: new Date(card.createdAt),
      updatedAt: new Date(card.updatedAt),
      lastReview: card.lastReview ? new Date(card.lastReview) : undefined,
      nextReview: card.nextReview ? new Date(card.nextReview) : undefined
    }))
  },
  
  // Search cards
  searchCards: async (query, deckId) => {
    let cards = await db.cards.toArray()
    
    // Filter by deck if specified
    if (deckId) {
      cards = cards.filter(c => c.deckId === deckId)
    }
    
    // Search in front and back
    const lowerQuery = query.toLowerCase()
    const filtered = cards.filter(c => 
      c.front.toLowerCase().includes(lowerQuery) ||
      c.back.toLowerCase().includes(lowerQuery)
    )
    
    return filtered.map(card => ({
      ...card,
      createdAt: new Date(card.createdAt),
      updatedAt: new Date(card.updatedAt),
      lastReview: card.lastReview ? new Date(card.lastReview) : undefined,
      nextReview: card.nextReview ? new Date(card.nextReview) : undefined
    }))
  }
}))