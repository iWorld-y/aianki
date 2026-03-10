# SnapCard 首页功能设计文档

> 版本: v1.0 | 日期: 2026-03-10 | 阶段: MVP

---

## 一、设计概述

本文档定义 SnapCard 首页功能的完整设计方案，包括前端页面设计、后端 API 设计、数据流架构及 Docker 容器配置。

### 核心功能

- 今日待复习卡片数量展示
- 快速创建闪卡入口
- 学习统计概览
- 最近学习的卡组列表

### 架构决策

- 使用底部 Tab 栏架构: 首页、卡组库、我的
- 首页专注"今日复习"场景
- 复习模式: 混合模式(翻转卡片自评 + 列表预览)
- 初版不引入 Redis，仅使用 PostgreSQL

---

## 二、前端页面设计

### 2.1 首页布局结构

```
┌─────────────────────────────┐
│  自定义导航栏(自定义样式)      │
├─────────────────────────────┤
│  今日复习卡片(醒目样式)        │
│  ┌───────────────────────┐  │
│  │ 待复习: 15 张          │  │
│  │ [开始复习] 按钮         │  │
│  └───────────────────────┘  │
│                              │
│  快速创建(拍照/上传图标)       │
│  ┌──────┐  ┌──────┐          │
│  │ 拍照  │  │ 上传  │          │
│  └──────┘  └──────┘          │
│                              │
│  学习统计(横向卡片)            │
│  ┌───────────────────────┐  │
│  │ 总卡片: 120            │  │
│  │ 今日已复习: 8           │  │
│  │ 连续学习: 5 天          │  │
│  └───────────────────────┘  │
│                              │
│  最近卡组(列表,最多5个)        │
│  ┌───────────────────────┐  │
│  │ 📚 高数第一章      12张  │  │
│  │ 📚 英语单词       30张  │  │
│  └───────────────────────┘  │
│                              │
│  [查看全部卡组]               │
└─────────────────────────────┘
│  首页  卡组库  我的             │
└─────────────────────────────┘
```

### 2.2 组件结构

```
pages/index/
├── index.ts          # 页面逻辑
├── index.wxml        # 模板
├── index.less        # 样式
└── index.json        # 配置

components/
├── review-card/      # 今日复习卡片组件
│   ├── index.ts
│   └── index.wxml
├── quick-create/     # 快速创建组件
│   ├── index.ts
│   └── index.wxml
├── stats-card/       # 统计卡片组件
│   ├── index.ts
│   └── index.wxml
└── deck-list-item/   # 卡组列表项组件
    ├── index.ts
    └── index.wxml
```

---

## 三、前端数据流与状态管理

### 3.1 数据流设计

```
App Global Data (app.ts)
├── userInfo: 用户信息
├── isLoggedIn: 登录状态
└── token: JWT token

Index Page Data
├── todayReviews: {
│     count: 15,
│     loading: false
│   }
├── stats: {
│     totalCards: 120,
│     todayReviewed: 8,
│     streakDays: 5,
│     loading: false
│   }
├── recentDecks: Deck[] (最近5个卡组)
└── loading: boolean (页面加载状态)
```

### 3.2 页面生命周期

```
onLoad
  ├── 检查登录状态
  ├── 未登录则调用 wx.login() 获取 code
  ├── 调用后端 /api/auth/login 换取 JWT
  └── 存储 token 到 app global data

onShow
  ├── 并行请求三个接口
  │     ├── GET /api/v1/review/today (今日待复习数)
  │     ├── GET /api/v1/stats (学习统计)
  │     └── GET /api/v1/decks?limit=5&sort=recent (最近卡组)
  └── 更新页面数据

onPullDownRefresh
  └── 重新调用 onShow 逻辑
```

### 3.3 网络请求封装

```
utils/request.ts
├── request<T>(options): Promise<T>
│     ├── 自动添加 Authorization header
│     ├── 处理 401 未授权(跳转登录)
│     ├── 统一错误处理
│     └── 返回类型安全的数据
└── 具体方法:
      ├── getTodayReviews()
      ├── getStats()
      └── getRecentDecks()
```

---

## 四、后端 API 设计

### 4.1 首页所需 API 接口

```
1. GET /api/v1/review/today
   功能: 获取今日待复习卡片数量和预览
   请求头: Authorization: Bearer <JWT>
   响应:
   {
     "code": 0,
     "data": {
       "count": 15,
       "cards": [  // 可选,返回前3张卡片预览
         {
           "id": 1,
           "front": "牛顿第二定律公式",
           "deck_name": "高数第一章"
         }
       ]
     }
   }

2. GET /api/v1/stats
   功能: 获取用户学习统计
   请求头: Authorization: Bearer <JWT>
   响应:
   {
     "code": 0,
     "data": {
       "total_cards": 120,
       "today_reviewed": 8,
       "streak_days": 5,
       "mastered_cards": 45  // 可选,已掌握卡片数
     }
   }

3. GET /api/v1/decks?limit=5&sort=recent
   功能: 获取最近学习的卡组
   请求头: Authorization: Bearer <JWT>
   响应:
   {
     "code": 0,
     "data": {
       "decks": [
         {
           "id": 1,
           "name": "高数第一章",
           "total_cards": 12,
           "due_today": 3,
           "last_reviewed_at": "2026-03-09T20:30:00Z"
         }
       ]
     }
   }
```

### 4.2 后端实现要点

```
Review Service
├── GetTodayReviews(ctx, userID)
│     ├── 查询 Card 表: WHERE user_id = ? AND due_date <= NOW()
│     ├── LIMIT 50 (积压保护)
│     └── 返回 count 和预览卡片

Stats Service
├── GetStats(ctx, userID)
│     ├── 查询 User 表: total_cards, streak_days
│     ├── 查询 ReviewLog 表: COUNT(today)
│     └── 返回统计数据

Deck Service
├── GetRecentDecks(ctx, userID, limit)
│     ├── 查询 Deck 表 + Card 表关联
│     ├── ORDER BY last_reviewed_at DESC
│     └── 返回卡组列表及统计信息
```

---

## 五、Docker 容器配置方案

### 5.1 Docker Compose 配置

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
      - ./migrations:/docker-entrypoint-initdb.d
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

### 5.2 本地开发启动流程

```bash
1. 启动容器:
   docker-compose up -d

2. 等待健康检查通过:
   docker-compose ps

3. 执行数据库迁移:
   make migrate-up

4. 启动后端服务:
   go run cmd/server/main.go -conf configs/config.yaml

5. 访问数据库管理界面:
   http://localhost:8080
   (系统: PostgreSQL, 服务器: postgres, 用户名/密码: snapcard/snapcard_dev_2026, 数据库: snapcard)
```

### 5.3 配置文件示例

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

---

## 六、项目目录结构

### 6.1 后端目录结构

```
server/
├── api/v1/                    # API 定义
│   ├── auth.proto
│   ├── card.proto
│   ├── deck.proto
│   ├── review.proto
│   └── stats.proto
│
├── cmd/server/
│   └── main.go                # 应用入口
│
├── configs/
│   ├── config.yaml            # 默认配置
│   └── config.prod.yaml       # 生产配置
│
├── internal/
│   ├── biz/                   # 业务逻辑层
│   │   ├── biz.go
│   │   ├── card.go
│   │   ├── deck.go
│   │   ├── review.go
│   │   ├── stats.go
│   │   └── user.go
│   │
│   ├── data/                  # 数据访问层
│   │   ├── data.go
│   │   ├── card.go
│   │   ├── deck.go
│   │   ├── review.go
│   │   ├── stats.go
│   │   └── user.go
│   │
│   ├── service/               # 服务实现层
│   │   ├── service.go
│   │   ├── auth.go
│   │   ├── card.go
│   │   ├── deck.go
│   │   ├── review.go
│   │   └── stats.go
│   │
│   └── server/                # 服务器初始化
│       ├── grpc.go
│       └── http.go
│
├── ent/schema/                # 数据库实体定义
│   ├── user.go
│   ├── deck.go
│   ├── card.go
│   └── reviewlog.go
│
├── migrations/                # 数据库迁移脚本
│   ├── 2026031001_init.up.sql
│   └── 2026031001_init.down.sql
│
├── pkg/                       # 公共库
│   ├── ai/
│   │   └── client.go
│   ├── wechat/
│   │   └── client.go
│   └── middleware/
│       └── auth/
│
├── docker-compose.yml
├── Makefile
├── go.mod
└── Dockerfile
```

### 6.2 前端目录结构

```
client/miniprogram/
├── app.ts                     # 应用入口
├── app.json                   # 全局配置
├── app.less                   # 全局样式
│
├── pages/
│   ├── index/                 # 首页
│   │   ├── index.ts
│   │   ├── index.wxml
│   │   ├── index.less
│   │   └── index.json
│   │
│   ├── decks/                 # 卡组库页
│   │   ├── index.ts
│   │   ├── index.wxml
│   │   ├── index.less
│   │   └── index.json
│   │
│   ├── review/                # 复习页
│   │   ├── index.ts
│   │   ├── index.wxml
│   │   ├── index.less
│   │   └── index.json
│   │
│   ├── create/                # 创建闪卡页
│   │   ├── index.ts
│   │   ├── index.wxml
│   │   ├── index.less
│   │   └── index.json
│   │
│   └── profile/               # 我的页
│       ├── index.ts
│       ├── index.wxml
│       ├── index.less
│       └── index.json
│
├── components/
│   ├── review-card/           # 今日复习卡片组件
│   ├── quick-create/          # 快速创建组件
│   ├── stats-card/            # 统计卡片组件
│   ├── deck-list-item/         # 卡组列表项组件
│   └── navigation-bar/        # 导航栏组件
│
├── utils/
│   ├── request.ts             # 网络请求封装
│   ├── auth.ts                # 登录鉴权
│   ├── fsrs.ts                # FSRS 算法工具
│   └── util.ts                # 通用工具
│
└── typings/
    ├── index.d.ts             # 全局类型定义
    └── types/
        ├── api.d.ts           # API 响应类型
        └── app.d.ts           # 应用类型
```

---

## 七、实现任务清单

### 7.1 前端任务

**页面开发**
- [ ] 首页 (pages/index) - 展示今日复习、统计、最近卡组
- [ ] 复习页 (pages/review) - 混合模式(翻转卡片+列表预览)
- [ ] 创建闪卡页 (pages/create) - 拍照/上传图片
- [ ] 卡组库页 (pages/decks) - 管理所有卡组
- [ ] 我的页 (pages/profile) - 用户信息与设置

**组件开发**
- [ ] review-card: 今日复习卡片
- [ ] quick-create: 快速创建组件
- [ ] stats-card: 统计卡片
- [ ] deck-list-item: 卡组列表项
- [ ] navigation-bar: 自定义导航栏

**工具函数**
- [ ] request.ts: 网络请求封装
- [ ] auth.ts: 登录鉴权
- [ ] fsrs.ts: FSRS 算法工具

**类型定义**
- [ ] API 响应类型
- [ ] 应用全局类型

### 7.2 后端任务

**数据库设计**
- [ ] User 表 (ent/schema/user.go)
- [ ] Deck 表 (ent/schema/deck.go)
- [ ] Card 表,含 FSRS 字段 (ent/schema/card.go)
- [ ] ReviewLog 表 (ent/schema/reviewlog.go)
- [ ] 数据库迁移脚本

**API 开发**
- [ ] POST /api/v1/auth/login - 微信登录
- [ ] GET /api/v1/review/today - 今日待复习
- [ ] GET /api/v1/stats - 学习统计
- [ ] GET /api/v1/decks - 卡组列表
- [ ] POST /api/v1/cards/generate - 生成闪卡
- [ ] POST /api/v1/review/submit - 提交自评
- [ ] POST /api/v1/review/judge - AI 判题

**核心模块**
- [ ] FSRS 调度器实现 (internal/biz/fsrs.go)
- [ ] AI 服务集成 (pkg/ai/client.go)
- [ ] 微信登录集成 (pkg/wechat/client.go)
- [ ] 定时任务 - 订阅消息推送

**基础设施**
- [ ] Docker Compose 配置
- [ ] Makefile 构建脚本
- [ ] 配置文件模板

---

## 八、技术栈确认

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端语言 | TypeScript | 类型安全 |
| 前端样式 | Less | 微信开发者工具自动编译 |
| 渲染器 | Skyline | 高性能渲染 |
| 组件框架 | glass-easel | 推荐的现代模式 |
| 后端语言 | Go 1.26+ | 高性能,部署简单 |
| 后端框架 | Kratos | 完整的微服务框架 |
| 数据库 | PostgreSQL 16 | 功能丰富,适合 FSRS |
| ORM | Ent | 类型安全,代码生成 |
| AI 客户端 | Eino (字节) | 国内维护,多模型支持 |
| 认证 | JWT | 标准实现 |
| 容器 | Docker Compose | PostgreSQL + Adminer |

---

## 九、注意事项

### 9.1 开发环境

- 使用微信开发者工具打开 `client/miniprogram` 目录
- 应用 ID 已配置: wx1f0edb2d79745277
- 后端代码放在 `server/` 目录
- Docker Compose 配置放在项目根目录

### 9.2 架构原则

- 遵循 Kratos 分层架构: Service → Biz → Data
- 前端页面使用 Component() 构造函数 (Skyline 推荐)
- 后端使用 gRPC + HTTP Gateway
- 数据库迁移使用 golang-migrate

### 9.3 MVP 约束

- 初版不引入 Redis
- 单实例部署
- 积压保护: 单次复习上限 50 张卡片
- AI 接口超时降级为自评模式

---

_文档由首页功能设计会话生成,基于 2026-03-10 确认的 MVP 架构和 Docker 容器方案。_