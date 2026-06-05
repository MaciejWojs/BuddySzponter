// main/handlers/socket/handshake.ts

import { Socket } from 'socket.io-client'
import { WsAcknowledged } from '../../../shared/schemas/ws'
import { WsService } from '../../services/ws/WsService'

export function sendGuestAcknowledge(socket: Socket, sessionId: string): void {
  socket.emit('connection:acknowledge', { sessionId })
}

export function sendHostAcknowledge(socket: Socket, sessionId: string): void {
  socket.emit('connection:acknowledged', { sessionId })
}

// --- LISTENERS ---

export function setupHandshakeListeners(socket: Socket, service: WsService): void {
  socket.on('connection:acknowledged', (data: unknown) => {
    const payload = data as WsAcknowledged

    service.handleAcknowledged(payload)
  })
}
