import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: unknown
    apiUtils: {
      decryptPayload: (p: EncryptedPayload) => Promise<Object>
    }
  }
}
