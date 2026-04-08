import { ref, type Ref } from 'vue'
import { webRtcService } from '@renderer/composables/connection/webRTCService'
import { P2PMessage } from '@renderer/schemas/p2pProtocol'

type RtcStatus = 'disconnected' | 'connecting' | 'connected'

type BasicMetrics = {
  fps: number | null
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
  handleIncoming: (msg: P2PMessage, channelLabel: string) => boolean
}

const emptyMetrics = (): BasicMetrics => ({
  fps: null,
  rttMs: null,
  cpuLoadPct: null
})

export const useConnectionMetrics = (rtcStatus: Ref<RtcStatus>): UseConnectionMetricsReturn => {
  const localMetrics = ref<BasicMetrics>(emptyMetrics())
  const remoteMetrics = ref<BasicMetrics>(emptyMetrics())
  const localPreviewFps = ref<number | null>(null)
  let metricsInterval: ReturnType<typeof setInterval> | null = null

  const stop = (): void => {
    if (metricsInterval) {
      clearInterval(metricsInterval)
      metricsInterval = null
    }
  }

  const reset = (): void => {
    localPreviewFps.value = null
    localMetrics.value = emptyMetrics()
    remoteMetrics.value = emptyMetrics()
  }

  const setLocalPreviewFps = (fps: number | null): void => {
    localPreviewFps.value = fps
  }

  const start = (): void => {
    stop()

    metricsInterval = setInterval(async () => {
      if (rtcStatus.value !== 'connected') return

      const metrics = await webRtcService.collectLocalMetrics()
      localMetrics.value = {
        fps: localPreviewFps.value,
        rttMs: metrics.rttMs,
        cpuLoadPct: metrics.cpuLoadPct
      }

      webRtcService.sendData(
        'metrics',
        JSON.stringify({
          type: 'METRICS',
          payload: {
            fps: localPreviewFps.value,
            rttMs: metrics.rttMs,
            cpuLoadPct: metrics.cpuLoadPct,
            timestamp: metrics.timestamp
          }
        })
      )
    }, 1000)
  }

  const handleIncoming = (msg: P2PMessage, channelLabel: string): boolean => {
    if (channelLabel === 'metrics' && msg.type === 'METRICS') {
      remoteMetrics.value = {
        fps: msg.payload.fps,
        rttMs: msg.payload.rttMs,
        cpuLoadPct: msg.payload.cpuLoadPct
      }
      return true
    }

    return false
  }

  return {
    localMetrics,
    remoteMetrics,
    start,
    stop,
    reset,
    setLocalPreviewFps,
    handleIncoming
  }
}
