package biz

import (
	"context"
	"errors"
	"path/filepath"
	"strings"
)

var (
	ErrInvalidFileType = errors.New("invalid file type")
	ErrFileTooLarge    = errors.New("file too large")
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
	ext := strings.ToLower(filepath.Ext(file.Filename))
	allowedExts := map[string]bool{
		".jpg":  true,
		".jpeg": true,
		".png":  true,
	}

	if !allowedExts[ext] {
		return ErrInvalidFileType
	}

	maxSize := int64(5 * 1024 * 1024)
	if file.Size > maxSize {
		return ErrFileTooLarge
	}

	return nil
}
