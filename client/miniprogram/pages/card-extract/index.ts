// pages/card-extract/index.ts
// 拍照提取卡片页面

import { extractCards, saveExtractedCards } from '../../utils/request'
import { chooseAndUploadImage } from '../../utils/upload'
import type { ExtractedCard } from '../../typings/types/api'

const TYPE_NAMES: Record<string, string> = {
  qa: '问答',
  concept: '概念',
  fill_blank: '填空',
}

Component({
  data: {
    deckId: 0,
    deckName: '',
    imageUrl: '',
    cards: [] as ExtractedCard[],
    loading: false,
    saving: false,
    expandedCard: -1,
    showEditModal: false,
    editingIndex: -1,
    editingCard: {
      front: '',
      back: '',
      type: 'qa' as 'qa' | 'concept' | 'fill_blank',
    },
  },

  onLoad(options: Record<string, string>) {
    this.setData({
      deckId: parseInt(options.deckId) || 0,
      deckName: decodeURIComponent(options.deckName || ''),
    })
  },

  methods: {
    /**
     * 获取类型名称
     */
    getTypeName(type: string): string {
      return TYPE_NAMES[type] || type
    },

    /**
     * 拍照或选择图片
     */
    async onChooseImage() {
      if (this.data.loading) return

      try {
        const result = await chooseAndUploadImage('card_source')
        const app = getApp<IAppOption>()
        const fullUrl = `${app.globalData.apiBaseURL}${result.url}`

        this.setData({
          imageUrl: fullUrl,
        })

        // 自动开始提取
        await this.doExtractCards()
      } catch (error) {
        console.error('上传图片失败:', error)
        wx.showToast({
          title: error instanceof Error ? error.message : '上传失败',
          icon: 'none',
          duration: 2000,
        })
      }
    },

    /**
     * 提取卡片（手动触发）
     */
    async onExtractCards() {
      if (!this.data.imageUrl || this.data.loading) return
      await this.doExtractCards()
    },

    /**
     * 执行提取卡片
     */
    async doExtractCards() {
      this.setData({ loading: true })

      try {
        const response = await extractCards({
          image_url: this.data.imageUrl,
          deck_id: this.data.deckId,
        })

        this.setData({
          cards: response.cards,
        })

        wx.showToast({
          title: `提取到 ${response.cards.length} 张卡片`,
          icon: 'success',
          duration: 1500,
        })
      } catch (error) {
        console.error('提取卡片失败:', error)
        wx.showToast({
          title: error instanceof Error ? error.message : '提取失败',
          icon: 'none',
          duration: 2000,
        })
      } finally {
        this.setData({ loading: false })
      }
    },

    /**
     * 展开/收起卡片
     */
    onToggleCard(e: WechatMiniprogram.TouchEvent) {
      const { index } = e.currentTarget.dataset
      this.setData({
        expandedCard: this.data.expandedCard === index ? -1 : index,
      })
    },

    /**
     * 编辑卡片
     */
    onEditCard(e: WechatMiniprogram.TouchEvent) {
      e.stopPropagation()
      const { index } = e.currentTarget.dataset
      const card = this.data.cards[index]
      this.setData({
        showEditModal: true,
        editingIndex: index,
        editingCard: {
          front: card.front,
          back: card.back,
          type: card.type,
        },
      })
    },

    /**
     * 删除卡片
     */
    onDeleteCard(e: WechatMiniprogram.TouchEvent) {
      e.stopPropagation()
      const { index } = e.currentTarget.dataset

      wx.showModal({
        title: '确认删除',
        content: '确定要删除这张卡片吗？',
        success: (res) => {
          if (res.confirm) {
            const cards = [...this.data.cards]
            cards.splice(index, 1)
            this.setData({ cards })

            wx.showToast({
              title: '已删除',
              icon: 'success',
            })
          }
        },
      })
    },

    /**
     * 关闭编辑弹窗
     */
    onCloseEditModal() {
      this.setData({ showEditModal: false })
    },

    /**
     * 阻止事件冒泡
     */
    stopPropagation() {
      // 阻止事件冒泡
    },

    /**
     * 编辑正面内容
     */
    onEditFront(e: WechatMiniprogram.Input) {
      this.setData({
        'editingCard.front': e.detail.value,
      })
    },

    /**
     * 编辑背面内容
     */
    onEditBack(e: WechatMiniprogram.Input) {
      this.setData({
        'editingCard.back': e.detail.value,
      })
    },

    /**
     * 选择卡片类型
     */
    onSelectType(e: WechatMiniprogram.TouchEvent) {
      const { type } = e.currentTarget.dataset
      this.setData({
        'editingCard.type': type,
      })
    },

    /**
     * 确认编辑
     */
    onConfirmEdit() {
      const { front, back } = this.data.editingCard
      if (!front.trim()) {
        wx.showToast({ title: '请输入正面内容', icon: 'none' })
        return
      }
      if (!back.trim()) {
        wx.showToast({ title: '请输入背面内容', icon: 'none' })
        return
      }

      const cards = [...this.data.cards]
      cards[this.data.editingIndex] = {
        ...this.data.editingCard,
        tags: cards[this.data.editingIndex].tags,
      }

      this.setData({
        cards,
        showEditModal: false,
      })

      wx.showToast({
        title: '已更新',
        icon: 'success',
      })
    },

    /**
     * 保存卡片
     */
    async onSaveCards() {
      if (this.data.cards.length === 0 || this.data.saving) return

      this.setData({ saving: true })

      try {
        const response = await saveExtractedCards({
          deck_id: this.data.deckId,
          cards: this.data.cards,
          image_url: this.data.imageUrl,
        })

        wx.showToast({
          title: `成功保存 ${response.count} 张卡片`,
          icon: 'success',
          duration: 1500,
        })

        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      } catch (error) {
        console.error('保存卡片失败:', error)
        wx.showToast({
          title: error instanceof Error ? error.message : '保存失败',
          icon: 'none',
          duration: 2000,
        })
      } finally {
        this.setData({ saving: false })
      }
    },
  },
})
