package biz

import "context"

type Stats struct {
	TotalCards    int
	TodayReviewed int
	StreakDays    int
	MasteredCards int
}

type StatsRepo interface {
	GetTotalCards(ctx context.Context, userID int) (int, error)
	GetTodayReviewed(ctx context.Context, userID int) (int, error)
	GetStreakDays(ctx context.Context, userID int) (int, error)
	GetMasteredCards(ctx context.Context, userID int) (int, error)
}

type StatsUsecase struct {
	repo StatsRepo
}

func NewStatsUsecase(repo StatsRepo) *StatsUsecase {
	return &StatsUsecase{repo: repo}
}

func (uc *StatsUsecase) GetStats(ctx context.Context, userID int) (*Stats, error) {
	total, err := uc.repo.GetTotalCards(ctx, userID)
	if err != nil {
		return nil, err
	}

	today, err := uc.repo.GetTodayReviewed(ctx, userID)
	if err != nil {
		return nil, err
	}

	streak, err := uc.repo.GetStreakDays(ctx, userID)
	if err != nil {
		return nil, err
	}

	mastered, err := uc.repo.GetMasteredCards(ctx, userID)
	if err != nil {
		return nil, err
	}

	return &Stats{
		TotalCards:    total,
		TodayReviewed: today,
		StreakDays:    streak,
		MasteredCards: mastered,
	}, nil
}
