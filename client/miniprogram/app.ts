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

  /**
   * 检查本地登录状态
   */
  checkLogin() {
    const token = wx.getStorageSync('token')
    const userInfo = wx.getStorageSync('userInfo')
    if (token) {
      this.globalData.token = token
      this.globalData.userInfo = userInfo
      this.globalData.isLoggedIn = true
    }
  },

  /**
   * 设置登录状态
   * @param userInfo 用户信息
   * @param token JWT token
   */
  setLoginState(userInfo: WechatMiniprogram.UserInfo, token: string) {
    this.globalData.userInfo = userInfo
    this.globalData.isLoggedIn = true
    this.globalData.token = token
    wx.setStorageSync('token', token)
    wx.setStorageSync('userInfo', userInfo)
  }
})