import {
  GAME_WIDTH,
  GAME_HEIGHT,
  PLAYER_WIDTH,
  PLAYER_HEIGHT,
  PLAYER_SPEED,
  BULLET_WIDTH,
  BULLET_HEIGHT,
  BULLET_SPEED,
  INVADER_WIDTH,
  INVADER_HEIGHT,
  INVADER_SPEED,
  INVADER_DROP_DISTANCE,
  INVADER_ROWS,
  INVADER_COLS,
  INVADER_SPACING_X,
  INVADER_SPACING_Y,
  INVADER_START_X,
  INVADER_START_Y,
  INVADER_BULLET_SPEED,
  INVADER_SHOOT_CHANCE,
  BARRIER_WIDTH,
  BARRIER_HEIGHT,
  BARRIER_COUNT,
  INVADER_TYPES,
  GAME_STATES,
  type Position,
  type GameObject,
  type Bullet,
  type Invader,
  type Player,
  type Barrier,
  type GameState
} from './constants'

export class SpaceInvadersGame {
  public gameState: GameState = GAME_STATES.PLAYING
  public score = 0
  public level = 1
  public player: Player
  public invaders: Invader[] = []
  public playerBullets: Bullet[] = []
  public invaderBullets: Bullet[] = []
  public barriers: Barrier[] = []
  public invaderDirection = 1 // 1 for right, -1 for left
  public invaderMoveTimer = 0
  public keys: { [key: string]: boolean } = {}
  
  // Flashcard integration
  public invadersKilled = 0
  public nextFlashcardThreshold = 10 // Show flashcard every 10 invaders killed
  public onFlashcardTrigger?: () => void
  
  // Level transition
  public showLevelTransition = false
  public levelTransitionTimer = 0

  constructor() {
    this.player = {
      x: GAME_WIDTH / 2 - PLAYER_WIDTH / 2,
      y: GAME_HEIGHT - PLAYER_HEIGHT - 10,
      width: PLAYER_WIDTH,
      height: PLAYER_HEIGHT,
      lives: 3
    }

    this.initializeInvaders()
    this.initializeBarriers()
  }

  private initializeInvaders() {
    this.invaders = []
    for (let row = 0; row < INVADER_ROWS; row++) {
      for (let col = 0; col < INVADER_COLS; col++) {
        const type = row === 0 ? 'small' : row <= 2 ? 'medium' : 'large'
        this.invaders.push({
          x: INVADER_START_X + col * INVADER_SPACING_X,
          y: INVADER_START_Y + row * INVADER_SPACING_Y,
          width: INVADER_WIDTH,
          height: INVADER_HEIGHT,
          type,
          points: INVADER_TYPES[type].points,
          alive: true
        })
      }
    }
  }

  private initializeBarriers() {
    this.barriers = []
    const barrierSpacing = (GAME_WIDTH - BARRIER_COUNT * BARRIER_WIDTH) / (BARRIER_COUNT + 1)
    
    for (let i = 0; i < BARRIER_COUNT; i++) {
      this.barriers.push({
        x: barrierSpacing + i * (BARRIER_WIDTH + barrierSpacing),
        y: GAME_HEIGHT - 200,
        width: BARRIER_WIDTH,
        height: BARRIER_HEIGHT,
        health: 3,
        maxHealth: 3
      })
    }
  }

  public update() {
    if (this.gameState !== GAME_STATES.PLAYING) return

    // Handle level transition
    if (this.showLevelTransition) {
      this.levelTransitionTimer++
      if (this.levelTransitionTimer >= 120) { // 2 seconds at 60fps
        this.showLevelTransition = false
      }
      return // Don't update game during transition
    }

    this.updatePlayer()
    this.updateBullets()
    this.updateInvaders()
    this.checkCollisions()
    this.checkGameState()
  }

  private updatePlayer() {
    // Move player based on input
    if (this.keys['ArrowLeft'] && this.player.x > 0) {
      this.player.x -= PLAYER_SPEED
    }
    if (this.keys['ArrowRight'] && this.player.x < GAME_WIDTH - PLAYER_WIDTH) {
      this.player.x += PLAYER_SPEED
    }
  }

  private updateBullets() {
    // Update player bullets
    this.playerBullets = this.playerBullets.filter(bullet => {
      bullet.y -= BULLET_SPEED
      return bullet.y > -BULLET_HEIGHT
    })

    // Update invader bullets
    this.invaderBullets = this.invaderBullets.filter(bullet => {
      bullet.y += INVADER_BULLET_SPEED
      return bullet.y < GAME_HEIGHT
    })
  }

  private updateInvaders() {
    if (this.invaders.filter(inv => inv.alive).length === 0) return

    this.invaderMoveTimer++
    
    // Move invaders faster each level (30 frames at level 1, 25 at level 2, etc.)
    const moveInterval = Math.max(10, 30 - (this.level - 1) * 2)
    if (this.invaderMoveTimer >= moveInterval) {
      this.invaderMoveTimer = 0
      
      // Check if any invader hits the edge
      const aliveInvaders = this.invaders.filter(invader => invader.alive)
      const shouldDrop = aliveInvaders.some(invader => 
        (this.invaderDirection > 0 && invader.x + INVADER_WIDTH >= GAME_WIDTH) ||
        (this.invaderDirection < 0 && invader.x <= 0)
      )

      if (shouldDrop) {
        // Drop down and change direction
        this.invaderDirection *= -1
        aliveInvaders.forEach(invader => {
          invader.y += INVADER_DROP_DISTANCE
        })
      } else {
        // Move horizontally
        aliveInvaders.forEach(invader => {
          invader.x += this.invaderDirection * INVADER_SPEED
        })
      }
    }

    // Random invader shooting - increases with level
    const aliveInvaders = this.invaders.filter(inv => inv.alive)
    const shootChance = INVADER_SHOOT_CHANCE * (1 + (this.level - 1) * 0.5) // 50% more chance per level
    aliveInvaders.forEach(invader => {
      if (Math.random() < shootChance) {
        this.invaderBullets.push({
          x: invader.x + INVADER_WIDTH / 2 - BULLET_WIDTH / 2,
          y: invader.y + INVADER_HEIGHT,
          width: BULLET_WIDTH,
          height: BULLET_HEIGHT,
          direction: 'down'
        })
      }
    })
  }

  private checkCollisions() {
    // Player bullets vs invaders
    this.playerBullets = this.playerBullets.filter(bullet => {
      const hitInvader = this.invaders.find(invader => 
        invader.alive && this.isColliding(bullet, invader)
      )
      
      if (hitInvader) {
        hitInvader.alive = false
        this.score += hitInvader.points
        this.invadersKilled++
        
        // Check if we should trigger a flashcard
        if (this.invadersKilled >= this.nextFlashcardThreshold) {
          this.triggerFlashcard()
        }
        
        return false // Remove bullet
      }
      return true
    })

    // Player bullets vs barriers
    this.playerBullets = this.playerBullets.filter(bullet => {
      const hitBarrier = this.barriers.find(barrier => 
        barrier.health > 0 && this.isColliding(bullet, barrier)
      )
      
      if (hitBarrier) {
        hitBarrier.health--
        return false // Remove bullet
      }
      return true
    })

    // Invader bullets vs player
    this.invaderBullets = this.invaderBullets.filter(bullet => {
      if (this.isColliding(bullet, this.player)) {
        this.player.lives--
        return false // Remove bullet
      }
      return true
    })

    // Invader bullets vs barriers
    this.invaderBullets = this.invaderBullets.filter(bullet => {
      const hitBarrier = this.barriers.find(barrier => 
        barrier.health > 0 && this.isColliding(bullet, barrier)
      )
      
      if (hitBarrier) {
        hitBarrier.health--
        return false // Remove bullet
      }
      return true
    })

    // Invaders vs player (game over if invader reaches player)
    const aliveInvaders = this.invaders.filter(inv => inv.alive)
    if (aliveInvaders.some(invader => invader.y + INVADER_HEIGHT >= this.player.y)) {
      this.player.lives = 0
    }
  }

  private isColliding(obj1: GameObject, obj2: GameObject): boolean {
    return obj1.x < obj2.x + obj2.width &&
           obj1.x + obj1.width > obj2.x &&
           obj1.y < obj2.y + obj2.height &&
           obj1.y + obj1.height > obj2.y
  }

  private checkGameState() {
    if (this.player.lives <= 0) {
      this.gameState = GAME_STATES.GAME_OVER
      return
    }

    const aliveInvaders = this.invaders.filter(inv => inv.alive)
    if (aliveInvaders.length === 0) {
      this.nextLevel()
    }
  }

  private nextLevel() {
    this.level++
    this.initializeInvaders()
    this.initializeBarriers()
    // Increase difficulty slightly - invaders move faster each level
    this.invaderMoveTimer = 0 // Reset timer to start moving immediately
    
    // Show level transition for 2 seconds
    this.showLevelTransition = true
    this.levelTransitionTimer = 0
  }

  public shoot() {
    if (this.gameState !== GAME_STATES.PLAYING) return
    
    // Limit to one bullet at a time
    if (this.playerBullets.length === 0) {
      this.playerBullets.push({
        x: this.player.x + PLAYER_WIDTH / 2 - BULLET_WIDTH / 2,
        y: this.player.y,
        width: BULLET_WIDTH,
        height: BULLET_HEIGHT,
        direction: 'up'
      })
    }
  }

  public moveLeft() {
    this.keys['ArrowLeft'] = true
  }

  public moveRight() {
    this.keys['ArrowRight'] = true
  }

  public stopLeft() {
    this.keys['ArrowLeft'] = false
  }

  public stopRight() {
    this.keys['ArrowRight'] = false
  }

  public pause() {
    this.gameState = this.gameState === GAME_STATES.PLAYING 
      ? GAME_STATES.PAUSED 
      : GAME_STATES.PLAYING
  }

  public reset() {
    this.gameState = GAME_STATES.PLAYING
    this.score = 0
    this.level = 1
    this.player.lives = 3
    this.player.x = GAME_WIDTH / 2 - PLAYER_WIDTH / 2
    this.player.y = GAME_HEIGHT - PLAYER_HEIGHT - 10
    this.playerBullets = []
    this.invaderBullets = []
    this.invaderDirection = 1
    this.invaderMoveTimer = 0
    this.keys = {}
    this.invadersKilled = 0
    this.nextFlashcardThreshold = 10
    this.showLevelTransition = false
    this.levelTransitionTimer = 0
    this.initializeInvaders()
    this.initializeBarriers()
  }

  public triggerFlashcard() {
    this.gameState = GAME_STATES.FLASHCARD
    this.nextFlashcardThreshold = this.invadersKilled + Math.floor(Math.random() * 10) + 8 // Next flashcard in 8-17 kills
    if (this.onFlashcardTrigger) {
      this.onFlashcardTrigger()
    }
  }

  public resumeFromFlashcard() {
    this.gameState = GAME_STATES.PLAYING;
    // Correction : si tous les aliens sont morts, passer au niveau suivant
    if (this.invaders.filter(inv => inv.alive).length === 0) {
      this.nextLevel();
    }
  }

  public addBonusPoints(points: number) {
    this.score += points
  }

  public removeLife() {
    this.player.lives--
  }

  public getGameData() {
    return {
      gameState: this.gameState,
      score: this.score,
      level: this.level,
      player: this.player,
      invaders: this.invaders.filter(inv => inv.alive),
      playerBullets: this.playerBullets,
      invaderBullets: this.invaderBullets,
      barriers: this.barriers.filter(barrier => barrier.health > 0),
      showLevelTransition: this.showLevelTransition
    }
  }
}