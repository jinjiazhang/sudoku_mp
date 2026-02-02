// index.ts
export { }

Component({
  data: {},

  methods: {
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
