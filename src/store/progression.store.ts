import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { UserProgress, MEMORY_LEVELS, DAILY_REWARDS, BossCardSession } from '@/types/progression'
import { Card, CardState } from '@/types'
import { db } from '@/services/db'
import { logger } from '@/utils/logger'
import { errorHandler } from '@/utils/errorHandler'

interface ProgressionStore {
  // State
  userProgress: UserProgress
  bossCardSession: BossCardSession
  
  // Actions
  updateMemoryLevel: () => Promise<void>
  addNewCardToday: () => void
  updateDailyReward: () => void
  resetDailyProgress: () => void
  updateStreak: () => void
  addStreakBonus: (days: number) => void
  updateBestScore: (score: number) => void
  incrementConsecutiveCorrect: () => void
  resetConsecutiveCorrect: () => void
  checkForBossCard: () => boolean
  setBossCard: (cardId: string) => void
  clearBossCard: () => void
  getCardsForBoss: () => Promise<Card[]>
  checkAndResetDaily: () => void
  validateFlashcardAnswer: (correct: boolean, isBoss: boolean) => Promise<void>
}

export const useProgressionStore = create<ProgressionStore>()(
  persist(
    (set, get) => ({
      // Initial state
      userProgress: {
        currentLevel: 'worm',
        memorizedCards: 0,
        dailyReward: null,
        newCardsToday: 0,
        lastResetDate: new Date().toISOString().split('T')[0],
        currentStreak: 0,
        lastStreakDate: new Date().toISOString().split('T')[0],
        streakBonus: 0,
        bestScore: 0,
        totalGamesPlayed: 0,
        consecutiveCorrectAnswers: 0,
        unlockedAchievements: []
      },
      bossCardSession: {
        isActive: false,
        cardId: null,
        attemptsCount: 0
      },

      // Update memory level based on memorized cards
      updateMemoryLevel: async () => {
        try {
          logger.debug('Updating memory level')
          // Get all cards with interval >= 3 days
          const allCards = await db.cards.toArray()
          const memorizedCards = allCards.filter(card => {
            if (card.state === CardState.New) return false
            if (!card.nextReview) return false
            
            const now = new Date()
            const nextReview = new Date(card.nextReview)
            const daysDiff = (nextReview.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
            
            return daysDiff >= 3
          }).length

          // Find appropriate level
          let newLevel = MEMORY_LEVELS[0]
          for (const level of MEMORY_LEVELS) {
            if (memorizedCards >= level.requiredCards) {
              newLevel = level
            } else {
              break
            }
          }

          const { userProgress } = get()
          const levelChanged = userProgress.currentLevel !== newLevel.id

          set(state => ({
            userProgress: {
              ...state.userProgress,
              memorizedCards,
              currentLevel: newLevel.id
            }
          }))

          logger.info('Memory level updated', { 
            memorizedCards, 
            level: newLevel.id, 
            levelChanged 
          })

          // Return true if level changed for notification
          if (levelChanged && userProgress.memorizedCards > 0) {
            // Could trigger a notification here
          }
        } catch (error) {
          errorHandler.handleError(
            error instanceof Error ? error : new Error(String(error)),
            { operation: 'updateMemoryLevel' }
          )
        }
      },

      // Add new card learned today
      addNewCardToday: () => {
        set(state => ({
          userProgress: {
            ...state.userProgress,
            newCardsToday: state.userProgress.newCardsToday + 1
          }
        }))
        get().updateDailyReward()
      },

      // Update daily reward based on new cards
      updateDailyReward: () => {
        const { userProgress } = get()
        let newReward = null

        // Trouver la meilleure récompense atteinte (sans modifier l'array original)
        const sortedRewards = [...DAILY_REWARDS].sort((a, b) => b.requiredNewCards - a.requiredNewCards)
        
        for (const reward of sortedRewards) {
          if (userProgress.newCardsToday >= reward.requiredNewCards) {
            newReward = reward.id
            
            // Add streak bonus for special rewards
            if (reward.id === 'comet' && userProgress.dailyReward !== 'comet' && userProgress.dailyReward !== 'galaxy') {
              get().addStreakBonus(1)
            } else if (reward.id === 'galaxy' && userProgress.dailyReward !== 'galaxy') {
              get().addStreakBonus(3)
            }
            break
          }
        }

        // Ne mettre à jour que si la récompense a changé
        if (newReward !== userProgress.dailyReward) {
          set(state => ({
            userProgress: {
              ...state.userProgress,
              dailyReward: newReward
            }
          }))
        }
      },

      // Reset daily progress (called at 2 AM)
      resetDailyProgress: () => {
        const today = new Date().toISOString().split('T')[0]
        set(state => ({
          userProgress: {
            ...state.userProgress,
            newCardsToday: 0,
            dailyReward: null,
            lastResetDate: today
          }
        }))
      },

      // Update streak
      updateStreak: () => {
        const { userProgress } = get()
        const today = new Date().toISOString().split('T')[0]
        const lastDate = new Date(userProgress.lastStreakDate)
        const todayDate = new Date(today)
        
        const daysDiff = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))

        if (daysDiff === 0) {
          // Same day, no update needed
          return
        } else if (daysDiff === 1) {
          // Consecutive day
          set(state => ({
            userProgress: {
              ...state.userProgress,
              currentStreak: state.userProgress.currentStreak + 1,
              lastStreakDate: today
            }
          }))
        } else if (daysDiff <= 1 + userProgress.streakBonus) {
          // Within bonus range
          const usedBonus = daysDiff - 1
          set(state => ({
            userProgress: {
              ...state.userProgress,
              currentStreak: state.userProgress.currentStreak + 1,
              lastStreakDate: today,
              streakBonus: Math.max(0, state.userProgress.streakBonus - usedBonus)
            }
          }))
        } else {
          // Streak broken
          set(state => ({
            userProgress: {
              ...state.userProgress,
              currentStreak: 1,
              lastStreakDate: today,
              streakBonus: 0
            }
          }))
        }

        // Add bonus day every 5 consecutive days
        const { userProgress: updatedProgress } = get()
        if (updatedProgress.currentStreak > 0 && updatedProgress.currentStreak % 5 === 0) {
          get().addStreakBonus(1)
        }
      },

      // Add streak bonus days
      addStreakBonus: (days: number) => {
        set(state => ({
          userProgress: {
            ...state.userProgress,
            streakBonus: state.userProgress.streakBonus + days
          }
        }))
      },

      // Update best score
      updateBestScore: (score: number) => {
        set(state => {
          if (score > state.userProgress.bestScore) {
            return {
              userProgress: {
                ...state.userProgress,
                bestScore: score,
                totalGamesPlayed: state.userProgress.totalGamesPlayed + 1
              }
            }
          }
          // Sinon, ne change rien
          return state
        })
      },

      // Increment consecutive correct answers
      incrementConsecutiveCorrect: () => {
        set(state => ({
          userProgress: {
            ...state.userProgress,
            consecutiveCorrectAnswers: state.userProgress.consecutiveCorrectAnswers + 1
          }
        }))
      },

      // Reset consecutive correct answers
      resetConsecutiveCorrect: () => {
        set(state => ({
          userProgress: {
            ...state.userProgress,
            consecutiveCorrectAnswers: 0
          }
        }))
      },

      // Check if boss card should appear
      checkForBossCard: () => {
        const { userProgress } = get()
        return userProgress.consecutiveCorrectAnswers >= 7
      },

      // Set boss card
      setBossCard: (cardId: string) => {
        set({
          bossCardSession: {
            isActive: true,
            cardId,
            attemptsCount: 0
          }
        })
      },

      // Clear boss card
      clearBossCard: () => {
        set({
          bossCardSession: {
            isActive: false,
            cardId: null,
            attemptsCount: 0
          }
        })
      },

      // Get cards that user struggles with most
      getCardsForBoss: async () => {
        try {
          logger.debug('Getting cards for boss fight')
          const reviewLogs = await db.reviewLogs.toArray()
          
          // Count failures per card
          const cardFailures = new Map<string, number>()
          reviewLogs.forEach(log => {
            if (log.rating === 1) { // Rating.Again
              cardFailures.set(log.cardId, (cardFailures.get(log.cardId) || 0) + 1)
            }
          })

          // Get cards with most failures
          const sortedCards = Array.from(cardFailures.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10) // Top 10 most failed cards

          const cardIds = sortedCards.map(([cardId]) => cardId)
          const cards = await db.cards.where('id').anyOf(cardIds).toArray()
          
          const formattedCards = cards.map(card => ({
            ...card,
            createdAt: card.createdAt,
            updatedAt: card.updatedAt,
            lastReview: card.lastReview ? card.lastReview : undefined,
            nextReview: card.nextReview ? card.nextReview : undefined
          }))

          // Importer FSRS pour filtrer uniquement les cartes dues pour révision
          const { fsrsEngine } = await import('@/modules/flashcards/fsrs/fsrs-engine')
          const cardsToReview = fsrsEngine.getCardsToReview(formattedCards)
          
          logger.info('Boss cards retrieved', { 
            totalFailedCards: cardFailures.size,
            candidateCards: formattedCards.length,
            bossCards: cardsToReview.length 
          })
          
          return cardsToReview
        } catch (error) {
          errorHandler.handleError(
            error instanceof Error ? error : new Error(String(error)),
            { operation: 'getCardsForBoss' }
          )
          return []
        }
      },

      // Check and reset daily progress if needed
      checkAndResetDaily: () => {
        const { userProgress } = get()
        const now = new Date().toISOString().split('T')[0]
        const lastReset = new Date(userProgress.lastResetDate).toISOString().split('T')[0]
        const todayDate = new Date();
        todayDate.setHours(2, 0, 0, 0);
        const todayReset = todayDate.toISOString().split('T')[0];

        // If it's past 2 AM and we haven't reset today
        if (now > todayReset && lastReset < todayReset) {
          get().resetDailyProgress()
        }
      },

      // Ajout d'une action atomique pour la validation d'une flashcard
      validateFlashcardAnswer: async (correct: boolean, isBoss: boolean = false) => {
        try {
          logger.debug('Validating flashcard answer', { correct, isBoss })
          if (correct) {
            get().incrementConsecutiveCorrect()
            get().addNewCardToday()
            if (isBoss) {
              get().clearBossCard()
            }
          } else {
            get().resetConsecutiveCorrect()
            if (isBoss) {
              get().clearBossCard()
            }
          }
          await get().updateMemoryLevel()
          logger.info('Flashcard answer validated', { correct, isBoss })
        } catch (error) {
          errorHandler.handleError(
            error instanceof Error ? error : new Error(String(error)),
            { correct, isBoss, operation: 'validateFlashcardAnswer' }
          )
        }
      }
    }),
    {
      name: 'progression-storage',
      partialize: (state) => ({ userProgress: state.userProgress })
    }
  )
)