# SnapCard 后端技术方案

> 版本：v1.0 | 日期：2026-03-10 | 基于 MVP PRD 实现

---

## 一、技术选型

| 层级       | 技术                       | 选型理由                                         |
| ---------- | -------------------------- | ------------------------------------------------ |
| 语言       | Go 1.26+                   | 高性能，并发友好，部署简单                       |
| 微服务框架 | Kratos                     | 完整的微服务框架，含配置、日志、错误处理、中间件 |
| 通信协议   | gRPC + HTTP                | 内部服务 gRPC，对外提供 HTTP Gateway             |
| 数据库     | PostgreSQL 16+             | 功能丰富，JSON支持好，适合FSRS算法存储           |
| 数据库迁移 | golang-migrate             | 业界标准，CLI工具完善                            |
| ORM        | Ent                        | 类型安全，代码生成，GraphQL友好，编译期检查      |
| AI 客户端  | Eino (字节)                | 国内维护，框架友好，支持多模型路由               |
| 认证       | JWT (golang-jwt)           | 标准实现，与 Kratos 中间件集成良好               |
| 定时任务   | go-cron                    | 轻量级，满足 MVP 阶段定时推送需求                |
| 配置管理   | Kratos config (YAML)       | 框架内置，支持环境变量覆盖                       |
| 代码规范   | gofmt + golint + goimports | 官方工具链                                       |

---

## 二、项目结构

```
backend/
├── api/                      # Protobuf API 定义
│   └── v1/                   # 版本聚合
│       ├── card.proto
│       ├── deck.proto
│       ├── review.proto
│       └── user.proto
│
├── cmd/
│   └── server/
│       └── main.go           # 应用入口
│
├── configs/
│   ├── config.yaml           # 默认配置
│   └── config.prod.yaml      # 生产配置
│
├── ent/                      # Ent 生成的代码
│   ├── schema/               # 实体定义
│   │   ├── user.go
│   │   ├── deck.go
│   │   ├── card.go
│   │   └── reviewlog.go
│   └── generate.go
│
├── internal/
│   ├── biz/                  # 业务逻辑层
│   │   ├── card.go
│   │   ├── deck.go
│   │   ├── review.go
│   │   ├── user.go
│   │   └── fsrs.go           # FSRS 调度逻辑
│   │
│   ├── data/                 # 数据访问层
│   │   ├── data.go           # 数据库连接
│   │   ├── card.go
│   │   ├── deck.go
│   │   ├── review.go
│   │   └── user.go
│   │
│   ├── service/              # 服务实现层
│   │   ├── card.go
│   │   ├── deck.go
│   │   ├── review.go
│   │   ├── user.go
│   │   └── service.go        # 服务注册
│   │
│   └── server/               # 服务器初始化
│       ├── grpc.go
│       └── http.go
│
├── pkg/
│   ├── ai/                   # Eino AI 封装
│   │   └── client.go
│   ├── middleware/           # 自定义中间件
│   │   └── auth/
│   └── wechat/               # 微信服务封装
│       └── client.go
│
├── migrations/               # 数据库迁移脚本
├── scripts/                  # 工具脚本
├── tests/                    # 测试
├── Makefile
├── go.mod
└── Dockerfile
```

---

## 三、数据模型

### 3.1 实体关系

```
User
  └── Deck（卡组）[1:N]
        └── Card（闪卡）[1:N]
              └── ReviewLog（复习记录）[1:N]
```

### 3.2 Ent Schema 定义

**User**

- ID (int64)
- OpenID (string, unique, indexed)
- Nickname (string, optional)
- AvatarURL (string, optional)
- CreatedAt / UpdatedAt (time)
- Edges: Decks, Cards

**Deck**

- ID (int64)
- UserID (int64, indexed)
- Name (string)
- CreatedAt / UpdatedAt (time)
- Edges: User, Cards

**Card**（含 FSRS 状态字段）

- ID (int64)
- UserID (int64, indexed)
- DeckID (int64, indexed)
- Front (string) - 问题
- Back (string) - 答案
- Tags (JSON array) - AI 自动标签
- SourceImageURL (string, optional) - 原始图片
- Stability (float64) - 记忆稳定性
- Difficulty (float64) - 难度系数
- DueDate (timestamp, indexed) - 下次复习时间
- Reps (int) - 复习次数
- Lapses (int) - 遗忘次数
- State (enum: New/Learning/Review/Relearning)
- CreatedAt / UpdatedAt (time)
- Edges: User, Deck, ReviewLogs

**ReviewLog**

- ID (int64)
- CardID (int64, indexed)
- UserID (int64, indexed)
- Rating (int, 1-4) - Again/Hard/Good/Easy
- ReviewMode (enum: self_rate/ai_judge)
- UserAnswer (string, optional) - AI判题输入
- AICorrect (bool, optional) - AI判题结果
- ReviewedAt (timestamp)
- Edges: Card, User

---

## 四、API 接口

### 4.1 认证模块

| Method | Path                 | 说明               |
| ------ | -------------------- | ------------------ |
| POST   | `/api/v1/auth/login` | 微信 code 换取 JWT |

### 4.2 闪卡模块

| Method | Path                     | 说明                              |
| ------ | ------------------------ | --------------------------------- |
| POST   | `/api/v1/cards/generate` | 上传图片 → AI 生成闪卡预览        |
| POST   | `/api/v1/cards/confirm`  | 确认保存闪卡到卡组                |
| GET    | `/api/v1/cards`          | 获取卡片列表（支持 deck_id 过滤） |
| PUT    | `/api/v1/cards/:id`      | 编辑单张卡片                      |
| DELETE | `/api/v1/cards/:id`      | 删除卡片                          |

### 4.3 卡组模块

| Method | Path                      | 说明             |
| ------ | ------------------------- | ---------------- |
| GET    | `/api/v1/decks`           | 获取用户卡组列表 |
| POST   | `/api/v1/decks`           | 创建卡组         |
| GET    | `/api/v1/decks/:id/cards` | 获取卡组内卡片   |
| PUT    | `/api/v1/decks/:id`       | 更新卡组名称     |
| DELETE | `/api/v1/decks/:id`       | 删除卡组         |

### 4.4 复习模块

| Method | Path                    | 说明                           |
| ------ | ----------------------- | ------------------------------ |
| GET    | `/api/v1/review/today`  | 获取今日到期卡片（上限 50 张） |
| POST   | `/api/v1/review/submit` | 提交自评结果                   |
| POST   | `/api/v1/review/judge`  | AI 判题模式                    |

---

## 五、核心模块设计

### 5.1 FSRS 调度器

采用简化的 FSRS-4.5 算法实现，不依赖外部库。

**核心能力：**

- 新卡片初始化（根据首次评分设置初始稳定性和难度）
- 四种状态的调度逻辑：New → Learning → Review → Relearning
- 稳定性计算公式（考虑难度、评分、间隔）
- 难度动态调整（根据复习表现）
- 遗忘处理（Again 状态转入 Relearning）

**评分映射：**

- 1 = Again (完全遗忘)
- 2 = Hard (模糊/困难)
- 3 = Good (正常记住)
- 4 = Easy (轻松记住)

### 5.2 AI 服务（Eino）

使用字节跳动 Eino 框架封装多模态 AI 能力。

**功能：**

- 图片分析生成闪卡（调用多模态模型）
- 答案智能判题（对比用户答案与标准答案）

**AI 调用流程：**

1. 接收图片/文本输入
2. 组装 System Prompt（要求 JSON 格式输出）
3. 调用模型 API（通义千问）
4. 解析 JSON 响应
5. 返回结构化数据

### 5.3 微信服务

封装微信小程序服务端接口。

**功能：**

- Code2Session：微信登录 code 换取 openid/session_key
- 订阅消息推送（预留接口，MVP 后实现）

### 5.4 定时任务

使用 go-cron 实现每日复习提醒推送。

**任务：**

- 每日 08:00 执行
- 查询所有有待复习卡片的用户
- 调用微信订阅消息 API 推送提醒

---

## 六、分层架构

```
┌─────────────────────────────────────┐
│  Transport (HTTP/gRPC)              │
│  - 路由、参数绑定、基础校验           │
└─────────────┬───────────────────────┘
              ▼
┌─────────────────────────────────────┐
│  Service                            │
│  - 参数转换、业务编排、错误处理       │
│  - 调用 Biz 层                      │
└─────────────┬───────────────────────┘
              ▼
┌─────────────────────────────────────┐
│  Biz (Use Case)                     │
│  - 核心业务逻辑                     │
│  - FSRS 调度、AI 判题决策           │
│  - 不依赖框架，可单元测试            │
└─────────────┬───────────────────────┘
              ▼
┌─────────────────────────────────────┐
│  Data (Repository)                  │
│  - 数据库操作（Ent）                │
│  - 外部服务调用（微信、AI）         │
└─────────────────────────────────────┘
```

---

## 七、开发规范

### 7.1 目录职责

| 目录                | 职责          | 规则                   |
| ------------------- | ------------- | ---------------------- |
| `api/`              | Protobuf 定义 | 不依赖其他目录         |
| `internal/biz/`     | 业务逻辑      | 不依赖框架，可独立测试 |
| `internal/data/`    | 数据访问      | 实现 biz 定义的接口    |
| `internal/service/` | 服务实现      | 调用 biz，处理转换     |
| `pkg/`              | 公共库        | 可被其他项目复用       |

### 7.2 依赖方向

```
api ← service → biz → data
        ↑              ↓
   middleware ←─── pkg/ai, wechat
```

### 7.3 代码生成

```bash
# 生成 Ent 代码
go generate ./ent

# 生成 Protobuf
cd api && buf generate

# 生成依赖注入
cd cmd/server && wire

# 数据库迁移
migrate -path migrations -database "postgres://..." up
```

---

## 八、配置管理

**配置文件结构：**

```yaml
server:
  http:
    addr: 0.0.0.0:8000
    timeout: 1s
  grpc:
    addr: 0.0.0.0:9000
    timeout: 1s

data:
  database:
    driver: postgres
    source: postgres://user:pass@localhost:5432/snapcard?sslmode=disable

auth:
  jwt_secret: "your-secret-key"
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

---

## 九、部署方案

### 9.1 开发环境

```bash
# 1. 启动 PostgreSQL
docker run -d \
    --name snapcard-postgres \
    -e POSTGRES_USER=user \
    -e POSTGRES_PASSWORD=password \
    -e POSTGRES_DB=snapcard \
    -p 5432:5432 \
    postgres:16-alpine

# 2. 执行迁移
make migrate-up

# 3. 生成代码
make generate

# 4. 启动服务
go run cmd/server/main.go -conf configs/config.yaml
```

### 9.2 生产部署

**Docker 构建：**

```dockerfile
FROM golang:1.26-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o server cmd/server/main.go

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /app/server .
COPY --from=builder /app/configs ./configs
EXPOSE 8000 9000
CMD ["./server", "-conf", "configs/config.yaml"]
```

**docker-compose：**

```yaml
version: "3.8"

services:
  app:
    build: .
    ports:
      - "8000:8000"
    environment:
      - CONFIG_PATH=/app/configs/config.prod.yaml
    depends_on:
      - postgres

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: snapcard
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

---

## 十、技术依赖

```go
// go.mod 核心依赖

require (
    // Kratos 框架
    github.com/go-kratos/kratos/v2 v2.8.0

    // Ent ORM
    entgo.io/ent v0.14.0
    github.com/lib/pq v1.10.9  // PostgreSQL driver

    // 数据库迁移
    github.com/golang-migrate/migrate/v4 v4.17.0

    // Eino AI
    github.com/cloudwego/eino v0.3.0

    // JWT
    github.com/golang-jwt/jwt/v5 v5.2.0

    // 定时任务
    github.com/robfig/cron/v3 v3.0.1

    // 工具
    github.com/google/uuid v1.6.0
    github.com/go-playground/validator/v10 v1.19.0

    // 测试
    github.com/stretchr/testify v1.9.0
)
```

---

## 十一、演进路线

| 阶段       | 新增组件   | 说明                             |
| ---------- | ---------- | -------------------------------- |
| MVP (当前) | -          | 无 Redis，单实例部署             |
| v1.1       | Redis      | Session 缓存、限流、热点数据缓存 |
| v1.2       | asynq      | 异步任务队列，解耦 AI 生成       |
| v2.0       | Kubernetes | 容器编排，水平扩展               |

---

_文档由技术方案设计会话生成，基于 2026-03-10 确认的 MVP 技术选型（Go 1.26 + Kratos + PostgreSQL + Ent + Eino）。_
