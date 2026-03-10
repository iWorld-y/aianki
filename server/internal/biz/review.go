package biz

import "context"

type ReviewCard struct {
	ID       int
	Front    string
	DeckName string
}

type ReviewRepo interface {
	GetTodayCards(ctx context.Context, userID int, limit int) ([]*ReviewCard, int, error)
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

func (uc *ReviewUsecase) GetTodayReviews(ctx context.Context, userID int) ([]*ReviewCard, int, error) {
	cards, count, err := uc.repo.GetTodayCards(ctx, userID, uc.maxDailyReview)
	if err != nil {
		return nil, 0, err
	}
	return cards, count, nil
}
