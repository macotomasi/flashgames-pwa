import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { UserProgress, MEMORY_LEVELS, DAILY_REWARDS, BossCardSession } from '@/types/progression'
import { Card, CardState } from '@/types'
import { db } from '@/services/db'

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

        // Return true if level changed for notification
        if (levelChanged && userProgress.memorizedCards > 0) {
          // Could trigger a notification here
          console.log(`Félicitations! Vous avez atteint le niveau ${newLevel.name}!`)
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

        for (const reward of DAILY_REWARDS.reverse()) {
          if (userProgress.newCardsToday >= reward.requiredNewCards) {
            newReward = reward.id
            
            // Add streak bonus for special rewards
            if (reward.id === 'comet') {
              get().addStreakBonus(1)
            } else if (reward.id === 'galaxy') {
              get().addStreakBonus(3)
            }
            break
          }
        }

        set(state => ({
          userProgress: {
            ...state.userProgress,
            dailyReward: newReward
          }
        }))
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
        set(state => ({
          userProgress: {
            ...state.userProgress,
            bestScore: Math.max(state.userProgress.bestScore, score),
            totalGamesPlayed: state.userProgress.totalGamesPlayed + 1
          }
        }))
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
        
        return cards.map(card => ({
          ...card,
          createdAt: new Date(card.createdAt),
          updatedAt: new Date(card.updatedAt),
          lastReview: card.lastReview ? new Date(card.lastReview) : undefined,
          nextReview: card.nextReview ? new Date(card.nextReview) : undefined
        }))
      },

      // Check and reset daily progress if needed
      checkAndResetDaily: () => {
        const { userProgress } = get()
        const now = new Date()
        const lastReset = new Date(userProgress.lastResetDate + 'T02:00:00')
        const todayReset = new Date()
        todayReset.setHours(2, 0, 0, 0)

        // If it's past 2 AM and we haven't reset today
        if (now > todayReset && lastReset < todayReset) {
          get().resetDailyProgress()
        }
      }
    }),
    {
      name: 'progression-storage',
      partialize: (state) => ({ userProgress: state.userProgress })
    }
  )
)