<template>
  <!-- Widok sesji współdzielonej: pasek sterowania i obszar docelowy dla strumienia obrazu. -->
  <div class="main-container">
    <SharingNavBar />
    <div id="video-container" ref="videoContainer" class="video-container">
      <div v-if="!streamActive" class="placeholder">{{ $t('shared.waitingSignal') }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Logika widoku współdzielenia: referencje kontenera wideo i stan aktywności strumienia.
import { ref } from 'vue'
import SharingNavBar from '../components/simpleComponents/SharingNavBar.vue'

const videoContainer = ref(null)
const streamActive = ref(false)

defineExpose({ videoContainer, streamActive })

// Po zamontowaniu widoku aplikacja próbuje przejść w tryb pełnoekranowy.
import { onMounted } from 'vue'
onMounted(() => {
  if (document.fullscreenEnabled) {
    document.documentElement.requestFullscreen().catch(() => {})
  }
})
</script>

<style scoped>
.main-container {
  width: 100vw;
  height: 100vh;
  background: #03000c;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  box-sizing: border-box;
  border: 3px solid #a259ff;
  box-shadow: 0 0 16px 2px #a259ff99;
  /* Glow efekt */
  position: relative;
}

.video-container {
  flex: 1;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}

.placeholder {
  color: #a259ff;
  font-size: 2rem;
  opacity: 0.7;
  user-select: none;
}
</style>
