// internal/service/card_extract.go
// 卡片提取服务层

package service

import (
	"github.com/go-kratos/kratos/v2/transport/http"
	"github.com/jty/snapcard/internal/biz"
	"github.com/jty/snapcard/pkg/auth"
)

// CardExtractService 卡片提取服务
type CardExtractService struct {
	uc        *biz.CardExtractUsecase
	jwtSecret string
}

// NewCardExtractService 创建卡片提取服务
func NewCardExtractService(uc *biz.CardExtractUsecase, jwtSecret string) *CardExtractService {
	return &CardExtractService{
		uc:        uc,
		jwtSecret: jwtSecret,
	}
}

// ExtractCardsRequest 提取卡片请求
type ExtractCardsRequest struct {
	ImageURL string `json:"image_url"`
	DeckID   int    `json:"deck_id"`
}

// ExtractCardsResponse 提取卡片响应
type ExtractCardsResponse struct {
	Code    int              `json:"code"`
	Message string           `json:"message,omitempty"`
	Data    ExtractCardsData `json:"data"`
}

type ExtractCardsData struct {
	Cards []ExtractedCardItem `json:"cards"`
}

type ExtractedCardItem struct {
	Front    string   `json:"front"`
	Back     string   `json:"back"`
	Tags     []string `json:"tags,omitempty"`
	Type     string   `json:"type"`
	ImageURL string   `json:"image_url,omitempty"`
}

// ExtractCards 从图片提取卡片
func (s *CardExtractService) ExtractCards(ctx http.Context) error {
	// 验证身份
	tokenString, err := auth.GetTokenFromHeader(ctx)
	if err != nil {
		return ctx.JSON(200, ExtractCardsResponse{
			Code:    401,
			Message: "未授权: " + err.Error(),
		})
	}

	claims, err := auth.ParseToken(tokenString, s.jwtSecret)
	if err != nil {
		return ctx.JSON(200, ExtractCardsResponse{
			Code:    401,
			Message: "无效的令牌",
		})
	}

	// 解析请求
	var req ExtractCardsRequest
	if err := ctx.Bind(&req); err != nil {
		return ctx.JSON(200, ExtractCardsResponse{
			Code:    400,
			Message: "请求参数错误: " + err.Error(),
		})
	}

	// 验证参数
	if req.ImageURL == "" {
		return ctx.JSON(200, ExtractCardsResponse{
			Code:    400,
			Message: "图片 URL 不能为空",
		})
	}
	if req.DeckID == 0 {
		return ctx.JSON(200, ExtractCardsResponse{
			Code:    400,
			Message: "卡组 ID 不能为空",
		})
	}

	// 调用业务逻辑
	cards, err := s.uc.ExtractCardsFromImage(ctx, claims.UserID, req.DeckID, req.ImageURL)
	if err != nil {
		return ctx.JSON(200, ExtractCardsResponse{
			Code:    500,
			Message: "提取卡片失败: " + err.Error(),
		})
	}

	// 转换响应
	cardItems := make([]ExtractedCardItem, len(cards))
	for i, card := range cards {
		cardItems[i] = ExtractedCardItem{
			Front:    card.Front,
			Back:     card.Back,
			Tags:     card.Tags,
			Type:     card.Type,
			ImageURL: card.ImageURL,
		}
	}

	return ctx.JSON(200, ExtractCardsResponse{
		Code: 0,
		Data: ExtractCardsData{
			Cards: cardItems,
		},
	})
}

// SaveExtractedCardsRequest 保存提取的卡片请求
type SaveExtractedCardsRequest struct {
	DeckID   int                 `json:"deck_id"`
	Cards    []ExtractedCardItem `json:"cards"`
	ImageURL string              `json:"image_url"`
}

// SaveExtractedCardsResponse 保存提取的卡片响应
type SaveExtractedCardsResponse struct {
	Code    int                    `json:"code"`
	Message string                 `json:"message,omitempty"`
	Data    SaveExtractedCardsData `json:"data"`
}

type SaveExtractedCardsData struct {
	CardIDs []int `json:"card_ids"`
	Count   int   `json:"count"`
}

// SaveExtractedCards 保存提取的卡片
func (s *CardExtractService) SaveExtractedCards(ctx http.Context) error {
	// 验证身份
	tokenString, err := auth.GetTokenFromHeader(ctx)
	if err != nil {
		return ctx.JSON(200, SaveExtractedCardsResponse{
			Code:    401,
			Message: "未授权: " + err.Error(),
		})
	}

	claims, err := auth.ParseToken(tokenString, s.jwtSecret)
	if err != nil {
		return ctx.JSON(200, SaveExtractedCardsResponse{
			Code:    401,
			Message: "无效的令牌",
		})
	}

	// 解析请求
	var req SaveExtractedCardsRequest
	if err := ctx.Bind(&req); err != nil {
		return ctx.JSON(200, SaveExtractedCardsResponse{
			Code:    400,
			Message: "请求参数错误: " + err.Error(),
		})
	}

	// 验证参数
	if req.DeckID == 0 {
		return ctx.JSON(200, SaveExtractedCardsResponse{
			Code:    400,
			Message: "卡组 ID 不能为空",
		})
	}
	if len(req.Cards) == 0 {
		return ctx.JSON(200, SaveExtractedCardsResponse{
			Code:    400,
			Message: "卡片列表不能为空",
		})
	}

	// 转换为业务模型
	cards := make([]biz.ExtractedCard, len(req.Cards))
	for i, card := range req.Cards {
		cards[i] = biz.ExtractedCard{
			Front:    card.Front,
			Back:     card.Back,
			Tags:     card.Tags,
			Type:     card.Type,
			ImageURL: req.ImageURL,
		}
	}

	// 调用业务逻辑
	cardIDs, err := s.uc.SaveExtractedCards(ctx, claims.UserID, req.DeckID, cards, req.ImageURL)
	if err != nil {
		return ctx.JSON(200, SaveExtractedCardsResponse{
			Code:    500,
			Message: "保存卡片失败: " + err.Error(),
		})
	}

	return ctx.JSON(200, SaveExtractedCardsResponse{
		Code: 0,
		Data: SaveExtractedCardsData{
			CardIDs: cardIDs,
			Count:   len(cardIDs),
		},
	})
}
