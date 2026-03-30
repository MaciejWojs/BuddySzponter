import { io, Socket } from 'socket.io-client'
import { ipcMain, BrowserWindow } from 'electron'
import { decryptData, encryptData } from '../../utils/api/crypt'
import { EncryptedPayload } from '../../schemas/encryptedPayload.schema'
import { secureStore } from '../../store/secureStore'
import { authService } from '../AuthService'
import { WsActionResponse, WsConnectResponse, WsServerEvents } from '../../../shared/schemas/ipc'

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
      this.notifyFrontend('ws:connected', { socketId: this.socket?.id || '' })
    })

    this.socket.on('disconnect', (reason: string) => {
      this.notifyFrontend('ws:disconnected', { reason })
    })

    this.socket.on('connect_error', (err: Error) => {
      this.notifyFrontend('ws:connect_error', { message: err.message })
    })

    // --- BIZNESOWE ---
    this.socket.on('connection:request-access', async (data: unknown) => {
      const payload = await this.decryptIfNeeded<WsServerEvents['ws:request-access']>(data)
      this.notifyFrontend('ws:request-access', payload)
    })

    this.socket.on('connection:accepted', async (data: unknown) => {
      const payload = await this.decryptIfNeeded<WsServerEvents['ws:access-accepted']>(data)
      this.notifyFrontend('ws:access-accepted', payload)
    })

    this.socket.on('connection:rejected', async (data: unknown) => {
      const payload = await this.decryptIfNeeded<WsServerEvents['ws:access-rejected']>(data)
      this.notifyFrontend('ws:access-rejected', payload)
    })

    this.socket.on('connection:error', async (data: unknown) => {
      const payload = await this.decryptIfNeeded<WsServerEvents['ws:server-error']>(data)
      this.notifyFrontend('ws:server-error', payload)
    })

    this.socket.on('connection:acknowledged', async (data: unknown) => {
      const payload = await this.decryptIfNeeded<WsServerEvents['ws:acknowledged']>(data)
      this.notifyFrontend('ws:acknowledged', payload)
    })

    // --- WebRTC ---
    this.socket.on('webrtc:offer', async (data: unknown) => {
      const payload = await this.decryptIfNeeded<WsServerEvents['ws:message']>(data)
      this.notifyFrontend('ws:message', payload)
    })

    this.socket.on('webrtc:answer', async (data: unknown) => {
      const payload = await this.decryptIfNeeded<WsServerEvents['ws:message']>(data)
      this.notifyFrontend('ws:message', payload)
    })

    this.socket.on('webrtc:ice-candidate', async (data: unknown) => {
      const payload = await this.decryptIfNeeded<WsServerEvents['ws:message']>(data)
      this.notifyFrontend('ws:message', payload)
    })

    this.socket.on('webrtc:ready', async (data: unknown) => {
      const payload = await this.decryptIfNeeded<WsServerEvents['ws:message']>(data)
      this.notifyFrontend('ws:message', payload)
    })
  }

  private notifyFrontend<K extends keyof WsServerEvents>(
    channel: K,
    payload: WsServerEvents[K]
  ): void {
    const windows = BrowserWindow.getAllWindows()
    windows.forEach((win) => {
      if (!win.isDestroyed()) {
        win.webContents.send(channel, payload)
      }
    })
  }

  private async decryptIfNeeded<T>(data: unknown): Promise<T> {
    return this.isEncryptionEnabled
      ? ((await decryptData(data as EncryptedPayload)) as T)
      : (data as T)
  }

  public registerHandlers(): void {
    console.log('[WsService] Registering IPC handlers...')

    ipcMain.handle('ws:connect', async (_, { connectionToken }): Promise<WsConnectResponse> => {
      this.connect(connectionToken)
      return { success: true }
    })

    ipcMain.handle('ws:respond-accept', async (_, payload): Promise<WsActionResponse> => {
      if (!this.socket) return { success: false, message: 'No socket connection' }
      const payloadToSend = this.isEncryptionEnabled
        ? await encryptData(payload.data)
        : payload.data
      this.socket.emit('connection:accept', payloadToSend)
      return { success: true }
    })

    ipcMain.handle('ws:respond-reject', async (_, payload): Promise<WsActionResponse> => {
      if (!this.socket) return { success: false, message: 'No socket connection' }
      const payloadToSend = this.isEncryptionEnabled
        ? await encryptData(payload.data)
        : payload.data
      this.socket.emit('connection:reject', payloadToSend)
      return { success: true }
    })

    ipcMain.handle('ws:acknowledge', async (_, payload): Promise<WsActionResponse> => {
      if (!this.socket) return { success: false, message: 'No socket connection' }
      const payloadToSend = this.isEncryptionEnabled ? await encryptData(payload) : payload
      this.socket.emit('connection:acknowledge', payloadToSend)
      return { success: true }
    })

    ipcMain.handle('ws:acknowledged', async (_, payload): Promise<WsActionResponse> => {
      if (!this.socket) return { success: false, message: 'No socket connection' }
      const payloadToSend = this.isEncryptionEnabled ? await encryptData(payload) : payload
      this.socket.emit('connection:acknowledged', payloadToSend)
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

    // -- WebRTC --

    ipcMain.handle('ws:webrtc-offer', async (_event, data) => {
      if (!this.socket) return { success: false, message: 'No socket connection' }
      const payloadToSend = this.isEncryptionEnabled ? await encryptData(data) : data
      this.socket.emit('webrtc:offer', payloadToSend)
      return { success: true }
    })

    ipcMain.handle('ws:webrtc-answer', async (_event, data) => {
      if (!this.socket) return { success: false, message: 'No socket connection' }
      const payloadToSend = this.isEncryptionEnabled ? await encryptData(data) : data
      this.socket.emit('webrtc:answer', payloadToSend)
      return { success: true }
    })

    ipcMain.handle('ws:webrtc-ice-candidate', async (_event, data) => {
      if (!this.socket) return { success: false, message: 'No socket connection' }
      const payloadToSend = this.isEncryptionEnabled ? await encryptData(data) : data
      this.socket.emit('webrtc:ice-candidate', payloadToSend)
      return { success: true }
    })

    ipcMain.handle('ws:webrtc-ready', async (_event, data) => {
      if (!this.socket) return { success: false, message: 'No socket connection' }
      const payloadToSend = this.isEncryptionEnabled ? await encryptData(data) : data
      this.socket.emit('webrtc:ready', payloadToSend)
      return { success: true }
    })
  }
}

export const wsService = WsService.getInstance()
