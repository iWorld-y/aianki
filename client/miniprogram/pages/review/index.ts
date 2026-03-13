// review/index.ts
// 复习页面 - 展示今日待复习卡片并支持评分

import { getTodayReviews, submitReview } from '../../utils/request'
import { removeCache } from '../../utils/cache'
import type { ReviewCard } from '../../typings/types/api'

const app = getApp<IAppOption>()

Component({
  data: {
    currentIndex: 0,
    cards: [] as ReviewCard[],
    showAnswer: false,
    loading: false,
    error: '',
    completed: false,
    totalCount: 0,
    reviewCount: 0, // 已完成复习数
  },

  lifetimes: {
    attached() {
      this.loadCards()
    },
  },

  methods: {
    /**
     * 加载今日待复习卡片
     */
    async loadCards() {
      this.setData({ loading: true, error: '' })

      try {
        const response = await getTodayReviews()
        const cards = response.cards || []

        this.setData({
          cards,
          totalCount: cards.length,
          currentIndex: 0,
          showAnswer: false,
          loading: false,
          completed: cards.length === 0,
          reviewCount: 0,
        })

        // 更新同步时间
        app.updateSyncTime()
      } catch (error) {
        console.error('加载复习卡片失败:', error)
        this.setData({
          loading: false,
          error: '加载失败，点击重试',
        })
      }
    },

    /**
     * 显示答案
     */
    onShowAnswer() {
      this.setData({ showAnswer: true })
    },

    /**
     * 提交评分
     * @param e 事件对象
     */
    async onAnswer(e: WechatMiniprogram.TouchEvent) {
      const { rating } = e.currentTarget.dataset
      const currentCard = this.data.cards[this.data.currentIndex]

      if (!currentCard) return

      try {
        // 提交复习结果
        await submitReview({
          cardId: currentCard.id,
          rating: this.convertRating(rating),
        })

        const newReviewCount = this.data.reviewCount + 1
        const newIndex = this.data.currentIndex + 1

        // 检查是否完成所有卡片
        if (newIndex >= this.data.cards.length) {
          this.setData({
            completed: true,
            reviewCount: newReviewCount,
          })

          // 清除相关缓存，下次加载时会重新获取
          removeCache('todayReviews')
          removeCache('stats')

          // 显示完成提示
          this.showCompletionToast()
        } else {
          this.setData({
            currentIndex: newIndex,
            showAnswer: false,
            reviewCount: newReviewCount,
          })
        }
      } catch (error) {
        console.error('提交复习结果失败:', error)
        wx.showToast({
          title: '提交失败，请重试',
          icon: 'none',
          duration: 2000,
        })
      }
    },

    /**
     * 转换评分值
     * @param rating 前端评分值 (1-3)
     * @returns API 评分值
     */
    convertRating(rating: number): 'again' | 'hard' | 'good' | 'easy' {
      const ratingMap: Record<number, 'again' | 'hard' | 'good' | 'easy'> = {
        1: 'again',
        2: 'hard',
        3: 'easy',
      }
      return ratingMap[rating] || 'again'
    },

    /**
     * 显示完成提示
     */
    showCompletionToast() {
      wx.showToast({
        title: '🎉 今日复习完成！',
        icon: 'none',
        duration: 2000,
      })
    },

    /**
     * 重试加载
     */
    onRetry() {
      this.loadCards()
    },

    /**
     * 返回首页
     */
    onGoHome() {
      wx.switchTab({
        url: '/pages/index/index',
      })
    },

    /**
     * 计算进度百分比
     * @returns 进度百分比
     */
    getProgress(): number {
      if (this.data.totalCount === 0) return 0
      return Math.round((this.data.reviewCount / this.data.totalCount) * 100)
    },

    /**
     * 获取剩余卡片数
     * @returns 剩余卡片数
     */
    getRemainingCount(): number {
      return this.data.totalCount - this.data.reviewCount
    },
  },
})
