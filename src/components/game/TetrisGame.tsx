import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TetrisGame } from '@/modules/games/tetris/TetrisGame'
import { BOARD_WIDTH, BOARD_HEIGHT, TICK_SPEED, TETROMINOS, TetrominoType } from '@/modules/games/tetris/constants'
import { useGameStore, useDeckStore, useCardStore, useReviewStore } from '@/store'
import { Card } from '@/types'
import FlashcardModal from '@/components/flashcard/FlashcardModal'
import UpToDateModal from '@/components/game/UpToDateModal'

export default function TetrisGameComponent() {
  const navigate = useNavigate()
  const [game] = useState<TetrisGame>(() => new TetrisGame())
  const [, forceUpdate] = useState({})
  const [availableCards, setAvailableCards] = useState<Card[]>([])
  const [nextPieceType, setNextPieceType] = useState<TetrominoType>('T')
  const [showUpToDate, setShowUpToDate] = useState(false)
  const [isForFun, setIsForFun] = useState(false)
  const intervalRef = useRef<number>()
  const gameRef = useRef(game)
  const pieceCountRef = useRef(0)
  const nextThresholdRef = useRef(Math.floor(Math.random() * 9) + 3)
  const cardsRef = useRef<Card[]>([])
  const nextPieceRef = useRef<TetrominoType>('T')

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
  const { getCardsFromDeck } = useCardStore()

  // Re-render helper
  const updateDisplay = () => forceUpdate({})

  // Generate random piece type
  const generateRandomPiece = (): TetrominoType => {
    const pieces = Object.keys(TETROMINOS) as TetrominoType[]
    return pieces[Math.floor(Math.random() * pieces.length)]
  }

  // Initialize game session and load cards
  useEffect(() => {
    startGame('tetris')
    loadCards(isForFun)

    // Set initial next piece
    const initialNext = generateRandomPiece()
    setNextPieceType(initialNext)
    nextPieceRef.current = initialNext

    // Override spawnPiece to use predetermined next piece
    const originalSpawnPiece = game.spawnPiece.bind(game)
    const originalClearLines = game.clearLines.bind(game)

    game.spawnPiece = function() {
      // Use the predetermined next piece
      const type = nextPieceRef.current
      const tetromino = TETROMINOS[type]

      this.currentPiece = {
        type,
        x: Math.floor(BOARD_WIDTH / 2) - 1,
        y: 0,
        shape: [...tetromino.shape.map(row => [...row])], // Deep copy
        color: tetromino.color
      }

      if (!this.isValidPosition(this.currentPiece)) {
        this.gameOver = true
      }

      // Generate new next piece
      const newNext = generateRandomPiece()
      setNextPieceType(newNext)
      nextPieceRef.current = newNext

      // Increment piece count and check for flashcard
      pieceCountRef.current++
      console.log(`Piece ${pieceCountRef.current}/${nextThresholdRef.current}`)

      // Check if we should show a flashcard
      if (
        pieceCountRef.current >= nextThresholdRef.current &&
        cardsRef.current.length > 0 &&
        !gameRef.current.flashcardVisible
      ) {
        const randomCard = cardsRef.current[Math.floor(Math.random() * cardsRef.current.length)]
        console.log('Showing flashcard:', randomCard)

        useReviewStore.setState({ currentCard: randomCard })

        showFlashcard(randomCard)
        pieceCountRef.current = 0
        nextThresholdRef.current = Math.floor(Math.random() * 9) + 3 // 3-11
      }
    }

    game.clearLines = function () {
      const linesBefore = this.lines
      originalClearLines()
      const linesCleared = this.lines - linesBefore
      if (linesCleared > 0) {
        clearLines(linesCleared)
      }
    }

    return () => {
      endGame()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isForFun])

  // Update refs when state changes
  useEffect(() => {
    cardsRef.current = availableCards
    gameRef.current.flashcardVisible = flashcardVisible
  }, [availableCards, flashcardVisible])

  // Load cards from selected deck using FSRS
  const loadCards = async (forFun: boolean = false) => {
    const cards = await useReviewStore.getState().getCardsForGame(forFun)

    if (cards.length === 0 && !forFun) {
      // Aucune carte due, afficher le message
      setShowUpToDate(true)
    } else {
      setAvailableCards(cards)
      cardsRef.current = cards
      console.log(`Loaded ${cards.length} cards for review (forFun: ${forFun})`)
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
    intervalRef.current = window.setInterval(() => {
      if (!game.gameOver) {
        game.drop()
        updateDisplay()

        // Sync score
        if (game.score !== useGameStore.getState().score) {
          updateScore(game.score - useGameStore.getState().score)
        }
      }
    }, TICK_SPEED)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [game, updateScore])

  // Keyboard controls
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (game.gameOver) return

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
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [game])

  const resetGame = () => {
    window.location.reload() // Simple reload pour reset complet
  }

  const handleFlashcardAnswer = async (correct: boolean) => {
    if (correct) {
      removeBottomLine()
    } else {
      addPenaltyLine()
    }
    hideFlashcard()

    // Recharger les cartes pour exclure celles déjà révisées
    await loadCards(isForFun)

    // Rafraîchir les compteurs des decks
    await useDeckStore.getState().refreshDeckCounts()
  }

  const cellSize = 30
  const board = game.getDisplayBoard()

  // Get next piece for preview
  const nextPiece = TETROMINOS[nextPieceType]

  // Display deck info
  const deckInfo = reviewMode === 'all'
    ? 'Tous les decks'
    : selectedDeckId
      ? useDeckStore.getState().decks.find(d => d.id === selectedDeckId)?.name
      : 'Aucun deck'

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <div className="mb-4 flex items-center gap-4">
        <button
          onClick={() => navigate('/play')}
          className="text-white hover:underline"
        >
          ← Retour
        </button>
        <span className="text-white/60">
          Mode : {deckInfo} {isForFun && '(Pour le plaisir)'}
        </span>
        {availableCards.length === 0 && !showUpToDate && (
          <span className="text-yellow-400">
            ⚠️ Aucune carte disponible !
          </span>
        )}
      </div>

      <div className="flex gap-8">
        <div
          className="bg-black p-2 rounded"
          style={{
            width: BOARD_WIDTH * cellSize + 4,
            height: BOARD_HEIGHT * cellSize + 4
          }}
        >
          <div className="relative bg-black" style={{ width: BOARD_WIDTH * cellSize, height: BOARD_HEIGHT * cellSize }}>
            {board.map((row, y) => (
              row.map((cell, x) => (
                <div
                  key={`${x}-${y}`}
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
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="bg-gray-800 p-4 rounded">
            <h2 className="text-xl font-bold mb-2">Score</h2>
            <p className="text-2xl">{game.score}</p>
          </div>

          <div className="bg-gray-800 p-4 rounded">
            <h2 className="text-xl font-bold mb-2">Lignes</h2>
            <p className="text-2xl">{game.lines}</p>
          </div>

          <div className="bg-gray-800 p-4 rounded">
            <h2 className="text-xl font-bold mb-2">Niveau</h2>
            <p className="text-2xl">{game.level}</p>
          </div>

          <div className="bg-gray-800 p-4 rounded">
            <h2 className="text-xl font-bold mb-2">Prochaine</h2>
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

          <div className="bg-gray-800 p-4 rounded">
            <h2 className="text-xl font-bold mb-2">Cartes</h2>
            <p className="text-lg">{availableCards.length} disponibles</p>
          </div>

          {game.gameOver && (
            <div className="bg-red-800 p-4 rounded">
              <h2 className="text-xl font-bold mb-2">Game Over!</h2>
              <button
                onClick={resetGame}
                className="btn-primary w-full"
              >
                Rejouer
              </button>
            </div>
          )}

          <div className="bg-gray-800 p-4 rounded text-sm">
            <h3 className="font-bold mb-2">Contrôles</h3>
            <p>← → : Déplacer</p>
            <p>↑ : Tourner</p>
            <p>↓ : Descendre</p>
            <p>Espace : Chute rapide</p>
          </div>
        </div>
      </div>

      {flashcardVisible && currentFlashcard && (
        <FlashcardModal
          card={currentFlashcard}
          onAnswer={handleFlashcardAnswer}
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
    </div>
  )
}
