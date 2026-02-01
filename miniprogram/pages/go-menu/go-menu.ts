import { GoService } from '../../utils/go-game'

Page({
    data: {
        hasSavedGame: false,
        showModal: false,
        selectedMode: 'pve' // 'pve' | 'pvp'
    },

    onShow() {
        this.checkSavedGame()
    },

    checkSavedGame() {
        this.setData({
            hasSavedGame: GoService.getSavedGame() !== null
        })
    },

    handleResumeGame() {
        wx.navigateTo({
            url: '/pages/go/go?resume=true'
        })
    },

    showPveOptions() {
        this.setData({
            showModal: true,
            selectedMode: 'pve'
        })
    },

    handlePvpGame() {
        this.setData({
            showModal: true,
            selectedMode: 'pvp'
        })
    },

    hideModal() {
        this.setData({
            showModal: false
        })
    },

    stopProp() {
        // Prevent closing when clicking card
    },

    selectSize(e: any) {
        const size = e.currentTarget.dataset.size
        const mode = this.data.selectedMode

        this.hideModal()
        wx.navigateTo({
            url: `/pages/go/go?mode=${mode}&size=${size}`
        })
    }
})
