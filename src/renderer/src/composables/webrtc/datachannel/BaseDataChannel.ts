import type { z } from 'zod'
import { logChannelError } from './channelLogger'

export abstract class BaseDataChannel<TOut, TIn> {
  protected abstract readonly label: string
  protected abstract readonly inSchema: z.ZodType<TIn>

  constructor(protected readonly channel: RTCDataChannel) {
    this.channel.addEventListener('open', this.handleOpen)
    this.channel.addEventListener('close', this.handleClose)
    this.channel.addEventListener('error', this.handleError)
    this.channel.addEventListener('message', this.handleRawMessage)

    if (this.channel.readyState === 'open') {
      this.handleOpen()
    }
  }

  public get readyState(): RTCDataChannelState {
    return this.channel.readyState
  }

  public get rtcChannel(): RTCDataChannel {
    return this.channel
  }

  private handleOpen = (): void => {
    this.onOpen()
  }

  private handleClose = (): void => {
    this.onClose()
  }

  private handleError = (event: Event): void => {
    this.onError(event)
  }

  private handleRawMessage = (event: MessageEvent): void => {
    if (typeof event.data !== 'string') {
      return
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(event.data)
    } catch (error) {
      logChannelError(this.label, 'json', error, event.data)
      return
    }

    const result = this.inSchema.safeParse(parsed)
    if (!result.success) {
      logChannelError(this.label, 'schema', result.error, event.data)
      return
    }

    this.handleMessage(result.data)
  }

  protected abstract handleMessage(data: TIn): void

  protected onOpen(): void {
    // optional hook
  }

  protected onClose(): void {
    // optional hook
  }

  protected onError(event: Event): void {
    logChannelError(this.label, 'lifecycle', event)
  }

  public send(data: TOut): boolean {
    if (this.channel.readyState !== 'open') {
      return false
    }

    try {
      this.channel.send(JSON.stringify(data))
      return true
    } catch (error) {
      logChannelError(this.label, 'send', error)
      return false
    }
  }

  public destroy(): void {
    this.channel.removeEventListener('open', this.handleOpen)
    this.channel.removeEventListener('close', this.handleClose)
    this.channel.removeEventListener('error', this.handleError)
    this.channel.removeEventListener('message', this.handleRawMessage)
  }
}
