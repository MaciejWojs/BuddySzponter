<template>
  <div ref="rootEl" class="absolute z-50 select-none" :style="{ left: `${x}px`, top: `${y}px` }">
    <main
      class="w-[520px] h-[52px] px-3 bg-[#090909]/95 border border-[#1c1c1c] flex items-center gap-0 text-[#e8e8e8] rounded-2xl shadow-lg"
      @pointerdown.self="startDrag"
    >
      <!-- Left: guest mic + chat -->
      <div class="flex items-center gap-0.5">
        <!-- Guest mic mute -->
        <button
          ref="guestMicBtn"
          class="flex items-center justify-center w-8 h-8 rounded-lg transition-all group"
          :class="
            microphoneMuted
              ? 'text-rose-400 hover:text-rose-300'
              : 'text-violet-400 hover:text-violet-200'
          "
          :title="
            microphoneMuted
              ? 'Włącz swój mikrofon'
              : 'Wycisz swój mikrofon (przytrzymaj = głośność)'
          "
          @pointerdown.stop
          @mousedown="holdStart('guestMic')"
          @mouseup="holdUp('guestMic', () => $emit('toggleMic'))"
          @mouseleave="holdCancel"
        >
          <svg
            class="w-[16px] h-[16px] group-active:scale-90 transition-transform"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="1.75"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"
            />
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"
            />
            <line v-if="microphoneMuted" x1="1" y1="1" x2="23" y2="23" stroke-linecap="round" />
          </svg>
        </button>

        <!-- Chat -->
        <button
          class="relative flex items-center justify-center w-8 h-8 rounded-lg transition-all group"
          :class="
            chatHasUnread
              ? 'text-violet-300 hover:text-violet-100'
              : 'text-violet-500 hover:text-violet-300'
          "
          :title="chatHasUnread ? 'Czat — nowe wiadomości' : 'Otwórz czat'"
          @click="$emit('toggleChat')"
        >
          <svg
            class="w-[16px] h-[16px] group-active:scale-90 transition-transform"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="1.75"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
            />
          </svg>
          <span
            v-if="chatHasUnread"
            class="absolute top-1 right-1 inline-flex h-1.5 w-1.5 rounded-full bg-orange-500"
          />
        </button>
      </div>

      <!-- Divider -->
      <div class="w-px h-4 bg-[#252525] mx-2 shrink-0" @pointerdown="startDrag"></div>

      <!-- Center: remote audio controls + name (draggable) -->
      <div class="flex-1 flex items-center gap-0.5 cursor-move" @pointerdown="startDrag">
        <!-- Remote mic (hold for slider) -->
        <button
          ref="remoteMicBtn"
          class="relative flex items-center justify-center w-8 h-8 rounded-lg transition-all group"
          :class="
            remoteMicActive
              ? 'text-violet-400 hover:text-violet-200'
              : 'text-rose-400 hover:text-rose-300'
          "
          :title="
            remoteMicActive
              ? 'Wycisz mikrofon hosta (przytrzymaj = głośność)'
              : 'Włącz mikrofon hosta'
          "
          @pointerdown.stop
          @mousedown="holdStart('remoteMic')"
          @mouseup="holdUp('remoteMic', toggleRemoteMic)"
          @mouseleave="holdCancel"
        >
          <svg
            class="w-[16px] h-[16px] group-active:scale-90 transition-transform"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="1.75"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"
            />
            <circle cx="9" cy="7" r="4" />
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
            />
            <line v-if="!remoteMicActive" x1="1" y1="1" x2="23" y2="23" stroke-linecap="round" />
          </svg>
        </button>

        <!-- Remote sys audio (hold for slider) -->
        <button
          ref="remoteSysBtn"
          class="relative flex items-center justify-center w-8 h-8 rounded-lg transition-all group"
          :class="
            remoteSysActive
              ? 'text-violet-400 hover:text-violet-200'
              : 'text-rose-400 hover:text-rose-300'
          "
          :title="
            remoteSysActive
              ? 'Wycisz dźwięk systemu hosta (przytrzymaj = głośność)'
              : 'Włącz dźwięk systemu hosta'
          "
          @pointerdown.stop
          @mousedown="holdStart('remoteSys')"
          @mouseup="holdUp('remoteSys', toggleRemoteSys)"
          @mouseleave="holdCancel"
        >
          <svg
            class="w-[16px] h-[16px] group-active:scale-90 transition-transform"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="1.75"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"
            />
            <line v-if="!remoteSysActive" x1="1" y1="1" x2="23" y2="23" stroke-linecap="round" />
          </svg>
        </button>

        <!-- Host name -->
        <span
          class="flex-1 text-center text-sm font-medium text-violet-400 tracking-wide truncate px-2"
        >
          {{ hostName || '—' }}
        </span>
      </div>

      <!-- Divider -->
      <div class="w-px h-4 bg-[#252525] mx-2 shrink-0" @pointerdown="startDrag"></div>

      <!-- Right: clipboard + window controls -->
      <div class="flex items-center gap-0.5">
        <!-- Clipboard sync -->
        <button
          class="flex items-center justify-center w-8 h-8 rounded-lg transition-all group"
          :class="[
            !controlGranted
              ? 'text-[#2a2a3a] cursor-not-allowed'
              : clipboardSyncEnabled
                ? 'text-violet-300 hover:text-violet-100'
                : 'text-violet-500 hover:text-violet-300'
          ]"
          :title="
            !controlGranted
              ? 'Synchronizacja schowka wymaga oddania kontroli'
              : clipboardSyncEnabled
                ? 'Wyłącz synchronizację schowka'
                : 'Włącz synchronizację schowka'
          "
          :disabled="!controlGranted"
          @click="$emit('toggleClipboardSync')"
        >
          <svg
            class="w-[16px] h-[16px] group-active:scale-90 transition-transform"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="1.75"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"
            />
            <rect x="9" y="3" width="6" height="4" rx="1" ry="1" />
          </svg>
        </button>

        <!-- Stacked: hide + compact -->
        <div class="flex flex-col gap-0.5 ml-0.5">
          <button
            class="flex items-center justify-center w-6 h-[15px] rounded text-[#3a3a5a] hover:text-violet-400 transition-colors"
            title="Schowaj pasek"
            @click="$emit('setMode', 'hidden')"
          >
            <svg
              class="w-3 h-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M20 12H4" />
            </svg>
          </button>
          <button
            class="flex items-center justify-center w-6 h-[15px] rounded text-[#3a3a5a] hover:text-violet-400 transition-colors"
            title="Zwiń do małego okna"
            @click="$emit('setMode', 'compact')"
          >
            <svg
              class="w-3 h-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"
              />
            </svg>
          </button>
        </div>
      </div>
    </main>

    <!-- Volume popovers — after <main> so they appear below the bar -->
    <div class="relative h-0 overflow-visible">
      <!-- Guest mic popover -->
      <div
        v-if="activePopover === 'guestMic'"
        class="popover-card"
        :style="popoverStyle('guestMic')"
        @mouseenter="cancelLeave"
        @mouseleave="scheduleLeave"
      >
        <div class="popover-icons">
          <svg
            class="popover-icon"
            :class="!microphoneMuted ? 'icon-on' : 'icon-dim'"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="1.75"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"
            />
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"
            />
          </svg>
          <svg
            class="popover-icon"
            :class="microphoneMuted ? 'icon-off' : 'icon-dim'"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="1.75"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"
            />
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"
            />
            <line x1="1" y1="1" x2="23" y2="23" stroke-linecap="round" />
          </svg>
        </div>
        <input
          v-model.number="volumes.guestMic"
          type="range"
          min="0"
          max="100"
          class="popover-slider"
          :style="`--val:${volumes.guestMic}`"
          @input="onGuestMicSlider"
        />
      </div>

      <!-- Remote mic popover -->
      <div
        v-if="activePopover === 'remoteMic'"
        class="popover-card"
        :style="popoverStyle('remoteMic')"
        @mouseenter="cancelLeave"
        @mouseleave="scheduleLeave"
      >
        <div class="popover-icons">
          <svg
            class="popover-icon"
            :class="remoteMicActive ? 'icon-on' : 'icon-dim'"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="1.75"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"
            />
            <circle cx="9" cy="7" r="4" />
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
            />
          </svg>
          <svg
            class="popover-icon"
            :class="!remoteMicActive ? 'icon-off' : 'icon-dim'"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="1.75"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"
            />
            <circle cx="9" cy="7" r="4" />
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
            />
            <line x1="1" y1="1" x2="23" y2="23" stroke-linecap="round" />
          </svg>
        </div>
        <input
          v-model.number="volumes.remoteMic"
          type="range"
          min="0"
          max="100"
          class="popover-slider"
          :style="`--val:${volumes.remoteMic}`"
          @input="onRemoteMicSlider"
        />
      </div>

      <!-- Remote sys popover -->
      <div
        v-if="activePopover === 'remoteSys'"
        class="popover-card"
        :style="popoverStyle('remoteSys')"
        @mouseenter="cancelLeave"
        @mouseleave="scheduleLeave"
      >
        <div class="popover-icons">
          <svg
            class="popover-icon"
            :class="remoteSysActive ? 'icon-on' : 'icon-dim'"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="1.75"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"
            />
          </svg>
          <svg
            class="popover-icon"
            :class="!remoteSysActive ? 'icon-off' : 'icon-dim'"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="1.75"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"
            />
            <line x1="1" y1="1" x2="23" y2="23" stroke-linecap="round" />
          </svg>
        </div>
        <input
          v-model.number="volumes.remoteSys"
          type="range"
          min="0"
          max="100"
          class="popover-slider"
          :style="`--val:${volumes.remoteSys}`"
          @input="onRemoteSysSlider"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount } from 'vue'

type PopoverKey = 'guestMic' | 'remoteMic' | 'remoteSys'

const props = withDefaults(
  defineProps<{
    microphoneMuted: boolean
    localMicrophoneVolume: number
    remoteSystemVolume: number
    guestMicVolume?: number
    chatVisible: boolean
    chatHasUnread: boolean
    controlGranted: boolean
    clipboardSyncEnabled: boolean
    hostName?: string
    initialX?: number
    initialY?: number
  }>(),
  { initialX: 32, initialY: 32 }
)

const emit = defineEmits<{
  toggleMic: []
  updateGuestMicVolume: [value: number]
  updateMicVolume: [value: number]
  updateSysVolume: [value: number]
  toggleChat: []
  toggleClipboardSync: []
  disconnect: []
  setMode: [mode: 'compact' | 'hidden']
}>()

// --- Computed active states ---
const remoteMicActive = computed(() => props.localMicrophoneVolume > 0)
const remoteSysActive = computed(() => props.remoteSystemVolume > 0)

const toggleRemoteMic = (): void => emit('updateMicVolume', remoteMicActive.value ? 0 : 1)
const toggleRemoteSys = (): void => emit('updateSysVolume', remoteSysActive.value ? 0 : 1)

// --- Volume sliders (0-100 scale for the slider, 0-1 for the emit) ---
const volumes = ref({ guestMic: 80, remoteMic: 80, remoteSys: 80 })

watch(
  () => props.guestMicVolume,
  (v) => {
    if (v !== undefined && v > 0) volumes.value.guestMic = Math.round(v * 100)
  }
)
watch(
  () => props.localMicrophoneVolume,
  (v) => {
    if (v > 0) volumes.value.remoteMic = Math.round(v * 100)
  }
)
watch(
  () => props.remoteSystemVolume,
  (v) => {
    if (v > 0) volumes.value.remoteSys = Math.round(v * 100)
  }
)

const onGuestMicSlider = (): void => emit('updateGuestMicVolume', volumes.value.guestMic / 100)
const onRemoteMicSlider = (): void => emit('updateMicVolume', volumes.value.remoteMic / 100)
const onRemoteSysSlider = (): void => emit('updateSysVolume', volumes.value.remoteSys / 100)

// --- Popover ---
const activePopover = ref<PopoverKey | null>(null)
const guestMicBtn = ref<HTMLElement | null>(null)
const remoteMicBtn = ref<HTMLElement | null>(null)
const remoteSysBtn = ref<HTMLElement | null>(null)

let leaveTimer: ReturnType<typeof setTimeout> | null = null

const btnRefMap: Record<PopoverKey, typeof guestMicBtn> = {
  guestMic: guestMicBtn,
  remoteMic: remoteMicBtn,
  remoteSys: remoteSysBtn
}

function popoverStyle(key: PopoverKey): Record<string, string> {
  const btn = btnRefMap[key].value
  if (!btn || !rootEl.value) return { left: '0px' }
  const barRect = rootEl.value.getBoundingClientRect()
  const btnRect = btn.getBoundingClientRect()
  const left = Math.round(btnRect.left - barRect.left + btnRect.width / 2 - 44)
  return { left: `${left}px` }
}

const scheduleLeave = (): void => {
  leaveTimer = setTimeout(() => {
    activePopover.value = null
  }, 350)
}

const cancelLeave = (): void => {
  if (leaveTimer) {
    clearTimeout(leaveTimer)
    leaveTimer = null
  }
}

// --- Hold logic ---
let holdTimer: ReturnType<typeof setTimeout> | null = null
let holdFired = false

function holdStart(key: PopoverKey): void {
  holdFired = false
  holdTimer = setTimeout(() => {
    holdFired = true
    holdTimer = null
    cancelLeave()
    activePopover.value = key
  }, 280)
}

function holdCancel(): void {
  if (holdTimer) {
    clearTimeout(holdTimer)
    holdTimer = null
  }
}

function holdUp(key: PopoverKey, toggleFn: () => void): void {
  if (!holdFired) {
    holdCancel()
    if (activePopover.value === key) {
      scheduleLeave()
    } else {
      toggleFn()
    }
  }
  holdFired = false
}

// --- Drag ---
const rootEl = ref<HTMLElement | null>(null)
const x = ref(props.initialX)
const y = ref(props.initialY)

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
  x.value = Math.min(
    Math.max(0, event.clientX - dragOffsetX),
    Math.max(0, parentRect.width - node.offsetWidth)
  )
  y.value = Math.min(
    Math.max(0, event.clientY - dragOffsetY),
    Math.max(0, parentRect.height - node.offsetHeight)
  )
}

const onPointerUp = (event: PointerEvent): void => {
  const target = event.currentTarget as HTMLElement
  target.removeEventListener('pointermove', onPointerMove)
  target.removeEventListener('pointerup', onPointerUp)
  target.removeEventListener('pointercancel', onPointerUp)
  if (target.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId)
  activePointerId = null
}

onBeforeUnmount(() => {
  holdCancel()
  cancelLeave()
  if (rootEl.value && activePointerId !== null) {
    rootEl.value.removeEventListener('pointermove', onPointerMove)
    rootEl.value.removeEventListener('pointerup', onPointerUp)
  }
})
</script>

<style scoped>
.popover-card {
  position: absolute;
  top: 2px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: 88px;
  padding: 10px;
  background: #0c0c0c;
  border: 1px dashed rgba(139, 92, 246, 0.45);
  border-top: none;
  border-radius: 0 0 14px 14px;
  z-index: 60;
  animation: slide-down 0.15s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  transform-origin: top center;
}

@keyframes slide-down {
  from {
    opacity: 0;
    transform: translateY(-8px) scaleY(0.85);
  }
  to {
    opacity: 1;
    transform: translateY(0) scaleY(1);
  }
}

.popover-icons {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.popover-icon {
  width: 20px;
  height: 20px;
  transition: color 0.15s;
}

.icon-on {
  color: #a78bfa;
}

.icon-off {
  color: #f87171;
}

.icon-dim {
  color: #2a2a3a;
}

.popover-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 4px;
  border-radius: 2px;
  background: linear-gradient(
    to right,
    #7c3aed calc(var(--val, 80) * 1%),
    #2a2a3a calc(var(--val, 80) * 1%)
  );
  outline: none;
  cursor: pointer;
}

.popover-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #a78bfa;
  border: 2px solid #0c0c0c;
  box-shadow: 0 0 6px rgba(139, 92, 246, 0.6);
  cursor: pointer;
  transition: background 0.15s;
}

.popover-slider::-webkit-slider-thumb:hover {
  background: #c4b5fd;
}
</style>
