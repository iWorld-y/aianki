const app = App<IAppOption>({
  globalData: {
    userInfo: undefined,
    isLoggedIn: false,
    token: '',
    apiBaseURL: 'http://localhost:8000/api/v1'
  },

  onLaunch() {
    this.checkLogin()
  },

  checkLogin() {
    const token = wx.getStorageSync('token')
    if (token) {
      this.globalData.token = token
      this.globalData.isLoggedIn = true
    }
  }
})