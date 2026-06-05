import { ipcMain } from 'electron'
import { WsCategory, WsConnectResponse, WsServerEvents } from '../../../shared/schemas/ipc'
import {
  WsRole,
  WsWebRTCAnswer,
  WsWebRTCIceCandidate,
  WsWebRTCOffer,
  WsWebRTCReady
} from '../../../shared/schemas/ws'
import { notifyFrontend } from '../../utils/notify'
import { AccessHandler } from './handlers/AccessHandler'
import { ConnectionHandler } from './handlers/ConnectionHandler'
import { HandshakeHandler } from './handlers/HandshakeHandler'
import { WebRtcHandler } from './handlers/WebRtcHandler'
import { createSocket } from './SocketFactory'
import { SignalingSocket } from './SignalingSocket'

export class WsService {
  private static instance: WsService

  private signalingSocket: SignalingSocket | null = null
  private connectionHandler: ConnectionHandler | null = null
  private accessHandler: AccessHandler | null = null
  private handshakeHandler: HandshakeHandler | null = null
  private webRtcHandler: WebRtcHandler | null = null

  public currentSessionId: string | null = null
  public role: WsRole | null = null

  private constructor() {
    console.log('[WsService] Initialized.')
  }

  public static getInstance(): WsService {
    if (!WsService.instance) {
      WsService.instance = new WsService()
    }
    return WsService.instance
  }

  private notify<T>(category: WsCategory, type: string, data: T): void {
    notifyFrontend(
      category as keyof WsServerEvents,
      { type, data } as WsServerEvents[keyof WsServerEvents]
    )
  }

  public registerWsHandlers(): void {
    ipcMain.handle('ws:connect', async (_, { connectionToken }) => {
      if (!this.role) {
        return {
          success: false,
          message: 'No role set. Use connection:create or connection:join first.'
        }
      }
      return await this.initConnection(connectionToken, this.role)
    })

    ipcMain.handle('ws:disconnect', async () => {
      this.closeConnection()
      return { success: true }
    })

    ipcMain.handle('ws:respond-accept', async () => ({ success: this.respondAccept() }))
    ipcMain.handle('ws:respond-reject', async () => ({ success: this.respondReject() }))
    ipcMain.handle('ws:request-access', async (_, { sessionId }) => ({
      success: this.requestAccess(sessionId)
    }))
    ipcMain.handle('ws:acknowledge', async () => ({ success: this.guestAcknowledge() }))
    ipcMain.handle('ws:acknowledged', async () => ({ success: this.hostAcknowledge() }))
    ipcMain.handle('ws:terminate', async (_, { reason } = {}) => ({
      success: this.terminate(reason)
    }))

    ipcMain.handle('ws:webrtc-offer', async (_, data: WsWebRTCOffer) => ({
      success: this.webrtcOffer(data)
    }))
    ipcMain.handle('ws:webrtc-answer', async (_, data: WsWebRTCAnswer) => ({
      success: this.webrtcAnswer(data)
    }))
    ipcMain.handle('ws:webrtc-ice-candidate', async (_, data: WsWebRTCIceCandidate) => ({
      success: this.webrtcIceCandidate(data)
    }))
    ipcMain.handle('ws:webrtc-ready', async (_, data: WsWebRTCReady) => ({
      success: this.webrtcReady(data)
    }))
  }

  public async initConnection(token: string, role: WsRole): Promise<WsConnectResponse> {
    try {
      if (this.signalingSocket) {
        this.closeConnection()
      }

      this.role = role
      const rawSocket = await createSocket(token)
      this.signalingSocket = new SignalingSocket(rawSocket, role)

      const sessionCallbacks = {
        getSessionId: () => this.currentSessionId,
        setSessionId: (id: string | null) => {
          this.currentSessionId = id
        }
      }

      this.connectionHandler = new ConnectionHandler(this.signalingSocket, this.notify.bind(this), {
        onManualDisconnect: () => this.clearState(),
        onSocketDisconnect: () => this.clearState()
      })

      this.accessHandler = new AccessHandler(this.signalingSocket, this.notify.bind(this), {
        ...sessionCallbacks,
        onGuestAcknowledge: () => this.guestAcknowledge(),
        onHostAcknowledge: () => this.hostAcknowledge()
      })

      this.handshakeHandler = new HandshakeHandler(
        this.signalingSocket,
        this.notify.bind(this),
        sessionCallbacks
      )

      this.webRtcHandler = new WebRtcHandler(this.signalingSocket, this.notify.bind(this))

      this.connectionHandler.registerListeners()
      this.accessHandler.registerListeners()
      this.handshakeHandler.registerListeners()
      this.webRtcHandler.registerListeners()

      return { success: true }
    } catch (error: unknown) {
      console.error('[WsService] Connection error:', error)
      return { success: false, message: (error as Error).message || 'Connection failed' }
    }
  }

  public closeConnection(): void {
    if (this.connectionHandler) {
      this.connectionHandler.emitDisconnect()
    }
    this.clearState()
    console.log('[WsService] Connection closed and state cleared.')
  }

  private clearState(): void {
    this.signalingSocket = null
    this.connectionHandler = null
    this.accessHandler = null
    this.handshakeHandler = null
    this.webRtcHandler = null
    this.currentSessionId = null
  }

  public requestAccess(sessionId: string): boolean {
    if (!this.accessHandler) return false
    return this.accessHandler.requestAccess(sessionId)
  }

  public respondAccept(): boolean {
    if (!this.accessHandler) return false
    return this.accessHandler.respondAccept()
  }

  public respondReject(): boolean {
    if (!this.accessHandler) return false
    return this.accessHandler.respondReject()
  }

  public guestAcknowledge(): boolean {
    if (!this.handshakeHandler) return false
    return this.handshakeHandler.guestAcknowledge()
  }

  public hostAcknowledge(): boolean {
    if (!this.handshakeHandler) return false
    return this.handshakeHandler.hostAcknowledge()
  }

  public terminate(reason?: string): boolean {
    if (!this.connectionHandler) return false
    return this.connectionHandler.emitTerminate(reason)
  }

  public webrtcOffer(data: WsWebRTCOffer): boolean {
    if (!this.webRtcHandler) return false
    return this.webRtcHandler.sendOffer(data)
  }

  public webrtcAnswer(data: WsWebRTCAnswer): boolean {
    if (!this.webRtcHandler) return false
    return this.webRtcHandler.sendAnswer(data)
  }

  public webrtcIceCandidate(data: WsWebRTCIceCandidate): boolean {
    if (!this.webRtcHandler) return false
    return this.webRtcHandler.sendIceCandidate(data)
  }

  public webrtcReady(data: WsWebRTCReady = {}): boolean {
    if (!this.webRtcHandler) return false
    return this.webRtcHandler.sendReady(data)
  }
}

export const wsService = WsService.getInstance()
