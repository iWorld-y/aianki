# AGENTS.md

SnapCard 项目代理指南 - 一款微信小程序闪卡学习应用。

## 项目结构

这是一个全栈项目，包括：
- **前端**：微信小程序（TypeScript + Less，Skyline 渲染器）
- **后端**：Go 语言（Kratos 框架 + Ent ORM）
- **数据库**：PostgreSQL（通过 Docker Compose 运行）

```
/Users/jty/project/wechatProjects/aianki/
├── client/              # 微信小程序前端
│   ├── miniprogram/     # 源代码
│   │   ├── pages/       # 页面组件
│   │   ├── components/  # 可复用组件
│   │   ├── typings/     # TypeScript 类型定义
│   │   └── utils/       # 工具函数
│   └── package.json
├── server/              # Go 后端
│   ├── cmd/server/      # 应用程序入口点
│   ├── internal/        # 内部包
│   │   ├── biz/         # 业务逻辑层
│   │   ├── data/        # 数据访问层
│   │   └── service/     # HTTP/gRPC 服务层
│   ├── ent/             # Ent ORM 生成的代码
│   ├── pkg/             # 公共包
│   └── go.mod
├── docker-compose.yml   # PostgreSQL + Adminer
└── docs/                # 文档（产品需求文档、技术规格书）
```

## 构建/测试命令

### 后端（Go）

```bash
# 构建服务器
cd server && go build -o bin/server ./cmd/server/main.go

# 运行服务器
cd server && go run ./cmd/server/main.go

# 运行所有测试
cd server && go test ./...

# 运行单个测试
cd server && go test -v -run TestFunctionName ./package/path

# 格式化 Go 代码
cd server && go fmt ./...

# 整理依赖项
cd server && go mod tidy

# 运行代码检查工具（如果已安装 golangci-lint）
cd server && golangci-lint run
```

### 前端（微信小程序）

```bash
# 没有 npm 构建脚本可用
# 使用微信开发者工具进行：
# - TypeScript 编译
# - Less 编译
# - 热重载
# - 上传/预览
```

### 数据库（Docker）

```bash
# 启动 PostgreSQL 和 Adminer
docker-compose up -d

# 停止服务
docker-compose down

# 查看日志
docker-compose logs -f postgres
```

### Ent ORM 代码生成

```bash
# 在模式更改后生成 Ent 代码
cd server && go generate ./ent/generate.go
```

## 代码风格指南

### TypeScript（前端）

**格式化**：
- 2 个空格缩进（不使用制表符）
- 字符串使用单引号
- 不使用分号（除非必需）
- 多行对象/数组使用尾随逗号

**导入**：
```typescript
// 按顺序分组导入：标准库 -> 第三方库 -> 本地文件
import { formatTime } from '../../utils/util'
import type { Deck } from '../../typings/types/api'
```

**类型**：
- 对象结构使用 `interface`
- 联合类型/别名使用 `type`
- 导出的函数需要显式声明返回类型
- 启用严格 TypeScript 模式（`strict: true`，`strictNullChecks: true`）

**命名**：
- 接口、类型、类、组件使用 `PascalCase`
- 变量、函数、方法使用 `camelCase`
- 常量使用 `UPPER_CASE`
- 文件名：小写字母加连字符（例如 `user-profile.ts`）

**组件**（微信小程序）：
```typescript
// 页面使用 Component() 而不是 Page()
Component({
  data: { /* ... */ },
  lifetimes: {
    attached() { /* 初始化 */ }
  },
  methods: {
    onTap() { /* 事件处理函数 */ }
  }
})
```

**错误处理**：
```typescript
// 使用带有错误处理的回调
wx.request({
  url: '...',
  success: (res) => { /* 处理成功 */ },
  fail: (err) => {
    console.error('请求失败：', err)
    wx.showToast({ title: '网络错误', icon: 'none' })
  }
})
```

### Go（后端）

**格式化**：
- 使用标准 `gofmt` 格式化
- 行长度：最大约 100 个字符
- 标准库与外部库导入之间用空行分隔

**导入**：
```go
import (
    "context"
    "time"

    "github.com/go-kratos/kratos/v2"
    "entgo.io/ent"
)
```

**命名**：
- 导出的标识符使用 `PascalCase`
- 非导出的标识符使用 `camelCase`
- 常量使用 `ALL_CAPS`（优先使用类型化常量）
- 缩写：`UserID`、`URL`、`HTTP`（而不是 `UserId`、`Url`）

**类型**：
```go
// biz 层中的领域模型
type User struct {
    ID        int
    OpenID    string
    Nickname  *string  // 可为空的字段使用指针
}

// 存储库接口
type UserRepo interface {
    Create(ctx context.Context, openid string) (*User, error)
    FindByOpenID(ctx context.Context, openid string) (*User, error)
}

// 用例
type UserUsecase struct {
    repo      UserRepo
    jwtSecret string
}
```

**错误处理**：
```go
// 定义哨兵错误
var ErrNotFound = errors.New("未找到")

// 使用 errors.Is 检查特定错误
user, err := uc.repo.FindByOpenID(ctx, openid)
if err != nil {
    if errors.Is(err, ErrNotFound) {
        // 处理未找到的情况
    }
    return "", err  // 包装意外错误
}

// 始终处理错误，切勿忽略
```

**上下文**：
- 始终将 `context.Context` 作为第一个参数传递
- 使用 `ctx` 作为变量名
- 尊重上下文的取消操作

**架构**（整洁架构 / Kratos）：
- `biz/`：业务逻辑、领域模型、用例
- `data/`：数据访问、存储库实现
- `service/`：HTTP/gRPC 处理器、请求/响应 DTO
- `ent/`：自动生成的 Ent ORM 代码（严禁直接修改）

### Less/CSS（前端）

**约定**：
- 2 个空格缩进
- 类名使用小写字母加连字符（例如 `.user-profile`）
- 为颜色和间距使用变量
- 为复杂组件遵循类似 BEM 的命名方式

**Skyline 渲染器**：
- `defaultDisplayBlock: true` 已启用
- 使用 Flexbox/Grid 进行布局
- 响应式尺寸使用 `rpx` 单位

## 关键约定

1. **目前没有测试文件** - 添加测试时：
   - Go：在与源文件相同的目录下创建 `*_test.go` 文件
   - TypeScript：尚未建立测试框架

2. **Git 工作流**：
   - 未检测到预提交钩子
   - 遵循常规提交消息格式

3. **文档**：
   - 将所有规格/计划放在 `docs/` 目录中
   - 用户面向的文档使用中文编写

4. **配置**：
   - 后端配置：`server/configs/`
   - 前端配置：`project.config.json`
   - 环境变量：使用 `.env` 文件（不提交到版本控制）

## 注意事项

- 前端编译由微信开发者工具处理（没有 npm 构建）
- 后端使用 Kratos 微服务框架
- Ent ORM 在 `server/ent/` 中生成代码 - 严禁直接修改
- PostgreSQL 通过 Docker Compose 在 5432 端口运行
- Adminer 可通过 http://localhost:8080 访问