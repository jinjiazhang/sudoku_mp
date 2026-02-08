// sudoku.ts
export { }
const { SudokuService } = require('./sudoku-service.js')
import { SudokuGame, getDifficultyFromName } from './sudoku-game'

interface CellData {
  row: number
  col: number
  value: number
  notes: number[]
  hasNotes: boolean
  noteFlags: { [key: number]: boolean }
  className: string
  textClass: string
}

interface SubGridData {
  cells: CellData[]
}

Page({
  data: {
    game: {} as SudokuGame,
    selectedRow: -1,
    selectedCol: -1,
    selectedNumber: 0,
    isNoteMode: false,
    isHintSelected: false,
    isCheckMode: false,
    formattedTime: '00:00',
    subGrids: [] as SubGridData[],
    numberRange: [] as number[],
    showCompleteDialog: false,
    gameTimer: null as any
  },

  // 分享给好友
  onShareAppMessage() {
    return {
      title: '来挑战数独吧！',
      path: '/pages/sudoku-menu/sudoku-menu'
    }
  },

  // 分享到朋友圈
  onShareTimeline() {
    return {
      title: 'ForceZone - 数独',
      query: ''
    }
  },

  onLoad(options: any) {
    const difficulty = options.difficulty || '1级'
    const isResuming = options.isResuming === 'true'

    this.initializeGame(difficulty, isResuming)
    this.startTimer()
  },

  onUnload() {
    if (this.data.gameTimer) {
      clearInterval(this.data.gameTimer)
    }
  },

  // 初始化游戏
  initializeGame(difficulty: string, isResuming: boolean) {
    let game: SudokuGame

    if (isResuming) {
      const savedGame = SudokuService.getSavedGame()
      if (savedGame) {
        game = savedGame
      } else {
        const difficultyObj = getDifficultyFromName(difficulty)
        game = SudokuService.createNewGame(difficultyObj)
      }
    } else {
      const difficultyObj = getDifficultyFromName(difficulty)
      game = SudokuService.createNewGame(difficultyObj)
      SudokuService.saveGame(game)
      this.recordGameStart()
    }

    const difficultyObj = getDifficultyFromName(game.difficulty)
    const numberRange = Array.from({ length: difficultyObj ? difficultyObj.numberRange : 9 }, (_, i) => i + 1)

    this.setData({
      game,
      numberRange,
      formattedTime: SudokuService.formatTime(game.secondsElapsed)
    })

    this.updateBoardDisplay()
  },

  // 开始计时器
  startTimer() {
    const timer = setInterval(() => {
      const newGame = this.data.game.copyWith({
        secondsElapsed: this.data.game.secondsElapsed + 1
      })

      this.setData({
        game: newGame,
        formattedTime: SudokuService.formatTime(newGame.secondsElapsed)
      })

      SudokuService.saveGame(newGame)
    }, 1000)

    this.setData({ gameTimer: timer })
  },

  // 选择单元格
  selectCell(e: any) {
    const { row, col } = e.currentTarget.dataset
    this.setData({
      selectedRow: row,
      selectedCol: col,
      isHintSelected: false,
      isCheckMode: false
    })
    this.updateBoardDisplay()
  },

  // 输入数字
  inputNumber(e: any) {
    const number = parseInt(e.currentTarget.dataset.number)
    if (this.data.selectedRow === -1 || this.data.selectedCol === -1) return

    let newGame
    if (this.data.isNoteMode) {
      // 备注模式：切换备注数字
      newGame = SudokuService.toggleNote(
        this.data.game,
        this.data.selectedRow,
        this.data.selectedCol,
        number
      )
    } else {
      // 普通模式：放置数字
      newGame = SudokuService.placeNumber(
        this.data.game,
        this.data.selectedRow,
        this.data.selectedCol,
        number
      )
    }

    this.setData({
      game: newGame,
      selectedNumber: number,
      isCheckMode: false
    })

    SudokuService.saveGame(newGame)
    this.updateBoardDisplay()

    // 检查游戏是否完成（只在普通模式下检查）
    if (!this.data.isNoteMode && SudokuService.isGameComplete(newGame)) {
      if (this.data.gameTimer) {
        clearInterval(this.data.gameTimer)
      }
      SudokuService.clearSavedGame()
      this.recordGameCompletion(newGame)
      this.showGameCompleteDialog()
    }
  },

  // 擦除单元格
  eraseCell() {
    if (this.data.selectedRow === -1 || this.data.selectedCol === -1) return

    const newGame = SudokuService.eraseCell(
      this.data.game,
      this.data.selectedRow,
      this.data.selectedCol
    )

    this.setData({
      game: newGame,
      isCheckMode: false
    })

    SudokuService.saveGame(newGame)
    this.updateBoardDisplay()
  },

  // 检查游戏
  checkGame() {
    if (this.data.game.checkCount <= 0) return

    const newCheckMode = !this.data.isCheckMode
    let newGame = this.data.game

    if (newCheckMode) {
      newGame = this.data.game.copyWith({
        checkCount: this.data.game.checkCount - 1
      })
      SudokuService.saveGame(newGame)
    }

    this.setData({
      isCheckMode: newCheckMode,
      game: newGame
    })

    this.updateBoardDisplay()
  },

  // 切换备注模式
  toggleNoteMode() {
    this.setData({
      isNoteMode: !this.data.isNoteMode
    })
  },

  // 显示提示
  showHint() {
    if (this.data.game.hintCount <= 0) return

    const hint = SudokuService.getSmartHint(this.data.game)
    if (hint) {
      const newGame = this.data.game.copyWith({
        hintCount: this.data.game.hintCount - 1
      })

      this.setData({
        selectedRow: hint.row,
        selectedCol: hint.col,
        isHintSelected: true,
        game: newGame
      })

      SudokuService.saveGame(newGame)
      this.updateBoardDisplay()
    }
  },

  // 更新棋盘显示
  updateBoardDisplay() {
    const game = this.data.game
    const subGrids: SubGridData[] = []
    const gridSize = game.gridSize

    // 根据不同的网格大小确定子棋盘的尺寸
    let subRows, subCols, subGridRows, subGridCols
    switch (gridSize) {
      case 4:
        subRows = 2; subCols = 2; subGridRows = 2; subGridCols = 2
        break
      case 6:
        subRows = 3; subCols = 2; subGridRows = 2; subGridCols = 3
        break
      case 9:
      default:
        subRows = 3; subCols = 3; subGridRows = 3; subGridCols = 3
        break
    }

    // 创建子棋盘
    for (let subGridIndex = 0; subGridIndex < subRows * subCols; subGridIndex++) {
      const subGridRow = Math.floor(subGridIndex / subCols)
      const subGridCol = subGridIndex % subCols

      const cells: CellData[] = []

      // 填充子棋盘中的每个单元格
      for (let cellIndex = 0; cellIndex < subGridRows * subGridCols; cellIndex++) {
        const cellRow = Math.floor(cellIndex / subGridCols)
        const cellCol = cellIndex % subGridCols

        // 计算在整个棋盘中的实际位置
        const actualRow = subGridRow * subGridRows + cellRow
        const actualCol = subGridCol * subGridCols + cellCol

        const notes = game.board[actualRow][actualCol] === 0 ? game.notes[actualRow][actualCol] : new Set()
        const noteFlags: { [key: number]: boolean } = {}
        for (let i = 1; i <= 9; i++) {
          noteFlags[i] = notes.has(i)
        }

        const cell: CellData = {
          row: actualRow,
          col: actualCol,
          value: game.board[actualRow][actualCol],
          notes: Array.from(notes).sort(),
          hasNotes: notes.size > 0,
          noteFlags: noteFlags,
          className: this.getCellClassName(actualRow, actualCol),
          textClass: this.getCellTextClass(actualRow, actualCol)
        }
        cells.push(cell)
      }

      subGrids.push({ cells })
    }

    this.setData({ subGrids })
  },

  // 获取单元格样式类名
  getCellClassName(row: number, col: number): string {
    const classes = ['cell']
    const isSelected = row === this.data.selectedRow && col === this.data.selectedCol
    const isHighlighted = this.isHighlightedCell(row, col)
    const isSameNumber = this.isSameNumberCell(row, col)
    const hasConflict = SudokuService.hasConflict(this.data.game, row, col)

    // 检查模式：显示输入格子的冲突状态
    if (this.data.isCheckMode &&
      this.data.game.board[row][col] !== 0 &&
      !this.data.game.isFixed[row][col]) {
      if (hasConflict) {
        classes.push('conflict')
      } else {
        classes.push('correct')
      }
    }
    // 正常模式
    else if (isSelected) {
      if (this.data.isHintSelected) {
        classes.push('hint-selected')
      } else {
        classes.push('selected')
      }
    } else if (isSameNumber) {
      classes.push('same-number')
    } else if (isHighlighted) {
      classes.push('highlighted')
    }

    return classes.join(' ')
  },

  // 获取单元格文本样式类名
  getCellTextClass(row: number, col: number): string {
    if (this.data.game.isFixed[row][col]) {
      return 'fixed'
    } else {
      return 'user'
    }
  },


  // 判断单元格是否需要高亮显示
  isHighlightedCell(row: number, col: number): boolean {
    if (this.data.selectedRow === -1 || this.data.selectedCol === -1) return false

    // 高亮同行、同列的单元格
    if (row === this.data.selectedRow || col === this.data.selectedCol) return true

    // 高亮同子区域的单元格
    if (this.isInSameSubRegion(row, col, this.data.selectedRow, this.data.selectedCol)) return true

    // 如果选中的单元格有数字，高亮棋盘上所有相同数字的单元格
    const selectedNumber = this.data.game.board[this.data.selectedRow][this.data.selectedCol]
    if (selectedNumber !== 0 && this.data.game.board[row][col] === selectedNumber) {
      return true
    }

    return false
  },

  // 判断是否为相同数字且非当前选中单元格
  isSameNumberCell(row: number, col: number): boolean {
    if (this.data.selectedRow === -1 || this.data.selectedCol === -1) return false
    if (row === this.data.selectedRow && col === this.data.selectedCol) return false

    const selectedNumber = this.data.game.board[this.data.selectedRow][this.data.selectedCol]
    return selectedNumber !== 0 && this.data.game.board[row][col] === selectedNumber
  },

  // 判断两个单元格是否在同一子区域
  isInSameSubRegion(row1: number, col1: number, row2: number, col2: number): boolean {
    const gridSize = this.data.game.gridSize
    switch (gridSize) {
      case 4:
        return Math.floor(row1 / 2) === Math.floor(row2 / 2) &&
          Math.floor(col1 / 2) === Math.floor(col2 / 2)
      case 6:
        return Math.floor(row1 / 2) === Math.floor(row2 / 2) &&
          Math.floor(col1 / 3) === Math.floor(col2 / 3)
      case 9:
      default:
        return Math.floor(row1 / 3) === Math.floor(row2 / 3) &&
          Math.floor(col1 / 3) === Math.floor(col2 / 3)
    }
  },

  // 显示游戏完成对话框
  showGameCompleteDialog() {
    this.setData({
      showCompleteDialog: true
    })
  },

  // 返回主页
  backToHome() {
    // 关闭对话框并返回主页
    this.setData({
      showCompleteDialog: false
    })
    wx.navigateBack()
  },

  // 记录游戏开始
  recordGameStart() {
    try {
      const stats = wx.getStorageSync('gameStats') || {
        totalGames: 0,
        completedGames: 0,
        bestTimeSeconds: 0,
        totalTimeSeconds: 0,
        completedGamesHistory: []
      }

      stats.totalGames += 1
      wx.setStorageSync('gameStats', stats)
    } catch (error) {
      console.error('记录游戏开始失败:', error)
    }
  },

  // 记录游戏完成
  recordGameCompletion(game: SudokuGame) {
    try {
      const stats = wx.getStorageSync('gameStats') || {
        totalGames: 0,
        completedGames: 0,
        bestTimeSeconds: 0,
        totalTimeSeconds: 0,
        completedGamesHistory: []
      }

      // 更新统计数据
      stats.completedGames += 1
      stats.totalTimeSeconds += game.secondsElapsed

      // 更新最佳时间
      if (stats.bestTimeSeconds === 0 || game.secondsElapsed < stats.bestTimeSeconds) {
        stats.bestTimeSeconds = game.secondsElapsed
      }

      // 添加到历史记录
      stats.completedGamesHistory = stats.completedGamesHistory || []
      stats.completedGamesHistory.push({
        difficulty: game.difficulty,
        timeSeconds: game.secondsElapsed,
        completedAt: new Date().toISOString()
      })

      // 保持最近100场记录
      if (stats.completedGamesHistory.length > 100) {
        stats.completedGamesHistory = stats.completedGamesHistory.slice(-100)
      }

      wx.setStorageSync('gameStats', stats)
    } catch (error) {
      console.error('记录游戏完成失败:', error)
    }
  },

  // 再来一局
  playAgain() {
    const difficultyObj = getDifficultyFromName(this.data.game.difficulty)
    if (difficultyObj) {
      // 先清除计时器
      if (this.data.gameTimer) {
        clearInterval(this.data.gameTimer)
      }

      // 重置游戏状态
      this.setData({
        showCompleteDialog: false,
        selectedRow: -1,
        selectedCol: -1,
        selectedNumber: 0,
        isNoteMode: false,
        isHintSelected: false,
        isCheckMode: false
      })

      // 创建新游戏
      this.initializeGame(difficultyObj.displayName, false)
      // 重新启动计时器
      this.startTimer()
    }
  }
})