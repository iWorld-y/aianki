// app.ts
// 应用入口 - 管理全局状态和登录状态

import { clearAllCache, removeCache, markCachesStale } from './utils/cache'

const defaultAvatarUrl =
  'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0'

App<IAppOption>({
  globalData: {
    userInfo: undefined,
    isLoggedIn: false,
    token: '',
    // 真机调试时请替换为你的电脑局域网 IP 地址
    // 查看 IP: macOS 运行 `ifconfig | grep "inet "`，Windows 运行 `ipconfig`
    // 确保手机和电脑在同一 WiFi 网络
    apiBaseURL: 'http://localhost:8001/api/v1',
    lastSyncTime: 0,
  },

  onLaunch() {
    this.checkLogin()
  },

  /**
   * 检查本地登录状态（同步初始化，不依赖其他模块）
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
   * 刷新用户信息（从服务器获取最新信息）
   * @param serverUserInfo 服务器返回的用户信息
   */
  refreshUserInfo(serverUserInfo: { nickname?: string; avatar_url?: string }) {
    if (!serverUserInfo) return

    const userInfo: WechatMiniprogram.UserInfo = {
      nickName: serverUserInfo.nickname || '微信用户',
      avatarUrl: serverUserInfo.avatar_url || defaultAvatarUrl,
      gender: 0,
      country: '',
      province: '',
      city: '',
      language: 'zh_CN'
    }
    this.globalData.userInfo = userInfo
    wx.setStorageSync('userInfo', userInfo)
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
