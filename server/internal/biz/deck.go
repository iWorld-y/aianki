// internal/biz/deck.go
// 卡组业务逻辑层

package biz

import (
	"context"
	"time"
)

// Deck 卡组领域模型
type Deck struct {
	ID             int
	UserID         int
	Name           string
	TotalCards     int
	DueToday       int
	LastReviewedAt *time.Time
}

// DeckCard 卡组卡片信息（前端展示用）
type DeckCard struct {
	ID        int    `json:"id"`
	Name      string `json:"name"`
	Icon      string `json:"icon"`
	CardCount int    `json:"cardCount"`
	DueCount  int    `json:"dueCount"`
}

// DeckRepo 卡组仓库接口
type DeckRepo interface {
	// GetRecentDecks 获取最近的卡组
	GetRecentDecks(ctx context.Context, userID int, limit int) ([]*Deck, error)
	// GetUserDecks 获取用户的所有卡组
	GetUserDecks(ctx context.Context, userID int, sort string) ([]*Deck, error)
	// CountUserDecks 统计用户卡组数量
	CountUserDecks(ctx context.Context, userID int) (int, error)
}

type DeckUsecase struct {
	repo DeckRepo
}

func NewDeckUsecase(repo DeckRepo) *DeckUsecase {
	return &DeckUsecase{repo: repo}
}

// GetRecentDecks 获取最近的卡组
func (uc *DeckUsecase) GetRecentDecks(ctx context.Context, userID int, limit int) ([]*Deck, error) {
	return uc.repo.GetRecentDecks(ctx, userID, limit)
}

// GetUserDecks 获取用户的所有卡组
func (uc *DeckUsecase) GetUserDecks(ctx context.Context, userID int, sort string) ([]*Deck, error) {
	return uc.repo.GetUserDecks(ctx, userID, sort)
}

// CountUserDecks 统计用户卡组数量
func (uc *DeckUsecase) CountUserDecks(ctx context.Context, userID int) (int, error) {
	return uc.repo.CountUserDecks(ctx, userID)
}
