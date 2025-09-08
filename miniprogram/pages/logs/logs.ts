// logs.ts
export {}
const { formatTime } = require('../../utils/util')

Component({
  data: {
    logs: [],
  },
  
  lifetimes: {
    attached() {
      this.setData({
        logs: (wx.getStorageSync('logs') || []).map((log: string) => {
          return {
            date: formatTime(new Date(log)),
            timeStamp: log
          }
        }),
      })
    }
  }
})
