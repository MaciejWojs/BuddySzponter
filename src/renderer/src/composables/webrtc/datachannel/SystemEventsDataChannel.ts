import { BaseDataChannel } from './BaseDataChannel'
import {
  SystemEventsSchema,
  type SystemEventsMessage
} from '@renderer/composables/webrtc/datachannel/schemas/channelSchemas'
import { webRtcService } from '@renderer/composables/connection/webRTCService'
import { executeIncomingDisconnect } from './systemEventsConfig'

export type SystemEventsOutMessage = SystemEventsMessage
export type ControlAction = Extract<SystemEventsMessage, { type: 'CONTROL' }>['payload']['action']

const disconnectListeners = new Set<() => void>()

export function registerSystemEventsDisconnectListener(listener: () => void): () => void {
  disconnectListeners.add(listener)
  return () => {
    disconnectListeners.delete(listener)
  }
}

function handleIncomingDisconnect(): void {
  executeIncomingDisconnect()

  for (const listener of disconnectListeners) {
    listener()
  }
}

export class SystemEventsDataChannel extends BaseDataChannel<
  SystemEventsOutMessage,
  SystemEventsMessage
> {
  protected readonly label = 'system-events'
  protected readonly inSchema = SystemEventsSchema

  protected onOpen(): void {
    webRtcService.onDataChannelOpened?.()
  }

  protected handleMessage(msg: SystemEventsMessage): void {
    if (msg.type === 'DISCONNECT') {
      console.log('[SystemEvents] Otrzymano DISCONNECT (P2P)')
      handleIncomingDisconnect()
      return
    }

    if (msg.type === 'CONTROL') {
      console.log('[SystemEvents] Otrzymano CONTROL:', msg.payload.action)
    }
  }

  public sendVideoCommand(action: ControlAction): boolean {
    return this.send({ type: 'CONTROL', payload: { action } })
  }

  public sendDisconnectEvent(): boolean {
    return this.send({ type: 'DISCONNECT', payload: {} })
  }
}
