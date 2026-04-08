// composables/webrtc/useP2PCommander.ts

import { P2PMessage } from '@renderer/schemas/p2pProtocol'
import { webRtcService } from '../connection/webRTCService'

export const useP2PCommander = (): {
  sendChatMessage: (text: string, sender: string) => void
  sendMousePosition: (x: number, y: number) => void
  sendVideoCommand: (action: 'PAUSE_VIDEO' | 'RESUME_VIDEO' | 'LOWER_QUALITY') => void
} => {
  const sendToChannel = (channel: RTCDataChannel | null, msg: P2PMessage): void => {
    if (channel?.readyState === 'open') {
      channel.send(JSON.stringify(msg))
    }
  }

  const sendChatMessage = (text: string, sender: string): void => {
    sendToChannel(webRtcService.chatChannel, { type: 'CHAT', payload: { text, sender } })
  }

  const sendMousePosition = (x: number, y: number): void => {
    sendToChannel(webRtcService.hidControlChannel, { type: 'MOUSE_MOVE', payload: { x, y } })
  }

  const sendVideoCommand = (action: 'PAUSE_VIDEO' | 'RESUME_VIDEO' | 'LOWER_QUALITY'): void => {
    sendToChannel(webRtcService.systemEventsChannel, { type: 'CONTROL', payload: { action } })
  }

  return {
    sendChatMessage,
    sendMousePosition,
    sendVideoCommand
  }
}
