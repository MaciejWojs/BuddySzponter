// src/renderer/src/composables/channels/HidChannel.ts
import { ref, Ref } from 'vue'
import { webRtcService } from '@renderer/composables/connection/webRTCService'
import { messageRouter } from '@renderer/composables/webrtc/MessageRouter'
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
  remoteMouse: Ref<MousePosition>
  isControlGranted: Ref<boolean>
  remoteScreenSize: Ref<ScreenSize>
  remoteHostCursorType: Ref<string>
  localRole: Ref<'host' | 'guest'>
  clipboardSyncEnabled: Ref<boolean>
  setLocalRole: (role: 'host' | 'guest') => void
  grantControl: () => void
  revokeControl: () => void
  sendHandshake: () => void
  sendHostCursorSync: (cursorType: string) => void
  sendMouseFromVideo: (percentX: number, percentY: number) => void
  sendMouseAction: (
    button: 'l' | 'r' | 'm',
    action: 'c' | 'dc' | 'd' | 'u',
    px: number,
    py: number
  ) => void
  sendKeyboardEvent: (keyCode: string, action: 'd' | 'u') => void
  /** Wysyła wyłącznie keyup do hosta (np. po utracie fokusu) — nie wymaga aktywnej kontroli po stronie gościa. */
  sendKeyboardKeyUpRemote: (keyCode: string) => void
  sendMouseScroll: (deltaY: number) => void
  setClipboardSyncEnabled: (enabled: boolean) => void
  sendClipboardText: (text: string) => void
  sendClipboardFiles: (paths: string[]) => void
  resetState: () => void
}

// ==========================================
// 1. GLOBALNY STAN (Tylko jedno źródło prawdy)
// ==========================================
const remoteMouse = ref<MousePosition>({ x: 0, y: 0 })
const isControlGranted = ref<boolean>(false)
const remoteScreenSize = ref<ScreenSize>({ width: 1920, height: 1080 })
const remoteHostCursorType = ref<string>('default')
const localRole = ref<'host' | 'guest'>('guest')
const clipboardSyncEnabled = ref<boolean>(false)
let lastClipboardReceivedFromPeer: string | null = null
let lastClipboardFilesReceivedFingerprint: string | null = null

let lastSentX = -1
let lastSentY = -1
let lastSentAt = 0
const SEND_INTERVAL_MS = 16
const CLIPBOARD_TEXT_MAX_LENGTH = 262_144
const CLIPBOARD_FILES_MAX = 64
const CLIPBOARD_FILE_PATH_MAX = 4096

function clipboardFilesSyncFingerprint(paths: string[]): string {
  return JSON.stringify([...paths].sort())
}

function normalizeClipboardPathsForSend(paths: unknown[]): string[] | null {
  const out: string[] = []
  for (const item of paths) {
    if (typeof item !== 'string' || item.length === 0) continue
    if (item.length > CLIPBOARD_FILE_PATH_MAX) continue
    out.push(item)
    if (out.length >= CLIPBOARD_FILES_MAX) break
  }
  return out.length > 0 ? out : null
}

// ==========================================
// 2. JEDNORAZOWY NASŁUCH (Event Bus)
// ==========================================
messageRouter.subscribe('hid-control', (msg: P2PMessage) => {
  switch (msg.type) {
    case 'HID_HANDSHAKE':
      remoteScreenSize.value = { width: msg.payload.screenWidth, height: msg.payload.screenHeight }
      if (localRole.value !== 'host') {
        isControlGranted.value = msg.payload.isControlGranted
        if (msg.payload.cursorType) {
          remoteHostCursorType.value = msg.payload.cursorType
        }
        if (typeof msg.payload.clipboardSyncEnabled === 'boolean') {
          clipboardSyncEnabled.value =
            msg.payload.clipboardSyncEnabled && msg.payload.isControlGranted
        }

        if (window.api?.app?.resizeToVideoRatio) {
          window.api.app
            .resizeToVideoRatio(msg.payload.screenWidth, msg.payload.screenHeight)
            .catch(() => {})
        }
      }
      break

    case 'HID_PERMISSION_UPDATE':
      if (localRole.value !== 'host') {
        isControlGranted.value = msg.payload.isControlGranted
        if (!msg.payload.isControlGranted) {
          clipboardSyncEnabled.value = false
        }
      }
      break

    case 'HID_CURSOR_SYNC':
      if (localRole.value !== 'host') {
        remoteHostCursorType.value = msg.payload.cursorType || 'default'
      }
      break

    case 'CLIPBOARD_SYNC':
      clipboardSyncEnabled.value = msg.payload.enabled && isControlGranted.value
      break

    case 'CLIPBOARD_TEXT': {
      if (!isControlGranted.value || !clipboardSyncEnabled.value) break
      const text = msg.payload.text
      if (typeof text !== 'string' || text.length > CLIPBOARD_TEXT_MAX_LENGTH) break
      lastClipboardReceivedFromPeer = text
      window.api?.clipboard?.setSyncText?.(text).catch(() => {
        // ignorujemy błędy ustawiania schowka
      })
      break
    }

    case 'CLIPBOARD_FILES': {
      if (!isControlGranted.value || !clipboardSyncEnabled.value) break
      const paths = msg.payload.paths
      if (!Array.isArray(paths) || paths.length === 0) break
      const normalized = normalizeClipboardPathsForSend(paths as unknown[])
      if (!normalized) break
      lastClipboardFilesReceivedFingerprint = clipboardFilesSyncFingerprint(normalized)
      window.api?.clipboard?.setSyncFiles?.(normalized).catch(() => {
        // ignorujemy błędy ustawiania schowka
      })
      break
    }

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

    case 'KEYBOARD_EVENT': {
      if (localRole.value !== 'host') return
      const raw = msg.payload.action as string
      const act: 'd' | 'u' = raw === 'up' || raw === 'u' ? 'u' : 'd'
      if (act === 'd' && !isControlGranted.value) return
      void window.api.input.keyboardEvent(msg.payload.keyCode, act)
      break
    }

    case 'MOUSE_SCROLL':
      if (localRole.value !== 'host' || !isControlGranted.value) return
      void window.api.input.scrollMouse?.(msg.payload.deltaY)
      break
  }
})

// ==========================================
// 3. EXPORT METOD
// ==========================================
export function useHidChannel(): HidChannelApi {
  const resetState = (): void => {
    remoteMouse.value = { x: 0, y: 0 }
    isControlGranted.value = false
    remoteScreenSize.value = { width: 1920, height: 1080 }
    remoteHostCursorType.value = 'default'
    clipboardSyncEnabled.value = false
    lastClipboardReceivedFromPeer = null
    lastClipboardFilesReceivedFingerprint = null
    lastSentX = -1
    lastSentY = -1
    lastSentAt = 0
  }

  const setLocalRole = (role: 'host' | 'guest'): void => {
    localRole.value = role
  }

  const sendHandshake = async (): Promise<void> => {
    let screenWidth = 1920
    let screenHeight = 1080
    let cursorType = 'default'

    if (localRole.value === 'host' && window.api?.input?.getHostScreenSize) {
      try {
        const size = await window.api.input.getHostScreenSize()
        if (size?.width && size?.height) {
          screenWidth = size.width
          screenHeight = size.height
        }
      } catch (e) {
        console.warn('[HID] Błąd pobierania rozmiaru ekranu:', e)
      }
    }

    if (localRole.value === 'host' && window.api?.input?.getCursorType) {
      try {
        cursorType = (await window.api.input.getCursorType()) || 'default'
      } catch (e) {
        console.warn('[HID] Błąd pobierania kursora hosta:', e)
      }
    }

    const payload = {
      screenWidth,
      screenHeight,
      isControlGranted: isControlGranted.value,
      cursorType,
      clipboardSyncEnabled: clipboardSyncEnabled.value
    }

    console.log('[HID] Wysyłam Handshake:', payload)
    webRtcService.sendData('hid-control', JSON.stringify({ type: 'HID_HANDSHAKE', payload }))
  }

  const sendHostCursorSync = (cursorType: string): void => {
    if (localRole.value !== 'host') return
    webRtcService.sendData(
      'hid-control',
      JSON.stringify({
        type: 'HID_CURSOR_SYNC',
        payload: { cursorType: cursorType || 'default' }
      })
    )
  }

  const grantControl = (): void => {
    isControlGranted.value = true
    if (localRole.value === 'host') sendHandshake()
  }

  const revokeControl = (): void => {
    isControlGranted.value = false
    clipboardSyncEnabled.value = false
    if (localRole.value === 'host') {
      webRtcService.sendData(
        'hid-control',
        JSON.stringify({
          type: 'HID_PERMISSION_UPDATE',
          payload: { isControlGranted: false }
        })
      )
      void window.api?.input?.releaseStuckKeyboardKeys?.().catch(() => {})
    }
  }

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

  const sendMouseAction = (
    button: 'l' | 'r' | 'm',
    action: 'c' | 'dc' | 'd' | 'u',
    px: number,
    py: number
  ): void => {
    if (localRole.value !== 'guest' || !isControlGranted.value) return
    const absoluteX = Math.round((px / 100) * remoteScreenSize.value.width)
    const absoluteY = Math.round((py / 100) * remoteScreenSize.value.height)

    webRtcService.sendData(
      'hid-control',
      JSON.stringify({
        type: 'MOUSE_ACTION',
        payload: { button, action, x: absoluteX, y: absoluteY }
      })
    )
  }

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

  const sendKeyboardKeyUpRemote = (keyCode: string): void => {
    if (localRole.value !== 'guest') return
    webRtcService.sendData(
      'hid-control',
      JSON.stringify({
        type: 'KEYBOARD_EVENT',
        payload: { keyCode, action: 'u' }
      })
    )
  }

  const sendMouseScroll = (deltaY: number): void => {
    if (localRole.value !== 'guest' || !isControlGranted.value) return
    webRtcService.sendData(
      'hid-control',
      JSON.stringify({
        type: 'MOUSE_SCROLL',
        payload: { deltaY }
      })
    )
  }

  const setClipboardSyncEnabled = (enabled: boolean): void => {
    const next = enabled && isControlGranted.value
    if (clipboardSyncEnabled.value === next) return
    clipboardSyncEnabled.value = next
    webRtcService.sendData(
      'hid-control',
      JSON.stringify({
        type: 'CLIPBOARD_SYNC',
        payload: { enabled: next }
      })
    )
  }

  const sendClipboardText = (text: string): void => {
    if (!isControlGranted.value || !clipboardSyncEnabled.value) return
    if (typeof text !== 'string' || text.length === 0) return
    if (text.length > CLIPBOARD_TEXT_MAX_LENGTH) return
    if (text === lastClipboardReceivedFromPeer) return
    webRtcService.sendData(
      'hid-control',
      JSON.stringify({
        type: 'CLIPBOARD_TEXT',
        payload: { text }
      })
    )
  }

  const sendClipboardFiles = (paths: string[]): void => {
    if (!isControlGranted.value || !clipboardSyncEnabled.value) return
    const normalized = normalizeClipboardPathsForSend(paths)
    if (!normalized) return
    const fp = clipboardFilesSyncFingerprint(normalized)
    if (fp === lastClipboardFilesReceivedFingerprint) return
    webRtcService.sendData(
      'hid-control',
      JSON.stringify({
        type: 'CLIPBOARD_FILES',
        payload: { paths: normalized }
      })
    )
  }

  return {
    remoteMouse,
    isControlGranted,
    remoteScreenSize,
    remoteHostCursorType,
    localRole,
    clipboardSyncEnabled,
    setLocalRole,
    grantControl,
    revokeControl,
    sendHandshake,
    sendHostCursorSync,
    sendMouseFromVideo,
    sendMouseAction,
    sendKeyboardEvent,
    sendKeyboardKeyUpRemote,
    sendMouseScroll,
    setClipboardSyncEnabled,
    sendClipboardText,
    sendClipboardFiles,
    resetState
  }
}
