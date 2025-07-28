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
    <div className="bg-black/90 border-4 border-neon-cyan shadow-neon rounded-xl p-6 max-w-xs w-full flex flex-col gap-4 items-center">
      <div className="flex items-start justify-between w-full mb-2">
        <div className="text-4xl">{deck.icon || '📚'}</div>
        <div className="text-right">
          <div className="text-sm text-neon-cyan font-mono">Cartes</div>
          <div className="text-2xl font-bold text-white font-mono">{deck.cardCount}</div>
        </div>
      </div>
      <h3 className="text-xl font-mono font-semibold text-neon-cyan mb-1 w-full text-left">{deck.name}</h3>
      {deck.description && (
        <p className="text-white/80 text-sm mb-2 w-full text-left">{deck.description}</p>
      )}
      <div className="flex gap-4 mb-2 w-full">
        <div className="flex-1 text-center">
          <div className="text-2xl font-bold text-neon-cyan">{deck.newCount}</div>
          <div className="text-xs text-white/70">Nouvelles</div>
        </div>
        <div className="flex-1 text-center">
          <div className="text-2xl font-bold text-neon-pink">{deck.dueCount}</div>
          <div className="text-xs text-white/70">À réviser</div>
        </div>
      </div>
      <div className="flex gap-2 w-full">
        <button
          onClick={handlePlay}
          className="flex-1 bg-neon-cyan text-black font-bold rounded-lg shadow-neon hover:scale-105 transition-transform text-sm py-2"
          style={{background: '#00fff7', boxShadow: '0 0 8px #00fff7'}}
        >
          Jouer
        </button>
        <button 
          onClick={handleManage}
          className="px-4 py-2 bg-neon-pink text-white font-bold rounded-lg shadow-neon hover:scale-105 transition-transform text-sm"
          style={{background: '#ff00c8', boxShadow: '0 0 8px #ff00c8'}}
        >
          Gérer
        </button>
      </div>
    </div>
  )
}