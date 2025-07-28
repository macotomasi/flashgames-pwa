import DeckList from '@/components/deck/DeckList'
import CreateDeckButton from '@/components/deck/CreateDeckButton'
import { useProgressionStore } from '@/store'
import { MEMORY_LEVELS, DAILY_REWARDS } from '@/types/progression'
import { useEffect, useState } from 'react'
import { ImportFirebaseData } from '@/components/settings/ImportFirebaseData'

export default function HomePage() {
  const { 
    userProgress, 
    checkAndResetDaily, 
    updateMemoryLevel, 
    updateStreak 
  } = useProgressionStore()
  const [showImport, setShowImport] = useState(false)

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
    <div className="min-h-screen w-full bg-gradient-to-br from-game-primary to-game-secondary flex flex-col items-center justify-center overflow-auto">
      <div className="w-full max-w-screen-lg mx-auto px-4 py-8 flex flex-col gap-8 items-center">
        <header className="text-center mb-8">
          <h1 className="text-5xl font-mono font-bold text-white mb-4 text-neon-cyan" style={{textShadow: '0 0 8px #00fff7'}}>
            🎮 FlashGames
          </h1>
          <p className="text-xl text-white/80">
            Apprenez en jouant avec des flashcards gamifiées
          </p>
        </header>

        {/* Progression Header */}
        <div className="w-full max-w-2xl mx-auto border-4 border-neon-cyan shadow-neon rounded-2xl p-6 mb-8 bg-black/80 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="text-4xl">{currentLevel.icon}</div>
            <div>
              <h2 className="text-xl font-mono font-bold text-neon-cyan">{currentLevel.name}</h2>
              <p className="text-sm opacity-80 text-white">{currentLevel.description}</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="bg-white/20 rounded-full h-2 w-32">
                  <div 
                    className="bg-neon-cyan rounded-full h-2 transition-all duration-300"
                    style={{ 
                      width: `${Math.min((userProgress.memorizedCards / currentLevel.requiredCards) * 100, 100)}%`,
                      background: '#00fff7',
                      boxShadow: '0 0 8px #00fff7'
                    }}
                  />
                </div>
                <span className="text-xs text-white">
                  {userProgress.memorizedCards}/{currentLevel.requiredCards}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-6 text-sm md:text-base">
            <div className="text-center">
              <div className="text-2xl">🔥</div>
              <p className="text-neon-pink font-mono">Jour {userProgress.currentStreak}</p>
            </div>
            <div className="text-center">
              <div className="text-2xl">🏆</div>
              <p className="text-neon-cyan font-mono">Record: {userProgress.bestScore}</p>
            </div>
            {currentDailyReward && (
              <div className="text-center">
                <div className="text-2xl">{currentDailyReward.icon}</div>
                <p className="text-neon-pink font-mono">{currentDailyReward.name}</p>
              </div>
            )}
          </div>
        </div>

        <main className="w-full max-w-4xl mx-auto flex flex-col gap-8 items-center">
          <div className="w-full border-4 border-neon-pink shadow-neon rounded-2xl p-8 bg-black/80">
            <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
              <h2 className="text-3xl font-mono font-bold text-neon-pink">
                Mes Decks
              </h2>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setShowImport(!showImport)}
                  className="px-4 py-2 bg-neon-cyan text-black font-bold rounded-lg shadow-neon hover:scale-105 transition-transform text-lg"
                  data-testid="import-firebase-button"
                  style={{background: '#00fff7', boxShadow: '0 0 8px #00fff7'}}
                >
                  📥 Import Firebase
                </button>
                <button
                  className="px-4 py-2 bg-neon-pink text-white font-bold rounded-lg shadow-neon hover:scale-105 transition-transform text-lg"
                  style={{background: '#ff00c8', boxShadow: '0 0 8px #ff00c8'}}
                >
                  + Nouveau Deck
                </button>
              </div>
            </div>
            
            {showImport && (
              <div className="mb-6">
                <ImportFirebaseData />
              </div>
            )}
            
            <DeckList />
          </div>
        </main>
      </div>
    </div>
  )
}