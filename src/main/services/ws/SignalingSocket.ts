import { Socket } from 'socket.io-client'
import {
  canRoleEmit,
  canRoleListen,
  EMIT_EVENT_SCHEMAS,
  LISTEN_EVENT_SCHEMAS,
  WsEventName,
  WsRole
} from '../../../shared/schemas/ws'

const LOG_PREFIX = '[SignalingSocket]'

export class SignalingSocket {
  constructor(
    private readonly socket: Socket,
    public readonly role: WsRole
  ) {}

  get raw(): Socket {
    return this.socket
  }

  get id(): string {
    return this.socket.id ?? ''
  }

  get connected(): boolean {
    return this.socket.connected
  }

  emit(event: WsEventName, payload?: unknown): boolean {
    if (!canRoleEmit(this.role, event)) {
      console.warn(`${LOG_PREFIX} [${this.role}] blocked emit: ${event}`)
      return false
    }

    const schema = EMIT_EVENT_SCHEMAS[event]
    const parsed = schema.safeParse(payload ?? {})
    if (!parsed.success) {
      console.warn(`${LOG_PREFIX} [${this.role}] invalid emit payload for ${event}:`, parsed.error)
      return false
    }

    this.socket.emit(event, parsed.data)
    return true
  }

  on<T>(event: WsEventName, handler: (payload: T) => void): void {
    if (!canRoleListen(this.role, event)) {
      console.warn(`${LOG_PREFIX} [${this.role}] blocked listen: ${event}`)
      return
    }

    const schema = LISTEN_EVENT_SCHEMAS[event]
    this.socket.on(event, (data: unknown) => {
      const parsed = schema.safeParse(data)
      if (!parsed.success) {
        console.warn(`${LOG_PREFIX} [${this.role}] dropped invalid inbound ${event}:`, parsed.error)
        return
      }
      handler(parsed.data as T)
    })
  }

  onConnect(handler: () => void): void {
    this.socket.on('connect', handler)
  }

  onDisconnect(handler: (reason: string) => void): void {
    this.socket.on('disconnect', handler)
  }

  onConnectError(handler: (message: string) => void): void {
    this.socket.on('connect_error', (err: Error) => {
      handler(err.message)
    })
  }

  disconnect(): void {
    this.socket.disconnect()
  }
}
