// index.ts
// 首页 - 展示复习统计和卡组列表，支持游客/登录模式

import { requireLogin } from '../../utils/auth'

const app = getApp<IAppOption>()
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

// 示例卡组数据（游客模式显示）
const sampleDecks: Deck[] = [
  {
    id: 'sample-1',
    name: '英语单词',
    icon: 'translate',
    cardCount: 20,
    dueCount: 5,
    bgColor: 'rgba(80, 72, 229, 0.1)',
    iconColor: '#5048e5'
  },
  {
    id: 'sample-2',
    name: '世界历史',
    icon: 'history',
    cardCount: 15,
    dueCount: 2,
    bgColor: 'rgba(249, 115, 22, 0.1)',
    iconColor: '#f97316'
  },
  {
    id: 'sample-3',
    name: '数学公式',
    icon: 'functions',
    cardCount: 30,
    dueCount: 5,
    bgColor: 'rgba(16, 185, 129, 0.1)',
    iconColor: '#10b981'
  }
]

Component({
  data: {
    isLoggedIn: false,
    userInfo: {
      avatarUrl: defaultAvatarUrl,
      nickName: '访客',
    },
    greeting: '欢迎来到AI记忆卡',
    todayDueCount: '--',
    deckCount: 0,
    decks: [] as Deck[],
    isGuestMode: true
  },

  lifetimes: {
    attached() {
      this.updateGreeting()
      this.checkLoginState()
    }
  },

  pageLifetimes: {
    show() {
      // 页面显示时刷新登录状态
      this.checkLoginState()
    }
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
      
      // 根据登录状态设置问候语
      if (this.data.isLoggedIn && this.data.userInfo.nickName !== '访客') {
        this.setData({ greeting: `${baseGreeting}，${this.data.userInfo.nickName}` })
      } else {
        this.setData({ greeting: '欢迎来到AI记忆卡' })
      }
    },

    /**
     * 检查登录状态并加载对应数据
     */
    checkLoginState() {
      const isLoggedIn = app.globalData.isLoggedIn
      const userInfo = app.globalData.userInfo

      this.setData({
        isLoggedIn,
        isGuestMode: !isLoggedIn
      })

      if (isLoggedIn && userInfo) {
        // 登录模式：加载真实数据
        this.setData({
          userInfo: userInfo,
          greeting: this.data.greeting.replace('访客', userInfo.nickName)
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
          nickName: '访客'
        },
        todayDueCount: '--',
        deckCount: 3,
        decks: sampleDecks
      })
    },

    /**
     * 加载真实数据（登录后）
     */
    loadRealData() {
      // TODO: 从 API 加载真实数据
      // 暂时使用示例数据
      this.setData({
        todayDueCount: 12,
        deckCount: 3,
        decks: sampleDecks
      })
    },

    /**
     * 登录成功后刷新页面
     */
    onLoginSuccess(e: any) {
      this.checkLoginState()
    },

    /**
     * 点击开始复习
     */
    onStartReview() {
      requireLogin(() => {
        wx.navigateTo({
          url: '/pages/review/index'
        })
      })
    },

    /**
     * 跳转到卡组库
     */
    onNavigateToDecks() {
      wx.switchTab({
        url: '/pages/decks/index'
      })
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
          }
        })
      })
    },

    /**
     * 通知按钮
     */
    onNotification() {
      wx.showToast({
        title: '暂无新通知',
        icon: 'none'
      })
    },

    /**
     * 点击卡组卡片
     */
    onDeckTap(e: any) {
      const { id } = e.currentTarget.dataset
      
      // 游客点击示例卡组需要登录
      if (this.data.isGuestMode) {
        requireLogin(() => {
          wx.navigateTo({
            url: `/pages/decks/index?id=${id}`
          })
        })
      } else {
        wx.navigateTo({
          url: `/pages/decks/index?id=${id}`
        })
      }
    }
  }
})
