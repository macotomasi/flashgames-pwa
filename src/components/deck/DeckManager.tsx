import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDeckStore, useCardStore } from '@/store'
import { Card } from '@/types'

export default function DeckManager() {
  const { deckId } = useParams<{ deckId: string }>()
  const navigate = useNavigate()
  const { decks } = useDeckStore()
  const { getCardsFromDeck, createCard, deleteCard } = useCardStore()
  
  const [cards, setCards] = useState<Card[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [front, setFront] = useState('')
  const [back, setBack] = useState('')
  
  const deck = decks.find(d => d.id === deckId)

  useEffect(() => {
    if (deckId) {
      loadCards()
    }
  }, [deckId])

  const loadCards = async () => {
    if (!deckId) return
    const deckCards = await getCardsFromDeck(deckId)
    setCards(deckCards)
  }

  const handleCreateCard = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!deckId || !front.trim() || !back.trim()) return

    await createCard(deckId, front, back)
    await loadCards()
    
    // Reset form
    setFront('')
    setBack('')
    setIsCreating(false)
  }

  const handleDeleteCard = async (cardId: string) => {
    if (confirm('Supprimer cette carte ?')) {
      await deleteCard(cardId)
      await loadCards()
    }
  }

  if (!deck) {
    return <div className="text-gray-900">Deck non trouvé</div>
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-game-primary to-game-secondary flex flex-col items-center justify-center">
      <div className="w-full max-w-screen-lg mx-auto px-4 py-8">
        <button
          onClick={() => navigate('/')}
          className="text-white mb-4 hover:underline"
        >
          ← Retour aux decks
        </button>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8">
          <div className="flex items-center gap-4 mb-8">
            <span className="text-4xl">{deck.icon}</span>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{deck.name}</h1>
              {deck.description && (
                <p className="text-gray-600">{deck.description}</p>
              )}
            </div>
          </div>

          <div className="mb-6 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">
              Cartes ({cards.length})
            </h2>
            <button
              onClick={() => setIsCreating(true)}
              className="btn-primary"
            >
              + Ajouter une carte
            </button>
          </div>

          {isCreating && (
            <form onSubmit={handleCreateCard} className="bg-gray-50 p-6 rounded-lg mb-6">
              <div className="mb-4">
                <label className="block font-medium mb-2 text-gray-700">Question (recto)</label>
                <input
                  type="text"
                  value={front}
                  onChange={(e) => setFront(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-game-primary text-gray-900"
                  placeholder="Ex: Bonjour"
                  required
                  autoFocus
                />
              </div>
              
              <div className="mb-4">
                <label className="block font-medium mb-2 text-gray-700">Réponse (verso)</label>
                <input
                  type="text"
                  value={back}
                  onChange={(e) => setBack(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-game-primary text-gray-900"
                  placeholder="Ex: Hello"
                  required
                />
              </div>
              
              <div className="flex gap-2">
                <button type="submit" className="btn-primary">
                  Créer
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="btn-secondary"
                >
                  Annuler
                </button>
              </div>
            </form>
          )}

          <div className="space-y-2">
            {cards.map((card) => (
              <div
                key={card.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{card.front}</div>
                  <div className="text-gray-600">{card.back}</div>
                </div>
                <button
                  onClick={() => handleDeleteCard(card.id)}
                  className="text-red-600 hover:text-red-800 px-4 py-2"
                >
                  Supprimer
                </button>
              </div>
            ))}
            
            {cards.length === 0 && !isCreating && (
              <p className="text-center py-8 text-gray-500">
                Aucune carte dans ce deck. Créez-en une !
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}