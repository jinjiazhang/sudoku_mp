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
    },

    // 清除所有数据
    clearAllData() {
      wx.showModal({
        title: '确认清除',
        content: '确定要清除所有游戏数据吗？此操作不可恢复。',
        success: (res) => {
          if (res.confirm) {
            try {
              // 清除所有相关数据
              wx.removeStorageSync('savedGame')
              wx.removeStorageSync('gameStats')
              
              // 重置显示的统计数据
              this.setData({
                gameStats: {
                  totalGames: 0,
                  completedGames: 0,
                  bestTime: '--:--',
                  averageTime: '--:--'
                }
              })

              // 清除服务中的保存游戏
              SudokuService.clearSavedGame()

              wx.showToast({
                title: '数据已清除',
                icon: 'success'
              })
            } catch (error) {
              console.error('清除数据失败:', error)
              wx.showToast({
                title: '清除失败',
                icon: 'error'
              })
            }
          }
        }
      })
    },

    // 导出数据
    exportData() {
      try {
        const savedGame = wx.getStorageSync('savedGame')
        const gameStats = wx.getStorageSync('gameStats')
        
        const exportData = {
          savedGame,
          gameStats,
          exportTime: new Date().toISOString()
        }

        // 在小程序中，我们可以显示数据供用户复制
        const dataString = JSON.stringify(exportData, null, 2)
        
        wx.showModal({
          title: '导出数据',
          content: '数据已准备就绪，可复制到剪贴板',
          confirmText: '复制',
          success: (res) => {
            if (res.confirm) {
              wx.setClipboardData({
                data: dataString,
                success: () => {
                  wx.showToast({
                    title: '已复制到剪贴板',
                    icon: 'success'
                  })
                },
                fail: () => {
                  wx.showToast({
                    title: '复制失败',
                    icon: 'error'
                  })
                }
              })
            }
          }
        })
      } catch (error) {
        console.error('导出数据失败:', error)
        wx.showToast({
          title: '导出失败',
          icon: 'error'
        })
      }
    }
  }
})