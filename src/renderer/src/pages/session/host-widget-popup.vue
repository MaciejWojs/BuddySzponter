<template>
  <div
    class="w-full h-full flex items-start justify-center pt-0"
    @mouseleave="onMouseLeave"
    @mouseenter="cancelLeave"
  >
    <div v-if="popupKey" class="card">
      <div class="icons">
        <svg
          class="icon"
          :class="isActive ? 'icon-on' : 'icon-dim'"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="1.75"
        >
          <path v-for="(d, i) in iconPaths[popupKey]" :key="i" v-bind="d" />
          <circle
            v-if="popupKey === 'guestMic'"
            cx="9"
            cy="7"
            r="4"
            stroke="currentColor"
            fill="none"
          />
        </svg>

        <svg
          class="icon"
          :class="!isActive ? 'icon-off' : 'icon-dim'"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="1.75"
        >
          <path v-for="(d, i) in iconPaths[popupKey]" :key="i" v-bind="d" />
          <circle
            v-if="popupKey === 'guestMic'"
            cx="9"
            cy="7"
            r="4"
            stroke="currentColor"
            fill="none"
          />
          <line x1="1" y1="1" x2="23" y2="23" stroke-linecap="round" />
        </svg>
      </div>

      <input
        v-model.number="volume"
        type="range"
        min="0"
        max="100"
        class="slider"
        :style="`--val:${volume}`"
        @input="onVolumeChange"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

type PopupKey = 'mic' | 'sys' | 'guestMic'

const popupKey = ref<PopupKey | null>(null)
const isActive = ref(true)
const volume = ref(80)

let channel: BroadcastChannel | null = null
let leaveTimer: ReturnType<typeof setTimeout> | null = null

const iconPaths: Record<PopupKey, Array<Record<string, string>>> = {
  mic: [
    {
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      d: 'M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z'
    },
    {
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      d: 'M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8'
    }
  ],
  sys: [
    {
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      d: 'M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07'
    }
  ],
  guestMic: [
    {
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      d: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2'
    },
    {
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      d: 'M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75'
    }
  ]
}

function onVolumeChange(): void {
  channel?.postMessage({ type: 'POPUP_VOLUME_CHANGE', key: popupKey.value, volume: volume.value })
}

function onMouseLeave(): void {
  leaveTimer = setTimeout(async () => {
    channel?.postMessage({ type: 'POPUP_CLOSE' })
    await window.api?.app?.hideHostWidgetPopup?.()
  }, 350)
}

function cancelLeave(): void {
  if (leaveTimer) {
    clearTimeout(leaveTimer)
    leaveTimer = null
  }
}

onMounted(() => {
  channel = new BroadcastChannel('widget-popup-channel')

  channel.onmessage = (event) => {
    if (event.data.type === 'POPUP_INIT') {
      popupKey.value = event.data.key
      isActive.value = event.data.isActive
      volume.value = event.data.volume ?? 80
    }
  }

  channel.postMessage({ type: 'POPUP_READY' })
})

onUnmounted(() => {
  channel?.close()
  channel = null
})
</script>

<style scoped>
:global(html),
:global(body),
:global(#app) {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  background: transparent;
  overflow: hidden;
}

.card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: 88px;
  padding: 10px 10px 10px;
  background: #0c0c0c;
  border: 1px dashed rgba(139, 92, 246, 0.45);
  border-top: none;
  border-radius: 0 0 14px 14px;
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

.label {
  align-self: flex-start;
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: rgba(167, 139, 250, 0.6);
  white-space: nowrap;
  font-family: system-ui, sans-serif;
}

.icons {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.icon {
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

.slider {
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

.slider::-webkit-slider-thumb {
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

.slider::-webkit-slider-thumb:hover {
  background: #c4b5fd;
}
</style>
