// create/index.ts
// 创建卡组页面

import { createDeck } from '../../utils/request'
import { removeCache } from '../../utils/cache'
import { chooseAndUploadImage } from '../../utils/upload'
import type { DeckIconType } from '../../typings/types/api'
import type { UploadImageResponse } from '../../typings/types/api'

interface IconItem {
  value: string
  label: string
  emoji: string
  name: string
}

Component({
  data: {
    name: '',
    description: '',
    icon: 'default' as DeckIconType,
    coverImage: '',
    coverImageUrl: '',
    uploading: false,
    submitting: false,
    icons: [
      { value: 'translate', label: '🌐 翻译', emoji: '🌐', name: '翻译' },
      { value: 'history', label: '📜 历史', emoji: '📜', name: '历史' },
      { value: 'functions', label: '∑ 数学', emoji: '∑', name: '数学' },
      { value: 'science', label: '🔬 科学', emoji: '🔬', name: '科学' },
      { value: 'art', label: '🎨 艺术', emoji: '🎨', name: '艺术' },
      { value: 'default', label: '📚 默认', emoji: '📚', name: '默认' },
    ] as IconItem[],
  },

  methods: {
    /**
     * 卡组名称输入
     */
    onNameInput(e: WechatMiniprogram.Input) {
      this.setData({ name: e.detail.value })
    },

    /**
     * 卡组描述输入
     */
    onDescInput(e: WechatMiniprogram.Input) {
      this.setData({ description: e.detail.value })
    },

    /**
     * 图标选择
     */
    onIconSelect(e: WechatMiniprogram.TouchEvent) {
      const { value } = e.currentTarget.dataset
      this.setData({ icon: value })
    },

    /**
     * 选择并上传封面图片
     */
    async onChooseCoverImage() {
      if (this.data.uploading) return

      this.setData({ uploading: true })

      try {
        const result: UploadImageResponse = await chooseAndUploadImage('card_source')
        const app = getApp<IAppOption>()
        const fullUrl = `${app.globalData.apiBaseURL}${result.url}`
        
        this.setData({
          coverImage: fullUrl,
          coverImageUrl: result.url,
        })
        
        wx.showToast({
          title: '上传成功',
          icon: 'success',
          duration: 1500,
        })
      } catch (error) {
        console.error('上传封面图片失败:', error)
        wx.showToast({
          title: error instanceof Error ? error.message : '上传失败',
          icon: 'none',
          duration: 2000,
        })
      } finally {
        this.setData({ uploading: false })
      }
    },

    /**
     * 删除封面图片
     */
    onRemoveCoverImage() {
      this.setData({
        coverImage: '',
        coverImageUrl: '',
      })
    },

    /**
     * 提交创建卡组
     */
    async onSubmit() {
      if (!this.data.name.trim()) {
        wx.showToast({
          title: '请输入卡组名称',
          icon: 'none',
        })
        return
      }

      if (this.data.submitting) return

      this.setData({ submitting: true })

      try {
        const response = await createDeck({
          name: this.data.name.trim(),
          description: this.data.description.trim() || undefined,
          icon: this.data.icon,
        })

        // 清除卡组缓存，确保列表能刷新
        removeCache('decks')

        wx.showToast({
          title: '创建成功',
          icon: 'success',
          duration: 1500,
        })

        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      } catch (error) {
        console.error('创建卡组失败:', error)
        wx.showToast({
          title: error instanceof Error ? error.message : '创建失败',
          icon: 'none',
          duration: 2000,
        })
        this.setData({ submitting: false })
      }
    },
  },
})
