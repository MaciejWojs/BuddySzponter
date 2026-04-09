<template>
  <div class="bg-black/50 border border-[#333] rounded-lg p-5 flex flex-col gap-4">
    <h3 class="text-xl font-semibold m-0 flex justify-between items-center">
      Test Screen Capture
      <span
        class="text-xs px-2 py-1 rounded"
        :class="isCapturing ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'"
      >
        {{ isCapturing ? 'Aktywne' : 'Wyłączone' }}
      </span>
    </h3>

    <div class="flex gap-2">
      <button
        @click="startCapture"
        :disabled="isCapturing"
        class="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded font-medium transition-colors"
      >
        Start
      </button>
      <button
        @click="stopCapture"
        :disabled="!isCapturing"
        class="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-4 py-2 rounded font-medium transition-colors"
      >
        Stop
      </button>
    </div>

    <div
      class="border border-[#444] rounded overflow-hidden bg-black/80 aspect-video relative flex items-center justify-center"
    >
      <canvas ref="canvasRef" class="w-full h-full object-contain" v-show="isCapturing"></canvas>
      <p v-if="!isCapturing" class="text-gray-500 font-medium absolute">Podgląd zablokowany</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onBeforeUnmount } from 'vue'

const isCapturing = ref(false)
const canvasRef = ref<HTMLCanvasElement | null>(null)
let animationFrameId: number | null = null

const startCapture = () => {
  if (isCapturing.value) return

  try {
    window.capture.start()
    isCapturing.value = true
    loop()
  } catch (error) {
    console.error('Failed to start capture:', error)
  }
}

const stopCapture = () => {
  if (!isCapturing.value) return

  try {
    window.capture.stop()
    isCapturing.value = false
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }
  } catch (error) {
    console.error('Failed to stop capture:', error)
  }
}

const loop = () => {
  if (!isCapturing.value) return

  const result = window.capture.getFrame()
  if (result && result.frame && canvasRef.value) {
    const frame = result.frame
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

    result.release()
  }

  animationFrameId = requestAnimationFrame(loop)
}

onBeforeUnmount(() => {
  stopCapture()
})
</script>
