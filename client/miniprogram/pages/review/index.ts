// review/index.ts
// 复习页面

Component({
  data: {
    currentIndex: 0,
    cards: [],
    showAnswer: false
  },

  lifetimes: {
    attached() {
      this.loadCards()
    }
  },

  methods: {
    loadCards() {
      // TODO: 从 API 加载待复习卡片
    },

    onShowAnswer() {
      this.setData({ showAnswer: true })
    },

    onAnswer(e: any) {
      const { rating } = e.currentTarget.dataset
      // TODO: 提交评分并加载下一张卡片
      console.log('Answer rating:', rating)
    }
  }
})