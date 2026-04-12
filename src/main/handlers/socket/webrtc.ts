// main/handlers/socket/webrtc.ts

import { Socket } from 'socket.io-client'
import {
  WsWebRTCOffer,
  WsWebRTCAnswer,
  WsWebRTCIceCandidate,
  WsWebRTCReady
} from '../../../shared/schemas/ws'
import { WsService } from '../../services/ws/WsService'

export function sendWebRTCOffer(socket: Socket, data: WsWebRTCOffer): void {
  socket.emit('webrtc:offer', data)
}

export function sendWebRTCAnswer(socket: Socket, data: WsWebRTCAnswer): void {
  socket.emit('webrtc:answer', data)
}

export function sendWebRTCIceCandidate(socket: Socket, data: WsWebRTCIceCandidate): void {
  socket.emit('webrtc:ice-candidate', data)
}

export function sendWebRTCReady(socket: Socket, data: WsWebRTCReady): void {
  socket.emit('webrtc:ready', data)
}

// --- LISTENERS ---

export function setupWebRtcListeners(socket: Socket, service: WsService): void {
  socket.on('webrtc:offer', (data: unknown) => {
    const payload = data as WsWebRTCOffer
    service.handleWebRTCOffer(payload)
  })

  socket.on('webrtc:answer', (data: unknown) => {
    const payload = data as WsWebRTCAnswer
    service.handleWebRTCAnswer(payload)
  })

  socket.on('webrtc:ice-candidate', (data: unknown) => {
    const payload = data as WsWebRTCIceCandidate
    service.handleWebRTCIceCandidate(payload)
  })

  socket.on('webrtc:ready', (data: unknown) => {
    const payload = data as WsWebRTCReady
    service.handleWebRTCReady(payload)
  })
}
