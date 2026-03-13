# Homepage Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement SnapCard homepage with review tracking, stats display, and recent decks

**Architecture:** WeChat miniprogram frontend (TypeScript + Skyline) with Go backend (Kratos framework), PostgreSQL database in Docker, no Redis for MVP

**Tech Stack:** TypeScript, Less, Skyline, Go 1.26+, Kratos, PostgreSQL 16, Ent ORM, Docker Compose

---

## Phase 1: Backend Infrastructure

### Task 1: Initialize Go Project Structure

**Files:**
- Create: `server/go.mod`
- Create: `server/cmd/server/main.go`
- Create: `server/configs/config.yaml`

**Step 1: Initialize Go module**

Run: `cd server && go mod init github.com/jty/snapcard`
Expected: Creates go.mod file

**Step 2: Create main.go skeleton**

```go
package main

import (
	"log"
)

func main() {
	log.Println("SnapCard server starting...")
}
```

**Step 3: Create config.yaml**

```yaml
server:
  http:
    addr: 0.0.0.0:8000
    timeout: 1s

data:
  database:
    driver: postgres
    source: postgres://snapcard:snapcard_dev_2026@localhost:5432/snapcard?sslmode=disable

auth:
  jwt_secret: "dev-secret-key-2026"
  jwt_expire_days: 7

wechat:
  app_id: "wx1f0edb2d79745277"
  app_secret: "your-wechat-secret"

ai:
  api_key: "sk-your-dashscope-key"
  base_url: "https://dashscope.aliyuncs.com/compatible-mode/v1"
  model: "qwen-vl-max"

fsrs:
  max_daily_reviews: 50

log:
  level: info
```

**Step 4: Verify Go can build**

Run: `cd server && go build -o bin/server cmd/server/main.go`
Expected: Creates bin/server executable

**Step 5: Commit**

```bash
git add server/
git commit -m "feat(server): initialize Go project structure"
```

---

### Task 2: Setup Docker Compose

**Files:**
- Create: `docker-compose.yml`

**Step 1: Create docker-compose.yml**

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: snapcard-postgres
    environment:
      POSTGRES_USER: snapcard
      POSTGRES_PASSWORD: snapcard_dev_2026
      POSTGRES_DB: snapcard
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U snapcard"]
      interval: 10s
      timeout: 5s
      retries: 5

  adminer:
    image: adminer:latest
    container_name: snapcard-adminer
    ports:
      - "8080:8080"
    depends_on:
      - postgres

volumes:
  postgres_data:
```

**Step 2: Start Docker containers**

Run: `docker-compose up -d`
Expected: PostgreSQL and Adminer containers running

**Step 3: Verify containers are healthy**

Run: `docker-compose ps`
Expected: Both services showing "healthy" or "running"

**Step 4: Test database connection**

Run: `docker exec -it snapcard-postgres psql -U snapcard -d snapcard -c "SELECT version();"`
Expected: PostgreSQL version output

**Step 5: Commit**

```bash
git add docker-compose.yml
git commit -m "feat: add Docker Compose for PostgreSQL and Adminer"
```

---

### Task 3: Install Backend Dependencies

**Files:**
- Modify: `server/go.mod`

**Step 1: Install Kratos framework**

Run: `cd server && go get github.com/go-kratos/kratos/v2@latest`
Expected: Downloads Kratos dependencies

**Step 2: Install Ent ORM**

Run: `cd server && go get entgo.io/ent@latest`
Expected: Downloads Ent dependencies

**Step 3: Install PostgreSQL driver**

Run: `cd server && go get github.com/lib/pq@latest`
Expected: Downloads PostgreSQL driver

**Step 4: Install golang-migrate**

Run: `cd server && go get github.com/golang-migrate/migrate/v4@latest`
Expected: Downloads migrate tool

**Step 5: Install JWT library**

Run: `cd server && go get github.com/golang-jwt/jwt/v5@latest`
Expected: Downloads JWT library

**Step 6: Verify dependencies**

Run: `cd server && go mod tidy`
Expected: Cleans up go.mod

**Step 7: Commit**

```bash
git add server/go.mod server/go.sum
git commit -m "feat(server): install core dependencies (Kratos, Ent, PostgreSQL)"
```

---

### Task 4: Create Database Schema with Ent

**Files:**
- Create: `server/ent/schema/user.go`
- Create: `server/ent/schema/deck.go`
- Create: `server/ent/schema/card.go`
- Create: `server/ent/schema/reviewlog.go`
- Create: `server/ent/generate.go`

**Step 1: Create user schema**

```go
package schema

import (
	"time"
	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/edge"
)

type User struct {
	ent.Schema
}

func (User) Fields() []ent.Field {
	return []ent.Field{
		field.String("openid").
			Unique().
			NotEmpty(),
		field.String("nickname").
			Optional().
			Nillable(),
		field.String("avatar_url").
			Optional().
			Nillable(),
		field.Time("created_at").
			Default(time.Now),
		field.Time("updated_at").
			Default(time.Now).
			UpdateDefault(time.Now),
	}
}

func (User) Edges() []ent.Edge {
	return []ent.Edge{
		edge.To("decks", Deck.Type),
	}
}
```

**Step 2: Create deck schema**

```go
package schema

import (
	"time"
	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/edge"
)

type Deck struct {
	ent.Schema
}

func (Deck) Fields() []ent.Field {
	return []ent.Field{
		field.String("name").
			NotEmpty(),
		field.Time("created_at").
			Default(time.Now),
		field.Time("updated_at").
			Default(time.Now).
			UpdateDefault(time.Now),
	}
}

func (Deck) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("user", User.Type).
			Ref("decks").
			Unique().
			Field("user_id"),
		edge.To("cards", Card.Type),
	}
}
```

**Step 3: Create card schema with FSRS fields**

```go
package schema

import (
	"time"
	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/edge"
)

type Card struct {
	ent.Schema
}

func (Card) Fields() []ent.Field {
	return []ent.Field{
		field.String("front").
			NotEmpty(),
		field.String("back").
			NotEmpty(),
		field.Strings("tags").
			Optional(),
		field.String("source_image_url").
			Optional().
			Nillable(),
		field.Float("stability").
			Default(0),
		field.Float("difficulty").
			Default(0),
		field.Time("due_date").
			Default(time.Now),
		field.Int("reps").
			Default(0),
		field.Int("lapses").
			Default(0),
		field.Enum("state").
			Values("new", "learning", "review", "relearning").
			Default("new"),
		field.Time("created_at").
			Default(time.Now),
		field.Time("updated_at").
			Default(time.Now).
			UpdateDefault(time.Now),
	}
}

func (Card) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("user", User.Type).
			Ref("cards").
			Unique().
			Field("user_id"),
		edge.From("deck", Deck.Type).
			Ref("cards").
			Unique().
			Field("deck_id"),
		edge.To("review_logs", ReviewLog.Type),
	}
}
```

**Step 4: Create review log schema**

```go
package schema

import (
	"time"
	"entgo.io/ent"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/edge"
)

type ReviewLog struct {
	ent.Schema
}

func (ReviewLog) Fields() []ent.Field {
	return []ent.Field{
		field.Int("rating").
			Min(1).
			Max(4),
		field.Enum("review_mode").
			Values("self_rate", "ai_judge"),
		field.String("user_answer").
			Optional().
			Nillable(),
		field.Bool("ai_correct").
			Optional().
			Nillable(),
		field.Time("reviewed_at").
			Default(time.Now),
	}
}

func (ReviewLog) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("user", User.Type).
			Ref("review_logs").
			Unique().
			Field("user_id"),
		edge.From("card", Card.Type).
			Ref("review_logs").
			Unique().
			Field("card_id"),
	}
}
```

**Step 5: Create generate.go**

```go
package ent

//go:generate go run -mod=mod entgo.io/ent/cmd/ent generate ./schema
```

**Step 6: Generate Ent code**

Run: `cd server && go generate ./ent`
Expected: Creates ent/generated code

**Step 7: Commit**

```bash
git add server/ent/
git commit -m "feat(server): create database schemas with Ent"
```

---

### Task 5: Create Database Migration

**Files:**
- Create: `server/migrations/2026031001_init.up.sql`
- Create: `server/migrations/2026031001_init.down.sql`

**Step 1: Create up migration**

```sql
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    openid VARCHAR(255) UNIQUE NOT NULL,
    nickname VARCHAR(255),
    avatar_url VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE decks (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE cards (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    deck_id BIGINT NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
    front TEXT NOT NULL,
    back TEXT NOT NULL,
    tags JSONB,
    source_image_url VARCHAR(500),
    stability FLOAT DEFAULT 0,
    difficulty FLOAT DEFAULT 0,
    due_date TIMESTAMP NOT NULL DEFAULT NOW(),
    reps INT DEFAULT 0,
    lapses INT DEFAULT 0,
    state VARCHAR(20) DEFAULT 'new',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE review_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    card_id BIGINT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 4),
    review_mode VARCHAR(20) NOT NULL,
    user_answer TEXT,
    ai_correct BOOLEAN,
    reviewed_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cards_user_id ON cards(user_id);
CREATE INDEX idx_cards_deck_id ON cards(deck_id);
CREATE INDEX idx_cards_due_date ON cards(due_date);
CREATE INDEX idx_review_logs_card_id ON review_logs(card_id);
CREATE INDEX idx_review_logs_user_id ON review_logs(user_id);
```

**Step 2: Create down migration**

```sql
DROP TABLE IF EXISTS review_logs;
DROP TABLE IF EXISTS cards;
DROP TABLE IF EXISTS decks;
DROP TABLE IF EXISTS users;
```

**Step 3: Run migration**

Run: `cd server && migrate -path migrations -database "postgres://snapcard:snapcard_dev_2026@localhost:5432/snapcard?sslmode=disable" up`
Expected: Tables created successfully

**Step 4: Verify tables**

Run: `docker exec -it snapcard-postgres psql -U snapcard -d snapcard -c "\dt"`
Expected: Shows users, decks, cards, review_logs tables

**Step 5: Commit**

```bash
git add server/migrations/
git commit -m "feat(server): add database migration scripts"
```

---

## Phase 2: Backend API Implementation

### Task 6: Setup Kratos HTTP Server

**Files:**
- Modify: `server/cmd/server/main.go`
- Create: `server/internal/server/http.go`
- Create: `server/internal/server/grpc.go`

**Step 1: Update main.go**

```go
package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/go-kratos/kratos/v2"
	"github.com/go-kratos/kratos/v2/config"
	"github.com/go-kratos/kratos/v2/config/file"
	"github.com/go-kratos/kratos/v2/transport/http"
)

func main() {
	c := config.New(
		config.WithSource(
			file.NewSource("configs/config.yaml"),
		),
	)
	if err := c.Load(); err != nil {
		log.Fatalf("failed to load config: %v", err)
	}

	httpSrv := http.NewServer(
		http.Address(":8000"),
	)

	app := kratos.New(
		kratos.Server(httpSrv),
	)

	// Start server
	if err := app.Run(); err != nil {
		log.Printf("server stopped: %v", err)
	}

	// Graceful shutdown
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGTERM, syscall.SIGINT)
	<-stop

	if err := app.Stop(context.Background()); err != nil {
		log.Printf("failed to stop app: %v", err)
	}
}
```

**Step 2: Verify server can start**

Run: `cd server && go run cmd/server/main.go`
Expected: Server starts on port 8000

**Step 3: Stop server**

Press: Ctrl+C
Expected: Server stops gracefully

**Step 4: Commit**

```bash
git add server/cmd/server/main.go
git commit -m "feat(server): setup Kratos HTTP server"
```

---

### Task 7: Implement Auth Service (Login)

**Files:**
- Create: `server/internal/service/auth.go`
- Create: `server/internal/biz/user.go`
- Create: `server/internal/data/user.go`
- Create: `server/pkg/wechat/client.go`

**Step 1: Create WeChat client**

```go
package wechat

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

type Client struct {
	appID     string
	appSecret string
}

func NewClient(appID, appSecret string) *Client {
	return &Client{
		appID:     appID,
		appSecret: appSecret,
	}
}

type Code2SessionResponse struct {
	OpenID     string `json:"openid"`
	SessionKey string `json:"session_key"`
	UnionID    string `json:"unionid"`
	ErrCode    int    `json:"errcode"`
	ErrMsg     string `json:"errmsg"`
}

func (c *Client) Code2Session(code string) (*Code2SessionResponse, error) {
	url := fmt.Sprintf(
		"https://api.weixin.qq.com/sns/jscode2session?appid=%s&secret=%s&js_code=%s&grant_type=authorization_code",
		c.appID, c.appSecret, code,
	)

	resp, err := http.Get(url)
	if err != nil {
		return nil, fmt.Errorf("failed to call wechat api: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	var result Code2SessionResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("failed to unmarshal response: %w", err)
	}

	if result.ErrCode != 0 {
		return nil, fmt.Errorf("wechat api error: %s", result.ErrMsg)
	}

	return &result, nil
}
```

**Step 2: Create user biz layer**

```go
package biz

import (
	"context"
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type User struct {
	ID        int64
	OpenID    string
	Nickname  *string
	AvatarURL *string
}

type UserRepo interface {
	Create(ctx context.Context, openid string) (*User, error)
	FindByOpenID(ctx context.Context, openid string) (*User, error)
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

func (uc *UserUsecase) Login(ctx context.Context, openid string) (string, error) {
	user, err := uc.repo.FindByOpenID(ctx, openid)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			user, err = uc.repo.Create(ctx, openid)
			if err != nil {
				return "", err
			}
		} else {
			return "", err
		}
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": user.ID,
		"openid":  user.OpenID,
		"exp":     time.Now().Add(7 * 24 * time.Hour).Unix(),
	})

	tokenString, err := token.SignedString([]byte(uc.jwtSecret))
	if err != nil {
		return "", err
	}

	return tokenString, nil
}
```

**Step 3: Commit**

```bash
git add server/pkg/wechat/client.go server/internal/biz/user.go
git commit -m "feat(server): implement WeChat client and user business logic"
```

---

### Task 8: Implement Stats API

**Files:**
- Create: `server/internal/service/stats.go`
- Create: `server/internal/biz/stats.go`
- Create: `server/internal/data/stats.go`

**Step 1: Create stats biz layer**

```go
package biz

import "context"

type Stats struct {
	TotalCards     int
	TodayReviewed  int
	StreakDays     int
	MasteredCards  int
}

type StatsRepo interface {
	GetTotalCards(ctx context.Context, userID int64) (int, error)
	GetTodayReviewed(ctx context.Context, userID int64) (int, error)
	GetStreakDays(ctx context.Context, userID int64) (int, error)
	GetMasteredCards(ctx context.Context, userID int64) (int, error)
}

type StatsUsecase struct {
	repo StatsRepo
}

func NewStatsUsecase(repo StatsRepo) *StatsUsecase {
	return &StatsUsecase{repo: repo}
}

func (uc *StatsUsecase) GetStats(ctx context.Context, userID int64) (*Stats, error) {
	total, err := uc.repo.GetTotalCards(ctx, userID)
	if err != nil {
		return nil, err
	}

	today, err := uc.repo.GetTodayReviewed(ctx, userID)
	if err != nil {
		return nil, err
	}

	streak, err := uc.repo.GetStreakDays(ctx, userID)
	if err != nil {
		return nil, err
	}

	mastered, err := uc.repo.GetMasteredCards(ctx, userID)
	if err != nil {
		return nil, err
	}

	return &Stats{
		TotalCards:    total,
		TodayReviewed: today,
		StreakDays:    streak,
		MasteredCards: mastered,
	}, nil
}
```

**Step 2: Commit**

```bash
git add server/internal/biz/stats.go
git commit -m "feat(server): implement stats business logic"
```

---

### Task 9: Implement Review API

**Files:**
- Create: `server/internal/service/review.go`
- Create: `server/internal/biz/review.go`
- Create: `server/internal/data/review.go`

**Step 1: Create review biz layer**

```go
package biz

import (
	"context"
	"time"
)

type ReviewCard struct {
	ID       int64
	Front    string
	DeckName string
}

type ReviewRepo interface {
	GetTodayCards(ctx context.Context, userID int64, limit int) ([]*ReviewCard, int, error)
}

type ReviewUsecase struct {
	repo           ReviewRepo
	maxDailyReview int
}

func NewReviewUsecase(repo ReviewRepo, maxDaily int) *ReviewUsecase {
	return &ReviewUsecase{
		repo:           repo,
		maxDailyReview: maxDaily,
	}
}

func (uc *ReviewUsecase) GetTodayReviews(ctx context.Context, userID int64) ([]*ReviewCard, int, error) {
	cards, count, err := uc.repo.GetTodayCards(ctx, userID, uc.maxDailyReview)
	if err != nil {
		return nil, 0, err
	}
	return cards, count, nil
}
```

**Step 2: Commit**

```bash
git add server/internal/biz/review.go
git commit -m "feat(server): implement review business logic"
```

---

### Task 10: Implement Deck API

**Files:**
- Create: `server/internal/service/deck.go`
- Create: `server/internal/biz/deck.go`
- Create: `server/internal/data/deck.go`

**Step 1: Create deck biz layer**

```go
package biz

import (
	"context"
	"time"
)

type Deck struct {
	ID             int64
	Name           string
	TotalCards     int
	DueToday       int
	LastReviewedAt *time.Time
}

type DeckRepo interface {
	GetRecentDecks(ctx context.Context, userID int64, limit int) ([]*Deck, error)
}

type DeckUsecase struct {
	repo DeckRepo
}

func NewDeckUsecase(repo DeckRepo) *DeckUsecase {
	return &DeckUsecase{repo: repo}
}

func (uc *DeckUsecase) GetRecentDecks(ctx context.Context, userID int64, limit int) ([]*Deck, error) {
	return uc.repo.GetRecentDecks(ctx, userID, limit)
}
```

**Step 2: Commit**

```bash
git add server/internal/biz/deck.go
git commit -m "feat(server): implement deck business logic"
```

---

## Phase 3: Frontend Implementation

### Task 11: Update App Configuration

**Files:**
- Modify: `client/miniprogram/app.json`
- Modify: `client/miniprogram/app.ts`

**Step 1: Update app.json with tabBar**

```json
{
  "pages": [
    "pages/index/index",
    "pages/decks/index",
    "pages/profile/index",
    "pages/review/index",
    "pages/create/index"
  ],
  "window": {
    "navigationBarTextStyle": "black",
    "navigationStyle": "custom"
  },
  "tabBar": {
    "color": "#999999",
    "selectedColor": "#1890ff",
    "backgroundColor": "#ffffff",
    "list": [
      {
        "pagePath": "pages/index/index",
        "text": "首页",
        "iconPath": "assets/icons/home.png",
        "selectedIconPath": "assets/icons/home-active.png"
      },
      {
        "pagePath": "pages/decks/index",
        "text": "卡组库",
        "iconPath": "assets/icons/deck.png",
        "selectedIconPath": "assets/icons/deck-active.png"
      },
      {
        "pagePath": "pages/profile/index",
        "text": "我的",
        "iconPath": "assets/icons/profile.png",
        "selectedIconPath": "assets/icons/profile-active.png"
      }
    ]
  },
  "style": "v2",
  "rendererOptions": {
    "skyline": {
      "defaultDisplayBlock": true,
      "disableABTest": true,
      "sdkVersionBegin": "3.0.0",
      "sdkVersionEnd": "15.255.255"
    }
  },
  "componentFramework": "glass-easel",
  "sitemapLocation": "sitemap.json",
  "lazyCodeLoading": "requiredComponents"
}
```

**Step 2: Update app.ts with global data**

```typescript
const app = App<IAppOption>({
  globalData: {
    userInfo: undefined,
    isLoggedIn: false,
    token: '',
    apiBaseURL: 'http://localhost:8000/api/v1'
  },

  onLaunch() {
    this.checkLogin()
  },

  checkLogin() {
    const token = wx.getStorageSync('token')
    if (token) {
      this.globalData.token = token
      this.globalData.isLoggedIn = true
    }
  }
})
```

**Step 3: Commit**

```bash
git add client/miniprogram/app.json client/miniprogram/app.ts
git commit -m "feat(client): add tabBar and global data structure"
```

---

### Task 12: Create Network Request Utility

**Files:**
- Create: `client/miniprogram/utils/request.ts`
- Create: `client/miniprogram/typings/types/api.d.ts`

**Step 1: Create API types**

```typescript
export interface ApiResponse<T = any> {
  code: number
  message?: string
  data: T
}

export interface TodayReviewsResponse {
  count: number
  cards: Array<{
    id: number
    front: string
    deck_name: string
  }>
}

export interface StatsResponse {
  total_cards: number
  today_reviewed: number
  streak_days: number
  mastered_cards?: number
}

export interface Deck {
  id: number
  name: string
  total_cards: number
  due_today: number
  last_reviewed_at?: string
}

export interface DecksResponse {
  decks: Deck[]
}
```

**Step 2: Create request utility**

```typescript
const app = getApp<IAppOption>()

interface RequestOptions {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: any
  needAuth?: boolean
}

export function request<T>(options: RequestOptions): Promise<T> {
  return new Promise((resolve, reject) => {
    const header: any = {
      'Content-Type': 'application/json'
    }

    if (options.needAuth !== false && app.globalData.token) {
      header['Authorization'] = `Bearer ${app.globalData.token}`
    }

    wx.request({
      url: `${app.globalData.apiBaseURL}${options.url}`,
      method: options.method || 'GET',
      data: options.data,
      header,
      success: (res) => {
        if (res.statusCode === 401) {
          wx.removeStorageSync('token')
          app.globalData.isLoggedIn = false
          app.globalData.token = ''
          reject(new Error('未授权，请重新登录'))
          return
        }

        const data = res.data as any
        if (data.code === 0) {
          resolve(data.data)
        } else {
          reject(new Error(data.message || '请求失败'))
        }
      },
      fail: (err) => {
        reject(new Error(err.errMsg || '网络请求失败'))
      }
    })
  })
}

export function getTodayReviews(): Promise<TodayReviewsResponse> {
  return request<TodayReviewsResponse>({
    url: '/review/today'
  })
}

export function getStats(): Promise<StatsResponse> {
  return request<StatsResponse>({
    url: '/stats'
  })
}

export function getRecentDecks(limit: number = 5): Promise<DecksResponse> {
  return request<DecksResponse>({
    url: `/decks?limit=${limit}&sort=recent`
  })
}
```

**Step 3: Commit**

```bash
git add client/miniprogram/utils/request.ts client/miniprogram/typings/types/api.d.ts
git commit -m "feat(client): create network request utility"
```

---

### Task 13: Create Review Card Component

**Files:**
- Create: `client/miniprogram/components/review-card/index.ts`
- Create: `client/miniprogram/components/review-card/index.wxml`
- Create: `client/miniprogram/components/review-card/index.less`
- Create: `client/miniprogram/components/review-card/index.json`

**Step 1: Create component logic**

```typescript
Component({
  properties: {
    count: {
      type: Number,
      value: 0
    },
    loading: {
      type: Boolean,
      value: false
    }
  },

  methods: {
    onStartReview() {
      if (this.data.count === 0) {
        wx.showToast({
          title: '今天没有待复习卡片',
          icon: 'none'
        })
        return
      }
      wx.navigateTo({
        url: '/pages/review/index'
      })
    }
  }
})
```

**Step 2: Create component template**

```xml
<view class="review-card">
  <view class="review-card__content">
    <text class="review-card__title">今日待复习</text>
    <text class="review-card__count">{{loading ? '...' : count}} 张</text>
  </view>
  <button 
    class="review-card__button"
    bindtap="onStartReview"
    disabled="{{count === 0}}">
    开始复习
  </button>
</view>
```

**Step 3: Create component styles**

```less
.review-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16rpx;
  padding: 40rpx;
  margin: 24rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;

  &__content {
    display: flex;
    flex-direction: column;
  }

  &__title {
    font-size: 28rpx;
    color: rgba(255, 255, 255, 0.8);
    margin-bottom: 12rpx;
  }

  &__count {
    font-size: 48rpx;
    font-weight: bold;
    color: #ffffff;
  }

  &__button {
    background: #ffffff;
    color: #667eea;
    border-radius: 24rpx;
    padding: 16rpx 32rpx;
    font-size: 28rpx;
    font-weight: bold;
    border: none;

    &[disabled] {
      opacity: 0.5;
    }
  }
}
```

**Step 4: Create component config**

```json
{
  "component": true
}
```

**Step 5: Commit**

```bash
git add client/miniprogram/components/review-card/
git commit -m "feat(client): create review card component"
```

---

### Task 14: Create Stats Card Component

**Files:**
- Create: `client/miniprogram/components/stats-card/index.ts`
- Create: `client/miniprogram/components/stats-card/index.wxml`
- Create: `client/miniprogram/components/stats-card/index.less`
- Create: `client/miniprogram/components/stats-card/index.json`

**Step 1: Create component logic**

```typescript
Component({
  properties: {
    totalCards: {
      type: Number,
      value: 0
    },
    todayReviewed: {
      type: Number,
      value: 0
    },
    streakDays: {
      type: Number,
      value: 0
    },
    loading: {
      type: Boolean,
      value: false
    }
  }
})
```

**Step 2: Create component template**

```xml
<view class="stats-card">
  <view class="stats-card__item">
    <text class="stats-card__value">{{loading ? '...' : totalCards}}</text>
    <text class="stats-card__label">总卡片</text>
  </view>
  <view class="stats-card__divider"></view>
  <view class="stats-card__item">
    <text class="stats-card__value">{{loading ? '...' : todayReviewed}}</text>
    <text class="stats-card__label">今日已复习</text>
  </view>
  <view class="stats-card__divider"></view>
  <view class="stats-card__item">
    <text class="stats-card__value">{{loading ? '...' : streakDays}}</text>
    <text class="stats-card__label">连续学习</text>
  </view>
</view>
```

**Step 3: Create component styles**

```less
.stats-card {
  background: #ffffff;
  border-radius: 16rpx;
  padding: 32rpx;
  margin: 24rpx;
  display: flex;
  justify-content: space-around;
  align-items: center;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.08);

  &__item {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  &__value {
    font-size: 40rpx;
    font-weight: bold;
    color: #1890ff;
    margin-bottom: 8rpx;
  }

  &__label {
    font-size: 24rpx;
    color: #666666;
  }

  &__divider {
    width: 2rpx;
    height: 60rpx;
    background: #f0f0f0;
  }
}
```

**Step 4: Create component config**

```json
{
  "component": true
}
```

**Step 5: Commit**

```bash
git add client/miniprogram/components/stats-card/
git commit -m "feat(client): create stats card component"
```

---

### Task 15: Create Deck List Item Component

**Files:**
- Create: `client/miniprogram/components/deck-list-item/index.ts`
- Create: `client/miniprogram/components/deck-list-item/index.wxml`
- Create: `client/miniprogram/components/deck-list-item/index.less`
- Create: `client/miniprogram/components/deck-list-item/index.json`

**Step 1: Create component logic**

```typescript
Component({
  properties: {
    deck: {
      type: Object,
      value: {}
    }
  },

  methods: {
    onTap() {
      const deck = this.data.deck as any
      wx.navigateTo({
        url: `/pages/decks/detail?id=${deck.id}`
      })
    }
  }
})
```

**Step 2: Create component template**

```xml
<view class="deck-item" bindtap="onTap">
  <view class="deck-item__info">
    <text class="deck-item__name">{{deck.name}}</text>
    <text class="deck-item__meta">{{deck.total_cards}} 张卡片</text>
  </view>
  <view class="deck-item__badge" wx:if="{{deck.due_today > 0}}">
    <text class="deck-item__badge-text">{{deck.due_today}}</text>
  </view>
</view>
```

**Step 3: Create component styles**

```less
.deck-item {
  background: #ffffff;
  padding: 32rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 2rpx solid #f0f0f0;

  &__info {
    display: flex;
    flex-direction: column;
  }

  &__name {
    font-size: 32rpx;
    font-weight: bold;
    color: #333333;
    margin-bottom: 8rpx;
  }

  &__meta {
    font-size: 24rpx;
    color: #999999;
  }

  &__badge {
    background: #1890ff;
    border-radius: 50%;
    width: 48rpx;
    height: 48rpx;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__badge-text {
    color: #ffffff;
    font-size: 24rpx;
    font-weight: bold;
  }
}
```

**Step 4: Create component config**

```json
{
  "component": true
}
```

**Step 5: Commit**

```bash
git add client/miniprogram/components/deck-list-item/
git commit -m "feat(client): create deck list item component"
```

---

### Task 16: Implement Homepage

**Files:**
- Modify: `client/miniprogram/pages/index/index.ts`
- Modify: `client/miniprogram/pages/index/index.wxml`
- Modify: `client/miniprogram/pages/index/index.less`
- Modify: `client/miniprogram/pages/index/index.json`

**Step 1: Update page config**

```json
{
  "usingComponents": {
    "review-card": "/components/review-card/index",
    "stats-card": "/components/stats-card/index",
    "deck-list-item": "/components/deck-list-item/index"
  },
  "navigationStyle": "custom"
}
```

**Step 2: Update page logic**

```typescript
import { getTodayReviews, getStats, getRecentDecks } from '../../utils/request'

Component({
  data: {
    todayReviews: {
      count: 0,
      loading: true
    },
    stats: {
      totalCards: 0,
      todayReviewed: 0,
      streakDays: 0,
      loading: true
    },
    recentDecks: [],
    loading: true
  },

  lifetimes: {
    attached() {
      this.loadData()
    }
  },

  pageLifetimes: {
    show() {
      this.loadData()
    }
  },

  methods: {
    async loadData() {
      this.setData({ loading: true })

      try {
        const [reviewsData, statsData, decksData] = await Promise.all([
          getTodayReviews(),
          getStats(),
          getRecentDecks(5)
        ])

        this.setData({
          todayReviews: {
            count: reviewsData.count,
            loading: false
          },
          stats: {
            totalCards: statsData.total_cards,
            todayReviewed: statsData.today_reviewed,
            streakDays: statsData.streak_days,
            loading: false
          },
          recentDecks: decksData.decks,
          loading: false
        })
      } catch (error) {
        console.error('Failed to load data:', error)
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        })
        this.setData({ loading: false })
      }
    },

    onChooseAvatar(e: any) {
      const { avatarUrl } = e.detail
      const { nickName } = this.data.userInfo
      this.setData({
        "userInfo.avatarUrl": avatarUrl,
        hasUserInfo: nickName && avatarUrl && avatarUrl !== defaultAvatarUrl,
      })
    },

    onInputChange(e: any) {
      const nickName = e.detail.value
      const { avatarUrl } = this.data.userInfo
      this.setData({
        "userInfo.nickName": nickName,
        hasUserInfo: nickName && avatarUrl && avatarUrl !== defaultAvatarUrl,
      })
    },

    goToDecks() {
      wx.switchTab({
        url: '/pages/decks/index'
      })
    }
  }
})
```

**Step 3: Update page template**

```xml
<view class="container">
  <review-card count="{{todayReviews.count}}" loading="{{todayReviews.loading}}" />
  
  <view class="quick-create">
    <button class="quick-create__button" bindtap="chooseImage">
      <image src="/assets/icons/camera.png" class="quick-create__icon"></image>
      <text>拍照创建</text>
    </button>
  </view>

  <stats-card 
    total-cards="{{stats.totalCards}}"
    today-reviewed="{{stats.todayReviewed}}"
    streak-days="{{stats.streakDays}}"
    loading="{{stats.loading}}" />

  <view class="recent-decks">
    <view class="recent-decks__header">
      <text class="recent-decks__title">最近学习</text>
    </view>
    <block wx:for="{{recentDecks}}" wx:key="id">
      <deck-list-item deck="{{item}}" />
    </block>
    <view class="recent-decks__footer" bindtap="goToDecks">
      <text class="recent-decks__more">查看全部卡组</text>
    </view>
  </view>
</view>
```

**Step 4: Update page styles**

```less
.container {
  min-height: 100vh;
  background: #f5f5f5;
}

.quick-create {
  margin: 24rpx;
  
  &__button {
    background: #ffffff;
    border-radius: 16rpx;
    padding: 24rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2rpx dashed #1890ff;
    color: #1890ff;
  }

  &__icon {
    width: 40rpx;
    height: 40rpx;
    margin-right: 16rpx;
  }
}

.recent-decks {
  background: #ffffff;
  margin: 24rpx;
  border-radius: 16rpx;
  overflow: hidden;

  &__header {
    padding: 24rpx 32rpx;
    border-bottom: 2rpx solid #f0f0f0;
  }

  &__title {
    font-size: 32rpx;
    font-weight: bold;
    color: #333333;
  }

  &__footer {
    padding: 24rpx 32rpx;
    text-align: center;
    border-top: 2rpx solid #f0f0f0;
  }

  &__more {
    font-size: 28rpx;
    color: #1890ff;
  }
}
```

**Step 5: Commit**

```bash
git add client/miniprogram/pages/index/
git commit -m "feat(client): implement homepage with review, stats, and decks"
```

---

## Phase 4: Integration & Testing

### Task 17: Test Backend APIs

**Step 1: Test database connection**

Run: `docker exec -it snapcard-postgres psql -U snapcard -d snapcard -c "SELECT 1;"`
Expected: Returns ?column? | 1

**Step 2: Start backend server**

Run: `cd server && go run cmd/server/main.go`
Expected: Server starts on port 8000

**Step 3: Test health endpoint**

Run: `curl http://localhost:8000/health`
Expected: Returns 200 OK

**Step 4: Commit test results**

```bash
git add -A
git commit -m "test: verify backend APIs are working"
```

---

### Task 18: Create Placeholder Pages

**Files:**
- Create: `client/miniprogram/pages/decks/index.ts` (placeholder)
- Create: `client/miniprogram/pages/profile/index.ts` (placeholder)
- Create: `client/miniprogram/pages/review/index.ts` (placeholder)
- Create: `client/miniprogram/pages/create/index.ts` (placeholder)

**Step 1: Create decks page placeholder**

```typescript
Component({
  data: {},
  methods: {}
})
```

**Step 2: Create profile page placeholder**

```typescript
Component({
  data: {},
  methods: {}
})
```

**Step 3: Create review page placeholder**

```typescript
Component({
  data: {},
  methods: {}
})
```

**Step 4: Create create page placeholder**

```typescript
Component({
  data: {},
  methods: {}
})
```

**Step 5: Commit**

```bash
git add client/miniprogram/pages/
git commit -m "feat(client): add placeholder pages for tabBar"
```

---

### Task 19: Create Makefile

**Files:**
- Create: `server/Makefile`

**Step 1: Create Makefile**

```makefile
.PHONY: build run clean migrate-up migrate-down generate

build:
	go build -o bin/server cmd/server/main.go

run:
	go run cmd/server/main.go -conf configs/config.yaml

clean:
	rm -rf bin/

generate:
	go generate ./ent

migrate-up:
	migrate -path migrations -database "postgres://snapcard:snapcard_dev_2026@localhost:5432/snapcard?sslmode=disable" up

migrate-down:
	migrate -path migrations -database "postgres://snapcard:snapcard_dev_2026@localhost:5432/snapcard?sslmode=disable" down

docker-up:
	docker-compose up -d

docker-down:
	docker-compose down

docker-logs:
	docker-compose logs -f
```

**Step 2: Commit**

```bash
git add server/Makefile
git commit -m "feat(server): add Makefile for common tasks"
```

---

### Task 20: Final Integration Test

**Step 1: Start Docker containers**

Run: `make docker-up`
Expected: PostgreSQL and Adminer running

**Step 2: Run migrations**

Run: `cd server && make migrate-up`
Expected: Tables created

**Step 3: Generate Ent code**

Run: `cd server && make generate`
Expected: Ent code generated

**Step 4: Start backend**

Run: `cd server && make run`
Expected: Backend running on port 8000

**Step 5: Open WeChat DevTools**

Open: `client/miniprogram` in WeChat DevTools
Expected: Homepage loads with components

**Step 6: Final commit**

```bash
git add -A
git commit -m "test: final integration test completed"
```

---

## Success Criteria

**Backend:**
- [ ] PostgreSQL running in Docker
- [ ] Database migrations executed successfully
- [ ] Ent code generated
- [ ] HTTP server starts on port 8000
- [ ] APIs respond to requests

**Frontend:**
- [ ] WeChat DevTools opens project
- [ ] TabBar navigation works
- [ ] Homepage components render
- [ ] Network requests configured

**Integration:**
- [ ] Frontend can call backend APIs
- [ ] Data flows correctly
- [ ] No console errors

---

_Implementation plan created on 2026-03-10 for SnapCard homepage MVP._