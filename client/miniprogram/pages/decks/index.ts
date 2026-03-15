// decks/index.ts
// 卡组库页面 - 展示所有卡组列表，支持排序和搜索

import { requireLogin } from '../../utils/auth'
import { getAllDecks } from '../../utils/request'
import { removeCache } from '../../utils/cache'
import type { DeckItem } from '../../typings/types/api'

const app = getApp<IAppOption>()

Component({
  data: {
    isLoggedIn: false,
    isGuestMode: true,
    decks: [] as DeckItem[],
    filteredDecks: [] as DeckItem[],
    loading: false,
    error: '',
    searchKeyword: '',
    sortBy: 'recent' as 'recent' | 'created' | 'count' | 'due',
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
      this.setData({
        isLoggedIn,
        isGuestMode: !isLoggedIn,
      })

      if (isLoggedIn) {
        this.loadDecks()
      } else {
        // 游客模式显示空状态
        this.setData({
          decks: [],
          filteredDecks: [],
          loading: false,
          error: '',
        })
      }
    },

    /**
     * 加载卡组列表
     */
    async loadDecks() {
      this.setData({ loading: true, error: '' })

      try {
        const response = await getAllDecks()
        const decks = response.decks || []

        this.setData({
          decks,
          filteredDecks: this.sortDecks(decks, this.data.sortBy),
          loading: false,
        })

        // 更新同步时间
        app.updateSyncTime()
      } catch (error) {
        console.error('加载卡组失败:', error)
        this.setData({
          loading: false,
          error: '数据加载失败，请下拉刷新',
        })

        wx.showToast({
          title: '数据加载失败',
          icon: 'none',
          duration: 2000,
        })
      }
    },

    /**
     * 排序卡组
     * @param decks 卡组列表
     * @param sortBy 排序方式
     * @returns 排序后的卡组列表
     */
    sortDecks(decks: DeckItem[], sortBy: string): DeckItem[] {
      const sorted = [...decks]

      switch (sortBy) {
        case 'recent':
          // 最近复习时间倒序
          return sorted.sort((a, b) => {
            const timeA = a.lastReviewedAt ? new Date(a.lastReviewedAt).getTime() : 0
            const timeB = b.lastReviewedAt ? new Date(b.lastReviewedAt).getTime() : 0
            return timeB - timeA
          })
        case 'created':
          // 创建时间倒序
          return sorted.sort((a, b) => {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          })
        case 'count':
          // 卡片数量倒序
          return sorted.sort((a, b) => b.totalCards - a.totalCards)
        case 'due':
          // 待复习数量倒序
          return sorted.sort((a, b) => b.dueToday - a.dueToday)
        default:
          return sorted
      }
    },

    /**
     * 搜索卡组
     * @param keyword 搜索关键词
     */
    filterDecks(keyword: string): DeckItem[] {
      if (!keyword.trim()) {
        return this.data.decks
      }

      const lowerKeyword = keyword.toLowerCase()
      return this.data.decks.filter(
        (deck) =>
          deck.name.toLowerCase().includes(lowerKeyword) ||
          (deck.description && deck.description.toLowerCase().includes(lowerKeyword))
      )
    },

    /**
     * 处理搜索输入
     */
    onSearchInput(e: WechatMiniprogram.Input) {
      const keyword = e.detail.value
      this.setData({
        searchKeyword: keyword,
        filteredDecks: this.filterDecks(keyword),
      })
    },

    /**
     * 处理排序切换
     */
    onSortChange(e: WechatMiniprogram.TouchEvent) {
      const sortBy = e.currentTarget.dataset.sort as typeof this.data.sortBy
      this.setData({
        sortBy,
        filteredDecks: this.sortDecks(this.data.filteredDecks, sortBy),
      })
    },

    /**
     * 下拉刷新
     */
    async onPullDownRefresh() {
      if (this.data.isLoggedIn) {
        // 清除缓存，强制刷新
        removeCache('decks')
        await this.loadDecks()
      }
      wx.stopPullDownRefresh()
    },

    /**
     * 重试加载
     */
    onRetry() {
      this.loadDecks()
    },

    /**
     * 登录成功后刷新
     */
    onLoginSuccess() {
      this.checkLoginState()
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
     * 点击卡组
     */
    onDeckTap(e: WechatMiniprogram.TouchEvent) {
      const { id } = e.currentTarget.dataset
      const deck = this.data.decks.find(d => d.id === id)
      
      wx.showActionSheet({
        itemList: ['查看详情', '拍照提取卡片'],
        success: (res) => {
          if (res.tapIndex === 0) {
            wx.navigateTo({
              url: `/pages/decks/detail?id=${id}`,
            })
          } else if (res.tapIndex === 1) {
            requireLogin(() => {
              wx.navigateTo({
                url: `/pages/card-extract/index?deckId=${id}&deckName=${encodeURIComponent(deck?.name || '')}`,
              })
            })
          }
        },
      })
    },

    /**
     * 获取格式化的时间显示
     * @param dateStr ISO 日期字符串
     * @returns 格式化后的时间字符串
     */
    formatTime(dateStr?: string): string {
      if (!dateStr) return '从未复习'

      const date = new Date(dateStr)
      const now = new Date()
      const diff = now.getTime() - date.getTime()
      const days = Math.floor(diff / (1000 * 60 * 60 * 24))

      if (days === 0) {
        return '今天'
      } else if (days === 1) {
        return '昨天'
      } else if (days < 7) {
        return `${days}天前`
      } else if (days < 30) {
        return `${Math.floor(days / 7)}周前`
      } else {
        return `${Math.floor(days / 30)}月前`
      }
    },
  },
})
