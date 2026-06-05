import { ref, type Ref } from 'vue'
import { BaseDataChannel } from './BaseDataChannel'
import {
  MetricsSchema,
  type MetricsMessage
} from '@renderer/composables/webrtc/datachannel/schemas/channelSchemas'

export type MetricsOutMessage = MetricsMessage
export type RemoteMetrics = MetricsMessage['payload']

const remoteMetrics = ref<RemoteMetrics | null>(null)
const metricsListeners = new Set<(metrics: RemoteMetrics) => void>()

export function getRemoteMetricsRef(): Ref<RemoteMetrics | null> {
  return remoteMetrics
}

export function subscribeRemoteMetrics(listener: (metrics: RemoteMetrics) => void): () => void {
  metricsListeners.add(listener)
  return () => {
    metricsListeners.delete(listener)
  }
}

export function resetRemoteMetrics(): void {
  remoteMetrics.value = null
}

export class MetricsDataChannel extends BaseDataChannel<MetricsOutMessage, MetricsMessage> {
  protected readonly label = 'metrics'
  protected readonly inSchema = MetricsSchema

  protected handleMessage(msg: MetricsMessage): void {
    remoteMetrics.value = msg.payload
    for (const listener of metricsListeners) {
      listener(msg.payload)
    }
  }

  public sendMetrics(payload: RemoteMetrics): boolean {
    return this.send({ type: 'METRICS', payload })
  }
}
