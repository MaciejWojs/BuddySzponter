<!-- eslint-disable prettier/prettier -->
<!-- eslint-disable prettier/prettier -->
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import gsap from 'gsap'

interface Microphone {
  deviceId: string
  label: string
}

const props = defineProps<{
  modelValue: string
  microphones: Microphone[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const selected = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const selectElement = ref<HTMLSelectElement | null>(null)

onMounted(() => {
  if (selectElement.value) {
    gsap.from(selectElement.value, {
      duration: 0.5,
      opacity: 0,
      y: -20,
      ease: 'power2.out'
    })

    selectElement.value.addEventListener('mouseenter', () => {
      gsap.to(selectElement.value, {
        duration: 0.3,
        borderColor: '#481566',
        boxShadow: '0 0 10px rgba(72, 21, 102, 0.7)',
        ease: 'power2.out'
      })
    })

    selectElement.value.addEventListener('mouseleave', () => {
      gsap.to(selectElement.value, {
        duration: 0.3,
        borderColor: '#2d0f44',
        boxShadow: 'none',
        ease: 'power2.out'
      })
    })
  }
})
</script>

<template>
  <div class="mb-4">
    <label class="text-xs text-gray-400 block mb-1.5 px-1">Mikrofon</label>
    <select
      ref="selectElement"
      v-model="selected"
      class="w-full px-3 py-2 rounded-md text-gray-200 text-xs focus:outline-none focus:ring-1"
      style="background-color: #06001f; border: 1px solid #2d0f44; transition: all 0.3s"
    >
      <option value="" style="background-color: #06001f">Domyslny mikrofon</option>
      <option
        v-for="mic in microphones"
        :key="mic.deviceId"
        :value="mic.deviceId"
        style="background-color: #06001f"
      >
        {{ mic.label }}
      </option>
    </select>
  </div>
</template>
