import { useState, useEffect } from 'react'
import { MEMORY_LEVELS, DAILY_REWARDS } from '@/types/progression'
import { soundManager } from '@/utils/sounds'
import { useProgressionStore } from '@/store'

interface ProgressionNotificationProps {
  type: 'level' | 'daily_reward' | 'streak'
  value: string | number
  onClose: () => void
}

export default function ProgressionNotification({ type, value, onClose }: ProgressionNotificationProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
    
    // Play sound based on type
    switch (type) {
      case 'level':
        soundManager.playAchievement()
        break
      case 'daily_reward':
        soundManager.playVictory()
        break
      case 'streak':
        soundManager.playSuccess()
        break
    }
    
    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(onClose, 300) // Wait for animation to complete
    }, 3000)

    return () => clearTimeout(timer)
  }, [onClose, type])

  const handleClick = () => {
    setIsVisible(false)
    setTimeout(onClose, 300)
  }

  let content
  let bgColor = 'bg-gradient-to-r from-green-400 to-blue-500'
  let sound = '🎉'

  switch (type) {
    case 'level':
      const level = MEMORY_LEVELS.find(l => l.id === value)
      if (level) {
        content = (
          <div className="text-center">
            <div className="text-4xl mb-2">{level.icon}</div>
            <h2 className="text-xl font-bold mb-2">Félicitations !</h2>
            <p className="text-lg">Vous avez une mémoire de {level.name}!</p>
            <p className="text-sm opacity-90 mt-1">{level.description}</p>
          </div>
        )
        bgColor = 'bg-gradient-to-r from-purple-400 to-pink-500'
        sound = '🏆'
      }
      break
    
    case 'daily_reward':
      const reward = DAILY_REWARDS.find(r => r.id === value)
      if (reward) {
        // Récupérer le nombre de cartes mémorisées depuis le store
        const { newCardsToday } = useProgressionStore.getState().userProgress
        content = (
          <div className="text-center">
            <div className="text-4xl mb-2">{reward.icon}</div>
            <h2 className="text-xl font-bold mb-2">Bravo !</h2>
            <p className="text-lg mb-1">{newCardsToday} nouvelles cartes mémorisées aujourd'hui !</p>
            <p className="text-lg">Votre cerveau s'illumine 🧠✨</p>
            <p className="text-lg font-semibold">Vous passez en mode {reward.name} !</p>
            <p className="text-sm opacity-90 mt-2">{reward.description}</p>
          </div>
        )
        bgColor = 'bg-gradient-to-r from-yellow-400 to-orange-500'
        sound = '⭐'
      }
      break
    
    case 'streak':
      content = (
        <div className="text-center">
          <div className="text-4xl mb-2">🔥</div>
          <h2 className="text-xl font-bold mb-2">Série impressionnante !</h2>
          <p className="text-lg">Jour {value} consécutif !</p>
          <p className="text-sm opacity-90 mt-1">Continuez comme ça !</p>
        </div>
      )
      bgColor = 'bg-gradient-to-r from-red-400 to-yellow-500'
      sound = '🔥'
      break
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div
        className={`${bgColor} rounded-2xl p-4 md:p-6 max-w-xs md:max-w-sm w-full text-white shadow-2xl transform transition-all duration-300 ${
          isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
        onClick={handleClick}
      >
        <div className="text-center mb-4">
          <span className="text-2xl">{sound}</span>
        </div>
        {content}
        <div className="text-center mt-4">
          <p className="text-xs opacity-75">Cliquez pour fermer</p>
        </div>
      </div>
    </div>
  )
}