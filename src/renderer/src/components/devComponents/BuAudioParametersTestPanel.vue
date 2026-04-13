<template>
  <div class="bg-black border border-[#333] rounded-lg p-5 flex flex-col gap-4">
    <h3 class="text-lg font-semibold text-[#e0e0e0] m-0">🎛️ Parametry Miksera Audio</h3>

    <AudioParametersPanel
      ref="panelRef"
      title="Konfiguracja Silnika Tłumienia"
      @apply="applyAudioParameters"
    >
      <AudioParameterSlider
        v-model="duckingSystemGain"
        label="Ducked System Gain"
        description="Określa na ile będzie zmniejszony dźwięk systemu gdy zostanie wykryty głos. Wartość 0 = cisza całkowita, 1 = pełna głośność. Typowo 0.3 to dobre tłumienie bez całkowitego wyciszenia muzyki w tle."
        :min="0"
        :max="1"
        :step="0.01"
      />

      <AudioParameterSlider
        v-model="speechThreshold"
        label="Speech Detection Threshold"
        description="Próg wrażliwości dla algorytmu RMS (Root Mean Square). Niższe wartości = większa czułość (szybciej wykrywa cichy głos). Wyższe wartości = mniej czułość (tylko głośny głos). Zakres: 0.01-0.05. Wartość 0.02 to kompromis dla zwykłych rozmów."
        :min="0"
        :max="0.2"
        :step="0.001"
      />

      <AudioParameterSlider
        v-model="gainSmoothing"
        label="Gain Smoothing "
        description="Kontroluje jak szybko zmienia się tłumienie audio systemu. Wyższe wartości = bardziej płynne, wolne przejścia bez trzasków. Niższe wartości = szybkie, ostre zmiany. Wartość 0.08 zapewnia naturalną, gładką interpolację bez artefaktów."
        :min="0"
        :max="0.5"
        :step="0.01"
      />

      <AudioParameterSlider
        v-model="holdFrames"
        label="Hold Frames"
        description="Liczba klatek, przez które tłumienie pozostaje aktywne po zakończeniu detekcji głosu. Zapobiega drganiu tłumienia gdy mowa się przerywa. Każda klatka to ~16ms (przy 60 FPS). Wartość 8 = ~128ms opóźnienia przed pełnym przywróceniem głośności."
        :min="0"
        :max="30"
        :step="1"
      />

      <AudioParameterSlider
        v-model="inputThreshold"
        label="Próg Wejścia (Kompresor)"
        description="Próg kompresora (w dB). Po jego przekroczeniu sygnał zaczyna być ściskany. Niżej (np. -20) = mocniejsza kompresja, wyżej (np. -6) = łagodniejsza."
        :min="-30"
        :max="0"
        :step="1"
      />

      <AudioParameterSlider
        v-model="limiterThreshold"
        label="Próg Limitera"
        description="Maksymalny sufit sygnału (w dB), który limiter przepuści bez cięcia. Typowo blisko 0 dB, np. -1 dB, aby uniknąć clippingu i przesteru."
        :min="-12"
        :max="0"
        :step="0.5"
      />
    </AudioParametersPanel>

    <div class="bg-[#1e1e1e] border border-[#333] rounded-lg p-4">
      <h4 class="text-xs font-semibold text-[#888] uppercase mb-3">Bieżące Wartości</h4>
      <div class="space-y-2 text-xs font-mono">
        <div class="flex justify-between">
          <span class="text-[#888]">Tłumienie Systemu:</span>
          <span class="text-[#a6e22e]"
            >{{ duckingSystemGain.toFixed(3) }} ({{ (duckingSystemGain * 100).toFixed(1) }}%)</span
          >
        </div>
        <div class="flex justify-between">
          <span class="text-[#888]">Czułość Mowy:</span>
          <span class="text-[#a6e22e]">{{ speechThreshold.toFixed(4) }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-[#888]">Gładkość:</span>
          <span class="text-[#a6e22e]">{{ gainSmoothing.toFixed(3) }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-[#888]">Hold Frames:</span>
          <span class="text-[#a6e22e]">{{ Math.round(holdFrames) }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-[#888]">Próg Wejścia:</span>
          <span class="text-[#a6e22e]">{{ inputThreshold.toFixed(1) }} dB</span>
        </div>
        <div class="flex justify-between">
          <span class="text-[#888]">Próg Limitera:</span>
          <span class="text-[#a6e22e]">{{ limiterThreshold.toFixed(1) }} dB</span>
        </div>
      </div>
    </div>

    <div class="bg-[#1e1e1e] border border-[#333] rounded-lg p-4">
      <h4 class="text-xs font-semibold text-[#888] uppercase mb-3">ℹ️ Jak to Działa?</h4>
      <div class="space-y-2 text-xs text-[#888]">
        <p class="mb-0">
          <span class="text-[#a6e22e] font-semibold">Silnik Tłumienia</span> automatycznie redukuje
          głośność dźwięku systemu (muzyka, powiadomienia) gdy zostanie wykryta mowa użytkownika.
          Dzięki temu rozmówca słyszy Cię wyraźniej.
        </p>
        <p class="mb-0">
          <span class="text-[#66d9ef] font-semibold">Algorytm RMS</span> analizuje amplitudę audio z
          mikrofonu w real-time. Gdy energia dźwięku przekroczy próg (Speech Threshold), tłumienie
          się aktywuje.
        </p>
        <p class="mb-0">
          <span class="text-[#f92672] font-semibold">Gładkie Przejścia</span> są kluczowe - bez nich
          słyszałbyś trzaski (audio clicks). setTargetAtTime zapewnia naturalną interpolację.
        </p>
        <p class="mb-0">
          🎙️ <span class="font-semibold">Domyślne ustawienia (0.3, 0.02, 0.08, 8)</span> sprawdzają
          się dla większości scenariuszy. Jeśli mowa jest tłumiona zbyt szybko, zwiększ Czas
          Utrzymania.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AudioParametersPanel from '@renderer/components/audio/AudioParametersPanel.vue'
import AudioParameterSlider from '@renderer/components/audio/AudioParameterSlider.vue'
import { useWebRtcStore } from '@renderer/stores/webRtcStore'

const webRtcStore = useWebRtcStore()
const panelRef = ref<InstanceType<typeof AudioParametersPanel> | null>(null)

// Inicjalizuj wartości ze store
const duckingSystemGain = ref<number>(webRtcStore.audioDuckingLevel)
const speechThreshold = ref<number>(webRtcStore.audioSpeechThreshold)
const gainSmoothing = ref<number>(webRtcStore.audioGainSmoothing)
const holdFrames = ref<number>(webRtcStore.audioHoldFrames)
const inputThreshold = ref<number>(webRtcStore.audioInputThreshold)
const limiterThreshold = ref<number>(webRtcStore.audioLimiterThreshold)

onMounted(() => {
  // Synchronizuj z store jeśli zmieniły się wartości poza tym komponentem
  duckingSystemGain.value = webRtcStore.audioDuckingLevel
  speechThreshold.value = webRtcStore.audioSpeechThreshold
  gainSmoothing.value = webRtcStore.audioGainSmoothing
  holdFrames.value = webRtcStore.audioHoldFrames
  inputThreshold.value = webRtcStore.audioInputThreshold
  limiterThreshold.value = webRtcStore.audioLimiterThreshold
})

const applyAudioParameters = (): void => {
  // Aktualizuj wartości w store
  webRtcStore.audioDuckingLevel = duckingSystemGain.value
  webRtcStore.audioSpeechThreshold = speechThreshold.value
  webRtcStore.audioGainSmoothing = gainSmoothing.value
  webRtcStore.audioHoldFrames = holdFrames.value
  webRtcStore.audioInputThreshold = inputThreshold.value
  webRtcStore.audioLimiterThreshold = limiterThreshold.value

  console.log('Parametry Audio Zaktualizowane w Store:', {
    audioDuckingLevel: webRtcStore.audioDuckingLevel,
    audioSpeechThreshold: webRtcStore.audioSpeechThreshold,
    audioGainSmoothing: webRtcStore.audioGainSmoothing,
    audioHoldFrames: webRtcStore.audioHoldFrames,
    audioInputThreshold: webRtcStore.audioInputThreshold,
    audioLimiterThreshold: webRtcStore.audioLimiterThreshold
  })

  panelRef.value?.showStatus('Parametry audio zostały zapisane ✓', 'success')
}
</script>
