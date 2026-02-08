// index.ts
export { }

Component({
  data: {},

  methods: {
    // 分享给好友
    onShareAppMessage() {
      return {
        title: 'ForceZone - 益智游戏合集',
        path: '/pages/index/index'
      }
    },

    // 分享到朋友圈
    onShareTimeline() {
      return {
        title: 'ForceZone - 益智游戏合集',
        query: ''
      }
    },

    // 导航到象棋游戏
    navigateToXiangqi() {
      wx.navigateTo({
        url: '../xiangqi-menu/xiangqi-menu'
      })
    },

    // 导航到数独游戏
    navigateToSudoku() {
      wx.navigateTo({
        url: '../sudoku-menu/sudoku-menu'
      })
    },

    // 导航到2048游戏
    navigateToGame2048() {
      wx.navigateTo({
        url: '../game2048/game2048'
      })
    },

    // 导航到反应测试
    navigateToReaction() {
      wx.navigateTo({
        url: '../reaction/reaction'
      })
    },

    // 导航到五子棋游戏
    navigateToGomoku() {
      wx.navigateTo({
        url: '../gomoku-menu/gomoku-menu'
      })
    },

    // 导航到围棋游戏
    navigateToGo() {
      wx.navigateTo({
        url: '../go-menu/go-menu'
      })
    },

    // 导航到个人中心
    navigateToProfile() {
      wx.navigateTo({
        url: '../profile/profile'
      })
    }
  }
})
