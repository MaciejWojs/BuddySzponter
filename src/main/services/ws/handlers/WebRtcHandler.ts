import {
  WS_EVENT,
  WsWebRTCAnswer,
  WsWebRTCIceCandidate,
  WsWebRTCOffer,
  WsWebRTCReady
} from '../../../../shared/schemas/ws'
import { SignalingSocket } from '../SignalingSocket'
import { WsNotifyFn } from './ConnectionHandler'

export class WebRtcHandler {
  constructor(
    private readonly socket: SignalingSocket,
    private readonly notify: WsNotifyFn
  ) {}

  registerListeners(): void {
    this.socket.on<WsWebRTCOffer>(WS_EVENT.WEBRTC_OFFER, (payload) => {
      this.notify('ws:webrtc', 'offer', payload)
    })

    this.socket.on<WsWebRTCAnswer>(WS_EVENT.WEBRTC_ANSWER, (payload) => {
      this.notify('ws:webrtc', 'answer', payload)
    })

    this.socket.on<WsWebRTCIceCandidate>(WS_EVENT.WEBRTC_ICE_CANDIDATE, (payload) => {
      this.notify('ws:webrtc', 'ice-candidate', payload)
    })

    this.socket.on<WsWebRTCReady>(WS_EVENT.WEBRTC_READY, (payload) => {
      this.notify('ws:webrtc', 'ready', payload)
    })
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
