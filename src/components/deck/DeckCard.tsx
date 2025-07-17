import { useNavigate } from 'react-router-dom'
import { Deck } from '@/types'
import { useDeckStore } from '@/store'

interface DeckCardProps {
  deck: Deck
}

export default function DeckCard({ deck }: DeckCardProps) {
  const navigate = useNavigate()
  const { deleteDeck } = useDeckStore()

  const handlePlay = () => {
    // Aller directement au choix du jeu (pas de présélection)
    navigate('/play')
  }

  const handleManage = () => {
    navigate(`/deck/${deck.id}`)
  }

  const handleDelete = async () => {
    if (confirm(`Supprimer le deck "${deck.name}" et toutes ses cartes ?`)) {
      await deleteDeck(deck.id)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="text-4xl">{deck.icon || '📚'}</div>
        <div className="text-right">
          <div className="text-sm text-gray-500">Cartes</div>
          <div className="text-2xl font-bold">{deck.cardCount}</div>
        </div>
      </div>
      
      <h3 className="text-xl font-semibold mb-2">{deck.name}</h3>
      
      {deck.description && (
        <p className="text-gray-600 text-sm mb-4">{deck.description}</p>
      )}
      
      <div className="flex gap-4 mb-4">
        <div className="flex-1 text-center">
          <div className="text-2xl font-bold text-blue-600">{deck.newCount}</div>
          <div className="text-xs text-gray-500">Nouvelles</div>
        </div>
        <div className="flex-1 text-center">
          <div className="text-2xl font-bold text-orange-600">{deck.dueCount}</div>
          <div className="text-xs text-gray-500">À réviser</div>
        </div>
      </div>
      
      <div className="flex gap-2">
        <button
          onClick={handlePlay}
          className="flex-1 btn-primary text-sm"
        >
          Jouer
        </button>
        <button 
          onClick={handleManage}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors text-sm"
        >
          Gérer
        </button>
      </div>
    </div>
  )
}