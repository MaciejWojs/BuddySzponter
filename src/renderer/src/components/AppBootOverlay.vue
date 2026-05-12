<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useBootStore } from '@renderer/stores/bootStore'

const bootStore = useBootStore()
const { currentStepKey } = storeToRefs(bootStore)
const { t } = useI18n()
</script>

<template>
  <div class="app-boot-overlay" role="status" aria-live="polite">
    <div class="app-boot-inner">
      <div class="app-boot-animation-slot" aria-hidden="true" />
      <p class="app-boot-status">
        {{ currentStepKey ? t(currentStepKey) : t('boot.loading') }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.app-boot-overlay {
  position: fixed;
  inset: 0;
  z-index: 30000;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-background);
}

.app-boot-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  text-align: center;
}

.app-boot-animation-slot {
  min-height: 48px;
  min-width: 48px;
}

.app-boot-status {
  margin: 0;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--color-foreground, rgba(255, 255, 255, 0.88));
  max-width: min(420px, 90vw);
  line-height: 1.45;
}
</style>
