// index.ts
// 首页 - 展示复习统计和卡组列表

const defaultAvatarUrl = 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0'

interface Deck {
  id: string
  name: string
  icon: string
  cardCount: number
  dueCount: number
  bgColor: string
  iconColor: string
}

Component({
  data: {
    userInfo: {
      avatarUrl: defaultAvatarUrl,
      nickName: '学习者',
    },
    greeting: '早安',
    todayDueCount: 12,
    deckCount: 3,
    decks: [
      {
        id: '1',
        name: '英语单词',
        icon: 'translate',
        cardCount: 20,
        dueCount: 5,
        bgColor: 'rgba(80, 72, 229, 0.1)',
        iconColor: '#5048e5'
      },
      {
        id: '2',
        name: '世界历史',
        icon: 'history',
        cardCount: 15,
        dueCount: 2,
        bgColor: 'rgba(249, 115, 22, 0.1)',
        iconColor: '#f97316'
      },
      {
        id: '3',
        name: '数学公式',
        icon: 'functions',
        cardCount: 30,
        dueCount: 5,
        bgColor: 'rgba(16, 185, 129, 0.1)',
        iconColor: '#10b981'
      }
    ] as Deck[],
  },

  lifetimes: {
    attached() {
      this.updateGreeting()
      this.loadUserInfo()
    }
  },

  methods: {
    updateGreeting() {
      const hour = new Date().getHours()
      let greeting = '早安'
      if (hour >= 12 && hour < 18) {
        greeting = '下午好'
      } else if (hour >= 18) {
        greeting = '晚上好'
      }
      this.setData({ greeting })
    },

    loadUserInfo() {
      const app = getApp<IAppOption>()
      if (app.globalData.userInfo) {
        this.setData({
          userInfo: app.globalData.userInfo
        })
      }
    },

    onStartReview() {
      wx.navigateTo({
        url: '/pages/review/index'
      })
    },

    onNavigateToDecks() {
      wx.switchTab({
        url: '/pages/decks/index'
      })
    },

    onCreateDeck() {
      wx.navigateTo({
        url: '/pages/create/index'
      })
    },

    onOpenCamera() {
      wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: ['camera'],
        success(res) {
          console.log('Camera success:', res)
        }
      })
    },

    onNotification() {
      wx.showToast({
        title: '暂无新通知',
        icon: 'none'
      })
    },

    onDeckTap(e: any) {
      const { id } = e.currentTarget.dataset
      wx.navigateTo({
        url: `/pages/decks/index?id=${id}`
      })
    }
  }
})