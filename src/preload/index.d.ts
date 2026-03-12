// src/preload/index.d.ts
import { ElectronAPI } from '@electron-toolkit/preload'
// Update the path if necessary:
import type { EncryptedPayload } from '../main/decrypt-payload'

// Standardized response from our formatter in Main Process
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
        // Here we also change to Record<string, unknown>
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
