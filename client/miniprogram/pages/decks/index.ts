// decks/index.ts
// 卡组库页面 - 支持游客/登录模式

import { requireLogin } from '../../utils/auth'

const app = getApp<IAppOption>()

interface Deck {
  id: string
  name: string
  description?: string
  cardCount: number
  createdAt: string
}

Component({
  data: {
    isLoggedIn: false,
    isGuestMode: true,
    decks: [] as Deck[]
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
      this.setData({
        isLoggedIn,
        isGuestMode: !isLoggedIn
      })

      if (isLoggedIn) {
        this.loadDecks()
      }
    },

    /**
     * 加载卡组列表
     */
    loadDecks() {
      // TODO: 从 API 加载真实卡组列表
      // 暂时显示空状态
      this.setData({
        decks: []
      })
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
          url: '/pages/create/index'
        })
      })
    }
  }
})
