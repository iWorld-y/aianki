// create/index.ts
// 创建卡组页面

Component({
  data: {
    name: '',
    description: '',
    icon: '📚'
  },

  methods: {
    onNameInput(e: any) {
      this.setData({ name: e.detail.value })
    },

    onDescInput(e: any) {
      this.setData({ description: e.detail.value })
    },

    onIconChange(e: any) {
      this.setData({ icon: e.detail.value })
    },

    onSubmit() {
      if (!this.data.name.trim()) {
        wx.showToast({
          title: '请输入卡组名称',
          icon: 'none'
        })
        return
      }

      // TODO: 提交创建卡组请求
      wx.showToast({
        title: '创建成功',
        icon: 'success'
      })
      
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    }
  }
})