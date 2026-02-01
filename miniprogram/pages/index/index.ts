// index.ts
export {}

Component({
  data: {},

  methods: {
    // 导航到数独游戏
    navigateToSudoku() {
      wx.navigateTo({
        url: '../sudoku-menu/sudoku-menu'
      })
    },

    // 导航到五子棋游戏
    navigateToGomoku() {
      wx.navigateTo({
        url: '../gomoku/gomoku'
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
