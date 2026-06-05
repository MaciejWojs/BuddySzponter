// src/renderer/src/composables/channels/HidChannel.ts
import type { Ref } from 'vue'
import { dataChannelManager } from '@renderer/composables/webrtc/datachannel/DataChannelManager'
import type { HidDataChannel } from '@renderer/composables/webrtc/datachannel/HidDataChannel'
import {
  clipboardSyncEnabled,
  isControlGranted,
  localRole,
  remoteHostCursorType,
  remoteMouse,
  remoteScreenSize,
  resetHidChannelState,
  type MousePosition,
  type ScreenSize
} from '@renderer/composables/channels/hidChannelState'

export type { MousePosition, ScreenSize }

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
  sendKeyboardKeyUpRemote: (keyCode: string) => void
  sendMouseScroll: (deltaY: number) => void
  setClipboardSyncEnabled: (enabled: boolean) => void
  sendClipboardText: (text: string) => void
  resetState: () => void
}

function getHidChannel(): HidDataChannel | null {
  return dataChannelManager.getHid()
}

export function useHidChannel(): HidChannelApi {
  const setLocalRole = (role: 'host' | 'guest'): void => {
    localRole.value = role
  }

  return {
    remoteMouse,
    isControlGranted,
    remoteScreenSize,
    remoteHostCursorType,
    localRole,
    clipboardSyncEnabled,
    setLocalRole,
    grantControl: () => getHidChannel()?.grantControl(),
    revokeControl: () => getHidChannel()?.revokeControl(),
    sendHandshake: () => {
      void getHidChannel()?.sendHandshake()
    },
    sendHostCursorSync: (cursorType: string) => getHidChannel()?.sendHostCursorSync(cursorType),
    sendMouseFromVideo: (percentX: number, percentY: number) =>
      getHidChannel()?.sendMouseFromVideo(percentX, percentY),
    sendMouseAction: (button, action, px, py) =>
      getHidChannel()?.sendMouseAction(button, action, px, py),
    sendKeyboardEvent: (keyCode, action) => getHidChannel()?.sendKeyboardEvent(keyCode, action),
    sendKeyboardKeyUpRemote: (keyCode) => getHidChannel()?.sendKeyboardKeyUpRemote(keyCode),
    sendMouseScroll: (deltaY) => getHidChannel()?.sendMouseScroll(deltaY),
    setClipboardSyncEnabled: (enabled) => getHidChannel()?.setClipboardSyncEnabled(enabled),
    sendClipboardText: (text) => getHidChannel()?.sendClipboardText(text),
    resetState: resetHidChannelState
  }
}
