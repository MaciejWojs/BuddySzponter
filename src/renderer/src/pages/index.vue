<template>
  <div class="home-page">
    <div class="w-1/2 flex flex-col items-center gap-4">
      <BuTimer ref="timerRef" @tick="currentTime = $event" @finish="currentTime = 0" />
      <UButton @click="startTimer(25)">Start 25s</UButton>
      <BuProgress :model-value="currentTime" type="progress" :steps="25" />
    </div>
  </div>
  <!-- <router-link to="/about">Przejdź do About</router-link> -->
</template>

<script setup lang="ts">
import { ref, useTemplateRef } from 'vue'
import BuTimer from '@renderer/components/simpleComponents/BuTimer.vue'

const timerRef = useTemplateRef<InstanceType<typeof BuTimer>>('timerRef')
const currentTime = ref(0)

function startTimer(seconds: number): void {
  currentTime.value = seconds
  timerRef.value?.setTime(seconds)
}
</script>

<style scoped>
.home-page {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100vh;
}
</style>
