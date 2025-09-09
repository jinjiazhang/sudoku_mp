// profile.ts
export {}
const { SudokuService } = require('../../utils/sudoku-service.js')

interface GameStats {
  totalGames: number
  completedGames: number
  bestTime: string
  averageTime: string
}

Component({
  data: {
    gameStats: {
      totalGames: 0,
      completedGames: 0,
      bestTime: '--:--',
      averageTime: '--:--'
    } as GameStats
  },

  lifetimes: {
    attached() {
      this.loadGameStats()
    }
  },

  pageLifetimes: {
    show() {
      this.loadGameStats()
    }
  },

  methods: {
    // 加载游戏统计数据
    loadGameStats() {
      try {
        const stats = wx.getStorageSync('gameStats') || {
          totalGames: 0,
          completedGames: 0,
          bestTimeSeconds: 0,
          totalTimeSeconds: 0,
          completedGamesHistory: []
        }

        const gameStats: GameStats = {
          totalGames: stats.totalGames,
          completedGames: stats.completedGames,
          bestTime: stats.bestTimeSeconds > 0 ? SudokuService.formatTime(stats.bestTimeSeconds) : '--:--',
          averageTime: stats.completedGames > 0 
            ? SudokuService.formatTime(Math.floor(stats.totalTimeSeconds / stats.completedGames))
            : '--:--'
        }

        this.setData({ gameStats })
      } catch (error) {
        console.error('加载游戏统计数据失败:', error)
      }
    }
  }
})