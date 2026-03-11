package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/go-kratos/kratos/v2"
	"github.com/go-kratos/kratos/v2/config"
	"github.com/go-kratos/kratos/v2/config/file"
	"github.com/go-kratos/kratos/v2/transport/http"
	"github.com/joho/godotenv"
	"github.com/jty/snapcard/ent"
	"github.com/jty/snapcard/internal/biz"
	"github.com/jty/snapcard/internal/data"
	"github.com/jty/snapcard/internal/service"
	"github.com/jty/snapcard/pkg/wechat"

	_ "github.com/lib/pq"
)

func main() {
	// 加载 .env 文件（如果不存在则忽略错误）
	if err := godotenv.Load("../.env"); err != nil {
		log.Printf("Warning: .env file not found: %v", err)
	}

	c := config.New(
		config.WithSource(
			file.NewSource("configs/config.yaml"),
		),
	)
	if err := c.Load(); err != nil {
		log.Fatalf("failed to load config: %v", err)
	}

	// 获取配置
	var cfg struct {
		Data struct {
			Database struct {
				Driver string `yaml:"driver"`
				Source string `yaml:"source"`
			} `yaml:"database"`
		} `yaml:"data"`
		Auth struct {
			JWTSecret string `yaml:"jwt_secret"`
		} `yaml:"auth"`
		Wechat struct {
			AppID     string `yaml:"app_id"`
			AppSecret string `yaml:"app_secret"`
		} `yaml:"wechat"`
	}

	if err := c.Scan(&cfg); err != nil {
		log.Fatalf("failed to scan config: %v", err)
	}

	// 优先从环境变量读取微信配置
	appID := getEnv("WECHAT_APP_ID", cfg.Wechat.AppID)
	appSecret := getEnv("WECHAT_APP_SECRET", cfg.Wechat.AppSecret)

	// 连接数据库
	entClient, err := ent.Open(cfg.Data.Database.Driver, cfg.Data.Database.Source)
	if err != nil {
		log.Fatalf("failed to open database: %v", err)
	}
	defer entClient.Close()

	// 初始化微信客户端
	wechatCli := wechat.NewClient(appID, appSecret)

	// 初始化数据层
	userRepo := data.NewUserRepo(entClient)

	// 初始化业务层
	userUc := biz.NewUserUsecase(userRepo, cfg.Auth.JWTSecret)

	// 初始化服务层
	userSvc := service.NewUserService(userUc, wechatCli)

	// 创建 HTTP 服务器
	httpSrv := http.NewServer(
		http.Address(":8000"),
	)

	// 注册路由
	router := httpSrv.Route("/api/v1")
	router.POST("/auth/login", userSvc.Login)

	app := kratos.New(
		kratos.Server(httpSrv),
	)

	go func() {
		if err := app.Run(); err != nil {
			log.Printf("server stopped: %v", err)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGTERM, syscall.SIGINT)
	<-stop

	if err := app.Stop(); err != nil {
		log.Printf("failed to stop app: %v", err)
	}
}

// getEnv 获取环境变量，如果不存在则返回默认值
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
