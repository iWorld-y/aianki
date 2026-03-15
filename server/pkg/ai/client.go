// pkg/ai/client.go
// AI 客户端封装 - 使用通义千问多模态模型

package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// CardData AI 提取的卡片数据
type CardData struct {
	Front string   `json:"front"`
	Back  string   `json:"back"`
	Tags  []string `json:"tags,omitempty"`
	Type  string   `json:"type"`
}

// CardExtractionResult 卡片提取结果
type CardExtractionResult struct {
	Cards []CardData `json:"cards"`
}

// AIClient AI 客户端接口
type AIClient interface {
	ExtractCards(ctx context.Context, imageURL string) (*CardExtractionResult, error)
}

// dashScopeClient 通义千问客户端实现
type dashScopeClient struct {
	apiKey     string
	baseURL    string
	model      string
	httpClient *http.Client
}

// OpenAI 兼容的请求/响应结构
type chatMessage struct {
	Role    string        `json:"role"`
	Content []contentPart `json:"content"`
}

type imageURLData struct {
	URL string `json:"url"`
}

type contentPart struct {
	Type     string        `json:"type"`
	Text     string        `json:"text,omitempty"`
	ImageURL *imageURLData `json:"image_url,omitempty"`
}

type chatRequest struct {
	Model    string        `json:"model"`
	Messages []chatMessage `json:"messages"`
}

type chatResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

// NewAIClient 创建 AI 客户端
func NewAIClient(apiKey, baseURL, model string) AIClient {
	if baseURL == "" {
		baseURL = "https://dashscope.aliyuncs.com/compatible-mode/v1"
	}
	if model == "" {
		model = "qwen-vl-max"
	}

	return &dashScopeClient{
		apiKey:  apiKey,
		baseURL: baseURL,
		model:   model,
		httpClient: &http.Client{
			Timeout: 60 * time.Second,
		},
	}
}

// ExtractCards 从图片中提取卡片
func (c *dashScopeClient) ExtractCards(ctx context.Context, imageURL string) (*CardExtractionResult, error) {
	systemPrompt := `你是一个专业的学习内容提取助手。请分析图片中的内容，并提取出适合制作记忆卡片的知识点。

要求：
1. 根据内容类型自动判断卡片格式（问答对、知识点、填空题等）
2. 每张卡片包含：
   - front: 正面内容（问题或知识点名称）
   - back: 背面内容（答案或详细解释）
   - tags: 相关标签（可选，尽量提供）
   - type: 卡片类型（qa=问答, concept=概念, fill_blank=填空）
3. 如果图片中有多个知识点，请提取多张卡片
4. 输出格式必须是有效的 JSON，不要包含任何其他文本

请直接输出以下格式的 JSON：
{
  "cards": [
    {
      "front": "问题或知识点",
      "back": "答案或解释",
      "tags": ["标签1", "标签2"],
      "type": "qa"
    }
  ]
}`

	reqBody := chatRequest{
		Model: c.model,
		Messages: []chatMessage{
			{
				Role: "system",
				Content: []contentPart{
					{Type: "text", Text: systemPrompt},
				},
			},
			{
				Role: "user",
				Content: []contentPart{
					{
						Type:     "image_url",
						ImageURL: &imageURLData{URL: imageURL},
					},
				},
			},
		},
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", c.baseURL+"/chat/completions", bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.apiKey)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	var chatResp chatResponse
	if err := json.Unmarshal(body, &chatResp); err != nil {
		return nil, fmt.Errorf("failed to unmarshal response: %w", err)
	}

	if chatResp.Error != nil {
		return nil, fmt.Errorf("AI API error: %s", chatResp.Error.Message)
	}

	if len(chatResp.Choices) == 0 {
		return nil, fmt.Errorf("no response from AI")
	}

	content := chatResp.Choices[0].Message.Content

	// 解析 AI 返回的 JSON
	var result CardExtractionResult
	if err := json.Unmarshal([]byte(content), &result); err != nil {
		return nil, fmt.Errorf("failed to parse AI response as JSON: %w, content: %s", err, content)
	}

	return &result, nil
}
