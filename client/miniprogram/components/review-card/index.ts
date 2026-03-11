Component({
  properties: {
    count: {
      type: Number,
      value: 0
    },
    loading: {
      type: Boolean,
      value: false
    }
  },

  methods: {
    onStartReview() {
      if (this.data.count === 0) {
        wx.showToast({
          title: '今天没有待复习卡片',
          icon: 'none'
        })
        return
      }
      wx.navigateTo({
        url: '/pages/review/index'
      })
    }
  }
})