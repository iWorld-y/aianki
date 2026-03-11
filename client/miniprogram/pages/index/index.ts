// index.ts
// 首页 - 展示复习统计和卡组列表，支持游客/登录模式

import { requireLogin } from '../../utils/auth'
import {
  getTodayReviews,
  getRecentDecks,
  getStats,
} from '../../utils/request'
import { DECK_ICON_MAP } from '../../utils/constants'
import type { DeckCard } from '../../typings/types/api'

const app = getApp<IAppOption>()
const defaultAvatarUrl =
  'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0'

// 示例卡组数据（游客模式显示）
const sampleDecks: DeckCard[] = [
  {
    id: 1,
    name: '英语单词',
    icon: 'translate',
    cardCount: 20,
    dueCount: 5,
    bgColor: DECK_ICON_MAP.translate.bgColor,
    iconColor: DECK_ICON_MAP.translate.iconColor,
  },
  {
    id: 2,
    name: '世界历史',
    icon: 'history',
    cardCount: 15,
    dueCount: 2,
    bgColor: DECK_ICON_MAP.history.bgColor,
    iconColor: DECK_ICON_MAP.history.iconColor,
  },
  {
    id: 3,
    name: '数学公式',
    icon: 'functions',
    cardCount: 30,
    dueCount: 5,
    bgColor: DECK_ICON_MAP.functions.bgColor,
    iconColor: DECK_ICON_MAP.functions.iconColor,
  },
]

Component({
  data: {
    isLoggedIn: false,
    userInfo: {
      avatarUrl: defaultAvatarUrl,
      nickName: '访客',
    },
    greeting: '欢迎来到AI记忆卡',
    todayDueCount: 0,
    deckCount: 0,
    decks: [] as DeckCard[],
    isGuestMode: true,
    loading: {
      todayDue: false,
      decks: false,
      stats: false,
    },
    error: {
      todayDue: '',
      decks: '',
      stats: '',
    },
  },

  lifetimes: {
    attached() {
      this.updateGreeting()
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
     * 更新问候语
     */
    updateGreeting() {
      const hour = new Date().getHours()
      let baseGreeting = '早安'
      if (hour >= 12 && hour < 18) {
        baseGreeting = '下午好'
      } else if (hour >= 18) {
        baseGreeting = '晚上好'
      }

      this.setData({
        greeting: baseGreeting,
      })
    },

    /**
     * 检查登录状态并加载对应数据
     */
    checkLoginState() {
      const isLoggedIn = app.globalData.isLoggedIn
      const userInfo = app.globalData.userInfo

      this.setData({
        isLoggedIn,
        isGuestMode: !isLoggedIn,
      })

      if (isLoggedIn && userInfo) {
        // 登录模式：加载真实数据
        this.setData({
          userInfo: userInfo,
        })
        this.loadRealData()
      } else {
        // 游客模式：显示示例数据
        this.loadGuestData()
      }

      this.updateGreeting()
    },

    /**
     * 加载游客模式数据（示例数据）
     */
    loadGuestData() {
      this.setData({
        userInfo: {
          avatarUrl: defaultAvatarUrl,
          nickName: '访客',
        },
        todayDueCount: 0,
        deckCount: 3,
        decks: sampleDecks,
        loading: {
          todayDue: false,
          decks: false,
          stats: false,
        },
        error: {
          todayDue: '',
          decks: '',
          stats: '',
        },
      })
    },

    /**
     * 加载真实数据（登录后）
     * 使用 Promise.all 并发请求多个接口
     */
    async loadRealData() {
      this.setData({
        'loading.todayDue': true,
        'loading.decks': true,
        'loading.stats': true,
      })

      try {
        // 并发请求：今日待复习、最近卡组、统计数据
        const [todayReviews, recentDecks, stats] = await Promise.all([
          this.fetchTodayReviews(),
          this.fetchRecentDecks(),
          this.fetchStats(),
        ])

        // 处理卡组数据，添加图标配置
        const formattedDecks = recentDecks.decks.map((deck) =>
          this.formatDeckCard(deck)
        )

        this.setData({
          todayDueCount: todayReviews.count,
          deckCount: stats.totalCards > 0 ? Math.ceil(stats.totalCards / 10) : 0, // 估算卡组数
          decks: formattedDecks,
          loading: {
            todayDue: false,
            decks: false,
            stats: false,
          },
        })

        // 更新同步时间
        app.updateSyncTime()
      } catch (error) {
        console.error('加载首页数据失败:', error)
        this.handleLoadError()
      }
    },

    /**
     * 获取今日待复习数据
     */
    async fetchTodayReviews() {
      try {
        const data = await getTodayReviews()
        this.setData({ 'loading.todayDue': false })
        return data
      } catch (error) {
        this.setData({
          'loading.todayDue': false,
          'error.todayDue': '数据加载失败',
        })
        throw error
      }
    },

    /**
     * 获取最近卡组数据
     */
    async fetchRecentDecks() {
      try {
        const data = await getRecentDecks(5)
        this.setData({ 'loading.decks': false })
        return data
      } catch (error) {
        this.setData({
          'loading.decks': false,
          'error.decks': '卡组加载失败',
        })
        throw error
      }
    },

    /**
     * 获取统计数据
     */
    async fetchStats() {
      try {
        const data = await getStats()
        this.setData({ 'loading.stats': false })
        return data
      } catch (error) {
        this.setData({
          'loading.stats': false,
          'error.stats': '统计加载失败',
        })
        throw error
      }
    },

    /**
     * 格式化卡组卡片数据，添加图标配置
     * @param deck 原始卡组数据
     * @returns 格式化后的卡组数据
     */
    formatDeckCard(deck: {
      id: number
      name: string
      icon?: string
      cardCount?: number
      dueCount?: number
    }): DeckCard {
      const iconType = (deck.icon as keyof typeof DECK_ICON_MAP) || 'default'
      const iconConfig = DECK_ICON_MAP[iconType] || DECK_ICON_MAP.default

      return {
        id: deck.id,
        name: deck.name,
        icon: iconType,
        cardCount: deck.cardCount || 0,
        dueCount: deck.dueCount || 0,
        bgColor: iconConfig.bgColor,
        iconColor: iconConfig.iconColor,
      }
    },

    /**
     * 处理加载错误
     */
    handleLoadError() {
      wx.showToast({
        title: '数据加载失败，请下拉刷新',
        icon: 'none',
        duration: 2000,
      })
    },

    /**
     * 下拉刷新
     */
    async onPullDownRefresh() {
      if (this.data.isLoggedIn) {
        try {
          await this.loadRealData()
        } catch (error) {
          console.error('刷新失败:', error)
        }
      }
      wx.stopPullDownRefresh()
    },

    /**
     * 登录成功后刷新页面
     */
    onLoginSuccess(e: unknown) {
      this.checkLoginState()
    },

    /**
     * 点击开始复习
     */
    onStartReview() {
      requireLogin(() => {
        wx.navigateTo({
          url: '/pages/review/index',
        })
      })
    },

    /**
     * 跳转到卡组库
     */
    onNavigateToDecks() {
      wx.switchTab({
        url: '/pages/decks/index',
      })
    },

    /**
     * 创建卡组
     */
    onCreateDeck() {
      requireLogin(() => {
        wx.navigateTo({
          url: '/pages/create/index',
        })
      })
    },

    /**
     * 打开相机
     */
    onOpenCamera() {
      requireLogin(() => {
        wx.chooseMedia({
          count: 1,
          mediaType: ['image'],
          sourceType: ['camera'],
          success(res) {
            console.log('Camera success:', res)
            // TODO: 处理拍照后的图片识别
          },
        })
      })
    },

    /**
     * 通知按钮
     */
    onNotification() {
      wx.showToast({
        title: '暂无新通知',
        icon: 'none',
      })
    },

    /**
     * 点击卡组卡片
     */
    onDeckTap(e: WechatMiniprogram.TouchEvent) {
      const { id } = e.currentTarget.dataset

      // 游客点击示例卡组需要登录
      if (this.data.isGuestMode) {
        requireLogin(() => {
          wx.navigateTo({
            url: `/pages/decks/index?id=${id}`,
          })
        })
      } else {
        wx.navigateTo({
          url: `/pages/decks/index?id=${id}`,
        })
      }
    },
  },
})
