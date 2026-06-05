<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useWebRtcStore } from '@renderer/stores/webRtcStore'
import { useSessionStore } from '@renderer/stores/sessionStore'
import { microphoneService } from '@renderer/services/audio/in/micService'
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

interface VoicePresetOption {
  id: 'none' | 'studio' | 'high' | 'robot' | 'demon' | 'radio'
  label: string
}

const webRtcStore = useWebRtcStore()
const sessionStore = useSessionStore()
const { selectedMicrophoneDeviceId } = storeToRefs(sessionStore)

const isMyMicMuted = computed({
  get: () => sessionStore.microphoneMuted,
  set: (val: boolean) => {
    sessionStore.microphoneMuted = val
  }
})

const isMySystemMuted = ref(false)
const isGuestSystemMuted = ref(false)
const isAdvancedOpen = ref(false)
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

/* ================= MAPOWANIE SUWAKÓW (SINE) ================= */

const clampUnit = (value: number): number => Math.max(0, Math.min(1, value))
const easeInOutSine = (value: number): number => 0.5 - Math.cos(Math.PI * clampUnit(value)) / 2
const inverseEaseInOutSine = (value: number): number =>
  Math.acos(1 - 2 * clampUnit(value)) / Math.PI

const mapValueToSinePercent = (value: number, min: number, max: number): number => {
  if (max <= min) return 0
  const normalized = clampUnit((value - min) / (max - min))
  return inverseEaseInOutSine(normalized) * 100
}

const mapSinePercentToValue = (percent: number, min: number, max: number): number => {
  if (max <= min) return min
  return min + easeInOutSine(percent / 100) * (max - min)
}

/* ================= COMPUTED PROPERTIES ================= */

const myMicPercent = computed<number>(() => Math.round(sessionStore.localMicrophoneVolume * 100))

const micVolumeSliderPercent = computed<number>({
  get: () => mapValueToSinePercent(sessionStore.localMicrophoneVolume, 0, 2),
  set: (value) => {
    sessionStore.localMicrophoneVolume = mapSinePercentToValue(value, 0, 2)
  }
})

const mySystemPercent = computed<number>({
  get: () => Math.round(sessionStore.localSystemAudioVolume * 100),
  set: (value) => {
    sessionStore.localSystemAudioVolume = Math.max(0, Math.min(1, value / 100))
  }
})

// Przeniesione do sessionStore
const guestMicPercent = computed<number>({
  get: () => Math.round(sessionStore.remoteMicVolume * 100),
  set: (value) => {
    sessionStore.remoteMicVolume = Math.max(0, Math.min(1, value / 100))
  }
})

// Przeniesione do sessionStore
const guestSystemPercent = computed<number>({
  get: () => Math.round(sessionStore.remoteSystemVolume * 100),
  set: (value) => {
    sessionStore.remoteSystemVolume = Math.max(0, Math.min(1, value / 100))
  }
})

const isBoosting = computed(() => myMicPercent.value > 100)
const limiterThresholdDb = computed<number>(() => (micLimiterEnabled.value ? -10 : 0))

const micInputThresholdSliderPercent = computed<number>({
  get: () => mapValueToSinePercent(micInputThresholdDb.value, -60, limiterThresholdDb.value),
  set: (value) => {
    micInputThresholdDb.value = mapSinePercentToValue(value, -60, limiterThresholdDb.value)
  }
})

/* ================= DB HELPERS ================= */

const clampDb = (value: number, min = -60, max = 0): number => {
  if (!Number.isFinite(value)) return min
  return Math.max(min, Math.min(max, value))
}

const linearToDb = (linear: number): number => clampDb(20 * Math.log10(Math.max(1e-8, linear)))
const dbToLinear = (db: number): number => Math.max(0, Math.min(1, Math.pow(10, clampDb(db) / 20)))

const clampMicThresholdToContext = (): void => {
  micInputThresholdDb.value = clampDb(micInputThresholdDb.value, -60, limiterThresholdDb.value)
}

const syncGateThresholdToService = (): void => {
  const threshold = isAutoGate.value ? 0 : dbToLinear(micInputThresholdDb.value)
  microphoneService.setInputThreshold(threshold)
}

/* ================= DUCKING PRESETS ================= */

const isNear = (a: number, b: number, epsilon = 0.0005): boolean => Math.abs(a - b) <= epsilon

const isPresetActive = (preset: DuckingPreset): boolean => {
  return (
    isNear(sessionStore.audioDuckingLevel, preset.values.level) &&
    isNear(sessionStore.audioSpeechThreshold, preset.values.threshold) &&
    isNear(sessionStore.audioGainSmoothing, preset.values.smoothing) &&
    sessionStore.audioHoldFrames === preset.values.holdFrames
  )
}

const activeDuckingPreset = computed<DuckingPreset | null>(() => {
  return duckingPresets.find((preset) => isPresetActive(preset)) ?? null
})

const applyDuckingPreset = (preset: DuckingPreset): void => {
  sessionStore.audioDuckingLevel = preset.values.level
  sessionStore.audioSpeechThreshold = preset.values.threshold
  sessionStore.audioGainSmoothing = preset.values.smoothing
  sessionStore.audioHoldFrames = preset.values.holdFrames
}

const resetDuckingToDefault = (): void => {
  applyDuckingPreset(duckingPresets[0])
}

/* ================= ACTIONS ================= */

const handleDeviceChange = (): void => {
  void sessionStore.refreshMicrophones()
}

const handleSelectedMicrophoneChange = async (): Promise<void> => {
  if (sessionStore.isCapturing) {
    await sessionStore.applySelectedMicrophone()
  }
  syncMicMuteStateFromStream(webRtcStore.localStream)
}

const toggleMyMicMute = (): void => {
  isMyMicMuted.value = !isMyMicMuted.value
  sessionStore.toggleMicrophone(isMyMicMuted.value)
  if (webRtcStore.localStream) {
    const micTrack =
      webRtcStore.localStream.getAudioTracks().find((track) => track.contentHint === 'speech') ??
      webRtcStore.localStream.getAudioTracks()[0] ??
      null
    if (micTrack) micTrack.enabled = !isMyMicMuted.value
  }
}

const syncMicMuteStateFromStream = (stream: MediaStream | null): void => {
  if (!stream) return
  const micTrack =
    stream.getAudioTracks().find((track) => track.contentHint === 'speech') ??
    stream.getAudioTracks()[0] ??
    null
  if (micTrack) {
    micTrack.enabled = !isMyMicMuted.value
  }
}

const toggleMySystemMute = (): void => {
  isMySystemMuted.value = !isMySystemMuted.value
  sessionStore.toggleSystemAudio(isMySystemMuted.value)
}

const toggleGuestSystemMute = (): void => {
  isGuestSystemMuted.value = !isGuestSystemMuted.value
  sessionStore.remoteSystemVolume = isGuestSystemMuted.value ? 0 : 1
}

const selectVoicePreset = (presetId: VoicePresetOption['id']): void => {
  activeVoicePreset.value = presetId
  microphoneService.setVoicePreset(presetId)
}

/* ================= LIFECYCLE & WATCHERS ================= */

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
  syncMicMuteStateFromStream(webRtcStore.localStream)
})

onUnmounted(() => {
  navigator.mediaDevices?.removeEventListener?.('devicechange', handleDeviceChange)
})

watch(
  () => webRtcStore.localStream,
  (stream) => syncMicMuteStateFromStream(stream)
)

watch(
  () => isMyMicMuted.value,
  (muted) => {
    if (webRtcStore.localStream) {
      const micTrack =
        webRtcStore.localStream.getAudioTracks().find((track) => track.contentHint === 'speech') ??
        webRtcStore.localStream.getAudioTracks()[0] ??
        null
      if (micTrack) micTrack.enabled = !muted
    }
  }
)

watch(micLimiterEnabled, (enabled) => {
  microphoneService.setLimiter(enabled)
  clampMicThresholdToContext()
  syncGateThresholdToService()
})

watch(micMonitoringEnabled, (enabled) => microphoneService.setLocalMonitoringEnabled(enabled))
watch(limiterThresholdDb, () => clampMicThresholdToContext())
watch(micInputThresholdDb, (thresholdDb) => {
  const nextThreshold = isAutoGate.value ? 0 : dbToLinear(thresholdDb)
  microphoneService.setInputThreshold(nextThreshold)
})
watch(micBassBoostEnabled, (enabled) => microphoneService.setBassBoost(enabled ? 3 : 0))
watch(micStudioModeEnabled, (enabled) => {
  microphoneService.setStudioModeEnabled(enabled)
  if (sessionStore.isCapturing) void sessionStore.applySelectedMicrophone()
})
</script>

<template>
  <div class="audio-dash">
    <div class="audio-dash__flow">
      <h3 class="audio-dash__section-head">{{ $t('audioDashboard.sectionSent') }}</h3>

      <div class="audio-dash__block">
        <label class="audio-dash__label">{{ $t('menuNav.microphoneLabel') }}</label>
        <select
          v-model="selectedMicrophoneDeviceId"
          class="audio-dash__select"
          @change="handleSelectedMicrophoneChange"
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

      <div class="audio-dash__block">
        <div class="audio-dash__row">
          <span class="audio-dash__muted">{{ $t('audioDashboard.micVolume') }}</span>
          <span
            class="audio-dash__mono"
            :class="isBoosting ? 'audio-dash__mono--warn' : 'audio-dash__mono--accent'"
          >
            {{ myMicPercent }}%
          </span>
        </div>

        <div class="audio-dash__stack">
          <div class="audio-dash__row audio-dash__row--tight">
            <input
              v-model.number="micVolumeSliderPercent"
              type="range"
              min="0"
              max="100"
              step="1"
              class="audio-dash__slider flex-1"
              :class="isBoosting ? 'audio-dash__slider--boost' : 'audio-dash__slider--mic'"
            />
            <button
              type="button"
              class="audio-dash__icon-btn"
              :class="
                isMyMicMuted ? 'audio-dash__icon-btn--danger' : 'audio-dash__icon-btn--neutral'
              "
              :title="isMyMicMuted ? $t('audioDashboard.unmuteMic') : $t('audioDashboard.muteMic')"
              @click="toggleMyMicMute()"
            >
              {{ isMyMicMuted ? '🎙️x' : '🎙️' }}
            </button>
          </div>

          <VUMeter
            class="audio-dash__meter"
            context-mode="auto-mic"
            :enabled="sessionStore.includeMicrophone"
            :is-capturing="sessionStore.isCapturing"
            :device-id="selectedMicrophoneDeviceId || undefined"
            :volume="sessionStore.localMicrophoneVolume"
            :input-threshold-linear="dbToLinear(micInputThresholdDb)"
            :limiter-threshold-db="limiterThresholdDb"
          />

          <div class="audio-dash__group">
            <p class="audio-dash__group-title">{{ $t('audioDashboard.micEffects') }}</p>

            <div class="audio-dash__pills">
              <button
                type="button"
                class="audio-dash__pill"
                :class="micLimiterEnabled ? 'audio-dash__pill--on' : ''"
                @click="micLimiterEnabled = !micLimiterEnabled"
              >
                Limiter {{ micLimiterEnabled ? 'ON' : 'OFF' }}
              </button>

              <button
                type="button"
                class="audio-dash__pill"
                :class="micBassBoostEnabled ? 'audio-dash__pill--on' : ''"
                @click="micBassBoostEnabled = !micBassBoostEnabled"
              >
                Radiowy Bas {{ micBassBoostEnabled ? 'ON' : 'OFF' }}
              </button>

              <button
                type="button"
                class="audio-dash__pill audio-dash__pill--tip"
                :class="micStudioModeEnabled ? 'audio-dash__pill--on' : ''"
                :title="$t('audioDashboard.studioModeHint')"
                @click="micStudioModeEnabled = !micStudioModeEnabled"
              >
                Tryb Studio {{ micStudioModeEnabled ? 'ON' : 'OFF' }}
              </button>

              <button
                type="button"
                class="audio-dash__pill"
                :class="micMonitoringEnabled ? 'audio-dash__pill--on' : ''"
                @click="micMonitoringEnabled = !micMonitoringEnabled"
              >
                Odsłuch {{ micMonitoringEnabled ? 'ON' : 'OFF' }}
              </button>
            </div>

            <div class="audio-dash__group audio-dash__group--sub">
              <p class="audio-dash__group-title">{{ $t('audioDashboard.voicePresets') }}</p>
              <div class="audio-dash__pills audio-dash__pills--wrap">
                <button
                  v-for="preset in voicePresets"
                  :key="preset.id"
                  type="button"
                  class="audio-dash__chip"
                  :class="{ 'audio-dash__chip--active': activeVoicePreset === preset.id }"
                  @click="selectVoicePreset(preset.id)"
                >
                  {{ preset.label }}
                </button>
              </div>
            </div>

            <div class="audio-dash__param-block">
              <div class="audio-dash__row">
                <span class="audio-dash__muted">{{ $t('audioDashboard.noiseGate') }}</span>
                <span
                  class="audio-dash__mono"
                  :class="isAutoGate ? 'audio-dash__mono--ok' : 'audio-dash__mono--accent'"
                >
                  {{
                    isAutoGate
                      ? $t('audioDashboard.autoGate')
                      : micInputThresholdDb.toFixed(1) + ' dB'
                  }}
                </span>
              </div>
              <input
                v-model.number="micInputThresholdSliderPercent"
                type="range"
                min="0"
                max="100"
                step="0.5"
                class="audio-dash__slider audio-dash__slider--monitor w-full"
                :class="isAutoGate ? 'audio-dash__slider--system' : ''"
              />
              <p v-if="isAutoGate" class="audio-dash__fineprint">
                {{ $t('audioDashboard.autoGateHint') }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div class="audio-dash__block">
        <div class="audio-dash__row">
          <span class="audio-dash__muted">{{ $t('audioDashboard.mySystemAudio') }}</span>
          <span class="audio-dash__mono audio-dash__mono--accent">{{ mySystemPercent }}%</span>
        </div>

        <div class="audio-dash__row audio-dash__row--tight">
          <input
            v-model.number="mySystemPercent"
            type="range"
            min="0"
            max="100"
            step="1"
            class="audio-dash__slider audio-dash__slider--system flex-1"
          />
          <button
            type="button"
            class="audio-dash__icon-btn"
            :class="
              isMySystemMuted ? 'audio-dash__icon-btn--danger' : 'audio-dash__icon-btn--neutral'
            "
            :title="
              isMySystemMuted ? $t('audioDashboard.unmuteSystem') : $t('audioDashboard.muteSystem')
            "
            @click="toggleMySystemMute()"
          >
            {{ isMySystemMuted ? '🔇' : '🔊' }}
          </button>
        </div>
      </div>

      <hr class="audio-dash__rule" />
      <h3 class="audio-dash__section-head">{{ $t('audioDashboard.sectionMonitor') }}</h3>

      <div class="audio-dash__block">
        <div class="audio-dash__row">
          <span class="audio-dash__muted audio-dash__muted--inline">
            {{ $t('audioDashboard.guestMic') }}
            <span class="audio-dash__info" :title="$t('audioDashboard.duckingExplain')">i</span>
          </span>
          <span class="audio-dash__mono audio-dash__mono--accent">{{ guestMicPercent }}%</span>
        </div>
        <p class="audio-dash__fineprint audio-dash__fineprint--mb">
          {{ $t('audioDashboard.duckingExplain') }}
        </p>
        <input
          v-model.number="guestMicPercent"
          type="range"
          min="0"
          max="100"
          step="1"
          class="audio-dash__slider audio-dash__slider--monitor w-full"
        />
      </div>

      <div class="audio-dash__block">
        <div class="audio-dash__row">
          <span class="audio-dash__muted">{{ $t('audioDashboard.guestSystem') }}</span>
          <span class="audio-dash__mono audio-dash__mono--accent">{{ guestSystemPercent }}%</span>
        </div>
        <div class="audio-dash__row audio-dash__row--tight">
          <input
            v-model.number="guestSystemPercent"
            type="range"
            min="0"
            max="100"
            step="1"
            class="audio-dash__slider audio-dash__slider--guest flex-1"
          />
          <button
            type="button"
            class="audio-dash__icon-btn"
            :class="
              isGuestSystemMuted ? 'audio-dash__icon-btn--danger' : 'audio-dash__icon-btn--neutral'
            "
            :title="
              isGuestSystemMuted
                ? $t('audioDashboard.unmuteGuestSystem')
                : $t('audioDashboard.muteGuestSystem')
            "
            @click="toggleGuestSystemMute()"
          >
            {{ isGuestSystemMuted ? '🔇' : '🔊' }}
          </button>
        </div>
      </div>

      <hr class="audio-dash__rule" />

      <div class="audio-dash__advanced">
        <button
          type="button"
          class="audio-dash__advanced-toggle"
          @click="isAdvancedOpen = !isAdvancedOpen"
        >
          <h3 class="audio-dash__section-head audio-dash__section-head--toggle">
            {{ $t('audioDashboard.advancedDucking') }}
          </h3>
          <span class="audio-dash__chev">{{ isAdvancedOpen ? '▲' : '▼' }}</span>
        </button>

        <div v-show="isAdvancedOpen" class="audio-dash__advanced-body">
          <div class="audio-dash__group">
            <div class="audio-dash__row audio-dash__row--wrap">
              <p class="audio-dash__muted">
                {{ $t('audioDashboard.duckingPresets') }}
                <span class="audio-dash__fineprint audio-dash__fineprint--inline">{{
                  $t('audioDashboard.duckingPresetsHint')
                }}</span>
              </p>
              <button
                type="button"
                class="audio-dash__btn audio-dash__btn--ghost"
                @click="resetDuckingToDefault()"
              >
                {{ $t('audioDashboard.resetDucking') }}
              </button>
            </div>

            <div class="audio-dash__duck-grid">
              <button
                v-for="preset in duckingPresets"
                :key="preset.id"
                type="button"
                class="audio-dash__duck-card"
                :class="{ 'audio-dash__duck-card--active': isPresetActive(preset) }"
                @click="applyDuckingPreset(preset)"
              >
                <p class="audio-dash__duck-name">{{ preset.label }}</p>
                <p class="audio-dash__duck-hint">{{ preset.hint }}</p>
              </button>
            </div>

            <p class="audio-dash__fineprint">
              {{ $t('audioDashboard.activePreset') }}
              <span class="audio-dash__mono audio-dash__mono--accent">{{
                activeDuckingPreset?.label ?? 'Custom'
              }}</span>
            </p>
          </div>

          <div class="audio-dash__param-stack">
            <div class="audio-dash__param-block">
              <div class="audio-dash__row">
                <span class="audio-dash__muted">{{ $t('audioDashboard.duckingLevel') }}</span>
                <span class="audio-dash__mono audio-dash__mono--accent">{{
                  sessionStore.audioDuckingLevel.toFixed(2)
                }}</span>
              </div>
              <input
                v-model.number="sessionStore.audioDuckingLevel"
                class="audio-dash__slider audio-dash__slider--ducking w-full"
                type="range"
                min="0"
                max="1"
                step="0.01"
              />
            </div>

            <div class="audio-dash__param-block">
              <div class="audio-dash__row">
                <span class="audio-dash__muted">{{ $t('audioDashboard.duckingThreshold') }}</span>
                <span class="audio-dash__mono audio-dash__mono--accent">{{
                  sessionStore.audioSpeechThreshold.toFixed(3)
                }}</span>
              </div>
              <input
                v-model.number="sessionStore.audioSpeechThreshold"
                class="audio-dash__slider audio-dash__slider--ducking w-full"
                type="range"
                min="0"
                max="0.1"
                step="0.001"
              />
            </div>

            <div class="audio-dash__param-block">
              <div class="audio-dash__row">
                <span class="audio-dash__muted">{{ $t('audioDashboard.attackSmoothing') }}</span>
                <span class="audio-dash__mono audio-dash__mono--accent"
                  >{{ sessionStore.audioGainSmoothing.toFixed(2) }} s</span
                >
              </div>
              <input
                v-model.number="sessionStore.audioGainSmoothing"
                class="audio-dash__slider audio-dash__slider--ducking w-full"
                type="range"
                min="0.01"
                max="0.5"
                step="0.01"
              />
            </div>

            <div class="audio-dash__param-block">
              <div class="audio-dash__row">
                <span class="audio-dash__muted">{{ $t('audioDashboard.holdFrames') }}</span>
                <span class="audio-dash__mono audio-dash__mono--accent"
                  >{{ sessionStore.audioHoldFrames }} {{ $t('audioDashboard.framesUnit') }}</span
                >
              </div>
              <input
                v-model.number="sessionStore.audioHoldFrames"
                class="audio-dash__slider audio-dash__slider--ducking w-full"
                type="range"
                min="0"
                max="30"
                step="1"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.audio-dash {
  --ad-border: rgba(167, 73, 252, 0.38);
  --ad-border-soft: rgba(167, 73, 252, 0.22);
  --ad-surface: rgba(6, 0, 31, 0.55);
  --ad-surface-deep: rgba(13, 0, 53, 0.5);
  --ad-text: rgba(255, 255, 255, 0.92);
  --ad-muted: rgba(255, 255, 255, 0.72);
  --ad-accent: #c084fc;
  --ad-lime: #d0f224;
  --ad-warn: #fbbf24;
}

.audio-dash__flow {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.audio-dash__section-head {
  margin: 20px 0 12px;
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--ad-text);
}

.audio-dash__section-head:first-child {
  margin-top: 0;
}

.audio-dash__section-head--toggle {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
}

.audio-dash__rule {
  margin: 18px 0 0;
  border: none;
  height: 1px;
  background: rgba(255, 255, 255, 0.08);
}

.audio-dash__advanced {
  padding-top: 2px;
}

.audio-dash__block + .audio-dash__block {
  margin-top: 14px;
}

.audio-dash__label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--ad-muted);
  margin-bottom: 6px;
}

.audio-dash__select {
  width: 100%;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: var(--ad-surface-deep);
  color: #f4f4f8;
  font-size: 13px;
  font-family: inherit;
}

.audio-dash__select:focus-visible {
  outline: 2px solid rgba(167, 73, 252, 0.75);
  outline-offset: 2px;
}

.audio-dash__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
}

.audio-dash__row--tight {
  margin-bottom: 0;
}

.audio-dash__row--wrap {
  flex-wrap: wrap;
  align-items: flex-start;
}

.audio-dash__muted {
  font-size: 12px;
  color: var(--ad-muted);
}

.audio-dash__muted--inline {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.audio-dash__mono {
  font-size: 12px;
  font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
  font-weight: 600;
}

.audio-dash__mono--accent {
  color: var(--ad-accent);
}

.audio-dash__mono--warn {
  color: var(--ad-warn);
}

.audio-dash__mono--ok {
  color: #86efac;
}

.audio-dash__info {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 999px;
  border: 1px solid rgba(192, 132, 252, 0.55);
  font-size: 10px;
  font-weight: 700;
  color: var(--ad-accent);
  cursor: help;
}

.audio-dash__stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.audio-dash__group {
  margin-top: 6px;
  padding: 0;
  border: none;
  background: transparent;
}

.audio-dash__group--sub {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.07);
}

.audio-dash__group-title {
  margin: 0 0 10px;
  font-size: 13px;
  font-weight: 700;
  color: var(--ad-text);
}

.audio-dash__param-stack {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.audio-dash__param-block {
  margin: 0;
}

.audio-dash__pills {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.audio-dash__pills--wrap {
  margin-top: 0;
}

.audio-dash__pill {
  padding: 7px 12px;
  border-radius: 9px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.06);
  color: var(--ad-muted);
  font-size: 11px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition:
    background 0.18s ease,
    border-color 0.18s ease,
    color 0.18s ease;
}

.audio-dash__pill:hover {
  border-color: rgba(192, 132, 252, 0.45);
  color: var(--ad-text);
}

.audio-dash__pill--on {
  border-color: rgba(192, 132, 252, 0.75);
  background: rgba(192, 132, 252, 0.18);
  color: #f5e8ff;
}

.audio-dash__chip {
  padding: 6px 14px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(0, 0, 0, 0.2);
  color: var(--ad-muted);
  font-size: 11px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition:
    background 0.18s ease,
    border-color 0.18s ease,
    color 0.18s ease;
}

.audio-dash__chip:hover {
  border-color: rgba(192, 132, 252, 0.4);
}

.audio-dash__chip--active {
  border-color: rgba(208, 242, 36, 0.55);
  background: rgba(208, 242, 36, 0.14);
  color: var(--ad-lime);
}

.audio-dash__icon-btn {
  flex-shrink: 0;
  width: 38px;
  height: 38px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.06);
  font-size: 15px;
  line-height: 1;
  cursor: pointer;
  transition:
    border-color 0.18s ease,
    background 0.18s ease;
}

.audio-dash__icon-btn--neutral:hover {
  border-color: rgba(192, 132, 252, 0.55);
}

.audio-dash__icon-btn--danger {
  border-color: rgba(248, 113, 113, 0.45);
  background: rgba(127, 29, 29, 0.25);
}

.audio-dash__btn {
  padding: 8px 14px;
  border-radius: 9px;
  font-size: 12px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition:
    background 0.18s ease,
    border-color 0.18s ease;
}

.audio-dash__btn--ghost {
  background: rgba(255, 255, 255, 0.06);
  color: var(--ad-muted);
}

.audio-dash__btn--ghost:hover {
  border-color: rgba(192, 132, 252, 0.5);
  color: var(--ad-text);
}

.audio-dash__advanced-toggle {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
}

.audio-dash__advanced-toggle:hover .audio-dash__section-head--toggle {
  color: var(--ad-accent);
}

.audio-dash__chev {
  font-size: 11px;
  color: var(--ad-accent);
  flex-shrink: 0;
}

.audio-dash__advanced-body {
  margin-top: 14px;
  padding-top: 4px;
}

.audio-dash__duck-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}

@media (min-width: 640px) {
  .audio-dash__duck-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.audio-dash__duck-card {
  text-align: left;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(0, 0, 0, 0.15);
  cursor: pointer;
  font-family: inherit;
  transition:
    border-color 0.18s ease,
    background 0.18s ease;
}

.audio-dash__duck-card:hover {
  border-color: rgba(192, 132, 252, 0.45);
}

.audio-dash__duck-card--active {
  border-color: rgba(192, 132, 252, 0.65);
  background: rgba(192, 132, 252, 0.12);
}

.audio-dash__duck-name {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--ad-text);
}

.audio-dash__duck-hint {
  margin: 6px 0 0;
  font-size: 11px;
  line-height: 1.35;
  color: var(--ad-muted);
}

.audio-dash__fineprint {
  margin: 6px 0 0;
  font-size: 11px;
  line-height: 1.4;
  color: rgba(255, 255, 255, 0.55);
}

.audio-dash__fineprint--mb {
  margin-bottom: 8px;
}

.audio-dash__fineprint--inline {
  margin: 0;
  display: inline;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.45);
}

.audio-dash__meter {
  width: 100%;
}

/* Sliders — kolorystyka jak w ustawieniach (fiolet + lime) */
.audio-dash__slider {
  appearance: none;
  flex: 1;
  min-width: 0;
  height: 8px;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(30, 10, 50, 0.9) 0%, rgba(50, 20, 80, 0.5) 100%);
  border: 1px solid rgba(167, 73, 252, 0.25);
  outline: none;
}

.audio-dash__slider::-webkit-slider-thumb {
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 999px;
  background: #c084fc;
  border: 2px solid rgba(245, 230, 255, 0.95);
  box-shadow: 0 0 10px rgba(192, 132, 252, 0.45);
  cursor: pointer;
  transition: transform 0.15s ease;
}

.audio-dash__slider::-webkit-slider-thumb:hover {
  transform: scale(1.06);
}

.audio-dash__slider--mic::-webkit-slider-thumb {
  background: #c084fc;
  box-shadow: 0 0 12px rgba(192, 132, 252, 0.5);
}

.audio-dash__slider--boost {
  background: linear-gradient(90deg, rgba(60, 35, 15, 0.85) 0%, rgba(90, 45, 20, 0.55) 100%);
  border-color: rgba(251, 191, 36, 0.35);
}

.audio-dash__slider--boost::-webkit-slider-thumb {
  background: var(--ad-warn);
  border-color: #fef3c7;
  box-shadow: 0 0 12px rgba(251, 191, 36, 0.45);
}

.audio-dash__slider--system::-webkit-slider-thumb {
  background: #d0f224;
  border-color: #ecfccb;
  box-shadow: 0 0 12px rgba(208, 242, 36, 0.35);
}

.audio-dash__slider--monitor::-webkit-slider-thumb {
  background: #e9d5ff;
  border-color: #faf5ff;
  box-shadow: 0 0 10px rgba(233, 213, 255, 0.5);
}

.audio-dash__slider--guest::-webkit-slider-thumb {
  background: #d8b4fe;
  border-color: #f3e8ff;
  box-shadow: 0 0 10px rgba(216, 180, 254, 0.45);
}

.audio-dash__slider--ducking::-webkit-slider-thumb {
  background: #d0f224;
  border-color: rgba(208, 242, 36, 0.85);
  box-shadow: 0 0 10px rgba(208, 242, 36, 0.35);
}

.audio-dash__slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(245, 230, 255, 0.95);
  border-radius: 999px;
  background: #c084fc;
  cursor: pointer;
}

.audio-dash__slider::-moz-range-track {
  height: 8px;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(30, 10, 50, 0.9) 0%, rgba(50, 20, 80, 0.5) 100%);
  border: 1px solid rgba(167, 73, 252, 0.25);
}

/* Jasny motyw (spójnie ze stroną ustawień) */
:root[data-theme='light'] .audio-dash {
  --ad-border: rgba(124, 58, 237, 0.35);
  --ad-border-soft: rgba(124, 58, 237, 0.18);
  --ad-surface: rgba(255, 255, 255, 0.88);
  --ad-surface-deep: rgba(244, 244, 250, 0.98);
  --ad-text: #111827;
  --ad-muted: rgba(17, 24, 39, 0.68);
  --ad-accent: #7c3aed;
}

:root[data-theme='light'] .audio-dash__select {
  background: #fff;
  color: #111827;
  border-color: rgba(17, 24, 39, 0.15);
}

:root[data-theme='light'] .audio-dash__slider {
  background: linear-gradient(90deg, rgba(237, 233, 254, 0.95) 0%, rgba(221, 214, 254, 0.65) 100%);
  border-color: rgba(124, 58, 237, 0.2);
}

:root[data-theme='light'] .audio-dash__duck-card {
  background: rgba(255, 255, 255, 0.75);
  border-color: rgba(124, 58, 237, 0.15);
}

:root[data-theme='light'] .audio-dash__rule {
  background: rgba(17, 24, 39, 0.1);
}

:root[data-theme='light'] .audio-dash__group--sub {
  border-top-color: rgba(17, 24, 39, 0.08);
}

:root[data-theme='light'] .audio-dash__fineprint {
  color: rgba(17, 24, 39, 0.55);
}
</style>
