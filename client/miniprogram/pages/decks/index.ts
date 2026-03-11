// decks/index.ts
// 卡组库页面

Component({
  data: {
    decks: []
  },
  
  lifetimes: {
    attached() {
      this.loadDecks()
    }
  },
  
  methods: {
    loadDecks() {
      // TODO: 从 API 加载卡组列表
    },
    
    onCreateDeck() {
      wx.navigateTo({
        url: '/pages/create/index'
      })
    }
  }
})