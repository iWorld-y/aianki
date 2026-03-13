// internal/service/deck.go
// 卡组服务层 - HTTP 处理器

package service

import (
	"strconv"

	"github.com/go-kratos/kratos/v2/transport/http"
	"github.com/jty/snapcard/internal/biz"
	"github.com/jty/snapcard/pkg/auth"
)

type DeckService struct {
	uc        *biz.DeckUsecase
	jwtSecret string
}

// DecksResponse 卡组列表响应
type DecksResponse struct {
	Code    int       `json:"code"`
	Message string    `json:"message,omitempty"`
	Data    DecksData `json:"data"`
}

type DecksData struct {
	Decks []DeckCardItem `json:"decks"`
}

type DeckCardItem struct {
	ID        int    `json:"id"`
	Name      string `json:"name"`
	Icon      string `json:"icon"`
	CardCount int    `json:"cardCount"`
	DueCount  int    `json:"dueCount"`
}

// CreateDeckRequest 创建卡组请求
type CreateDeckRequest struct {
	Name string `json:"name"`
}

// CreateDeckResponse 创建卡组响应
type CreateDeckResponse struct {
	Code    int    `json:"code"`
	Message string `json:"message,omitempty"`
	Data    struct {
		ID   int    `json:"id"`
		Name string `json:"name"`
	} `json:"data"`
}

func NewDeckService(uc *biz.DeckUsecase, jwtSecret string) *DeckService {
	return &DeckService{
		uc:        uc,
		jwtSecret: jwtSecret,
	}
}

// GetDecks 获取卡组列表
func (s *DeckService) GetDecks(ctx http.Context) error {
	// 从请求头中获取令牌
	tokenString, err := auth.GetTokenFromHeader(ctx)
	if err != nil {
		return ctx.JSON(200, DecksResponse{
			Code:    401,
			Message: "未授权: " + err.Error(),
		})
	}

	// 解析令牌
	claims, err := auth.ParseToken(tokenString, s.jwtSecret)
	if err != nil {
		return ctx.JSON(200, DecksResponse{
			Code:    401,
			Message: "无效的令牌",
		})
	}

	// 获取查询参数
	limitStr := ctx.Query().Get("limit")
	sort := ctx.Query().Get("sort")

	limit := 0 // 0 表示获取所有
	if limitStr != "" {
		limit, _ = strconv.Atoi(limitStr)
	}

	// 获取卡组数据
	var decks []*biz.Deck
	if limit > 0 {
		decks, err = s.uc.GetRecentDecks(ctx, claims.UserID, limit)
	} else {
		decks, err = s.uc.GetUserDecks(ctx, claims.UserID, sort)
	}

	if err != nil {
		return ctx.JSON(200, DecksResponse{
			Code:    500,
			Message: "获取卡组失败: " + err.Error(),
		})
	}

	// 转换为响应格式
	deckItems := make([]DeckCardItem, len(decks))
	for i, d := range decks {
		deckItems[i] = DeckCardItem{
			ID:        d.ID,
			Name:      d.Name,
			Icon:      "default", // 后续可从数据库中读取
			CardCount: d.TotalCards,
			DueCount:  d.DueToday,
		}
	}

	return ctx.JSON(200, DecksResponse{
		Code: 0,
		Data: DecksData{
			Decks: deckItems,
		},
	})
}

// CreateDeck 创建新卡组
func (s *DeckService) CreateDeck(ctx http.Context) error {
	// 从请求头中获取令牌
	tokenString, err := auth.GetTokenFromHeader(ctx)
	if err != nil {
		return ctx.JSON(200, CreateDeckResponse{
			Code:    401,
			Message: "未授权: " + err.Error(),
		})
	}

	// 解析令牌
	claims, err := auth.ParseToken(tokenString, s.jwtSecret)
	if err != nil {
		return ctx.JSON(200, CreateDeckResponse{
			Code:    401,
			Message: "无效的令牌",
		})
	}

	// 解析请求体
	var req CreateDeckRequest
	if err := ctx.Bind(&req); err != nil {
		return ctx.JSON(200, CreateDeckResponse{
			Code:    400,
			Message: "请求参数错误: " + err.Error(),
		})
	}

	// 验证卡组名称
	if req.Name == "" {
		return ctx.JSON(200, CreateDeckResponse{
			Code:    400,
			Message: "卡组名称不能为空",
		})
	}

	// 创建卡组
	deck, err := s.uc.CreateDeck(ctx, claims.UserID, req.Name)
	if err != nil {
		return ctx.JSON(200, CreateDeckResponse{
			Code:    500,
			Message: "创建卡组失败: " + err.Error(),
		})
	}

	return ctx.JSON(200, CreateDeckResponse{
		Code: 0,
		Data: struct {
			ID   int    `json:"id"`
			Name string `json:"name"`
		}{
			ID:   deck.ID,
			Name: deck.Name,
		},
	})
}
