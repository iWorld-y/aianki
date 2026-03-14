package data

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/google/uuid"
	"github.com/jty/snapcard/internal/biz"
)

type uploadRepo struct {
	storagePath string
}

func NewUploadRepo() biz.UploadRepo {
	storagePath := "storage/uploads"
	return &uploadRepo{storagePath: storagePath}
}

func (r *uploadRepo) SaveFile(ctx context.Context, file *biz.UploadedFile, fileType string) (*biz.UploadResult, error) {
	now := time.Now()
	year := now.Format("2006")
	month := now.Format("01")
	day := now.Format("02")

	dirPath := filepath.Join(r.storagePath, year, month, day)
	if err := os.MkdirAll(dirPath, 0750); err != nil {
		return nil, fmt.Errorf("failed to create directory: %w", err)
	}

	ext := filepath.Ext(file.Filename)
	newFilename := uuid.New().String() + ext
	filePath := filepath.Join(dirPath, newFilename)

	if err := os.WriteFile(filePath, file.Content, 0644); err != nil {
		return nil, fmt.Errorf("failed to write file: %w", err)
	}

	url := fmt.Sprintf("/uploads/%s/%s/%s/%s", year, month, day, newFilename)

	return &biz.UploadResult{
		URL:      url,
		Filename: newFilename,
		Size:     file.Size,
	}, nil
}
