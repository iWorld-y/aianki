// profile/index.ts
// 个人中心页面 - 展示用户信息和统计数据

import { requireLogin, logout } from '../../utils/auth'
import { getStats } from '../../utils/request'
import type { UserStats } from '../../typings/types/api'

const app = getApp<IAppOption>()
const defaultAvatarUrl =
  'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0'

Component({
  data: {
    userInfo: {
      avatarUrl: defaultAvatarUrl,
      nickName: '访客',
    },
    isLoggedIn: false,
    isGuestMode: true,
    stats: {
      totalCards: 0,
      todayReviewed: 0,
      streakDays: 0,
      masteredCards: 0,
    } as UserStats,
    loading: false,
    error: '',
  },

  lifetimes: {
    attached() {
      this.checkLoginState()
    },
  },

  pageLifetimes: {
    show() {
      // 页面显示时刷新登录状态和数据
      this.checkLoginState()
    },
  },

  methods: {
    /**
     * 检查登录状态并加载数据
     */
    checkLoginState() {
      const isLoggedIn = app.globalData.isLoggedIn
      const userInfo = app.globalData.userInfo

      this.setData({
        isLoggedIn,
        isGuestMode: !isLoggedIn,
      })

      if (isLoggedIn && userInfo) {
        this.setData({
          userInfo: userInfo,
        })
        this.loadStats()
      } else {
        // 游客模式重置数据
        this.setData({
          userInfo: {
            avatarUrl: defaultAvatarUrl,
            nickName: '访客',
          },
          stats: {
            totalCards: 0,
            todayReviewed: 0,
            streakDays: 0,
            masteredCards: 0,
          },
          loading: false,
          error: '',
        })
      }
    },

    /**
     * 加载统计数据
     */
    async loadStats() {
      this.setData({ loading: true, error: '' })

      try {
        const stats = await getStats()

        this.setData({
          stats: {
            totalCards: stats.totalCards || 0,
            todayReviewed: stats.todayReviewed || 0,
            streakDays: stats.streakDays || 0,
            masteredCards: stats.masteredCards || 0,
          },
          loading: false,
        })

        // 更新同步时间
        app.updateSyncTime()
      } catch (error) {
        console.error('加载统计数据失败:', error)
        this.setData({
          loading: false,
          error: '数据加载失败',
        })
      }
    },

    /**
     * 下拉刷新
     */
    async onPullDownRefresh() {
      if (this.data.isLoggedIn) {
        await this.loadStats()
      }
      wx.stopPullDownRefresh()
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
        icon: 'none',
      })
    },

    /**
     * 设置页面
     */
    onSettings() {
      wx.showToast({
        title: '功能开发中',
        icon: 'none',
      })
    },

    /**
     * 关于我们
     */
    onAbout() {
      wx.showModal({
        title: '关于 AI记忆卡',
        content: 'AI记忆卡 v1.0.0\n基于艾宾浩斯遗忘曲线的智能记忆工具',
        showCancel: false,
      })
    },

    /**
     * 获取鼓励文案
     * @returns 根据统计数据返回鼓励文案
     */
    getEncouragementText(): string {
      const { stats, isGuestMode } = this.data

      if (isGuestMode) {
        return '登录后查看详细数据'
      }

      if (stats.totalCards === 0) {
        return '开始学习吧！'
      }

      if (stats.streakDays === 0) {
        return '坚持学习建立习惯'
      }

      if (stats.streakDays >= 7) {
        return `连续学习${stats.streakDays}天，太棒了！🔥`
      }

      if (stats.todayReviewed > 0) {
        return `今日已复习${stats.todayReviewed}张卡片`
      }

      return '今天开始复习吧！'
    },
  },
})
