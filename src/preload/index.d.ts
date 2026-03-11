// src/preload/index.d.ts
import { ElectronAPI } from '@electron-toolkit/preload'
// Zaktualizuj ścieżkę, jeśli to konieczne:
import type { EncryptedPayload } from '../main/decrypt-payload'

// Ustandaryzowana odpowiedź z naszego formatyzatora w Main Process
export interface ApiResponse<T = any> {
  success: boolean
  status: number
  data: T
}

declare global {
  interface Window {
    electron: ElectronAPI

    api: {
      auth: {
        // Tutaj też zmieniamy na Record<string, unknown>
        register: (data: Record<string, unknown>) => Promise<ApiResponse>
        login: (credentials: Record<string, unknown>) => Promise<ApiResponse>
        logout: () => Promise<ApiResponse>
        getMe: () => Promise<ApiResponse>
      }
    }

    apiUtils: {
      decryptPayload: (p: EncryptedPayload) => Promise<Object>
    }
  }
}
