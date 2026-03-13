// internal/service/user.go
// 用户服务层 - HTTP 处理器

package service

import (
	"github.com/go-kratos/kratos/v2/transport/http"
	"github.com/jty/snapcard/internal/biz"
	"github.com/jty/snapcard/pkg/wechat"
)

type UserService struct {
	uc        *biz.UserUsecase
	wechatCli *wechat.Client
}

type LoginRequest struct {
	Code string `json:"code"`
}

type LoginResponse struct {
	Code    int    `json:"code"`
	Message string `json:"message,omitempty"`
	Data    struct {
		Token string `json:"token"`
	} `json:"data"`
}

func NewUserService(uc *biz.UserUsecase, wechatCli *wechat.Client) *UserService {
	return &UserService{
		uc:        uc,
		wechatCli: wechatCli,
	}
}

func (s *UserService) Login(ctx http.Context) error {
	var req LoginRequest
	if err := ctx.Bind(&req); err != nil {
		return ctx.JSON(200, LoginResponse{
			Code:    1001,
			Message: "参数错误: " + err.Error(),
		})
	}

	if req.Code == "" {
		return ctx.JSON(200, LoginResponse{
			Code:    1001,
			Message: "缺少 code 参数",
		})
	}

	// 调用微信接口获取 openid
	session, err := s.wechatCli.Code2Session(req.Code)
	if err != nil {
		return ctx.JSON(200, LoginResponse{
			Code:    1002,
			Message: "微信登录失败: " + err.Error(),
		})
	}

	// 登录/注册用户
	token, err := s.uc.Login(ctx, session.OpenID)
	if err != nil {
		return ctx.JSON(200, LoginResponse{
			Code:    500,
			Message: "登录失败: " + err.Error(),
		})
	}

	return ctx.JSON(200, LoginResponse{
		Code: 0,
		Data: struct {
			Token string `json:"token"`
		}{
			Token: token,
		},
	})
}

func RegisterUserRoutes(r *http.Router, svc *UserService) {
	r.POST("/api/v1/auth/login", svc.Login)
}
