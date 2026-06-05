import { io, Socket } from 'socket.io-client'
import { secureStore } from '../../store/secureStore'
import { authService } from '../../services/AuthService'

export async function createSocket(connectionToken: string): Promise<Socket> {
  const sessionId = secureStore.getSecure('sessionId')
  const authToken = authService.getAccessToken()
  const isRemote = import.meta.env.VITE_WEBRTC_REMOTE === 'true'
  const url = isRemote ? import.meta.env.VITE_API_WS : 'http://localhost'

  if (!connectionToken) {
    throw new Error('Connection token missing.')
  }

  return io(url, {
    auth: { authToken: `Bearer ${authToken}`, connectionToken, sessionId },
    reconnection: true,
    withCredentials: true,
    transports: ['websocket']
  })
}
