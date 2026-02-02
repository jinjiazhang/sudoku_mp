// pages/xiangqi-menu/xiangqi-menu.ts
Page({
    data: {},

    onLoad() { },

    startPvP() {
        wx.navigateTo({
            url: '/pages/xiangqi/xiangqi?mode=pvp'
        })
    },

    startPvE() {
        wx.navigateTo({
            url: '/pages/xiangqi/xiangqi?mode=pve'
        })
    }
})
