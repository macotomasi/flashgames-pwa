import DeckList from '@/components/deck/DeckList'
import CreateDeckButton from '@/components/deck/CreateDeckButton'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-game-primary to-game-secondary">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">
            🎮 FlashGames
          </h1>
          <p className="text-xl text-white/80">
            Apprenez en jouant avec des flashcards gamifiées
          </p>
        </header>

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