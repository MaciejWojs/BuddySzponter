<template>
  <div class="bu-progress-container w-full relative">
    <div
      v-if="type === 'progress'"
      class="bu-progress-track relative w-full h-2 bg-[#37363F] rounded-full overflow-hidden"
    >
      <div
        ref="progressBar"
        class="bu-progress-indicator absolute top-0 left-0 h-full bg-[#A749FC] rounded-full"
      />
    </div>

    <div
      v-if="type === 'strong'"
      class="bu-strong-track relative w-full h-2 bg-[#37363F] rounded-full overflow-hidden opacity-50"
    >
      <div
        ref="strongBar"
        class="bu-strong-indicator absolute top-0 left-0 h-full rounded-full transition-colors duration-300"
        :class="{
          'bg-red-500': strongColor === 'error',
          'bg-yellow-500': strongColor === 'warning',
          'bg-green-500': strongColor === 'success'
        }"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, type PropType } from 'vue'
import gsap from 'gsap'

const props = defineProps({
  type: {
    type: String as PropType<'strong' | 'progress'>,
    default: 'progress'
  },
  modelValue: {
    type: Number,
    default: 0
  },
  color: {
    type: String as PropType<'primary' | 'error' | 'warning' | 'success'>,
    default: undefined
  },
  steps: {
    type: Number,
    default: 100
  }
})

const progressBar = ref<HTMLElement | null>(null)
const strongBar = ref<HTMLElement | null>(null)

const max = computed(() => (props.type === 'strong' ? 4 : props.steps))
const strongColor = computed(() => {
  if (props.color) return props.color
  return props.modelValue <= 1 ? 'error' : props.modelValue <= 3 ? 'warning' : 'success'
})

const updateProgress = (value: number): void => {
  const percentage = Math.min(Math.max((value / max.value) * 100, 0), 100)

  if (props.type === 'progress' && progressBar.value) {
    gsap.to(progressBar.value, {
      width: `${percentage}%`,
      duration: 0.5,
      ease: 'power1.out'
    })
  } else if (props.type === 'strong' && strongBar.value) {
    gsap.to(strongBar.value, {
      width: `${percentage}%`,
      duration: 0.5,
      ease: 'power1.out'
    })
  }
}

watch(
  () => props.modelValue,
  (newVal) => {
    updateProgress(newVal)
  }
)

onMounted(() => {
  updateProgress(props.modelValue)
})
</script>

<style scoped></style>
