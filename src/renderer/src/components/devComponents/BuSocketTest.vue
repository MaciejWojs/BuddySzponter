<script setup lang="ts">
import { computed, onUnmounted } from 'vue'
import { useConnectionStore } from '@renderer/stores/connectionStore'
import { useSocketStore } from '@renderer/stores/socketStore'
import { useWebRtcStore } from '@renderer/stores/webRtcStore'
import { useSessionStore } from '@renderer/stores/sessionStore'

import VideoPlayer from '../p2p/VideoPlayer.vue'

const connectionStore = useConnectionStore()
const socketStore = useSocketStore()
const webRtcStore = useWebRtcStore()
const sessionStore = useSessionStore()

const handleManualConnect = (): void => void socketStore.connect('awaryjny-token-z-palca')
const handleManualDisconnect = (): void => void socketStore.disconnect()

// Mapowanie do diagnostyki
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

          <div class="flex gap-1.5 bg-[#111] p-1 rounded-lg border border-[#444]">
            <button
              class="px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all"
              :class="
                sessionStore.activeVideoQuality === 'low'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white hover:bg-[#333]'
              "
              title="1.5 Mbps / 30fps / Pół rozdzielczości"
              @click="sessionStore.applyQualityPreset('low')"
            >
              Low
            </button>
            <button
              class="px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all"
              :class="
                sessionStore.activeVideoQuality === 'medium'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white hover:bg-[#333]'
              "
              title="3.5 Mbps / 60fps"
              @click="sessionStore.applyQualityPreset('medium')"
            >
              Med
            </button>
            <button
              class="px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all"
              :class="
                sessionStore.activeVideoQuality === 'high'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white hover:bg-[#333]'
              "
              title="8.0 Mbps / 60fps"
              @click="sessionStore.applyQualityPreset('high')"
            >
              High
            </button>
            <button
              class="px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all"
              :class="
                sessionStore.activeVideoQuality === 'ultra'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white hover:bg-[#333]'
              "
              title="15.0 Mbps / 120fps"
              @click="sessionStore.applyQualityPreset('ultra')"
            >
              Ultra
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

        <VideoPlayer
          v-if="sessionStore.isCapturing"
          :stream="webRtcStore.localStream"
          muted-playback
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
