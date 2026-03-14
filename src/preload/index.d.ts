import { ElectronAPI } from '@electron-toolkit/preload'

// Type contract for renderer -> main window control methods.
interface WindowAPI {
  minimize: () => void
  maximize: () => void
  close: () => void
  setAlwaysOnTop: (flag: boolean) => void
}

// Root API exposed on window.api.
interface CustomAPI {
  window: WindowAPI
}

declare global {
  interface Window {
    electron: ElectronAPI
//    api: CustomAPI
    api: unknown
    apiUtils: {
      decryptPayload: (p: EncryptedPayload) => Promise<Object>
    }
  }
}
