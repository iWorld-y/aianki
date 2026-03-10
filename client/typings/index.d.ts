/// <reference path="./types/index.d.ts" />

interface IAppOption {
  globalData: {
    userInfo?: WechatMiniprogram.UserInfo
    isLoggedIn: boolean
    token: string
    apiBaseURL: string
  }
  userInfoReadyCallback?: WechatMiniprogram.GetUserInfoSuccessCallback
  checkLogin(): void
}