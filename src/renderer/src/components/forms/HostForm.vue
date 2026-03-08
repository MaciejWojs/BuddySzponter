<script lang="ts" setup>
import { ref } from 'vue'

const sessionCode = ref('')
const sessionPassword = ref('')
</script>

<template>
  <div>
    <div id="sessionCode" class="flex flex-col items-center">
      <h3>Session Code</h3>
      <BuInput v-model="sessionCode" />
    </div>
    <div id="sessionPassword" class="flex flex-col items-center">
      <h3>Session Password</h3>
      <BuInput v-model="sessionPassword" />
    </div>
  </div>
</template>

<style lang="scss" scoped></style>
