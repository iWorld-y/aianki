// internal/data/card_extract.go
// 卡片提取数据访问层

package data

import (
	"context"
	"time"

	"github.com/jty/snapcard/ent"
	"github.com/jty/snapcard/ent/card"
	"github.com/jty/snapcard/ent/deck"
	"github.com/jty/snapcard/internal/biz"
)

type cardExtractRepo struct {
	client *ent.Client
}

// NewCardExtractRepo 创建卡片提取仓库
func NewCardExtractRepo(client *ent.Client) biz.CardExtractRepo {
	return &cardExtractRepo{client: client}
}

// VerifyDeckOwnership 验证卡组归属
func (r *cardExtractRepo) VerifyDeckOwnership(ctx context.Context, userID, deckID int) (bool, error) {
	exists, err := r.client.Deck.Query().
		Where(
			deck.ID(deckID),
			deck.UserID(userID),
		).
		Exist(ctx)
	if err != nil {
		return false, err
	}
	return exists, nil
}

// SaveExtractedCards 保存提取的卡片
func (r *cardExtractRepo) SaveExtractedCards(ctx context.Context, userID, deckID int, cards []biz.ExtractedCard, imageURL string) ([]int, error) {
	cardIDs := make([]int, 0, len(cards))

	// 使用事务批量创建卡片
	tx, err := r.client.Tx(ctx)
	if err != nil {
		return nil, err
	}
	defer func() {
		if v := recover(); v != nil {
			tx.Rollback()
		}
	}()

	for _, extractedCard := range cards {
		cardCreate := tx.Card.Create().
			SetUserID(userID).
			SetDeckID(deckID).
			SetFront(extractedCard.Front).
			SetBack(extractedCard.Back).
			SetTags(extractedCard.Tags).
			SetStability(0).
			SetDifficulty(0).
			SetDueDate(time.Now()).
			SetReps(0).
			SetLapses(0).
			SetState(card.StateNew)

		// 设置来源图片 URL
		if imageURL != "" {
			cardCreate.SetSourceImageURL(imageURL)
		}

		created, err := cardCreate.Save(ctx)
		if err != nil {
			tx.Rollback()
			return nil, err
		}
		cardIDs = append(cardIDs, created.ID)
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return cardIDs, nil
}
