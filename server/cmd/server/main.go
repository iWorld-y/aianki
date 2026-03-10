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
