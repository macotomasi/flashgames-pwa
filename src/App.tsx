import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { useDeckStore, useProgressionStore } from '@/store'
import HomePage from '@/components/HomePage'
import DeckManager from '@/components/deck/DeckManager'
import GameSelector from '@/components/game/GameSelector'
import TetrisGameComponent from '@/components/game/TetrisGame'
import SpaceInvadersGameComponent from '@/components/game/SpaceInvadersGame'
import DailyProgressIndicator from '@/components/progression/DailyProgressIndicator'
import { checkAndRunAutoImport } from '@/utils/auto-import'
import ArcadeHeader from '@/components/ArcadeHeader'

function App() {
  const { loadDecks } = useDeckStore()
  const { userProgress } = useProgressionStore()

  useEffect(() => {
    // Lancer la migration automatique au premier démarrage
    checkAndRunAutoImport().then(() => {
      // Puis nettoyer pour ne garder que le deck Anglais
      // Supprimer ou commenter : return runCleanupOnce()
    }).then(() => {
      loadDecks()
    })
  }, [loadDecks])

  return (
    <>
      <ArcadeHeader record={userProgress.bestScore} streak={userProgress.currentStreak} />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/deck/:deckId" element={<DeckManager />} />
        <Route path="/play" element={<GameSelector />} />
        <Route path="/play/tetris" element={<TetrisGameComponent />} />
        <Route path="/play/space-invaders" element={<SpaceInvadersGameComponent />} />
      </Routes>
      {/* <DailyProgressIndicator /> */}
    </>
  )
}

export default App