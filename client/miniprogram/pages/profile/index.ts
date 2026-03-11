// profile/index.ts
// 个人中心页面

const app = getApp<IAppOption>()

Component({
  data: {
    userInfo: null as any,
    isLoggedIn: false,
    stats: {
      totalCards: 0,
      reviewedCards: 0,
      streakDays: 0
    }
  },

  lifetimes: {
    attached() {
      this.loadUserInfo()
    }
  },

  methods: {
    loadUserInfo() {
      if (app.globalData.userInfo) {
        this.setData({
          userInfo: app.globalData.userInfo,
          isLoggedIn: app.globalData.isLoggedIn
        })
      }
    },

    onLogin() {
      // TODO: 实现登录逻辑
      wx.showToast({
        title: '功能开发中',
        icon: 'none'
      })
    }
  }
})