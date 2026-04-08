// composables/webrtc/useP2PCommander.ts

import { P2PMessage } from '@renderer/schemas/p2pProtocol'
import { webRtcService } from '../connection/webRTCService'

export const useP2PCommander = (): {
  sendChatMessage: (text: string, sender: string) => void
  sendMousePosition: (x: number, y: number) => void
  sendVideoCommand: (action: 'PAUSE_VIDEO' | 'RESUME_VIDEO' | 'LOWER_QUALITY') => void
} => {
  // Główna funkcja pakująca
  const send = (msg: P2PMessage): void => {
    if (webRtcService.systemChannel?.readyState === 'open') {
      webRtcService.systemChannel.send(JSON.stringify(msg))
    }
  }

  const sendChatMessage = (text: string, sender: string): void => {
    send({ type: 'CHAT', payload: { text, sender } })
  }

  const sendMousePosition = (x: number, y: number): void => {
    send({ type: 'MOUSE_MOVE', payload: { x, y } })
  }

  const sendVideoCommand = (action: 'PAUSE_VIDEO' | 'RESUME_VIDEO' | 'LOWER_QUALITY'): void => {
    send({ type: 'CONTROL', payload: { action } })
  }

  return {
    sendChatMessage,
    sendMousePosition,
    sendVideoCommand
  }
}
