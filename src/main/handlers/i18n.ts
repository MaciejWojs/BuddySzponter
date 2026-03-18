import { ipcMain } from 'electron'
import { AppLanguage } from '../schemas/langSchemas'
import { API_ROUTES } from '../apiRoutes'
import { execute } from '../utils/execute'
import { secureStore } from '../utils/secureStore'
import { decryptPayload } from '../utils/decrypt-payload'

export async function loadTranslations(): Promise<void> {
  ipcMain.handle('i18n:load', async (_event, rawData) => {
    try {
      const lang = rawData as AppLanguage

      const response = await execute(async () => {
        const key = secureStore.getSecure('aesKey')
        const id = secureStore.getSecure('sessionId')
        if (!key || !id) {
          throw new Error('No session found. Please complete the handshake first.')
        }

        const baseURL = import.meta.env.VITE_API_BASE_URL
        const url = `${baseURL}${API_ROUTES.I18N}?lang=${lang}`

        return await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-session-id': id
          }
        })
      })
      if (!response.ok) {
        console.error('Failed to load translations:', response.status)
        return {
          success: false,
          error: `Server returned error: ${response.status}`,
          status: response.status
        }
      }
      const encryptedJson = await response.json()

      const currentKey = secureStore.getSecure('aesKey')
      const decryptedData = await decryptPayload(encryptedJson, currentKey!)

      return {
        success: true,
        data: decryptedData
      }
    } catch (error) {
      console.error('Error loading translations:', error)
      return {
        success: false,
        error: 'Failed to load translations'
      }
    }
  })
}
