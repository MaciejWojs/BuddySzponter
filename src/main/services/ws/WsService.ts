// main/services/ws/WsService.ts

import { Socket } from 'socket.io-client'
import { ipcMain } from 'electron'
import {
  WsActionResponse,
  WsConnectResponse,
  WsServerEvents,
  WsCategory
} from '../../../shared/schemas/ipc'
import {
  WsRequestAccess,
  WsConnectionAccepted,
  WsConnectionRejected,
  WsConnectionError,
  WsAcknowledged,
  WsWebRTCOffer,
  WsWebRTCAnswer,
  WsWebRTCIceCandidate,
  WsWebRTCReady
} from '../../../shared/schemas/ws'

import { setupConnectionListeners, connect } from '../../handlers/socket/connection'
import {
  sendGuestAcknowledge,
  sendHostAcknowledge,
  setupHandshakeListeners
} from '../../handlers/socket/handshake'
import {
  sendRequestAccess,
  sendRespondAccept,
  sendRespondReject,
  setupAccessListeners
} from '../../handlers/socket/access'
import {
  sendWebRTCAnswer,
  sendWebRTCIceCandidate,
  sendWebRTCOffer,
  sendWebRTCReady,
  setupWebRtcListeners
} from '../../handlers/socket/webrtc'
import { notifyFrontend } from '../../utils/notify'
import { showAccessRequestNotification } from '../../utils/systemNotification'

export class WsService {
  private static instance: WsService

  public socket: Socket | null = null
  public currentSessionId: string | null = null
  private suppressNextDisconnected = false

  private constructor() {
    console.log('[WsService] Serwis zainicjalizowany.')
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

  // --- HANDLERS INITIALIZATION ---

  public registerWsHandlers(): void {
    ipcMain.handle('ws:connect', async (_, { connectionToken }) => {
      return await this.initConnection(connectionToken)
    })

    ipcMain.handle('ws:disconnect', async () => {
      this.closeConnection()
      return { success: true }
    })

    // --- ACCESS ---
    ipcMain.handle('ws:respond-accept', async () => {
      return this.respondAccept()
    })

    ipcMain.handle('ws:respond-reject', async () => {
      return this.respondReject()
    })

    ipcMain.handle('ws:request-access', async (_, { sessionId }) => {
      return this.requestAccess(sessionId)
    })

    // --- HANDSHAKE ---
    ipcMain.handle('ws:acknowledge', async () => {
      return this.guestAcknowledge()
    })

    ipcMain.handle('ws:acknowledged', async () => {
      return this.hostAcknowledge()
    })

    // --- WEBRTC ---
    ipcMain.handle('ws:webrtc-offer', async (_, data) => {
      return this.webrtcOffer(data)
    })

    ipcMain.handle('ws:webrtc-answer', async (_, data) => {
      return this.webrtcAnswer(data)
    })

    ipcMain.handle('ws:webrtc-ice-candidate', async (_, data) => {
      return this.webrtcIceCandidate(data)
    })

    ipcMain.handle('ws:webrtc-ready', async (_, data) => {
      return this.webrtcReady(data)
    })
  }

  // --- INITIALIZATION ---

  public async initConnection(token: string): Promise<WsConnectResponse> {
    try {
      if (this.socket) {
        this.closeConnection()
      }

      this.socket = await connect(token)

      setupConnectionListeners(this.socket, this)
      setupAccessListeners(this.socket, this)
      setupHandshakeListeners(this.socket, this)
      setupWebRtcListeners(this.socket, this)

      return { success: true }
    } catch (error: unknown) {
      console.error('[WsService] Błąd podczas łączenia:', error)
      return { success: false, message: (error as Error).message || 'Błąd połączenia' }
    }
  }

  public closeConnection(): void {
    if (this.socket) {
      console.log('[WsService][manual-disconnect] Start closeConnection()')
      this.suppressNextDisconnected = true
      this.notify('ws:connection', 'manual-disconnected', { reason: 'manual disconnect' })
      console.log(
        '[WsService][manual-disconnect] Sent IPC event: ws:connection/manual-disconnected'
      )
      this.socket.emit('connection:disconnect')
      console.log('[WsService][manual-disconnect] Emitted socket event: connection:disconnect')
      this.socket.disconnect()
      console.log('[WsService][manual-disconnect] Local socket.disconnect() called')

      this.socket = null
      this.currentSessionId = null
      console.log('[WsService] Połączenie zamknięte i stan wyczyszczony.')
    }
  }

  // --- ACTIONS ---

  public requestAccess(sessionId: string): WsActionResponse {
    if (!this.socket) return { success: false, message: 'Brak gniazdka' }
    this.currentSessionId = sessionId
    sendRequestAccess(this.socket, sessionId)
    return { success: true }
  }

  public respondAccept(): WsActionResponse {
    if (!this.socket || !this.currentSessionId) return { success: false }
    sendRespondAccept(this.socket, this.currentSessionId)
    return { success: true }
  }

  public respondReject(): WsActionResponse {
    if (!this.socket || !this.currentSessionId) return { success: false }
    sendRespondReject(this.socket, this.currentSessionId)
    this.currentSessionId = null
    return { success: true }
  }

  public guestAcknowledge(): WsActionResponse {
    if (!this.socket || !this.currentSessionId) return { success: false }
    sendGuestAcknowledge(this.socket, this.currentSessionId)
    return { success: true }
  }

  public hostAcknowledge(): WsActionResponse {
    if (!this.socket || !this.currentSessionId) return { success: false }
    sendHostAcknowledge(this.socket, this.currentSessionId)
    return { success: true }
  }

  public webrtcOffer(data: WsWebRTCOffer): WsActionResponse {
    if (!this.socket) return { success: false }
    sendWebRTCOffer(this.socket, data)
    return { success: true }
  }

  public webrtcAnswer(data: WsWebRTCAnswer): WsActionResponse {
    if (!this.socket) return { success: false }
    sendWebRTCAnswer(this.socket, data)
    return { success: true }
  }

  public webrtcIceCandidate(data: WsWebRTCIceCandidate): WsActionResponse {
    if (!this.socket) return { success: false }
    sendWebRTCIceCandidate(this.socket, data)
    return { success: true }
  }

  public webrtcReady(data: WsWebRTCReady): WsActionResponse {
    if (!this.socket) return { success: false }
    sendWebRTCReady(this.socket, data)
    return { success: true }
  }

  // --- HANDLERS ---

  public handleConnected(socketId: string): void {
    this.notify('ws:connection', 'connected', { socketId })
  }

  public handleConnectError(message: string): void {
    this.notify('ws:connection', 'connect_error', { message })
  }

  public handleManualDisconnected(reason: string): void {
    this.suppressNextDisconnected = true
    this.notify('ws:connection', 'manual-disconnected', { reason })
    this.socket = null
    this.currentSessionId = null
    console.log(`[WsService][manual-disconnect] Remote manual disconnect handled: ${reason}`)
  }

  public handleDisconnected(reason: string): void {
    if (this.suppressNextDisconnected) {
      this.suppressNextDisconnected = false
      return
    }

    this.socket = null
    this.currentSessionId = null
    this.notify('ws:connection', 'disconnected', { reason })
  }

  public handleRequestAccess(payload: WsRequestAccess): void {
    this.currentSessionId = payload.sessionId
    console.log('[WsService] Otrzymano żądanie dostępu dla sesji:', payload.sessionId)

    this.notify('ws:access', 'request-access', payload)

    showAccessRequestNotification({
      onAccept: () => {
        console.log('[WsService] Zaakceptowano z poziomu powiadomienia OS')
        this.respondAccept()
        this.hostAcknowledge()
      },
      onReject: () => {
        console.log('[WsService] Odrzucono z poziomu powiadomienia OS')
        const sessionId = this.currentSessionId
        this.respondReject()

        if (sessionId) {
          this.handleAccessRejected({ sessionId })
        }
      }
    })
  }

  public handleAccessAccepted(payload: WsConnectionAccepted): void {
    this.currentSessionId = payload.sessionId
    this.notify('ws:access', 'accepted', payload)
    this.guestAcknowledge()
  }

  public handleAccessRejected(payload: WsConnectionRejected): void {
    this.currentSessionId = null
    this.notify('ws:access', 'rejected', payload)
  }

  public handleServerError(payload: WsConnectionError): void {
    this.notify('ws:access', 'server-error', payload)
  }

  public handleAcknowledged(payload: WsAcknowledged): void {
    this.notify('ws:handshake', 'acknowledged', payload)
  }

  public handleWebRTCOffer(payload: WsWebRTCOffer): void {
    this.notify('ws:webrtc', 'offer', payload)
  }

  public handleWebRTCAnswer(payload: WsWebRTCAnswer): void {
    this.notify('ws:webrtc', 'answer', payload)
  }

  public handleWebRTCIceCandidate(payload: WsWebRTCIceCandidate): void {
    this.notify('ws:webrtc', 'ice-candidate', payload)
  }

  public handleWebRTCReady(payload: WsWebRTCReady): void {
    this.notify('ws:webrtc', 'ready', payload)
  }
}

export const wsService = WsService.getInstance()
