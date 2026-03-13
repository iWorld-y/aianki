// pkg/auth/jwt.go
// JWT 认证工具

package auth

import (
	"context"
	"errors"
	"strings"

	"github.com/go-kratos/kratos/v2/transport/http"
	"github.com/golang-jwt/jwt/v5"
)

var ErrInvalidToken = errors.New("invalid token")

// Claims JWT 令牌声明
type Claims struct {
	UserID int    `json:"user_id"`
	OpenID string `json:"openid"`
	jwt.RegisteredClaims
}

// ParseToken 解析 JWT 令牌
func ParseToken(tokenString string, jwtSecret string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		return []byte(jwtSecret), nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims, nil
	}

	return nil, ErrInvalidToken
}

// GetTokenFromHeader 从请求头中获取令牌
func GetTokenFromHeader(ctx http.Context) (string, error) {
	authHeader := ctx.Request().Header.Get("Authorization")
	if authHeader == "" {
		return "", errors.New("missing authorization header")
	}

	// 支持 "Bearer <token>" 格式
	parts := strings.SplitN(authHeader, " ", 2)
	if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
		return "", errors.New("invalid authorization header format")
	}

	return parts[1], nil
}

// UserIDFromContext 从上下文中获取用户 ID
func UserIDFromContext(ctx context.Context) (int, bool) {
	userID, ok := ctx.Value("user_id").(int)
	return userID, ok
}

// OpenIDFromContext 从上下文中获取 OpenID
func OpenIDFromContext(ctx context.Context) (string, bool) {
	openid, ok := ctx.Value("openid").(string)
	return openid, ok
}

// NewContextWithUser 创建包含用户信息的上下文
func NewContextWithUser(ctx context.Context, userID int, openid string) context.Context {
	ctx = context.WithValue(ctx, "user_id", userID)
	ctx = context.WithValue(ctx, "openid", openid)
	return ctx
}
