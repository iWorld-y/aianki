export interface ApiResponse<T = any> {
  code: number
  message?: string
  data: T
}

export interface TodayReviewsResponse {
  count: number
  cards: Array<{
    id: number
    front: string
    deck_name: string
  }>
}

export interface StatsResponse {
  total_cards: number
  today_reviewed: number
  streak_days: number
  mastered_cards?: number
}

export interface Deck {
  id: number
  name: string
  total_cards: number
  due_today: number
  last_reviewed_at?: string
}

export interface DecksResponse {
  decks: Deck[]
}