import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { useDeckStore } from '@/store'
import HomePage from '@/components/HomePage'
import DeckManager from '@/components/deck/DeckManager'
import GameSelector from '@/components/game/GameSelector'
import TetrisGameComponent from '@/components/game/TetrisGame'

function App() {
  const { loadDecks } = useDeckStore()

  useEffect(() => {
    loadDecks()
  }, [loadDecks])

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/deck/:deckId" element={<DeckManager />} />
      <Route path="/play" element={<GameSelector />} />
      <Route path="/play/tetris" element={<TetrisGameComponent />} />
    </Routes>
  )
}

export default App