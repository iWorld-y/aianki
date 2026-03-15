# 拍照识别提取记忆卡片功能设计文档

> 版本：v1.0 | 日期：2026-03-15 | 设计方案

---

## 一、功能概述

### 1.1 核心功能

用户可以通过拍照或选择图片，使用 AI 自动提取图片中的知识点，并生成记忆卡片保存到指定卡组。

### 1.2 使用场景

- **课本/教材**：拍摄课本页面，提取知识点
- **手写笔记**：拍摄手写笔记，提取关键信息
- **文档/文章**：拍摄打印文档，提取要点
- **混合类型**：支持多种类型的图片内容提取

### 1.3 卡片格式

AI 根据内容自动判断卡片类型：
- **问答对（qa）**：问题+答案格式
- **概念（concept）**：知识点+解释格式
- **填空题（fill_blank）**：带空格的问题+答案格式

---

## 二、技术架构

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────┐
│  前端（微信小程序）                                        │
│  - 选择卡组页面（现有）                                   │
│  - 拍照/选图页面（新增）                                  │
│  - 卡片预览/编辑页面（新增）                              │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP API
┌────────────────────────▼────────────────────────────────┐
│  后端（Go + Kratos）                                     │
│  - Service 层：处理 HTTP 请求、参数验证                  │
│  - Biz 层：业务逻辑、调用 AI 服务                       │
│  - Data 层：数据存储、AI 客户端封装                     │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│  Eino AI 框架                                            │
│  - 封装 Qwen 3.5 flash 模型调用                         │
│  - 图片分析、内容提取、卡片生成                         │
└─────────────────────────────────────────────────────────┘
```

### 2.2 技术栈

| 组件 | 技术选型 | 说明 |
|------|----------|------|
| AI 框架 | Eino v0.3.0 | 字节跳动开源的 AI 框架 |
| AI 模型 | Qwen 3.5 flash | 通义千问视觉语言模型 |
| 后端框架 | Kratos | Go 微服务框架 |
| ORM | Ent | 类型安全的 ORM |
| 数据库 | PostgreSQL | 关系型数据库 |

---

## 三、数据流程

### 3.1 用户操作流程

1. 用户进入卡组列表，选择目标卡组
2. 点击"拍照提取"按钮
3. 拍照或从相册选择图片
4. 图片上传到服务器
5. 后端调用 AI 模型分析图片
6. 前端显示提取的卡片列表
7. 用户可以编辑或删除卡片
8. 点击"保存"按钮，卡片保存到卡组

### 3.2 技术数据流程

```
1. 前端上传图片
   → POST /upload/image
   → 返回图片 URL

2. 前端请求提取卡片
   → POST /card/extract
   → 请求体：{ imageUrl, deckId }
   → 后端调用 Eino → Qwen 3.5 flash
   → AI 返回 JSON 格式的卡片数据
   → 返回提取的卡片列表

3. 前端保存卡片
   → POST /card/save
   → 请求体：{ deckId, cards, imageUrl }
   → 后端保存到数据库
   → 返回保存结果
```

---

## 四、后端实现

### 4.1 目录结构

```
server/
├── pkg/
│   └── ai/
│       └── client.go          # AI 客户端封装（新增）
├── internal/
│   ├── biz/
│   │   └── card_extract.go    # 卡片提取业务逻辑（新增）
│   ├── data/
│   │   └── card_extract.go    # 卡片提取数据层（新增）
│   └── service/
│       └── card_extract.go    # 卡片提取服务层（新增）
└── configs/
    └── config.yaml            # 更新 AI 配置
```

### 4.2 AI 客户端封装 (`pkg/ai/client.go`)

```go
package ai

import (
	"context"
	"encoding/json"
	"fmt"
	
	"github.com/cloudwego/eino"
	"github.com/cloudwego/eino/components/model"
)

// CardData AI 提取的卡片数据
type CardData struct {
	Front  string   `json:"front"`
	Back   string   `json:"back"`
	Tags   []string `json:"tags,omitempty"`
	Type   string   `json:"type"` // "qa", "concept", "fill_blank"
}

// CardExtractionResult 卡片提取结果
type CardExtractionResult struct {
	Cards []CardData `json:"cards"`
}

// AIClient AI 客户端接口
type AIClient interface {
	ExtractCards(ctx context.Context, imageURL string) (*CardExtractionResult, error)
}
```

### 4.3 业务逻辑层 (`internal/biz/card_extract.go`)

```go
package biz

import (
	"context"
)

// ExtractedCard 提取的卡片
type ExtractedCard struct {
	Front  string
	Back   string
	Tags   []string
	Type   string
}

// CardExtractUsecase 卡片提取用例
type CardExtractUsecase struct {
	aiClient  AIClient
	cardRepo  CardExtractRepo
	deckRepo  DeckRepo
}
```

### 4.4 服务层 (`internal/service/card_extract.go`)

```go
package service

import (
	"github.com/go-kratos/kratos/v2/transport/http"
)

// ExtractCardsRequest 提取卡片请求
type ExtractCardsRequest struct {
	ImageURL string `json:"image_url"`
	DeckID   int    `json:"deck_id"`
}

// ExtractCards 提取卡片
func (s *CardExtractService) ExtractCards(ctx http.Context) error {
	// 验证身份
	// 解析请求
	// 调用业务逻辑
	// 返回响应
}
```

---

## 五、前端实现

### 5.1 新增页面

```
client/miniprogram/pages/
└── card-extract/
    ├── index.ts      # 页面逻辑
    ├── index.wxml    # 页面模板
    ├── index.less    # 页面样式
    └── index.json    # 页面配置
```

### 5.2 页面功能

- 显示选中的卡组信息
- 提供拍照/选图按钮
- 显示 AI 提取的卡片列表
- 支持编辑和删除卡片
- 提供保存按钮

### 5.3 API 接口

```typescript
// 提取卡片
function extractCards(data: ExtractCardsRequest): Promise<ExtractCardsResponse>

// 保存提取的卡片
function saveExtractedCards(data: SaveExtractedCardsRequest): Promise<SaveExtractedCardsResponse>
```

---

## 六、配置更新

### 6.1 更新 `server/configs/config.yaml`

```yaml
ai:
  api_key: "sk-your-dashscope-key"
  base_url: "https://dashscope.aliyuncs.com/compatible-mode/v1"
  model: "qwen-vl-flash"  # 更新为 Qwen 3.5 flash 模型
```

### 6.2 更新 `server/go.mod`

添加 eino 依赖：
```bash
go get github.com/cloudwego/eino@v0.3.0
```

---

## 七、实施计划

### 7.1 第一阶段：后端基础（2-3 天）

1. 创建 `pkg/ai/client.go` 封装 Eino 框架
2. 创建 `internal/biz/card_extract.go` 业务逻辑
3. 创建 `internal/data/card_extract.go` 数据层
4. 创建 `internal/service/card_extract.go` 服务层
5. 更新配置文件和路由
6. 编写单元测试

### 7.2 第二阶段：前端页面（2-3 天）

1. 创建 `pages/card-extract/` 页面
2. 更新路由配置
3. 添加 API 类型定义
4. 更新 `utils/request.ts` 添加新 API
5. 集成测试

### 7.3 第三阶段：集成测试（1-2 天）

1. 测试图片上传流程
2. 测试 AI 提取功能
3. 测试卡片保存功能
4. 用户体验优化

---

## 八、注意事项

### 8.1 错误处理

- AI 调用可能失败，需要完善的错误处理
- 添加重试机制（最多 3 次）
- 提供友好的错误提示

### 8.2 性能优化

- 图片压缩后再上传
- AI 调用显示加载状态
- 考虑添加缓存机制

### 8.3 成本控制

- AI 调用有成本，添加使用限制
- 记录调用日志，便于成本分析
- 考虑添加用户配额

### 8.4 用户体验

- 提供卡片编辑功能
- 支持批量操作
- 提供清晰的操作指引

---

## 九、API 接口定义

### 9.1 提取卡片接口

**请求：**
```
POST /card/extract
Authorization: Bearer <token>
Content-Type: application/json

{
  "image_url": "https://example.com/image.jpg",
  "deck_id": 123
}
```

**响应：**
```json
{
  "code": 0,
  "data": {
    "cards": [
      {
        "front": "什么是 RESTful API？",
        "back": "RESTful API 是一种基于 REST 架构风格的 API 设计规范，使用 HTTP 方法（GET、POST、PUT、DELETE）对资源进行操作。",
        "tags": ["API", "REST"],
        "type": "qa"
      }
    ]
  }
}
```

### 9.2 保存提取的卡片接口

**请求：**
```
POST /card/save
Authorization: Bearer <token>
Content-Type: application/json

{
  "deck_id": 123,
  "cards": [...],
  "image_url": "https://example.com/image.jpg"
}
```

**响应：**
```json
{
  "code": 0,
  "data": {
    "card_ids": [1, 2, 3]
  }
}
```

---

## 十、风险与应对

| 风险 | 影响 | 应对措施 |
|------|------|----------|
| AI 调用失败 | 用户无法提取卡片 | 添加重试机制，提供手动输入备选方案 |
| AI 提取质量差 | 用户不满意 | 提供编辑功能，允许用户修改 |
| API 成本高 | 增加运营成本 | 添加使用限制，优化调用频率 |
| 响应时间长 | 用户体验差 | 显示加载状态，考虑异步处理 |

---

_文档由 AI 助手生成，基于 2026-03-15 确认的需求设计。_