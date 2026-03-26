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

// --- NOWOŚĆ: Wspólna logika wysyłki ---
async function executeUpload(userId: string, form: FormData): Promise<UploadAvatarResponse> {
  const fullUrl = buildRoute(API_ROUTES.USERS.AVATAR, { userId })

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
  if (!response.ok) return { success: false, message: result.message || 'Upload error' }

  return { success: true, message: 'Avatar uploaded successfully', data: result }
}

// 1. Stara metoda (wybór pliku przez okno)
export async function uploadAvatar(userId: string): Promise<UploadAvatarResponse> {
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

    const blob = new Blob([data], { type: mimeType })
    const form = new FormData()
    form.append('avatar', blob, path.basename(filePath))

    return await executeUpload(userId, form)
  } catch (error) {
    console.error('[uploadAvatar] Error:', error)
    return { success: false, message: error instanceof Error ? error.message : 'System error' }
  }
}

// 2. NOWA METODA (Drag & Drop przez surowe bajty)
export async function uploadAvatarByBuffer(
  userId: string,
  buffer: ArrayBuffer,
  fileName: string,
  mimeType: string
): Promise<UploadAvatarResponse> {
  try {
    console.log(`[uploadAvatarByBuffer] Otrzymano plik z frontendu: ${fileName}`)

    // Zmieniamy ArrayBuffer na Bloba i ładujemy do formularza
    const blob = new Blob([buffer], { type: mimeType })
    const form = new FormData()
    form.append('avatar', blob, fileName)

    return await executeUpload(userId, form)
  } catch (error) {
    console.error('[uploadAvatarByBuffer] Error:', error)
    return { success: false, message: error instanceof Error ? error.message : 'System error' }
  }
}
