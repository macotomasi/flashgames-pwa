import { useState, useEffect } from 'react'
import { useProgressionStore } from '@/store'
import { DAILY_REWARDS } from '@/types/progression'

interface NotificationData {
  type: 'level' | 'daily_reward' | 'streak'
  value: string | number
  id: string
}

export function useProgressionNotifications() {
  const [notifications, setNotifications] = useState<NotificationData[]>([])
  const { userProgress } = useProgressionStore()

  // Previous values to detect changes
  const [prevLevel, setPrevLevel] = useState(userProgress.currentLevel)
  const [prevDailyReward, setPrevDailyReward] = useState(userProgress.dailyReward)
  const [prevStreak, setPrevStreak] = useState(userProgress.currentStreak)

  useEffect(() => {
    // Check for level change
    if (userProgress.currentLevel !== prevLevel && userProgress.memorizedCards > 0) {
      addNotification({
        type: 'level',
        value: userProgress.currentLevel,
        id: `level-${Date.now()}`
      })
      setPrevLevel(userProgress.currentLevel)
    }

    // Check for daily reward change (only show if it's a progression, not a regression)
    if (userProgress.dailyReward !== prevDailyReward && userProgress.dailyReward) {
      // Vérifier que c'est une progression et non une régression
      const currentIndex = DAILY_REWARDS.findIndex(r => r.id === userProgress.dailyReward)
      const prevIndex = prevDailyReward ? DAILY_REWARDS.findIndex(r => r.id === prevDailyReward) : -1
      
      // Ne montrer la notification que si on progresse (ou première récompense)
      if (currentIndex > prevIndex) {
        addNotification({
          type: 'daily_reward',
          value: userProgress.dailyReward,
          id: `daily-${Date.now()}`
        })
      }
      setPrevDailyReward(userProgress.dailyReward)
    }

    // Check for significant streak milestones
    if (userProgress.currentStreak !== prevStreak && userProgress.currentStreak % 5 === 0 && userProgress.currentStreak > 0) {
      addNotification({
        type: 'streak',
        value: userProgress.currentStreak,
        id: `streak-${Date.now()}`
      })
      setPrevStreak(userProgress.currentStreak)
    }
  }, [userProgress, prevLevel, prevDailyReward, prevStreak])

  const addNotification = (notification: NotificationData) => {
    setNotifications(prev => [...prev, notification])
  }

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  return {
    notifications,
    removeNotification
  }
}