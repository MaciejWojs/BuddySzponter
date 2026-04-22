// src/renderer/src/services/hid/HidSenderService.ts
import { webRtcService } from '@renderer/composables/connection/webRTCService'
import type { P2PMessage } from '@renderer/schemas/p2pProtocol'

type HidHandshakeMessage = Extract<P2PMessage, { type: 'HID_HANDSHAKE' }>

export class HidSenderService {
  private isControlAllowed = false
  private remoteWidth = 1920
  private remoteHeight = 1080

  private lastX = -1
  private lastY = -1

  public handleIncomingMessage(msg: HidHandshakeMessage): void {
    if (msg.type === 'HID_HANDSHAKE') {
      this.remoteWidth = msg.payload.screenWidth
      this.remoteHeight = msg.payload.screenHeight
      this.isControlAllowed = msg.payload.isControlGranted
    }
  }

  public sendMouseFromVideo(percentX: number, percentY: number): void {
    if (!this.isControlAllowed) return

    const absoluteX = Math.round(percentX * this.remoteWidth)
    const absoluteY = Math.round(percentY * this.remoteHeight)

    if (absoluteX === this.lastX && absoluteY === this.lastY) return

    webRtcService.sendData(
      'hid-control',
      JSON.stringify({
        type: 'MOUSE_MOVE',
        payload: { x: absoluteX, y: absoluteY }
      })
    )

    this.lastX = absoluteX
    this.lastY = absoluteY
  }
}

export const hidSender = new HidSenderService()
