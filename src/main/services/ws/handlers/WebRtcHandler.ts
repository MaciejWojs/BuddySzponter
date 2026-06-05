import {
  WS_EVENT,
  WsWebRTCAnswer,
  WsWebRTCIceCandidate,
  WsWebRTCOffer,
  WsWebRTCReady
} from '../../../../shared/schemas/ws'
import { SignalingSocket } from '../SignalingSocket'
import { WsNotifyFn } from './ConnectionHandler'

const WEBRTC_RELAY_EVENTS = [
  { event: WS_EVENT.WEBRTC_OFFER, notifyType: 'offer' as const },
  { event: WS_EVENT.WEBRTC_ANSWER, notifyType: 'answer' as const },
  { event: WS_EVENT.WEBRTC_ICE_CANDIDATE, notifyType: 'ice-candidate' as const },
  { event: WS_EVENT.WEBRTC_READY, notifyType: 'ready' as const }
] as const

export class WebRtcHandler {
  constructor(
    private readonly socket: SignalingSocket,
    private readonly notify: WsNotifyFn
  ) {}

  registerListeners(): void {
    for (const { event, notifyType } of WEBRTC_RELAY_EVENTS) {
      this.socket.on(event, (payload) => {
        this.notify('ws:webrtc', notifyType, payload)
      })
    }
  }

  sendOffer(data: WsWebRTCOffer): boolean {
    return this.socket.emit(WS_EVENT.WEBRTC_OFFER, data)
  }

  sendAnswer(data: WsWebRTCAnswer): boolean {
    return this.socket.emit(WS_EVENT.WEBRTC_ANSWER, data)
  }

  sendIceCandidate(data: WsWebRTCIceCandidate): boolean {
    return this.socket.emit(WS_EVENT.WEBRTC_ICE_CANDIDATE, data)
  }

  sendReady(data: WsWebRTCReady = {}): boolean {
    return this.socket.emit(WS_EVENT.WEBRTC_READY, data)
  }
}
