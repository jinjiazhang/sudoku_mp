// gomoku.ts
export { }
const { GomokuService, BOARD_SIZE, EMPTY, BLACK, WHITE } = require('../../utils/gomoku-service.js')

interface CellData {
  row: number
  col: number
  stone: number
  isLast: boolean
  isWinning: boolean
  position: string
  isStarPoint: boolean
}

Page({
  data: {
    game: {} as any,
    boardData: [] as CellData[][],
    formattedTime: '00:00',
    showCompleteDialog: false,
    resultText: '',
    isThinking: false,
    gameMode: 'pve', // 'pve' or 'pvp'
    playerColor: 'black', // 'black' or 'white' (for PvE)
  },

  timer: null as any,

  onLoad(options: any) {
    if (options.action === 'resume') {
      // Resume logic handled in initializeGame
    } else {
      // New game settings
      const mode = options.mode || 'pve'
      const color = options.playerColor || 'black'
      this.setData({
        gameMode: mode,
        playerColor: color
      })
    }
    this.initializeGame()
  },

  onUnload() {
    this.stopTimer()
    if (this.data.game && !this.data.game.gameOver) {
      // Save extra metadata if needed, but for now simple game state is enough
      // ideally we should save mode/color too, but GomokuService needs update for that
      // For now, let's just save the game state.
      GomokuService.saveGame(this.data.game)
    }
  },

  onHide() {
    this.stopTimer()
    if (this.data.game && !this.data.game.gameOver) {
      GomokuService.saveGame(this.data.game)
    }
  },

  initializeGame() {
    const savedGame = GomokuService.getSavedGame()
    let game: any

    if (savedGame && !savedGame.gameOver && this.data.gameMode === 'pve') { // Simple resume for now
      game = savedGame
    } else {
      game = GomokuService.createGame()
      GomokuService.clearSavedGame()
    }

    this.setData({ game })
    this.updateBoardDisplay()
    this.startTimer()

    // If PvE and player is White, AI (Black) moves first
    if (this.data.gameMode === 'pve' && this.data.playerColor === 'white' && game.moveHistory.length === 0) {
      this.aiMove()
    }
  },

  startTimer() {
    this.stopTimer()
    this.timer = setInterval(() => {
      const game = this.data.game
      game.secondsElapsed++
      const minutes = Math.floor(game.secondsElapsed / 60)
      const seconds = game.secondsElapsed % 60
      this.setData({
        'game.secondsElapsed': game.secondsElapsed,
        formattedTime: `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      })
    }, 1000)
  },

  stopTimer() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  },

  updateBoardDisplay() {
    const game = this.data.game
    const boardData: CellData[][] = []
    const winningStones = game.gameOver && game.winner ? GomokuService.getWinningStones(game) : []
    const winningSet = new Set(winningStones.map((s: any) => `${s.row},${s.col}`))
    const starPoints = new Set(['3,3', '3,11', '7,7', '11,3', '11,11'])

    for (let i = 0; i < BOARD_SIZE; i++) {
      boardData[i] = []
      for (let j = 0; j < BOARD_SIZE; j++) {
        let position = 'center'
        if (i === 0 && j === 0) position = 'top-left'
        else if (i === 0 && j === BOARD_SIZE - 1) position = 'top-right'
        else if (i === BOARD_SIZE - 1 && j === 0) position = 'bottom-left'
        else if (i === BOARD_SIZE - 1 && j === BOARD_SIZE - 1) position = 'bottom-right'
        else if (i === 0) position = 'top'
        else if (i === BOARD_SIZE - 1) position = 'bottom'
        else if (j === 0) position = 'left'
        else if (j === BOARD_SIZE - 1) position = 'right'

        boardData[i][j] = {
          row: i,
          col: j,
          stone: game.board[i][j],
          isLast: game.lastMove && game.lastMove.row === i && game.lastMove.col === j,
          isWinning: winningSet.has(`${i},${j}`),
          position,
          isStarPoint: starPoints.has(`${i},${j}`)
        }
      }
    }

    this.setData({ boardData })
  },

  onCellTap(e: any) {
    const { row, col } = e.currentTarget.dataset
    const game = this.data.game
    const { gameMode, playerColor, isThinking } = this.data

    if (game.gameOver || isThinking) return

    // Check legality based on mode
    let canMove = false
    if (gameMode === 'pvp') {
      canMove = true // Any turn is valid for the current player
    } else {
      // PvE
      const playerSide = playerColor === 'black' ? BLACK : WHITE
      if (game.currentPlayer === playerSide) {
        canMove = true
      }
    }

    if (!canMove) return

    if (GomokuService.placeStone(game, row, col)) {
      this.setData({ game })
      this.updateBoardDisplay()

      if (game.gameOver) {
        this.handleGameOver()
        return
      }

      // If PvE, trigger AI
      if (gameMode === 'pve') {
        this.aiMove()
      }
    }
  },

  aiMove() {
    const game = this.data.game
    // Check if it's actually AI's turn
    const aiColor = this.data.playerColor === 'black' ? WHITE : BLACK
    if (game.currentPlayer !== aiColor) return

    this.setData({ isThinking: true })

    setTimeout(() => {
      const move = GomokuService.getAIMove(game)
      if (move) {
        GomokuService.placeStone(game, move.row, move.col)
        this.setData({ game, isThinking: false })
        this.updateBoardDisplay()

        if (game.gameOver) {
          this.handleGameOver()
        }
      } else {
        this.setData({ isThinking: false })
      }
    }, 500)
  },

  handleGameOver() {
    this.stopTimer()
    GomokuService.clearSavedGame()

    let resultText = ''
    if (this.data.gameMode === 'pvp') {
      resultText = this.data.game.winner === BLACK ? '黑棋获胜' : '白棋获胜'
    } else {
      const playerSide = this.data.playerColor === 'black' ? BLACK : WHITE
      if (this.data.game.winner === playerSide) {
        resultText = '你赢了！'
      } else if (this.data.game.winner === (playerSide === BLACK ? WHITE : BLACK)) {
        resultText = 'AI 获胜'
      } else {
        resultText = '平局'
      }
    }

    this.setData({
      showCompleteDialog: true,
      resultText
    })
  },

  undoMove() {
    const game = this.data.game
    if (game.gameOver || this.data.isThinking) return

    if (this.data.gameMode === 'pvp') {
      if (game.moveHistory.length < 1) return

      // PvP undo 1 step
      const lastMove = game.moveHistory.pop()
      game.board[lastMove.row][lastMove.col] = EMPTY

      // Update last move
      if (game.moveHistory.length > 0) {
        game.lastMove = game.moveHistory[game.moveHistory.length - 1]
      } else {
        game.lastMove = null
      }

      // Switch player back
      game.currentPlayer = lastMove.player

      this.setData({ game })
      this.updateBoardDisplay()

    } else {
      // PvE undo 2 steps (player + AI)
      if (game.moveHistory.length < 2) return

      // 1. Undo AI (or Player if it was player's turn?? Logic is usually Undo to BEFORE player's last move)
      // Actually, if it is Player's turn now, it means AI just moved (or no one moved). 
      // We want to undo AI move AND Player move.

      const aiMove = game.moveHistory.pop()
      game.board[aiMove.row][aiMove.col] = EMPTY

      const playerMove = game.moveHistory.pop()
      game.board[playerMove.row][playerMove.col] = EMPTY

      if (game.moveHistory.length > 0) {
        game.lastMove = game.moveHistory[game.moveHistory.length - 1]
      } else {
        game.lastMove = null
      }

      // Ensure it's player's turn
      // If we popped AI and Player, currentPlayer should be Player
      // Current logic in GomokuService toggles player automatically. 
      // If we manually manipulate board, we must fix currentPlayer.
      // In PvE, if we undo 2, we return to the state 2 turns ago, so currentPlayer should be unchanged (Player's turn).

      this.setData({ game })
      this.updateBoardDisplay()
    }
  },

  restartGame() {
    this.stopTimer()
    GomokuService.clearSavedGame()

    const game = GomokuService.createGame()
    this.setData({
      game,
      showCompleteDialog: false,
      formattedTime: '00:00'
    })
    this.updateBoardDisplay()
    this.startTimer()

    // If PvE and White, AI moves first
    if (this.data.gameMode === 'pve' && this.data.playerColor === 'white') {
      this.aiMove()
    }
  },

  playAgain() {
    this.restartGame()
  },

  backToHome() {
    GomokuService.clearSavedGame()
    wx.navigateBack() // Go back to menu
  }
})
