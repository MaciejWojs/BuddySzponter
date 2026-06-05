// main/services/ConnectionService.ts

import { ipcMain } from 'electron'
import { wsService } from './ws/WsService'
import { createConnection } from '../handlers/connection/create'
import { joinConnection } from '../handlers/connection/join'
import { CreateConnectionResponse, JoinConnectionResponse } from '../../shared/schemas/ipc'
import { JOIN_WS_AFTER_JOIN_MESSAGE } from '../../shared/constants/joinFailureMessages'

export class ConnectionService {
  private constructor() {
    console.log('[ConnectionService] Initializing service...')
  }

  private static instance: ConnectionService

  public static getInstance(): ConnectionService {
    if (!ConnectionService.instance) {
      ConnectionService.instance = new ConnectionService()
    }
    return ConnectionService.instance
  }

  public registerHandlers(): void {
    console.log('[ConnectionService] Registering handlers...')

    // --- CREATE (HOST) ---
    ipcMain.handle(
      'connection:create',
      async (_event, params): Promise<CreateConnectionResponse> => {
        const response = await createConnection(params)

        if (response.success && response.data) {
          const wsResult = await wsService.initConnection(response.data.token, 'host')

          if (!wsResult.success) {
            return { success: false, message: 'Błąd połączenia WebSocket: ' + wsResult.message }
          }
        }
        return response
      }
    )

    // --- JOIN (GUEST) ---
    ipcMain.handle('connection:join', async (_event, params): Promise<JoinConnectionResponse> => {
      const response = await joinConnection(params)

      if (response.success && response.data) {
        const wsResult = await wsService.initConnection(response.data.token, 'guest')

        if (!wsResult.success) {
          return { success: false, message: JOIN_WS_AFTER_JOIN_MESSAGE }
        }

        wsService.requestAccess(response.data.connectionUUID)
      }

      return response
    })
  }
}
export const connectionService = ConnectionService.getInstance()
