<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { useConnectionStore } from '@renderer/stores/connectionStore'
import { useSocketStore } from '@renderer/stores/socketStore'
import { useWebRtcStore } from '@renderer/stores/webRtcStore'
import { SessionStore } from '@renderer/stores/sessionStore' // Używamy poprawnej nazwy composable z Pinii

import RemoteAudioPlayer from '../p2p/RemoteAudioPlayer.vue'
import VideoPlayer from '../p2p/VideoPlayer.vue'

const connectionStore = useConnectionStore()
const socketStore = useSocketStore()
const webRtcStore = useWebRtcStore()
const sessionStore = SessionStore()

// FIX: Dodane : void do każdej z tych funkcji dla ESLint
const handleManualConnect = (): void => void socketStore.connect('awaryjny-token-z-palca')
const handleManualDisconnect = (): void => void socketStore.disconnect()
const placeholderAction = (name: string): void => alert(`Funkcja "${name}" jest w przygotowaniu!`)

// Mapowanie do diagnostyki
// FIX: Dodany typ zwracany z funkcji
const mapStreamToDebug = (
  stream: MediaStream | null
): Array<{
  id: string
  source: 'screen' | 'system-audio' | 'microphone'
  kind: string
  contentHint: string
  enabled: boolean
  muted: boolean
  readyState: string
}> => {
  if (!stream) return []
  return stream.getTracks().map((track) => ({
    id: track.id,
    source:
      track.kind === 'video'
        ? 'screen'
        : track.contentHint === 'music'
          ? 'system-audio'
          : 'microphone',
    kind: track.kind,
    contentHint: track.contentHint || '-',
    enabled: track.enabled,
    muted: track.muted,
    readyState: track.readyState
  }))
}

const localTrackDiagnostics = computed(() => mapStreamToDebug(webRtcStore.localStream))
const remoteTrackDiagnostics = computed(() => mapStreamToDebug(webRtcStore.remoteStream))
const captureModeLabel = computed(() => {
  if (window.screenCapture) return 'screenCapture / sharedTexture (z fallback raw buffer)'
  if (window.capture) return 'capture / raw buffer'
  return 'brak mechanizmu przechwytywania'
})

onMounted(() => {
  sessionStore.refreshMicrophoneDevices().catch(() => {})
})

onUnmounted(() => {
  sessionStore.stopCapture().catch(() => {})
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
          class="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-blue-400 to-indigo-500"
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
            @click="sessionStore.handleRespond(true)"
          >
            ✅ Akceptuj
          </button>
          <button
            class="py-2.5 px-4 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-all active:scale-95 shadow-lg shadow-rose-900/20"
            @click="sessionStore.handleRespond(false)"
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
            :disabled="!sessionStore.isCapturing"
            class="px-4 py-2 bg-[#333] hover:bg-[#444] disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed rounded text-white text-sm font-bold transition-colors border border-[#444]"
            @click="sessionStore.stopCapture()"
          >
            ■ Zatrzymaj
          </button>
        </div>

        <div class="text-[11px] text-gray-400 mb-4">
          Tryb przechwytywania: {{ captureModeLabel }}
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div
            class="flex items-center justify-between px-4 py-3 rounded-lg border border-[#444] bg-black/40"
          >
            <span class="text-xs font-medium text-gray-200">Audio systemowe</span>
            <button
              type="button"
              class="relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
              :class="sessionStore.includeSystemAudio ? 'bg-emerald-500' : 'bg-[#444]'"
              @click="sessionStore.includeSystemAudio = !sessionStore.includeSystemAudio"
            >
              <span
                class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                :class="sessionStore.includeSystemAudio ? 'translate-x-5' : 'translate-x-0'"
              ></span>
            </button>
          </div>
          <div
            class="flex items-center justify-between px-4 py-3 rounded-lg border border-[#444] bg-black/40"
          >
            <span class="text-xs font-medium text-gray-200">Mikrofon</span>
            <button
              type="button"
              class="relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
              :class="sessionStore.includeMicrophone ? 'bg-blue-500' : 'bg-[#444]'"
              @click="sessionStore.includeMicrophone = !sessionStore.includeMicrophone"
            >
              <span
                class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                :class="sessionStore.includeMicrophone ? 'translate-x-5' : 'translate-x-0'"
              ></span>
            </button>
          </div>

          <div class="px-4 py-3 rounded-lg border border-[#444] bg-black/40">
            <label class="block text-xs text-gray-300 font-medium mb-2" for="microphone-select">
              Wybierz mikrofon
            </label>
            <div class="flex gap-2 items-center">
              <select
                id="microphone-select"
                v-model="sessionStore.microphoneDeviceId"
                class="w-full rounded bg-[#111] border border-[#444] text-sm text-gray-200 px-3 py-2 focus:outline-none focus:border-blue-500"
              >
                <option
                  v-for="device in sessionStore.availableMicrophoneDevices"
                  :key="device.deviceId"
                  :value="device.deviceId"
                >
                  {{ device.label }}
                </option>
              </select>
              <button
                type="button"
                class="px-3 py-2 bg-[#222] border border-[#444] text-xs text-gray-300 rounded hover:bg-[#333]"
                @click="sessionStore.refreshMicrophoneDevices()"
              >
                Odśwież
              </button>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div class="px-4 py-3 rounded-lg border border-[#444] bg-black/40 flex flex-col gap-3">
            <div class="flex justify-between items-center text-xs text-gray-300 font-medium">
              <span>Głośność systemu (Nasza)</span>
              <span class="font-mono text-emerald-400"
                >{{ Math.round(webRtcStore.localSystemAudioVolume * 100) }}%</span
              >
            </div>
            <input
              v-model.number="webRtcStore.localSystemAudioVolume"
              type="range"
              min="0"
              max="2"
              step="0.01"
              class="custom-slider emerald-slider"
            />
          </div>
          <div class="px-4 py-3 rounded-lg border border-[#444] bg-black/40 flex flex-col gap-3">
            <div class="flex justify-between items-center text-xs text-gray-300 font-medium">
              <span>Głośność mikrofonu (Nasza)</span>
              <span class="font-mono text-blue-400"
                >{{ Math.round(webRtcStore.localMicrophoneVolume * 100) }}%</span
              >
            </div>
            <input
              v-model.number="webRtcStore.localMicrophoneVolume"
              type="range"
              min="0"
              max="2"
              step="0.01"
              class="custom-slider blue-slider"
            />
          </div>
        </div>

        <div class="grid grid-cols-1 gap-3 mb-4">
          <div class="px-4 py-3 rounded-lg border border-[#444] bg-black/40 flex flex-col gap-3">
            <div class="flex justify-between items-center text-xs text-gray-300 font-medium">
              <span>Odsłuch Gościa (Jego mikrofon)</span>
              <span class="font-mono text-cyan-400"
                >{{ Math.round(webRtcStore.remoteMicVolume * 100) }}%</span
              >
            </div>
            <input
              v-model.number="webRtcStore.remoteMicVolume"
              type="range"
              min="0"
              max="1"
              step="0.01"
              class="custom-slider cyan-slider"
            />
          </div>
        </div>

        <VideoPlayer
          v-if="sessionStore.isCapturing"
          :stream="webRtcStore.localStream"
          placeholder-text="Brak strumienia. Uruchom przechwytywanie przed akceptacją gościa."
        />
        <div
          v-else
          class="bg-black border border-[#444] rounded-lg overflow-hidden aspect-video relative flex items-center justify-center shadow-[0_0_15px_rgba(0,0,0,0.5)]"
        >
          <div class="text-gray-500 text-xs font-mono absolute z-10 pointer-events-none">
            Brak strumienia. Uruchom przechwytywanie przed akceptacją gościa.
          </div>
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

        <div class="grid grid-cols-1 gap-3 mb-5">
          <div
            class="flex items-center justify-between px-4 py-3 rounded-lg border border-[#444] bg-black/40"
          >
            <span class="text-xs font-medium text-gray-200">Twój mikrofon</span>
            <button
              type="button"
              class="relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
              :class="sessionStore.includeMicrophone ? 'bg-blue-500' : 'bg-[#444]'"
              @click="sessionStore.includeMicrophone = !sessionStore.includeMicrophone"
            >
              <span
                class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                :class="sessionStore.includeMicrophone ? 'translate-x-5' : 'translate-x-0'"
              ></span>
            </button>
          </div>

          <div class="px-4 py-3 rounded-lg border border-[#444] bg-black/40">
            <label
              class="block text-xs text-gray-300 font-medium mb-2"
              for="guest-microphone-select"
            >
              Wybierz mikrofon
            </label>
            <div class="flex gap-2 items-center">
              <select
                id="guest-microphone-select"
                v-model="sessionStore.microphoneDeviceId"
                class="w-full rounded bg-[#111] border border-[#444] text-sm text-gray-200 px-3 py-2 focus:outline-none focus:border-blue-500"
              >
                <option
                  v-for="device in sessionStore.availableMicrophoneDevices"
                  :key="device.deviceId"
                  :value="device.deviceId"
                >
                  {{ device.label }}
                </option>
              </select>
              <button
                type="button"
                class="px-3 py-2 bg-[#222] border border-[#444] text-xs text-gray-300 rounded hover:bg-[#333]"
                @click="sessionStore.refreshMicrophoneDevices()"
              >
                Odśwież
              </button>
            </div>
          </div>

          <div class="px-4 py-3 rounded-lg border border-[#444] bg-black/40 flex flex-col gap-3">
            <div class="flex justify-between items-center text-xs text-gray-300 font-medium">
              <span>Głośność mikrofonu (Nasza)</span>
              <span class="font-mono text-blue-400"
                >{{ Math.round(webRtcStore.localMicrophoneVolume * 100) }}%</span
              >
            </div>
            <input
              v-model.number="webRtcStore.localMicrophoneVolume"
              type="range"
              min="0"
              max="2"
              step="0.01"
              class="custom-slider blue-slider"
            />
          </div>

          <div class="px-4 py-3 rounded-lg border border-[#444] bg-black/40 flex flex-col gap-3">
            <div class="flex justify-between items-center text-xs text-gray-300 font-medium">
              <span>Odsłuch partnera (Jego mikrofon)</span>
              <span class="font-mono text-cyan-400"
                >{{ Math.round(webRtcStore.remoteMicVolume * 100) }}%</span
              >
            </div>
            <input
              v-model.number="webRtcStore.remoteMicVolume"
              type="range"
              min="0"
              max="1"
              step="0.01"
              class="custom-slider cyan-slider"
            />
          </div>

          <div class="px-4 py-3 rounded-lg border border-[#444] bg-black/40 flex flex-col gap-3">
            <div class="flex justify-between items-center text-xs text-gray-300 font-medium">
              <span>Odsłuch partnera (Jego system)</span>
              <span class="font-mono text-emerald-400"
                >{{ Math.round(webRtcStore.remoteSystemVolume * 100) }}%</span
              >
            </div>
            <input
              v-model.number="webRtcStore.remoteSystemVolume"
              type="range"
              min="0"
              max="1"
              step="0.01"
              class="custom-slider emerald-slider"
            />
          </div>
        </div>

        <h3 class="text-sm font-bold text-blue-400 uppercase tracking-widest mb-4">
          Zdalny Ekran Partnera
        </h3>

        <VideoPlayer
          :stream="webRtcStore.remoteStream"
          :placeholder-text="
            webRtcStore.rtcStatus === 'connected'
              ? 'Oczekiwanie na obraz (WebRTC)...'
              : 'Połącz się, aby zobaczyć ekran.'
          "
        />
      </div>
    </div>

    <section class="mt-5 border-t border-[#333] pt-4">
      <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h3 class="text-xs font-bold uppercase tracking-widest text-gray-300">
          Diagnostyka Trackow
        </h3>
        <span class="text-[10px] text-gray-500 uppercase tracking-wider"
          >Profil publikacji: {{ webRtcStore.localPublishProfile }}</span
        >
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div class="border border-[#3a3a3a] rounded-lg p-3 bg-black/20">
          <p class="text-[11px] text-emerald-400 font-bold uppercase tracking-wider mb-2">
            Lokalne tracki ({{ localTrackDiagnostics.length }})
          </p>
          <ul v-if="localTrackDiagnostics.length" class="space-y-2">
            <li
              v-for="track in localTrackDiagnostics"
              :key="track.id"
              class="text-[11px] text-gray-300 border border-[#2f2f2f] rounded px-2 py-1.5"
            >
              {{ track.source }} | {{ track.kind }} | hint: {{ track.contentHint }} | enabled:
              {{ track.enabled }} | muted: {{ track.muted }} | state: {{ track.readyState }}
            </li>
          </ul>
          <p v-else class="text-[11px] text-gray-500">Brak lokalnych trackow.</p>
        </div>

        <div class="border border-[#3a3a3a] rounded-lg p-3 bg-black/20">
          <p class="text-[11px] text-blue-400 font-bold uppercase tracking-wider mb-2">
            Zdalne tracki ({{ remoteTrackDiagnostics.length }})
          </p>
          <ul v-if="remoteTrackDiagnostics.length" class="space-y-2">
            <li
              v-for="track in remoteTrackDiagnostics"
              :key="track.id"
              class="text-[11px] text-gray-300 border border-[#2f2f2f] rounded px-2 py-1.5"
            >
              {{ track.source }} | {{ track.kind }} | hint: {{ track.contentHint }} | enabled:
              {{ track.enabled }} | muted: {{ track.muted }} | state: {{ track.readyState }}
            </li>
          </ul>
          <p v-else class="text-[11px] text-gray-500">Brak zdalnych trackow.</p>
        </div>
      </div>
    </section>

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
        <button
          v-if="webRtcStore.rtcStatus === 'connected'"
          class="px-4 py-2 bg-transparent border border-[#444] hover:border-rose-500 hover:text-rose-400 text-gray-400 text-xs font-semibold rounded transition-colors"
          @click="webRtcStore.disconnect()"
        >
          Rozłącz p2p
        </button>
      </div>
    </footer>

    <RemoteAudioPlayer />
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

/* =========================================
   WŁASNE SUWAKI (CUSTOM RANGE SLIDERS)
   ========================================= */
.custom-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 6px;
  background: #333;
  border-radius: 4px;
  outline: none;
  transition: background 0.3s;
}
.custom-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  cursor: pointer;
  transition: transform 0.15s ease-in-out;
  box-shadow: 0 0 5px rgba(0, 0, 0, 0.5);
}
.custom-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transition: transform 0.15s ease-in-out;
  box-shadow: 0 0 5px rgba(0, 0, 0, 0.5);
}
.custom-slider:active::-webkit-slider-thumb {
  transform: scale(1.3);
}
.custom-slider:active::-moz-range-thumb {
  transform: scale(1.3);
}

.emerald-slider::-webkit-slider-thumb {
  background: #10b981;
}
.emerald-slider::-moz-range-thumb {
  background: #10b981;
}
.blue-slider::-webkit-slider-thumb {
  background: #3b82f6;
}
.blue-slider::-moz-range-thumb {
  background: #3b82f6;
}
.cyan-slider::-webkit-slider-thumb {
  background: #06b6d4;
}
.cyan-slider::-moz-range-thumb {
  background: #06b6d4;
}
</style>
