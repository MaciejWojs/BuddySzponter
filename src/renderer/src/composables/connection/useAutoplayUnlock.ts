import { onMounted, onUnmounted, type Ref } from 'vue'

export function useAutoplayUnlock(targets: Array<Ref<HTMLAudioElement | null>>): {
  attemptPlay: (audioEl: HTMLAudioElement | null) => Promise<void>
} {
  const attemptPlay = async (audioEl: HTMLAudioElement | null): Promise<void> => {
    if (audioEl && audioEl.paused && audioEl.srcObject) {
      try {
        await audioEl.play()
      } catch (e) {
        console.warn('[AutoplayUnlock] Autoplay zablokowany, czekam na interakcję.', e)
      }
    }
  }

  const handleInteraction = (): void => {
    void Promise.all(targets.map((target) => attemptPlay(target.value)))
  }

  onMounted(() => {
    document.addEventListener('click', handleInteraction, { once: true })
  })

  onUnmounted(() => {
    document.removeEventListener('click', handleInteraction)
  })

  return {
    attemptPlay
  }
}
