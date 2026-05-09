<template>
  <div ref="rootEl" class="absolute z-50 select-none" :style="positionStyle">
    <div
      class="cursor-move rounded-t-md bg-black/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white/80"
      @pointerdown="startDrag"
    >
      <slot name="handle">{{ title }}</slot>
    </div>
    <div class="rounded-b-md border border-white/10 bg-black/50 backdrop-blur">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'

const props = withDefaults(
  defineProps<{
    title?: string
    initialX?: number
    initialY?: number
  }>(),
  {
    title: '',
    initialX: 32,
    initialY: 32
  }
)

const rootEl = ref<HTMLElement | null>(null)
const x = ref<number>(props.initialX)
const y = ref<number>(props.initialY)

const positionStyle = computed(() => ({
  left: `${x.value}px`,
  top: `${y.value}px`
}))

let dragOffsetX = 0
let dragOffsetY = 0
let activePointerId: number | null = null

const startDrag = (event: PointerEvent): void => {
  const target = event.currentTarget as HTMLElement
  activePointerId = event.pointerId
  target.setPointerCapture(event.pointerId)

  dragOffsetX = event.clientX - x.value
  dragOffsetY = event.clientY - y.value

  target.addEventListener('pointermove', onPointerMove)
  target.addEventListener('pointerup', onPointerUp)
  target.addEventListener('pointercancel', onPointerUp)
}

const onPointerMove = (event: PointerEvent): void => {
  if (event.pointerId !== activePointerId) return

  const parent = rootEl.value?.parentElement
  const node = rootEl.value
  if (!parent || !node) return

  const parentRect = parent.getBoundingClientRect()
  const nextX = event.clientX - dragOffsetX
  const nextY = event.clientY - dragOffsetY

  const maxX = Math.max(0, parentRect.width - node.offsetWidth)
  const maxY = Math.max(0, parentRect.height - node.offsetHeight)

  x.value = Math.min(Math.max(0, nextX), maxX)
  y.value = Math.min(Math.max(0, nextY), maxY)
}

const onPointerUp = (event: PointerEvent): void => {
  const target = event.currentTarget as HTMLElement
  target.removeEventListener('pointermove', onPointerMove)
  target.removeEventListener('pointerup', onPointerUp)
  target.removeEventListener('pointercancel', onPointerUp)
  if (target.hasPointerCapture(event.pointerId)) {
    target.releasePointerCapture(event.pointerId)
  }
  activePointerId = null
}

onBeforeUnmount(() => {
  if (rootEl.value && activePointerId !== null) {
    rootEl.value.removeEventListener('pointermove', onPointerMove)
    rootEl.value.removeEventListener('pointerup', onPointerUp)
  }
})
</script>
