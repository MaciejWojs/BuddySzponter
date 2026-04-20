import { webRtcService } from '@renderer/composables/connection/webRTCService'
import { P2PMessage } from '@renderer/schemas/p2pProtocol'

export type ControlAction = Extract<P2PMessage, { type: 'CONTROL' }>['payload']['action']

export interface SystemEventsChannelApi {
  handleIncomingMessage: (msg: P2PMessage) => void
  sendVideoCommand: (action: ControlAction) => void
  sendDisconnectEvent: () => void
}

export function SystemEventsChannel(onForceDisconnect: () => void): SystemEventsChannelApi {
  const handleIncomingMessage = (msg: P2PMessage): void => {
    if (msg.type === 'DISCONNECT') {
      onForceDisconnect()
      return
    }

    if (msg.type === 'CONTROL') {
      console.log('[SystemEvents] Otrzymano CONTROL:', msg.payload.action)
    }
  }

  const sendVideoCommand = (action: ControlAction): void => {
    webRtcService.sendData(
      'system-events',
      JSON.stringify({ type: 'CONTROL', payload: { action } })
    )
  }

  const sendDisconnectEvent = (): void => {
    webRtcService.sendData('system-events', JSON.stringify({ type: 'DISCONNECT', payload: {} }))
  }

  return { handleIncomingMessage, sendVideoCommand, sendDisconnectEvent }
}
