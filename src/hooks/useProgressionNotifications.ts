import { useState, useEffect } from 'react'
import { useProgressionStore } from '@/store'

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

    // Check for daily reward change
    if (userProgress.dailyReward !== prevDailyReward && userProgress.dailyReward) {
      addNotification({
        type: 'daily_reward',
        value: userProgress.dailyReward,
        id: `daily-${Date.now()}`
      })
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