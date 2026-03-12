import { ipcMain } from 'electron'
import { decryptPayload } from '../../decrypt-payload' // Your original file

import type { EncryptedPayload } from '../../decrypt-payload'

export function registerDecryptHandler(): void {
  ipcMain.handle('decrypt-payload', async (_, payload: unknown) => {
    try {
      if (
        !payload ||
        typeof payload !== 'object' ||
        !('payload' in payload) ||
        typeof (payload as { payload?: unknown }).payload !== 'object' ||
        typeof (payload as { payload: { iv?: unknown } }).payload.iv !== 'string' ||
        typeof (payload as { payload: { tag?: unknown } }).payload.tag !== 'string' ||
        typeof (payload as { payload: { data?: unknown } }).payload.data !== 'string'
      ) {
        throw new Error('Invalid payload format')
      }
      return decryptPayload(payload as EncryptedPayload)
    } catch (error) {
      console.error('Failed to decrypt payload:', error)
      throw new Error('Failed to decrypt payload')
    }
  })
}
