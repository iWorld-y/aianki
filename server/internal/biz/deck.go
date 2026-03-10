package biz

import (
	"context"
	"time"
)

type Deck struct {
	ID             int
	Name           string
	TotalCards     int
	DueToday       int
	LastReviewedAt *time.Time
}

type DeckRepo interface {
	GetRecentDecks(ctx context.Context, userID int, limit int) ([]*Deck, error)
}

type DeckUsecase struct {
	repo DeckRepo
}

func NewDeckUsecase(repo DeckRepo) *DeckUsecase {
	return &DeckUsecase{repo: repo}
}

func (uc *DeckUsecase) GetRecentDecks(ctx context.Context, userID int, limit int) ([]*Deck, error) {
	return uc.repo.GetRecentDecks(ctx, userID, limit)
}
