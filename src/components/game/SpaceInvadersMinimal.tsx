import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const GAME_WIDTH = 800
const GAME_HEIGHT = 600

export default function SpaceInvadersMinimal() {
  const navigate = useNavigate()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [score, setScore] = useState(0)

  const drawGame = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas with black background
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)

    // Draw a simple player (green rectangle)
    ctx.fillStyle = '#00ff00'
    ctx.fillRect(GAME_WIDTH / 2 - 20, GAME_HEIGHT - 40, 40, 30)

    // Draw some invaders (red rectangles)
    ctx.fillStyle = '#ff0000'
    for (let i = 0; i < 5; i++) {
      for (let j = 0; j < 8; j++) {
        ctx.fillRect(100 + j * 60, 50 + i * 40, 30, 20)
      }
    }

    // Draw some bullets (yellow rectangles)
    ctx.fillStyle = '#ffff00'
    ctx.fillRect(GAME_WIDTH / 2 - 2, GAME_HEIGHT / 2, 4, 10)
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      drawGame()
    }, 100)
    
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <div className="mb-4 flex items-center gap-4 flex-wrap">
        <button
          onClick={() => navigate('/play')}
          className="text-white hover:underline"
        >
          ← Retour
        </button>
        <h1 className="text-2xl font-bold">🚀 Space Invaders (Version Minimal)</h1>
      </div>

      <div className="flex gap-8">
        {/* Game Canvas */}
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={GAME_WIDTH}
            height={GAME_HEIGHT}
            className="border-2 border-gray-600 bg-black"
            style={{ 
              maxWidth: '100%',
              height: 'auto'
            }}
          />
        </div>

        {/* Game Info */}
        <div className="flex flex-col gap-4">
          <div className="bg-gray-800 p-4 rounded">
            <h2 className="text-xl font-bold mb-2">Score</h2>
            <p className="text-2xl">{score}</p>
          </div>

          <div className="bg-gray-800 p-4 rounded">
            <h2 className="text-xl font-bold mb-2">Vies</h2>
            <p className="text-2xl">❤️❤️❤️</p>
          </div>

          <div className="bg-gray-800 p-4 rounded text-sm">
            <h3 className="font-bold mb-2">Contrôles</h3>
            <p>← → : Déplacer</p>
            <p>Espace : Tirer</p>
            <button 
              onClick={() => {
                setScore(score + 10)
                drawGame()
              }}
              className="mt-2 px-2 py-1 bg-blue-600 text-white rounded text-xs"
            >
              Test: +10 points
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}