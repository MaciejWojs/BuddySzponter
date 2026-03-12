import { ipcMain } from 'electron'
import { decryptPayload } from '../../decrypt-payload'
import { encryptedPayloadSchema, EncryptedPayload } from '../../schemas/encryptedPayloadSchema'

export function registerDecryptHandler(): void {
  ipcMain.handle('decrypt-payload', async (_, payload: unknown) => {
    try {
      const parsed = encryptedPayloadSchema.safeParse(payload)
      if (!parsed.success) {
        throw new Error('Invalid payload format')
      }
      return decryptPayload(parsed.data as EncryptedPayload)
    } catch (error) {
      console.error('Failed to decrypt payload:', error)
      throw new Error('Failed to decrypt payload')
    }
  })
}
