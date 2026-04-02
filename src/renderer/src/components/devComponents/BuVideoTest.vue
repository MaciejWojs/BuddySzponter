<template>
  <div class="bg-[#1e1e1e] border border-[#333] rounded-lg p-5">
    <h2 class="text-xl font-bold mb-4 text-white m-0">
      Lokalne Przechwytywanie Ekranu (Native Addon)
    </h2>

    <div class="flex gap-3 mb-4">
      <button
        :disabled="isCapturing"
        class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed rounded text-white font-bold transition-colors"
        @click="startCapture"
      >
        ▶ Rozpocznij
      </button>
      <button
        :disabled="!isCapturing"
        class="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed rounded text-white font-bold transition-colors"
        @click="stopCapture"
      >
        ■ Zatrzymaj
      </button>
    </div>

    <div
      class="bg-black border border-[#444] rounded-lg overflow-hidden aspect-video relative flex items-center justify-center shadow-[0_0_10px_rgba(0,0,0,0.5)]"
    >
      <div
        v-if="!isCapturing"
        class="text-gray-500 text-sm font-mono absolute z-10 pointer-events-none"
      >
        Brak strumienia wideo. Kliknij "Rozpocznij".
      </div>

      <canvas
        v-show="isCapturing"
        ref="videoCanvas"
        class="w-full h-full object-contain absolute inset-0"
      ></canvas>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue'

const videoCanvas = ref<HTMLCanvasElement | null>(null)
const isCapturing = ref(false)

let animationId: number | null = null
let framesReceived = 0

// Ograniczenie klatek (żeby nie ugotować procesora i UI, jeśli addon daje np. 144 fps)
let lastRenderTime = 0
const TARGET_FPS = 60
const FRAME_INTERVAL = 1000 / TARGET_FPS

function startCapture(): void {
  if (isCapturing.value) return

  console.log('[NativeCapture] Rozpoczynanie przechwytywania ekranu...')

  try {
    if (!window.capture) throw new Error('Brak obiektu window.capture!')

    // 1. Odpalamy addon
    window.capture.start()
    isCapturing.value = true
    framesReceived = 0
    lastRenderTime = performance.now()

    // 2. Rozpoczynamy pętlę renderującą Vue -> Canvas
    animationId = requestAnimationFrame(renderLoop)
  } catch (err) {
    console.error('[NativeCapture] Błąd przy uruchamianiu addona:', err)
    isCapturing.value = false
  }
}

function renderLoop(timestamp: number): void {
  if (!isCapturing.value) return

  // Kolejkujemy następną klatkę
  animationId = requestAnimationFrame(renderLoop)

  // Kontrola limitu FPS
  if (timestamp - lastRenderTime < FRAME_INTERVAL) return
  lastRenderTime = timestamp

  const canvas = videoCanvas.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  try {
    // @ts-ignore Pobieramy klatkę z procesu głównego
    const frame = window.capture.getFrame() as VideoFrame | null

    if (frame) {
      if (framesReceived === 0) {
        console.log('[NativeCapture] Pierwsza klatka nadeszła z addona!')
      }
      framesReceived++

      // Synchronizacja wielkości canvasu do wielkości ekranu
      if (canvas.width !== frame.displayWidth || canvas.height !== frame.displayHeight) {
        canvas.width = frame.displayWidth
        canvas.height = frame.displayHeight
      }

      // Malujemy zrzut ekranu (wystawiony przez Chromium sharedTexture)
      ctx.drawImage(frame, 0, 0, canvas.width, canvas.height)

      // KRYTYCZNE: frame musi być natychmiast zamknięty, inaczej zablokujesz pamięć RAM!
      frame.close()
    }
  } catch (error) {
    console.error('[NativeCapture] Błąd podczas renderowania klatki:', error)
  }
}

function stopCapture(): void {
  if (!isCapturing.value) return

  console.log('[NativeCapture] Zatrzymywanie przechwytywania ekranu...')
  isCapturing.value = false

  // Zatrzymujemy pętlę żądań
  if (animationId !== null) {
    cancelAnimationFrame(animationId)
    animationId = null
  }

  // Czyścimy pozostałości po ostatniej klatce, aby ekran powrócił do bycia "czarnym"
  if (videoCanvas.value) {
    const ctx = videoCanvas.value.getContext('2d')
    if (ctx) {
      ctx.clearRect(0, 0, videoCanvas.value.width, videoCanvas.value.height)
    }
  }

  try {
    window.capture.stop()
  } catch (e) {
    console.error('[NativeCapture] Błąd przy zatrzymywaniu addona:', e)
  }
}

// Czystość Pamięci: Gdy zmienisz zakładkę, zatrzymaj addon w tle
onUnmounted(() => {
  stopCapture()
})
</script>
