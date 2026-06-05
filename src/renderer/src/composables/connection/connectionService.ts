// renderer/src/composables/connection/connectionService.ts

import { CreateConnectionRequestSchema } from '@shared/schemas/connection'
import { CreateConnectionResponse, JoinConnectionResponse } from '@shared/schemas/ipc'
import { JOIN_RENDERER_NETWORK_MESSAGE } from '@shared/constants/joinFailureMessages'

export class ConnectionService {
  private expiresDate: Date | null = null

  public get connectionExpiresDate(): Date | null {
    return this.expiresDate
  }

  // ==========================================
  // --- ACTIONS ---
  // ==========================================

  async createConnection(data: CreateConnectionRequestSchema): Promise<CreateConnectionResponse> {
    try {
      const response = await window.api.connection.create(data)

      if (response.success && response.data) {
        this.expiresDate = new Date(response.data.expiresAt)
        console.log('[ConnectionService] Connection created successfully')
      } else {
        console.error('[ConnectionService] Failed to create connection:', response.message)
      }
      return response
    } catch (error) {
      console.error('[ConnectionService] Error during connection creation:', error)
      return { success: false, message: JOIN_RENDERER_NETWORK_MESSAGE }
    }
  }

  async joinConnection(code: string, password: string): Promise<JoinConnectionResponse> {
    try {
      const response = await window.api.connection.join({ connectionCode: code, password })

      if (response.success && response.data) {
        this.expiresDate = null

        console.log('[ConnectionService] Joined connection successfully')
      } else {
        console.warn('[ConnectionService] Failed to join connection:', response.message)
      }
      return response
    } catch (error) {
      console.error('[ConnectionService] Error during joining connection:', error)
      return { success: false, message: JOIN_RENDERER_NETWORK_MESSAGE }
    }
  }
}

export const connectionService = new ConnectionService()
