import { WsCategory } from '../../../../shared/schemas/ipc'
import {
  WS_EVENT,
  WsConnectionDisconnected,
  WsTerminateConnection
} from '../../../../shared/schemas/ws'
import { SignalingSocket } from '../SignalingSocket'

export type WsNotifyFn = <T>(category: WsCategory, type: string, data: T) => void

export interface ConnectionHandlerCallbacks {
  onManualDisconnect: (reason: string) => void
  onSocketDisconnect: (reason: string) => void
}

export class ConnectionHandler {
  private suppressNextDisconnected = false

  constructor(
    private readonly socket: SignalingSocket,
    private readonly notify: WsNotifyFn,
    private readonly callbacks: ConnectionHandlerCallbacks
  ) {}

  registerListeners(): void {
    this.socket.onConnect(() => {
      console.log('[ConnectionHandler] Connected to signaling server')
      this.notify('ws:connection', 'connected', { socketId: this.socket.id })
    })

    this.socket.onDisconnect((reason) => {
      console.log(`[ConnectionHandler] Socket disconnected: ${reason}`)
      if (this.suppressNextDisconnected) {
        this.suppressNextDisconnected = false
        return
      }
      this.callbacks.onSocketDisconnect(reason)
      this.notify('ws:connection', 'disconnected', { reason })
    })

    this.socket.onConnectError((message) => {
      console.error(`[ConnectionHandler] Connect error: ${message}`)
      this.notify('ws:connection', 'connect_error', { message })
    })

    this.socket.on<string | WsConnectionDisconnected>(WS_EVENT.DISCONNECT, (payload) => {
      const reason = typeof payload === 'string' ? payload : (payload.reason ?? 'remote disconnect')
      console.log(`[ConnectionHandler] Remote manual disconnect: ${reason}`)
      this.suppressNextDisconnected = true
      this.callbacks.onManualDisconnect(reason)
      this.notify('ws:connection', 'manual-disconnected', { reason })
      this.socket.disconnect()
    })

    this.socket.on<WsConnectionDisconnected>(WS_EVENT.DISCONNECTED, (payload) => {
      console.log('[ConnectionHandler] Peer disconnected:', payload)
      this.notify('ws:connection', 'peer-disconnected', payload)
    })

    this.socket.on<WsTerminateConnection>(WS_EVENT.TERMINATE, (payload) => {
      console.log('[ConnectionHandler] Connection terminated:', payload)
      this.notify('ws:connection', 'terminated', payload)
    })
  }

  emitDisconnect(): void {
    this.suppressNextDisconnected = true
    this.notify('ws:connection', 'manual-disconnected', { reason: 'manual disconnect' })
    this.socket.emit(WS_EVENT.DISCONNECT, {})
    this.socket.disconnect()
  }

  emitTerminate(reason?: string): boolean {
    return this.socket.emit(WS_EVENT.TERMINATE, reason ? { reason } : {})
  }
}
