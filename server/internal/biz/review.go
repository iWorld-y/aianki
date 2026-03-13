// internal/biz/review.go
// 复习业务逻辑层

package biz

import (
	"context"
)

// TodayReview 今日复习数据
type TodayReview struct {
	Count int   `json:"count"`
	Cards []int `json:"cards,omitempty"` // 卡片 ID 列表
}

// ReviewCard 复习卡片
type ReviewCard struct {
	ID       int
	Front    string
	DeckName string
}

// UserStats 用户统计信息
type UserStats struct {
	TotalCards    int `json:"totalCards"`    // 总卡片数
	TotalDecks    int `json:"totalDecks"`    // 总卡组数
	TotalReviews  int `json:"totalReviews"`  // 总复习次数
	TodayDueCards int `json:"todayDueCards"` // 今日待复习卡片数
	StreakDays    int `json:"streakDays"`    // 连续学习天数
	MasteredCards int `json:"masteredCards"` // 已掌握卡片数（稳定性高）
}

// ReviewRepo 复习仓库接口
type ReviewRepo interface {
	// GetTodayCards 获取今日待复习卡片
	GetTodayCards(ctx context.Context, userID int, limit int) ([]*ReviewCard, int, error)
	// GetTodayDueCards 获取今日待复习卡片数量和列表
	GetTodayDueCards(ctx context.Context, userID int) (*TodayReview, error)
	// GetUserStats 获取用户统计数据
	GetUserStats(ctx context.Context, userID int) (*UserStats, error)
}

type ReviewUsecase struct {
	repo           ReviewRepo
	maxDailyReview int
}

func NewReviewUsecase(repo ReviewRepo, maxDaily int) *ReviewUsecase {
	return &ReviewUsecase{
		repo:           repo,
		maxDailyReview: maxDaily,
	}
}

// GetTodayReviews 获取今日待复习卡片列表
func (uc *ReviewUsecase) GetTodayReviews(ctx context.Context, userID int) ([]*ReviewCard, int, error) {
	cards, count, err := uc.repo.GetTodayCards(ctx, userID, uc.maxDailyReview)
	if err != nil {
		return nil, 0, err
	}
	return cards, count, nil
}

// GetTodayDueCount 获取今日待复习数量
func (uc *ReviewUsecase) GetTodayDueCount(ctx context.Context, userID int) (*TodayReview, error) {
	return uc.repo.GetTodayDueCards(ctx, userID)
}

// GetUserStats 获取用户统计数据
func (uc *ReviewUsecase) GetUserStats(ctx context.Context, userID int) (*UserStats, error) {
	return uc.repo.GetUserStats(ctx, userID)
}
