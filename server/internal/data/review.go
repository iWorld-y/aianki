// internal/data/review.go
// 复习数据访问层

package data

import (
	"context"
	"time"

	"github.com/jty/snapcard/ent"
	"github.com/jty/snapcard/ent/card"
	"github.com/jty/snapcard/ent/deck"
	"github.com/jty/snapcard/ent/reviewlog"
	"github.com/jty/snapcard/internal/biz"
)

type reviewRepo struct {
	client *ent.Client
}

func NewReviewRepo(client *ent.Client) biz.ReviewRepo {
	return &reviewRepo{client: client}
}

// GetTodayCards 获取今日待复习卡片列表
func (r *reviewRepo) GetTodayCards(ctx context.Context, userID int, limit int) ([]*biz.ReviewCard, int, error) {
	today := time.Now()

	// 查询今日待复习的卡片
	cards, err := r.client.Card.Query().
		Where(
			card.UserID(userID),
			card.DueDateLTE(today),
		).
		WithDeck().
		Limit(limit).
		All(ctx)
	if err != nil {
		return nil, 0, err
	}

	// 统计总数
	count, err := r.client.Card.Query().
		Where(
			card.UserID(userID),
			card.DueDateLTE(today),
		).
		Count(ctx)
	if err != nil {
		return nil, 0, err
	}

	// 转换为业务模型
	result := make([]*biz.ReviewCard, len(cards))
	for i, c := range cards {
		deckName := ""
		if c.Edges.Deck != nil {
			deckName = c.Edges.Deck.Name
		}
		result[i] = &biz.ReviewCard{
			ID:       c.ID,
			Front:    c.Front,
			DeckName: deckName,
		}
	}

	return result, count, nil
}

// GetTodayDueCards 获取今日待复习卡片数量
func (r *reviewRepo) GetTodayDueCards(ctx context.Context, userID int) (*biz.TodayReview, error) {
	today := time.Now()

	// 查询今日待复习的卡片数量
	count, err := r.client.Card.Query().
		Where(
			card.UserID(userID),
			card.DueDateLTE(today),
		).
		Count(ctx)
	if err != nil {
		return nil, err
	}

	// 获取卡片 ID 列表
	cards, err := r.client.Card.Query().
		Where(
			card.UserID(userID),
			card.DueDateLTE(today),
		).
		Select(card.FieldID).
		All(ctx)
	if err != nil {
		return nil, err
	}

	cardIDs := make([]int, len(cards))
	for i, c := range cards {
		cardIDs[i] = c.ID
	}

	return &biz.TodayReview{
		Count: count,
		Cards: cardIDs,
	}, nil
}

// GetUserStats 获取用户统计数据
func (r *reviewRepo) GetUserStats(ctx context.Context, userID int) (*biz.UserStats, error) {
	// 统计总卡片数
	totalCards, err := r.client.Card.Query().
		Where(card.UserID(userID)).
		Count(ctx)
	if err != nil {
		return nil, err
	}

	// 统计总卡组数
	totalDecks, err := r.client.Deck.Query().
		Where(deck.UserID(userID)).
		Count(ctx)
	if err != nil {
		return nil, err
	}

	// 统计总复习次数
	totalReviews, err := r.client.ReviewLog.Query().
		Where(reviewlog.UserID(userID)).
		Count(ctx)
	if err != nil {
		return nil, err
	}

	// 统计今日待复习卡片数
	today := time.Now()
	todayDueCards, err := r.client.Card.Query().
		Where(
			card.UserID(userID),
			card.DueDateLTE(today),
		).
		Count(ctx)
	if err != nil {
		return nil, err
	}

	// 统计已掌握卡片数（稳定性 > 7，或者重复次数 > 5 且遗忘次数 < 2）
	masteredCards, err := r.client.Card.Query().
		Where(
			card.UserID(userID),
			card.Or(
				card.StabilityGT(7.0),
				card.And(
					card.RepsGT(5),
					card.LapsesLT(2),
				),
			),
		).
		Count(ctx)
	if err != nil {
		return nil, err
	}

	// 计算连续学习天数（简化版本：基于最近 7 天是否有复习记录）
	streakDays := 0
	for i := 0; i < 30; i++ {
		day := time.Now().AddDate(0, 0, -i)
		nextDay := day.AddDate(0, 0, 1)

		count, err := r.client.ReviewLog.Query().
			Where(
				reviewlog.UserID(userID),
				reviewlog.ReviewedAtGTE(day),
				reviewlog.ReviewedAtLT(nextDay),
			).
			Count(ctx)
		if err != nil {
			return nil, err
		}

		if count > 0 {
			streakDays++
		} else if i > 0 {
			// 如果不是今天且没有记录，则中断
			break
		}
	}

	return &biz.UserStats{
		TotalCards:    totalCards,
		TotalDecks:    totalDecks,
		TotalReviews:  totalReviews,
		TodayDueCards: todayDueCards,
		StreakDays:    streakDays,
		MasteredCards: masteredCards,
	}, nil
}
