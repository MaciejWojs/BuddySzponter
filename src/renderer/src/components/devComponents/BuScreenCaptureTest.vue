<template>
  <div class="bg-black/50 border border-[#333] rounded-lg p-5 flex flex-col gap-4">
    <h3 class="text-xl font-semibold m-0 flex justify-between items-center">
      <span>Test Screen Capture</span>
      <div class="flex items-center gap-3">
        <span v-if="isCapturing" class="text-xs bg-gray-700/60 text-gray-200 px-2 py-1 rounded"
          >FPS: {{ fps }}</span
        >
        <span
          class="text-xs px-2 py-1 rounded"
          :class="isCapturing ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'"
        >
          {{ isCapturing ? 'Aktywne' : 'Wyłączone' }}
        </span>
      </div>
    </h3>

    <div class="flex gap-2">
      <button
        :disabled="isCapturing"
        class="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded font-medium transition-colors"
        @click="startCapture"
      >
        Start
      </button>
      <button
        :disabled="!isCapturing"
        class="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-4 py-2 rounded font-medium transition-colors"
        @click="stopCapture"
      >
        Stop
      </button>
    </div>

    <div
      class="border border-[#444] rounded overflow-hidden bg-black/80 aspect-video relative flex items-center justify-center"
    >
      <canvas v-if="isCapturing" ref="canvasRef" class="w-full h-full object-contain"></canvas>
      <p v-else class="text-gray-500 font-medium absolute">Podgląd zablokowany</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onBeforeUnmount } from 'vue'

const isCapturing = ref(false)
const fps = ref<number | null>(null)
const fpsInterval = ref<number | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)

let stopStream: (() => void) | null = null

const shouldUseCpu = ref(false)

const hasNativeScreenCapture =
  typeof window.screenCapture?.onFrameReceived === 'function' &&
  typeof window.screenCapture?.requestStream === 'function' &&
  typeof window.screenCapture?.stopStream === 'function'

const canRegisterSharedTexture = typeof window.screenCapture?.registerReceiver === 'function'

const updateFps = async (): Promise<void> => {
  if (typeof window.capture?.getFps === 'function') {
    try {
      const value = await window.capture.getFps()
      fps.value = typeof value === 'number' ? value : null
    } catch {
      fps.value = null
    }
  } else {
    fps.value = null
  }
}

const startCapture = async (): Promise<void> => {
  if (isCapturing.value) return

  try {
    if (window.screenCapture?.shouldUseCpu) {
      shouldUseCpu.value = await window.screenCapture.shouldUseCpu()
    }

    updateFps()
    fpsInterval.value = window.setInterval(updateFps, 200)

    if (hasNativeScreenCapture) {
      if (!shouldUseCpu.value && canRegisterSharedTexture) {
        window.screenCapture.registerReceiver()
      }

      stopStream = window.screenCapture.onFrameReceived((frame: VideoFrame): void => {
        if (isCapturing.value && canvasRef.value) {
          const canvas = canvasRef.value
          const width = frame.displayWidth || frame.codedWidth || canvas.width
          const height = frame.displayHeight || frame.codedHeight || canvas.height

          if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width
            canvas.height = height
          }

          const ctx = canvas.getContext('2d')
          if (ctx) {
            ctx.drawImage(frame, 0, 0, canvas.width, canvas.height)
          }
        }

        frame.close()
      })

      window.screenCapture.requestStream()
    } else if (typeof window.capture?.subscribeStream === 'function') {
      stopStream = window.capture.subscribeStream((frame: VideoFrame) => {
        if (isCapturing.value && canvasRef.value) {
          const canvas = canvasRef.value
          const width = frame.displayWidth || frame.codedWidth || canvas.width
          const height = frame.displayHeight || frame.codedHeight || canvas.height

          if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width
            canvas.height = height
          }

          const ctx = canvas.getContext('2d')
          if (ctx) {
            ctx.drawImage(frame, 0, 0, canvas.width, canvas.height)
          }
        }

        frame.close()
      })
    } else {
      console.warn('Brak dostępnej metody przechwytywania (screenCapture ani capture).')
      return
    }

    isCapturing.value = true
  } catch (error) {
    console.error('Failed to start capture:', error)
  }
}

const stopCapture = async (): Promise<void> => {
  if (!isCapturing.value) return

  try {
    isCapturing.value = false

    /**
     * Stop FPS polling (dev)
     */
    if (fpsInterval.value) {
      clearInterval(fpsInterval.value)
      fpsInterval.value = null
    }
    fps.value = null

    if (stopStream) {
      stopStream()
      stopStream = null
    }

    if (canvasRef.value) {
      const ctx = canvasRef.value.getContext('2d')
      if (ctx) {
        canvasRef.value.width = 1
        canvasRef.value.height = 1
        ctx.clearRect(0, 0, 1, 1)
      }
    }

    if (hasNativeScreenCapture) {
      window.screenCapture.stopStream()
    }
  } catch (error) {
    console.error('Failed to stop capture:', error)
  }
}

onBeforeUnmount(() => {
  stopCapture()
  if (fpsInterval.value) {
    clearInterval(fpsInterval.value)
    fpsInterval.value = null
  }
})
</script>
