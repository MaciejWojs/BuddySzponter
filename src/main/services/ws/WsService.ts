import { io, Socket } from 'socket.io-client'
import { ipcMain, BrowserWindow } from 'electron'
import { decryptData, encryptData } from '../../utils/api/crypt'
import { EncryptedPayload } from '../../schemas/encryptedPayload.schema'
import { secureStore } from '../../store/secureStore'
import { authService } from '../AuthService'

export class WsService {
  private static instance: WsService
  private socket: Socket | null = null

  private isEncryptionEnabled: boolean = import.meta.env.VITE_ENCRYPT_DATA === 'true'

  private constructor() {
    console.log('[WsService] Initializing service...')
  }

  public static getInstance(): WsService {
    if (!WsService.instance) {
      WsService.instance = new WsService()
    }
    return WsService.instance
  }

  /**
   * Inicjalizacja połączenia WebSocket
   */
  public connect(connectionToken: string): void {
    if (this.socket?.connected) {
      console.warn('[WsService] Socket is already connected. Disconnecting old instance...')
      this.disconnect()
    }

    const sessionId = secureStore.getSecure('sessionId')
    const authToken = authService.getAccessToken()

    this.socket = io('http://localhost', {
      auth: {
        authToken: `Bearer ${authToken}`,
        connectionToken: connectionToken,
        sessionId: sessionId
      },
      reconnection: true,
      withCredentials: true,
      transports: ['websocket']
    })

    this.setupSocketListeners()
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }

  private setupSocketListeners(): void {
    if (!this.socket) return

    this.socket.on('connect', () => {
      console.log('[WsService] Connected with ID:', this.socket?.id)
      this.notifyFrontend('ws:connected', { socketId: this.socket?.id })
    })

    this.socket.on('disconnect', (reason) => {
      console.warn('[WsService] Disconnected. Reason:', reason)
      this.notifyFrontend('ws:disconnected', { reason })
    })

    this.socket.on('connect_error', (err) => {
      console.error('[WsService] Connection error:', err.message)
      this.notifyFrontend('ws:connect_error', { message: err.message })
    })

    this.socket.on('message', async (message: unknown) => {
      if (this.isEncryptionEnabled) {
        try {
          const decrypted = await decryptData(message as EncryptedPayload)
          this.notifyFrontend<object>('ws:message', decrypted)
        } catch (err) {
          console.error('[WsService] Failed to decrypt standard message:', err)
        }
      } else {
        this.notifyFrontend<unknown>('ws:message', message)
      }
    })

    this.socket.on('connection:request-access', async (data: unknown) => {
      console.log('[WsService] Received connection:request-access')
      const payload = this.isEncryptionEnabled ? await decryptData(data as EncryptedPayload) : data

      this.notifyFrontend<unknown>('ws:request-access', payload)
    })

    this.socket.on('connection:accepted', async (data: unknown) => {
      const payload = this.isEncryptionEnabled ? await decryptData(data as EncryptedPayload) : data

      this.notifyFrontend<unknown>('ws:access-accepted', payload)
    })

    this.socket.on('connection:rejected', async (data: unknown) => {
      const payload = this.isEncryptionEnabled ? await decryptData(data as EncryptedPayload) : data

      this.notifyFrontend<unknown>('ws:access-rejected', payload)
    })

    this.socket.on('connection:error', async (data: unknown) => {
      const payload = this.isEncryptionEnabled ? await decryptData(data as EncryptedPayload) : data

      console.error('[WsService] Connection error from server:', payload)
      this.notifyFrontend<unknown>('ws:server-error', payload)
    })
  }

  private notifyFrontend<T>(channel: string, payload: T): void {
    const windows = BrowserWindow.getAllWindows()
    windows.forEach((win) => {
      win.webContents.send(channel, payload)
    })
  }

  public registerHandlers(): void {
    console.log('[WsService] Registering IPC handlers...')

    ipcMain.handle('ws:connect', async (_event, { connectionToken }) => {
      this.connect(connectionToken)
      return { success: true }
    })

    ipcMain.handle('ws:respond-accept', async (_event, payload) => {
      if (!this.socket) return { success: false, message: 'No socket connection' }

      const actualData = payload.data || payload

      const payloadToSend = this.isEncryptionEnabled ? await encryptData(actualData) : actualData

      this.socket.emit('connection:accept', payloadToSend)
      return { success: true }
    })

    ipcMain.handle('ws:respond-reject', async (_event, payload) => {
      if (!this.socket) return { success: false, message: 'No socket connection' }

      const actualData = payload.data || payload

      console.log('[WsService] Wysyłanie odrzucenia:', actualData)
      const payloadToSend = this.isEncryptionEnabled
        ? await encryptData(actualData || {})
        : actualData || {}

      this.socket.emit('connection:reject', payloadToSend)
      return { success: true }
    })

    ipcMain.handle('ws:request-access', async (_event, data) => {
      if (!this.socket) return { success: false, message: 'No socket connection' }

      console.log('[WsService] Wysyłanie prośby o dostęp (Guest -> Host)', data)
      const payloadToSend = this.isEncryptionEnabled ? await encryptData(data || {}) : data || {}

      this.socket.emit('connection:request-access', payloadToSend)
      return { success: true }
    })

    ipcMain.handle('ws:disconnect', async () => {
      this.disconnect()
      return { success: true }
    })
  }
}

export const wsService = WsService.getInstance()
