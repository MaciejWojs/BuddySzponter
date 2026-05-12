<template>
  <main
    class="w-full h-full px-3 bg-[#090909]/95 border border-[#1c1c1c] flex items-center gap-0 text-[#e8e8e8] select-none rounded-2xl"
    style="-webkit-app-region: drag"
  >
    <!-- Left controls -->
    <div class="flex items-center gap-0.5" style="-webkit-app-region: no-drag">
      <!-- Mic -->
      <button
        ref="micBtn"
        class="flex items-center justify-center w-9 h-9 rounded-lg transition-all group"
        :class="
          state.micActive
            ? 'text-violet-400 hover:text-violet-200'
            : 'text-rose-400 hover:text-rose-300'
        "
        :title="state.micActive ? 'Wycisz swój mikrofon' : 'Włącz mikrofon'"
        @mousedown="startHold('mic', micBtn)"
        @mouseup="onButtonUp('mic', 'TOGGLE_MIC')"
        @mouseleave="cancelHold"
      >
        <svg
          class="w-[18px] h-[18px] group-active:scale-90 transition-transform"
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
      </button>

      <!-- System audio -->
      <button
        ref="sysBtn"
        class="flex items-center justify-center w-9 h-9 rounded-lg transition-all group"
        :class="
          state.sysActive
            ? 'text-violet-400 hover:text-violet-200'
            : 'text-rose-400 hover:text-rose-300'
        "
        :title="state.sysActive ? 'Wycisz dźwięk systemu' : 'Udostępniaj dźwięk systemu'"
        @mousedown="startHold('sys', sysBtn)"
        @mouseup="onButtonUp('sys', 'TOGGLE_SYSTEM')"
        @mouseleave="cancelHold"
      >
        <svg
          class="w-[18px] h-[18px] group-active:scale-90 transition-transform"
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
          <line v-if="!state.sysActive" x1="1" y1="1" x2="23" y2="23" stroke-linecap="round" />
        </svg>
      </button>

      <!-- Chat -->
      <button
        class="relative flex items-center justify-center w-9 h-9 rounded-lg transition-all group"
        :class="
          state.chatHasUnread
            ? 'text-violet-300 hover:text-violet-100'
            : 'text-violet-500 hover:text-violet-300'
        "
        :title="state.chatHasUnread ? 'Czat — nowe wiadomości' : 'Otwórz czat'"
        @click="$emit('toggleChat')"
      >
        <svg
          class="w-[18px] h-[18px] group-active:scale-90 transition-transform"
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
          v-if="state.chatHasUnread"
          class="absolute top-1.5 right-1.5 inline-flex h-2 w-2 rounded-full bg-orange-500"
        />
      </button>

      <!-- Guest mic -->
      <button
        ref="guestMicBtn"
        class="flex items-center justify-center w-9 h-9 rounded-lg transition-all group"
        :class="
          state.guestMicActive
            ? 'text-violet-400 hover:text-violet-200'
            : 'text-[#3a3a4a] hover:text-violet-500'
        "
        :title="state.guestMicActive ? 'Wycisz mikrofon gościa' : 'Odwiesz mikrofon gościa'"
        @mousedown="startHold('guestMic', guestMicBtn)"
        @mouseup="onButtonUp('guestMic', 'TOGGLE_GUEST_MIC')"
        @mouseleave="cancelHold"
      >
        <svg
          class="w-[18px] h-[18px] group-active:scale-90 transition-transform"
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
      </button>

      <!-- Guest system audio -->
      <button
        ref="guestSysBtn"
        class="flex items-center justify-center w-9 h-9 rounded-lg transition-all group text-violet-500 hover:text-violet-300"
        title="Głośność dźwięku gościa"
        @mousedown="startHold('guestSys', guestSysBtn)"
        @mouseup="onButtonUp('guestSys', null)"
        @mouseleave="cancelHold"
      >
        <svg
          class="w-[18px] h-[18px] group-active:scale-90 transition-transform"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="1.75"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M11 5L6 9H2v6h4l5 4V5zM15.54 8.46a5 5 0 0 1 0 7.07"
          />
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M17 21v-2a2 2 0 0 0-2-2h-1M16 3.13a4 4 0 0 1 0 7.75"
          />
        </svg>
      </button>
    </div>

    <!-- Divider -->
    <div class="w-px h-5 bg-[#252525] mx-2 shrink-0" style="-webkit-app-region: drag"></div>

    <!-- Guest name -->
    <div class="flex-1 flex items-center justify-center" style="-webkit-app-region: drag">
      <span class="text-sm font-medium text-violet-400 tracking-wide">{{ guestName }}</span>
    </div>

    <!-- Divider -->
    <div class="w-px h-5 bg-[#252525] mx-2 shrink-0" style="-webkit-app-region: drag"></div>

    <!-- Right controls -->
    <div class="flex items-center gap-0.5" style="-webkit-app-region: no-drag">
      <button
        class="flex items-center justify-center w-9 h-9 rounded-lg transition-all group"
        :class="
          state.controlGranted
            ? 'text-violet-300 hover:text-violet-100'
            : 'text-violet-500 hover:text-violet-300'
        "
        :title="
          state.controlGranted
            ? 'Zabierz kontrolę myszy/klawiatury'
            : 'Oddaj kontrolę myszy/klawiatury'
        "
        @click="$emit('sendCommand', 'TOGGLE_CONTROL')"
      >
        <svg
          class="w-[18px] h-[18px] group-active:scale-90 transition-transform"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="1.75"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 3l14 9-7 1-4 7L5 3z" />
        </svg>
      </button>

      <button
        class="flex items-center justify-center w-9 h-9 rounded-lg transition-all group"
        :class="[
          !state.controlGranted
            ? 'text-[#2a2a3a] cursor-not-allowed'
            : state.clipboardSyncEnabled
              ? 'text-violet-300 hover:text-violet-100'
              : 'text-violet-500 hover:text-violet-300'
        ]"
        :title="
          !state.controlGranted
            ? 'Synchronizacja schowka wymaga oddania kontroli'
            : state.clipboardSyncEnabled
              ? 'Wyłącz synchronizację schowka'
              : 'Włącz synchronizację schowka'
        "
        :disabled="!state.controlGranted"
        @click="$emit('sendCommand', 'TOGGLE_CLIPBOARD_SYNC')"
      >
        <svg
          class="w-[18px] h-[18px] group-active:scale-90 transition-transform"
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

      <button
        class="flex items-center justify-center w-9 h-9 rounded-lg transition-all group text-violet-500 hover:text-violet-300"
        title="Następny monitor"
        @click="$emit('goToNextMonitor')"
      >
        <svg
          class="w-[18px] h-[18px] group-active:scale-90 transition-transform"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="1.75"
        >
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      </button>

      <!-- Divider -->
      <div class="w-px h-5 bg-[#252525] mx-1.5 shrink-0"></div>

      <!-- Minimize / hide buttons -->
      <div class="flex flex-col gap-0.5">
        <button
          class="flex items-center justify-center w-6 h-[17px] rounded text-[#3a3a5a] hover:text-violet-400 transition-colors"
          title="Schowaj na górę ekranu"
          @click="$emit('setWidgetMode', 'hidden')"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
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
          class="flex items-center justify-center w-6 h-[17px] rounded text-[#3a3a5a] hover:text-violet-400 transition-colors"
          title="Zwiń do małego okna"
          @click="$emit('setWidgetMode', 'compact')"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
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
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

type PopupKey = 'mic' | 'sys' | 'guestMic' | 'guestSys'

const props = defineProps<{
  guestName?: string
  state: {
    micActive: boolean
    sysActive: boolean
    guestMicActive: boolean
    controlGranted: boolean
    clipboardSyncEnabled: boolean
    chatHasUnread: boolean
  }
}>()

const emit = defineEmits<{
  (e: 'sendCommand', actionType: string, payload?: unknown): void
  (e: 'goToNextMonitor'): void
  (e: 'setWidgetMode', mode: 'normal' | 'compact' | 'hidden' | 'peek'): void
  (e: 'toggleChat'): void
}>()

const micBtn = ref<HTMLElement | null>(null)
const sysBtn = ref<HTMLElement | null>(null)
const guestMicBtn = ref<HTMLElement | null>(null)
const guestSysBtn = ref<HTMLElement | null>(null)

const volumes = ref<Record<PopupKey, number>>({ mic: 80, sys: 80, guestMic: 80, guestSys: 80 })

let holdTimer: ReturnType<typeof setTimeout> | null = null
let holdFired = false
let popupChannel: BroadcastChannel | null = null

const activeStateMap = (): Record<PopupKey, boolean> => ({
  mic: props.state.micActive,
  sys: props.state.sysActive,
  guestMic: props.state.guestMicActive,
  guestSys: true
})

function startHold(key: PopupKey, btnRef: HTMLElement | null): void {
  holdFired = false
  holdTimer = setTimeout(async () => {
    holdFired = true
    holdTimer = null
    if (!btnRef) return

    const rect = btnRef.getBoundingClientRect()
    const winX = window.screenX
    const winY = window.screenY
    const POPUP_W = 104

    const popupX = Math.round(winX + rect.left + rect.width / 2 - POPUP_W / 2)
    const popupY = winY + 60 + 2

    popupChannel?.postMessage({
      type: 'POPUP_INIT',
      key,
      isActive: activeStateMap()[key],
      volume: volumes.value[key]
    })

    await window.api?.app?.showHostWidgetPopup?.(popupX, popupY)
  }, 280)
}

function cancelHold(): void {
  if (holdTimer) {
    clearTimeout(holdTimer)
    holdTimer = null
  }
}

function onButtonUp(_key: PopupKey, command: string | null): void {
  if (!holdFired) {
    cancelHold()
    if (command) emit('sendCommand', command)
  }
  holdFired = false
}

onMounted(() => {
  popupChannel = new BroadcastChannel('widget-popup-channel')

  popupChannel.onmessage = (event) => {
    if (event.data.type === 'POPUP_VOLUME_CHANGE') {
      const key = event.data.key as PopupKey
      volumes.value[key] = event.data.volume

      const commandMap: Record<PopupKey, string> = {
        mic: 'SET_MIC_VOLUME',
        sys: 'SET_SYS_VOLUME',
        guestMic: 'SET_GUEST_MIC_VOLUME',
        guestSys: 'SET_GUEST_SYS_VOLUME'
      }
      emit('sendCommand', commandMap[key], event.data.volume)
    }

    if (event.data.type === 'POPUP_READY') {
      // popup window just (re)loaded — nothing to do unless a popup was open
    }
  }
})

onUnmounted(() => {
  popupChannel?.close()
  popupChannel = null
})
</script>
