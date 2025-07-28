// Space Invaders Game Constants

export const GAME_WIDTH = 800
export const GAME_HEIGHT = 600
export const PLAYER_WIDTH = 40
export const PLAYER_HEIGHT = 30
export const PLAYER_SPEED = 5
export const BULLET_WIDTH = 4
export const BULLET_HEIGHT = 10
export const BULLET_SPEED = 7
export const INVADER_WIDTH = 30
export const INVADER_HEIGHT = 20
export const INVADER_SPEED = 1
export const INVADER_DROP_DISTANCE = 20
export const INVADER_ROWS = 5
export const INVADER_COLS = 10
export const INVADER_SPACING_X = 50
export const INVADER_SPACING_Y = 40
export const INVADER_START_X = 50
export const INVADER_START_Y = 50
export const INVADER_BULLET_SPEED = 3
export const INVADER_SHOOT_CHANCE = 0.001 // Chance per frame per invader
export const BARRIER_WIDTH = 60
export const BARRIER_HEIGHT = 40
export const BARRIER_COUNT = 4
export const TICK_SPEED = 16 // ~60 FPS

export interface Position {
  x: number
  y: number
}

export interface GameObject extends Position {
  width: number
  height: number
}

export interface Bullet extends GameObject {
  direction: 'up' | 'down'
}

export interface Invader extends GameObject {
  type: 'small' | 'medium' | 'large'
  points: number
  alive: boolean
}

export interface Player extends GameObject {
  lives: number
}

export interface Barrier extends GameObject {
  health: number
  maxHealth: number
}

export const INVADER_TYPES = {
  small: { points: 30, color: '#00ff00' },
  medium: { points: 20, color: '#ffff00' },
  large: { points: 10, color: '#ff0000' }
}

export const GAME_STATES = {
  PLAYING: 'playing',
  PAUSED: 'paused',
  GAME_OVER: 'game_over',
  VICTORY: 'victory',
  FLASHCARD: 'flashcard'
} as const

export type GameState = typeof GAME_STATES[keyof typeof GAME_STATES]