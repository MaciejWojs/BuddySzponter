import { WS_EVENT, WsAcknowledged } from '../../../../shared/schemas/ws'
import { SignalingSocket } from '../SignalingSocket'
import { WsNotifyFn } from './ConnectionHandler'

export interface HandshakeHandlerCallbacks {
  getSessionId: () => string | null
}

export class HandshakeHandler {
  constructor(
    private readonly socket: SignalingSocket,
    private readonly notify: WsNotifyFn,
    private readonly callbacks: HandshakeHandlerCallbacks
  ) {}

  registerListeners(): void {
    this.socket.on<WsAcknowledged>(WS_EVENT.ACKNOWLEDGED, (payload) => {
      this.notify('ws:handshake', 'acknowledged', payload)
    })
  }

  guestAcknowledge(): boolean {
    const sessionId = this.callbacks.getSessionId()
    if (!sessionId) return false
    return this.socket.emit(WS_EVENT.ACKNOWLEDGE, { sessionId })
  }

  hostAcknowledge(): boolean {
    const sessionId = this.callbacks.getSessionId()
    if (!sessionId) return false
    return this.socket.emit(WS_EVENT.ACKNOWLEDGED, { sessionId })
  }
}
