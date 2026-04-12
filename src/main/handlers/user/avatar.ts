import { dialog } from 'electron'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { UploadAvatarResponse } from '../../../shared/schemas/ipc'
import { API_ROUTES } from '../../apiRoutes'
import { execute } from '../../utils/execute'
import { withAuth } from '../../utils/api/withAuth'
import { buildRoute } from '../../utils/api/path'
import { authService } from '../../services/AuthService'
import { secureStore } from '../../store/secureStore'
import { decryptData } from '../../utils/api/crypt'

function normalizePngFileName(fileName: string, mimeType: string): string {
  if (mimeType.toLowerCase() !== 'image/png') return fileName

  const parsed = path.parse(fileName)
  return `${parsed.name}.png`
}

async function executeUpload(form: FormData): Promise<UploadAvatarResponse> {
  const fullUrl = buildRoute(API_ROUTES.USERS.AVATAR.ME)

  const response = await withAuth(() => {
    const accessToken = authService.getAccessToken()
    if (!accessToken) throw new Error('Access token not found.')

    const requestHeaders: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`
    }

    return execute(() => {
      if (import.meta.env.VITE_ENCRYPT_DATA === 'true') {
        requestHeaders['X-session-id'] = secureStore.getSecure('sessionId') || ''
      }
      return fetch(fullUrl, { method: 'POST', headers: requestHeaders, body: form })
    })
  })

  const result = await response.json()
  console.log('Upload avatar response:', result)
  if (!response.ok) return { success: false, message: result.message || 'Upload error' }

  const decryptedResponse =
    import.meta.env.VITE_ENCRYPT_DATA === 'true' ? await decryptData(result) : result

  return { success: true, data: decryptedResponse }
}

export async function uploadAvatar(): Promise<UploadAvatarResponse> {
  try {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['jpg', 'png', 'webp'] }]
    })

    if (canceled || filePaths.length === 0) return { success: false, message: 'cancelled' }

    const filePath = filePaths[0]
    const data = await readFile(filePath)
    const ext = path.extname(filePath).toLowerCase().replace('.', '')
    const mimeType = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`
    const normalizedFileName = normalizePngFileName(path.basename(filePath), mimeType)

    const blob = new Blob([data], { type: mimeType })
    const form = new FormData()
    form.append('avatar', blob, normalizedFileName)

    return await executeUpload(form)
  } catch (error) {
    console.error('[uploadAvatar] Error:', error)
    return { success: false, message: error instanceof Error ? error.message : 'System error' }
  }
}

export async function uploadAvatarByBuffer(
  buffer: ArrayBuffer,
  fileName: string,
  mimeType: string
): Promise<UploadAvatarResponse> {
  try {
    const normalizedFileName = normalizePngFileName(fileName, mimeType)
    const blob = new Blob([Buffer.from(buffer)], { type: mimeType })
    const form = new FormData()
    form.append('avatar', blob, normalizedFileName)

    return await executeUpload(form)
  } catch (error) {
    console.error('[uploadAvatarByBuffer] Error:', error)
    return { success: false, message: error instanceof Error ? error.message : 'System error' }
  }
}
