<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'
import { useConnectionStore } from '@renderer/stores/connectionStore'
import { useSocketStore } from '@renderer/stores/socketStore'
import { useWebRtcStore } from '@renderer/stores/webRtcStore'
import { videoService } from '@renderer/composables/video/videoService'

// --- STORES & EMITS ---
const connectionStore = useConnectionStore()
const socketStore = useSocketStore()
const webRtcStore = useWebRtcStore()

const emit = defineEmits<{
  (e: 'log-result', action: string, data: unknown, source?: 'api' | 'socket'): void
}>()

// ==========================================
// --- LOGIKA HOSTA (PRZECHWYTYWANIE WIDEO) ---
// ==========================================
const localVideoRef = ref<HTMLVideoElement | null>(null)

function startCapture(): void {
  if (videoService.isRunning) return
  emit('log-result', 'NATIVE_CAPTURE', 'Rozpoczynanie przechwytywania (Service)...', 'api')

  try {
    const stream = videoService.start()

    if (localVideoRef.value) {
      localVideoRef.value.srcObject = stream
    }

    if (webRtcStore.rtcStatus === 'disconnected') {
      webRtcStore.localStream = stream
    } else {
      webRtcStore.publishLocalStream(stream)
    }
  } catch (err) {
    console.error(err)
    emit('log-result', 'ERROR', `Błąd przechwytywania: ${err}`, 'api')
  }
}

function stopCapture(): void {
  if (!videoService.isRunning) return

  emit('log-result', 'NATIVE_CAPTURE', 'Zatrzymano przechwytywanie ekranu.', 'api')

  videoService.stop()

  if (localVideoRef.value) {
    localVideoRef.value.srcObject = null
  }

  if (webRtcStore.localStream) {
    webRtcStore.localStream.getTracks().forEach((t) => t.stop())
  }
  webRtcStore.localStream = null
}

const placeholderAction = (name: string): void => {
  console.log(`[Akcja Użytkownika] Kliknięto przycisk: ${name}`)
  alert(`Funkcja "${name}" jest w przygotowaniu! Będzie wysyłana przez DataChannel.`)
}

// ==========================================
// --- LOGIKA GOŚCIA (ZDALNE WIDEO) ---
// ==========================================
const remoteVideoRef = ref<HTMLVideoElement | null>(null)

watch(
  () => webRtcStore.remoteStream,
  (stream) => {
    if (remoteVideoRef.value && stream) {
      remoteVideoRef.value.srcObject = stream
    } else if (remoteVideoRef.value && !stream) {
      remoteVideoRef.value.srcObject = null
    }
  },
  { immediate: true }
)

// ==========================================
// --- NASŁUCHIWANIE ZMIAN WS (LOGI) ---
// ==========================================
watch(
  () => socketStore.isConnected,
  (isConnected) => {
    emit(
      'log-result',
      isConnected ? 'WS_CONNECTED' : 'WS_DISCONNECTED',
      isConnected ? 'Nawiązano połączenie' : 'Rozłączono',
      'socket'
    )
  }
)

watch(
  () => socketStore.incomingRequest,
  (request) => {
    if (request) emit('log-result', 'WS_INCOMING_REQUEST', request, 'socket')
  }
)

watch(
  () => connectionStore.connectionCode,
  (code) => {
    if (code) emit('log-result', 'CONNECTION_CODE_SET', `Kod: ${code}`, 'api')
  }
)

watch(
  () => socketStore.isAcknowledged,
  (ack) => {
    if (ack) emit('log-result', 'WS_ACK_RECEIVED', 'Handshake zakończony!', 'socket')
  }
)

// ==========================================
// --- NAKŁADKI NA AKCJE ---
// ==========================================
const handleRespond = async (accept: boolean): Promise<void> => {
  emit('log-result', 'WS_SENDING_RESPONSE', `Odpowiedź: ${accept}`, 'socket')

  if (accept) {
    startCapture()
  }

  await socketStore.respondToRequest(accept)
}

const handleManualConnect = async (): Promise<void> => {
  emit('log-result', 'WS_MANUAL_CONNECT', 'Łączenie...', 'socket')
  await socketStore.connect('awaryjny-token-z-palca')
}

const handleManualDisconnect = async (): Promise<void> => {
  emit('log-result', 'WS_MANUAL_DISCONNECT', 'Rozłączanie...', 'socket')
  await socketStore.disconnect()
}

onUnmounted(() => {
  stopCapture()
})
</script>

<template>
  <div
    class="bg-[#1e1e1e] border border-[#333] rounded-lg p-5 col-span-1 md:col-span-2 shadow-xl relative overflow-hidden shrink-0 mb-8"
  >
    <header class="flex justify-between items-center mb-5">
      <div>
        <h2 class="text-xl font-bold text-white m-0">Panel Połączenia P2P</h2>
        <p class="text-[11px] text-gray-500 uppercase tracking-widest font-semibold mt-1">
          Rola:
          <span :class="connectionStore.isHost ? 'text-purple-400' : 'text-blue-400'">
            {{ connectionStore.isHost ? 'Host' : 'Gość' }}
          </span>
        </p>
      </div>

      <div class="flex flex-col gap-2 items-end">
        <div
          class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 border border-[#444] shadow-inner"
        >
          <div
            class="w-2.5 h-2.5 rounded-full transition-colors duration-300"
            :class="
              socketStore.isConnected ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-rose-500'
            "
          ></div>
          <span class="text-xs font-mono uppercase tracking-wider text-gray-300">
            WS: {{ socketStore.isConnected ? 'POŁĄCZONO' : 'ROZŁĄCZONO' }}
          </span>
        </div>
        <div
          class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 border border-[#444] shadow-inner"
        >
          <div
            class="w-2.5 h-2.5 rounded-full transition-colors duration-300"
            :class="{
              'bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse':
                webRtcStore.rtcStatus === 'connected',
              'bg-blue-500 shadow-[0_0_8px_#3b82f6] animate-pulse':
                webRtcStore.rtcStatus === 'connecting',
              'bg-gray-600': webRtcStore.rtcStatus === 'disconnected'
            }"
          ></div>
          <span class="text-xs font-mono uppercase tracking-wider text-gray-300">
            P2P: {{ webRtcStore.rtcStatus.toUpperCase() }}
          </span>
        </div>
      </div>
    </header>

    <transition name="slide-down">
      <section
        v-if="socketStore.incomingRequest"
        class="relative p-4 mb-5 bg-blue-950/30 border border-blue-500/50 rounded-xl shadow-lg shadow-blue-500/10 overflow-hidden"
      >
        <div
          class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-indigo-500"
        ></div>
        <div class="flex items-start gap-3">
          <div class="p-2 bg-blue-500/20 rounded-lg text-xl animate-bounce">🔔</div>
          <div class="flex-1">
            <h3 class="text-sm font-bold text-blue-300 m-0">Nowa prośba o dostęp!</h3>
            <p
              class="text-[10px] text-blue-400/70 font-mono mt-1 bg-black/30 p-1.5 rounded inline-block"
            >
              ID Sesji: {{ socketStore.incomingRequest.sessionId }}
            </p>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3 mt-4">
          <button
            class="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-all active:scale-95 shadow-lg shadow-emerald-900/20"
            @click="handleRespond(true)"
          >
            ✅ Akceptuj
          </button>
          <button
            class="py-2.5 px-4 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-all active:scale-95 shadow-lg shadow-rose-900/20"
            @click="handleRespond(false)"
          >
            ❌ Odrzuć
          </button>
        </div>
      </section>
    </transition>

    <div class="border-t border-[#333] pt-5 mt-2">
      <div v-if="connectionStore.isHost">
        <div class="flex justify-between items-end mb-4">
          <h3 class="text-sm font-bold text-emerald-400 uppercase tracking-widest">
            Zarządzanie Ekranem (Host)
          </h3>
          <div class="flex gap-2">
            <button
              class="px-3 py-1.5 bg-[#222] border border-[#444] hover:bg-[#333] hover:border-yellow-500 text-gray-300 hover:text-yellow-400 rounded text-xs font-bold transition-all"
              @click="placeholderAction('Wstrzymaj Obraz')"
            >
              Wstrzymaj Obraz
            </button>
            <button
              class="px-3 py-1.5 bg-[#222] border border-[#444] hover:bg-[#333] hover:border-blue-500 text-gray-300 hover:text-blue-400 rounded text-xs font-bold transition-all"
              @click="placeholderAction('Zmniejsz Jakość')"
            >
              Zmniejsz Jakość
            </button>
          </div>
        </div>
        <div class="flex gap-3 mb-4">
          <button
            :disabled="!videoService.isRunning"
            class="px-4 py-2 bg-[#333] hover:bg-[#444] disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed rounded text-white text-sm font-bold transition-colors border border-[#444]"
            @click="stopCapture"
          >
            ■ Zatrzymaj
          </button>
        </div>
        <div
          class="bg-black border border-[#444] rounded-lg overflow-hidden aspect-video relative flex items-center justify-center shadow-[0_0_15px_rgba(0,0,0,0.5)]"
        >
          <div
            v-if="!videoService.isRunning"
            class="text-gray-500 text-xs font-mono absolute z-10 pointer-events-none"
          >
            Brak strumienia. Uruchom przechwytywanie przed akceptacją gościa.
          </div>
          <video
            v-show="videoService.isRunning"
            ref="localVideoRef"
            autoplay
            playsinline
            muted
            class="w-full h-full object-contain absolute inset-0"
          ></video>
        </div>
      </div>

      <div v-else>
        <div v-if="connectionStore.connectionCode" class="mb-4 text-center">
          <div
            v-if="socketStore.isAcknowledged"
            class="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg"
          >
            <p class="text-xs text-emerald-400 font-bold">
              Połączono z sesją: {{ connectionStore.connectionCode }}
            </p>
          </div>
          <div v-else class="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <p class="text-xs text-blue-400 font-bold animate-pulse">
              Oczekiwanie na akceptację przez Hosta...
            </p>
          </div>
        </div>

        <h3 class="text-sm font-bold text-blue-400 uppercase tracking-widest mb-4">
          Zdalny Ekran Partnera
        </h3>
        <div
          class="bg-black border border-[#444] rounded-lg overflow-hidden aspect-video relative flex items-center justify-center shadow-[0_0_15px_rgba(0,0,0,0.5)]"
        >
          <video
            ref="remoteVideoRef"
            autoplay
            playsinline
            muted
            class="w-full h-full object-contain absolute inset-0 transition-opacity duration-500"
            :class="webRtcStore.remoteStream ? 'opacity-100' : 'opacity-0'"
          ></video>

          <div
            v-if="webRtcStore.remoteMouse && webRtcStore.remoteStream"
            class="absolute w-4 h-4 bg-rose-500 rounded-full blur-[2px] transition-transform duration-75 ease-linear pointer-events-none shadow-[0_0_10px_#f43f5e] z-50 origin-center"
            :style="{
              transform: `translate(calc(${webRtcStore.remoteMouse.x}% - 50%), calc(${webRtcStore.remoteMouse.y}% - 50%))`
            }"
          ></div>

          <div
            v-if="!webRtcStore.remoteStream"
            class="flex flex-col items-center gap-3 text-gray-500 z-10 p-5 text-center"
          >
            <svg
              class="w-12 h-12 opacity-30 animate-pulse"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            <p class="text-xs font-mono m-0">
              {{
                webRtcStore.rtcStatus === 'connected'
                  ? 'Oczekiwanie na obraz (WebRTC)...'
                  : 'Połącz się, aby zobaczyć ekran.'
              }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <footer class="pt-4 mt-6 border-t border-[#333] flex justify-between items-center">
      <span class="text-[10px] text-gray-600 uppercase font-bold">Narzędzia Debugowania WS</span>
      <div class="flex gap-2">
        <button
          v-if="!socketStore.isConnected"
          class="px-4 py-2 bg-[#333] hover:bg-[#444] text-gray-300 text-xs font-semibold rounded transition-colors"
          @click="handleManualConnect()"
        >
          Połącz ręcznie
        </button>
        <button
          v-if="socketStore.isConnected"
          class="px-4 py-2 bg-transparent border border-[#444] hover:border-rose-500 hover:text-rose-400 text-gray-400 text-xs font-semibold rounded transition-colors"
          @click="handleManualDisconnect()"
        >
          Rozłącz gniazdko
        </button>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-20px) scale(0.95);
}
</style>
