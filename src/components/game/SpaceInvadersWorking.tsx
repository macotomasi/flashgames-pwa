import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameStore, useDeckStore, useCardStore, useReviewStore, useProgressionStore } from '@/store'
import { Card } from '@/types'
import FlashcardModal from '@/components/flashcard/FlashcardModal'
import UpToDateModal from '@/components/game/UpToDateModal'
import ProgressionNotification from '@/components/progression/ProgressionNotification'
import { useProgressionNotifications } from '@/hooks/useProgressionNotifications'
import { soundManager } from '@/utils/sounds'

const GAME_WIDTH = 800
const GAME_HEIGHT = 600
const BASE_PLAYER_WIDTH = 40
const BASE_PLAYER_HEIGHT = 30
const PLAYER_SPEED = 5
const BULLET_SPEED = 7
const ALIEN_WIDTH = 30
const ALIEN_HEIGHT = 20
const BASE_ALIEN_SPEED = 1
const BASE_ALIEN_DROP_SPEED = 20
const BASE_ALIEN_BULLET_SPEED = 3

interface Player {
  x: number
  y: number
}

interface Bullet {
  x: number
  y: number
  fromPlayer: boolean
  age?: number // Track bullet age to prevent immediate collision
  id: string // Add unique ID for tracking
}

interface Alien {
  id: string
  x: number
  y: number
  alive: boolean
}

// Simple and reliable collision detection function inspired by open source implementations
function checkCollision(
  rect1: { x: number, y: number, width: number, height: number },
  rect2: { x: number, y: number, width: number, height: number }
): boolean {
  return rect1.x < rect2.x + rect2.width &&
         rect1.x + rect1.width > rect2.x &&
         rect1.y < rect2.y + rect2.height &&
         rect1.y + rect1.height > rect2.y
}

export default function SpaceInvadersWorking() {
  const navigate = useNavigate()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)
  
  // Store hooks like in Tetris
  const {
    flashcardVisible,
    currentFlashcard,
    showFlashcard,
    hideFlashcard,
    updateScore: updateGameScore,
    startGame,
    endGame
  } = useGameStore()

  const { selectedDeckId, reviewMode } = useDeckStore()
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
  
  // Game state like in Tetris
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(3)
  const [player, setPlayer] = useState<Player>({ 
    x: GAME_WIDTH / 2 - BASE_PLAYER_WIDTH / 2, 
    y: GAME_HEIGHT - BASE_PLAYER_HEIGHT - 10 
  })
  // Typage explicite pour bullets
  const [bullets, setBullets] = useState<Bullet[]>([])
  const [aliens, setAliens] = useState<Alien[]>([])
  const [alienDirection, setAlienDirection] = useState(1)
  const [aliensShouldDrop, setAliensShouldDrop] = useState(false)
  const [keys, setKeys] = useState<{ [key: string]: boolean }>({})
  const [availableCards, setAvailableCards] = useState<Card[]>([])
  const [showUpToDate, setShowUpToDate] = useState(false)
  const [isForFun, setIsForFun] = useState(false)
  const [bossCard, setBossCard] = useState<Card | null>(null)
  const [isGamePaused, setIsGamePaused] = useState(false)
  const [playerVisible, setPlayerVisible] = useState(true)
  const [respawnTimer, setRespawnTimer] = useState(0)
  const [spacePressed, setSpacePressed] = useState(false)
  const [gameOver, setGameOver] = useState(false)
  const [wave, setWave] = useState(1)
  const [waveTransition, setWaveTransition] = useState(false)
  
  // Refs like in Tetris
  const aliensKilledRef = useRef(0)
  const nextThresholdRef = useRef(10) // Every 10 aliens
  const cardsRef = useRef<Card[]>([])
  const respawnTimerRef = useRef(0)
  
  const playerRef = useRef(player)
  const bulletsRef = useRef(bullets)
  const aliensRef = useRef(aliens)
  const alienDirectionRef = useRef(alienDirection)
  const aliensShouldDropRef = useRef(aliensShouldDrop)
  const keysRef = useRef(keys)
  
  // Keep refs in sync
  playerRef.current = player
  bulletsRef.current = bullets
  aliensRef.current = aliens
  alienDirectionRef.current = alienDirection
  aliensShouldDropRef.current = aliensShouldDrop
  keysRef.current = keys
  respawnTimerRef.current = respawnTimer

  // Initialize game session and load cards like in Tetris
  useEffect(() => {
    // Initialize progression system
    checkAndResetDaily()
    updateStreak()
    updateMemoryLevel()
    
    startGame('space-invaders')
    loadCards(isForFun)

    // Initialize aliens
    const newAliens: Alien[] = []
    for (let i = 0; i < 5; i++) {
      for (let j = 0; j < 8; j++) {
        newAliens.push({
          id: `alien-${i}-${j}`,
          x: 100 + j * 60,
          y: 50 + i * 40,
          alive: true
        })
      }
    }
    setAliens(newAliens)

    return () => {
      // Save best score before ending game
      updateBestScore(score)
      endGame()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isForFun])

  // Update refs when state changes
  useEffect(() => {
    cardsRef.current = availableCards
  }, [availableCards])

  // Load cards from selected deck using FSRS like in Tetris
  const loadCards = async (forFun: boolean = false) => {
    const cards = await useReviewStore.getState().getCardsForGame(forFun)

    if (cards.length === 0 && !forFun) {
      // Aucune carte due, afficher le message
      setShowUpToDate(true)
    } else {
      setAvailableCards(cards)
      cardsRef.current = cards
    }
  }

  const drawGame = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)

    // Calculate player size based on wave (grows progressively)
    const sizeMultiplier = 1 + (Math.max(0, wave - 1) * 0.15) // +15% per wave starting from wave 2
    const playerWidth = BASE_PLAYER_WIDTH * sizeMultiplier
    const playerHeight = BASE_PLAYER_HEIGHT * sizeMultiplier

    // Draw player (spaceship) - classic arcade style
    if (playerVisible) {
      const px = playerRef.current.x
      const py = playerRef.current.y
      
      // Main body (green rectangle)
      ctx.fillStyle = '#00ff00'
      ctx.fillRect(px + 8, py + 10, playerWidth - 16, playerHeight - 15)
      
      // Top cannon
      ctx.fillRect(px + playerWidth/2 - 2, py, 4, 12)
      
      // Left wing
      ctx.fillRect(px, py + 18, 8, 8)
      
      // Right wing  
      ctx.fillRect(px + playerWidth - 8, py + 18, 8, 8)
      
      // Engine thrusters (blue)
      ctx.fillStyle = '#0088ff'
      ctx.fillRect(px + 10, py + playerHeight - 3, 4, 3)
      ctx.fillRect(px + playerWidth - 14, py + playerHeight - 3, 4, 3)
      
      // Cockpit details (white)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(px + playerWidth/2 - 3, py + 12, 6, 4)
    }

    // Draw bullets
    bulletsRef.current.forEach(bullet => {
      if (bullet.fromPlayer) {
        ctx.fillStyle = '#ffff00' // Yellow for player bullets
      } else {
        ctx.fillStyle = '#ff00ff' // Magenta for alien bullets
        // Draw a larger rect for alien bullets to make them more visible
        ctx.fillRect(bullet.x - 2, bullet.y - 2, 8, 14)
        ctx.fillStyle = '#ff0000' // Red center
      }
      ctx.fillRect(bullet.x, bullet.y, 4, 10)
    })

    // Draw aliens
    aliensRef.current.forEach(alien => {
      if (alien.alive) {
        const ax = alien.x
        const ay = alien.y
        
        // Draw alien body
        ctx.fillStyle = '#ff0000'
        ctx.fillRect(ax + 5, ay + 8, ALIEN_WIDTH - 10, ALIEN_HEIGHT - 8)
        
        // Draw alien head
        ctx.fillRect(ax + 8, ay + 3, ALIEN_WIDTH - 16, 8)
        
        // Draw eyes
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(ax + 10, ay + 5, 3, 3)
        ctx.fillRect(ax + 17, ay + 5, 3, 3)
        
        // Draw legs
        ctx.fillStyle = '#ff0000'
        ctx.fillRect(ax + 3, ay + 16, 4, 4)
        ctx.fillRect(ax + 10, ay + 16, 4, 4)
        ctx.fillRect(ax + 16, ay + 16, 4, 4)
        ctx.fillRect(ax + 23, ay + 16, 4, 4)
      }
    })

    // Draw wave transition message
    if (waveTransition) {
      try {
        ctx.fillStyle = '#ffff00'
        ctx.font = '48px Arial'
        ctx.textAlign = 'center'
        ctx.fillText(`VAGUE ${wave}`, GAME_WIDTH / 2, GAME_HEIGHT / 2)
        ctx.font = '24px Arial'
        
        // Special messages for milestones
        let message = 'Préparez-vous!'
        if (wave === 3) message = 'Les aliens accélèrent!'
        else if (wave === 5) message = 'Difficulté augmentée!'
        else if (wave === 7) message = 'Niveau avancé!'
        else if (wave === 10) message = '🏆 MODE EXPERT ACTIVÉ! 🏆'
        else if (wave > 10) message = 'Vous êtes un champion!'
        
        ctx.fillText(message, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 60)
        
        // Show power-up info
        if (wave > 1) {
          ctx.font = '16px Arial'
          ctx.fillStyle = '#00ff00'
          const sizeBonus = Math.round((1 + (Math.max(0, wave - 1) * 0.15)) * 100) - 100
          const bulletCount = Math.min(wave, 4)
          ctx.fillText(`Vaisseau: +${sizeBonus}% | ${bulletCount} balles`, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 100)
        }
      } catch (error) {
      }
    }
  }

  // Add refs to track player state
  const isDeadRef = useRef(false)
  const livesRef = useRef(lives)
  livesRef.current = lives

  // Player death and respawn functions
  const killPlayer = () => {
    // Prevent multiple kills while already dead
    if (isDeadRef.current || !playerVisible) {
      return
    }
    
    isDeadRef.current = true
    setPlayerVisible(false)
    
    setLives(prev => {
      const newLives = prev - 1
      
      // Check if game over
      if (newLives <= 0) {
        setGameOver(true)
        updateBestScore(score)
        return newLives
      }
      
      // Respawn after timer
      setTimeout(() => {
        const sizeMultiplier = 1 + (Math.max(0, wave - 1) * 0.15)
        const currentPlayerWidth = BASE_PLAYER_WIDTH * sizeMultiplier
        const currentPlayerHeight = BASE_PLAYER_HEIGHT * sizeMultiplier
        setPlayer({
          x: GAME_WIDTH / 2 - currentPlayerWidth / 2,
          y: GAME_HEIGHT - currentPlayerHeight - 10
        })
        setPlayerVisible(true)
        setRespawnTimer(0)
        isDeadRef.current = false
      }, 2000)
      
      return newLives
    })
    
    setRespawnTimer(120) // 2 seconds at 60fps
    
    // Clear player bullets
    setBullets(prev => prev.filter(bullet => !bullet.fromPlayer))
  }

  const updateGame = () => {
    // Skip game updates if paused, game over, or wave transition
    if (isGamePaused || gameOver || waveTransition) {
      return
    }
    
    // IMPORTANT: Always check collisions, even when flashcard is visible!
    // Only skip movement and shooting when flashcard is visible
    const allowMovement = !flashcardVisible

    // Update respawn timer
    if (respawnTimerRef.current > 0) {
      setRespawnTimer(prev => prev - 1)
    }

    // Update player position (only if visible and movement allowed)
    if (playerVisible && allowMovement) {
      setPlayer(prev => {
        const sizeMultiplier = 1 + (Math.max(0, wave - 1) * 0.15)
        const currentPlayerWidth = BASE_PLAYER_WIDTH * sizeMultiplier
        let newX = prev.x
        if (keysRef.current['ArrowLeft'] && newX > 0) {
          newX -= PLAYER_SPEED
        }
        if (keysRef.current['ArrowRight'] && newX < GAME_WIDTH - currentPlayerWidth) {
          newX += PLAYER_SPEED
        }
        return { ...prev, x: newX }
      })
    }

    // Update bullets
    setBullets(prev => 
      prev
        .map(bullet => ({
          ...bullet,
          y: bullet.fromPlayer ? bullet.y - BULLET_SPEED : bullet.y + (BASE_ALIEN_BULLET_SPEED + Math.max(0, wave - 1) * 0.5),
          age: (bullet.age || 0) + 1 // Increment bullet age
        }))
        .filter(bullet => bullet.y > -10 && bullet.y < GAME_HEIGHT + 10)
    )

    // Update aliens movement (only when movement allowed)
    if (allowMovement) {
      if (aliensShouldDropRef.current) {
        // Drop aliens and change direction (speed increases with waves)
        const currentDropSpeed = BASE_ALIEN_DROP_SPEED + Math.max(0, wave - 1) * 2
        setAliens(prev => prev.map(alien => ({
          ...alien,
          y: alien.y + currentDropSpeed
        })))
        setAlienDirection(-alienDirectionRef.current)
        setAliensShouldDrop(false)
      } else {
        // Normal horizontal movement
        setAliens(prev => {
          let shouldDrop = false
          const currentDirection = alienDirectionRef.current

          // Check if any alien will hit the edge
          prev.forEach(alien => {
            if (alien.alive) {
              const nextX = alien.x + (currentDirection * BASE_ALIEN_SPEED)
              if (nextX <= 0 || nextX >= GAME_WIDTH - ALIEN_WIDTH) {
                shouldDrop = true
              }
            }
          })

          if (shouldDrop) {
            setAliensShouldDrop(true)
            return prev // Don't move this frame, just mark for drop
          } else {
            // Move aliens horizontally (speed increases with waves)
            const currentAlienSpeed = BASE_ALIEN_SPEED + Math.max(0, wave - 1) * 0.3
            return prev.map(alien => ({
              ...alien,
              x: alien.x + (currentDirection * currentAlienSpeed)
            }))
          }
        })
      }

      // Aliens shoot randomly (frequency increases with waves)
      const shootChance = 0.003 + Math.max(0, wave - 1) * 0.001 // Increase shooting rate
      if (Math.random() < shootChance) {
        const aliveAliens = aliensRef.current.filter(alien => alien.alive)
        if (aliveAliens.length > 0) {
          const shooter = aliveAliens[Math.floor(Math.random() * aliveAliens.length)]
          setBullets(prev => [
            ...prev,
            {
              x: shooter.x + ALIEN_WIDTH / 2 - 2,
              y: shooter.y + ALIEN_HEIGHT,
              fromPlayer: false,
              age: 0,
              id: `alien-bullet-${Date.now()}-${Math.random()}`
            }
          ])
        }
      }
    }

    // Check bullet-alien collisions (one bullet = one alien max)
    let bulletsToRemove = new Set<number>()
    let aliensToKill = new Set<string>()
    
    // First pass: detect all collisions
    bulletsRef.current.forEach((bullet, bulletIndex) => {
      if (!bullet.fromPlayer || bulletsToRemove.has(bulletIndex)) return
      
      // Skip very young bullets to prevent immediate collision
      if ((bullet.age || 0) < 5) return
      
      aliensRef.current.forEach((alien) => {
        if (!alien.alive || aliensToKill.has(alien.id)) return
        
        if (bullet.x < alien.x + ALIEN_WIDTH &&
            bullet.x + 4 > alien.x &&
            bullet.y < alien.y + ALIEN_HEIGHT &&
            bullet.y + 10 > alien.y) {
          // Collision detected
          bulletsToRemove.add(bulletIndex)
          aliensToKill.add(alien.id)
          
          setScore(prev => prev + 10)
          updateGameScore(10)
          
          // Increment alien kill count and check for flashcard
          aliensKilledRef.current++

          if (
            aliensKilledRef.current >= nextThresholdRef.current &&
            cardsRef.current.length > 0 &&
            !flashcardVisible
          ) {
            showFlashcardNow()
          }
        }
      })
    })
    
    // Second pass: remove bullets and kill aliens
    setBullets(prev => prev.filter((_, index) => !bulletsToRemove.has(index)))
    setAliens(prev => {
      const newAliens = prev.map(alien => {
        if (aliensToKill.has(alien.id)) {
          return { ...alien, alive: false }
        }
        return alien
      })
      
      // Check immediately if all aliens are dead after killing
      const aliveCount = newAliens.filter(a => a.alive).length
      if (aliveCount === 0 && newAliens.length > 0 && !waveTransition && !gameOver) {
        // Use setTimeout to allow state to update before spawning new wave
        setTimeout(() => {
          spawnNewWave()
        }, 100)
      }
      
      return newAliens
    })

    // NEW COLLISION SYSTEM: Check alien bullet-player collisions using proven method
    if (playerVisible && !isDeadRef.current) {
      const sizeMultiplier = 1 + (Math.max(0, wave - 1) * 0.15)
      const currentPlayerWidth = BASE_PLAYER_WIDTH * sizeMultiplier
      const currentPlayerHeight = BASE_PLAYER_HEIGHT * sizeMultiplier
      
      // Create player rectangle
      const playerRect = {
        x: player.x,
        y: player.y,
        width: currentPlayerWidth,
        height: currentPlayerHeight
      }
      
      // Check each alien bullet for collision with player
      const aliensHitPlayer = bullets.filter(bullet => {
        if (bullet.fromPlayer) return false // Skip player bullets
        if ((bullet.age || 0) < 3) return false // Skip very young bullets
        
        const bulletRect = {
          x: bullet.x,
          y: bullet.y,
          width: 4,
          height: 10
        }
        
        const collision = checkCollision(bulletRect, playerRect)
        
        return collision
      })
      
      // If any collision detected
      if (aliensHitPlayer.length > 0) {
        // Remove all colliding bullets
        setBullets(prev => prev.filter(bullet => !aliensHitPlayer.includes(bullet)))
        
        // Kill player
        killPlayer()
      }
    }

    // Check alien-player direct collisions (more sensitive detection)
    if (playerVisible && !isDeadRef.current) {
      const sizeMultiplier = 1 + (Math.max(0, wave - 1) * 0.15)
      const currentPlayerWidth = BASE_PLAYER_WIDTH * sizeMultiplier
      const currentPlayerHeight = BASE_PLAYER_HEIGHT * sizeMultiplier
      
      const playerHitByAlien = aliens.some(alien => {
        if (!alien.alive) return false
        
        // Use player state directly instead of ref
        const collision = (alien.x < player.x + currentPlayerWidth &&
                          alien.x + ALIEN_WIDTH > player.x &&
                          alien.y < player.y + currentPlayerHeight &&
                          alien.y + ALIEN_HEIGHT > player.y)
        
        return collision
      })
      
      if (playerHitByAlien) {
        killPlayer()
      }
    }

    // Check if aliens reached bottom or player level (game over)
    const alienReachedDangerZone = aliens.some(alien => 
      alien.alive && alien.y + ALIEN_HEIGHT >= player.y - 20
    )
    
    if (alienReachedDangerZone) {
      setGameOver(true)
      updateBestScore(score)
    }
  }

  const shoot = () => {
    // Only allow shooting if player is visible and game not over
    if (!playerVisible || gameOver) {
      return
    }
    
    const sizeMultiplier = 1 + (Math.max(0, wave - 1) * 0.15)
    const currentPlayerWidth = BASE_PLAYER_WIDTH * sizeMultiplier
    
    // Calculate number of bullets based on wave
    // Wave 1: 1 bullet, Wave 2-3: 2 bullets, Wave 4-5: 3 bullets, Wave 6+: 4 bullets
    const bulletsCount = Math.min(wave, 4) // Max 4 bullets
    const bullets: Bullet[] = []
    
    if (bulletsCount === 1) {
      bullets.push({
        x: playerRef.current.x + currentPlayerWidth / 2 - 2,
        y: playerRef.current.y - 10, // Start bullet 10px above player to avoid immediate collision
        fromPlayer: true,
        age: 0,
        id: `player-bullet-${Date.now()}-${Math.random()}`
      })
    } else {
      // Spread bullets evenly across the ship width
      const spacing = Math.min(8, currentPlayerWidth / (bulletsCount + 1))
      const startX = playerRef.current.x + currentPlayerWidth / 2 - (spacing * (bulletsCount - 1)) / 2
      
      for (let i = 0; i < bulletsCount; i++) {
        bullets.push({
          x: startX + (i * spacing) - 2,
          y: playerRef.current.y - 10, // Start bullet 10px above player to avoid immediate collision
          fromPlayer: true,
          age: 0,
          id: `player-bullet-${Date.now()}-${i}-${Math.random()}`
        })
      }
    }
    
    setBullets(prev => [...prev, ...bullets])
  }

  // Show flashcard function like in Tetris
  const showFlashcardNow = async () => {
    let cardToShow: Card
    let isBoss = false

    // Check if boss card should appear
    if (checkForBossCard() && !bossCardSession.isActive) {
      const bossCards = await getCardsForBoss()
      if (bossCards.length > 0) {
        cardToShow = bossCards[Math.floor(Math.random() * bossCards.length)]
        setBossCard(cardToShow)
        setBossCardId(cardToShow.id)
        isBoss = true
      } else {
        cardToShow = cardsRef.current[Math.floor(Math.random() * cardsRef.current.length)]
      }
    } else {
      cardToShow = cardsRef.current[Math.floor(Math.random() * cardsRef.current.length)]
    }

    useReviewStore.setState({ currentCard: cardToShow })

    showFlashcard(cardToShow)
    aliensKilledRef.current = 0
    nextThresholdRef.current = 10 // Next flashcard in 10 aliens
  }

  // Handle flashcard answer like in Tetris
  const handleFlashcardAnswer = async (correct: boolean) => {
    if (correct) {
      // Bonus: destroy random alien row
      setAliens(prev => prev.map(alien => {
        if (alien.alive && Math.random() < 0.3) { // 30% chance
          return { ...alien, alive: false }
        }
        return alien
      }))
      incrementConsecutiveCorrect()
      addNewCardToday()
      soundManager.playSuccess()
    } else {
      // Penalty: add a complete new line of aliens at the top
      setAliens(prev => {
        const newAliens = [...prev]
        // Find the topmost alien row to add above it
        let topY = Math.min(...prev.filter(a => a.alive).map(a => a.y))
        topY = topY - 40 // Add new row 40px above
        
        // Add 8 new aliens in a row
        for (let j = 0; j < 8; j++) {
          newAliens.push({
            id: `penalty-alien-${Date.now()}-${j}`,
            x: 100 + j * 60,
            y: topY,
            alive: true
          })
        }
        return newAliens
      })
      resetConsecutiveCorrect()
      soundManager.playError()
    }
    
    // Clear boss card session if it was a boss card
    if (bossCardSession.isActive) {
      clearBossCard()
      setBossCard(null)
    }

    hideFlashcard()

    // Update progression like in Tetris
    await updateMemoryLevel()

    // Reload cards to exclude already reviewed ones
    await loadCards(isForFun)
  }

  // Spawn new wave of aliens
  const spawnNewWave = () => {
    const currentWave = wave // Capture current wave immediately
    const nextWave = currentWave + 1
    
    // Show special message for wave 10 and beyond
    if (nextWave === 10) {
    }
    
    setWaveTransition(true)
    
    // Clear all bullets
    setBullets([])
    
    setTimeout(() => {
      const newAliens: Alien[] = []
      
      // Progressive difficulty:
      // Wave 1-2: 5 rows
      // Wave 3-4: 6 rows
      // Wave 5-6: 7 rows
      // Wave 7+: 8 rows
      let rows = 5
      if (nextWave >= 7) rows = 8
      else if (nextWave >= 5) rows = 7
      else if (nextWave >= 3) rows = 6
      
      const cols = 8
      
      // Different alien patterns for higher waves
      for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
          // Add some variety in higher waves
          if (nextWave >= 5 && Math.random() < 0.1) continue // 10% chance to skip an alien in wave 5+
          
          newAliens.push({
            id: `wave${nextWave}-alien-${i}-${j}`,
            x: 100 + j * 60,
            y: 50 + i * 40,
            alive: true
          })
        }
      }
      
      setAliens(newAliens)
      setWave(nextWave)
      setWaveTransition(false)
      
    }, 2000) // 2 second delay between waves
  }

  // Reset game function like in Tetris
  const resetGame = () => {
    window.location.reload() // Simple reload pour reset complet
  }

  // Game loop
  useEffect(() => {
    const gameLoop = () => {
      updateGame()
      drawGame()
      animationRef.current = requestAnimationFrame(gameLoop)
    }
    
    gameLoop()
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isGamePaused])

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      setKeys(prev => ({ ...prev, [e.key]: true }))
      
      if (e.key === ' ') {
        e.preventDefault()
        // Only shoot if space wasn't already pressed (prevent rapid fire)
        if (!spacePressed) {
          setSpacePressed(true)
          shoot()
        }
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      setKeys(prev => ({ ...prev, [e.key]: false }))
      
      if (e.key === ' ') {
        setSpacePressed(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [spacePressed])

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <div className="mb-4 flex items-center gap-4 flex-wrap">
        <button
          onClick={() => navigate('/play')}
          className="text-white hover:underline"
        >
          ← Retour
        </button>
        <h1 className="text-2xl font-bold">🚀 Space Invaders (Version OPEN-SOURCE-V4)</h1>
        <div className="bg-blue-600 text-white px-3 py-1 rounded text-sm font-bold">
          🎯 NOUVELLE LOGIQUE - Basée sur les meilleures pratiques open source ✓
        </div>
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
            <p className="text-2xl">{'❤️'.repeat(lives)}</p>
          </div>

          <div className="bg-gray-800 p-4 rounded">
            <h2 className="text-xl font-bold mb-2">Vague</h2>
            <p className="text-2xl">{wave}/10+</p>
            {wave >= 10 && (
              <p className="text-sm text-yellow-400 font-bold">MODE EXPERT!</p>
            )}
            {waveTransition && (
              <p className="text-sm text-yellow-400">Nouvelle vague...</p>
            )}
          </div>

          <div className="bg-gray-800 p-4 rounded">
            <h2 className="text-xl font-bold mb-2">Vaisseau</h2>
            <p className="text-sm text-gray-400">Taille: {Math.round((1 + (Math.max(0, wave - 1) * 0.15)) * 100)}%</p>
            <p className="text-sm text-gray-400">Balles: {Math.min(wave, 4)}</p>
            <p className="text-sm text-gray-400">Vitesse aliens: +{Math.max(0, wave - 1) * 30}%</p>
            {wave >= 10 && (
              <p className="text-xs text-yellow-400 mt-1">Niveau maximum!</p>
            )}
          </div>

          <div className="bg-gray-800 p-4 rounded text-sm">
            <h3 className="font-bold mb-2">Contrôles</h3>
            <p>← → : Déplacer</p>
            <p>Espace : Tirer</p>
            <div className="mt-2 space-y-1">
              <button 
                onClick={() => setScore(score + 10)}
                className="block px-2 py-1 bg-blue-600 text-white rounded text-xs"
              >
                Test: +10 points
              </button>
              <button 
                onClick={shoot}
                className="block px-2 py-1 bg-green-600 text-white rounded text-xs"
              >
                Test: Tirer
              </button>
              <button 
                onClick={showFlashcardNow}
                className="block px-2 py-1 bg-purple-600 text-white rounded text-xs"
                disabled={availableCards.length === 0}
              >
                Test: Flashcard
              </button>
              <button 
                onClick={() => {
                  const alive = aliens.filter(a => a.alive).length
                            if (alive === 0 && aliens.length > 0) {
                                if (!waveTransition && !gameOver) {
                                    spawnNewWave()
                    } else {
                                  }
                  } else {
                              }
                }}
                className="block px-2 py-1 bg-red-600 text-white rounded text-xs"
              >
                Test: Check Wave
              </button>
              <button 
                onClick={() => {
                                                
                  // Force kill player to test
                  if (playerVisible && !isDeadRef.current) {
                                killPlayer()
                  }
                }}
                className="block px-2 py-1 bg-orange-600 text-white rounded text-xs"
              >
                Test: Kill Player
              </button>
            </div>
          </div>

          <div className="bg-gray-800 p-4 rounded text-sm">
            <h3 className="font-bold mb-2">Debug</h3>
            <p>Player: {Math.round(player.x)}, {Math.round(player.y)}</p>
            <p>Bullets: {bullets.length} (Alien: {bullets.filter(b => !b.fromPlayer).length})</p>
            <p>Aliens: {aliens.filter(a => a.alive).length}/{aliens.length}</p>
            <p>Cards: {availableCards.length}</p>
            <p>Killed: {aliensKilledRef.current}/10</p>
            <p>Flashcard: {flashcardVisible ? 'Yes' : 'No'}</p>
            <p>Game Paused: {isGamePaused ? 'Yes' : 'No'}</p>
            <p>Player Visible: {playerVisible ? 'Yes' : 'No'}</p>
            <p>Respawn Timer: {respawnTimer}</p>
            <p>Wave Transition: {waveTransition ? 'Yes' : 'No'}</p>
            <p>Keys: {Object.keys(keys).filter(k => keys[k]).join(', ')}</p>
          </div>

          {/* Game Over Panel like in Tetris */}
          {gameOver && (
            <div className="bg-red-800 p-4 rounded">
              <h2 className="text-xl font-bold mb-2">Game Over!</h2>
              <p className="text-sm mb-4">Score final: {score}</p>
              <button
                onClick={resetGame}
                className="btn-primary w-full"
              >
                Rejouer
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Flashcard Modal like in Tetris */}
      {flashcardVisible && currentFlashcard && (
        <FlashcardModal
          card={currentFlashcard}
          onAnswer={handleFlashcardAnswer}
          isBossCard={bossCard !== null}
          onGamePauseChange={(paused) => {
                setIsGamePaused(paused)
            setTimeout(() => {
                  }, 100)
          }}
        />
      )}

      {/* Up to Date Modal like in Tetris */}
      {showUpToDate && (
        <UpToDateModal
          onContinue={() => {
            setIsForFun(true)
            setShowUpToDate(false)
            loadCards(true)
          }}
          onClose={() => setShowUpToDate(false)}
        />
      )}

      {/* Progression Notifications like in Tetris */}
      {notifications.map((notification) => (
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