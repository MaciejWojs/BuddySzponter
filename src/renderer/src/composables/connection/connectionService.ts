import { CreateConnectionRequestSchema } from '@shared/schemas/connection'
import { CreateConnectionResponse, JoinConnectionResponse } from '@shared/schemas/ipc'

export class ConnectionService {
  private connectionCode: string | null = null
  private connectionUUID: string | null = null
  private connectionToken: string | null = null
  private expiresDate: Date | null = null

  // ==========================================
  // --- GETTERS ---
  // ==========================================

  public get currentConnectionCode(): string | null {
    return this.connectionCode
  }

  public get currentConnectionUUID(): string | null {
    return this.connectionUUID
  }

  public get currentConnectionToken(): string | null {
    return this.connectionToken
  }

  public get connectionExpiresDate(): Date | null {
    return this.expiresDate
  }

  // ==========================================
  // --- ACTIONS ---
  // ==========================================

  async createConnection(data: CreateConnectionRequestSchema): Promise<CreateConnectionResponse> {
    try {
      const response = await window.api.connection.create(data)
      if (response.success) {
        this.connectionCode = response.data.code
        this.connectionUUID = response.data.uuid
        this.connectionToken = response.data.token
        this.expiresDate = new Date(response.data.expiresAt)
        console.log('[ConnectionService] Connection created successfully')
      } else {
        console.error('[ConnectionService] Failed to create connection:', response.message)
      }
      return response
    } catch (error) {
      console.error('[ConnectionService] Error during connection creation:', error)
      return { success: false, message: 'network error' }
    }
  }

  async joinConnection(code: string, password: string): Promise<JoinConnectionResponse> {
    try {
      const response = await window.api.connection.join({ connectionCode: code, password })
      if (response.success) {
        this.connectionCode = code
        this.connectionUUID = response.data.uuid
        this.connectionToken = response.data.token
        this.expiresDate = new Date(response.data.expiresAt)
        console.log('[ConnectionService] Joined connection successfully')
      } else {
        console.error('[ConnectionService] Failed to join connection:', response.message)
      }
      return response
    } catch (error) {
      console.error('[ConnectionService] Error during joining connection:', error)
      return { success: false, message: 'network error' }
    }
  }
}

export const connectionService = new ConnectionService()
