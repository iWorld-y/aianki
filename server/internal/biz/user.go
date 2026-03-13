package biz

import (
	"context"
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

var ErrNotFound = errors.New("not found")

type User struct {
	ID        int
	OpenID    string
	Nickname  *string
	AvatarURL *string
}

type UserRepo interface {
	Create(ctx context.Context, openid string) (*User, error)
	FindByOpenID(ctx context.Context, openid string) (*User, error)
	UpdateUserInfo(ctx context.Context, openid string, nickname, avatarURL *string) (*User, error)
}

type UserUsecase struct {
	repo      UserRepo
	jwtSecret string
}

func NewUserUsecase(repo UserRepo, jwtSecret string) *UserUsecase {
	return &UserUsecase{
		repo:      repo,
		jwtSecret: jwtSecret,
	}
}

func (uc *UserUsecase) Login(ctx context.Context, openid string, nickname, avatarURL *string) (*User, string, error) {
	user, err := uc.repo.FindByOpenID(ctx, openid)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			user, err = uc.repo.Create(ctx, openid)
			if err != nil {
				return nil, "", err
			}
		} else {
			return nil, "", err
		}
	}

	// 如果提供了用户信息且数据库中没有，则更新
	if nickname != nil || avatarURL != nil {
		user, err = uc.repo.UpdateUserInfo(ctx, openid, nickname, avatarURL)
		if err != nil {
			// 更新失败不影响登录，仅记录错误
			// 实际项目中应该记录日志
		}
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": user.ID,
		"openid":  user.OpenID,
		"exp":     time.Now().Add(7 * 24 * time.Hour).Unix(),
	})

	tokenString, err := token.SignedString([]byte(uc.jwtSecret))
	if err != nil {
		return nil, "", err
	}

	return user, tokenString, nil
}

func (uc *UserUsecase) GetUserInfo(ctx context.Context, openid string) (*User, error) {
	return uc.repo.FindByOpenID(ctx, openid)
}
