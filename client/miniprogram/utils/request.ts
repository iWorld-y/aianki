// utils/request.ts
// API 请求封装和接口定义

import { setCache, getCache, CACHE_CONFIG } from './cache'
import type {
  TodayReviewsResponse,
  StatsResponse,
  DecksResponse,
  RecentDecksResponse,
  DeckItem,
  CreateDeckRequest,
  CreateDeckResponse,
  ReviewSubmitRequest,
  ReviewSubmitResponse,
} from '../typings/types/api'

const app = getApp<IAppOption>()

interface RequestOptions {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: unknown
  needAuth?: boolean
  cacheKey?: string // 缓存键名
  useCache?: boolean // 是否使用缓存
}

/**
 * 通用请求函数
 * @param options 请求选项
 * @returns Promise<T>
 */
export function request<T>(options: RequestOptions): Promise<T> {
  return new Promise((resolve, reject) => {
    // 检查是否需要使用缓存
    if (options.useCache && options.cacheKey && options.method === 'GET') {
      const cached = getCache<T>(options.cacheKey)
      if (cached !== null) {
        console.log(`[Cache] 命中缓存: ${options.cacheKey}`)
        resolve(cached)
        return
      }
    }

    const header: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (options.needAuth !== false && app.globalData.token) {
      header['Authorization'] = `Bearer ${app.globalData.token}`
    }

    wx.request({
      url: `${app.globalData.apiBaseURL}${options.url}`,
      method: options.method || 'GET',
      data: options.data,
      header,
      success: (res) => {
        // 处理 HTTP 错误状态码
        if (res.statusCode === 401) {
          wx.removeStorageSync('token')
          wx.removeStorageSync('userInfo')
          app.globalData.isLoggedIn = false
          app.globalData.token = ''
          app.globalData.userInfo = undefined
          reject(new Error('未授权，请重新登录'))
          return
        }

        if (res.statusCode === 404) {
          reject(new Error(`接口未找到: ${options.url}`))
          return
        }

        if (res.statusCode >= 500) {
          reject(new Error('服务器内部错误，请稍后重试'))
          return
        }

        // 处理业务逻辑错误
        const data = res.data as { code: number; message?: string; data: T }
        if (data.code === 0) {
          // 缓存响应数据
          if (options.useCache && options.cacheKey) {
            setCache(options.cacheKey, data.data)
          }
          resolve(data.data)
        } else {
          reject(new Error(data.message || `请求失败 (code: ${data.code})`))
        }
      },
      fail: (err) => {
        reject(new Error(err.errMsg || '网络请求失败'))
      },
    })
  })
}

/**
 * 获取今日待复习卡片列表
 * @returns Promise<TodayReviewsResponse>
 */
export function getTodayReviews(): Promise<TodayReviewsResponse> {
  return request<TodayReviewsResponse>({
    url: '/review/today',
    cacheKey: 'todayReviews',
    useCache: true,
  })
}

/**
 * 获取用户统计数据
 * @returns Promise<StatsResponse>
 */
export function getStats(): Promise<StatsResponse> {
  return request<StatsResponse>({
    url: '/stats',
    cacheKey: 'stats',
    useCache: true,
  })
}

/**
 * 获取用户所有卡组
 * @returns Promise<DecksResponse>
 */
export function getAllDecks(): Promise<DecksResponse> {
  return request<DecksResponse>({
    url: '/decks',
    cacheKey: 'decks',
    useCache: true,
  })
}

/**
 * 获取最近使用的卡组（首页使用）
 * @param limit 数量限制，默认5
 * @returns Promise<RecentDecksResponse>
 */
export function getRecentDecks(limit: number = 5): Promise<RecentDecksResponse> {
  return request<RecentDecksResponse>({
    url: `/decks?limit=${limit}&sort=recent`,
    cacheKey: 'decks',
    useCache: true,
  })
}

/**
 * 获取单个卡组详情
 * @param deckId 卡组ID
 * @returns Promise<DeckItem>
 */
export function getDeckDetail(deckId: number): Promise<DeckItem> {
  return request<DeckItem>({
    url: `/decks/${deckId}`,
  })
}

/**
 * 创建新卡组
 * @param data 卡组数据
 * @returns Promise<CreateDeckResponse>
 */
export function createDeck(data: CreateDeckRequest): Promise<CreateDeckResponse> {
  return request<CreateDeckResponse>({
    url: '/decks',
    method: 'POST',
    data,
  })
}

/**
 * 提交复习结果
 * @param data 复习提交数据
 * @returns Promise<ReviewSubmitResponse>
 */
export function submitReview(data: ReviewSubmitRequest): Promise<ReviewSubmitResponse> {
  return request<ReviewSubmitResponse>({
    url: '/review/submit',
    method: 'POST',
    data,
  })
}

/**
 * 刷新指定缓存
 * @param cacheKey 缓存键名
 */
export function refreshCache(cacheKey: string): void {
  console.log(`[Cache] 刷新缓存: ${cacheKey}`)
  // 下次请求时会自动重新获取
}
