import Dexie, { Table } from 'dexie'
import { Card, Deck, ReviewLog, GameSession } from '@/types'
import { logger } from '@/utils/logger'

export interface DBCard extends Omit<Card, 'createdAt' | 'updatedAt' | 'lastReview' | 'nextReview'> {
  createdAt: number
  updatedAt: number
  lastReview?: number
  nextReview?: number
}

export interface DBDeck extends Omit<Deck, 'createdAt' | 'updatedAt'> {
  createdAt: number
  updatedAt: number
}

export interface DBReviewLog extends Omit<ReviewLog, 'reviewedAt'> {
  reviewedAt: number
}

export interface DBGameSession extends Omit<GameSession, 'startedAt' | 'endedAt'> {
  startedAt: number
  endedAt?: number
}

class FlashGamesDatabase extends Dexie {
  decks!: Table<DBDeck>
  cards!: Table<DBCard>
  reviewLogs!: Table<DBReviewLog>
  gameSessions!: Table<DBGameSession>

  constructor() {
    super('FlashGamesDB')
    
    this.version(1).stores({
      decks: '&id, name, createdAt, updatedAt',
      cards: '&id, deckId, state, nextReview, [deckId+state], [deckId+nextReview]',
      reviewLogs: '&id, cardId, deckId, reviewedAt, [cardId+reviewedAt]',
      gameSessions: '&id, gameType, startedAt, endedAt'
    })
  }

  // Helper methods pour convertir les dates
  async createDeck(deck: Omit<Deck, 'id' | 'createdAt' | 'updatedAt' | 'cardCount' | 'dueCount' | 'newCount'>): Promise<string> {
    const id = crypto.randomUUID()
    const now = Date.now()
    
    await this.decks.add({
      ...deck,
      id,
      cardCount: 0,
      dueCount: 0,
      newCount: 0,
      createdAt: now,
      updatedAt: now
    })
    
    return id
  }

  async createCard(card: Omit<Card, 'id' | 'createdAt' | 'updatedAt' | 'stability' | 'difficulty' | 'elapsedDays' | 'scheduledDays' | 'reps' | 'lapses' | 'state'>): Promise<string> {
    const id = crypto.randomUUID()
    const now = Date.now()
    
    await this.cards.add({
      ...card,
      id,
      createdAt: now,
      updatedAt: now,
      // FSRS default values for new cards
      stability: 0,
      difficulty: 0,
      elapsedDays: 0,
      scheduledDays: 0,
      reps: 0,
      lapses: 0,
      state: 0 // CardState.New
    })
    
    // Update deck counts
    await this.updateDeckCounts(card.deckId)
    
    return id
  }

  async updateDeckCounts(deckId: string): Promise<void> {
    const cards = await this.cards.where('deckId').equals(deckId).toArray()
    const now = Date.now()
    
    const cardCount = cards.length
    const newCount = cards.filter(c => c.state === 0).length // CardState.New
    const dueCount = cards.filter(c => 
      c.nextReview && c.nextReview <= now && c.state !== 0
    ).length
    
    await this.decks.update(deckId, {
      cardCount,
      newCount,
      dueCount,
      updatedAt: now
    })
  }

  async getDeck(id: string): Promise<Deck | undefined> {
    const dbDeck = await this.decks.get(id)
    if (!dbDeck) return undefined
    
    return {
      ...dbDeck,
      createdAt: dbDeck.createdAt,
      updatedAt: dbDeck.updatedAt
    }
  }

  async getAllDecks(): Promise<Deck[]> {
    const dbDecks = await this.decks.toArray()
    
    return dbDecks.map(deck => ({
      ...deck,
      createdAt: deck.createdAt,
      updatedAt: deck.updatedAt
    }))
  }

  async getCard(id: string): Promise<Card | undefined> {
    const dbCard = await this.cards.get(id)
    if (!dbCard) return undefined
    
    return this.dbCardToCard(dbCard)
  }

  async getDueCards(deckIds?: string[]): Promise<Card[]> {
    const now = Date.now()
    let query = this.cards.where('nextReview').belowOrEqual(now)
    
    const cards = await query.toArray()
    
    // Filter by deck if specified
    const filteredCards = deckIds 
      ? cards.filter(c => deckIds.includes(c.deckId))
      : cards
    
    return filteredCards.map(this.dbCardToCard)
  }

  async getNewCards(deckId: string, limit: number): Promise<Card[]> {
    const cards = await this.cards
      .where('[deckId+state]')
      .equals([deckId, 0]) // CardState.New
      .limit(limit)
      .toArray()
    
    return cards.map(this.dbCardToCard)
  }

  private dbCardToCard(dbCard: DBCard): Card {
    return {
      ...dbCard,
      createdAt: dbCard.createdAt,
      updatedAt: dbCard.updatedAt,
      lastReview: dbCard.lastReview,
      nextReview: dbCard.nextReview
    }
  }

  async logReview(log: Omit<ReviewLog, 'id' | 'reviewedAt'>): Promise<void> {
    await this.reviewLogs.add({
      ...log,
      id: crypto.randomUUID(),
      reviewedAt: Date.now()
    })
  }

  async getReviewHistory(cardId: string): Promise<ReviewLog[]> {
    const logs = await this.reviewLogs
      .where('cardId')
      .equals(cardId)
      .reverse()
      .sortBy('reviewedAt')
    
    return logs.map(log => ({
      ...log,
      reviewedAt: log.reviewedAt.getTime()
    }))
  }
}

// Export singleton instance
export const db = new FlashGamesDatabase()

// Initialize with sample data in development
if (import.meta.env.DEV) {
  db.on('ready', async function() {
    const deckCount = await db.decks.count()
    
    if (deckCount === 0) {
      
      // Create sample deck
      const deckId = await db.createDeck({
        name: 'Deck de démonstration',
        description: 'Quelques cartes pour tester l\'application',
        icon: '📚'
      })
      
      // Create sample cards
      const sampleCards = [
        { front: 'Bonjour', back: 'Hello' },
        { front: 'Merci', back: 'Thank you' },
        { front: 'Au revoir', back: 'Goodbye' },
        { front: 'Oui', back: 'Yes' },
        { front: 'Non', back: 'No' }
      ]
      
      for (const card of sampleCards) {
        await db.createCard({
          ...card,
          deckId
        })
      }
      
    }
  })
}