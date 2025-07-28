import { BOARD_WIDTH, BOARD_HEIGHT, TETROMINOS, TetrominoType, Board } from './constants'

export interface Piece {
  type: TetrominoType
  x: number
  y: number
  shape: number[][]
  color: string
}

export class TetrisGame {
  board: Board
  currentPiece: Piece | null = null
  score: number = 0
  lines: number = 0
  level: number = 1
  gameOver: boolean = false
  
  constructor() {
    this.board = this.createEmptyBoard()
    this.spawnPiece()
  }
  
  createEmptyBoard(): Board {
    return Array(BOARD_HEIGHT).fill(null).map(() => 
      Array(BOARD_WIDTH).fill(null)
    )
  }
  
  spawnPiece(): void {
    const pieces = Object.keys(TETROMINOS) as TetrominoType[]
    const type = pieces[Math.floor(Math.random() * pieces.length)]
    const tetromino = TETROMINOS[type]
    
    this.currentPiece = {
      type,
      x: Math.floor(BOARD_WIDTH / 2) - 1,
      y: 0,
      shape: tetromino.shape,
      color: tetromino.color
    }
    
    if (!this.isValidPosition(this.currentPiece)) {
      this.gameOver = true
    }
  }
  
  isValidPosition(piece: Piece, offsetX = 0, offsetY = 0): boolean {
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x]) {
          const newX = piece.x + x + offsetX
          const newY = piece.y + y + offsetY
          
          if (newX < 0 || newX >= BOARD_WIDTH || newY >= BOARD_HEIGHT) {
            return false
          }
          
          if (newY >= 0 && this.board[newY][newX]) {
            return false
          }
        }
      }
    }
    return true
  }
  
  movePiece(dx: number, dy: number): boolean {
    if (!this.currentPiece) return false
    
    if (this.isValidPosition(this.currentPiece, dx, dy)) {
      this.currentPiece.x += dx
      this.currentPiece.y += dy
      return true
    }
    return false
  }
  
  rotatePiece(): boolean {
    if (!this.currentPiece) return false
    
    const rotated = this.rotateMatrix(this.currentPiece.shape)
    const oldShape = this.currentPiece.shape
    this.currentPiece.shape = rotated
    
    if (!this.isValidPosition(this.currentPiece)) {
      this.currentPiece.shape = oldShape
      return false
    }
    return true
  }
  
  rotateMatrix(matrix: number[][]): number[][] {
    const N = matrix.length
    const rotated = Array(N).fill(null).map(() => Array(N).fill(0))
    
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        rotated[j][N - 1 - i] = matrix[i][j]
      }
    }
    return rotated
  }
  
  drop(): boolean {
    if (!this.currentPiece) return false
    
    if (!this.movePiece(0, 1)) {
      this.lockPiece()
      return false
    }
    return true
  }
  
  hardDrop(): void {
    if (!this.currentPiece) return
    
    while (this.movePiece(0, 1)) {
      this.score += 2
    }
    this.lockPiece()
  }
  
  lockPiece(): void {
    if (!this.currentPiece) return
    
    // Add piece to board
    for (let y = 0; y < this.currentPiece.shape.length; y++) {
      for (let x = 0; x < this.currentPiece.shape[y].length; x++) {
        if (this.currentPiece.shape[y][x]) {
          const boardY = this.currentPiece.y + y
          const boardX = this.currentPiece.x + x
          
          if (boardY >= 0) {
            this.board[boardY][boardX] = this.currentPiece.color
          }
        }
      }
    }
    
    this.clearLines()
    this.spawnPiece()
  }
  
  clearLines(): void {
    let linesCleared = 0
    
    for (let y = BOARD_HEIGHT - 1; y >= 0; y--) {
      if (this.board[y].every(cell => cell !== null)) {
        this.board.splice(y, 1)
        this.board.unshift(Array(BOARD_WIDTH).fill(null))
        linesCleared++
        y++ // Check the same line again
      }
    }
    
    if (linesCleared > 0) {
      this.lines += linesCleared
      this.score += linesCleared * 100 * this.level
      this.level = Math.floor(this.lines / 10) + 1
    }
  }
  
  removeBottomLine(): void {
    // Remove the bottom line
    this.board.splice(BOARD_HEIGHT - 1, 1)
    // Add empty line at top
    this.board.unshift(Array(BOARD_WIDTH).fill(null))
  }
  
  getDisplayBoard(): Board {
    const display = this.board.map(row => [...row])
    
    if (this.currentPiece) {
      for (let y = 0; y < this.currentPiece.shape.length; y++) {
        for (let x = 0; x < this.currentPiece.shape[y].length; x++) {
          if (this.currentPiece.shape[y][x]) {
            const boardY = this.currentPiece.y + y
            const boardX = this.currentPiece.x + x
            
            if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
              display[boardY][boardX] = this.currentPiece.color
            }
          }
        }
      }
    }
    
    return display
  }
}