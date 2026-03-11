// profile/index.ts
// 个人中心页面 - 支持游客/登录模式

import { requireLogin, logout } from '../../utils/auth'

const app = getApp<IAppOption>()
const defaultAvatarUrl = 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0'

Component({
  data: {
    userInfo: {
      avatarUrl: defaultAvatarUrl,
      nickName: '访客'
    },
    isLoggedIn: false,
    isGuestMode: true,
    stats: {
      totalCards: '--',
      reviewedCards: '--',
      streakDays: '--'
    }
  },

  lifetimes: {
    attached() {
      this.checkLoginState()
    }
  },

  pageLifetimes: {
    show() {
      this.checkLoginState()
    }
  },

  methods: {
    /**
     * 检查登录状态
     */
    checkLoginState() {
      const isLoggedIn = app.globalData.isLoggedIn
      const userInfo = app.globalData.userInfo

      this.setData({
        isLoggedIn,
        isGuestMode: !isLoggedIn
      })

      if (isLoggedIn && userInfo) {
        this.setData({
          userInfo: userInfo
        })
        this.loadStats()
      } else {
        this.setData({
          userInfo: {
            avatarUrl: defaultAvatarUrl,
            nickName: '访客'
          },
          stats: {
            totalCards: '--',
            reviewedCards: '--',
            streakDays: '--'
          }
        })
      }
    },

    /**
     * 加载统计数据
     */
    loadStats() {
      // TODO: 从 API 加载真实统计数据
      this.setData({
        stats: {
          totalCards: 65,
          reviewedCards: 128,
          streakDays: 7
        }
      })
    },

    /**
     * 登录成功后刷新
     */
    onLoginSuccess() {
      this.checkLoginState()
    },

    /**
     * 点击登录
     */
    onLogin() {
      requireLogin()
    },

    /**
     * 退出登录
     */
    onLogout() {
      logout()
    },

    /**
     * 编辑资料
     */
    onEditProfile() {
      wx.showToast({
        title: '功能开发中',
        icon: 'none'
      })
    },

    /**
     * 设置页面
     */
    onSettings() {
      wx.showToast({
        title: '功能开发中',
        icon: 'none'
      })
    },

    /**
     * 关于我们
     */
    onAbout() {
      wx.showModal({
        title: '关于 AI记忆卡',
        content: 'AI记忆卡 v1.0.0\n基于艾宾浩斯遗忘曲线的智能记忆工具',
        showCancel: false
      })
    }
  }
})
