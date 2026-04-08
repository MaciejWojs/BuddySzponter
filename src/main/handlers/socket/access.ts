// main/handlers/socket/access.ts

import { Socket } from 'socket.io-client'
import {
  WsRequestAccess,
  WsConnectionAccepted,
  WsConnectionRejected,
  WsConnectionError
} from '../../../shared/schemas/ws'
import { WsService } from '../../services/ws/WsService'

export function sendRequestAccess(socket: Socket, sessionId: string): void {
  socket.emit('connection:request-access', { sessionId })
}

export function sendRespondAccept(socket: Socket, sessionId: string): void {
  socket.emit('connection:accept', { sessionId })
}

export function sendRespondReject(socket: Socket, sessionId: string): void {
  socket.emit('connection:reject', { sessionId })
}

// --- LISTENERS ---

export function setupAccessListeners(socket: Socket, service: WsService): void {
  socket.on('connection:request-access', (data: unknown) => {
    const payload = data as WsRequestAccess
    service.handleRequestAccess(payload)
  })

  socket.on('connection:accepted', (data: unknown) => {
    const payload = data as WsConnectionAccepted
    service.handleAccessAccepted(payload)
  })

  socket.on('connection:rejected', (data: unknown) => {
    const payload = data as WsConnectionRejected
    service.handleAccessRejected(payload)
  })

  socket.on('connection:error', (data: unknown) => {
    const payload = data as WsConnectionError
    service.handleServerError(payload)
  })
}
