import { ref } from 'vue'

const visible = ref(false)
const messageText = ref('')
const durationMs = ref(3000)
/** Inkrementowany przy każdym `show()` — remount paska czasu (CSS animation od nowa). */
const replayId = ref(0)

let hideTimer: ReturnType<typeof setTimeout> | null = null

/**
 * Toast w prawym dolnym rogu (Teleport): lawendowe tło, mono, pionowy pasek czasu.
 * Singleton — montuj komponent GuestFixedSessionToast w App.vue.
 */
export function useGuestFixedSessionToast() {
  function showGuestFixedSessionToast(message: string, duration = 3000): void {
    if (hideTimer !== null) {
      clearTimeout(hideTimer)
      hideTimer = null
    }
    messageText.value = message
    durationMs.value = duration
    replayId.value += 1
    visible.value = true
    hideTimer = setTimeout(() => {
      visible.value = false
      hideTimer = null
    }, duration)
  }

  return { visible, messageText, durationMs, replayId, showGuestFixedSessionToast }
}
