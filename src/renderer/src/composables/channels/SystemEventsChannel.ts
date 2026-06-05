import { webRtcService } from '@renderer/composables/connection/webRTCService'
import { P2PMessage } from '@renderer/schemas/p2pProtocol'
import { messageRouter } from '@renderer/composables/webrtc/MessageRouter'

export type ControlAction = Extract<P2PMessage, { type: 'CONTROL' }>['payload']['action']

export interface SystemEventsChannelApi {
  sendVideoCommand: (action: ControlAction) => void
  sendDisconnectEvent: () => void
}

export function SystemEventsChannel(onForceDisconnect: () => void): SystemEventsChannelApi {
  // --- AUTONOMICZNY NASŁUCH ---
  messageRouter.subscribe('system-events', (msg: P2PMessage) => {
    if (msg.type === 'DISCONNECT') {
      onForceDisconnect()
    } else if (msg.type === 'CONTROL') {
      console.log('[SystemEvents] Otrzymano CONTROL:', msg.payload.action)
    }
  })

  const sendVideoCommand = (action: ControlAction): void => {
    webRtcService.sendData(
      'system-events',
      JSON.stringify({ type: 'CONTROL', payload: { action } })
    )
  }

  const sendDisconnectEvent = (): void => {
    webRtcService.sendData('system-events', JSON.stringify({ type: 'DISCONNECT', payload: {} }))
  }

  // Nie zwracamy już handleIncomingMessage!
  return { sendVideoCommand, sendDisconnectEvent }
}
