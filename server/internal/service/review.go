// internal/service/review.go
// 复习服务层 - HTTP 处理器

package service

import (
	"github.com/go-kratos/kratos/v2/transport/http"
	"github.com/jty/snapcard/internal/biz"
	"github.com/jty/snapcard/pkg/auth"
)

type ReviewService struct {
	uc        *biz.ReviewUsecase
	jwtSecret string
}

// TodayReviewsResponse 今日复习响应
type TodayReviewsResponse struct {
	Code    int              `json:"code"`
	Message string           `json:"message,omitempty"`
	Data    TodayReviewsData `json:"data"`
}

type TodayReviewsData struct {
	Count int   `json:"count"`
	Cards []int `json:"cards"`
}

// StatsResponse 统计响应
type StatsResponse struct {
	Code    int           `json:"code"`
	Message string        `json:"message,omitempty"`
	Data    biz.UserStats `json:"data"`
}

func NewReviewService(uc *biz.ReviewUsecase, jwtSecret string) *ReviewService {
	return &ReviewService{
		uc:        uc,
		jwtSecret: jwtSecret,
	}
}

// GetTodayReviews 获取今日待复习数据
func (s *ReviewService) GetTodayReviews(ctx http.Context) error {
	// 从请求头中获取令牌
	tokenString, err := auth.GetTokenFromHeader(ctx)
	if err != nil {
		return ctx.JSON(200, TodayReviewsResponse{
			Code:    401,
			Message: "未授权: " + err.Error(),
		})
	}

	// 解析令牌
	claims, err := auth.ParseToken(tokenString, s.jwtSecret)
	if err != nil {
		return ctx.JSON(200, TodayReviewsResponse{
			Code:    401,
			Message: "无效的令牌",
		})
	}

	// 获取今日待复习数据
	todayReview, err := s.uc.GetTodayDueCount(ctx, claims.UserID)
	if err != nil {
		return ctx.JSON(200, TodayReviewsResponse{
			Code:    500,
			Message: "获取数据失败: " + err.Error(),
		})
	}

	return ctx.JSON(200, TodayReviewsResponse{
		Code: 0,
		Data: TodayReviewsData{
			Count: todayReview.Count,
			Cards: todayReview.Cards,
		},
	})
}

// GetStats 获取用户统计数据
func (s *ReviewService) GetStats(ctx http.Context) error {
	// 从请求头中获取令牌
	tokenString, err := auth.GetTokenFromHeader(ctx)
	if err != nil {
		return ctx.JSON(200, StatsResponse{
			Code:    401,
			Message: "未授权: " + err.Error(),
		})
	}

	// 解析令牌
	claims, err := auth.ParseToken(tokenString, s.jwtSecret)
	if err != nil {
		return ctx.JSON(200, StatsResponse{
			Code:    401,
			Message: "无效的令牌",
		})
	}

	// 获取统计数据
	stats, err := s.uc.GetUserStats(ctx, claims.UserID)
	if err != nil {
		return ctx.JSON(200, StatsResponse{
			Code:    500,
			Message: "获取统计数据失败: " + err.Error(),
		})
	}

	return ctx.JSON(200, StatsResponse{
		Code: 0,
		Data: *stats,
	})
}
