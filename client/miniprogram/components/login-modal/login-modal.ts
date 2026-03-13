// components/login-modal/login-modal.ts
// 登录弹窗组件 - 处理微信一键登录流程

const defaultAvatarUrl =
  'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0'

function getAppInstance(): IAppOption {
  return getApp<IAppOption>()
}

Component({
  data: {
    visible: false,
    pendingAction: null as Function | null
  },

  methods: {
    /**
     * 显示登录弹窗
     * @param callback 登录成功后执行的回调函数
     */
    show(callback?: Function) {
      this.setData({
        visible: true,
        pendingAction: callback || null
      })
    },

    /**
     * 关闭弹窗
     */
    hide() {
      this.setData({
        visible: false,
        pendingAction: null
      })
    },

    /**
     * 处理用户拒绝授权
     */
    onCancel() {
      this.hide()
      wx.showToast({
        title: '登录后可使用全部功能',
        icon: 'none'
      })
    },

    /**
     * 处理微信授权登录
     */
    async onGetUserInfo(e: WechatMiniprogram.ButtonGetUserInfo) {
      if (e.detail.errMsg && e.detail.errMsg.includes('fail')) {
        wx.showToast({
          title: '需要授权才能使用',
          icon: 'none'
        })
        return
      }

      const userInfo = e.detail.userInfo
      if (!userInfo) {
        wx.showToast({
          title: '获取用户信息失败',
          icon: 'none'
        })
        return
      }

      await this.performLogin(userInfo)
    },

    /**
     * 执行登录流程
     */
    performLogin(userInfo: WechatMiniprogram.UserInfo) {
      wx.showLoading({ title: '登录中...' })

      // 1. 获取临时 code
      wx.login({
        success: (loginRes) => {
          if (!loginRes.code) {
            wx.hideLoading()
            wx.showToast({
              title: '获取登录凭证失败',
              icon: 'none'
            })
            return
          }

          // 2. 调用后端登录接口
          const app = getAppInstance()
          wx.request({
            url: `${app.globalData.apiBaseURL}/auth/login`,
            method: 'POST',
            data: { code: loginRes.code, userInfo },
            header: { 'Content-Type': 'application/json' },
            success: (res) => {
              wx.hideLoading()

              const data = res.data as any
              if (data.code !== 0 || !data.data) {
                wx.showToast({
                  title: data.message || '登录失败',
                  icon: 'none'
                })
                return
              }

              const { token } = data.data

              // 3. 保存登录状态（使用后端返回的用户信息）
              const serverUserInfo = data.data.userInfo
              const displayUserInfo = serverUserInfo && serverUserInfo.nickname 
                ? {
                    nickName: serverUserInfo.nickname || '微信用户',
                    avatarUrl: serverUserInfo.avatar_url || defaultAvatarUrl
                  } as WechatMiniprogram.UserInfo
                : userInfo
              
              const appInstance = getAppInstance()
              appInstance.setLoginState(displayUserInfo, token)

              // 4. 关闭弹窗
              this.hide()

              // 5. 执行登录前的操作
              if (this.data.pendingAction) {
                this.data.pendingAction()
              }

              // 6. 通知页面刷新
              this.triggerEvent('loginSuccess', { userInfo })

              wx.showToast({
                title: '登录成功',
                icon: 'success'
              })
            },
            fail: () => {
              wx.hideLoading()
              wx.showToast({
                title: '网络请求失败，请重试',
                icon: 'none'
              })
            }
          })
        },
        fail: () => {
          wx.hideLoading()
          wx.showToast({
            title: '微信登录失败，请重试',
            icon: 'none'
          })
        }
      })
    }
  }
})
