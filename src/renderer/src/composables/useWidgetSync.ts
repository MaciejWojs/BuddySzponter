import { onMounted, onUnmounted, watch } from 'vue'
import { useSessionStore } from '@renderer/stores/sessionStore'
import { useHidChannel } from '@renderer/composables/channels/HidChannel'
import { useSocketStore } from '@renderer/stores/socketStore'

export function useWidgetBridge(): void {
  let widgetChannel: BroadcastChannel | null = null

  onMounted(() => {
    const sessionStore = useSessionStore()
    const socketStore = useSocketStore()
    const hidChannel = useHidChannel()

    widgetChannel = new BroadcastChannel('widget-sync-channel')

    const pushStateToWidget = (): void => {
      if (!widgetChannel) return
      widgetChannel.postMessage({
        type: 'STATE_UPDATE',
        payload: {
          micActive: !sessionStore.microphoneMuted,
          sysActive: sessionStore.localSystemAudioVolume > 0,
          guestMicActive: sessionStore.remoteMicVolume > 0,
          controlGranted: hidChannel.isControlGranted.value
        }
      })
    }

    widgetChannel.onmessage = async (event) => {
      const { type } = event.data

      switch (type) {
        case 'REQUEST_STATE':
          pushStateToWidget()
          break
        case 'TOGGLE_MIC':
          sessionStore.toggleMicrophone(!sessionStore.microphoneMuted)
          break
        case 'TOGGLE_SYSTEM':
          sessionStore.localSystemAudioVolume = sessionStore.localSystemAudioVolume > 0 ? 0 : 1
          break
        case 'TOGGLE_GUEST_MIC':
          sessionStore.remoteMicVolume = sessionStore.remoteMicVolume > 0 ? 0 : 1
          break
        case 'TOGGLE_CONTROL':
          if (hidChannel.isControlGranted.value) {
            await hidChannel.revokeControl()
          } else {
            await hidChannel.grantControl()
          }
          break
        case 'END_SESSION':
          await socketStore.disconnect()
          window.api?.app?.hideHostWidget().catch(() => {})
          break
      }
    }

    watch(
      [
        () => sessionStore.microphoneMuted,
        () => sessionStore.localSystemAudioVolume,
        () => sessionStore.remoteMicVolume,
        () => hidChannel.isControlGranted.value
      ],
      () => pushStateToWidget(),
      { deep: true }
    )
  })

  onUnmounted(() => {
    if (widgetChannel) widgetChannel.close()
  })
}
