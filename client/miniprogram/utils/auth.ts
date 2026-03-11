// utils/auth.ts
// 登录守卫工具函数 - 处理登录状态检查和弹窗触发

const app = getApp<IAppOption>()

/**
 * 检查是否已登录
 * @returns boolean 是否已登录
 */
export function isLoggedIn(): boolean {
  return app.globalData.isLoggedIn
}

/**
 * 检查是否已登录，未登录则显示登录弹窗
 * @param callback 登录成功后执行的回调
 * @returns boolean 是否已登录（true 表示已登录或正在登录）
 */
export function requireLogin(callback?: () => void): boolean {
  if (app.globalData.isLoggedIn) {
    callback?.()
    return true
  }

  // 获取当前页面实例
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]

  if (!currentPage) {
    return false
  }

  // 查找页面中的登录弹窗组件
  const loginModal = currentPage.selectComponent('#loginModal')

  if (loginModal) {
    loginModal.show(callback)
  } else {
    console.warn(
      '页面未找到登录弹窗组件，请确保已添加 <login-modal id="loginModal" />'
    )
  }

  return false
}

/**
 * 要求登录并返回 Promise，适用于 async/await 场景
 * @returns Promise<boolean> 登录成功返回 true，取消返回 false
 */
export function requireLoginAsync(): Promise<boolean> {
  return new Promise((resolve) => {
    if (app.globalData.isLoggedIn) {
      resolve(true)
      return
    }

    const pages = getCurrentPages()
    const currentPage = pages[pages.length - 1]

    if (!currentPage) {
      resolve(false)
      return
    }

    const loginModal = currentPage.selectComponent('#loginModal')

    if (loginModal) {
      loginModal.show(() => {
        resolve(true)
      })
    } else {
      console.warn('页面未找到登录弹窗组件')
      resolve(false)
    }
  })
}

/**
 * 退出登录
 */
export function logout(): void {
  wx.showModal({
    title: '确认退出',
    content: '退出登录后将无法使用部分功能',
    confirmColor: '#ef4444',
    success: (res) => {
      if (res.confirm) {
        // 调用 app 的 logout 方法统一处理
        app.logout()

        wx.showToast({
          title: '已退出登录',
          icon: 'success',
        })

        // 通知页面刷新
        const pages = getCurrentPages()
        const currentPage = pages[pages.length - 1]
        if (currentPage) {
          currentPage.setData({ isLoggedIn: false })
        }
      }
    },
  })
}
