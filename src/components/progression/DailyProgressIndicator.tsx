import { useProgressionStore } from '@/store'
import { DAILY_REWARDS } from '@/types/progression'

export default function DailyProgressIndicator() {
  const { userProgress } = useProgressionStore()
  
  // Trouver la récompense actuelle et la prochaine
  const currentRewardIndex = userProgress.dailyReward 
    ? DAILY_REWARDS.findIndex(r => r.id === userProgress.dailyReward)
    : -1
  
  const nextReward = DAILY_REWARDS[currentRewardIndex + 1] || null
  const cardsToNext = nextReward 
    ? nextReward.requiredNewCards - userProgress.newCardsToday
    : 0

  // Calculer la progression
  const currentReward = currentRewardIndex >= 0 ? DAILY_REWARDS[currentRewardIndex] : null
  const progressPercent = nextReward
    ? ((userProgress.newCardsToday - (currentReward?.requiredNewCards || 0)) / 
       (nextReward.requiredNewCards - (currentReward?.requiredNewCards || 0))) * 100
    : 100

  return (
    <>
      {/* Version desktop - à droite */}
      <div className="fixed right-4 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-4 z-40 
                      hidden md:block">
        <div className="text-sm space-y-3">
        {/* Cartes apprises aujourd'hui */}
        <div>
          <p className="text-gray-600 text-xs">Cartes apprises aujourd'hui</p>
          <p className="text-2xl font-bold text-gray-900">{userProgress.newCardsToday}</p>
        </div>

        {/* Prochain niveau */}
        {nextReward && (
          <>
            <div className="h-px bg-gray-200" />
            <div>
              <p className="text-gray-600 text-xs">Prochain niveau</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-lg">{nextReward.icon}</span>
                <span className="text-sm font-medium text-gray-700">{nextReward.name}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Encore {cardsToNext} carte{cardsToNext > 1 ? 's' : ''}
              </p>
              
              {/* Barre de progression */}
              <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all duration-300"
                  style={{ width: `${Math.min(progressPercent, 100)}%` }}
                />
              </div>
            </div>
          </>
        )}

        {/* Si tous les niveaux sont atteints */}
        {!nextReward && userProgress.dailyReward && (
          <>
            <div className="h-px bg-gray-200" />
            <div className="text-center">
              <p className="text-xs text-gray-500">Niveau maximum atteint !</p>
              <span className="text-2xl">🌌</span>
            </div>
          </>
        )}

        {/* Récompense actuelle */}
        {currentReward && (
          <>
            <div className="h-px bg-gray-200" />
            <div className="text-center">
              <p className="text-xs text-gray-500">Mode actuel</p>
              <div className="flex items-center justify-center gap-1 mt-1">
                <span className="text-lg">{currentReward.icon}</span>
                <span className="text-xs font-medium text-gray-700">{currentReward.name}</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>

    {/* Version mobile - en bas */}
    <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-sm shadow-lg p-3 z-40 md:hidden">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <div>
            <span className="text-gray-600 text-xs">Aujourd'hui: </span>
            <span className="font-bold text-gray-900">{userProgress.newCardsToday}</span>
          </div>
          {nextReward && (
            <div className="flex items-center gap-2">
              <span className="text-gray-600 text-xs">Prochain: </span>
              <span>{nextReward.icon}</span>
              <span className="text-xs text-gray-500">({cardsToNext})</span>
            </div>
          )}
        </div>
        {currentReward && (
          <div className="flex items-center gap-1">
            <span>{currentReward.icon}</span>
          </div>
        )}
      </div>
    </div>
    </>
  )
}