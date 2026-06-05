import { BaseDataChannel } from './BaseDataChannel'
import {
  HidControlSchema,
  type HidControlMessage
} from '@renderer/composables/webrtc/datachannel/schemas/channelSchemas'
import {
  CLIPBOARD_TEXT_MAX_LENGTH,
  clipboardSyncEnabled,
  isControlGranted,
  lastClipboardReceivedFromPeer,
  localRole,
  recordMouseSendPosition,
  remoteHostCursorType,
  remoteMouse,
  remoteScreenSize,
  isDuplicateMousePosition,
  shouldThrottleMouseSend,
  setLastClipboardReceivedFromPeer
} from '@renderer/composables/channels/hidChannelState'

export type HidControlOutMessage = HidControlMessage

export class HidDataChannel extends BaseDataChannel<HidControlOutMessage, HidControlMessage> {
  protected readonly label = 'hid-control'
  protected readonly inSchema = HidControlSchema

  protected handleMessage(msg: HidControlMessage): void {
    switch (msg.type) {
      case 'HID_HANDSHAKE':
        remoteScreenSize.value = {
          width: msg.payload.screenWidth,
          height: msg.payload.screenHeight
        }
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
        setLastClipboardReceivedFromPeer(text)
        window.api?.clipboard?.setSyncText?.(text).catch(() => {})
        break
      }

      case 'CLIPBOARD_FILES':
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

      case 'KEYBOARD_EVENT': {
        if (localRole.value !== 'host') return
        const raw = msg.payload.action
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
  }

  public async sendHandshake(): Promise<void> {
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
      } catch (error) {
        console.warn('[HID] Błąd pobierania rozmiaru ekranu:', error)
      }
    }

    if (localRole.value === 'host' && window.api?.input?.getCursorType) {
      try {
        cursorType = (await window.api.input.getCursorType()) || 'default'
      } catch (error) {
        console.warn('[HID] Błąd pobierania kursora hosta:', error)
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
    this.send({ type: 'HID_HANDSHAKE', payload })
  }

  public sendHostCursorSync(cursorType: string): void {
    if (localRole.value !== 'host') return
    this.send({
      type: 'HID_CURSOR_SYNC',
      payload: { cursorType: cursorType || 'default' }
    })
  }

  public grantControl(): void {
    isControlGranted.value = true
    if (localRole.value === 'host') {
      void this.sendHandshake()
    }
  }

  public revokeControl(): void {
    isControlGranted.value = false
    clipboardSyncEnabled.value = false
    if (localRole.value === 'host') {
      this.send({
        type: 'HID_PERMISSION_UPDATE',
        payload: { isControlGranted: false }
      })
      void window.api?.input?.releaseStuckKeyboardKeys?.().catch(() => {})
    }
  }

  public sendMouseFromVideo(percentX: number, percentY: number): void {
    if (localRole.value !== 'guest' || !isControlGranted.value) return
    const now = Date.now()
    if (shouldThrottleMouseSend(now)) return

    const absoluteX = Math.round((percentX / 100) * remoteScreenSize.value.width)
    const absoluteY = Math.round((percentY / 100) * remoteScreenSize.value.height)

    if (isDuplicateMousePosition(absoluteX, absoluteY)) return

    this.send({
      type: 'MOUSE_MOVE',
      payload: { x: absoluteX, y: absoluteY }
    })

    recordMouseSendPosition(absoluteX, absoluteY, now)
  }

  public sendMouseAction(
    button: 'l' | 'r' | 'm',
    action: 'c' | 'dc' | 'd' | 'u',
    px: number,
    py: number
  ): void {
    if (localRole.value !== 'guest' || !isControlGranted.value) return
    const absoluteX = Math.round((px / 100) * remoteScreenSize.value.width)
    const absoluteY = Math.round((py / 100) * remoteScreenSize.value.height)

    this.send({
      type: 'MOUSE_ACTION',
      payload: { button, action, x: absoluteX, y: absoluteY }
    })
  }

  public sendKeyboardEvent(keyCode: string, action: 'd' | 'u'): void {
    if (localRole.value !== 'guest' || !isControlGranted.value) return
    this.send({
      type: 'KEYBOARD_EVENT',
      payload: { keyCode, action }
    })
  }

  public sendKeyboardKeyUpRemote(keyCode: string): void {
    if (localRole.value !== 'guest') return
    this.send({
      type: 'KEYBOARD_EVENT',
      payload: { keyCode, action: 'u' }
    })
  }

  public sendMouseScroll(deltaY: number): void {
    if (localRole.value !== 'guest' || !isControlGranted.value) return
    this.send({
      type: 'MOUSE_SCROLL',
      payload: { deltaY }
    })
  }

  public setClipboardSyncEnabled(enabled: boolean): void {
    const next = enabled && isControlGranted.value
    if (clipboardSyncEnabled.value === next) return
    clipboardSyncEnabled.value = next
    this.send({
      type: 'CLIPBOARD_SYNC',
      payload: { enabled: next }
    })
  }

  public sendClipboardText(text: string): void {
    if (!isControlGranted.value || !clipboardSyncEnabled.value) return
    if (typeof text !== 'string' || text.length === 0) return
    if (text.length > CLIPBOARD_TEXT_MAX_LENGTH) return
    if (text === lastClipboardReceivedFromPeer) return
    this.send({
      type: 'CLIPBOARD_TEXT',
      payload: { text }
    })
  }
}
