// src/api/user.ts
import http from '@/api/http'

/**
 * 上传头像文件，后端返回形如：
 * { avatarUrl: "http://localhost:9898/avatars/xxx.jpg" }
 */
export async function uploadAvatarFile(file: File): Promise<{ avatarUrl: string }> {
  const formData = new FormData()
  formData.append('file', file)

  const res = await http.post('/user/profile/avatar-file', formData)
  // 调试用，OK 之后可以删掉
  console.log('uploadAvatarFile resp:', res.data)
  return res.data as { avatarUrl: string }
}

export async function changePassword(oldPassword: string, newPassword: string) {
  await http.post('/auth/change-password', {
    oldPassword,
    newPassword
  })
}


