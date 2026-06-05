import { BaseDataChannel } from './BaseDataChannel'
import { ChatDataChannel } from './ChatDataChannel'
import { HidDataChannel } from './HidDataChannel'
import { MetricsDataChannel } from './MetricsDataChannel'
import { SystemEventsDataChannel } from './SystemEventsDataChannel'
import { logChannelError } from './channelLogger'

export type ManagedChannelLabel = 'chat-channel' | 'hid-control' | 'system-events' | 'metrics'

const MANAGED_LABELS = new Set<string>(['chat-channel', 'hid-control', 'system-events', 'metrics'])

export class DataChannelManager {
  private channels = new Map<string, BaseDataChannel<unknown, unknown>>()

  public attach(channel: RTCDataChannel): void {
    if (!MANAGED_LABELS.has(channel.label)) {
      return
    }

    const existing = this.channels.get(channel.label)
    if (existing) {
      existing.destroy()
    }

    let instance: BaseDataChannel<unknown, unknown>

    switch (channel.label as ManagedChannelLabel) {
      case 'chat-channel':
        instance = new ChatDataChannel(channel)
        break
      case 'hid-control':
        instance = new HidDataChannel(channel)
        break
      case 'system-events':
        instance = new SystemEventsDataChannel(channel)
        break
      case 'metrics':
        instance = new MetricsDataChannel(channel)
        break
      default:
        logChannelError(channel.label, 'lifecycle', new Error('Unsupported managed channel label'))
        return
    }

    this.channels.set(channel.label, instance)
  }

  public get<T extends BaseDataChannel<unknown, unknown>>(label: ManagedChannelLabel): T | null {
    return (this.channels.get(label) as T | undefined) ?? null
  }

  public getChat(): ChatDataChannel | null {
    return this.get<ChatDataChannel>('chat-channel')
  }

  public getHid(): HidDataChannel | null {
    return this.get<HidDataChannel>('hid-control')
  }

  public getSystemEvents(): SystemEventsDataChannel | null {
    return this.get<SystemEventsDataChannel>('system-events')
  }

  public getMetrics(): MetricsDataChannel | null {
    return this.get<MetricsDataChannel>('metrics')
  }

  public destroyAll(): void {
    for (const channel of this.channels.values()) {
      channel.destroy()
    }
    this.channels.clear()
  }
}

export const dataChannelManager = new DataChannelManager()
