/**
 * 五子棋游戏服务
 * 包含游戏逻辑、AI对手、胜负判断等功能
 */

const BOARD_SIZE = 15
const EMPTY = 0
const BLACK = 1  // 玩家（先手）
const WHITE = 2  // AI

class GomokuGame {
  constructor() {
    this.board = []
    this.currentPlayer = BLACK
    this.gameOver = false
    this.winner = null
    this.lastMove = null
    this.moveHistory = []
    this.secondsElapsed = 0
    this.initBoard()
  }

  initBoard() {
    this.board = []
    for (let i = 0; i < BOARD_SIZE; i++) {
      this.board[i] = []
      for (let j = 0; j < BOARD_SIZE; j++) {
        this.board[i][j] = EMPTY
      }
    }
  }

  toJson() {
    return JSON.stringify({
      board: this.board,
      currentPlayer: this.currentPlayer,
      gameOver: this.gameOver,
      winner: this.winner,
      lastMove: this.lastMove,
      moveHistory: this.moveHistory,
      secondsElapsed: this.secondsElapsed
    })
  }

  static fromJson(json) {
    const data = JSON.parse(json)
    const game = new GomokuGame()
    game.board = data.board
    game.currentPlayer = data.currentPlayer
    game.gameOver = data.gameOver
    game.winner = data.winner
    game.lastMove = data.lastMove
    game.moveHistory = data.moveHistory || []
    game.secondsElapsed = data.secondsElapsed || 0
    return game
  }
}

class GomokuService {
  // 检查位置是否有效
  static isValidPosition(row, col) {
    return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE
  }

  // 检查是否可以落子
  static canPlace(game, row, col) {
    if (game.gameOver) return false
    if (!this.isValidPosition(row, col)) return false
    return game.board[row][col] === EMPTY
  }

  // 落子
  static placeStone(game, row, col) {
    if (!this.canPlace(game, row, col)) return false

    game.board[row][col] = game.currentPlayer
    game.lastMove = { row, col }
    game.moveHistory.push({ row, col, player: game.currentPlayer })

    // 检查胜负
    if (this.checkWin(game, row, col)) {
      game.gameOver = true
      game.winner = game.currentPlayer
    } else if (this.isBoardFull(game)) {
      game.gameOver = true
      game.winner = null // 平局
    } else {
      // 切换玩家
      game.currentPlayer = game.currentPlayer === BLACK ? WHITE : BLACK
    }

    return true
  }

  // 检查棋盘是否已满
  static isBoardFull(game) {
    for (let i = 0; i < BOARD_SIZE; i++) {
      for (let j = 0; j < BOARD_SIZE; j++) {
        if (game.board[i][j] === EMPTY) return false
      }
    }
    return true
  }

  // 检查是否获胜（五子连珠）
  static checkWin(game, row, col) {
    const player = game.board[row][col]
    if (player === EMPTY) return false

    const directions = [
      [0, 1],   // 水平
      [1, 0],   // 垂直
      [1, 1],   // 对角线
      [1, -1]   // 反对角线
    ]

    for (const [dr, dc] of directions) {
      let count = 1

      // 正向计数
      for (let i = 1; i < 5; i++) {
        const r = row + dr * i
        const c = col + dc * i
        if (this.isValidPosition(r, c) && game.board[r][c] === player) {
          count++
        } else {
          break
        }
      }

      // 反向计数
      for (let i = 1; i < 5; i++) {
        const r = row - dr * i
        const c = col - dc * i
        if (this.isValidPosition(r, c) && game.board[r][c] === player) {
          count++
        } else {
          break
        }
      }

      if (count >= 5) return true
    }

    return false
  }

  // 获取获胜的五子位置
  static getWinningStones(game) {
    if (!game.winner || !game.lastMove) return []

    const { row, col } = game.lastMove
    const player = game.board[row][col]

    const directions = [
      [0, 1],   // 水平
      [1, 0],   // 垂直
      [1, 1],   // 对角线
      [1, -1]   // 反对角线
    ]

    for (const [dr, dc] of directions) {
      const stones = [{ row, col }]

      // 正向
      for (let i = 1; i < 5; i++) {
        const r = row + dr * i
        const c = col + dc * i
        if (this.isValidPosition(r, c) && game.board[r][c] === player) {
          stones.push({ row: r, col: c })
        } else {
          break
        }
      }

      // 反向
      for (let i = 1; i < 5; i++) {
        const r = row - dr * i
        const c = col - dc * i
        if (this.isValidPosition(r, c) && game.board[r][c] === player) {
          stones.push({ row: r, col: c })
        } else {
          break
        }
      }

      if (stones.length >= 5) {
        return stones.slice(0, 5)
      }
    }

    return []
  }

  // AI 落子（简单策略）
  static getAIMove(game) {
    // 策略优先级:
    // 1. 自己能赢就赢
    // 2. 阻止对手赢
    // 3. 找最佳位置

    const opponent = BLACK
    const ai = WHITE

    // 1. 检查AI能否直接获胜
    const winMove = this.findWinningMove(game, ai)
    if (winMove) return winMove

    // 2. 检查是否需要阻止对手获胜
    const blockMove = this.findWinningMove(game, opponent)
    if (blockMove) return blockMove

    // 3. 检查AI能否形成活四或冲四
    const fourMove = this.findFourMove(game, ai)
    if (fourMove) return fourMove

    // 4. 阻止对手形成活四
    const blockFourMove = this.findFourMove(game, opponent)
    if (blockFourMove) return blockFourMove

    // 5. 形成活三
    const threeMove = this.findThreeMove(game, ai)
    if (threeMove) return threeMove

    // 6. 阻止对手活三
    const blockThreeMove = this.findThreeMove(game, opponent)
    if (blockThreeMove) return blockThreeMove

    // 7. 使用评估函数找最佳位置
    return this.findBestMove(game)
  }

  // 找能直接获胜的位置
  static findWinningMove(game, player) {
    for (let i = 0; i < BOARD_SIZE; i++) {
      for (let j = 0; j < BOARD_SIZE; j++) {
        if (game.board[i][j] === EMPTY) {
          game.board[i][j] = player
          const wins = this.checkWin(game, i, j)
          game.board[i][j] = EMPTY
          if (wins) return { row: i, col: j }
        }
      }
    }
    return null
  }

  // 找能形成四子的位置
  static findFourMove(game, player) {
    for (let i = 0; i < BOARD_SIZE; i++) {
      for (let j = 0; j < BOARD_SIZE; j++) {
        if (game.board[i][j] === EMPTY) {
          if (this.countPattern(game, i, j, player, 4) > 0) {
            return { row: i, col: j }
          }
        }
      }
    }
    return null
  }

  // 找能形成活三的位置
  static findThreeMove(game, player) {
    for (let i = 0; i < BOARD_SIZE; i++) {
      for (let j = 0; j < BOARD_SIZE; j++) {
        if (game.board[i][j] === EMPTY) {
          if (this.countOpenPattern(game, i, j, player, 3) > 0) {
            return { row: i, col: j }
          }
        }
      }
    }
    return null
  }

  // 计算在某位置落子后，某个方向上连续的同色棋子数
  static countInDirection(game, row, col, player, dr, dc) {
    let count = 0
    let r = row + dr
    let c = col + dc

    while (this.isValidPosition(r, c) && game.board[r][c] === player) {
      count++
      r += dr
      c += dc
    }

    return count
  }

  // 计算某位置能形成的特定长度连珠数
  static countPattern(game, row, col, player, length) {
    const directions = [[0, 1], [1, 0], [1, 1], [1, -1]]
    let count = 0

    for (const [dr, dc] of directions) {
      const forward = this.countInDirection(game, row, col, player, dr, dc)
      const backward = this.countInDirection(game, row, col, player, -dr, -dc)
      if (forward + backward + 1 >= length) {
        count++
      }
    }

    return count
  }

  // 计算开放的（两端不被堵）特定长度连珠数
  static countOpenPattern(game, row, col, player, length) {
    const directions = [[0, 1], [1, 0], [1, 1], [1, -1]]
    let count = 0

    for (const [dr, dc] of directions) {
      const forward = this.countInDirection(game, row, col, player, dr, dc)
      const backward = this.countInDirection(game, row, col, player, -dr, -dc)

      if (forward + backward + 1 >= length) {
        // 检查两端是否开放
        const endR1 = row + dr * (forward + 1)
        const endC1 = col + dc * (forward + 1)
        const endR2 = row - dr * (backward + 1)
        const endC2 = col - dc * (backward + 1)

        const open1 = this.isValidPosition(endR1, endC1) && game.board[endR1][endC1] === EMPTY
        const open2 = this.isValidPosition(endR2, endC2) && game.board[endR2][endC2] === EMPTY

        if (open1 && open2) {
          count++
        }
      }
    }

    return count
  }

  // 评估某位置的分数
  static evaluatePosition(game, row, col) {
    let score = 0
    const ai = WHITE
    const opponent = BLACK

    // 距离中心的距离（中心位置更有价值）
    const centerDist = Math.abs(row - 7) + Math.abs(col - 7)
    score += (14 - centerDist) * 2

    // AI的连珠加分
    game.board[row][col] = ai
    score += this.countPattern(game, row, col, ai, 4) * 1000
    score += this.countOpenPattern(game, row, col, ai, 3) * 100
    score += this.countPattern(game, row, col, ai, 3) * 50
    score += this.countOpenPattern(game, row, col, ai, 2) * 10
    game.board[row][col] = EMPTY

    // 阻止对手的连珠加分
    game.board[row][col] = opponent
    score += this.countPattern(game, row, col, opponent, 4) * 900
    score += this.countOpenPattern(game, row, col, opponent, 3) * 90
    score += this.countPattern(game, row, col, opponent, 3) * 40
    score += this.countOpenPattern(game, row, col, opponent, 2) * 8
    game.board[row][col] = EMPTY

    // 附近有棋子的位置更有价值
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue
        const r = row + dr
        const c = col + dc
        if (this.isValidPosition(r, c) && game.board[r][c] !== EMPTY) {
          score += 5
        }
      }
    }

    return score
  }

  // 找最佳落子位置
  static findBestMove(game) {
    let bestScore = -Infinity
    let bestMove = null

    // 如果棋盘为空，下在中心
    if (game.moveHistory.length === 0) {
      return { row: 7, col: 7 }
    }

    // 只考虑已有棋子附近的位置
    const candidates = this.getCandidatePositions(game)

    for (const { row, col } of candidates) {
      const score = this.evaluatePosition(game, row, col)
      if (score > bestScore) {
        bestScore = score
        bestMove = { row, col }
      }
    }

    return bestMove
  }

  // 获取候选落子位置（已有棋子附近2格内的空位）
  static getCandidatePositions(game) {
    const candidates = []
    const checked = new Set()

    for (let i = 0; i < BOARD_SIZE; i++) {
      for (let j = 0; j < BOARD_SIZE; j++) {
        if (game.board[i][j] !== EMPTY) {
          // 检查周围2格
          for (let dr = -2; dr <= 2; dr++) {
            for (let dc = -2; dc <= 2; dc++) {
              const r = i + dr
              const c = j + dc
              const key = `${r},${c}`
              if (this.isValidPosition(r, c) && game.board[r][c] === EMPTY && !checked.has(key)) {
                checked.add(key)
                candidates.push({ row: r, col: c })
              }
            }
          }
        }
      }
    }

    return candidates
  }

  // 创建新游戏
  static createGame() {
    return new GomokuGame()
  }

  // 保存游戏
  static saveGame(game) {
    try {
      wx.setStorageSync('gomokuSavedGame', game.toJson())
      return true
    } catch (e) {
      console.error('保存五子棋游戏失败:', e)
      return false
    }
  }

  // 获取保存的游戏
  static getSavedGame() {
    try {
      const json = wx.getStorageSync('gomokuSavedGame')
      if (json) {
        return GomokuGame.fromJson(json)
      }
    } catch (e) {
      console.error('读取五子棋保存游戏失败:', e)
    }
    return null
  }

  // 清除保存的游戏
  static clearSavedGame() {
    try {
      wx.removeStorageSync('gomokuSavedGame')
    } catch (e) {
      console.error('清除五子棋保存游戏失败:', e)
    }
  }

  // 是否有保存的游戏
  static hasSavedGame() {
    try {
      return !!wx.getStorageSync('gomokuSavedGame')
    } catch (e) {
      return false
    }
  }
}

module.exports = {
  GomokuGame,
  GomokuService,
  BOARD_SIZE,
  EMPTY,
  BLACK,
  WHITE
}
