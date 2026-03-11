// app.ts
// 应用入口 - 管理全局状态和登录状态

import { clearAllCache, removeCache, markCachesStale } from './utils/cache'

const app = App<IAppOption>({
  globalData: {
    userInfo: undefined,
    isLoggedIn: false,
    token: '',
    apiBaseURL: 'http://localhost:8000/api/v1',
    lastSyncTime: 0,
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
    const lastSyncTime = wx.getStorageSync('lastSyncTime') || 0

    if (token) {
      this.globalData.token = token
      this.globalData.userInfo = userInfo
      this.globalData.isLoggedIn = true
      this.globalData.lastSyncTime = lastSyncTime
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
    this.globalData.lastSyncTime = Date.now()

    wx.setStorageSync('token', token)
    wx.setStorageSync('userInfo', userInfo)
    wx.setStorageSync('lastSyncTime', this.globalData.lastSyncTime)

    // 登录成功后标记所有缓存为过期，强制刷新数据
    markCachesStale(['todayReviews', 'decks', 'stats', 'cards'])
  },

  /**
   * 退出登录
   */
  logout() {
    // 清除本地存储
    wx.removeStorageSync('token')
    wx.removeStorageSync('userInfo')
    wx.removeStorageSync('lastSyncTime')

    // 重置全局状态
    this.globalData.token = ''
    this.globalData.userInfo = undefined
    this.globalData.isLoggedIn = false
    this.globalData.lastSyncTime = 0

    // 清除所有缓存数据
    clearAllCache()
  },

  /**
   * 更新同步时间戳
   */
  updateSyncTime() {
    this.globalData.lastSyncTime = Date.now()
    wx.setStorageSync('lastSyncTime', this.globalData.lastSyncTime)
  },

  /**
   * 检查是否需要刷新数据（切回前台时调用）
   * @param maxAge 最大缓存时间（毫秒）
   * @returns boolean 是否需要刷新
   */
  shouldRefreshData(maxAge: number = 5 * 60 * 1000): boolean {
    if (!this.globalData.isLoggedIn) return false
    const now = Date.now()
    return now - this.globalData.lastSyncTime > maxAge
  },
})
