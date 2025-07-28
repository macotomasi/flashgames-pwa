import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameStore, useDeckStore, useCardStore, useReviewStore, useProgressionStore } from '@/store'
import { Card } from '@/types'
import { MEMORY_LEVELS, DAILY_REWARDS } from '@/types/progression'
import FlashcardModal from '@/components/flashcard/FlashcardModal'
import UpToDateModal from '@/components/game/UpToDateModal'
import ProgressionNotification from '@/components/progression/ProgressionNotification'
import { useProgressionNotifications } from '@/hooks/useProgressionNotifications'
import { soundManager } from '@/utils/sounds'
import { isNative } from '@/utils/platform'
import { logger } from '@/utils/logger'

// Game constants
const GAME_WIDTH = 800
const GAME_HEIGHT = 600
const PLAYER_WIDTH = 60
const PLAYER_HEIGHT = 40
const PLAYER_SPEED = 6
const BULLET_WIDTH = 4
const BULLET_HEIGHT = 10
const BULLET_SPEED = 8
const ALIEN_WIDTH = 40
const ALIEN_HEIGHT = 30
const ALIEN_ROWS = 5
const ALIEN_COLS = 11
const ALIEN_SPACING_X = 50
const ALIEN_SPACING_Y = 40
const ALIEN_START_X = 50
const ALIEN_START_Y = 50
const ALIEN_BULLET_SPEED = 3
const ALIEN_SHOOT_CHANCE = 0.001 // Per alien per frame
const INITIAL_LIVES = 3
const POWER_UP_WIDTH = 30
const POWER_UP_HEIGHT = 30
const POWER_UP_SPEED = 2

// Limites d'objets pour la stabilité
const MAX_PLAYER_BULLETS = 30
const MAX_ALIEN_BULLETS = 40
const MAX_PARTICLES = 100
const MAX_POWER_UPS = 5

// Mode production pour réduire les logs
const IS_PRODUCTION = process.env.NODE_ENV === 'production'
const DEBUG_LOGS = !IS_PRODUCTION

// Level configuration
const LEVEL_CONFIG = [
  { alienSpeed: 1.0, bulletsPerShot: 1, maxBulletsOnScreen: 3, alienShootChance: 0.0005, powerUpChance: 0.1, sideMissiles: false },   // Wave 1: 1 balle
  { alienSpeed: 1.5, bulletsPerShot: 2, maxBulletsOnScreen: 6, alienShootChance: 0.0007, powerUpChance: 0.15, sideMissiles: false }, // Wave 2: 2 balles
  { alienSpeed: 2.0, bulletsPerShot: 3, maxBulletsOnScreen: 9, alienShootChance: 0.001, powerUpChance: 0.2, sideMissiles: false },   // Wave 3: 3 balles
  { alienSpeed: 3.0, bulletsPerShot: 3, maxBulletsOnScreen: 9, alienShootChance: 0.001, powerUpChance: 0.2, sideMissiles: false },   // Wave 4: vitesse 3.0
  { alienSpeed: 3.5, bulletsPerShot: 4, maxBulletsOnScreen: 12, alienShootChance: 0.0012, powerUpChance: 0.25, sideMissiles: false }, // Wave 5: vitesse 3.5
  { alienSpeed: 4.0, bulletsPerShot: 4, maxBulletsOnScreen: 12, alienShootChance: 0.0012, powerUpChance: 0.25, sideMissiles: false }, // Wave 6: vitesse 4.0
  { alienSpeed: 4.5, bulletsPerShot: 5, maxBulletsOnScreen: 15, alienShootChance: 0.0015, powerUpChance: 0.3, sideMissiles: false },   // Wave 7: vitesse 4.5
  { alienSpeed: 5.0, bulletsPerShot: 4, maxBulletsOnScreen: 12, alienShootChance: 0.0015, powerUpChance: 0.3, sideMissiles: true },    // Wave 8: 4 missiles en éventail
  { alienSpeed: 5.0, bulletsPerShot: 5, maxBulletsOnScreen: 15, alienShootChance: 0.0015, powerUpChance: 0.3, sideMissiles: true },    // Wave 9+: 5 missiles en éventail
]

// Power-up types
enum PowerUpType {
  RAPID_FIRE = 'RAPID_FIRE',
  MULTI_SHOT = 'MULTI_SHOT',
  SHIELD = 'SHIELD',
  LASER = 'LASER',
  EXTRA_LIFE = 'EXTRA_LIFE'
}

// Power-up configuration
const POWER_UP_CONFIG = {
  [PowerUpType.RAPID_FIRE]: {
    duration: 10000,
    color: '#ff0',
    icon: '⚡',
    effect: 'Tir rapide pendant 10s'
  },
  [PowerUpType.MULTI_SHOT]: {
    duration: 8000,
    color: '#0ff',
    icon: '🔫',
    effect: 'Tir triple pendant 8s'
  },
  [PowerUpType.SHIELD]: {
    duration: 15000,
    color: '#0f0',
    icon: '🛡️',
    effect: 'Bouclier pendant 15s'
  },
  [PowerUpType.LASER]: {
    duration: 5000,
    color: '#f0f',
    icon: '🔴',
    effect: 'Laser perçant pendant 5s'
  },
  [PowerUpType.EXTRA_LIFE]: {
    duration: 0,
    color: '#fff',
    icon: '❤️',
    effect: 'Vie supplémentaire'
  }
}

// Types
interface GameObject {
  x: number
  y: number
  width: number
  height: number
}

interface Player extends GameObject {
  lives: number
}

interface Bullet extends GameObject {
  active: boolean
  velocityY: number
  velocityX?: number // Pour les missiles latéraux
  angle?: number     // Angle du missile
}

interface Alien extends GameObject {
  alive: boolean
  type: number // 0-2 for different alien types
  points: number
}

interface Particle {
  x: number
  y: number
  velocityX: number
  velocityY: number
  size: number
  color: string
  life: number // 0-1, decreases over time
}

interface PowerUp extends GameObject {
  type: PowerUpType
  active: boolean
}

interface ActivePowerUp {
  type: PowerUpType
  endTime: number
}

// Simple AABB collision detection
function checkCollision(obj1: GameObject, obj2: GameObject): boolean {
  return (
    obj1.x < obj2.x + obj2.width &&
    obj1.x + obj1.width > obj2.x &&
    obj1.y < obj2.y + obj2.height &&
    obj1.y + obj1.height > obj2.y
  )
}

export default function SpaceInvadersGame() {
  const navigate = useNavigate()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)
  const keysRef = useRef<Set<string>>(new Set())
  
  // Game state
  const [gameOver, setGameOver] = useState(false)
  const [score, setScore] = useState(0)
  const [wave, setWave] = useState(1)
  const [isPaused, setIsPaused] = useState(false)
  const [availableCards, setAvailableCards] = useState<Card[]>([])
  const [showUpToDate, setShowUpToDate] = useState(false)
  const [isForFun, setIsForFun] = useState(false)
  const [bossCard, setBossCard] = useState<Card | null>(null)
  
  // Game objects refs
  const playerRef = useRef<Player>({
    x: GAME_WIDTH / 2 - PLAYER_WIDTH / 2,
    y: GAME_HEIGHT - PLAYER_HEIGHT - 20,
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
    lives: INITIAL_LIVES
  })
  
  const playerBulletsRef = useRef<Bullet[]>([]) // Support multiple player bullets
  
  const alienBulletsRef = useRef<Bullet[]>([])
  const aliensRef = useRef<Alien[]>([])
  const alienDirectionRef = useRef(1)
  const alienSpeedRef = useRef(0.5)
  const alienDropRef = useRef(false)
  const particlesRef = useRef<Particle[]>([])
  const playerDeathRef = useRef(false) // Track if player is currently exploding
  const spaceWasPressedRef = useRef(false) // Track space key state for single shots
  // Supprimé waveRef - on utilise directement wave state
  const lastShootTimeRef = useRef(0) // Track last shoot time for rate limiting
  const waveTransitionRef = useRef(false) // Prevent multiple wave transitions
  const powerUpsRef = useRef<PowerUp[]>([]) // Active power-ups on screen
  const activePowerUpsRef = useRef<ActivePowerUp[]>([]) // Currently active power-up effects
  const shieldActiveRef = useRef(false) // Shield status for quick access
  
  // Flashcard state
  const alienKillCountRef = useRef(0)
  const nextFlashcardThresholdRef = useRef(Math.floor(Math.random() * 5) + 8)
  const cardsRef = useRef<Card[]>([])
  
  // Store hooks
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
  
  const { notifications, removeNotification } = useProgressionNotifications()
  
  // Initialize aliens
  const initializeAliens = (waveNumber: number = 1) => {
    const aliens: Alien[] = []
    for (let row = 0; row < ALIEN_ROWS; row++) {
      for (let col = 0; col < ALIEN_COLS; col++) {
        aliens.push({
          x: ALIEN_START_X + col * ALIEN_SPACING_X,
          y: ALIEN_START_Y + row * ALIEN_SPACING_Y,
          width: ALIEN_WIDTH,
          height: ALIEN_HEIGHT,
          alive: true,
          type: row < 2 ? 2 : row < 4 ? 1 : 0, // Different types for different rows
          points: row < 2 ? 30 : row < 4 ? 20 : 10
        })
      }
    }
    aliensRef.current = aliens
    alienDirectionRef.current = 1
    
    // Use level configuration
    const levelIndex = Math.min(waveNumber - 1, LEVEL_CONFIG.length - 1)
    const config = LEVEL_CONFIG[levelIndex]
    alienSpeedRef.current = config.alienSpeed
    
    DEBUG_LOGS && logger.debug('ALIEN SPEED INIT', { alienSpeed: alienSpeedRef.current, wave: waveNumber, config })
  }
  
  // Load cards from selected deck
  const loadCards = async (forFun: boolean = false) => {
    const cards = await useReviewStore.getState().getCardsForGame(forFun)
    
    if (cards.length === 0 && !forFun) {
      setShowUpToDate(true)
    } else {
      setAvailableCards(cards)
      cardsRef.current = cards
      DEBUG_LOGS && logger.debug('Cards loaded for review', { cardsCount: cards.length, forFun })
    }
  }
  
  // Initialize game
  useEffect(() => {
    checkAndResetDaily()
    updateStreak()
    updateMemoryLevel()
    startGame('space-invaders')
    loadCards(isForFun)
    initializeAliens(1)
    
    return () => {
      DEBUG_LOGS && logger.debug('🔴 SpaceInvaders component unmounting', { score })
      updateBestScore(score)
      endGame()
    }
  }, [isForFun])
  
  // Update refs when state changes
  useEffect(() => {
    cardsRef.current = availableCards
  }, [availableCards])
  
  // Plus besoin de synchroniser waveRef - supprimé
  
  // Create power-up
  const createPowerUp = (x: number, y: number) => {
    const levelIndex = Math.min(wave - 1, LEVEL_CONFIG.length - 1)
    const config = LEVEL_CONFIG[levelIndex]
    
    if (Math.random() < config.powerUpChance && powerUpsRef.current.length < MAX_POWER_UPS) {
      // Randomly select a power-up type
      const types = Object.values(PowerUpType)
      const type = types[Math.floor(Math.random() * types.length)]
      
      powerUpsRef.current.push({
        x: x + ALIEN_WIDTH / 2 - POWER_UP_WIDTH / 2,
        y,
        width: POWER_UP_WIDTH,
        height: POWER_UP_HEIGHT,
        type,
        active: true
      })
      
      DEBUG_LOGS && logger.debug('Power-up created', { type })
    }
  }
  
  // Activate power-up
  const activatePowerUp = (type: PowerUpType) => {
    const config = POWER_UP_CONFIG[type]
    
    if (type === PowerUpType.EXTRA_LIFE) {
      playerRef.current.lives++
      DEBUG_LOGS && logger.debug('Extra life!', { lives: playerRef.current.lives })
      return
    }
    
    // Remove existing power-up of same type
    activePowerUpsRef.current = activePowerUpsRef.current.filter(p => p.type !== type)
    
    // Add new power-up
    if (config.duration > 0) {
      activePowerUpsRef.current.push({
        type,
        endTime: Date.now() + config.duration
      })
      
      if (type === PowerUpType.SHIELD) {
        shieldActiveRef.current = true
      }
    }
    
    DEBUG_LOGS && logger.debug('Power-up activated', { type, duration: config.duration })
  }
  
  // Create explosion effect
  const createExplosion = (x: number, y: number, width: number, height: number) => {
    const particles: Particle[] = []
    const particleCount = 20 // Number of explosion fragments
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.5
      const speed = 2 + Math.random() * 4
      
      particles.push({
        x: x + width / 2,
        y: y + height / 2,
        velocityX: Math.cos(angle) * speed,
        velocityY: Math.sin(angle) * speed,
        size: 2 + Math.random() * 4,
        color: `hsl(${120 + Math.random() * 60}, 100%, 50%)`, // Green to yellow
        life: 1
      })
    }
    
    // Limiter le nombre de particules
    particlesRef.current = [...particlesRef.current, ...particles].slice(-MAX_PARTICLES)
    playerDeathRef.current = true
    
    // Hide player temporarily
    setTimeout(() => {
      playerDeathRef.current = false
      // Respawn player at center
      playerRef.current.x = GAME_WIDTH / 2 - PLAYER_WIDTH / 2
    }, 1000)
  }
  
  // Keyboard controls
  useEffect(() => {
    if (isNative) return
    
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key)
      
      if (e.key === ' ') {
        e.preventDefault()
      }
    }
    
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key)
    }
    
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])
  
  // Handle input
  const handleInput = () => {
    if (gameOver || isPaused || flashcardVisible || playerDeathRef.current) return
    
    const player = playerRef.current
    
    // Move player (only if not exploding)
    if (keysRef.current.has('ArrowLeft') && player.x > 0) {
      player.x -= PLAYER_SPEED
    }
    if (keysRef.current.has('ArrowRight') && player.x < GAME_WIDTH - PLAYER_WIDTH) {
      player.x += PLAYER_SPEED
    }
    
    // Shoot (only on space key press, not hold)
    const spacePressed = keysRef.current.has(' ')
    // Utiliser wave state au lieu de waveRef.current pour éviter les problèmes de synchronisation
    // CORRECTION TEMPORAIRE: Si wave est aberrante, on la force à une valeur raisonnable
    const correctedWave = wave > 10 ? 2 : wave
    const levelIndex = Math.min(correctedWave - 1, LEVEL_CONFIG.length - 1)
    const config = LEVEL_CONFIG[levelIndex]
    
    // Debug wave and config
    if (spacePressed && !spaceWasPressedRef.current && DEBUG_LOGS) {
      logger.debug('🎮 wave state', { wave, correctedWave, levelIndex })
      logger.debug('⚙️ Config used', { config })
      
      // FORCER temporairement la valeur si wave est aberrante
      if (wave > 10) {
        logger.warn(`❌ WAVE ABERRANTE DÉTECTÉE: ${wave} - FORÇAGE À 2`)
        const forcedLevelIndex = 1 // Level 2
        const forcedConfig = LEVEL_CONFIG[forcedLevelIndex]
        logger.debug('🔧 Config forcée', { forcedConfig })
      }
    }
    const now = Date.now()
    
    // Check for rapid fire power-up
    const hasRapidFire = activePowerUpsRef.current.some(p => p.type === PowerUpType.RAPID_FIRE)
    const shootDelay = hasRapidFire ? 100 : 200
    const canShoot = now - lastShootTimeRef.current > shootDelay
    
    // Only shoot on key press, not hold
    // Condition plus restrictive : s'assurer qu'on peut tirer le nombre de balles requis et respecter les limites
    const currentBullets = playerBulletsRef.current.length
    const canShootAll = currentBullets + config.bulletsPerShot <= Math.min(config.maxBulletsOnScreen, MAX_PLAYER_BULLETS)
    
    if (spacePressed && !spaceWasPressedRef.current && canShootAll && canShoot) {
      if (DEBUG_LOGS) {
        logger.debug(`🎯 Wave ${wave}: Shooting bullets simultaneously`, { bulletsPerShot: config.bulletsPerShot })
        logger.debug('🔍 Before shooting', { bulletsOnScreen: playerBulletsRef.current.length, maxBullets: config.maxBulletsOnScreen })
        logger.debug('📋 Level index and config', { levelIndex, config })
      }
      
      // Check for multi-shot power-up (overrides level bullets)
      const hasMultiShot = activePowerUpsRef.current.some(p => p.type === PowerUpType.MULTI_SHOT)
      const hasLaser = activePowerUpsRef.current.some(p => p.type === PowerUpType.LASER)
      
      if (hasMultiShot) {
        // Triple shot spread
        const offsets = [-15, 0, 15]
        offsets.forEach(offset => {
          if (playerBulletsRef.current.length < MAX_PLAYER_BULLETS) {
            playerBulletsRef.current.push({
              x: player.x + PLAYER_WIDTH / 2 - BULLET_WIDTH / 2 + offset,
              y: player.y,
              width: hasLaser ? BULLET_WIDTH * 2 : BULLET_WIDTH,
              height: hasLaser ? BULLET_HEIGHT * 2 : BULLET_HEIGHT,
              active: true,
              velocityY: -BULLET_SPEED
            })
          }
        })
      } else {
        // Level-based shooting (parallel or side missiles)
        const bulletsToFire = config.bulletsPerShot
        DEBUG_LOGS && logger.debug('🔫 Firing bullets', { bulletsToFire, sideMissiles: config.sideMissiles, note: 'not multi-shot power-up' })
        
        if (config.sideMissiles) {
          // Missiles latéraux à partir du niveau 8
          DEBUG_LOGS && logger.debug('🚀 Side missiles activated!')
          
          // Tir central
          playerBulletsRef.current.push({
            x: player.x + PLAYER_WIDTH / 2 - BULLET_WIDTH / 2,
            y: player.y,
            width: hasLaser ? BULLET_WIDTH * 2 : BULLET_WIDTH,
            height: hasLaser ? BULLET_HEIGHT * 2 : BULLET_HEIGHT,
            active: true,
            velocityY: -BULLET_SPEED,
            velocityX: 0
          })
          
          // Missiles latéraux (angles de 15° vers la gauche et la droite)
          const sideAngles = [-15, 15, -30, 30] // Degrés
          for (let i = 0; i < Math.min(bulletsToFire - 1, sideAngles.length); i++) {
            const angleRad = (sideAngles[i] * Math.PI) / 180
            const velocityX = Math.sin(angleRad) * BULLET_SPEED
            const velocityY = -Math.cos(angleRad) * BULLET_SPEED
            
            playerBulletsRef.current.push({
              x: player.x + PLAYER_WIDTH / 2 - BULLET_WIDTH / 2,
              y: player.y,
              width: hasLaser ? BULLET_WIDTH * 2 : BULLET_WIDTH,
              height: hasLaser ? BULLET_HEIGHT * 2 : BULLET_HEIGHT,
              active: true,
              velocityY: velocityY,
              velocityX: velocityX,
              angle: angleRad
            })
          }
        } else if (bulletsToFire === 1) {
          logger.debug('➡️ Single bullet path')
          // Single bullet centered
          playerBulletsRef.current.push({
            x: player.x + PLAYER_WIDTH / 2 - BULLET_WIDTH / 2,
            y: player.y,
            width: hasLaser ? BULLET_WIDTH * 2 : BULLET_WIDTH,
            height: hasLaser ? BULLET_HEIGHT * 2 : BULLET_HEIGHT,
            active: true,
            velocityY: -BULLET_SPEED
          })
        } else {
          logger.debug('➡️ Multiple bullets path', { bulletsToFire })
          // Multiple parallel bullets
          const spacing = 8 // Espacement entre les balles
          const totalWidth = (bulletsToFire - 1) * spacing
          const startX = player.x + PLAYER_WIDTH / 2 - totalWidth / 2
          logger.debug('📐 Bullet spacing calculation', { spacing, totalWidth, startX })
          
          for (let i = 0; i < bulletsToFire; i++) {
            const bulletX = startX + i * spacing - BULLET_WIDTH / 2
            logger.debug(`🎯 Bullet ${i+1}`, { x: bulletX })
            playerBulletsRef.current.push({
              x: bulletX,
              y: player.y,
              width: hasLaser ? BULLET_WIDTH * 2 : BULLET_WIDTH,
              height: hasLaser ? BULLET_HEIGHT * 2 : BULLET_HEIGHT,
              active: true,
              velocityY: -BULLET_SPEED
            })
          }
        }
      }
      
      lastShootTimeRef.current = now
      DEBUG_LOGS && logger.debug('🔍 After shooting', { bulletsOnScreen: playerBulletsRef.current.length })
    }
    spaceWasPressedRef.current = spacePressed
  }
  
  // Update game logic
  const updateGame = () => {
    if (gameOver || isPaused || flashcardVisible) return
    
    // Protection contre les états invalides
    if (!aliensRef.current || !playerRef.current || !playerBulletsRef.current) {
      logger.warn('⚠️ Game objects not initialized')
      return
    }
    
    // Update active power-ups duration
    const now = Date.now()
    activePowerUpsRef.current = activePowerUpsRef.current.filter(powerUp => {
      if (powerUp.endTime < now) {
        if (powerUp.type === PowerUpType.SHIELD) {
          shieldActiveRef.current = false
        }
        logger.debug('Power-up expired', { type: powerUp.type })
        return false
      }
      return true
    })
    
    // Update power-ups
    powerUpsRef.current = powerUpsRef.current.filter(powerUp => {
      powerUp.y += POWER_UP_SPEED
      
      // Check collision with player
      if (powerUp.active && checkCollision(powerUp, playerRef.current)) {
        activatePowerUp(powerUp.type)
        soundManager.playSuccess()
        return false
      }
      
      // Remove if off screen
      return powerUp.active && powerUp.y < GAME_HEIGHT
    })
    
    // Update player bullets
    playerBulletsRef.current = playerBulletsRef.current.filter(bullet => {
      // Mise à jour position avec missiles latéraux
      bullet.y += bullet.velocityY
      if (bullet.velocityX !== undefined) {
        bullet.x += bullet.velocityX
      }
      
      // Garder les balles qui sont dans les limites
      return bullet.active && 
             bullet.y > -BULLET_HEIGHT && 
             bullet.x > -BULLET_WIDTH && 
             bullet.x < GAME_WIDTH + BULLET_WIDTH
    })
    
    // Update aliens
    let needsDrop = false
    const aliens = aliensRef.current
    const aliveAliens = aliens.filter(a => a.alive)
    
    // Move aliens (only if there are aliens left)
    for (const alien of aliveAliens) {
      if (!alienDropRef.current) {
        alien.x += alienDirectionRef.current * alienSpeedRef.current
        
        if (alien.x <= 0 || alien.x >= GAME_WIDTH - ALIEN_WIDTH) {
          needsDrop = true
        }
      }
    }
    
    // Handle alien drop
    if (alienDropRef.current) {
      for (const alien of aliveAliens) {
        alien.y += 20
      }
      alienDirectionRef.current *= -1
      alienDropRef.current = false
    } else if (needsDrop) {
      alienDropRef.current = true
    }
    
    // Check if aliens reached player
    for (const alien of aliveAliens) {
      if (alien.y + ALIEN_HEIGHT >= playerRef.current.y) {
        logger.info('💀 Game Over - Aliens reached player')
        setGameOver(true)
        return
      }
    }
    
    // Alien shooting
    const levelIndex = Math.min(wave - 1, LEVEL_CONFIG.length - 1)
    const alienShootChance = LEVEL_CONFIG[levelIndex].alienShootChance
    
    for (const alien of aliveAliens) {
      if (Math.random() < alienShootChance && alienBulletsRef.current.length < MAX_ALIEN_BULLETS) {
        alienBulletsRef.current.push({
          x: alien.x + ALIEN_WIDTH / 2 - BULLET_WIDTH / 2,
          y: alien.y + ALIEN_HEIGHT,
          width: BULLET_WIDTH,
          height: BULLET_HEIGHT,
          active: true,
          velocityY: ALIEN_BULLET_SPEED
        })
      }
    }
    
    // Update alien bullets
    alienBulletsRef.current = alienBulletsRef.current.filter(bullet => {
      bullet.y += bullet.velocityY
      return bullet.active && bullet.y < GAME_HEIGHT
    })
    
    // Check collisions - player bullets vs aliens (optimisé)
    const hasLaser = activePowerUpsRef.current.some(p => p.type === PowerUpType.LASER)
    const activeBullets = playerBulletsRef.current
    const activeAliens = aliensRef.current.filter(a => a.alive) // Pré-filtrer les aliens vivants
    
    for (let bulletIndex = activeBullets.length - 1; bulletIndex >= 0; bulletIndex--) {
      const bullet = activeBullets[bulletIndex]
      let bulletHit = false
      
      for (const alien of activeAliens) {
        if (checkCollision(bullet, alien)) {
          alien.alive = false
          
          if (!hasLaser) {
            activeBullets.splice(bulletIndex, 1)
            bulletHit = true
          }
          
          setScore(prev => prev + alien.points)
          updateGameScore(alien.points)
          
          createPowerUp(alien.x, alien.y)
          
          alienKillCountRef.current++
          if (alienKillCountRef.current >= nextFlashcardThresholdRef.current && cardsRef.current.length > 0) {
            triggerFlashcard()
          }
          
          if (bulletHit) break
        }
      }
    }
    
    // Check if all aliens are dead - advance to next wave
    if (aliveAliens.length === 0 && !waveTransitionRef.current) {
      logger.info(`🏆 Wave ${wave} completed! Advancing to wave ${wave + 1}`)
      logger.debug('📊 Final stats', { playerBullets: playerBulletsRef.current.length, alienBullets: alienBulletsRef.current.length, powerUps: powerUpsRef.current.length })
      
      // Protection contre les changements de niveau multiples
      if (gameOver || isPaused) {
        logger.debug('⚠️ Game over or paused, skipping wave change')
        return
      }
      
      waveTransitionRef.current = true // Bloquer d'autres transitions
      
      const nextWave = wave + 1
      setWave(nextWave)
      playerBulletsRef.current = []
      alienBulletsRef.current = []
      powerUpsRef.current = [] // Clear power-ups between waves
      
      setTimeout(() => {
        try {
          logger.debug(`🔄 Initializing wave ${nextWave}...`)
          initializeAliens(nextWave)
          const levelIndex = Math.min(nextWave - 1, LEVEL_CONFIG.length - 1)
          const config = LEVEL_CONFIG[levelIndex]
          logger.info(`🌊 Wave ${nextWave} started!`)
          logger.debug('📊 Config', { config })
          logger.debug('🚀 Bullets per shot', { bulletsPerShot: config.bulletsPerShot })
          logger.debug('📺 Max bullets on screen', { maxBulletsOnScreen: config.maxBulletsOnScreen })
          waveTransitionRef.current = false // Débloquer les transitions
        } catch (error) {
          logger.error(`❌ Error initializing wave ${nextWave}`, { error })
          waveTransitionRef.current = false // Débloquer même en cas d'erreur
        }
      }, 2000)
    }
    
    // Check collisions - alien bullets vs player
    if (!playerDeathRef.current) { // Only check if not already exploding
      for (const bullet of alienBulletsRef.current) {
        if (checkCollision(bullet, playerRef.current)) {
          bullet.active = false
          
          // Check for shield
          if (shieldActiveRef.current) {
            logger.debug('Shield absorbed hit!')
            // Remove shield on hit
            activePowerUpsRef.current = activePowerUpsRef.current.filter(p => p.type !== PowerUpType.SHIELD)
            shieldActiveRef.current = false
          } else {
            playerRef.current.lives--
            // soundManager.playError() // Temporarily disabled
            
            // Create explosion effect
            createExplosion(
              playerRef.current.x,
              playerRef.current.y,
              playerRef.current.width,
              playerRef.current.height
            )
            
            if (playerRef.current.lives <= 0) {
              logger.info('💀 Game Over - No more lives')
              setGameOver(true)
            }
          }
          break // Only one hit per frame
        }
      }
    }
  }
  
  // Trigger flashcard
  const triggerFlashcard = async () => {
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
        cardToShow = cardsRef.current[Math.floor(Math.random() * cardsRef.current.length)]
      }
    } else {
      cardToShow = cardsRef.current[Math.floor(Math.random() * cardsRef.current.length)]
    }
    
    logger.debug('Showing flashcard', { cardToShow, isBoss })
    useReviewStore.setState({ currentCard: cardToShow })
    showFlashcard(cardToShow)
    
    alienKillCountRef.current = 0
    nextFlashcardThresholdRef.current = Math.floor(Math.random() * 5) + 8
  }
  
  // Handle flashcard answer
  const handleFlashcardAnswer = async (correct: boolean) => {
    if (correct) {
      // Bonus: Clear some alien bullets
      alienBulletsRef.current = alienBulletsRef.current.slice(0, Math.floor(alienBulletsRef.current.length / 2))
      incrementConsecutiveCorrect()
      addNewCardToday()
      soundManager.playSuccess()
    } else {
      // Penalty: Add extra alien bullets
      const aliveAliens = aliensRef.current.filter(a => a.alive)
      if (aliveAliens.length > 0) {
        for (let i = 0; i < 3; i++) {
          const alien = aliveAliens[Math.floor(Math.random() * aliveAliens.length)]
          alienBulletsRef.current.push({
            x: alien.x + ALIEN_WIDTH / 2 - BULLET_WIDTH / 2,
            y: alien.y + ALIEN_HEIGHT,
            width: BULLET_WIDTH,
            height: BULLET_HEIGHT,
            active: true,
            velocityY: ALIEN_BULLET_SPEED
          })
        }
      }
      resetConsecutiveCorrect()
      soundManager.playError()
    }
    
    if (bossCardSession.isActive) {
      clearBossCard()
      setBossCard(null)
    }
    
    hideFlashcard()
    await updateMemoryLevel()
    await loadCards(isForFun)
    await useDeckStore.getState().refreshDeckCounts()
  }
  
  // Draw game
  const drawGame = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // Protection contre les états invalides
    if (!aliensRef.current || !playerRef.current || !playerBulletsRef.current) {
      logger.warn('⚠️ Cannot draw: game objects not initialized')
      return
    }
    
    // Clear canvas
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)
    
    // Draw player (only if not exploding)
    if (!playerDeathRef.current) {
      // Draw shield effect if active
      if (shieldActiveRef.current) {
        ctx.save()
        ctx.strokeStyle = '#0f0'
        ctx.lineWidth = 3
        ctx.shadowColor = '#0f0'
        ctx.shadowBlur = 10
        ctx.beginPath()
        ctx.arc(
          playerRef.current.x + PLAYER_WIDTH / 2,
          playerRef.current.y + PLAYER_HEIGHT / 2,
          Math.max(PLAYER_WIDTH, PLAYER_HEIGHT) * 0.8,
          0,
          Math.PI * 2
        )
        ctx.stroke()
        ctx.restore()
      }
      
      drawPlayer(ctx, playerRef.current.x, playerRef.current.y)
    }
    
    // Draw and update particles
    particlesRef.current = particlesRef.current.filter(particle => {
      // Update particle position
      particle.x += particle.velocityX
      particle.y += particle.velocityY
      particle.velocityY += 0.2 // Gravity
      particle.life -= 0.02 // Fade out
      
      // Draw particle
      if (particle.life > 0) {
        ctx.globalAlpha = particle.life
        ctx.fillStyle = particle.color
        ctx.fillRect(
          particle.x - particle.size / 2,
          particle.y - particle.size / 2,
          particle.size,
          particle.size
        )
        ctx.globalAlpha = 1
        return true // Keep particle
      }
      return false // Remove dead particle
    })
    
    // Draw player bullets
    ctx.fillStyle = '#fff'
    for (const bullet of playerBulletsRef.current) {
      ctx.fillRect(bullet.x, bullet.y, BULLET_WIDTH, BULLET_HEIGHT)
    }
    
    // Draw aliens
    for (const alien of aliensRef.current) {
      if (alien.alive) {
        drawAlien(ctx, alien.x, alien.y, alien.type)
      }
    }
    
    // Draw alien bullets
    ctx.fillStyle = '#f0f'
    for (const bullet of alienBulletsRef.current) {
      ctx.fillRect(bullet.x, bullet.y, BULLET_WIDTH, BULLET_HEIGHT)
    }
    
    // Draw power-ups
    for (const powerUp of powerUpsRef.current) {
      drawPowerUp(ctx, powerUp)
    }
    
    // Draw UI
    ctx.fillStyle = '#fff'
    ctx.font = '20px Arial'
    ctx.textAlign = 'left'
    ctx.fillText(`Score: ${score}`, 10, 30)
    ctx.fillText(`Wave: ${wave}`, 10, 60)
    
    // Show bullets info
    const levelIndex = Math.min(wave - 1, LEVEL_CONFIG.length - 1)
    const config = LEVEL_CONFIG[levelIndex]
    ctx.font = '16px Arial'
    ctx.fillText(`Tir: ${config.bulletsPerShot} balle(s)${config.sideMissiles ? ' 🚀' : ''}`, 10, 120)
    ctx.fillText(`Écran: ${playerBulletsRef.current.length}/${config.maxBulletsOnScreen}`, 10, 140)
    ctx.fillText(`Vitesse aliens: ${config.alienSpeed}`, 10, 160)
    
    // Draw lives as mini ships instead of text
    for (let i = 0; i < playerRef.current.lives; i++) {
      drawMiniPlayer(ctx, 10 + (i * 30), 85) // Space them 30px apart
    }
    
    // Draw cards info
    ctx.textAlign = 'right'
    ctx.fillText(`Cartes: ${availableCards.length}`, GAME_WIDTH - 10, 30)
    
    // Draw active power-ups
    let powerUpY = 60
    for (const activePowerUp of activePowerUpsRef.current) {
      const config = POWER_UP_CONFIG[activePowerUp.type]
      const timeLeft = Math.ceil((activePowerUp.endTime - Date.now()) / 1000)
      
      ctx.fillStyle = config.color
      ctx.font = '16px Arial'
      ctx.textAlign = 'right'
      ctx.fillText(`${config.icon} ${timeLeft}s`, GAME_WIDTH - 10, powerUpY)
      powerUpY += 25
    }
  }
  
  // Draw player spaceship
  const drawPlayer = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    ctx.fillStyle = '#0f0'
    
    // Classic Space Invaders player ship shape
    const px = Math.floor(x)
    const py = Math.floor(y)
    
    // Body of the ship (triangle-like)
    ctx.fillRect(px + 18, py + 0, 4, 8)   // Top center spike
    ctx.fillRect(px + 14, py + 8, 12, 4)  // Upper body
    ctx.fillRect(px + 10, py + 12, 20, 4) // Wide middle
    ctx.fillRect(px + 6, py + 16, 28, 4)  // Bottom wide part
    ctx.fillRect(px + 2, py + 20, 36, 6)  // Base
    ctx.fillRect(px + 0, py + 26, 40, 4)  // Very bottom
    
    // Gun barrels
    ctx.fillRect(px + 6, py + 12, 2, 8)   // Left gun
    ctx.fillRect(px + 32, py + 12, 2, 8)  // Right gun
  }
  
  // Draw mini player ship for lives display (scaled down)
  const drawMiniPlayer = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    ctx.fillStyle = '#0f0'
    
    // Smaller version of the player ship (scale ~0.5)
    const px = Math.floor(x)
    const py = Math.floor(y)
    
    // Body of the ship (scaled down)
    ctx.fillRect(px + 9, py + 0, 2, 4)   // Top center spike
    ctx.fillRect(px + 7, py + 4, 6, 2)   // Upper body
    ctx.fillRect(px + 5, py + 6, 10, 2)  // Wide middle
    ctx.fillRect(px + 3, py + 8, 14, 2)  // Bottom wide part
    ctx.fillRect(px + 1, py + 10, 18, 3) // Base
    ctx.fillRect(px + 0, py + 13, 20, 2) // Very bottom
    
    // Gun barrels (scaled)
    ctx.fillRect(px + 3, py + 6, 1, 4)   // Left gun
    ctx.fillRect(px + 16, py + 6, 1, 4)  // Right gun
  }
  
  // Draw power-up
  const drawPowerUp = (ctx: CanvasRenderingContext2D, powerUp: PowerUp) => {
    const config = POWER_UP_CONFIG[powerUp.type]
    
    // Draw glowing effect
    ctx.save()
    ctx.shadowColor = config.color
    ctx.shadowBlur = 10
    
    // Draw circle background
    ctx.fillStyle = config.color
    ctx.beginPath()
    ctx.arc(
      powerUp.x + POWER_UP_WIDTH / 2,
      powerUp.y + POWER_UP_HEIGHT / 2,
      POWER_UP_WIDTH / 2,
      0,
      Math.PI * 2
    )
    ctx.fill()
    
    // Draw icon
    ctx.fillStyle = '#000'
    ctx.font = '20px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(
      config.icon,
      powerUp.x + POWER_UP_WIDTH / 2,
      powerUp.y + POWER_UP_HEIGHT / 2
    )
    
    ctx.restore()
  }
  
  // Draw alien invader
  const drawAlien = (ctx: CanvasRenderingContext2D, x: number, y: number, type: number) => {
    // Different colors and shapes for different alien types
    const colors = ['#0ff', '#ff0', '#f00'] // Cyan, Yellow, Red
    ctx.fillStyle = colors[type] || '#0ff'
    
    const px = Math.floor(x)
    const py = Math.floor(y)
    
    if (type === 2) {
      // Top tier alien (octopus-like)
      ctx.fillRect(px + 8, py + 0, 14, 4)   // Top
      ctx.fillRect(px + 4, py + 4, 22, 4)   // Upper body
      ctx.fillRect(px + 0, py + 8, 30, 4)   // Wide middle
      ctx.fillRect(px + 6, py + 12, 18, 4)  // Lower body
      ctx.fillRect(px + 2, py + 16, 6, 4)   // Left leg
      ctx.fillRect(px + 12, py + 16, 6, 4)  // Center legs
      ctx.fillRect(px + 22, py + 16, 6, 4)  // Right leg
    } else if (type === 1) {
      // Middle tier alien (crab-like)
      ctx.fillRect(px + 0, py + 0, 4, 4)    // Left antenna
      ctx.fillRect(px + 26, py + 0, 4, 4)   // Right antenna
      ctx.fillRect(px + 6, py + 4, 18, 4)   // Head
      ctx.fillRect(px + 2, py + 8, 26, 4)   // Body
      ctx.fillRect(px + 4, py + 12, 22, 4)  // Lower body
      ctx.fillRect(px + 0, py + 16, 8, 4)   // Left claw
      ctx.fillRect(px + 22, py + 16, 8, 4)  // Right claw
    } else {
      // Bottom tier alien (squid-like)
      ctx.fillRect(px + 10, py + 0, 10, 4)  // Top
      ctx.fillRect(px + 4, py + 4, 22, 4)   // Upper
      ctx.fillRect(px + 0, py + 8, 30, 4)   // Wide body
      ctx.fillRect(px + 8, py + 12, 14, 4)  // Lower body
      ctx.fillRect(px + 4, py + 16, 6, 4)   // Left tentacle
      ctx.fillRect(px + 20, py + 16, 6, 4)  // Right tentacle
    }
  }
  
  // Game loop avec timing fixe
  let lastUpdateTime = 0
  const FIXED_TIME_STEP = 1000 / 60 // 60 updates par seconde
  
  const gameLoop = (currentTime: number) => {
    // Fixed timestep pour la logique
    if (currentTime - lastUpdateTime >= FIXED_TIME_STEP) {
      handleInput()
      updateGame()
      lastUpdateTime = currentTime
    }
    
    // Toujours dessiner à chaque frame
    drawGame()
    
    if (!gameOver) {
      animationRef.current = requestAnimationFrame(gameLoop)
    }
  }
  
  // Start game loop
  useEffect(() => {
    // Éviter les multiple game loops
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = 0
    }
    
    if (!gameOver && !isPaused && !flashcardVisible) {
      animationRef.current = requestAnimationFrame(gameLoop)
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = 0
      }
      // Nettoyer les refs
      keysRef.current.clear()
      particlesRef.current = []
      DEBUG_LOGS && logger.debug('🧹 Game loop and resources cleaned up')
    }
  }, [gameOver, isPaused, flashcardVisible])
  
  // Mobile controls
  const handleMobileMove = (direction: 'left' | 'right') => {
    if (gameOver || isPaused || flashcardVisible) return
    
    const player = playerRef.current
    if (direction === 'left' && player.x > 0) {
      player.x = Math.max(0, player.x - PLAYER_SPEED * 2)
    } else if (direction === 'right' && player.x < GAME_WIDTH - PLAYER_WIDTH) {
      player.x = Math.min(GAME_WIDTH - PLAYER_WIDTH, player.x + PLAYER_SPEED * 2)
    }
  }
  
  const handleMobileShoot = () => {
    const levelIndex = Math.min(wave - 1, LEVEL_CONFIG.length - 1)
    const config = LEVEL_CONFIG[levelIndex]
    const now = Date.now()
    
    // Check for rapid fire power-up
    const hasRapidFire = activePowerUpsRef.current.some(p => p.type === PowerUpType.RAPID_FIRE)
    const shootDelay = hasRapidFire ? 100 : 200
    const canShoot = now - lastShootTimeRef.current > shootDelay
    
    // S'assurer qu'on peut tirer le nombre de balles requis et respecter les limites
    const currentBullets = playerBulletsRef.current.length
    const canShootAll = currentBullets + config.bulletsPerShot <= Math.min(config.maxBulletsOnScreen, MAX_PLAYER_BULLETS)
    
    if (gameOver || isPaused || flashcardVisible || playerDeathRef.current || !canShootAll || !canShoot) return
    
    // Check for multi-shot power-up
    const hasMultiShot = activePowerUpsRef.current.some(p => p.type === PowerUpType.MULTI_SHOT)
    const hasLaser = activePowerUpsRef.current.some(p => p.type === PowerUpType.LASER)
    
    if (hasMultiShot) {
      // Triple shot spread
      const offsets = [-15, 0, 15]
      offsets.forEach(offset => {
        playerBulletsRef.current.push({
          x: playerRef.current.x + PLAYER_WIDTH / 2 - BULLET_WIDTH / 2 + offset,
          y: playerRef.current.y,
          width: hasLaser ? BULLET_WIDTH * 2 : BULLET_WIDTH,
          height: hasLaser ? BULLET_HEIGHT * 2 : BULLET_HEIGHT,
          active: true,
          velocityY: -BULLET_SPEED
        })
      })
    } else {
      // Level-based shooting (parallel or side missiles)
      const bulletsToFire = config.bulletsPerShot
      
      if (config.sideMissiles) {
        // Missiles latéraux
        // Tir central
        playerBulletsRef.current.push({
          x: playerRef.current.x + PLAYER_WIDTH / 2 - BULLET_WIDTH / 2,
          y: playerRef.current.y,
          width: hasLaser ? BULLET_WIDTH * 2 : BULLET_WIDTH,
          height: hasLaser ? BULLET_HEIGHT * 2 : BULLET_HEIGHT,
          active: true,
          velocityY: -BULLET_SPEED,
          velocityX: 0
        })
        
        // Missiles latéraux
        const sideAngles = [-15, 15, -30, 30]
        for (let i = 0; i < Math.min(bulletsToFire - 1, sideAngles.length); i++) {
          const angleRad = (sideAngles[i] * Math.PI) / 180
          const velocityX = Math.sin(angleRad) * BULLET_SPEED
          const velocityY = -Math.cos(angleRad) * BULLET_SPEED
          
          playerBulletsRef.current.push({
            x: playerRef.current.x + PLAYER_WIDTH / 2 - BULLET_WIDTH / 2,
            y: playerRef.current.y,
            width: hasLaser ? BULLET_WIDTH * 2 : BULLET_WIDTH,
            height: hasLaser ? BULLET_HEIGHT * 2 : BULLET_HEIGHT,
            active: true,
            velocityY: velocityY,
            velocityX: velocityX,
            angle: angleRad
          })
        }
      } else if (bulletsToFire === 1) {
        // Single bullet centered
        playerBulletsRef.current.push({
          x: playerRef.current.x + PLAYER_WIDTH / 2 - BULLET_WIDTH / 2,
          y: playerRef.current.y,
          width: hasLaser ? BULLET_WIDTH * 2 : BULLET_WIDTH,
          height: hasLaser ? BULLET_HEIGHT * 2 : BULLET_HEIGHT,
          active: true,
          velocityY: -BULLET_SPEED
        })
      } else {
        // Multiple parallel bullets
        const spacing = 8
        const totalWidth = (bulletsToFire - 1) * spacing
        const startX = playerRef.current.x + PLAYER_WIDTH / 2 - totalWidth / 2
        
        for (let i = 0; i < bulletsToFire; i++) {
          playerBulletsRef.current.push({
            x: startX + i * spacing - BULLET_WIDTH / 2,
            y: playerRef.current.y,
            width: hasLaser ? BULLET_WIDTH * 2 : BULLET_WIDTH,
            height: hasLaser ? BULLET_HEIGHT * 2 : BULLET_HEIGHT,
            active: true,
            velocityY: -BULLET_SPEED
          })
        }
      }
    }
    
    lastShootTimeRef.current = now
    // soundManager.playMove() // Temporarily disabled
  }
  
  const resetGame = () => {
    logger.debug('🔄 Reset game called')
    window.location.reload()
  }
  
  // Get deck info
  const deckInfo = reviewMode === 'all'
    ? 'Tous les decks'
    : selectedDeckId
      ? useDeckStore.getState().decks.find(d => d.id === selectedDeckId)?.name
      : 'Aucun deck'
  
  // Get current level info
  const currentLevel = MEMORY_LEVELS.find(l => l.id === userProgress.currentLevel) || MEMORY_LEVELS[0]
  const currentDailyReward = userProgress.dailyReward 
    ? DAILY_REWARDS.find(r => r.id === userProgress.dailyReward)
    : null
  
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <div className="mb-4 flex items-center gap-4 flex-wrap">
        <button
          onClick={() => navigate('/play')}
          className="text-white hover:underline"
        >
          ← Retour
        </button>
        <h1 className="text-2xl font-bold">🚀 Space Invaders - SIDE MISSILES v14</h1>
        <div className="bg-orange-600 text-white px-3 py-1 rounded text-sm font-bold">
          🔧 DEBUG v2 - Vitesse réduite + Délai tir forcé
        </div>
        <span className="text-white/60">
          Mode : {deckInfo} {isForFun && '(Pour le plaisir)'}
        </span>
        {availableCards.length === 0 && !showUpToDate && (
          <span className="text-yellow-400">
            ⚠️ Aucune carte disponible !
          </span>
        )}
        
        <div className="flex items-center gap-2 text-sm">
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
      </div>
      
      <div className="flex flex-col lg:flex-row gap-8 items-center">
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={GAME_WIDTH}
            height={GAME_HEIGHT}
            className="border-2 border-gray-700 rounded"
            style={{ maxWidth: '100%', height: 'auto' }}
          />
          
          {gameOver && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
              <div className="bg-red-800 p-8 rounded text-center">
                <h2 className="text-3xl font-bold mb-4">Game Over!</h2>
                <p className="text-xl mb-4">Score: {score}</p>
                <button
                  onClick={resetGame}
                  className="btn-primary"
                >
                  Rejouer
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Mobile controls */}
        {isNative && (
          <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 flex gap-4">
            <button
              onTouchStart={() => handleMobileMove('left')}
              className="bg-gray-700 hover:bg-gray-600 text-white p-4 rounded-full w-16 h-16 flex items-center justify-center text-2xl"
              disabled={gameOver || isPaused}
            >
              ←
            </button>
            <button
              onTouchStart={handleMobileShoot}
              className="bg-red-700 hover:bg-red-600 text-white p-4 rounded-full w-20 h-20 flex items-center justify-center text-2xl"
              disabled={gameOver || isPaused}
            >
              🚀
            </button>
            <button
              onTouchStart={() => handleMobileMove('right')}
              className="bg-gray-700 hover:bg-gray-600 text-white p-4 rounded-full w-16 h-16 flex items-center justify-center text-2xl"
              disabled={gameOver || isPaused}
            >
              →
            </button>
          </div>
        )}
        
        {/* Desktop controls info */}
        {!isNative && (
          <div className="bg-gray-800 p-4 rounded">
            <h3 className="font-bold mb-2">Contrôles</h3>
            <p>← → : Déplacer</p>
            <p>Espace : Tirer</p>
          </div>
        )}
      </div>
      
      {flashcardVisible && currentFlashcard && (
        <FlashcardModal
          card={currentFlashcard}
          onAnswer={handleFlashcardAnswer}
          isBossCard={bossCardSession.isActive && bossCardSession.cardId === currentFlashcard.id}
          onGamePauseChange={setIsPaused}
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