import type { WsServerEvents, WsActionResponse, WsConnectResponse } from '@shared/schemas/ipc'

export class WebSocketService {
  private sessionId: string | null = null
  private socketId: string | null = null

  constructor() {
    window.api.ws.onConnected((data) => {
      this.socketId = data.socketId
    })

    window.api.ws.onRequestAccess((data) => {
      this.sessionId = data.sessionId
    })

    window.api.ws.onAccessAccepted((data) => {
      this.sessionId = data.sessionId
    })
  }

  private checkSession(): string {
    if (!this.sessionId) {
      throw new Error('Brak aktywnego sessionId! Nie można wykonać akcji.')
    }
    return this.sessionId
  }

  // ==========================================
  // --- GETTERS ---
  // ==========================================

  public get currentSessionId(): string | null {
    return this.sessionId
  }

  public get isConnected(): boolean {
    return this.socketId !== null
  }

  // ==========================================
  // --- ACTIONS ---
  // ==========================================

  async connect(token: string): Promise<WsConnectResponse> {
    try {
      const response = await window.api.ws.connect(token)
      if (response.success) {
        console.log('[WebSocketService] Connection initiated successfully')
      } else {
        console.error('[WebSocketService] Connection failed:', response.message)
      }
      return response
    } catch (error) {
      console.error('[WebSocketService] Error during connection:', error)
      return { success: false, message: 'Connection error' }
    }
  }

  async disconnect(): Promise<WsActionResponse> {
    try {
      const response = await window.api.ws.disconnect()
      if (response.success) {
        console.log('[WebSocketService] Disconnection initiated successfully')
      } else {
        console.error('[WebSocketService] Disconnection failed:', response.message)
      }
      this.socketId = null
      this.sessionId = null
      return response
    } catch (error) {
      console.error('[WebSocketService] Error during disconnection:', error)
      return { success: false, message: 'Disconnection error' }
    }
  }

  async respondAccept(): Promise<WsActionResponse> {
    return await window.api.ws.respondAccept({
      sessionId: this.checkSession()
    } as WsServerEvents['ws:access-accepted'])
  }

  async respondReject(): Promise<WsActionResponse> {
    return await window.api.ws.respondReject({
      sessionId: this.checkSession()
    } as WsServerEvents['ws:access-rejected'])
  }

  async requestAccess(sessionId: string): Promise<WsActionResponse> {
    this.sessionId = sessionId

    return await window.api.ws.requestAccess({
      sessionId: sessionId
    } as WsServerEvents['ws:request-access'])
  }

  async hostAcknowledge(): Promise<WsActionResponse> {
    return await window.api.ws.hostAcknowledge({
      sessionId: this.checkSession()
    } as WsServerEvents['ws:acknowledged'])
  }

  async guestAcknowledge(): Promise<WsActionResponse> {
    return await window.api.ws.guestAcknowledge({
      sessionId: this.checkSession()
    } as WsServerEvents['ws:acknowledged'])
  }

  // --- WebRTC ---
  async webrtcOffer(data: WsServerEvents['webrtc:offer']): Promise<WsActionResponse> {
    return await window.api.ws.webrtcOffer(data)
  }

  async webrtcAnswer(data: WsServerEvents['webrtc:answer']): Promise<WsActionResponse> {
    return await window.api.ws.webrtcAnswer(data)
  }

  async webrtcIceCandidate(
    data: WsServerEvents['webrtc:ice-candidate']
  ): Promise<WsActionResponse> {
    return await window.api.ws.webrtcIceCandidate(data)
  }

  async webrtcReady(data: WsServerEvents['webrtc:ready']): Promise<WsActionResponse> {
    return await window.api.ws.webrtcReady(data)
  }

  // ==========================================
  // --- LISTENERS---
  // ==========================================

  // system
  onConnected(callback: (data: WsServerEvents['ws:connected']) => void): void {
    window.api.ws.onConnected(callback)
  }

  onDisconnected(callback: (data: WsServerEvents['ws:disconnected']) => void): void {
    window.api.ws.onDisconnected(callback)
  }

  onConnectError(callback: (data: WsServerEvents['ws:connect_error']) => void): void {
    window.api.ws.onConnectError(callback)
  }

  onMessage(callback: (data: WsServerEvents['ws:message']) => void): void {
    window.api.ws.onMessage(callback)
  }

  onServerError(callback: (data: WsServerEvents['ws:server-error']) => void): void {
    window.api.ws.onServerError(callback)
  }

  // business
  onRequestAccess(callback: (data: WsServerEvents['ws:request-access']) => void): void {
    window.api.ws.onRequestAccess(callback)
  }

  onAccessAccepted(callback: (data: WsServerEvents['ws:access-accepted']) => void): void {
    window.api.ws.onAccessAccepted(callback)
  }

  onAccessRejected(callback: (data: WsServerEvents['ws:access-rejected']) => void): void {
    window.api.ws.onAccessRejected(callback)
  }

  onAcknowledged(callback: (data: WsServerEvents['ws:acknowledged']) => void): void {
    window.api.ws.onAcknowledged(callback)
  }

  // WebRTC
  onWebRTCOffer(callback: (data: WsServerEvents['webrtc:offer']) => void): void {
    window.api.ws.onWebRTCOffer(callback)
  }

  onWebRTCAnswer(callback: (data: WsServerEvents['webrtc:answer']) => void): void {
    window.api.ws.onWebRTCAnswer(callback)
  }

  onWebRTCIceCandidate(callback: (data: WsServerEvents['webrtc:ice-candidate']) => void): void {
    window.api.ws.onWebRTCIceCandidate(callback)
  }

  onWebRTCReady(callback: (data: WsServerEvents['webrtc:ready']) => void): void {
    window.api.ws.onWebRTCReady(callback)
  }

  // cleanup
  removeAllListeners(): void {
    window.api.ws.removeAllListeners()
  }
}

export const wsService = new WebSocketService()
