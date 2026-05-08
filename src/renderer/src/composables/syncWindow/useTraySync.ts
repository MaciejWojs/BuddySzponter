import { onMounted, onUnmounted, ref, type Ref } from 'vue'

export interface UseTraySyncReturn {
  sendCommand: (type: string, payload?: unknown) => void
  rtcStatus: Ref<'disconnected' | 'connecting' | 'connected'>
  isMicMuted: Ref<boolean>
  connectionCode: Ref<string>
  localMicrophoneVolume: Ref<number>
  remoteSystemVolume: Ref<number>
}

export function useTraySync(): UseTraySyncReturn {
  let syncChannel: BroadcastChannel | null = null
  const rtcStatus = ref<'disconnected' | 'connecting' | 'connected'>('disconnected')
  const isMicMuted = ref(false)
  const connectionCode = ref('')
  const localMicrophoneVolume = ref(1)
  const remoteSystemVolume = ref(1)

  onMounted(() => {
    syncChannel = new BroadcastChannel('guest-sync-channel')

    syncChannel.onmessage = (event) => {
      if (event.data.type === 'STATE_UPDATE') {
        rtcStatus.value = event.data.payload.rtcStatus || 'disconnected'
        isMicMuted.value = !!event.data.payload.microphoneMuted
        connectionCode.value = event.data.payload.connectionCode || ''
        localMicrophoneVolume.value = event.data.payload.localMicrophoneVolume || 1
        remoteSystemVolume.value = event.data.payload.remoteSystemVolume || 1
      }
    }

    // Request initial state on mount
    syncChannel.postMessage({ type: 'REQUEST_STATE' })
  })

  onUnmounted(() => {
    if (syncChannel) syncChannel.close()
  })

  const sendCommand = (type: string, payload?: unknown): void => {
    if (syncChannel) {
      syncChannel.postMessage({ type, payload })
    }
  }

  return {
    sendCommand,
    rtcStatus,
    isMicMuted,
    connectionCode,
    localMicrophoneVolume,
    remoteSystemVolume
  }
}
