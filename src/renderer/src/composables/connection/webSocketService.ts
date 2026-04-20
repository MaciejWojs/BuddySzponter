// renderer/services/WebSocketService.ts

import type {
  WsAccessListeners,
  WsActionResponse,
  WsConnectResponse,
  WsHandshakeListeners,
  WsWebRtcListeners
} from '@shared/schemas/ipc'
import type { WsConnectionListeners } from '@shared/schemas/ipc'

import type {
  WsWebRTCOffer,
  WsWebRTCAnswer,
  WsWebRTCIceCandidate,
  WsWebRTCReady
} from '@shared/schemas/ws'

export class WebSocketService {
  public async connect(token: string): Promise<WsConnectResponse> {
    return await window.api.ws.connect(token)
  }

  public async disconnect(): Promise<WsActionResponse> {
    return await window.api.ws.disconnect()
  }

  public async requestAccess(sessionId: string): Promise<WsActionResponse> {
    return await window.api.ws.requestAccess(sessionId)
  }

  public async respondAccept(): Promise<WsActionResponse> {
    return await window.api.ws.respondAccept()
  }

  public async respondReject(): Promise<WsActionResponse> {
    return await window.api.ws.respondReject()
  }

  public async guestAcknowledge(): Promise<WsActionResponse> {
    return await window.api.ws.guestAcknowledge()
  }

  public async hostAcknowledge(): Promise<WsActionResponse> {
    return await window.api.ws.hostAcknowledge()
  }

  // --- WebRTC Actions ---
  public async sendOffer(data: WsWebRTCOffer): Promise<WsActionResponse> {
    return await window.api.ws.webrtcOffer(data)
  }
  public async sendAnswer(data: WsWebRTCAnswer): Promise<WsActionResponse> {
    return await window.api.ws.webrtcAnswer(data)
  }
  public async sendIceCandidate(data: WsWebRTCIceCandidate): Promise<WsActionResponse> {
    return await window.api.ws.webrtcIceCandidate(data)
  }
  public async sendReady(data: WsWebRTCReady): Promise<WsActionResponse> {
    return await window.api.ws.webrtcReady(data)
  }

  // --- LISTENERS ---

  public setupConnection(callbacks: WsConnectionListeners): void {
    window.api.ws.connection(callbacks)
  }

  public setupAccess(callbacks: WsAccessListeners): void {
    window.api.ws.access(callbacks)
  }

  public setupHandshake(callbacks: WsHandshakeListeners): void {
    window.api.ws.handshake(callbacks)
  }

  public setupWebRtc(callbacks: WsWebRtcListeners): void {
    window.api.ws.webrtc(callbacks)
  }

  public cleanup(): void {
    window.api.ws.removeAllListeners()
  }
}

export const wsService = new WebSocketService()
