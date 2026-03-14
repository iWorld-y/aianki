package service

import (
	"io"
	"net/http"
	"path/filepath"

	kratoshttp "github.com/go-kratos/kratos/v2/transport/http"
	"github.com/jty/snapcard/internal/biz"
)

type UploadService struct {
	uc *biz.UploadUsecase
}

type UploadResponse struct {
	Code    int    `json:"code"`
	Message string `json:"message,omitempty"`
	Data    struct {
		URL      string `json:"url"`
		Filename string `json:"filename"`
		Size     int64  `json:"size"`
	} `json:"data"`
}

func NewUploadService(uc *biz.UploadUsecase) *UploadService {
	return &UploadService{uc: uc}
}

func (s *UploadService) UploadImage(ctx kratoshttp.Context) error {
	req := ctx.Request()

	if err := req.ParseMultipartForm(10 << 20); err != nil {
		return ctx.JSON(200, UploadResponse{
			Code:    1001,
			Message: "请求解析失败: " + err.Error(),
		})
	}

	file, header, err := req.FormFile("file")
	if err != nil {
		return ctx.JSON(200, UploadResponse{
			Code:    1001,
			Message: "获取文件失败: " + err.Error(),
		})
	}
	defer file.Close()

	fileType := req.FormValue("type")
	if fileType == "" {
		fileType = "general"
	}

	fileContent, err := io.ReadAll(file)
	if err != nil {
		return ctx.JSON(200, UploadResponse{
			Code:    1001,
			Message: "读取文件失败: " + err.Error(),
		})
	}

	uploadedFile := &biz.UploadedFile{
		Filename: filepath.Base(header.Filename),
		Size:     header.Size,
		Content:  fileContent,
	}

	result, err := s.uc.UploadImage(ctx, uploadedFile, fileType)
	if err != nil {
		code := 500
		message := "上传失败: " + err.Error()
		if err == biz.ErrInvalidFileType {
			code = 1002
			message = "不支持的文件格式，仅支持 JPG/PNG"
		} else if err == biz.ErrFileTooLarge {
			code = 1003
			message = "文件过大，最大支持 5MB"
		}
		return ctx.JSON(200, UploadResponse{
			Code:    code,
			Message: message,
		})
	}

	resp := UploadResponse{
		Code: 0,
	}
	resp.Data.URL = result.URL
	resp.Data.Filename = result.Filename
	resp.Data.Size = result.Size

	return ctx.JSON(200, resp)
}

func ServeStaticFile(ctx kratoshttp.Context) error {
	req := ctx.Request()
	resp := ctx.Response()
	filePath := "storage" + req.URL.Path
	http.ServeFile(resp, req, filePath)
	return nil
}
