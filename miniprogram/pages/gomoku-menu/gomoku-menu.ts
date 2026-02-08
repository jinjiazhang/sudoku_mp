// gomoku-menu.ts
export { }
const { GomokuService } = require('../gomoku/gomoku-service.js')

Page({
    data: {
        hasSavedGame: false,
        showPveModal: false
    },

    onShow() {
        this.checkSavedGame()
    },

    checkSavedGame() {
        this.setData({
            hasSavedGame: GomokuService.hasSavedGame()
        })
    },

    // 继续游戏
    handleResumeGame() {
        wx.navigateTo({
            url: '../gomoku/gomoku?action=resume'
        })
    },

    // 双人对战
    handlePvpGame() {
        wx.navigateTo({
            url: '../gomoku/gomoku?mode=pvp'
        })
    },

    // 显示人机对战选项
    showPveOptions() {
        this.setData({ showPveModal: true })
    },

    // 关闭模态框
    closeModal() {
        this.setData({ showPveModal: false })
    },

    // 选择执黑（先手）
    chooseBlack() {
        this.startGameWithOptions('pve', 'black')
    },

    // 选择执白（后手）
    chooseWhite() {
        this.startGameWithOptions('pve', 'white')
    },

    startGameWithOptions(mode: string, playerColor: string) {
        this.closeModal()
        wx.navigateTo({
            url: `../gomoku/gomoku?mode=${mode}&playerColor=${playerColor}`
        })
    }
})
