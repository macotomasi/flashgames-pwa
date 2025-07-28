import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TetrisGame } from '@/modules/games/tetris/TetrisGame'
import { BOARD_WIDTH, BOARD_HEIGHT, TICK_SPEED, TETROMINOS, TetrominoType } from '@/modules/games/tetris/constants'
import { useGameStore, useDeckStore, useCardStore, useReviewStore, useProgressionStore } from '@/store'
import { Card } from '@/types'
import { MEMORY_LEVELS, DAILY_REWARDS } from '@/types/progression'
import FlashcardModal from '@/components/flashcard/FlashcardModal'
import UpToDateModal from '@/components/game/UpToDateModal'
import ProgressionNotification from '@/components/progression/ProgressionNotification'
import { logger } from '@/utils/logger'
import { useProgressionNotifications } from '@/hooks/useProgressionNotifications'
import { soundManager } from '@/utils/sounds'
import { isNative, shouldReduceMotion } from '@/utils/platform'
import React, { useMemo } from 'react'

// Sous-composant mémoïsé pour une cellule du plateau
const Cell = React.memo(({ x, y, cell, cellSize }: { x: number, y: number, cell: string | null, cellSize: number }) => (
  <div
    className="absolute"
    style={{
      left: x * cellSize,
      top: y * cellSize,
      width: cellSize,
      height: cellSize,
      backgroundColor: cell || 'transparent',
      border: cell ? '1px solid rgba(0,0,0,0.3)' : 'none'
    }}
  />
))

export default function TetrisGameComponent() {
  const navigate = useNavigate()
  const [game] = useState<TetrisGame>(() => new TetrisGame())
  const [, forceUpdate] = useState({})
  const [availableCards, setAvailableCards] = useState<Card[]>([])
  const [nextPieceType, setNextPieceType] = useState<TetrominoType>('T')
  const [showUpToDate, setShowUpToDate] = useState(false)
  const [isForFun, setIsForFun] = useState(false)
  const [bossCard, setBossCard] = useState<Card | null>(null)
  const [isGamePaused, setIsGamePaused] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const intervalRef = useRef<number>(0)
  // Remplacement des refs par des states
  // const pieceCountRef = useRef(0)
  // const nextThresholdRef = useRef(Math.floor(Math.random() * 9) + 3)
  // const cardsRef = useRef<Card[]>([])
  // const nextPieceRef = useRef<TetrominoType>('T')
  // const gameRef = useRef(game)
  const [pieceCount, setPieceCount] = useState(0)
  const [nextThreshold, setNextThreshold] = useState(Math.floor(Math.random() * 9) + 3)
  const [error, setError] = useState<string | null>(null)

  const {
    flashcardVisible,
    currentFlashcard,
    showFlashcard,
    hideFlashcard,
    updateScore,
    clearLines,
    startGame,
    endGame
  } = useGameStore()

  const { selectedDeckId, reviewMode } = useDeckStore()
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { getCardsFromDeck } = useCardStore()
  const {
    userProgress,
    bossCardSession,
    checkAndResetDaily,
    updateMemoryLevel,
    updateStreak,
    updateBestScore,
    incrementConsecutiveCorrect,
    resetConsecutiveCorrect,
    checkForBossCard,
    setBossCard: setBossCardId,
    clearBossCard,
    getCardsForBoss,
    addNewCardToday
  } = useProgressionStore()

  // Progression notifications
  const { notifications, removeNotification } = useProgressionNotifications()

  // Re-render helper
  const updateDisplay = () => forceUpdate({})

  // Generate random piece type
  const generateRandomPiece = (): TetrominoType => {
    const pieces = Object.keys(TETROMINOS) as TetrominoType[]
    return pieces[Math.floor(Math.random() * pieces.length)]
  }

  // Initialize game session and load cards
  useEffect(() => {
    let isMounted = true;
    let hasEnded = false; // Garde-fou pour éviter les doubles appels
    checkAndResetDaily()
    updateStreak()
    updateMemoryLevel()
    startGame('tetris')
    const isMountedRef = { current: true }
    loadCards(isForFun, isMountedRef)
    // Set initial next piece
    const initialNext = generateRandomPiece()
    setNextPieceType(initialNext)
    setPieceCount(0)
    setNextThreshold(Math.floor(Math.random() * 9) + 3)
    // Override spawnPiece to use predetermined next piece
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const originalSpawnPiece = game.spawnPiece.bind(game)
    const originalClearLines = game.clearLines.bind(game)
    game.spawnPiece = function() {
      // Use the predetermined next piece
      const type = nextPieceType
      const tetromino = TETROMINOS[type]
      this.currentPiece = {
        type,
        x: Math.floor(BOARD_WIDTH / 2) - 1,
        y: 0,
        shape: [...tetromino.shape.map(row => [...row])],
        color: tetromino.color
      }
      if (!this.isValidPosition(this.currentPiece)) {
        this.gameOver = true
        if (!hasEnded) {
          hasEnded = true
          updateBestScore(this.score)
          endGame()
        }
      }
      // Generate new next piece
      const newNext = generateRandomPiece()
      setNextPieceType(newNext)
      // Increment piece count and check for flashcard
      setPieceCount(prev => {
        const newCount = prev + 1
        // Check if we should show a flashcard
        if (
          newCount >= nextThreshold &&
          availableCards.length > 0 &&
          !flashcardVisible
        ) {
          // On déclenche l'affichage de la flashcard via une fonction asynchrone
          triggerFlashcard()
          return 0
        }
        return newCount
      })
    }
    // Fonction asynchrone pour gérer l'affichage de la flashcard
    async function triggerFlashcard() {
      let cardToShow: Card
      let isBoss = false
      if (checkForBossCard() && !bossCardSession.isActive) {
        const bossCards = await getCardsForBoss()
        if (bossCards.length > 0) {
          cardToShow = bossCards[Math.floor(Math.random() * bossCards.length)]
          setBossCard(cardToShow)
          setBossCardId(cardToShow.id)
          isBoss = true
        } else {
          cardToShow = availableCards[Math.floor(Math.random() * availableCards.length)]
        }
      } else {
        cardToShow = availableCards[Math.floor(Math.random() * availableCards.length)]
      }
      useReviewStore.setState({ currentCard: cardToShow })
      showFlashcard(cardToShow)
      setNextThreshold(Math.floor(Math.random() * 9) + 3)
    }
    game.clearLines = function () {
      const linesBefore = this.lines
      originalClearLines()
      const linesCleared = this.lines - linesBefore
      if (linesCleared > 0) {
        clearLines(linesCleared)
        soundManager.playLineClear()
      }
    }
    return () => {
      isMounted = false;
      isMountedRef.current = false;
      // Ne rien faire ici pour la fin de partie
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isForFun])

  // Update refs when state changes
  // useEffect(() => {
  //   cardsRef.current = availableCards
  // }, [availableCards])

  // Load cards from selected deck using FSRS
  const loadCards = async (forFun: boolean = false, isMountedRef?: { current: boolean }) => {
    try {
      const cards = await useReviewStore.getState().getCardsForGame(forFun)
      if (isMountedRef && !isMountedRef.current) return
      if (cards.length === 0 && !forFun) {
        setShowUpToDate(true)
      } else {
        setAvailableCards(cards)
        // cardsRef.current = cards
      }
    } catch (err) {
      logger.error('Erreur lors du chargement des cartes', { error: err })
      setError('Erreur lors du chargement des cartes. Veuillez réessayer ou recharger la page.')
    }
  }

  // Add penalty line
  const addPenaltyLine = () => {
    for (let i = 0; i < BOARD_HEIGHT - 1; i++) {
      game.board[i] = game.board[i + 1]
    }
    // Create new bottom line with one empty space
    const emptyIndex = Math.floor(Math.random() * BOARD_WIDTH)
    game.board[BOARD_HEIGHT - 1] = Array(BOARD_WIDTH).fill('#808080').map((_, i) =>
      i === emptyIndex ? null : '#808080'
    )
    updateDisplay()
  }

  // Remove bottom line
  const removeBottomLine = () => {
    if (game.board[BOARD_HEIGHT - 1].some(cell => cell !== null)) {
      game.removeBottomLine()
      updateDisplay()
      updateScore(10)
    }
  }

  // Game loop
  useEffect(() => {
    let isMounted = true;
    intervalRef.current = window.setInterval(() => {
      if (!game.gameOver && !isGamePaused) {
        game.drop()
        if (isMounted) updateDisplay()
        // Sync score
        if (game.score !== useGameStore.getState().score) {
          updateScore(game.score - useGameStore.getState().score)
        }
      }
    }, TICK_SPEED)

    return () => {
      isMounted = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [game, updateScore, isGamePaused])

  // Keyboard controls (desktop only)
  useEffect(() => {
    if (isNative) return
    let isMounted = true;
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!isMounted) return;
      if (game.gameOver || isGamePaused) return
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          game.movePiece(-1, 0)
          updateDisplay()
          break
        case 'ArrowRight':
          e.preventDefault()
          game.movePiece(1, 0)
          updateDisplay()
          break
        case 'ArrowDown':
          e.preventDefault()
          game.drop()
          updateDisplay()
          break
        case 'ArrowUp':
          e.preventDefault()
          game.rotatePiece()
          updateDisplay()
          break
        case ' ':
          e.preventDefault()
          game.hardDrop()
          updateDisplay()
          break
      }
    }
    window.addEventListener('keydown', handleKeyPress)
    return () => {
      isMounted = false;
      window.removeEventListener('keydown', handleKeyPress)
    }
  }, [game, isGamePaused])

  const resetGame = () => {
    // Réinitialisation locale de l'état du jeu
    endGame()
    setAvailableCards([])
    setNextPieceType('T')
    setShowUpToDate(false)
    setIsForFun(false)
    setBossCard(null)
    setIsGamePaused(false)
    setPieceCount(0)
    setNextThreshold(Math.floor(Math.random() * 9) + 3)
    setError(null)
    // Réinitialise l'instance du jeu
    game.board = game.createEmptyBoard()
    game.score = 0
    game.lines = 0
    game.level = 1
    game.gameOver = false
    game.currentPiece = null
    game.spawnPiece()
    // Recharge les cartes
    loadCards(false)
  }

  const handleGamePauseChange = (paused: boolean) => {
    setIsGamePaused(paused)
  }

  const handleFlashcardAnswer = async (correct: boolean) => {
    let isMounted = true;
    try {
      if (correct) {
        removeBottomLine()
        soundManager.playSuccess()
      } else {
        addPenaltyLine()
        soundManager.playError()
      }
      // Utilisation de l'action atomique
      await useProgressionStore.getState().validateFlashcardAnswer(correct, bossCardSession.isActive)
      setBossCard(null)
      hideFlashcard()
      // Recharger les cartes pour exclure celles déjà révisées
      await loadCards(isForFun, { current: isMounted })
      // Rafraîchir les compteurs des decks
      await useDeckStore.getState().refreshDeckCounts()
      isMounted = false;
    } catch (err) {
      logger.error('Erreur lors de la validation de la flashcard', { error: err })
      setError('Erreur lors de la validation de la flashcard. Veuillez réessayer.')
    }
  }

  // Optimize cell size for mobile and better screen coverage
  const cellSize = isNative ? 30 : 35
  // Mémoïse le plateau affiché
  const board = game.getDisplayBoard()

  // Get next piece for preview
  const nextPiece = TETROMINOS[nextPieceType]

  // Display deck info
  const deckInfo = reviewMode === 'all'
    ? 'Tous les decks'
    : selectedDeckId
      ? useDeckStore.getState().decks.find(d => d.id === selectedDeckId)?.name
      : 'Aucun deck'

  // Get current level info
  const currentLevel = MEMORY_LEVELS.find(l => l.id === userProgress.currentLevel) || MEMORY_LEVELS[0]
  const nextLevel = MEMORY_LEVELS.find(l => l.requiredCards > userProgress.memorizedCards)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  
  // Get current daily reward
  const currentDailyReward = userProgress.dailyReward 
    ? DAILY_REWARDS.find(r => r.id === userProgress.dailyReward)
    : null

  // Reset des stores Zustand lors d'un HMR
  if (import.meta.hot) {
    import.meta.hot.accept(() => {
      // Réinitialise les stores principaux du jeu
      if (useGameStore.getState().endGame) {
        useGameStore.getState().endGame()
      }
      if (useProgressionStore.getState().resetDailyProgress) {
        useProgressionStore.getState().resetDailyProgress()
      }
      // Tu peux ajouter d'autres resets ici si besoin
    })
  }

  useEffect(() => {
    updateBestScore(game.score)
    // S'assurer que updateBestScore ne déclenche pas de setState qui modifie game.score
  }, [game.score])

  return (
    <div
      className="min-h-screen w-full flex flex-col md:flex-row items-center justify-center bg-gray-900"
      style={{ backgroundColor: '#111827' }}
    >
      {error && (
        <div className="bg-red-700 text-white p-3 rounded mb-4 max-w-lg w-full text-center">
          {error}
          <button className="ml-4 underline" onClick={() => setError(null)}>Fermer</button>
        </div>
      )}
      {/* Plateau Tetris */}
      <div className="flex-1 flex items-center justify-center w-full">
        <div
          className="bg-black bg-opacity-90 p-2 rounded shadow-lg flex items-center justify-center"
          style={{
            width: `min(90vw, ${BOARD_WIDTH * cellSize + 4}px)`,
            height: `min(80vw, 70vh, ${BOARD_HEIGHT * cellSize + 4}px)`,
            maxWidth: BOARD_WIDTH * cellSize + 4,
            maxHeight: BOARD_HEIGHT * cellSize + 4,
            aspectRatio: `${BOARD_WIDTH} / ${BOARD_HEIGHT}`,
            boxSizing: 'border-box',
          }}
        >
          <div
            className="relative bg-black"
            style={{
              width: '100%',
              height: '100%',
              display: 'grid',
              gridTemplateRows: `repeat(${BOARD_HEIGHT}, 1fr)`,
              gridTemplateColumns: `repeat(${BOARD_WIDTH}, 1fr)`
            }}
          >
            {board.flatMap((row, y) =>
              row.map((cell, x) => (
                <Cell key={`cell-${x}-${y}`} x={x} y={y} cell={cell} cellSize={cellSize} />
              ))
            )}
          </div>
        </div>
      </div>
      {/* Panneau d'infos */}
      <div className="flex-1 flex items-center justify-center w-full">
        <div className="bg-gray-800 bg-opacity-95 rounded-lg shadow-lg p-6 max-w-md w-full text-white flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-4 mb-2">
            <button
              onClick={() => navigate('/play')}
              className="text-white bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded shadow"
            >
              ← Retour
            </button>
            <span className="text-white/80 text-lg font-medium">
              Mode : {deckInfo} {isForFun && '(Pour le plaisir)'}
            </span>
          </div>
          <div className="flex items-center gap-3 text-base mb-2">
            <span>Jour {userProgress.currentStreak}</span>
            <span>•</span>
            <span>{currentLevel.icon} {currentLevel.name}</span>
            {currentDailyReward && (
              <>
                <span>•</span>
                <span>{currentDailyReward.icon} {currentDailyReward.name}</span>
              </>
            )}
          </div>
          {availableCards.length === 0 && !showUpToDate && (
            <span className="text-yellow-400 font-semibold">
              ⚠️ Aucune carte disponible !
            </span>
          )}
          <div className="flex flex-col gap-3">
            <div>
              <h2 className="text-xl font-bold mb-1">Score</h2>
              <p className="text-2xl font-mono">{game.score}</p>
              <p className="text-sm text-gray-300">Meilleur : {userProgress.bestScore}</p>
            </div>
            <div>
              <h2 className="text-xl font-bold mb-1">Niveau</h2>
              <p className="text-2xl font-mono">{game.level}</p>
            </div>
            <div>
              <h2 className="text-lg font-bold mb-1">Progression</h2>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">{currentLevel.icon}</span>
                <div>
                  <p className="text-sm font-medium">{currentLevel.name}</p>
                  <p className="text-xs text-gray-300">{userProgress.memorizedCards}/{currentLevel.requiredCards}</p>
                </div>
              </div>
              {nextLevel && (
                <p className="text-xs text-gray-400">
                  Prochain : {nextLevel.name} ({nextLevel.requiredCards} cartes)
                </p>
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold mb-1">Prochaine pièce</h2>
              <div className="flex justify-center mt-2">
                <div className="bg-black p-2 rounded">
                  {nextPiece && nextPiece.shape.map((row, y) => (
                    <div key={y} className="flex">
                      {row.map((cell, x) => (
                        <div
                          key={`${x}-${y}`}
                          className="w-5 h-5"
                          style={{
                            backgroundColor: cell ? nextPiece.color : 'transparent',
                            border: cell ? '1px solid rgba(0,0,0,0.3)' : 'none'
                          }}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {flashcardVisible && currentFlashcard && (
        <FlashcardModal
          card={currentFlashcard}
          onAnswer={handleFlashcardAnswer}
          isBossCard={bossCardSession.isActive && bossCardSession.cardId === currentFlashcard.id}
          onGamePauseChange={handleGamePauseChange}
        />
      )}

      {showUpToDate && (
        <UpToDateModal
          onContinue={() => {
            setShowUpToDate(false)
            setIsForFun(true)
            loadCards(true)
          }}
          onClose={() => navigate('/')}
        />
      )}

      {/* Progression Notifications */}
      {notifications.map(notification => (
        <ProgressionNotification
          key={notification.id}
          type={notification.type}
          value={notification.value}
          onClose={() => removeNotification(notification.id)}
        />
      ))}
    </div>
  )
}
