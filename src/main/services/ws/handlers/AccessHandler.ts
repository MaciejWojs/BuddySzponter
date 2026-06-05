import {
  WS_EVENT,
  WsConnectionAccepted,
  WsConnectionError,
  WsConnectionRejected,
  WsRequestAccess
} from '../../../../shared/schemas/ws'
import { showAccessRequestNotification } from '../../../utils/systemNotification'
import { SignalingSocket } from '../SignalingSocket'
import { WsNotifyFn } from './ConnectionHandler'

export interface AccessHandlerCallbacks {
  getSessionId: () => string | null
  setSessionId: (id: string | null) => void
  onGuestAcknowledge: () => void
  onHostAcknowledge: () => void
}

export class AccessHandler {
  constructor(
    private readonly socket: SignalingSocket,
    private readonly notify: WsNotifyFn,
    private readonly callbacks: AccessHandlerCallbacks
  ) {}

  registerListeners(): void {
    if (this.socket.role === 'host') {
      this.socket.on<WsRequestAccess>(WS_EVENT.REQUEST_ACCESS, (payload) => {
        this.handleRequestAccess(payload)
      })
    }

    if (this.socket.role === 'guest') {
      this.socket.on<WsConnectionAccepted>(WS_EVENT.ACCEPTED, (payload) => {
        this.handleAccessAccepted(payload)
      })

      this.socket.on<WsConnectionRejected>(WS_EVENT.REJECTED, (payload) => {
        this.handleAccessRejected(payload)
      })
    }

    this.socket.on<WsConnectionError>(WS_EVENT.ERROR, (payload) => {
      this.notify('ws:access', 'server-error', payload)
    })
  }

  requestAccess(sessionId: string): boolean {
    this.callbacks.setSessionId(sessionId)
    return this.socket.emit(WS_EVENT.REQUEST_ACCESS, { sessionId })
  }

  respondAccept(): boolean {
    const sessionId = this.callbacks.getSessionId()
    if (!sessionId) return false
    return this.socket.emit(WS_EVENT.ACCEPT, { sessionId })
  }

  respondReject(): boolean {
    const sessionId = this.callbacks.getSessionId()
    if (!sessionId) return false
    const ok = this.socket.emit(WS_EVENT.REJECT, { sessionId })
    if (ok) this.callbacks.setSessionId(null)
    return ok
  }

  private handleRequestAccess(payload: WsRequestAccess): void {
    this.callbacks.setSessionId(payload.sessionId)
    console.log('[AccessHandler] Access request for session:', payload.sessionId)
    this.notify('ws:access', 'request-access', payload)

    showAccessRequestNotification({
      onAccept: () => {
        console.log('[AccessHandler] Accepted via OS notification')
        this.respondAccept()
        this.callbacks.onHostAcknowledge()
      },
      onReject: () => {
        console.log('[AccessHandler] Rejected via OS notification')
        const sessionId = this.callbacks.getSessionId()
        this.respondReject()
        if (sessionId) {
          this.handleAccessRejected({ sessionId })
        }
      }
    })
  }

  private handleAccessAccepted(payload: WsConnectionAccepted): void {
    this.callbacks.setSessionId(payload.sessionId)
    this.notify('ws:access', 'accepted', payload)
    this.callbacks.onGuestAcknowledge()
  }

  private handleAccessRejected(payload: WsConnectionRejected): void {
    this.callbacks.setSessionId(null)
    this.notify('ws:access', 'rejected', payload)
  }
}
