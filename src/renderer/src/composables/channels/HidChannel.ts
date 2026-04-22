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
  sendMouseAction: (
    button: 'l' | 'r' | 'm',
    action: 'c' | 'dc' | 'd' | 'u',
    percentX: number,
    percentY: number
  ) => void
  sendKeyboardEvent: (keyCode: string, action: 'd' | 'u') => void
  sendMouseScroll: (deltaY: number) => void
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
  // --- HOST SHARE FUNCTIONS ---

  const setLocalRole = (role: 'host' | 'guest'): void => {
    localRole.value = role
  }

  const grantControl = (): void => {
    isControlGranted.value = true
    broadcastPermission()
    // Host po nadaniu uprawnień zawsze wysyła handshake z aktualnym rozmiarem ekranu
    if (localRole.value === 'host') sendHandshake()
  }

  const revokeControl = (): void => {
    isControlGranted.value = false
    broadcastPermission()
  }

  const sendHandshake = async (): Promise<void> => {
    let screenWidth = 1920
    let screenHeight = 1080
    if (localRole.value === 'host' && window.api?.input?.getHostScreenSize) {
      try {
        const size = await window.api.input.getHostScreenSize()
        if (size && size.width && size.height) {
          screenWidth = size.width
          screenHeight = size.height
        }
      } catch (e) {
        console.warn('[HID] Nie udało się pobrać rozdzielczości hosta przez IPC', e)
      }
    }
    const payload = {
      screenWidth,
      screenHeight,
      isControlGranted: isControlGranted.value
    }
    console.log('[HID] Wysyłam HID_HANDSHAKE:', payload)
    webRtcService.sendData('hid-control', JSON.stringify({ type: 'HID_HANDSHAKE', payload }))
  }

  // Host wysyła handshake automatycznie po połączeniu
  if (localRole.value === 'host') {
    setTimeout(() => {
      sendHandshake()
    }, 500)
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

  // --- GUEST SEND LOGIC ---

  const sendMouseFromVideo = (percentX: number, percentY: number): void => {
    if (localRole.value !== 'guest' || !isControlGranted.value) return

    const now = Date.now()
    if (now - lastSentAt < SEND_INTERVAL_MS) return

    const absoluteX = Math.round((percentX / 100) * remoteScreenSize.value.width)
    const absoluteY = Math.round((percentY / 100) * remoteScreenSize.value.height)

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

  // SENDING MOUSE ACTIONS WITH COORDINATES
  const sendMouseAction = (
    button: 'l' | 'r' | 'm',
    action: 'c' | 'dc' | 'd' | 'u',
    percentX: number,
    percentY: number
  ): void => {
    if (localRole.value !== 'guest' || !isControlGranted.value) return

    const absoluteX = Math.round((percentX / 100) * remoteScreenSize.value.width)
    const absoluteY = Math.round((percentY / 100) * remoteScreenSize.value.height)

    webRtcService.sendData(
      'hid-control',
      JSON.stringify({
        type: 'MOUSE_ACTION',
        payload: { button, action, x: absoluteX, y: absoluteY }
      })
    )
  }

  // SENDING KEYBOARD EVENTS
  const sendKeyboardEvent = (keyCode: string, action: 'd' | 'u'): void => {
    if (localRole.value !== 'guest' || !isControlGranted.value) return

    webRtcService.sendData(
      'hid-control',
      JSON.stringify({
        type: 'KEYBOARD_EVENT',
        payload: { keyCode, action }
      })
    )
  }

  // SENDING MOUSE SCROLL
  const sendMouseScroll = (deltaY: number): void => {
    if (localRole.value !== 'guest' || !isControlGranted.value) return
    console.log('[HidChannel] sendMouseScroll wysyła przez WebRTC:', deltaY)
    webRtcService.sendData(
      'hid-control',
      JSON.stringify({
        type: 'MOUSE_SCROLL',
        payload: { deltaY }
      })
    )
  }

  // ==========================================
  // MAIN MESSAGE ROUTER
  // ==========================================

  const handleIncomingMessage = (msg: P2PMessage): void => {
    switch (msg.type) {
      case 'HID_HANDSHAKE': {
        console.log('[HID] Otrzymano HID_HANDSHAKE:', msg.payload)
        remoteScreenSize.value = {
          width: msg.payload.screenWidth,
          height: msg.payload.screenHeight
        }
        if (localRole.value !== 'host') {
          isControlGranted.value = msg.payload.isControlGranted
        }
        break
      }

      case 'HID_PERMISSION_UPDATE':
        if (localRole.value !== 'host') {
          isControlGranted.value = msg.payload.isControlGranted
        }
        break

      case 'MOUSE_MOVE':
        if (localRole.value !== 'host' || !isControlGranted.value) return
        remoteMouse.value = { x: msg.payload.x, y: msg.payload.y }
        void window.api.input.moveAbsolute(msg.payload.x, msg.payload.y)
        break

      case 'MOUSE_ACTION':
        if (localRole.value !== 'host' || !isControlGranted.value) return
        void window.api.input.mouseAction(
          msg.payload.button,
          msg.payload.action,
          msg.payload.x,
          msg.payload.y
        )
        break

      case 'KEYBOARD_EVENT':
        if (localRole.value !== 'host' || !isControlGranted.value) return
        void window.api.input.keyboardEvent(msg.payload.keyCode, msg.payload.action)
        break

      case 'MOUSE_SCROLL':
        if (localRole.value !== 'host' || !isControlGranted.value) return
        console.log('[HidChannel] Otrzymano MOUSE_SCROLL przez WebRTC:', msg.payload.deltaY)
        void window.api.input.scrollMouse?.(msg.payload.deltaY)
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
    sendMouseAction,
    sendKeyboardEvent,
    sendMouseScroll,
    resetState,
    handleIncomingMessage
  }
}
