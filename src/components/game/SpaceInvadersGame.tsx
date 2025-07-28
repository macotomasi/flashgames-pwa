import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
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
import { ProtonEngine, ParticleEmitter } from '@/types/proton-engine'
// import Proton from 'proton-engine' // Temporairement désactivé pour debug

// Game constants
const GAME_WIDTH = 1200  // Élargi pour inclure l'interface
const GAME_HEIGHT = 800  // Plus haut pour une meilleure expérience
const PLAY_AREA_WIDTH = 800  // Zone de jeu effective
const UI_AREA_WIDTH = 400    // Zone pour l'interface à droite
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
const IS_PRODUCTION = true // Forcer le mode production pour désactiver les logs
const DEBUG_LOGS = false // Désactiver tous les logs de debug

// Level configuration
const LEVEL_CONFIG = [
  { alienSpeed: 1.0, bulletsPerShot: 1, maxBulletsOnScreen: 3, alienShootChance: 0.0005, powerUpChance: 0.1, sideMissiles: false, flameMissiles: false },   // Wave 1: 1 balle
  { alienSpeed: 1.5, bulletsPerShot: 2, maxBulletsOnScreen: 6, alienShootChance: 0.0007, powerUpChance: 0.15, sideMissiles: false, flameMissiles: false }, // Wave 2: 2 balles
  { alienSpeed: 2.0, bulletsPerShot: 3, maxBulletsOnScreen: 9, alienShootChance: 0.001, powerUpChance: 0.2, sideMissiles: false, flameMissiles: false },   // Wave 3: 3 balles
  { alienSpeed: 3.0, bulletsPerShot: 3, maxBulletsOnScreen: 9, alienShootChance: 0.001, powerUpChance: 0.2, sideMissiles: false, flameMissiles: false },   // Wave 4: vitesse 3.0
  { alienSpeed: 3.5, bulletsPerShot: 4, maxBulletsOnScreen: 12, alienShootChance: 0.0012, powerUpChance: 0.25, sideMissiles: false, flameMissiles: false }, // Wave 5: vitesse 3.5
  { alienSpeed: 4.0, bulletsPerShot: 4, maxBulletsOnScreen: 12, alienShootChance: 0.0012, powerUpChance: 0.25, sideMissiles: false, flameMissiles: false }, // Wave 6: vitesse 4.0
  { alienSpeed: 4.5, bulletsPerShot: 5, maxBulletsOnScreen: 15, alienShootChance: 0.0015, powerUpChance: 0.3, sideMissiles: false, flameMissiles: false },   // Wave 7: vitesse 4.5
  { alienSpeed: 5.0, bulletsPerShot: 4, maxBulletsOnScreen: 12, alienShootChance: 0.0015, powerUpChance: 0.3, sideMissiles: true, flameMissiles: false },    // Wave 8: 4 missiles en éventail
  { alienSpeed: 5.0, bulletsPerShot: 5, maxBulletsOnScreen: 15, alienShootChance: 0.0015, powerUpChance: 0.3, sideMissiles: true, flameMissiles: false },    // Wave 9: 5 missiles en éventail
  { alienSpeed: 5.0, bulletsPerShot: 4, maxBulletsOnScreen: 12, alienShootChance: 0.0015, powerUpChance: 0.35, sideMissiles: true, flameMissiles: false },    // Wave 10+: missiles latéraux (flammes désactivées)
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
  isFlameType?: boolean // Pour les missiles avec flammes
  emitter?: ParticleEmitter | null      // Emetteur de particules Proton
  timeAlive?: number // Temps de vie pour trajectoire courbe
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
  const gameLoopStartedRef = useRef(false)
  const frameCountRef = useRef(0)
  const lastFrameTimeRef = useRef(0)
  const activeTimersRef = useRef<Set<NodeJS.Timeout>>(new Set())
  
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
    x: PLAY_AREA_WIDTH / 2 - PLAYER_WIDTH / 2,
    y: GAME_HEIGHT - PLAYER_HEIGHT - 20,
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
    lives: INITIAL_LIVES
  })
  
  // DEBUG_LOGS && logger.debug('🎮 Player initialized with lives:', INITIAL_LIVES)
  
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
  
  // Proton particle system refs
  const protonRef = useRef<ProtonEngine | null>(null) // Instance Proton
  
  // Flashcard state
  const alienKillCountRef = useRef(0)
  const nextFlashcardThresholdRef = useRef(0)
  const cardsRef = useRef<Card[]>([])
  
  // Score ref to avoid re-renders
  const scoreRef = useRef(0)
  
  // Calculer le seuil de flashcard selon le niveau
  const getFlashcardThreshold = (currentWave: number) => {
    if (currentWave >= 8) {
      return 25 // À partir du niveau 8: tous les 25 aliens
    } else if (currentWave >= 6) {
      return 20 // À partir du niveau 6: tous les 20 aliens
    } else if (currentWave >= 4) {
      return 15 // À partir du niveau 4: tous les 15 aliens
    } else {
      return Math.floor(Math.random() * 5) + 8 // Niveaux 1-3: 8-12 aliens (aléatoire)
    }
  }
  
  // Store hooks - Optimisés pour éviter les re-renders
  const flashcardVisible = useGameStore(state => state.flashcardVisible)
  const currentFlashcard = useGameStore(state => state.currentFlashcard)
  const showFlashcard = useGameStore(state => state.showFlashcard)
  const hideFlashcard = useGameStore(state => state.hideFlashcard)
  const updateGameScore = useGameStore(state => state.updateScore)
  const startGame = useGameStore(state => state.startGame)
  const endGame = useGameStore(state => state.endGame)
  
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
    
    DEBUG_LOGS && logger.debug('ALIEN SPEED INIT:', alienSpeedRef.current, 'WAVE:', waveNumber, 'CONFIG:', config)
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
  
  // Initialize Proton particle system (temporairement désactivé)
  const initializeProton = () => {
    DEBUG_LOGS && logger.debug('🔥 Proton particle system temporarily disabled')
    // if (canvasRef.current && !protonRef.current) {
    //   protonRef.current = new Proton()
    //   const canvas = canvasRef.current
    //   const context = canvas.getContext('2d')
      
    //   if (context) {
    //     const renderer = new Proton.CanvasRenderer(canvas)
    //     protonRef.current.addRenderer(renderer)
    //     DEBUG_LOGS && logger.debug('🔥 Proton particle system initialized')
    //   }
    // }
  }

  // Create flame trail emitter for missiles (temporairement désactivé)
  const createFlameEmitter = (x: number, y: number) => {
    return null // Temporairement désactivé
    // if (!protonRef.current) return null
    
    // const emitter = new Proton.Emitter()
    // emitter.rate = new Proton.Rate(new Proton.Span(8, 12), new Proton.Span(0.01, 0.02))
    
    // // Position at missile location
    // emitter.addInitialize(new Proton.Position(new Proton.PointZone(x, y)))
    // emitter.addInitialize(new Proton.Mass(1))
    // emitter.addInitialize(new Proton.Radius(1, 3))
    // emitter.addInitialize(new Proton.Life(0.3, 0.6))
    // emitter.addInitialize(new Proton.Velocity(new Proton.Span(1, 3), new Proton.Span(160, 200), 'polar'))
    
    // // Flame colors: red -> orange -> yellow -> transparent  
    // emitter.addBehaviour(new Proton.Color(['#ff4400', '#ff6600', '#ff8800', '#ffaa00']))
    // emitter.addBehaviour(new Proton.Alpha(1, 0))
    // emitter.addBehaviour(new Proton.Scale(1, 0.3))
    // emitter.addBehaviour(new Proton.RandomDrift(10, 10, 0.05))
    
    // // Add to proton system
    // protonRef.current.addEmitter(emitter)
    // emitter.emit()
    
    // return emitter
  }

  // Initialize game (only once)
  useEffect(() => {
    DEBUG_LOGS && logger.debug('🚀 Initializing game...')
    
    // Déplacer les updates async après l'initialisation pour éviter re-renders
    Promise.resolve().then(async () => {
      await checkAndResetDaily()
      await updateStreak()
      await updateMemoryLevel()
    })
    
    startGame('space-invaders')
    initializeAliens(1)
    initializeProton()
    
    // Initialiser le score et le seuil de flashcard pour le niveau 1
    scoreRef.current = 0
    nextFlashcardThresholdRef.current = getFlashcardThreshold(1)
    
    return () => {
      logger.debug('🔴 SpaceInvaders component unmounting! Score:', scoreRef.current)
      gameLoopStartedRef.current = false
      updateBestScore(scoreRef.current)
      endGame()
      // Nettoyer tous les timers
      activeTimersRef.current.forEach(timer => clearTimeout(timer))
      activeTimersRef.current.clear()
      // Nettoyer l'animation frame
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = 0
      }
      // Cleanup Proton (temporairement désactivé)
      // if (protonRef.current) {
      //   protonRef.current.destroy()
      //   protonRef.current = null
      // }
    }
  }, []) // Empty dependency array - run only once
  
  // Load cards separately when isForFun changes
  useEffect(() => {
    DEBUG_LOGS && logger.debug('🎯 Loading cards, isForFun:', isForFun)
    loadCards(isForFun)
  }, [isForFun])
  
  // Update refs when state changes - Removed to avoid re-renders
  // cardsRef.current is updated directly in loadCards function
  
  // Plus besoin de synchroniser waveRef - supprimé
  
  // Create power-up
  const createPowerUp = (x: number, y: number) => {
    const validWave = Math.max(1, Math.min(wave, LEVEL_CONFIG.length))
    const levelIndex = Math.min(validWave - 1, LEVEL_CONFIG.length - 1)
    const config = LEVEL_CONFIG[levelIndex]
    
    if (!config) {
      logger.error('Configuration manquante pour createPowerUp niveau', levelIndex, 'wave:', validWave)
      return
    }
    
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
      
      DEBUG_LOGS && logger.debug('Power-up created:', type)
    }
  }
  
  // Activate power-up
  const activatePowerUp = (type: PowerUpType) => {
    const config = POWER_UP_CONFIG[type]
    
    if (type === PowerUpType.EXTRA_LIFE) {
      playerRef.current.lives++
      DEBUG_LOGS && logger.debug('Extra life! Lives:', playerRef.current.lives)
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
    
    DEBUG_LOGS && logger.debug('Power-up activated:', type, 'Duration:', config.duration)
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
    const respawnTimer = setTimeout(() => {
      playerDeathRef.current = false
      // Respawn player at center bottom
      playerRef.current.x = PLAY_AREA_WIDTH / 2 - PLAYER_WIDTH / 2
      playerRef.current.y = GAME_HEIGHT - PLAYER_HEIGHT - 20
      activeTimersRef.current.delete(respawnTimer)
    }, 1000)
    activeTimersRef.current.add(respawnTimer)
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
    
    // Debug: Log input handling
    if (frameCountRef.current % 300 === 0) { // Every 5 seconds
      logger.debug('🎮 Input handling', { keys: Array.from(keysRef.current) })
    }
    
    const player = playerRef.current
    
    // Move player (only if not exploding) - 4 directions movement
    if (keysRef.current.has('ArrowLeft') && player.x > 0) {
      player.x -= PLAYER_SPEED
    }
    if (keysRef.current.has('ArrowRight') && player.x < PLAY_AREA_WIDTH - PLAYER_WIDTH) {
      player.x += PLAYER_SPEED
    }
    if (keysRef.current.has('ArrowUp') && player.y > 0) {
      player.y -= PLAYER_SPEED
    }
    if (keysRef.current.has('ArrowDown') && player.y < GAME_HEIGHT - PLAYER_HEIGHT) {
      player.y += PLAYER_SPEED
    }
    
    // Shoot (only on space key press, not hold)
    const spacePressed = keysRef.current.has(' ')
    // Protection contre les états invalides de wave
    const validWave = Math.max(1, Math.min(wave, LEVEL_CONFIG.length))
    const levelIndex = Math.min(validWave - 1, LEVEL_CONFIG.length - 1)
    const config = LEVEL_CONFIG[levelIndex]
    
    // Debug wave and config
    if (spacePressed && !spaceWasPressedRef.current && DEBUG_LOGS) {
      logger.debug('🎮 wave state', { wave, validWave, levelIndex })
      logger.debug(`⚙️ Config used:`, config)
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
        DEBUG_LOGS && logger.debug(`🎯 Wave ${wave}: Shooting bullets simultaneously`, { bulletsPerShot: config.bulletsPerShot })
        DEBUG_LOGS && logger.debug('🔍 Before shooting', { bulletsOnScreen: playerBulletsRef.current.length, maxBullets: config.maxBulletsOnScreen })
        DEBUG_LOGS && logger.debug(`📋 Level index: ${levelIndex}, Config:`, config)
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
        DEBUG_LOGS && logger.debug(`🔫 Firing ${bulletsToFire} bullets${config.sideMissiles ? ' with side missiles' : ''} (not multi-shot power-up)`)
        
        if (config.flameMissiles) {
          // Missiles avec flammes au niveau 10+
          DEBUG_LOGS && logger.debug(`🔥 Flame missiles activated!`)
          
          // Positions de départ sur les côtés du vaisseau
          const startPositions = [
            { x: player.x + 10, y: player.y + 10 }, // Gauche
            { x: player.x + PLAYER_WIDTH - 10, y: player.y + 10 }, // Droite
            { x: player.x + 20, y: player.y + 5 }, // Gauche centre
            { x: player.x + PLAYER_WIDTH - 20, y: player.y + 5 } // Droite centre
          ]
          
          for (let i = 0; i < Math.min(bulletsToFire, startPositions.length); i++) {
            const pos = startPositions[i]
            const emitter = createFlameEmitter(pos.x, pos.y)
            
            if (playerBulletsRef.current.length < MAX_PLAYER_BULLETS) {
              playerBulletsRef.current.push({
                x: pos.x,
                y: pos.y,
                width: BULLET_WIDTH,
                height: BULLET_HEIGHT,
                active: true,
                velocityY: -BULLET_SPEED * 0.7, // Un peu plus lent
                velocityX: (i % 2 === 0 ? -1 : 1) * 2, // Mouvement latéral initial
                isFlameType: true,
                emitter: emitter,
                timeAlive: 0
              })
            }
          }
        } else if (config.sideMissiles) {
          // Missiles latéraux à partir du niveau 8
          DEBUG_LOGS && logger.debug(`🚀 Side missiles activated!`)
          
          // Tir central
          if (playerBulletsRef.current.length < MAX_PLAYER_BULLETS) {
            playerBulletsRef.current.push({
              x: player.x + PLAYER_WIDTH / 2 - BULLET_WIDTH / 2,
              y: player.y,
              width: hasLaser ? BULLET_WIDTH * 2 : BULLET_WIDTH,
              height: hasLaser ? BULLET_HEIGHT * 2 : BULLET_HEIGHT,
              active: true,
              velocityY: -BULLET_SPEED,
              velocityX: 0
            })
          }
          
          // Missiles latéraux (angles de 15° vers la gauche et la droite)
          const sideAngles = [-15, 15, -30, 30] // Degrés
          for (let i = 0; i < Math.min(bulletsToFire - 1, sideAngles.length); i++) {
            const angleRad = (sideAngles[i] * Math.PI) / 180
            const velocityX = Math.sin(angleRad) * BULLET_SPEED
            const velocityY = -Math.cos(angleRad) * BULLET_SPEED
            
            if (playerBulletsRef.current.length < MAX_PLAYER_BULLETS) {
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
          }
        } else if (bulletsToFire === 1) {
          // logger.debug(`➡️ Single bullet path`)
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
          // logger.debug(`➡️ Multiple bullets path: ${bulletsToFire} bullets`)
          // Multiple parallel bullets
          const spacing = 8 // Espacement entre les balles
          const totalWidth = (bulletsToFire - 1) * spacing
          const startX = player.x + PLAYER_WIDTH / 2 - totalWidth / 2
          // logger.debug(`📐 Spacing: ${spacing}, totalWidth: ${totalWidth}, startX: ${startX}`)
          
          for (let i = 0; i < bulletsToFire; i++) {
            const bulletX = startX + i * spacing - BULLET_WIDTH / 2
            // logger.debug(`🎯 Bullet ${i+1}: x=${bulletX}`)
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
      DEBUG_LOGS && logger.debug(`🔍 After shooting: bullets on screen = ${playerBulletsRef.current.length}`)
    }
    spaceWasPressedRef.current = spacePressed
  }
  
  // Update game logic
  const updateGame = () => {
    if (gameOver || isPaused || flashcardVisible) return
    
    // Protection contre les états invalides
    if (!aliensRef.current || !playerRef.current || !playerBulletsRef.current) {
      logger.warn(`⚠️ Game objects not initialized`)
      return
    }
    
    // Debug: Entrance marker
    if (frameCountRef.current % 300 === 0) {
      logger.debug(`🔄 UpdateGame called - frame ${frameCountRef.current}`)
    }
    
    // Vérifier l'accumulation d'objets
    if (frameCountRef.current % 60 === 0) {
      logger.debug(`📦 Objects count - Bullets: ${playerBulletsRef.current.length + alienBulletsRef.current.length}, Particles: ${particlesRef.current.length}, PowerUps: ${powerUpsRef.current.length}`)
    }
    
    // Update active power-ups duration
    const now = Date.now()
    activePowerUpsRef.current = activePowerUpsRef.current.filter(powerUp => {
      if (powerUp.endTime < now) {
        if (powerUp.type === PowerUpType.SHIELD) {
          shieldActiveRef.current = false
        }
        // logger.debug('Power-up expired:', powerUp.type)
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
        // soundManager.playSuccess() // Temporairement désactivé pour debug
        return false
      }
      
      // Remove if off screen
      return powerUp.active && powerUp.y < GAME_HEIGHT
    })
    
    // Update player bullets
    playerBulletsRef.current = playerBulletsRef.current.filter(bullet => {
      if (bullet.isFlameType) {
        // Missiles avec flammes - trajectoire courbe
        if (bullet.timeAlive === undefined) bullet.timeAlive = 0
        bullet.timeAlive += 16.67 // ~1 frame à 60fps en millisecondes
        
        // Phase 1: Mouvement latéral (0-500ms)
        if (bullet.timeAlive < 500) {
          bullet.x += bullet.velocityX || 0
          bullet.y += bullet.velocityY * 0.3 // Mouvement vertical lent
        }
        // Phase 2: Transition vers le haut (500-700ms)  
        else if (bullet.timeAlive < 700) {
          const progress = (bullet.timeAlive - 500) / 200
          bullet.velocityX = (bullet.velocityX || 0) * (1 - progress) // Réduire mouvement latéral
          bullet.y += bullet.velocityY * (0.3 + progress * 0.7) // Accélérer vers le haut
          bullet.x += bullet.velocityX || 0
        }
        // Phase 3: Mouvement principal vers les aliens (700ms+)
        else {
          bullet.y += bullet.velocityY
          // Mouvement latéral minimal pour effet serpentin
          if (bullet.velocityX) {
            bullet.x += Math.sin(bullet.timeAlive * 0.01) * 0.5
          }
        }
        
        // Mettre à jour la position de l'émetteur de particules
        if (bullet.emitter && protonRef.current) {
          bullet.emitter.p.x = bullet.x + BULLET_WIDTH / 2
          bullet.emitter.p.y = bullet.y + BULLET_HEIGHT / 2
        }
      } else {
        // Missiles normaux et latéraux
        bullet.y += bullet.velocityY
        if (bullet.velocityX !== undefined) {
          bullet.x += bullet.velocityX
        }
      }
      
      // Nettoyer l'émetteur si le missile sort de l'écran
      const isInBounds = bullet.active && 
                        bullet.y > -BULLET_HEIGHT && 
                        bullet.x > -BULLET_WIDTH && 
                        bullet.x < PLAY_AREA_WIDTH + BULLET_WIDTH
      
      if (!isInBounds && bullet.emitter && protonRef.current) {
        bullet.emitter.stopEmit()
        bullet.emitter.removeAllInitializers()
        bullet.emitter.removeAllBehaviours()
        protonRef.current.removeEmitter(bullet.emitter)
      }
      
      return isInBounds
    })
    
    // Update aliens
    let needsDrop = false
    const aliens = aliensRef.current
    const aliveAliens = aliens.filter(a => a.alive)
    
    // Move aliens (only if there are aliens left)
    for (const alien of aliveAliens) {
      if (!alienDropRef.current) {
        alien.x += alienDirectionRef.current * alienSpeedRef.current
        
        if (alien.x <= 0 || alien.x >= PLAY_AREA_WIDTH - ALIEN_WIDTH) {
          needsDrop = true
        }
      }
    }
    
    // Handle alien drop
    if (alienDropRef.current) {
      for (const alien of aliveAliens) {
        alien.y += 20
        
        // Si l'alien dépasse le bas de l'écran, le faire revenir par le haut
        if (alien.y > GAME_HEIGHT) {
          alien.y = -ALIEN_HEIGHT - Math.random() * 100 // Revenir par le haut avec un peu de variation
        }
      }
      alienDirectionRef.current *= -1
      alienDropRef.current = false
    } else if (needsDrop) {
      alienDropRef.current = true
    }
    
    // Check if aliens reached player
    for (const alien of aliveAliens) {
      if (alien.y < playerRef.current.y + PLAYER_HEIGHT &&
          alien.y + ALIEN_HEIGHT > playerRef.current.y &&
          alien.x < playerRef.current.x + PLAYER_WIDTH &&
          alien.x + ALIEN_WIDTH > playerRef.current.x) {
        // Alien touched player - destroy alien and damage player
        alien.alive = false
        
        if (shieldActiveRef.current) {
          // logger.debug('Shield absorbed alien contact!')
          activePowerUpsRef.current = activePowerUpsRef.current.filter(p => p.type !== PowerUpType.SHIELD)
          shieldActiveRef.current = false
        } else {
          playerRef.current.lives--
          // logger.debug(`👾 Alien collision! Lives remaining: ${playerRef.current.lives}`)
          
          // Create explosion effect
          createExplosion(
            playerRef.current.x,
            playerRef.current.y,
            PLAYER_WIDTH,
            PLAYER_HEIGHT
          )
          
          if (playerRef.current.lives <= 0) {
            // logger.debug('💀 Game Over - No lives remaining after alien collision')
            DEBUG_LOGS && logger.debug('📊 Game state at crash:', { score, wave, gameOver })
            setGameOver(true)
            return
          }
        }
        break // Only one alien collision per frame
      }
    }
    
    // Alien shooting
    const validWave = Math.max(1, Math.min(wave, LEVEL_CONFIG.length))
    const levelIndex = Math.min(validWave - 1, LEVEL_CONFIG.length - 1)
    const config = LEVEL_CONFIG[levelIndex]
    if (!config) {
      logger.error('Configuration manquante pour le niveau', levelIndex, 'wave:', validWave)
      return
    }
    const alienShootChance = config.alienShootChance
    
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
          
          // Update score only in Zustand store to avoid re-renders
          updateGameScore(alien.points)
          // Update local ref for display purposes
          scoreRef.current += alien.points
          
          createPowerUp(alien.x, alien.y)
          
          alienKillCountRef.current++
          logger.debug(`👾 Alien killed! Count: ${alienKillCountRef.current}/${nextFlashcardThresholdRef.current}`)
          // Réactivation des flashcards avec protection
          if (alienKillCountRef.current >= nextFlashcardThresholdRef.current && cardsRef.current.length > 0 && !flashcardVisible) {
            logger.debug('🎯 Triggering flashcard - conditions met')
            triggerFlashcard()
          }
          
          if (bulletHit) break
        }
      }
    }
    
    // Check if all aliens are dead - advance to next wave
    if (aliveAliens.length === 0 && !waveTransitionRef.current) {
      // logger.debug(`🏆 Wave ${wave} completed! Advancing to wave ${wave + 1}`)
      // logger.debug(`📊 Final stats - Player bullets: ${playerBulletsRef.current.length}, Alien bullets: ${alienBulletsRef.current.length}, Power-ups: ${powerUpsRef.current.length}`)
      
      // Protection contre les changements de niveau multiples
      if (gameOver || isPaused || waveTransitionRef.current) {
        logger.debug(`⚠️ Skip wave change: gameOver=${gameOver}, isPaused=${isPaused}, transition=${waveTransitionRef.current}`)
        return
      }
      
      waveTransitionRef.current = true // Bloquer d'autres transitions
      
      const nextWave = wave + 1
      setWave(nextWave)
      playerBulletsRef.current = []
      alienBulletsRef.current = []
      powerUpsRef.current = [] // Clear power-ups between waves
      
      const waveTimer = setTimeout(() => {
        try {
          // logger.debug(`🔄 Initializing wave ${nextWave}...`)
          initializeAliens(nextWave)
          const levelIndex = Math.min(nextWave - 1, LEVEL_CONFIG.length - 1)
          const config = LEVEL_CONFIG[levelIndex]
          // logger.debug(`🌊 Wave ${nextWave} started!`)
          // logger.debug(`📊 Config:`, config)
          // logger.debug(`🚀 Bullets per shot: ${config.bulletsPerShot}`)
          // logger.debug(`📺 Max bullets on screen: ${config.maxBulletsOnScreen}`)
          
          // Mettre à jour le seuil de flashcard pour le nouveau niveau
          const newThreshold = getFlashcardThreshold(nextWave)
          nextFlashcardThresholdRef.current = newThreshold
          DEBUG_LOGS && logger.debug(`📚 New flashcard threshold for wave ${nextWave}: ${newThreshold} aliens`)
          
          waveTransitionRef.current = false // Débloquer les transitions
        } catch (error) {
          logger.error(`❌ Error initializing wave ${nextWave}:`, error)
          waveTransitionRef.current = false // Débloquer même en cas d'erreur
        }
        activeTimersRef.current.delete(waveTimer)
      }, 2000)
      activeTimersRef.current.add(waveTimer)
    }
    
    // Check collisions - alien bullets vs player
    if (!playerDeathRef.current) { // Only check if not already exploding
      for (const bullet of alienBulletsRef.current) {
        if (checkCollision(bullet, playerRef.current)) {
          bullet.active = false
          
          // Check for shield
          if (shieldActiveRef.current) {
            // logger.debug('Shield absorbed hit!')
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
              // logger.debug('💀 Game Over - No more lives after bullet hit')
              DEBUG_LOGS && logger.debug('📊 Game state at crash:', { score, wave, gameOver })
              setGameOver(true)
            }
          }
          break // Only one hit per frame
        }
      }
    }
  }
  
  // Trigger flashcard - VERSION SIMPLIFIÉE SANS BOSS CARDS
  const triggerFlashcard = () => {
    logger.debug('🎯 triggerFlashcard called (simplified)')
    logger.debug('🎯 Available cards:', cardsRef.current.length)
    
    if (cardsRef.current.length === 0) {
      logger.error('❌ No cards available for flashcard!')
      return
    }
    
    // SYSTÈME BOSS TEMPORAIREMENT DÉSACTIVÉ - carte aléatoire simple
    const cardToShow = cardsRef.current[Math.floor(Math.random() * cardsRef.current.length)]
    
    logger.debug('🎯 About to show flashcard:', cardToShow?.id, 'Boss: false (disabled)')
    useReviewStore.setState({ currentCard: cardToShow })
    logger.debug('🎯 Calling showFlashcard...')
    showFlashcard(cardToShow)
    logger.debug('🎯 showFlashcard called successfully')
    
    // Réinitialiser le compteur d'aliens tués
    alienKillCountRef.current = 0
    nextFlashcardThresholdRef.current = getFlashcardThreshold(wave)
  }
  
  // Handle flashcard answer - mémorisé pour éviter les re-renders
  const handleFlashcardAnswer = useCallback(async (correct: boolean) => {
    logger.debug(`📝 Flashcard answered: ${correct ? 'correct' : 'incorrect'}`)
    
    if (correct) {
      // Bonus: Clear some alien bullets
      alienBulletsRef.current = alienBulletsRef.current.slice(0, Math.floor(alienBulletsRef.current.length / 2))
      addNewCardToday()
      soundManager.playSuccess()
      
      // BOSS SYSTEM DISABLED - normal progression
      incrementConsecutiveCorrect()
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
      // soundManager.playError() // Temporairement désactivé pour debug
    }
    
    // Hide flashcard first, then do async operations to prevent re-renders
    hideFlashcard()
    
    // Use setTimeout to avoid blocking the UI and prevent re-render loops
    setTimeout(async () => {
      try {
        await updateMemoryLevel()
        await loadCards(isForFun)
        await useDeckStore.getState().refreshDeckCounts()
        logger.debug(`📝 Flashcard handling completed`)
      } catch (error) {
        logger.error('❌ Error in flashcard completion:', error)
      }
    }, 100)
  }, [addNewCardToday, incrementConsecutiveCorrect, resetConsecutiveCorrect, hideFlashcard, updateMemoryLevel, loadCards, isForFun])
  
  // Draw arcade-style UI in the canvas
  const drawArcadeUI = (ctx: CanvasRenderingContext2D) => {
    // Background de la zone UI (à droite)
    ctx.fillStyle = '#001122'
    ctx.fillRect(PLAY_AREA_WIDTH, 0, UI_AREA_WIDTH, GAME_HEIGHT)
    
    // Bordure néon autour de la zone UI
    ctx.strokeStyle = '#00ffff'
    ctx.lineWidth = 3
    ctx.strokeRect(PLAY_AREA_WIDTH + 10, 10, UI_AREA_WIDTH - 20, GAME_HEIGHT - 20)
    
    // Configuration du texte arcade
    ctx.fillStyle = '#00ff00'
    ctx.font = 'bold 32px "Courier New", monospace'
    ctx.textAlign = 'left'
    ctx.shadowColor = '#00ff00'
    ctx.shadowBlur = 3
    
    let yPos = 60
    
    // High Score qui clignote
    const blink = Math.floor(Date.now() / 800) % 2
    if (blink) {
      ctx.fillStyle = '#ffff00'
      ctx.fillText('HIGH SCORE', PLAY_AREA_WIDTH + 30, yPos)
      ctx.fillStyle = '#00ff00'
    }
    yPos += 60
    
    // Score actuel
    ctx.fillText('SCORE', PLAY_AREA_WIDTH + 30, yPos)
    yPos += 40
    ctx.fillText(scoreRef.current.toString().padStart(8, '0'), PLAY_AREA_WIDTH + 30, yPos)
    yPos += 80
    
    // Wave
    ctx.fillText('WAVE', PLAY_AREA_WIDTH + 30, yPos)
    yPos += 40
    ctx.fillText(wave.toString().padStart(2, '0'), PLAY_AREA_WIDTH + 30, yPos)
    yPos += 80
    
    // Lives - dessiner des mini vaisseaux
    ctx.fillText('LIVES', PLAY_AREA_WIDTH + 30, yPos)
    yPos += 50
    for (let i = 0; i < playerRef.current.lives; i++) {
      drawMiniPlayer(ctx, PLAY_AREA_WIDTH + 30 + (i * 40), yPos)
    }
    yPos += 80
    
    // Cards disponibles
    ctx.fillText('CARDS', PLAY_AREA_WIDTH + 30, yPos)
    yPos += 40
    ctx.fillText(cardsRef.current.length.toString().padStart(3, '0'), PLAY_AREA_WIDTH + 30, yPos)
    yPos += 80
    
    // Instructions de contrôle
    ctx.fillStyle = '#888888'
    ctx.font = 'bold 16px "Courier New", monospace'
    ctx.fillText('CONTROLS:', PLAY_AREA_WIDTH + 30, yPos)
    yPos += 25
    ctx.fillText('ARROWS: MOVE', PLAY_AREA_WIDTH + 30, yPos)
    yPos += 20
    ctx.fillText('SPACE: FIRE', PLAY_AREA_WIDTH + 30, yPos)
    
    // Bordure séparatrice entre le jeu et l'UI
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(PLAY_AREA_WIDTH, 0)
    ctx.lineTo(PLAY_AREA_WIDTH, GAME_HEIGHT)
    ctx.stroke()
    
    // Reset shadow
    ctx.shadowBlur = 0
  }

  // Draw game
  const drawGame = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // Protection contre les états invalides
    if (!aliensRef.current || !playerRef.current || !playerBulletsRef.current) {
      logger.warn(`⚠️ Cannot draw: game objects not initialized`)
      return
    }
    
    // Debug: Draw function marker
    if (frameCountRef.current % 300 === 0) {
      logger.debug(`🎨 DrawGame called - rendering frame ${frameCountRef.current}`)
    }
    
    // Clear tout le canvas
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)
    
    // Dessiner l'interface arcade à droite
    drawArcadeUI(ctx)
    
    // Clipping pour dessiner le jeu seulement dans la zone de gauche
    ctx.save()
    ctx.beginPath()
    ctx.rect(0, 0, PLAY_AREA_WIDTH, GAME_HEIGHT)
    ctx.clip()
    
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
      if (bullet.isFlameType) {
        // Dessiner le missile avec un effet de flamme
        ctx.fillStyle = '#ffaa00' // Couleur dorée pour le missile
        ctx.fillRect(bullet.x, bullet.y, BULLET_WIDTH, BULLET_HEIGHT * 2)
        
        // Ajouter un effet de traînée manuelle si Proton n'est pas disponible
        if (!protonRef.current) {
          ctx.fillStyle = '#ff6600'
          ctx.globalAlpha = 0.7
          ctx.fillRect(bullet.x - 1, bullet.y + BULLET_HEIGHT, BULLET_WIDTH + 2, BULLET_HEIGHT)
          ctx.fillStyle = '#ff4400'
          ctx.globalAlpha = 0.5
          ctx.fillRect(bullet.x - 2, bullet.y + BULLET_HEIGHT * 2, BULLET_WIDTH + 4, BULLET_HEIGHT)
          ctx.globalAlpha = 1
        }
      } else {
        // Balles normales
        ctx.fillStyle = '#fff'
        ctx.fillRect(bullet.x, bullet.y, BULLET_WIDTH, BULLET_HEIGHT)
      }
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
    
    // Restaurer le contexte après le clipping de la zone de jeu
    ctx.restore()
    
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
  const lastUpdateTimeRef = useRef(0)
  const gameLoopRunningRef = useRef(false)
  const FIXED_TIME_STEP = 1000 / 60 // 60 updates par seconde
  
  const gameLoop = (currentTime: number) => {
    // Éviter les appels multiples simultanés
    if (gameLoopRunningRef.current) return
    gameLoopRunningRef.current = true
    
    try {
      // Tracking FPS pour debug
      frameCountRef.current++
      if (currentTime - lastFrameTimeRef.current >= 1000) {
        logger.debug(`🎮 FPS: ${frameCountRef.current}, GameOver: ${gameOver}, Paused: ${isPaused}, FlashcardVisible: ${flashcardVisible}`)
        frameCountRef.current = 0
        lastFrameTimeRef.current = currentTime
      }
      
      // Fixed timestep pour la logique
      if (currentTime - lastUpdateTimeRef.current >= FIXED_TIME_STEP) {
        handleInput()
        updateGame()
        
        // Mettre à jour le système de particules Proton (temporairement désactivé)
        // if (protonRef.current) {
        //   protonRef.current.update()
        // }
        
        lastUpdateTimeRef.current = currentTime
      }
      
      // Toujours dessiner à chaque frame
      drawGame()
      
      if (!gameOver && !isPaused && !flashcardVisible && gameLoopStartedRef.current) {
        animationRef.current = requestAnimationFrame(gameLoop)
      } else {
        logger.debug(`🛑 Game loop stopped: gameOver=${gameOver}, isPaused=${isPaused}, flashcard=${flashcardVisible}, started=${gameLoopStartedRef.current}`)
        gameLoopRunningRef.current = false
      }
    } catch (error) {
      logger.error('❌ Error in game loop:', error)
      gameLoopRunningRef.current = false
    } finally {
      gameLoopRunningRef.current = false
    }
  }
  
  // Start game loop
  useEffect(() => {
    logger.debug(`🎮 Game loop effect triggered: gameOver=${gameOver}, isPaused=${isPaused}, flashcardVisible=${flashcardVisible}`)
    
    // Nettoyer l'animation précédente
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = 0
    }
    
    if (!gameOver && !isPaused && !flashcardVisible) {
      logger.debug('🚀 Starting/Resuming game loop')
      gameLoopStartedRef.current = true
      gameLoopRunningRef.current = false // Reset running flag
      animationRef.current = requestAnimationFrame(gameLoop)
    } else if (gameOver || isPaused || flashcardVisible) {
      logger.debug('⏸️ Pausing game loop')
      gameLoopStartedRef.current = false
    }
    
    return () => {
      logger.debug('🧹 Cleaning up game loop effect')
      gameLoopStartedRef.current = false
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = 0
      }
      // Nettoyer tous les timers actifs
      activeTimersRef.current.forEach(timer => clearTimeout(timer))
      activeTimersRef.current.clear()
      // Nettoyer les refs
      keysRef.current.clear()
      particlesRef.current = []
    }
  }, [gameOver, isPaused, flashcardVisible])
  
  // Mobile controls
  const handleMobileMove = (direction: 'left' | 'right' | 'up' | 'down') => {
    if (gameOver || isPaused || flashcardVisible) return
    
    const player = playerRef.current
    const moveSpeed = PLAYER_SPEED * 2 // Mobile movement is faster
    
    switch (direction) {
      case 'left':
        if (player.x > 0) {
          player.x = Math.max(0, player.x - moveSpeed)
        }
        break
      case 'right':
        if (player.x < PLAY_AREA_WIDTH - PLAYER_WIDTH) {
          player.x = Math.min(PLAY_AREA_WIDTH - PLAYER_WIDTH, player.x + moveSpeed)
        }
        break
      case 'up':
        if (player.y > 0) {
          player.y = Math.max(0, player.y - moveSpeed)
        }
        break
      case 'down':
        if (player.y < GAME_HEIGHT - PLAYER_HEIGHT) {
          player.y = Math.min(GAME_HEIGHT - PLAYER_HEIGHT, player.y + moveSpeed)
        }
        break
    }
  }
  
  const handleMobileShoot = () => {
    const validWave = Math.max(1, Math.min(wave, LEVEL_CONFIG.length))
    const levelIndex = Math.min(validWave - 1, LEVEL_CONFIG.length - 1)
    const config = LEVEL_CONFIG[levelIndex]
    
    if (!config) {
      logger.error('Configuration manquante pour handleMobileShoot niveau', levelIndex, 'wave:', validWave)
      return
    }
    
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
      
      if (config.flameMissiles) {
        // Missiles avec flammes (mobile)
        const player = playerRef.current
        const startPositions = [
          { x: player.x + 10, y: player.y + 10 }, // Gauche
          { x: player.x + PLAYER_WIDTH - 10, y: player.y + 10 }, // Droite
          { x: player.x + 20, y: player.y + 5 }, // Gauche centre
          { x: player.x + PLAYER_WIDTH - 20, y: player.y + 5 } // Droite centre
        ]
        
        for (let i = 0; i < Math.min(bulletsToFire, startPositions.length); i++) {
          const pos = startPositions[i]
          const emitter = createFlameEmitter(pos.x, pos.y)
          
          if (playerBulletsRef.current.length < MAX_PLAYER_BULLETS) {
            playerBulletsRef.current.push({
              x: pos.x,
              y: pos.y,
              width: BULLET_WIDTH,
              height: BULLET_HEIGHT,
              active: true,
              velocityY: -BULLET_SPEED * 0.7,
              velocityX: (i % 2 === 0 ? -1 : 1) * 2,
              isFlameType: true,
              emitter: emitter,
              timeAlive: 0
            })
          }
        }
      } else if (config.sideMissiles) {
        // Missiles latéraux
        // Tir central
        if (playerBulletsRef.current.length < MAX_PLAYER_BULLETS) {
          playerBulletsRef.current.push({
            x: playerRef.current.x + PLAYER_WIDTH / 2 - BULLET_WIDTH / 2,
            y: playerRef.current.y,
            width: hasLaser ? BULLET_WIDTH * 2 : BULLET_WIDTH,
            height: hasLaser ? BULLET_HEIGHT * 2 : BULLET_HEIGHT,
            active: true,
            velocityY: -BULLET_SPEED,
            velocityX: 0
          })
        }
        
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
    <div className="fixed inset-0 bg-black overflow-hidden">
      {/* Canvas plein écran avec interface intégrée */}
      <canvas
        ref={canvasRef}
        width={GAME_WIDTH}
        height={GAME_HEIGHT}
        className="absolute inset-0 w-full h-full"
        style={{ 
          imageRendering: 'pixelated',
          backgroundColor: 'black',
          objectFit: 'contain'
        }}
      />
      
      {/* Bouton retour flottant */}
      <button
        onClick={() => navigate('/play')}
        className="absolute top-4 left-4 z-10 bg-black/70 text-green-400 px-4 py-2 rounded font-mono border border-green-400 hover:bg-green-400 hover:text-black transition-colors"
      >
        ← EXIT
      </button>
      
      {gameOver && (
        <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-20">
          <div className="bg-black border-4 border-red-500 p-12 text-center font-mono">
            <h2 className="text-6xl font-bold mb-6 text-red-500 animate-pulse">GAME OVER</h2>
            <p className="text-3xl mb-8 text-white">FINAL SCORE: {scoreRef.current}</p>
            <button
              onClick={resetGame}
              className="bg-green-500 text-black px-8 py-4 text-2xl font-bold border-2 border-green-400 hover:bg-green-400 transition-colors"
            >
              RESTART
            </button>
          </div>
        </div>
      )}
      
      {/* Mobile controls */}
      {isNative && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-4 z-10">
          {/* Up button */}
          <button
            onTouchStart={() => handleMobileMove('up')}
            className="bg-gray-700 hover:bg-gray-600 text-white p-4 rounded-full w-16 h-16 flex items-center justify-center text-2xl"
            disabled={gameOver || isPaused}
          >
            ↑
          </button>
          
          {/* Middle row: Left, Shoot, Right */}
          <div className="flex gap-4">
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
          
          {/* Down button */}
          <button
            onTouchStart={() => handleMobileMove('down')}
            className="bg-gray-700 hover:bg-gray-600 text-white p-4 rounded-full w-16 h-16 flex items-center justify-center text-2xl"
            disabled={gameOver || isPaused}
          >
            ↓
          </button>
        </div>
      )}
      
      {flashcardVisible && currentFlashcard && (
        <FlashcardModal
          key={currentFlashcard.id} // Clé basée uniquement sur l'ID de la carte
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