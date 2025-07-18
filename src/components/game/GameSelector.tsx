import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GameType, ReviewMode } from '@/types'
import { useDeckStore } from '@/store'

const games = [
  {
    type: GameType.TETRIS,
    name: 'Tetris',
    icon: '🧱',
    description: 'Le classique jeu de blocs',
    available: true
  },
  {
    type: GameType.PACMAN,
    name: 'Pac-Man',
    icon: '👻',
    description: 'Mangez tous les points',
    available: false
  },
  {
    type: GameType.SPACE_INVADERS,
    name: 'Space Invaders',
    icon: '👾',
    description: 'Défendez la Terre',
    available: false
  },
  {
    type: GameType.PONG,
    name: 'Pong',
    icon: '🏓',
    description: 'Le premier jeu vidéo',
    available: false
  }
]

export default function GameSelector() {
  const navigate = useNavigate()
  const { decks, selectedDeckId, setReviewMode, selectDeck } = useDeckStore()
  const [showDeckChoice, setShowDeckChoice] = useState(false)
  const [selectedGame, setSelectedGame] = useState<GameType | null>(null)

  const handleSelectGame = (gameType: GameType) => {
    setSelectedGame(gameType)
    setShowDeckChoice(true)
  }

  const handleSelectDeck = (deckId: string | 'all') => {
    if (deckId === 'all') {
      setReviewMode(ReviewMode.ALL_DECKS)
      selectDeck(null)
    } else {
      setReviewMode(ReviewMode.SINGLE_DECK, [deckId])
      selectDeck(deckId)
    }
    navigate(`/play/${selectedGame}`)
  }

  const selectedDeck = decks.find(d => d.id === selectedDeckId)

  if (showDeckChoice && selectedGame) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-game-primary to-game-secondary">
        <div className="container mx-auto px-4 py-8">
          <button
            onClick={() => setShowDeckChoice(false)}
            className="text-white mb-4 hover:underline"
          >
            ← Retour au choix du jeu
          </button>

          <header className="text-center mb-12">
            <h1 className="text-5xl font-bold text-white mb-4">
              Choisir les cartes à réviser
            </h1>
            <p className="text-xl text-white/80">
              Sélectionnez un deck ou révisez toutes vos cartes
            </p>
          </header>

          <div className="max-w-4xl mx-auto space-y-4">
            {/* Option tous les decks */}
            <button
              onClick={() => handleSelectDeck('all')}
              className="w-full p-6 bg-white rounded-xl hover:shadow-xl transition-shadow text-left"
            >
              <div className="flex items-center gap-4">
                <div className="text-4xl">🌍</div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Tous les decks</h3>
                  <p className="text-gray-600">
                    Réviser toutes vos cartes, peu importe le deck
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Total : {decks.reduce((sum, deck) => sum + deck.cardCount, 0)} cartes
                  </p>
                </div>
              </div>
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/20"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gradient-to-br from-game-primary to-game-secondary text-white">
                  Ou choisir un deck spécifique
                </span>
              </div>
            </div>

            {/* Decks individuels */}
            {decks.map((deck) => (
              <button
                key={deck.id}
                onClick={() => handleSelectDeck(deck.id)}
                className="w-full p-6 bg-white rounded-xl hover:shadow-xl transition-shadow text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="text-4xl">{deck.icon || '📚'}</div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900">{deck.name}</h3>
                    {deck.description && (
                      <p className="text-gray-600">{deck.description}</p>
                    )}
                    <div className="flex gap-4 mt-2">
                      <span className="text-sm text-gray-500">
                        {deck.cardCount} cartes
                      </span>
                      <span className="text-sm text-blue-600">
                        {deck.newCount} nouvelles
                      </span>
                      <span className="text-sm text-orange-600">
                        {deck.dueCount} à réviser
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-game-primary to-game-secondary">
      <div className="container mx-auto px-4 py-8">
        <button
          onClick={() => navigate('/')}
          className="text-white mb-4 hover:underline"
        >
          ← Retour aux decks
        </button>

        <header className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">
            Choisir un jeu
          </h1>
          <p className="text-xl text-white/80">
            {selectedDeck 
              ? `Deck sélectionné : ${selectedDeck.name}`
              : 'Sélectionnez un jeu pour réviser vos cartes'
            }
          </p>
        </header>

        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          {games.map((game) => (
            <button
              key={game.type}
              onClick={() => game.available && handleSelectGame(game.type)}
              disabled={!game.available}
              className={`
                p-8 rounded-2xl text-left transition-all
                ${game.available
                  ? 'bg-white hover:shadow-2xl hover:scale-105 cursor-pointer'
                  : 'bg-gray-300 opacity-50 cursor-not-allowed'
                }
              `}
            >
              <div className="text-6xl mb-4">{game.icon}</div>
              <h3 className="text-2xl font-bold mb-2">{game.name}</h3>
              <p className="text-gray-600">{game.description}</p>
              {!game.available && (
                <p className="text-sm text-gray-500 mt-2">Bientôt disponible</p>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}