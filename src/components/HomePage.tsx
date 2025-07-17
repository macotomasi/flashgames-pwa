import DeckList from '@/components/deck/DeckList'
import CreateDeckButton from '@/components/deck/CreateDeckButton'
import { useProgressionStore } from '@/store'
import { MEMORY_LEVELS, DAILY_REWARDS } from '@/types/progression'
import { useEffect } from 'react'

export default function HomePage() {
  const { 
    userProgress, 
    checkAndResetDaily, 
    updateMemoryLevel, 
    updateStreak 
  } = useProgressionStore()

  // Initialize progression on page load
  useEffect(() => {
    checkAndResetDaily()
    updateMemoryLevel()
    updateStreak()
  }, [checkAndResetDaily, updateMemoryLevel, updateStreak])

  const currentLevel = MEMORY_LEVELS.find(l => l.id === userProgress.currentLevel) || MEMORY_LEVELS[0]
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const nextLevel = MEMORY_LEVELS.find(l => l.requiredCards > userProgress.memorizedCards)
  const currentDailyReward = userProgress.dailyReward 
    ? DAILY_REWARDS.find(r => r.id === userProgress.dailyReward)
    : null

  return (
    <div className="min-h-screen bg-gradient-to-br from-game-primary to-game-secondary">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-4">
            🎮 FlashGames
          </h1>
          <p className="text-xl text-white/80">
            Apprenez en jouant avec des flashcards gamifiées
          </p>
        </header>

        {/* Progression Header */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 mb-8 text-white">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="text-4xl">{currentLevel.icon}</div>
              <div>
                <h2 className="text-xl font-bold">{currentLevel.name}</h2>
                <p className="text-sm opacity-80">{currentLevel.description}</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="bg-white/20 rounded-full h-2 w-32">
                    <div 
                      className="bg-white rounded-full h-2 transition-all duration-300"
                      style={{ 
                        width: `${Math.min((userProgress.memorizedCards / currentLevel.requiredCards) * 100, 100)}%` 
                      }}
                    />
                  </div>
                  <span className="text-xs">
                    {userProgress.memorizedCards}/{currentLevel.requiredCards}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-6 text-sm">
              <div className="text-center">
                <div className="text-2xl">🔥</div>
                <p>Jour {userProgress.currentStreak}</p>
              </div>
              
              <div className="text-center">
                <div className="text-2xl">🏆</div>
                <p>Record: {userProgress.bestScore}</p>
              </div>
              
              {currentDailyReward && (
                <div className="text-center">
                  <div className="text-2xl">{currentDailyReward.icon}</div>
                  <p>{currentDailyReward.name}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <main className="max-w-6xl mx-auto">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-bold text-white">
                Mes Decks
              </h2>
              <CreateDeckButton />
            </div>
            
            <DeckList />
          </div>
        </main>
      </div>
    </div>
  )
}