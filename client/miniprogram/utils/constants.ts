// utils/constants.ts
// 应用常量定义

import type { DeckIconType, DeckIconConfig } from '../typings/types/api'

/**
 * 卡组图标映射配置
 */
export const DECK_ICON_MAP: Record<DeckIconType, DeckIconConfig> = {
  translate: { icon: '🌐', bgColor: 'rgba(80, 72, 229, 0.1)', iconColor: '#5048e5' },
  history: { icon: '📜', bgColor: 'rgba(249, 115, 22, 0.1)', iconColor: '#f97316' },
  functions: { icon: '∑', bgColor: 'rgba(16, 185, 129, 0.1)', iconColor: '#10b981' },
  science: { icon: '🔬', bgColor: 'rgba(59, 130, 246, 0.1)', iconColor: '#3b82f6' },
  art: { icon: '🎨', bgColor: 'rgba(236, 72, 153, 0.1)', iconColor: '#ec4899' },
  default: { icon: '📚', bgColor: 'rgba(107, 114, 128, 0.1)', iconColor: '#6b7280' },
}
