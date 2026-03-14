package biz

import (
	"context"
	"errors"
	"net/http"
	"path/filepath"
	"strings"
)

var (
	ErrInvalidFileType = errors.New("invalid file type")
	ErrFileTooLarge    = errors.New("file too large")
	ErrInvalidContent  = errors.New("invalid file content")
)

type UploadedFile struct {
	Filename string
	Size     int64
	Content  []byte
}

type UploadResult struct {
	URL      string
	Filename string
	Size     int64
}

type UploadRepo interface {
	SaveFile(ctx context.Context, file *UploadedFile, fileType string) (*UploadResult, error)
}

type UploadUsecase struct {
	repo UploadRepo
}

func NewUploadUsecase(repo UploadRepo) *UploadUsecase {
	return &UploadUsecase{repo: repo}
}

func (uc *UploadUsecase) UploadImage(ctx context.Context, file *UploadedFile, fileType string) (*UploadResult, error) {
	if err := uc.validateImage(file); err != nil {
		return nil, err
	}

	return uc.repo.SaveFile(ctx, file, fileType)
}

func (uc *UploadUsecase) validateImage(file *UploadedFile) error {
	// 验证文件扩展名
	ext := strings.ToLower(filepath.Ext(file.Filename))
	allowedExts := map[string]bool{
		".jpg":  true,
		".jpeg": true,
		".png":  true,
	}

	if !allowedExts[ext] {
		return ErrInvalidFileType
	}

	// 验证文件大小
	maxSize := int64(5 * 1024 * 1024)
	if file.Size > maxSize {
		return ErrFileTooLarge
	}

	// 验证文件内容（魔术字节）
	contentType := http.DetectContentType(file.Content)
	allowedTypes := map[string]bool{
		"image/jpeg": true,
		"image/png":  true,
	}

	if !allowedTypes[contentType] {
		return ErrInvalidContent
	}

	return nil
}
