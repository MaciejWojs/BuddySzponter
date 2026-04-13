<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useWebRtcStore } from '@renderer/stores/webRtcStore'
import { SessionStore } from '@renderer/stores/sessionStore'
import { getAudioContext, resumeAudioContext } from '@renderer/composables/useSharedAudioContext'
import VUMeter from './VUMeter.vue'

interface DuckingPreset {
  id: 'balanced' | 'voice-focus' | 'aggressive' | 'stream'
  label: string
  hint: string
  values: {
    level: number
    threshold: number
    smoothing: number
    holdFrames: number
  }
}

const webRtcStore = useWebRtcStore()
const sessionStore = SessionStore()

const isMyMicMuted = ref(false)
const isMySystemMuted = ref(false)
const isGuestSystemMuted = ref(false)
const isAdvancedOpen = ref(false)

const duckingPresets: DuckingPreset[] = [
  {
    id: 'balanced',
    label: 'Balanced',
    hint: 'Uniwersalny profil do codziennej rozmowy.',
    values: { level: 0.3, threshold: 0.02, smoothing: 0.08, holdFrames: 8 }
  },
  {
    id: 'voice-focus',
    label: 'Voice Focus',
    hint: 'Szybciej reaguje na mowę gościa.',
    values: { level: 0.42, threshold: 0.016, smoothing: 0.05, holdFrames: 10 }
  },
  {
    id: 'aggressive',
    label: 'Aggressive',
    hint: 'Mocne tłumienie tła przy aktywnej mowie.',
    values: { level: 0.62, threshold: 0.012, smoothing: 0.04, holdFrames: 14 }
  },
  {
    id: 'stream',
    label: 'Stream',
    hint: 'Płynniejsze przejścia i dłuższe podtrzymanie.',
    values: { level: 0.38, threshold: 0.018, smoothing: 0.12, holdFrames: 18 }
  }
]

const micAnalyser = ref<AnalyserNode | null>(null)
let micSourceNode: MediaStreamAudioSourceNode | null = null

const myMicPercent = computed<number>({
  get: () => Math.round(webRtcStore.localMicrophoneVolume * 100),
  set: (value) => {
    webRtcStore.localMicrophoneVolume = Math.max(0, Math.min(2, value / 100))
  }
})

const mySystemPercent = computed<number>({
  get: () => Math.round(webRtcStore.localSystemAudioVolume * 100),
  set: (value) => {
    webRtcStore.localSystemAudioVolume = Math.max(0, Math.min(1, value / 100))
  }
})

const guestMicPercent = computed<number>({
  get: () => Math.round(webRtcStore.remoteMicVolume * 100),
  set: (value) => {
    webRtcStore.remoteMicVolume = Math.max(0, Math.min(1, value / 100))
  }
})

const guestSystemPercent = computed<number>({
  get: () => Math.round(webRtcStore.remoteSystemVolume * 100),
  set: (value) => {
    webRtcStore.remoteSystemVolume = Math.max(0, Math.min(1, value / 100))
  }
})

const isBoosting = computed(() => myMicPercent.value > 100)

const isNear = (a: number, b: number, epsilon = 0.0005): boolean => Math.abs(a - b) <= epsilon

const isPresetActive = (preset: DuckingPreset): boolean => {
  return (
    isNear(webRtcStore.audioDuckingLevel, preset.values.level) &&
    isNear(webRtcStore.audioSpeechThreshold, preset.values.threshold) &&
    isNear(webRtcStore.audioGainSmoothing, preset.values.smoothing) &&
    webRtcStore.audioHoldFrames === preset.values.holdFrames
  )
}

const activeDuckingPreset = computed<DuckingPreset | null>(() => {
  return duckingPresets.find((preset) => isPresetActive(preset)) ?? null
})

const applyDuckingPreset = (preset: DuckingPreset): void => {
  webRtcStore.audioDuckingLevel = preset.values.level
  webRtcStore.audioSpeechThreshold = preset.values.threshold
  webRtcStore.audioGainSmoothing = preset.values.smoothing
  webRtcStore.audioHoldFrames = preset.values.holdFrames
}

const resetDuckingToDefault = (): void => {
  const defaultPreset = duckingPresets[0]
  applyDuckingPreset(defaultPreset)
}

const cleanupMeterGraph = (): void => {
  if (micSourceNode) {
    try {
      micSourceNode.disconnect()
    } catch {
      // no-op
    }
    micSourceNode = null
  }

  if (micAnalyser.value) {
    try {
      micAnalyser.value.disconnect()
    } catch {
      // no-op
    }
    micAnalyser.value = null
  }
}

const bindMeterToMicrophone = (stream: MediaStream | null): void => {
  cleanupMeterGraph()
  if (!stream) return

  const micTrack =
    stream.getAudioTracks().find((track) => track.contentHint === 'speech') ??
    stream.getAudioTracks()[0]

  if (!micTrack) return

  const audioContext = getAudioContext()
  void resumeAudioContext().catch(() => {})
  const analyser = audioContext.createAnalyser()
  analyser.fftSize = 1024
  analyser.smoothingTimeConstant = 0.2

  const meterStream = new MediaStream([micTrack])
  micSourceNode = audioContext.createMediaStreamSource(meterStream)
  micSourceNode.connect(analyser)
  micAnalyser.value = analyser
}

const handleDeviceChange = (): void => {
  void sessionStore.refreshMicrophones()
}

const toggleMyMicMute = (): void => {
  isMyMicMuted.value = !isMyMicMuted.value
  webRtcStore.toggleMicrophone(isMyMicMuted.value)
}

const syncMicMuteStateFromStream = (stream: MediaStream | null): void => {
  if (!stream) {
    isMyMicMuted.value = false
    return
  }

  const micTrack =
    stream.getAudioTracks().find((track) => track.contentHint === 'speech') ??
    stream.getAudioTracks()[0] ??
    null

  if (!micTrack) {
    isMyMicMuted.value = false
    return
  }

  isMyMicMuted.value = !micTrack.enabled
}

const toggleMySystemMute = (): void => {
  isMySystemMuted.value = !isMySystemMuted.value
  webRtcStore.toggleSystemAudio(isMySystemMuted.value)
}

const toggleGuestSystemMute = (): void => {
  isGuestSystemMuted.value = !isGuestSystemMuted.value
  webRtcStore.remoteSystemVolume = isGuestSystemMuted.value ? 0 : 1
}

onMounted(() => {
  void sessionStore.refreshMicrophones()
  navigator.mediaDevices?.addEventListener?.('devicechange', handleDeviceChange)
  bindMeterToMicrophone(webRtcStore.localStream)
  syncMicMuteStateFromStream(webRtcStore.localStream)
})

onUnmounted(() => {
  cleanupMeterGraph()
  navigator.mediaDevices?.removeEventListener?.('devicechange', handleDeviceChange)
})

watch(
  () => webRtcStore.localStream,
  (stream) => {
    bindMeterToMicrophone(stream)
    syncMicMuteStateFromStream(stream)
  }
)

watch(
  () => sessionStore.selectedMicrophoneDeviceId,
  async (next, prev) => {
    if (next === prev) return

    await sessionStore.applySelectedMicrophone()
    bindMeterToMicrophone(webRtcStore.localStream)
    syncMicMuteStateFromStream(webRtcStore.localStream)
  }
)
</script>

<template>
  <section class="bg-[#1e1e1e] border border-[#333] rounded-lg p-5 shadow-xl">
    <header class="mb-4">
      <h2 class="text-lg font-bold text-white">Audio Dashboard</h2>
      <p class="text-xs text-gray-400">Zaawansowany panel dzwieku WebRTC</p>
    </header>

    <div class="grid grid-cols-1 gap-4">
      <article class="bg-[#161616] border border-[#333] rounded-lg p-4">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-sm font-bold text-blue-300">🎙️ Moje Audio (Wysylane w siec)</h3>
        </div>

        <div class="mb-4">
          <label class="text-xs text-gray-300 block mb-1.5">Mikrofon</label>
          <select
            v-model="sessionStore.selectedMicrophoneDeviceId"
            class="w-full px-3 py-2 rounded-md bg-[#111] border border-[#3a3a3a] text-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Domyslny mikrofon</option>
            <option
              v-for="mic in sessionStore.availableMicrophones"
              :key="mic.deviceId"
              :value="mic.deviceId"
            >
              {{ mic.label }}
            </option>
          </select>
        </div>

        <div class="mb-4">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs text-gray-300">Glosnosc mikrofonu</span>
            <span
              class="text-xs font-mono font-semibold transition-colors"
              :class="isBoosting ? 'text-amber-400' : 'text-blue-400'"
            >
              {{ myMicPercent }}%
            </span>
          </div>

          <div class="flex flex-col gap-3">
            <div class="flex items-center gap-3">
              <input
                v-model.number="myMicPercent"
                type="range"
                min="0"
                max="200"
                step="1"
                class="pro-slider flex-1"
                :class="isBoosting ? 'boost' : 'normal'"
              />
              <button
                type="button"
                class="h-9 w-9 rounded-md border text-xs font-bold transition-colors"
                :class="
                  isMyMicMuted
                    ? 'bg-rose-900/30 border-rose-700 text-rose-300'
                    : 'bg-[#202020] border-[#3f3f3f] text-gray-200 hover:border-blue-500'
                "
                :title="isMyMicMuted ? 'Wlacz mikrofon' : 'Wycisz mikrofon'"
                @click="toggleMyMicMute()"
              >
                {{ isMyMicMuted ? '🎙️x' : '🎙️' }}
              </button>
            </div>

            <VUMeter class="w-full" :analyser="isMyMicMuted ? null : micAnalyser" />
          </div>
        </div>

        <div>
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs text-gray-300">Moje audio systemowe</span>
            <span class="text-xs font-mono text-emerald-400">{{ mySystemPercent }}%</span>
          </div>

          <div class="flex items-center gap-3">
            <input
              v-model.number="mySystemPercent"
              type="range"
              min="0"
              max="100"
              step="1"
              class="pro-slider system flex-1"
            />
            <button
              type="button"
              class="h-9 w-9 rounded-md border text-xs font-bold transition-colors"
              :class="
                isMySystemMuted
                  ? 'bg-rose-900/30 border-rose-700 text-rose-300'
                  : 'bg-[#202020] border-[#3f3f3f] text-gray-200 hover:border-emerald-500'
              "
              :title="isMySystemMuted ? 'Wlacz system audio' : 'Wycisz system audio'"
              @click="toggleMySystemMute()"
            >
              {{ isMySystemMuted ? '🔇' : '🔊' }}
            </button>
          </div>
        </div>
      </article>

      <article class="bg-[#161616] border border-[#333] rounded-lg p-4">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-sm font-bold text-cyan-300">🎧 Odsluch (Lokalny mikser)</h3>
        </div>

        <div class="mb-4">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs text-gray-300 flex items-center gap-2">
              Mikrofon Goscia
              <span
                class="inline-flex h-4 w-4 items-center justify-center rounded-full border border-cyan-700 text-cyan-400 text-[10px]"
                title="Dzwiek scisza sie automatycznie, gdy Gosc mowi (Audio Ducking)."
                >i</span
              >
            </span>
            <span class="text-xs font-mono text-cyan-400">{{ guestMicPercent }}%</span>
          </div>
          <p class="text-[11px] text-gray-500 mb-2">
            Dzwiek scisza sie automatycznie, gdy Gosc mowi (Audio Ducking).
          </p>
          <input
            v-model.number="guestMicPercent"
            type="range"
            min="0"
            max="100"
            step="1"
            class="pro-slider monitor w-full"
          />
        </div>

        <div>
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs text-gray-300">System Goscia</span>
            <span class="text-xs font-mono text-fuchsia-300">{{ guestSystemPercent }}%</span>
          </div>
          <div class="flex items-center gap-3">
            <input
              v-model.number="guestSystemPercent"
              type="range"
              min="0"
              max="100"
              step="1"
              class="pro-slider guest-system flex-1"
            />
            <button
              type="button"
              class="h-9 w-9 rounded-md border text-xs font-bold transition-colors"
              :class="
                isGuestSystemMuted
                  ? 'bg-rose-900/30 border-rose-700 text-rose-300'
                  : 'bg-[#202020] border-[#3f3f3f] text-gray-200 hover:border-fuchsia-500'
              "
              :title="isGuestSystemMuted ? 'Wlacz system Goscia' : 'Wycisz system Goscia'"
              @click="toggleGuestSystemMute()"
            >
              {{ isGuestSystemMuted ? '🔇' : '🔊' }}
            </button>
          </div>
        </div>
      </article>
    </div>

    <article class="mt-4 bg-[#161616] border border-[#333] rounded-lg p-4">
      <button
        type="button"
        class="w-full flex items-center justify-between text-left"
        @click="isAdvancedOpen = !isAdvancedOpen"
      >
        <h3 class="text-sm font-bold text-amber-300">⚙️ Zaawansowane Ustawienia Duckingu</h3>
        <span class="text-xs text-amber-400">{{ isAdvancedOpen ? 'Ukryj' : 'Pokaz' }}</span>
      </button>

      <div v-if="isAdvancedOpen" class="mt-4 space-y-4">
        <div class="rounded-lg border border-[#3a3a3a] bg-[#111] p-3">
          <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
            <p class="text-xs text-gray-300">
              Presety Duckingu
              <span class="text-gray-500">(szybkie profile reakcji na mowę)</span>
            </p>
            <button
              type="button"
              class="px-3 py-1.5 rounded border border-[#505050] text-[11px] text-gray-300 hover:border-amber-500 hover:text-amber-300 transition-colors"
              @click="resetDuckingToDefault()"
            >
              Reset do domyslnego
            </button>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
            <button
              v-for="preset in duckingPresets"
              :key="preset.id"
              type="button"
              class="text-left rounded-md border px-3 py-2 transition-colors"
              :class="
                isPresetActive(preset)
                  ? 'border-amber-500 bg-amber-500/10'
                  : 'border-[#3d3d3d] bg-[#1b1b1b] hover:border-amber-600/70'
              "
              @click="applyDuckingPreset(preset)"
            >
              <p
                class="text-xs font-semibold"
                :class="isPresetActive(preset) ? 'text-amber-300' : 'text-gray-200'"
              >
                {{ preset.label }}
              </p>
              <p
                class="mt-1 text-[11px]"
                :class="isPresetActive(preset) ? 'text-amber-200/80' : 'text-gray-500'"
              >
                {{ preset.hint }}
              </p>
            </button>
          </div>

          <p class="mt-3 text-[11px] text-gray-500">
            Aktywny preset:
            <span class="text-amber-300 font-medium">{{
              activeDuckingPreset?.label ?? 'Custom'
            }}</span>
          </p>
        </div>

        <div
          class="grid grid-cols-1 lg:grid-cols-2 gap-4 rounded-lg border border-[#3a3a3a] bg-[#111] p-3"
        >
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-xs text-gray-300">Sila wyciszenia (Ducking Level)</span>
              <span class="text-xs font-mono text-amber-300">{{
                webRtcStore.audioDuckingLevel.toFixed(2)
              }}</span>
            </div>
            <input
              v-model.number="webRtcStore.audioDuckingLevel"
              class="pro-slider ducking w-full"
              type="range"
              min="0"
              max="1"
              step="0.01"
            />
          </div>

          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-xs text-gray-300">Prog aktywacji (Threshold)</span>
              <span class="text-xs font-mono text-amber-300">{{
                webRtcStore.audioSpeechThreshold.toFixed(3)
              }}</span>
            </div>
            <input
              v-model.number="webRtcStore.audioSpeechThreshold"
              class="pro-slider ducking w-full"
              type="range"
              min="0"
              max="0.1"
              step="0.001"
            />
          </div>

          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-xs text-gray-300">Atak (Attack smoothing)</span>
              <span class="text-xs font-mono text-amber-300"
                >{{ webRtcStore.audioGainSmoothing.toFixed(2) }} s</span
              >
            </div>
            <input
              v-model.number="webRtcStore.audioGainSmoothing"
              class="pro-slider ducking w-full"
              type="range"
              min="0.01"
              max="0.5"
              step="0.01"
            />
          </div>

          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-xs text-gray-300">Podtrzymanie (Hold Frames)</span>
              <span class="text-xs font-mono text-amber-300"
                >{{ webRtcStore.audioHoldFrames }} klatek</span
              >
            </div>
            <input
              v-model.number="webRtcStore.audioHoldFrames"
              class="pro-slider ducking w-full"
              type="range"
              min="0"
              max="30"
              step="1"
            />
          </div>
        </div>
      </div>
    </article>
  </section>
</template>

<style scoped>
.pro-slider {
  appearance: none;
  height: 8px;
  border-radius: 999px;
  background: linear-gradient(90deg, #1f2937 0%, #374151 100%);
  border: 1px solid #3b3b3b;
  outline: none;
}

.pro-slider::-webkit-slider-thumb {
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 999px;
  background: #60a5fa;
  border: 2px solid #dbeafe;
  box-shadow: 0 0 10px rgba(96, 165, 250, 0.4);
  cursor: pointer;
  transition: all 160ms ease;
}

.pro-slider.normal::-webkit-slider-thumb {
  background: #60a5fa;
  box-shadow: 0 0 10px rgba(96, 165, 250, 0.45);
}

.pro-slider.boost::-webkit-slider-thumb {
  background: #f59e0b;
  box-shadow: 0 0 10px rgba(245, 158, 11, 0.55);
}

.pro-slider.boost {
  background: linear-gradient(90deg, #3f3122 0%, #6b3f1d 100%);
}

.pro-slider.system::-webkit-slider-thumb {
  background: #34d399;
  box-shadow: 0 0 10px rgba(52, 211, 153, 0.5);
}

.pro-slider.monitor::-webkit-slider-thumb {
  background: #22d3ee;
  box-shadow: 0 0 10px rgba(34, 211, 238, 0.5);
}

.pro-slider.guest-system::-webkit-slider-thumb {
  background: #e879f9;
  box-shadow: 0 0 10px rgba(232, 121, 249, 0.45);
}

.pro-slider.ducking::-webkit-slider-thumb {
  background: #f59e0b;
  box-shadow: 0 0 10px rgba(245, 158, 11, 0.45);
}

.pro-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border: 2px solid #dbeafe;
  border-radius: 999px;
  background: #60a5fa;
  cursor: pointer;
}

.pro-slider::-moz-range-track {
  height: 8px;
  border-radius: 999px;
  background: linear-gradient(90deg, #1f2937 0%, #374151 100%);
  border: 1px solid #3b3b3b;
}

.pro-slider.ducking::-moz-range-thumb {
  background: #f59e0b;
}
</style>
