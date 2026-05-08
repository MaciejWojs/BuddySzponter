<template>
  <main
    class="w-full h-full bg-[#1e1e1e]/90 border border-[#333] flex items-center justify-center text-[#e8e8e8] select-none overflow-hidden"
    :class="widgetMode === 'peek' ? 'rounded-b-[16px] rounded-t-none border-t-0' : 'rounded-[16px]'"
    style="-webkit-app-region: no-drag"
  >
    <div class="flex items-center justify-center w-full h-full">
      <button
        class="flex items-center justify-center w-10 h-10 rounded-lg transition-all border group bg-[#2a2a2a] border-[#444] text-gray-200 hover:border-emerald-500"
        title="Przywróć pełny rozmiar"
        @pointerdown="startDrag"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="w-5 h-5 group-active:scale-90 transition-transform"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
          />
        </svg>
      </button>
    </div>
  </main>
</template>

<script setup lang="ts">
const props = defineProps<{
  widgetMode: 'normal' | 'compact' | 'hidden' | 'peek'
}>()

const emit = defineEmits<{
  (e: 'setWidgetMode', mode: 'normal' | 'compact' | 'hidden' | 'peek'): void
}>()

let isDragging = false
let hasMoved = false
let offsetX = 0
let offsetY = 0

const startDrag = (e: PointerEvent): void => {
  isDragging = true
  hasMoved = false
  offsetX = e.clientX
  offsetY = e.clientY

  const target = e.currentTarget as HTMLElement
  target.setPointerCapture(e.pointerId)

  target.addEventListener('pointermove', onPointerMove)
  target.addEventListener('pointerup', onPointerUp)
}

const onPointerMove = (e: PointerEvent): void => {
  if (!isDragging) return

  if (props.widgetMode !== 'compact') return // Blokada przesuwania dla trybu peek

  const moveX = Math.abs(e.clientX - offsetX)
  const moveY = Math.abs(e.clientY - offsetY)

  if (moveX > 3 || moveY > 3) hasMoved = true

  if (hasMoved && window.electron?.ipcRenderer?.invoke) {
    void window.electron.ipcRenderer
      .invoke('move-host-widget', {
        x: e.screenX - offsetX,
        y: e.screenY - offsetY
      })
      .catch(() => {})
  }
}

const onPointerUp = (e: PointerEvent): void => {
  isDragging = false
  const target = e.currentTarget as HTMLElement
  target.releasePointerCapture(e.pointerId)
  target.removeEventListener('pointermove', onPointerMove)
  target.removeEventListener('pointerup', onPointerUp)

  if (!hasMoved) emit('setWidgetMode', 'normal')
}
</script>
