import { create } from 'zustand'
import { Card } from '@/types'
import { db } from '@/services/db'
import { errorHandler } from '@/utils/errorHandler'
import { logger } from '@/utils/logger'
import { fisherYatesShuffle } from '@/utils/shuffle'

interface CardStore {
  // Actions
  createCard: (deckId: string, front: string, back: string) => Promise<string>
  updateCard: (id: string, updates: Partial<Card>) => Promise<void>
  deleteCard: (id: string) => Promise<void>
  getCard: (id: string) => Promise<Card | undefined>
  getCardsFromDeck: (deckId: string) => Promise<Card[]>
  searchCards: (query: string, deckId?: string) => Promise<Card[]>
  getRandomCards: (deckId: string, count: number, excludeId?: string) => Promise<Card[]>
}

export const useCardStore = create<CardStore>(() => ({
  // Create new card
  createCard: async (deckId, front, back) => {
    try {
      logger.debug('Creating new card', { deckId, front: front.substring(0, 50), back: back.substring(0, 50) })
      const cardId = await db.createCard({ deckId, front, back })
      logger.info('Card created successfully', { cardId, deckId })
      return cardId
    } catch (error) {
      const errorMessage = 'Failed to create card'
      errorHandler.handleError(
        error instanceof Error ? error : new Error(String(error)),
        { deckId, front: front.substring(0, 50), back: back.substring(0, 50) }
      )
      throw new Error(errorMessage)
    }
  },
  
  // Update card
  updateCard: async (id, updates) => {
    try {
      logger.debug('Updating card', { id, updates })
      await db.cards.update(id, {
        ...updates,
        updatedAt: typeof updates.updatedAt === 'number' ? updates.updatedAt : updates.updatedAt
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
      logger.info('Card updated successfully', { id })
    } catch (error) {
      const errorMessage = 'Failed to update card'
      errorHandler.handleError(
        error instanceof Error ? error : new Error(String(error)),
        { id, updates }
      )
      throw new Error(errorMessage)
    }
  },
  
  // Delete card
  deleteCard: async (id) => {
    try {
      logger.debug('Deleting card', { id })
      const card = await db.cards.get(id)
      if (card) {
        await db.cards.delete(id)
        await db.updateDeckCounts(card.deckId)
        logger.info('Card deleted successfully', { id, deckId: card.deckId })
      } else {
        logger.warn('Attempted to delete non-existent card', { id })
      }
    } catch (error) {
      const errorMessage = 'Failed to delete card'
      errorHandler.handleError(
        error instanceof Error ? error : new Error(String(error)),
        { id }
      )
      throw new Error(errorMessage)
    }
  },
  
  // Get single card
  getCard: async (id) => {
    try {
      logger.debug('Getting card', { id })
      const card = await db.getCard(id)
      if (card) {
        logger.debug('Card retrieved successfully', { id })
      } else {
        logger.debug('Card not found', { id })
      }
      return card
    } catch (error) {
      errorHandler.handleError(
        error instanceof Error ? error : new Error(String(error)),
        { id }
      )
      return undefined
    }
  },
  
  // Get all cards from a deck
  getCardsFromDeck: async (deckId) => {
    try {
      logger.debug('Getting cards from deck', { deckId })
      const cards = await db.cards
        .where('deckId')
        .equals(deckId)
        .toArray()
      
      const formattedCards = cards.map(card => ({
        ...card,
        createdAt: typeof card.createdAt === 'number' ? card.createdAt : card.createdAt,
        updatedAt: typeof card.updatedAt === 'number' ? card.updatedAt : card.updatedAt,
        lastReview: card.lastReview ? typeof card.lastReview === 'number' ? card.lastReview : new Date(card.lastReview).getTime() : undefined,
        nextReview: card.nextReview ? typeof card.nextReview === 'number' ? card.nextReview : new Date(card.nextReview).getTime() : undefined
      }))
      
      logger.debug('Cards retrieved successfully', { deckId, count: formattedCards.length })
      return formattedCards
    } catch (error) {
      errorHandler.handleError(
        error instanceof Error ? error : new Error(String(error)),
        { deckId }
      )
      return []
    }
  },
  
  // Search cards
  searchCards: async (query, deckId) => {
    try {
      logger.debug('Searching cards', { query: query.substring(0, 50), deckId })
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
      
      const formattedCards = filtered.map(card => ({
        ...card,
        createdAt: typeof card.createdAt === 'number' ? card.createdAt : card.createdAt,
        updatedAt: typeof card.updatedAt === 'number' ? card.updatedAt : card.updatedAt,
        lastReview: card.lastReview ? typeof card.lastReview === 'number' ? card.lastReview : new Date(card.lastReview).getTime() : undefined,
        nextReview: card.nextReview ? typeof card.nextReview === 'number' ? card.nextReview : new Date(card.nextReview).getTime() : undefined
      }))
      
      logger.debug('Search completed', { query: query.substring(0, 50), deckId, results: formattedCards.length })
      return formattedCards
    } catch (error) {
      errorHandler.handleError(
        error instanceof Error ? error : new Error(String(error)),
        { query: query.substring(0, 50), deckId }
      )
      return []
    }
  },
  
  // Get random cards for multiple choice
  getRandomCards: async (deckId, count, excludeId) => {
    try {
      logger.debug('Getting random cards', { deckId, count, excludeId })
      let cards = await db.cards
        .where('deckId')
        .equals(deckId)
        .toArray()
      
      // Exclude the current card
      if (excludeId) {
        cards = cards.filter(c => c.id !== excludeId)
      }
      
      // Shuffle and take count using Fisher-Yates algorithm
      const shuffled = fisherYatesShuffle(cards)
      const selected = shuffled.slice(0, Math.min(count, cards.length))
      
      const formattedCards = selected.map(card => ({
        ...card,
        createdAt: typeof card.createdAt === 'number' ? card.createdAt : card.createdAt,
        updatedAt: typeof card.updatedAt === 'number' ? card.updatedAt : card.updatedAt,
        lastReview: card.lastReview ? typeof card.lastReview === 'number' ? card.lastReview : new Date(card.lastReview).getTime() : undefined,
        nextReview: card.nextReview ? typeof card.nextReview === 'number' ? card.nextReview : new Date(card.nextReview).getTime() : undefined
      }))
      
      logger.debug('Random cards retrieved', { deckId, requested: count, returned: formattedCards.length })
      return formattedCards
    } catch (error) {
      errorHandler.handleError(
        error instanceof Error ? error : new Error(String(error)),
        { deckId, count, excludeId }
      )
      return []
    }
  }
}))