# SnapCard Backend Makefile
# Go + Kratos + Ent ORM
# 位于项目根目录，管理后端服务

# 变量定义
APP_NAME := snapcard-server
APP_PATH := server/cmd/server/main.go
BUILD_DIR := server/bin
DOCKER_COMPOSE := docker-compose
SERVER_DIR := server

# 默认目标
.PHONY: help
help: ## 显示帮助信息
	@echo "Available targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

# 构建相关
.PHONY: build
build: ## 构建生产版本
	@echo "Building $(APP_NAME)..."
	@mkdir -p $(BUILD_DIR)
	@cd $(SERVER_DIR) && go build -ldflags="-w -s" -o bin/$(APP_NAME) $(APP_PATH:server/%=%)
	@echo "Build complete: $(BUILD_DIR)/$(APP_NAME)"

.PHONY: build-dev
build-dev: ## 构建开发版本（带调试信息）
	@echo "Building $(APP_NAME) (dev)..."
	@mkdir -p $(BUILD_DIR)
	@cd $(SERVER_DIR) && go build -o bin/$(APP_NAME) $(APP_PATH:server/%=%)
	@echo "Build complete: $(BUILD_DIR)/$(APP_NAME)"

.PHONY: run
run: ## 运行开发版本
	@echo "Starting $(APP_NAME)..."
	@cd $(SERVER_DIR) && go run $(APP_PATH:server/%=%)

.PHONY: start
start: build ## 构建并运行生产版本
	@echo "Starting production $(APP_NAME)..."
	@./$(BUILD_DIR)/$(APP_NAME)

# 依赖管理
.PHONY: deps
deps: ## 下载并整理依赖
	@echo "Downloading dependencies..."
	@cd $(SERVER_DIR) && go mod download
	@cd $(SERVER_DIR) && go mod tidy
	@echo "Dependencies ready"

.PHONY: update
deps-update: ## 更新依赖
	@echo "Updating dependencies..."
	@cd $(SERVER_DIR) && go get -u ./...
	@cd $(SERVER_DIR) && go mod tidy
	@echo "Dependencies updated"

# 代码质量
.PHONY: fmt
fmt: ## 格式化 Go 代码
	@echo "Formatting code..."
	@cd $(SERVER_DIR) && go fmt ./...

.PHONY: vet
vet: ## 运行 go vet 检查
	@echo "Running go vet..."
	@cd $(SERVER_DIR) && go vet ./...

.PHONY: lint
lint: ## 运行 golangci-lint（需先安装）
	@echo "Running linter..."
	@cd $(SERVER_DIR) && which golangci-lint > /dev/null || (echo "golangci-lint not installed, installing..." && go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest)
	@cd $(SERVER_DIR) && golangci-lint run ./...

.PHONY: check
check: fmt vet ## 运行所有代码检查
	@echo "All checks passed"

# 测试
.PHONY: test
test: ## 运行所有测试
	@echo "Running tests..."
	@cd $(SERVER_DIR) && go test -v ./...

.PHONY: test-short
test-short: ## 运行短测试（跳过耗时测试）
	@echo "Running short tests..."
	@cd $(SERVER_DIR) && go test -short -v ./...

.PHONY: test-coverage
test-coverage: ## 运行测试并生成覆盖率报告
	@echo "Running tests with coverage..."
	@cd $(SERVER_DIR) && go test -coverprofile=coverage.out ./...
	@cd $(SERVER_DIR) && go tool cover -html=coverage.out -o coverage.html
	@echo "Coverage report generated: $(SERVER_DIR)/coverage.html"

# 数据库
.PHONY: migrate
migrate: ## 运行数据库迁移
	@echo "Running database migrations..."
	@cd $(SERVER_DIR) && go run -mod=mod entgo.io/ent/cmd/ent migrate --dir ./ent/migrate

.PHONY: generate
generate: ## 生成 Ent ORM 代码
	@echo "Generating Ent code..."
	@cd $(SERVER_DIR) && go generate ./ent/generate.go

# Docker
.PHONY: docker-build
docker-build: ## 构建 Docker 镜像
	@echo "Building Docker image..."
	@cd $(SERVER_DIR) && docker build -t $(APP_NAME):latest .

.PHONY: docker-run
docker-run: ## 使用 Docker 运行
	@echo "Running Docker container..."
	@docker run -p 8001:8001 --env-file .env $(APP_NAME):latest

.PHONY: compose-up
compose-up: ## 启动 Docker Compose 服务（PostgreSQL 等）
	@echo "Starting Docker Compose services..."
	@$(DOCKER_COMPOSE) up -d

.PHONY: compose-down
compose-down: ## 停止 Docker Compose 服务
	@echo "Stopping Docker Compose services..."
	@$(DOCKER_COMPOSE) down

.PHONY: compose-logs
compose-logs: ## 查看 Docker Compose 日志
	@$(DOCKER_COMPOSE) logs -f

# 清理
.PHONY: clean
clean: ## 清理构建产物
	@echo "Cleaning..."
	@rm -rf $(BUILD_DIR)
	@rm -f $(SERVER_DIR)/coverage.out $(SERVER_DIR)/coverage.html
	@echo "Clean complete"

.PHONY: clean-all
clean-all: clean compose-down ## 清理所有（包括 Docker）
	@echo "Deep clean complete"

# 开发工具
.PHONY: dev
dev: ## 启动完整开发环境（数据库 + 后端）
	@echo "Starting development environment..."
	@$(DOCKER_COMPOSE) up -d postgres
	@sleep 3
	@cd $(SERVER_DIR) && go run $(APP_PATH:server/%=%)

.PHONY: watch
watch: ## 使用 air 热重载开发（需先安装 air）
	@echo "Starting with hot reload..."
	@cd $(SERVER_DIR) && which air > /dev/null || (echo "air not installed, installing..." && go install github.com/air-verse/air@latest)
	@cd $(SERVER_DIR) && air -c .air.toml

# 生产部署
.PHONY: deploy
deploy: build ## 部署生产版本
	@echo "Deploying $(APP_NAME)..."
	@# 这里可以添加实际的部署命令
	@echo "Production binary ready at: $(BUILD_DIR)/$(APP_NAME)"

# 版本信息
.PHONY: version
version: ## 显示版本信息
	@go version
	@echo "App: $(APP_NAME)"
	@echo "Build dir: $(BUILD_DIR)"
