// handlers/socket/connection.ts

import { io, Socket } from 'socket.io-client'
import { secureStore } from '../../store/secureStore'
import { authService } from '../../services/AuthService'
import { WsService } from '../../services/ws/WsService'

export async function connect(connectionToken: string): Promise<Socket> {
  const sessionId = secureStore.getSecure('sessionId')
  const authToken = authService.getAccessToken()
  const isRemote = import.meta.env.VITE_WEBRTC_REMOTE === 'true'
  const url = isRemote ? import.meta.env.VITE_API_WS : 'http://localhost'

  if (!connectionToken) {
    throw new Error('Connection token missing.')
  }

  const activeSocket = io(url, {
    auth: { authToken: `Bearer ${authToken}`, connectionToken, sessionId },
    reconnection: true,
    withCredentials: true,
    transports: ['websocket']
  })

  return activeSocket
}

export function disconnect(socket: Socket): void {
  if (socket) {
    socket.disconnect()
  }
}

// --- LISTENERS ---

export function setupConnectionListeners(socket: Socket, service: WsService): void {
  const handleDisconnect = (reason: string): void => {
    console.log(`[WsListeners] Gniazdko padło: ${reason}`)
    service.handleDisconnected(reason)
  }

  const handleManualDisconnect = (reason: string): void => {
    console.log(`[WsListeners][manual-disconnect] Otrzymano żądanie rozłączenia: ${reason}`)
    service.handleManualDisconnected(reason)
    socket.disconnect()
  }

  socket.on('connect', () => {
    console.log('[WsListeners] Połączono z serwerem WebSocket')
    service.handleConnected(socket.id || '')
  })

  socket.on('disconnect', handleDisconnect)

  socket.on('connection:disconnect', handleManualDisconnect)

  socket.on('connect_error', (err: Error) => {
    console.error(`[WsListeners] Błąd połączenia: ${err.message}`)
    service.handleConnectError(err.message)
  })
}
