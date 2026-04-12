import { ref, type Ref } from 'vue'
import { webRtcService } from '@renderer/composables/connection/webRTCService'
import { P2PMessage } from '@renderer/schemas/p2pProtocol'

type MetricsPayload = Extract<P2PMessage, { type: 'METRICS' }>['payload']

type RtcStatus = 'disconnected' | 'connecting' | 'connected'

type BasicMetrics = {
  fps: number | null
  qualityPreset: 'low' | 'medium' | 'high' | null
  rttMs: number | null
  cpuLoadPct: number | null
}

type UseConnectionMetricsReturn = {
  localMetrics: Ref<BasicMetrics>
  remoteMetrics: Ref<BasicMetrics>
  start: () => void
  stop: () => void
  reset: () => void
  setLocalPreviewFps: (fps: number | null) => void
  setLocalPreviewQuality: (quality: 'low' | 'medium' | 'high' | null) => void
  applyRemoteMetrics: (payload: MetricsPayload) => void
}

const emptyMetrics = (): BasicMetrics => ({
  fps: null,
  qualityPreset: null,
  rttMs: null,
  cpuLoadPct: null
})

export const useConnectionMetrics = (rtcStatus: Ref<RtcStatus>): UseConnectionMetricsReturn => {
  const localMetrics = ref<BasicMetrics>(emptyMetrics())
  const remoteMetrics = ref<BasicMetrics>(emptyMetrics())
  const localPreviewFps = ref<number | null>(null)
  const localPreviewQuality = ref<'low' | 'medium' | 'high' | null>(null)
  let metricsInterval: ReturnType<typeof setInterval> | null = null

  const stop = (): void => {
    if (metricsInterval) {
      clearInterval(metricsInterval)
      metricsInterval = null
    }
  }

  const reset = (): void => {
    localPreviewFps.value = null
    localPreviewQuality.value = null
    localMetrics.value = emptyMetrics()
    remoteMetrics.value = emptyMetrics()
  }

  const setLocalPreviewFps = (fps: number | null): void => {
    localPreviewFps.value = fps
  }

  const setLocalPreviewQuality = (quality: 'low' | 'medium' | 'high' | null): void => {
    localPreviewQuality.value = quality
  }

  const start = (): void => {
    stop()

    metricsInterval = setInterval(async () => {
      if (rtcStatus.value !== 'connected') return

      const metrics = await webRtcService.collectLocalMetrics()
      localMetrics.value = {
        fps: localPreviewFps.value,
        qualityPreset: localPreviewQuality.value,
        rttMs: metrics.rttMs,
        cpuLoadPct: metrics.cpuLoadPct
      }

      webRtcService.sendData(
        'metrics',
        JSON.stringify({
          type: 'METRICS',
          payload: {
            fps: localPreviewFps.value,
            qualityPreset: localPreviewQuality.value,
            rttMs: metrics.rttMs,
            cpuLoadPct: metrics.cpuLoadPct,
            timestamp: metrics.timestamp
          }
        })
      )
    }, 1000)
  }

  const applyRemoteMetrics = (payload: MetricsPayload): void => {
    remoteMetrics.value = {
      fps: payload.fps,
      qualityPreset: payload.qualityPreset,
      rttMs: payload.rttMs,
      cpuLoadPct: payload.cpuLoadPct
    }
  }

  return {
    localMetrics,
    remoteMetrics,
    start,
    stop,
    reset,
    setLocalPreviewFps,
    setLocalPreviewQuality,
    applyRemoteMetrics
  }
}
