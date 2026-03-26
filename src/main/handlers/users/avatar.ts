// main/handlers/users/uploadAvatar.ts
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

export async function uploadAvatar(userId: string): Promise<UploadAvatarResponse> {
  try {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['jpg', 'png', 'webp'] }]
    })

    if (canceled || filePaths.length === 0) {
      return { success: false, message: 'cancelled' }
    }

    const filePath = filePaths[0]
    const data = await readFile(filePath)
    const ext = path.extname(filePath).toLowerCase().replace('.', '')
    const mimeType = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`

    const blob = new Blob([data], { type: mimeType })
    const form = new FormData()
    form.append('avatar', blob, path.basename(filePath))

    const fullUrl = buildRoute(API_ROUTES.USERS.AVATAR, { userId })

    const response = await withAuth(() => {
      const accessToken = authService.getAccessToken()

      if (!accessToken) {
        throw new Error('Access token not found.')
      }

      const requestHeaders: Record<string, string> = {
        Authorization: `Bearer ${accessToken}`
      }

      return execute(() => {
        const isEncryptionEnabled = import.meta.env.VITE_ENCRYPT_DATA === 'true'

        if (isEncryptionEnabled) {
          requestHeaders['X-session-id'] = secureStore.getSecure('sessionId') || ''
        }

        return fetch(fullUrl, {
          method: 'POST',
          headers: requestHeaders,
          body: form
        })
      })
    })

    const result = await response.json()

    if (!response.ok) {
      return { success: false, message: result.message || 'Upload error' }
    }

    return {
      success: true,
      message: 'Avatar uploaded successfully',
      data: result
    }
  } catch (error) {
    console.error('[uploadAvatar] Error:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown system error'
    }
  }
}
