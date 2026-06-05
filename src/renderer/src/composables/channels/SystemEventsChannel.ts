import { dataChannelManager } from '@renderer/composables/webrtc/datachannel/DataChannelManager'
import {
  registerSystemEventsDisconnectListener,
  type ControlAction,
  type SystemEventsDataChannel
} from '@renderer/composables/webrtc/datachannel/SystemEventsDataChannel'

export type { ControlAction }

export interface SystemEventsChannelApi {
  sendVideoCommand: (action: ControlAction) => void
  sendDisconnectEvent: () => void
}

export function SystemEventsChannel(onForceDisconnect: () => void): SystemEventsChannelApi {
  registerSystemEventsDisconnectListener(onForceDisconnect)

  const getChannel = (): SystemEventsDataChannel | null => dataChannelManager.getSystemEvents()

  const sendVideoCommand = (action: ControlAction): void => {
    getChannel()?.sendVideoCommand(action)
  }

  const sendDisconnectEvent = (): void => {
    getChannel()?.sendDisconnectEvent()
  }

  return { sendVideoCommand, sendDisconnectEvent }
}
