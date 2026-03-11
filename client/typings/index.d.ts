/// <reference path="./types/index.d.ts" />

/**
 * 应用全局状态接口
 */
interface IAppOption {
  globalData: {
    userInfo?: WechatMiniprogram.UserInfo
    isLoggedIn: boolean
    token: string
    apiBaseURL: string
    lastSyncTime: number // 上次数据同步时间戳
  }
  userInfoReadyCallback?: WechatMiniprogram.GetUserInfoSuccessCallback

  /**
   * 检查本地登录状态
   */
  checkLogin(): void

  /**
   * 设置登录状态
   * @param userInfo 用户信息
   * @param token JWT token
   */
  setLoginState(userInfo: WechatMiniprogram.UserInfo, token: string): void

  /**
   * 退出登录
   */
  logout(): void

  /**
   * 更新同步时间戳
   */
  updateSyncTime(): void

  /**
   * 检查是否需要刷新数据
   * @param maxAge 最大缓存时间（毫秒）
   * @returns 是否需要刷新
   */
  shouldRefreshData(maxAge?: number): boolean
}
