import { useNavigate } from 'react-router-dom'
import { useDeckStore } from '@/store'
import { ReviewMode } from '@/types'

interface UpToDateModalProps {
  onContinue: () => void
  onClose: () => void
}

export default function UpToDateModal({ onContinue, onClose }: UpToDateModalProps) {
  const navigate = useNavigate()
  const { setReviewMode } = useDeckStore()

  const handleReviewAllDecks = () => {
    setReviewMode(ReviewMode.ALL_DECKS)
    onContinue()
  }

  const handleChangeDeck = () => {
    navigate('/play')
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl p-6 md:p-8 max-w-md md:max-w-xl w-full text-center shadow-2xl">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold mb-4 text-gray-900">
          Bravo, vous êtes à jour !
        </h2>
        <p className="text-gray-700 mb-6">
          Toutes les cartes de ce deck ont été révisées selon le planning optimal.
        </p>
        
        <div className="space-y-3">
          <button
            onClick={onContinue}
            className="w-full btn-primary"
          >
            Continuer pour le plaisir
          </button>
          
          <button
            onClick={handleReviewAllDecks}
            className="w-full btn-secondary"
          >
            Réviser toutes les cartes (tous les decks)
          </button>
          
          <button
            onClick={handleChangeDeck}
            className="w-full btn-secondary"
          >
            Réviser un autre deck
          </button>
          
          <button
            onClick={onClose}
            className="w-full text-gray-600 hover:text-gray-800"
          >
            Terminer la session
          </button>
        </div>
      </div>
    </div>
  )
}