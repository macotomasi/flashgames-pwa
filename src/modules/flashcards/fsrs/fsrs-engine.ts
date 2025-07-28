import { Card, CardState, Rating } from '@/types'

interface FSRSParams {
  w: number[] // Weights for the algorithm
  requestRetention: number
  maximumInterval: number
  easyBonus: number
  hardFactor: number
}

export class FSRSEngine {
  private params: FSRSParams = {
    w: [0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18, 0.05, 0.34, 1.26, 0.29, 2.61],
    requestRetention: 0.9,
    maximumInterval: 36500,
    easyBonus: 1.3,
    hardFactor: 1.2
  }

  constructor(params?: Partial<FSRSParams>) {
    if (params) {
      this.params = { ...this.params, ...params }
    }
  }

  // Calculate initial stability
  private initStability(rating: Rating): number {
    return Math.max(this.params.w[rating - 1], 0.1)
  }

  // Calculate initial difficulty
  private initDifficulty(rating: Rating): number {
    return Math.min(Math.max(this.params.w[4] - (rating - 3) * this.params.w[5], 1), 10)
  }

  // Calculate retrievability
  private retrievability(elapsedDays: number, stability: number): number {
    return Math.pow(1 + elapsedDays / (9 * stability), -1)
  }

  // Calculate next interval
  private nextInterval(stability: number, rating: Rating): number {
    const newInterval = stability * (1 / this.params.requestRetention - 1)
    
    if (rating === Rating.Easy) {
      return newInterval * this.params.easyBonus
    } else if (rating === Rating.Hard) {
      return newInterval * this.params.hardFactor
    }
    
    return newInterval
  }

  // Update stability
  private updateStability(
    difficulty: number,
    stability: number,
    retrievability: number,
    rating: Rating
  ): number {
    const w = this.params.w
    
    if (rating === Rating.Again) {
      return w[11] * Math.pow(difficulty, -w[12]) * (Math.pow(stability + 1, -w[13]) - 1) * Math.exp(w[14] * (1 - retrievability))
    }
    
    const hardFactor = rating === Rating.Hard ? w[15] : 1
    const easyFactor = rating === Rating.Easy ? w[16] : 1
    
    return stability * (1 + Math.exp(w[8]) * 
      (11 - difficulty) * 
      Math.pow(stability, -w[9]) * 
      (Math.exp(w[10] * (1 - retrievability)) - 1) * 
      hardFactor * 
      easyFactor)
  }

  // Update difficulty
  private updateDifficulty(difficulty: number, rating: Rating): number {
    const w = this.params.w
    const newDifficulty = difficulty - w[6] * (rating - 3)
    return Math.min(Math.max(newDifficulty, 1), 10)
  }

 // Main function to process a card review
  processReview(card: Card, rating: Rating): Partial<Card> {
    
    const now = new Date()
    const elapsedDays = card.lastReview 
      ? Math.max(0, (now.getTime() - card.lastReview) / (1000 * 60 * 60 * 24))
      : 0

    let newStability: number
    let newDifficulty: number
    let newState: CardState

    // Handle different card states
    if (card.state === CardState.New) {
      newStability = this.initStability(rating)
      newDifficulty = this.initDifficulty(rating)
      newState = rating === Rating.Again ? CardState.Learning : CardState.Review
    } else if (card.state === CardState.Learning || card.state === CardState.Relearning) {
      newStability = card.stability
      newDifficulty = card.difficulty
      newState = rating === Rating.Again ? CardState.Learning : CardState.Review
    } else {
      // Review state
      const retrievability = this.retrievability(elapsedDays, card.stability)
      newStability = this.updateStability(card.difficulty, card.stability, retrievability, rating)
      newDifficulty = this.updateDifficulty(card.difficulty, rating)
      newState = rating === Rating.Again ? CardState.Relearning : CardState.Review
    }

    // Calculate next review interval
    const interval = this.nextInterval(newStability, rating)
    const scheduledDays = Math.min(Math.max(1, Math.round(interval)), this.params.maximumInterval)
    
    const nextReview = new Date(now.getTime() + scheduledDays * 24 * 60 * 60 * 1000)

    // Create result object for logging
    const result = {
      stability: newStability,
      difficulty: newDifficulty,
      elapsedDays: elapsedDays,
      scheduledDays: scheduledDays,
      reps: card.reps + 1,
      lapses: rating === Rating.Again ? card.lapses + 1 : card.lapses,
      state: newState,
      lastReview: now.getTime(),
      nextReview: nextReview.getTime()
    }
    
    
    return result
  }

  // Get cards due for review
  getCardsToReview(cards: Card[]): Card[] {
    const now = new Date()
    return cards.filter(card => {
      if (card.state === CardState.New) return true
      if (!card.nextReview) return true
      return card.nextReview <= now.getTime()
    })
  }

  // Sort cards by priority (new cards first, then by how overdue they are)
  sortByPriority(cards: Card[]): Card[] {
    const now = new Date()
    return cards.sort((a, b) => {
      // New cards first
      if (a.state === CardState.New && b.state !== CardState.New) return -1
      if (b.state === CardState.New && a.state !== CardState.New) return 1
      
      // Then by how overdue they are
      if (a.nextReview && b.nextReview) {
        const aDays = (now.getTime() - a.nextReview) / (1000 * 60 * 60 * 24)
        const bDays = (now.getTime() - b.nextReview) / (1000 * 60 * 60 * 24)
        return bDays - aDays // More overdue first
      }
      
      return 0
    })
  }
}

// Singleton instance
export const fsrsEngine = new FSRSEngine()
