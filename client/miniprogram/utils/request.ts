const app = getApp<IAppOption>()

interface RequestOptions {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: any
  needAuth?: boolean
}

export function request<T>(options: RequestOptions): Promise<T> {
  return new Promise((resolve, reject) => {
    const header: any = {
      'Content-Type': 'application/json'
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
        if (res.statusCode === 401) {
          wx.removeStorageSync('token')
          app.globalData.isLoggedIn = false
          app.globalData.token = ''
          reject(new Error('未授权，请重新登录'))
          return
        }

        const data = res.data as any
        if (data.code === 0) {
          resolve(data.data)
        } else {
          reject(new Error(data.message || '请求失败'))
        }
      },
      fail: (err) => {
        reject(new Error(err.errMsg || '网络请求失败'))
      }
    })
  })
}

export function getTodayReviews(): Promise<TodayReviewsResponse> {
  return request<TodayReviewsResponse>({
    url: '/review/today'
  })
}

export function getStats(): Promise<StatsResponse> {
  return request<StatsResponse>({
    url: '/stats'
  })
}

export function getRecentDecks(limit: number = 5): Promise<DecksResponse> {
  return request<DecksResponse>({
    url: `/decks?limit=${limit}&sort=recent`
  })
}