import { ref, Ref } from 'vue'
import { webRtcService } from '@renderer/composables/connection/webRTCService'
import { P2PMessage } from '@renderer/schemas/p2pProtocol'

type MouseMovePayload = Extract<P2PMessage, { type: 'MOUSE_MOVE' }>['payload']

export interface MousePosition {
  x: number
  y: number
}

export interface HidChannelApi {
  remoteMouse: Ref<MousePosition>
  handleIncomingMessage: (payload: MouseMovePayload) => void
  sendMousePosition: (x: number, y: number) => void
}

export function HidChannel(): HidChannelApi {
  const remoteMouse = ref<MousePosition>({ x: 0, y: 0 })

  const handleIncomingMessage = (payload: MouseMovePayload): void => {
    remoteMouse.value = { x: payload.x, y: payload.y }
  }

  const sendMousePosition = (x: number, y: number): void => {
    webRtcService.sendData('hid-control', JSON.stringify({ type: 'MOUSE_MOVE', payload: { x, y } }))
  }

  return { remoteMouse, handleIncomingMessage, sendMousePosition }
}
