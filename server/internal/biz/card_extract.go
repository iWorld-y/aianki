// internal/biz/card_extract.go
// 卡片提取业务逻辑

package biz

import (
	"context"
	"errors"

	"github.com/jty/snapcard/pkg/ai"
)

var (
	ErrDeckNotFound    = errors.New("卡组不存在")
	ErrInvalidDeck     = errors.New("无权访问该卡组")
	ErrAIExtractFailed = errors.New("AI 提取失败")
)

// ExtractedCard 提取的卡片
type ExtractedCard struct {
	ID       int      `json:"id,omitempty"`
	Front    string   `json:"front"`
	Back     string   `json:"back"`
	Tags     []string `json:"tags,omitempty"`
	Type     string   `json:"type"`
	ImageURL string   `json:"image_url,omitempty"`
}

// CardExtractRepo 卡片提取仓库接口
type CardExtractRepo interface {
	// SaveExtractedCards 保存提取的卡片
	SaveExtractedCards(ctx context.Context, userID, deckID int, cards []ExtractedCard, imageURL string) ([]int, error)
	// VerifyDeckOwnership 验证卡组归属
	VerifyDeckOwnership(ctx context.Context, userID, deckID int) (bool, error)
}

// CardExtractUsecase 卡片提取用例
type CardExtractUsecase struct {
	aiClient ai.AIClient
	cardRepo CardExtractRepo
}

// NewCardExtractUsecase 创建卡片提取用例
func NewCardExtractUsecase(aiClient ai.AIClient, cardRepo CardExtractRepo) *CardExtractUsecase {
	return &CardExtractUsecase{
		aiClient: aiClient,
		cardRepo: cardRepo,
	}
}

// ExtractCardsFromImage 从图片提取卡片
func (uc *CardExtractUsecase) ExtractCardsFromImage(ctx context.Context, userID, deckID int, imageURL string) ([]ExtractedCard, error) {
	// 验证卡组归属
	owned, err := uc.cardRepo.VerifyDeckOwnership(ctx, userID, deckID)
	if err != nil {
		return nil, err
	}
	if !owned {
		return nil, ErrInvalidDeck
	}

	// 调用 AI 提取卡片
	result, err := uc.aiClient.ExtractCards(ctx, imageURL)
	if err != nil {
		return nil, ErrAIExtractFailed
	}

	// 转换为业务模型
	cards := make([]ExtractedCard, len(result.Cards))
	for i, card := range result.Cards {
		cards[i] = ExtractedCard{
			Front:    card.Front,
			Back:     card.Back,
			Tags:     card.Tags,
			Type:     card.Type,
			ImageURL: imageURL,
		}
	}

	return cards, nil
}

// SaveExtractedCards 保存提取的卡片
func (uc *CardExtractUsecase) SaveExtractedCards(ctx context.Context, userID, deckID int, cards []ExtractedCard, imageURL string) ([]int, error) {
	// 验证卡组归属
	owned, err := uc.cardRepo.VerifyDeckOwnership(ctx, userID, deckID)
	if err != nil {
		return nil, err
	}
	if !owned {
		return nil, ErrInvalidDeck
	}

	// 设置图片 URL
	for i := range cards {
		cards[i].ImageURL = imageURL
	}

	// 保存卡片到数据库
	cardIDs, err := uc.cardRepo.SaveExtractedCards(ctx, userID, deckID, cards, imageURL)
	if err != nil {
		return nil, err
	}

	return cardIDs, nil
}
