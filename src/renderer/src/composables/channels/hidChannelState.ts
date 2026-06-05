import { ref } from 'vue'

export interface MousePosition {
  x: number
  y: number
}

export interface ScreenSize {
  width: number
  height: number
}

export const remoteMouse = ref<MousePosition>({ x: 0, y: 0 })
export const isControlGranted = ref<boolean>(false)
export const remoteScreenSize = ref<ScreenSize>({ width: 1920, height: 1080 })
export const remoteHostCursorType = ref<string>('default')
export const localRole = ref<'host' | 'guest'>('guest')
export const clipboardSyncEnabled = ref<boolean>(false)

export let lastClipboardReceivedFromPeer: string | null = null

let lastSentX = -1
let lastSentY = -1
let lastSentAt = 0

export function recordMouseSendPosition(x: number, y: number, at: number): void {
  lastSentX = x
  lastSentY = y
  lastSentAt = at
}

export function shouldThrottleMouseSend(now: number): boolean {
  return now - lastSentAt < SEND_INTERVAL_MS
}

export function isDuplicateMousePosition(x: number, y: number): boolean {
  return x === lastSentX && y === lastSentY
}

export const SEND_INTERVAL_MS = 16
export const CLIPBOARD_TEXT_MAX_LENGTH = 262_144

export function resetHidChannelState(): void {
  remoteMouse.value = { x: 0, y: 0 }
  isControlGranted.value = false
  remoteScreenSize.value = { width: 1920, height: 1080 }
  remoteHostCursorType.value = 'default'
  clipboardSyncEnabled.value = false
  lastClipboardReceivedFromPeer = null
  lastSentX = -1
  lastSentY = -1
  lastSentAt = 0
}

export function setLastClipboardReceivedFromPeer(text: string | null): void {
  lastClipboardReceivedFromPeer = text
}
