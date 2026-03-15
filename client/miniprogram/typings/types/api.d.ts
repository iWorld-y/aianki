// typings/types/api.d.ts
// API 接口类型定义

/**
 * 统一 API 响应格式
 */
export interface ApiResponse<T = unknown> {
  code: number
  message?: string
  data: T
}

/**
 * 卡组图标类型
 */
export type DeckIconType =
  | 'translate'
  | 'history'
  | 'functions'
  | 'science'
  | 'art'
  | 'default'

/**
 * 卡组图标映射配置
 */
export interface DeckIconConfig {
  icon: string // 显示的emoji或图标
  bgColor: string // 背景色
  iconColor: string // 图标色
}

/**
 * 图标映射规则
 */
export const DECK_ICON_MAP: Record<DeckIconType, DeckIconConfig> = {
  translate: { icon: '🌐', bgColor: 'rgba(80, 72, 229, 0.1)', iconColor: '#5048e5' },
  history: { icon: '📜', bgColor: 'rgba(249, 115, 22, 0.1)', iconColor: '#f97316' },
  functions: { icon: '∑', bgColor: 'rgba(16, 185, 129, 0.1)', iconColor: '#10b981' },
  science: { icon: '🔬', bgColor: 'rgba(59, 130, 246, 0.1)', iconColor: '#3b82f6' },
  art: { icon: '🎨', bgColor: 'rgba(236, 72, 153, 0.1)', iconColor: '#ec4899' },
  default: { icon: '📚', bgColor: 'rgba(107, 114, 128, 0.1)', iconColor: '#6b7280' },
}

/**
 * 卡组基础信息（用于首页卡片展示）
 */
export interface DeckCard {
  id: number
  name: string
  icon: DeckIconType
  cardCount: number
  dueCount: number
  bgColor: string
  iconColor: string
}

/**
 * 卡组详情（用于卡组列表）
 */
export interface DeckItem {
  id: number
  name: string
  description?: string
  totalCards: number
  dueToday: number
  lastReviewedAt?: string
  createdAt: string
}

/**
 * 用户统计数据
 */
export interface UserStats {
  totalCards: number
  todayReviewed: number
  streakDays: number
  masteredCards: number
}

/**
 * 复习卡片
 */
export interface ReviewCard {
  id: number
  front: string
  back: string
  deckName: string
  tags?: string[]
}

/**
 * 今日待复习响应
 */
export interface TodayReviewsResponse {
  count: number
  cards: ReviewCard[]
}

/**
 * 统计数据响应
 */
export interface StatsResponse {
  totalCards: number
  todayReviewed: number
  streakDays: number
  masteredCards: number
}

/**
 * 卡组列表响应
 */
export interface DecksResponse {
  decks: DeckItem[]
}

/**
 * 最近卡组响应（首页使用）
 */
export interface RecentDecksResponse {
  decks: DeckCard[]
}

/**
 * 创建卡组请求
 */
export interface CreateDeckRequest {
  name: string
  description?: string
  icon?: DeckIconType
}

/**
 * 创建卡组响应
 */
export interface CreateDeckResponse {
  id: number
  name: string
}

/**
 * 复习提交请求
 */
export interface ReviewSubmitRequest {
  cardId: number
  rating: 'again' | 'hard' | 'good' | 'easy'
  timeSpent?: number // 花费时间（毫秒）
}

/**
 * 复习提交响应
 */
export interface ReviewSubmitResponse {
  success: boolean
  nextReview?: string // 下次复习时间
  interval?: number // 间隔天数
}

/**
 * 用户信息
 */
export interface UserInfoResponse {
  id: number
  openid: string
  nickname?: string
  avatar_url?: string
}

export interface UploadImageResponse {
  url: string
  filename: string
  size: number
}

export interface UploadImageRequest {
  filePath: string
  type?: string
}

/**
 * 提取卡片请求
 */
export interface ExtractCardsRequest {
  image_url: string
  deck_id: number
}

/**
 * 提取的卡片
 */
export interface ExtractedCard {
  front: string
  back: string
  tags?: string[]
  type: 'qa' | 'concept' | 'fill_blank'
  image_url?: string
}

/**
 * 提取卡片响应
 */
export interface ExtractCardsResponse {
  cards: ExtractedCard[]
}

/**
 * 保存提取的卡片请求
 */
export interface SaveExtractedCardsRequest {
  deck_id: number
  cards: ExtractedCard[]
  image_url?: string
}

/**
 * 保存提取的卡片响应
 */
export interface SaveExtractedCardsResponse {
  card_ids: number[]
  count: number
}
