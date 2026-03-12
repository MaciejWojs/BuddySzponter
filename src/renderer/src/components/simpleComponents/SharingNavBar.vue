<template>
  <div
    class="sharing-navbar-wrapper"
    :style="wrapperStyle"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
  >
    <nav
      v-show="visible"
      class="sharing-navbar"
      :class="{ 'sharing-navbar--minimized': minimized }"
      @mousedown="startDrag"
    >
      <template v-if="!minimized">
        <div class="sharing-navbar__left">
          <button
            class="sharing-navbar__btn"
            :title="pinned ? 'Odepnij' : 'Przypnij'"
            @click="togglePin"
          >
            <UIcon
              :name="pinned ? 'i-lucide-pin-off' : 'i-lucide-pin'"
              class="sharing-navbar__icon"
            />
          </button>
          <button class="sharing-navbar__btn" title="Połączenie">
            <UIcon name="i-lucide-wifi" class="sharing-navbar__icon" />
          </button>
        </div>

        <div class="sharing-navbar__center">
          <UIcon name="i-lucide-users" class="sharing-navbar__icon" />
          <span class="sharing-navbar__name">{{ hostName }}</span>
        </div>

        <div class="sharing-navbar__right">
          <button class="sharing-navbar__btn" title="Minimalizuj" @click="minimized = true">
            <UIcon name="i-lucide-minus" class="sharing-navbar__icon" />
          </button>
          <button
            class="sharing-navbar__btn sharing-navbar__btn--close"
            title="Zamknij"
            @click="handleClose"
          >
            <UIcon name="i-lucide-x" class="sharing-navbar__icon" />
          </button>
        </div>
      </template>

      <template v-else>
        <button
          class="sharing-navbar__btn sharing-navbar__btn--restore"
          title="Przywróć"
          @click="minimized = false"
        >
          <UIcon name="i-lucide-users" class="sharing-navbar__icon" />
        </button>
      </template>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue'

defineProps<{
  hostName: string
}>()

const pinned = ref(false)
const minimized = ref(false)
const closed = ref(false)
const hovered = ref(false)
const position = ref({ x: 20, y: 20 })
const isDragging = ref(false)
const dragOffset = ref({ x: 0, y: 0 })
const dragSize = ref({ width: 0, height: 0 })

const visible = computed(() => !closed.value || hovered.value)
const wrapperStyle = computed(() => ({
  left: `${position.value.x}px`,
  top: `${position.value.y}px`
}))

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function onDrag(event: MouseEvent): void {
  if (!isDragging.value) {
    return
  }

  const nextX = event.clientX - dragOffset.value.x
  const nextY = event.clientY - dragOffset.value.y

  const maxX = Math.max(0, window.innerWidth - dragSize.value.width)
  const maxY = Math.max(0, window.innerHeight - dragSize.value.height)

  position.value = {
    x: clamp(nextX, 0, maxX),
    y: clamp(nextY, 0, maxY)
  }
}

function stopDrag(): void {
  isDragging.value = false
  window.removeEventListener('mousemove', onDrag)
  window.removeEventListener('mouseup', stopDrag)
}

function startDrag(event: MouseEvent): void {
  const target = event.target as HTMLElement | null
  if (target?.closest('button')) {
    return
  }

  const currentTarget = event.currentTarget as HTMLElement | null
  if (!currentTarget) {
    return
  }

  const rect = currentTarget.getBoundingClientRect()
  dragSize.value = {
    width: rect.width,
    height: rect.height
  }
  dragOffset.value = {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  }

  isDragging.value = true
  window.addEventListener('mousemove', onDrag)
  window.addEventListener('mouseup', stopDrag)
}

onBeforeUnmount(() => {
  stopDrag()
})

function handleClose(): void {
  closed.value = true
}

function onMouseEnter(): void {
  hovered.value = true
  if (closed.value) {
    closed.value = false
  }
}

function onMouseLeave(): void {
  hovered.value = false
}

function togglePin(): void {
  pinned.value = !pinned.value
  window.api.window.setAlwaysOnTop(pinned.value)
}
</script>

<style scoped>
.sharing-navbar-wrapper {
  width: 33vw;
  max-width: 500px;
  min-height: 30px;
  position: fixed;
  z-index: 30;
}

.sharing-navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: var(--color-accent);
  border-radius: 8px;
  padding: 4px 10px;
  height: 30px;
  transition: opacity 0.2s;
  cursor: grab;
}

.sharing-navbar:active {
  cursor: grabbing;
}

.sharing-navbar__left,
.sharing-navbar__right {
  display: flex;
  align-items: center;
  gap: 2px;
}

.sharing-navbar__center {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  font-size: 13px;
  color: #000;
}

.sharing-navbar__name {
  white-space: nowrap;
}

.sharing-navbar__icon {
  width: 16px;
  height: 16px;
  color: #000;
}

.sharing-navbar__btn {
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  padding: 3px;
  border-radius: 4px;
  transition: background-color 0.15s;
  -webkit-app-region: no-drag;
}

.sharing-navbar__btn:hover {
  background-color: rgba(0, 0, 0, 0.15);
}

.sharing-navbar__btn--close:hover {
  background-color: rgba(220, 38, 38, 0.8);
}

.sharing-navbar__btn--close:hover .sharing-navbar__icon {
  color: #fff;
}

.sharing-navbar--minimized {
  width: 30px;
  height: 30px;
  padding: 0;
  border-radius: 50%;
  cursor: pointer;
  justify-content: center;
}

.sharing-navbar__btn--restore {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  padding: 0;
  justify-content: center;
}
</style>
