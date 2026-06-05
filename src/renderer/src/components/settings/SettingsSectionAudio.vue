<script setup lang="ts">
import AudioDashboard from '@renderer/components/audio/AudioDashboard.vue'
</script>

<template>
  <section id="settings-audio" class="settings-dc__section">
    <h2 class="settings-dc__section-title">{{ $t('settingsPage.sectionAudio') }}</h2>
    <AudioDashboard />
  </section>
</template>
