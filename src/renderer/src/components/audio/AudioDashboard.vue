<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useWebRtcStore } from '@renderer/stores/webRtcStore'
import { SessionStore } from '@renderer/stores/sessionStore'
import { microphoneService } from '@renderer/services/micService'
import SelectMicrophoneL from './smart/SelectMicrophoneL.vue'
import MicrophoneVolumeL from './smart/MicrophoneVolumeL.vue'
import VUMeterL from './smart/VUMeterL.vue'
import MicrophoneEffectsL from './smart/MicrophoneEffectsL.vue'
import MySystemAudioL from './smart/MySystemAudioL.vue'
import LocalMixerL from './smart/LocalMixerL.vue'
import AdvancedDuckingL from './smart/AdvancedDuckingL.vue'

interface VoicePresetOption {
  id: 'none' | 'studio' | 'high' | 'robot' | 'demon' | 'radio'
  label: string
}

const webRtcStore = useWebRtcStore()
const sessionStore = SessionStore()
const { selectedMicrophoneDeviceId } = storeToRefs(sessionStore)

const isMyMicMuted = ref(false)
const micLimiterEnabled = ref(true)
const micBassBoostEnabled = ref(false)
const micStudioModeEnabled = ref(false)
const micMonitoringEnabled = ref(false)
const micInputThresholdDb = ref(-60)
const isAutoGate = computed(() => micInputThresholdDb.value <= -60)
const activeVoicePreset = ref<VoicePresetOption['id']>('none')

const voicePresets: VoicePresetOption[] = [
  { id: 'none', label: 'Czysty' },
  { id: 'studio', label: 'Studyjny' },
  { id: 'high', label: 'Wysoki' },
  { id: 'robot', label: 'Robot' },
  { id: 'demon', label: 'Demon' },
  { id: 'radio', label: 'Radio' }
]

const limiterThresholdDb = computed<number>(() => (micLimiterEnabled.value ? -10 : 0))

const clampDb = (value: number, min = -60, max = 0): number => {
  if (!Number.isFinite(value)) return min
  return Math.max(min, Math.min(max, value))
}

const linearToDb = (linear: number): number => {
  return clampDb(20 * Math.log10(Math.max(1e-8, linear)))
}

const dbToLinear = (db: number): number => {
  return Math.max(0, Math.min(1, Math.pow(10, clampDb(db) / 20)))
}

const clampMicThresholdToContext = (): void => {
  micInputThresholdDb.value = clampDb(micInputThresholdDb.value, -60, limiterThresholdDb.value)
}

const syncGateThresholdToService = (): void => {
  const threshold = isAutoGate.value ? 0 : dbToLinear(micInputThresholdDb.value)
  microphoneService.setInputThreshold(threshold)
}

const handleDeviceChange = (): void => {
  void sessionStore.refreshMicrophones()
}

const handleMicMuteStateChange = (isMuted: boolean): void => {
  isMyMicMuted.value = isMuted
}

onMounted(() => {
  micMonitoringEnabled.value = microphoneService.getLocalMonitoringEnabled()
  micInputThresholdDb.value = clampDb(linearToDb(microphoneService.getInputThreshold()), -60, 0)
  clampMicThresholdToContext()

  microphoneService.setLimiter(micLimiterEnabled.value)
  syncGateThresholdToService()
  microphoneService.setStudioModeEnabled(micStudioModeEnabled.value)
  microphoneService.setBassBoost(micBassBoostEnabled.value ? 3 : 0)
  microphoneService.setVoicePreset(activeVoicePreset.value)

  void sessionStore.refreshMicrophones()
  navigator.mediaDevices?.addEventListener?.('devicechange', handleDeviceChange)
})

onUnmounted(() => {
  navigator.mediaDevices?.removeEventListener?.('devicechange', handleDeviceChange)
})

watch(micLimiterEnabled, (enabled) => {
  microphoneService.setLimiter(enabled)
  clampMicThresholdToContext()
  syncGateThresholdToService()
})

watch(micMonitoringEnabled, (enabled) => {
  microphoneService.setLocalMonitoringEnabled(enabled)
})

watch(limiterThresholdDb, () => {
  clampMicThresholdToContext()
})

watch(micInputThresholdDb, (thresholdDb) => {
  const nextThreshold = isAutoGate.value ? 0 : dbToLinear(thresholdDb)
  microphoneService.setInputThreshold(nextThreshold)
})

watch(micBassBoostEnabled, (enabled) => {
  microphoneService.setBassBoost(enabled ? 3 : 0)
})

watch(micStudioModeEnabled, (enabled) => {
  microphoneService.setStudioModeEnabled(enabled)
  if (sessionStore.isCapturing) {
    void sessionStore.applySelectedMicrophone()
  }
})
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

        <SelectMicrophoneL />

        <div class="mb-4">
          <div class="flex flex-col gap-3">
            <MicrophoneVolumeL @mute-state-change="handleMicMuteStateChange" />

            <VUMeterL
              class="w-full"
              context-mode="auto-mic"
              :enabled="sessionStore.includeMicrophone && !isMyMicMuted"
              :is-capturing="sessionStore.isCapturing"
              :device-id="selectedMicrophoneDeviceId || undefined"
              :volume="webRtcStore.localMicrophoneVolume"
              :input-threshold-linear="dbToLinear(micInputThresholdDb)"
              :limiter-threshold-db="limiterThresholdDb"
            />

            <MicrophoneEffectsL
              v-model:mic-limiter-enabled="micLimiterEnabled"
              v-model:mic-bass-boost-enabled="micBassBoostEnabled"
              v-model:mic-studio-mode-enabled="micStudioModeEnabled"
              v-model:mic-monitoring-enabled="micMonitoringEnabled"
              v-model:active-voice-preset="activeVoicePreset"
              v-model:mic-input-threshold-db="micInputThresholdDb"
              :voice-presets="voicePresets"
              :limiter-threshold-db="limiterThresholdDb"
            />
          </div>
        </div>

        <MySystemAudioL />
      </article>

      <LocalMixerL />
    </div>

    <AdvancedDuckingL />
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
</style>
