import { useDeckStore } from '@/store'
import DeckCard from './DeckCard'

export default function DeckList() {
  const { decks, isLoading } = useDeckStore()

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-white/20 border-t-white"></div>
      </div>
    )
  }

  if (decks.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-white/60 text-lg">
          Aucun deck créé pour le moment.
        </p>
        <p className="text-white/40 mt-2">
          Créez votre premier deck pour commencer !
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {decks.map(deck => (
        <DeckCard key={deck.id} deck={deck} />
      ))}
    </div>
  )
}