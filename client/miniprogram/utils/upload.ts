import type { UploadImageResponse } from '../typings/types/api'

function getAppInstance(): IAppOption {
  return getApp<IAppOption>()
}

export interface ChooseImageOptions {
  count?: number
  sizeType?: ('original' | 'compressed')[]
  sourceType?: ('album' | 'camera')[]
}

export function chooseImage(options: ChooseImageOptions = {}): Promise<string[]> {
  return new Promise((resolve, reject) => {
    wx.chooseMedia({
      count: options.count || 1,
      mediaType: ['image'],
      sourceType: options.sourceType || ['album', 'camera'],
      sizeType: options.sizeType || ['compressed'],
      success: (res) => {
        const tempFilePaths = res.tempFiles.map(file => file.tempFilePath)
        resolve(tempFilePaths)
      },
      fail: (err) => {
        reject(new Error(err.errMsg || '选择图片失败'))
      },
    })
  })
}

export function compressImage(filePath: string, quality: number = 80): Promise<string> {
  return new Promise((resolve, reject) => {
    wx.compressImage({
      src: filePath,
      quality: quality,
      success: (res) => {
        resolve(res.tempFilePath)
      },
      fail: (err) => {
        reject(new Error(err.errMsg || '压缩图片失败'))
      },
    })
  })
}

export function uploadImage(
  filePath: string,
  fileType: string = 'general'
): Promise<UploadImageResponse> {
  return new Promise((resolve, reject) => {
    const app = getAppInstance()
    
    const uploadTask = wx.uploadFile({
      url: `${app.globalData.apiBaseURL}/upload/image`,
      filePath: filePath,
      name: 'file',
      formData: {
        type: fileType,
      },
      header: {
        'Authorization': app.globalData.token ? `Bearer ${app.globalData.token}` : '',
      },
      success: (res) => {
        if (res.statusCode === 200) {
          const data = JSON.parse(res.data) as {
            code: number
            message?: string
            data: UploadImageResponse
          }
          if (data.code === 0) {
            resolve(data.data)
          } else {
            reject(new Error(data.message || '上传失败'))
          }
        } else {
          reject(new Error(`上传失败，状态码: ${res.statusCode}`))
        }
      },
      fail: (err) => {
        reject(new Error(err.errMsg || '上传失败'))
      },
    })

    uploadTask.onProgressUpdate((res) => {
      console.log('上传进度:', res.progress)
    })
  })
}

export async function chooseAndUploadImage(
  fileType: string = 'general'
): Promise<UploadImageResponse> {
  const filePaths = await chooseImage({ count: 1 })
  const filePath = filePaths[0]
  
  const compressedPath = await compressImage(filePath, 80)
  
  return await uploadImage(compressedPath, fileType)
}
