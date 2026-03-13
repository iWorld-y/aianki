// internal/data/user.go
// 用户数据访问层

package data

import (
	"context"

	"github.com/jty/snapcard/ent"
	"github.com/jty/snapcard/ent/user"
	"github.com/jty/snapcard/internal/biz"
)

type userRepo struct {
	client *ent.Client
}

func NewUserRepo(client *ent.Client) biz.UserRepo {
	return &userRepo{client: client}
}

func (r *userRepo) Create(ctx context.Context, openid string) (*biz.User, error) {
	u, err := r.client.User.Create().
		SetOpenid(openid).
		Save(ctx)
	if err != nil {
		return nil, err
	}

	return r.toBiz(u), nil
}

func (r *userRepo) FindByOpenID(ctx context.Context, openid string) (*biz.User, error) {
	u, err := r.client.User.Query().
		Where(user.Openid(openid)).
		Only(ctx)
	if err != nil {
		if ent.IsNotFound(err) {
			return nil, biz.ErrNotFound
		}
		return nil, err
	}

	return r.toBiz(u), nil
}

func (r *userRepo) UpdateUserInfo(ctx context.Context, openid string, nickname, avatarURL *string) (*biz.User, error) {
	// 先查询用户
	u, err := r.client.User.Query().
		Where(user.Openid(openid)).
		Only(ctx)
	if err != nil {
		if ent.IsNotFound(err) {
			return nil, biz.ErrNotFound
		}
		return nil, err
	}

	// 构建更新
	update := r.client.User.UpdateOne(u)

	// 只有当传入的值不为空且当前数据库为空时才更新
	if nickname != nil && *nickname != "" {
		if u.Nickname == nil || *u.Nickname == "" {
			update = update.SetNickname(*nickname)
		}
	}
	if avatarURL != nil && *avatarURL != "" {
		if u.AvatarURL == nil || *u.AvatarURL == "" {
			update = update.SetAvatarURL(*avatarURL)
		}
	}

	updatedUser, err := update.Save(ctx)
	if err != nil {
		return nil, err
	}

	return r.toBiz(updatedUser), nil
}

func (r *userRepo) toBiz(u *ent.User) *biz.User {
	return &biz.User{
		ID:        u.ID,
		OpenID:    u.Openid,
		Nickname:  u.Nickname,
		AvatarURL: u.AvatarURL,
	}
}
