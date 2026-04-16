// composables/channels/useHidChannel.ts
import { ref, Ref } from 'vue'
import { webRtcService } from '@renderer/composables/connection/webRTCService'
import type { P2PMessage } from '@renderer/schemas/p2pProtocol'

export interface MousePosition {
  x: number
  y: number
}

export interface ScreenSize {
  width: number
  height: number
}

export interface HidChannelApi {
  // --- state ---
  remoteMouse: Ref<MousePosition>
  isControlGranted: Ref<boolean>
  remoteScreenSize: Ref<ScreenSize>
  localRole: Ref<'host' | 'guest'>

  // --- host ---
  setLocalRole: (role: 'host' | 'guest') => void
  grantControl: () => void
  revokeControl: () => void
  sendHandshake: () => void

  // --- guest ---
  sendMouseFromVideo: (percentX: number, percentY: number) => void
  resetState: () => void

  // --- router ---
  handleIncomingMessage: (msg: P2PMessage) => void
}

const remoteMouse = ref<MousePosition>({ x: 0, y: 0 })
const isControlGranted = ref<boolean>(false)
const remoteScreenSize = ref<ScreenSize>({ width: 1920, height: 1080 })
const localRole = ref<'host' | 'guest'>('guest')

let lastSentX = -1
let lastSentY = -1
let lastSentAt = 0

const SEND_INTERVAL_MS = 16

const resetState = (): void => {
  remoteMouse.value = { x: 0, y: 0 }
  isControlGranted.value = false
  remoteScreenSize.value = { width: 1920, height: 1080 }
  lastSentX = -1
  lastSentY = -1
  lastSentAt = 0
}

export function useHidChannel(): HidChannelApi {
  // host share functions

  const setLocalRole = (role: 'host' | 'guest'): void => {
    localRole.value = role
  }

  const grantControl = (): void => {
    isControlGranted.value = true
    broadcastPermission()
  }

  const revokeControl = (): void => {
    isControlGranted.value = false
    broadcastPermission()
  }

  const sendHandshake = (): void => {
    const payload = {
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      isControlGranted: isControlGranted.value
    }
    webRtcService.sendData('hid-control', JSON.stringify({ type: 'HID_HANDSHAKE', payload }))
  }

  const broadcastPermission = (): void => {
    webRtcService.sendData(
      'hid-control',
      JSON.stringify({
        type: 'HID_PERMISSION_UPDATE',
        payload: { isControlGranted: isControlGranted.value }
      })
    )
  }

  // host - Control logic

  const sendMouseFromVideo = (percentX: number, percentY: number): void => {
    if (localRole.value !== 'guest') return
    if (!isControlGranted.value) return

    const now = Date.now()
    if (now - lastSentAt < SEND_INTERVAL_MS) return

    const absoluteX = Math.round(percentX * remoteScreenSize.value.width)
    const absoluteY = Math.round(percentY * remoteScreenSize.value.height)

    if (absoluteX === lastSentX && absoluteY === lastSentY) return

    webRtcService.sendData(
      'hid-control',
      JSON.stringify({
        type: 'MOUSE_MOVE',
        payload: { x: absoluteX, y: absoluteY }
      })
    )

    lastSentX = absoluteX
    lastSentY = absoluteY
    lastSentAt = now
  }

  // ==========================================
  // MAIN MESSAGE ROUTER
  // ==========================================

  const handleIncomingMessage = (msg: P2PMessage): void => {
    switch (msg.type) {
      case 'HID_HANDSHAKE':
        remoteScreenSize.value = {
          width: msg.payload.screenWidth,
          height: msg.payload.screenHeight
        }

        // Host is the source of truth for permissions and ignores peer attempts to override.
        if (localRole.value !== 'host') {
          isControlGranted.value = msg.payload.isControlGranted
        }
        break

      case 'HID_PERMISSION_UPDATE':
        if (localRole.value !== 'host') {
          isControlGranted.value = msg.payload.isControlGranted
        }
        break

      case 'MOUSE_MOVE':
        if (localRole.value !== 'host') return
        if (!isControlGranted.value) return

        remoteMouse.value = { x: msg.payload.x, y: msg.payload.y }

        void window.api.input.moveAbsolute(msg.payload.x, msg.payload.y)
        break
    }
  }

  return {
    remoteMouse,
    isControlGranted,
    remoteScreenSize,
    localRole,
    setLocalRole,
    grantControl,
    revokeControl,
    sendHandshake,
    sendMouseFromVideo,
    resetState,
    handleIncomingMessage
  }
}
