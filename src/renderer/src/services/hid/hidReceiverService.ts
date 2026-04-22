import { webRtcService } from '@renderer/composables/connection/webRTCService'
import type { P2PMessage } from '@renderer/schemas/p2pProtocol'
// src/renderer/src/services/hid/HidReceiverService.ts

type MouseMoveMessage = Extract<P2PMessage, { type: 'MOUSE_MOVE' }>

export class HidReceiverService {
  private isControlGranted = false
  private hostWidth = window.screen.width
  private hostHeight = window.screen.height

  public grantControl(): void {
    this.isControlGranted = true
    this.sendHandshake()
  }

  public revokeControl(): void {
    this.isControlGranted = false
    this.sendHandshake()
  }

  public onConnectionReady(): void {
    this.sendHandshake()
  }

  public handleIncomingMessage(msg: MouseMoveMessage): void {
    if (!this.isControlGranted) return

    if (msg.type === 'MOUSE_MOVE') {
      void window.api.input.moveAbsolute(msg.payload.x, msg.payload.y)
    }
  }

  private sendHandshake(): void {
    webRtcService.sendData(
      'hid-control',
      JSON.stringify({
        type: 'HID_HANDSHAKE',
        payload: {
          screenWidth: this.hostWidth,
          screenHeight: this.hostHeight,
          isControlGranted: this.isControlGranted
        }
      })
    )
  }
}

export const hidReceiver = new HidReceiverService()
