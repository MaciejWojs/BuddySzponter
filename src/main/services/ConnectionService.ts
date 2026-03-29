import { ipcMain } from 'electron'

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
    ipcMain.handle('connection:create', async (_event, params) => {
      const { createConnection } = await import('../handlers/connection/create')
      return await createConnection(params)
    })
    ipcMain.handle('connection:join', async (_event, params) => {
      const { joinConnection } = await import('../handlers/connection/join')
      return await joinConnection(params)
    })
  }
}
export const connectionService = ConnectionService.getInstance()
