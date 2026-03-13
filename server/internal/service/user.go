// internal/service/user.go
// 用户服务层 - HTTP 处理器

package service

import (
	"github.com/go-kratos/kratos/v2/transport/http"
	"github.com/jty/snapcard/internal/biz"
	"github.com/jty/snapcard/pkg/auth"
	"github.com/jty/snapcard/pkg/wechat"
)

type UserService struct {
	uc        *biz.UserUsecase
	wechatCli *wechat.Client
	jwtSecret string
}

type UserInfo struct {
	NickName  string `json:"nickName"`
	AvatarUrl string `json:"avatarUrl"`
}

type LoginRequest struct {
	Code     string   `json:"code"`
	UserInfo UserInfo `json:"userInfo"`
}

type UserInfoResponse struct {
	ID        int     `json:"id"`
	OpenID    string  `json:"openid"`
	Nickname  *string `json:"nickname"`
	AvatarURL *string `json:"avatar_url"`
}

type LoginResponse struct {
	Code    int    `json:"code"`
	Message string `json:"message,omitempty"`
	Data    struct {
		Token    string           `json:"token"`
		UserInfo UserInfoResponse `json:"userInfo"`
	} `json:"data"`
}

type GetUserInfoResponse struct {
	Code    int              `json:"code"`
	Message string           `json:"message,omitempty"`
	Data    UserInfoResponse `json:"data"`
}

func NewUserService(uc *biz.UserUsecase, wechatCli *wechat.Client, jwtSecret string) *UserService {
	return &UserService{
		uc:        uc,
		wechatCli: wechatCli,
		jwtSecret: jwtSecret,
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

	// 处理用户信息
	var nickname, avatarURL *string
	if req.UserInfo.NickName != "" {
		nickname = &req.UserInfo.NickName
	}
	if req.UserInfo.AvatarUrl != "" {
		avatarURL = &req.UserInfo.AvatarUrl
	}

	// 登录/注册用户
	user, token, err := s.uc.Login(ctx, session.OpenID, nickname, avatarURL)
	if err != nil {
		return ctx.JSON(200, LoginResponse{
			Code:    500,
			Message: "登录失败: " + err.Error(),
		})
	}

	return ctx.JSON(200, LoginResponse{
		Code: 0,
		Data: struct {
			Token    string           `json:"token"`
			UserInfo UserInfoResponse `json:"userInfo"`
		}{
			Token: token,
			UserInfo: UserInfoResponse{
				ID:        user.ID,
				OpenID:    user.OpenID,
				Nickname:  user.Nickname,
				AvatarURL: user.AvatarURL,
			},
		},
	})
}

func (s *UserService) GetUserInfo(ctx http.Context) error {
	// 从请求头中获取令牌
	tokenString, err := auth.GetTokenFromHeader(ctx)
	if err != nil {
		return ctx.JSON(200, GetUserInfoResponse{
			Code:    1003,
			Message: "未授权: " + err.Error(),
		})
	}

	// 解析令牌
	claims, err := auth.ParseToken(tokenString, s.jwtSecret)
	if err != nil {
		return ctx.JSON(200, GetUserInfoResponse{
			Code:    1003,
			Message: "无效的令牌",
		})
	}

	user, err := s.uc.GetUserInfo(ctx, claims.OpenID)
	if err != nil {
		if err == biz.ErrNotFound {
			return ctx.JSON(200, GetUserInfoResponse{
				Code:    1004,
				Message: "用户不存在",
			})
		}
		return ctx.JSON(200, GetUserInfoResponse{
			Code:    500,
			Message: "获取用户信息失败: " + err.Error(),
		})
	}

	return ctx.JSON(200, GetUserInfoResponse{
		Code: 0,
		Data: UserInfoResponse{
			ID:        user.ID,
			OpenID:    user.OpenID,
			Nickname:  user.Nickname,
			AvatarURL: user.AvatarURL,
		},
	})
}

func RegisterUserRoutes(r *http.Router, svc *UserService) {
	r.POST("/api/v1/auth/login", svc.Login)
	r.GET("/api/v1/user/info", svc.GetUserInfo)
}
