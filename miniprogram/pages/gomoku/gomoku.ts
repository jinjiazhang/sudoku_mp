// gomoku.ts
export { }
const { GomokuService, GomokuGame, BOARD_SIZE, EMPTY, BLACK, WHITE } = require('../../utils/gomoku-service.js')

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
    isThinking: false
  },

  timer: null as any,

  onLoad() {
    this.initializeGame()
  },

  onUnload() {
    this.stopTimer()
    // 保存游戏进度
    if (this.data.game && !this.data.game.gameOver) {
      GomokuService.saveGame(this.data.game)
    }
  },

  onHide() {
    this.stopTimer()
    // 保存游戏进度
    if (this.data.game && !this.data.game.gameOver) {
      GomokuService.saveGame(this.data.game)
    }
  },

  initializeGame() {
    // 检查是否有保存的游戏
    const savedGame = GomokuService.getSavedGame()
    let game: any

    if (savedGame && !savedGame.gameOver) {
      game = savedGame
    } else {
      game = GomokuService.createGame()
      GomokuService.clearSavedGame()
    }

    this.setData({ game })
    this.updateBoardDisplay()
    this.startTimer()
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

    // 定义星位坐标
    const starPoints = new Set(['3,3', '3,11', '7,7', '11,3', '11,11'])

    for (let i = 0; i < BOARD_SIZE; i++) {
      boardData[i] = []
      for (let j = 0; j < BOARD_SIZE; j++) {
        // 确定位置类型，用于绘制网格线
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

    // 如果游戏结束或AI在思考或不是玩家回合，忽略点击
    if (game.gameOver || this.data.isThinking || game.currentPlayer !== BLACK) {
      return
    }

    // 玩家落子
    if (GomokuService.placeStone(game, row, col)) {
      this.setData({ game })
      this.updateBoardDisplay()

      // 检查游戏是否结束
      if (game.gameOver) {
        this.handleGameOver()
        return
      }

      // AI回合
      this.aiMove()
    }
  },

  aiMove() {
    this.setData({ isThinking: true })

    // 延迟一下让UI更新，模拟思考
    setTimeout(() => {
      const game = this.data.game
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
    }, 300)
  },

  handleGameOver() {
    this.stopTimer()
    GomokuService.clearSavedGame()

    let resultText = ''
    if (this.data.game.winner === BLACK) {
      resultText = '你赢了！'
    } else if (this.data.game.winner === WHITE) {
      resultText = 'AI 获胜'
    } else {
      resultText = '平局'
    }

    this.setData({
      showCompleteDialog: true,
      resultText
    })
  },

  // 悔棋（撤销最后两步：玩家和AI的）
  undoMove() {
    const game = this.data.game
    if (game.moveHistory.length < 2 || game.gameOver || this.data.isThinking) {
      return
    }

    // 撤销AI的棋
    const aiMove = game.moveHistory.pop()
    game.board[aiMove.row][aiMove.col] = EMPTY

    // 撤销玩家的棋
    const playerMove = game.moveHistory.pop()
    game.board[playerMove.row][playerMove.col] = EMPTY

    // 更新最后落子位置
    if (game.moveHistory.length > 0) {
      game.lastMove = game.moveHistory[game.moveHistory.length - 1]
    } else {
      game.lastMove = null
    }

    game.currentPlayer = BLACK

    this.setData({ game })
    this.updateBoardDisplay()
  },

  // 重新开始
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
  },

  // 再来一局
  playAgain() {
    this.restartGame()
  },

  // 返回主页
  backToHome() {
    GomokuService.clearSavedGame()
    wx.navigateBack()
  }
})
