// utils/cache.ts
// 数据缓存管理工具 - 支持过期时间和缓存策略

/**
 * 缓存配置 - 各数据类型的缓存时间（秒）
 * -1 表示不缓存，实时获取
 */
export const CACHE_CONFIG = {
  userInfo: -1, // 不缓存，实时获取
  todayReviews: 60, // 60秒
  decks: 300, // 5分钟
  stats: 120, // 2分钟
  cards: 180, // 3分钟
}

/**
 * 缓存项结构
 */
interface CacheItem<T> {
  data: T
  timestamp: number
  expiresIn: number // 缓存有效期（秒）
}

/**
 * 存储键名前缀
 */
const CACHE_PREFIX = 'cache_'

/**
 * 获取缓存键名
 * @param key 原始键名
 * @returns 带前缀的完整键名
 */
function getCacheKey(key: string): string {
  return `${CACHE_PREFIX}${key}`
}

/**
 * 设置缓存
 * @param key 缓存键名
 * @param data 缓存数据
 * @param expiresIn 过期时间（秒），默认为0表示使用配置
 */
export function setCache<T>(key: string, data: T, expiresIn?: number): void {
  const configKey = key as keyof typeof CACHE_CONFIG
  const cacheTime = expiresIn ?? CACHE_CONFIG[configKey] ?? 60

  if (cacheTime === -1) return // 不缓存

  const item: CacheItem<T> = {
    data,
    timestamp: Date.now(),
    expiresIn: cacheTime,
  }

  try {
    wx.setStorageSync(getCacheKey(key), item)
  } catch (e) {
    console.error('缓存设置失败:', e)
  }
}

/**
 * 获取缓存
 * @param key 缓存键名
 * @returns 缓存数据或null
 */
export function getCache<T>(key: string): T | null {
  try {
    const item = wx.getStorageSync(getCacheKey(key)) as CacheItem<T>

    if (!item) return null

    const now = Date.now()
    const age = (now - item.timestamp) / 1000 // 转换为秒

    if (age > item.expiresIn) {
      // 缓存已过期，删除
      removeCache(key)
      return null
    }

    return item.data
  } catch (e) {
    console.error('缓存读取失败:', e)
    return null
  }
}

/**
 * 删除缓存
 * @param key 缓存键名
 */
export function removeCache(key: string): void {
  try {
    wx.removeStorageSync(getCacheKey(key))
  } catch (e) {
    console.error('缓存删除失败:', e)
  }
}

/**
 * 清除所有缓存
 */
export function clearAllCache(): void {
  try {
    const keys = wx.getStorageInfoSync().keys
    keys.forEach((key) => {
      if (key.startsWith(CACHE_PREFIX)) {
        wx.removeStorageSync(key)
      }
    })
  } catch (e) {
    console.error('清除缓存失败:', e)
  }
}

/**
 * 检查缓存是否有效
 * @param key 缓存键名
 * @returns 是否有效
 */
export function isCacheValid(key: string): boolean {
  const data = getCache(key)
  return data !== null
}

/**
 * 获取缓存年龄（秒）
 * @param key 缓存键名
 * @returns 缓存年龄（秒），-1表示不存在
 */
export function getCacheAge(key: string): number {
  try {
    const item = wx.getStorageSync(getCacheKey(key)) as CacheItem<unknown>

    if (!item) return -1

    return (Date.now() - item.timestamp) / 1000
  } catch (e) {
    return -1
  }
}

/**
 * 标记数据为过期（下次获取时会重新请求）
 * @param key 缓存键名
 */
export function markCacheStale(key: string): void {
  try {
    const item = wx.getStorageSync(getCacheKey(key)) as CacheItem<unknown>

    if (item) {
      item.timestamp = 0 // 设置时间为0，使其立即过期
      wx.setStorageSync(getCacheKey(key), item)
    }
  } catch (e) {
    console.error('标记缓存过期失败:', e)
  }
}

/**
 * 批量标记多个缓存为过期
 * @param keys 缓存键名数组
 */
export function markCachesStale(keys: string[]): void {
  keys.forEach((key) => markCacheStale(key))
}
