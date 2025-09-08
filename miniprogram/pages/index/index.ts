// index.ts
export {}
const { SudokuService } = require('../../utils/sudoku-service.js')
const { getDifficultyValues } = require('../../utils/sudoku-game.js')

Component({
  data: {
    hasOngoingGame: false,
    savedGameDifficulty: '',
    selectedDifficulty: 1
  },

  lifetimes: {
    attached() {
      this.checkSavedGame()
    },
    
    ready() {
      this.checkSavedGame()
    }
  },

  pageLifetimes: {
    show() {
      this.checkSavedGame()
    }
  },

  methods: {
    // 检查是否有保存的游戏
    checkSavedGame() {
      const hasOngoingGame = SudokuService.hasSavedGame()
      let savedGameDifficulty = ''
      
      if (hasOngoingGame) {
        const savedGame = SudokuService.getSavedGame()
        if (savedGame) {
          savedGameDifficulty = savedGame.difficulty
        }
      }
      
      this.setData({
        hasOngoingGame,
        savedGameDifficulty
      })
    },

    // 开始新游戏
    startNewGame() {
      const difficultyValues = getDifficultyValues()
      const difficulty = difficultyValues[this.data.selectedDifficulty - 1]
      this.startNewGameWithDifficulty(difficulty)
    },

    // 以指定难度开始新游戏
    startNewGameWithDifficulty(difficulty: any) {
      this.setData({
        hasOngoingGame: true,
        savedGameDifficulty: difficulty.displayName
      })
      
      wx.navigateTo({
        url: `../sudoku/sudoku?difficulty=${difficulty.displayName}`
      })
    },

    // 继续游戏
    continueGame() {
      if (this.data.savedGameDifficulty) {
        wx.navigateTo({
          url: `../sudoku/sudoku?difficulty=${this.data.savedGameDifficulty}&isResuming=true`
        })
      }
    },

    // 重新开始
    restartGame() {
      this.setData({
        hasOngoingGame: false,
        savedGameDifficulty: ''
      })
      SudokuService.clearSavedGame()
    },

    // 难度改变事件
    onDifficultyChange(e: any) {
      this.setData({
        selectedDifficulty: e.detail.value
      })
    }
  }
})
