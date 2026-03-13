// internal/data/deck.go
// 卡组数据访问层

package data

import (
	"context"
	"time"

	"github.com/jty/snapcard/ent"
	"github.com/jty/snapcard/ent/deck"
	"github.com/jty/snapcard/internal/biz"
)

type deckRepo struct {
	client *ent.Client
}

func NewDeckRepo(client *ent.Client) biz.DeckRepo {
	return &deckRepo{client: client}
}

// GetRecentDecks 获取最近的卡组
func (r *deckRepo) GetRecentDecks(ctx context.Context, userID int, limit int) ([]*biz.Deck, error) {
	decks, err := r.client.Deck.Query().
		Where(deck.UserID(userID)).
		Order(ent.Desc(deck.FieldUpdatedAt)).
		Limit(limit).
		WithCards().
		All(ctx)
	if err != nil {
		return nil, err
	}

	return r.toBizList(decks), nil
}

// GetUserDecks 获取用户的所有卡组
func (r *deckRepo) GetUserDecks(ctx context.Context, userID int, sort string) ([]*biz.Deck, error) {
	query := r.client.Deck.Query().
		Where(deck.UserID(userID)).
		WithCards()

	// 根据排序参数选择排序方式
	switch sort {
	case "recent":
		query = query.Order(ent.Desc(deck.FieldUpdatedAt))
	case "name":
		query = query.Order(ent.Asc(deck.FieldName))
	default:
		query = query.Order(ent.Desc(deck.FieldCreatedAt))
	}

	decks, err := query.All(ctx)
	if err != nil {
		return nil, err
	}

	return r.toBizList(decks), nil
}

// CountUserDecks 统计用户卡组数量
func (r *deckRepo) CountUserDecks(ctx context.Context, userID int) (int, error) {
	return r.client.Deck.Query().
		Where(deck.UserID(userID)).
		Count(ctx)
}

// toBizList 转换为业务模型列表
func (r *deckRepo) toBizList(decks []*ent.Deck) []*biz.Deck {
	result := make([]*biz.Deck, len(decks))
	for i, d := range decks {
		result[i] = r.toBiz(d)
	}
	return result
}

// CreateDeck 创建新卡组
func (r *deckRepo) CreateDeck(ctx context.Context, userID int, name string) (*biz.Deck, error) {
	d, err := r.client.Deck.Create().
		SetUserID(userID).
		SetName(name).
		Save(ctx)
	if err != nil {
		return nil, err
	}
	return &biz.Deck{
		ID:         d.ID,
		UserID:     d.UserID,
		Name:       d.Name,
		TotalCards: 0,
		DueToday:   0,
	}, nil
}

// toBiz 转换为业务模型
func (r *deckRepo) toBiz(d *ent.Deck) *biz.Deck {
	// 统计卡片数量和今日待复习数量
	totalCards := 0
	dueToday := 0

	if d.Edges.Cards != nil {
		totalCards = len(d.Edges.Cards)
		today := time.Now().Truncate(24 * time.Hour)
		for _, card := range d.Edges.Cards {
			if card.DueDate.Truncate(24*time.Hour).Before(today) ||
				card.DueDate.Truncate(24*time.Hour).Equal(today) {
				dueToday++
			}
		}
	}

	return &biz.Deck{
		ID:         d.ID,
		UserID:     d.UserID,
		Name:       d.Name,
		TotalCards: totalCards,
		DueToday:   dueToday,
	}
}
