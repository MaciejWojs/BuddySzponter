<template>
  <button
    :type="buttonType"
    :disabled="props.disabled || props.loading"
    class="dice-button"
    :class="{
      'dice-button--disabled': props.disabled,
      'dice-button--loading': props.loading,
      'dice-button--active': props.active
    }"
    :style="{ width: props.width }"
    @click="emit('click', $event)"
  >
    <span v-if="props.loading" class="dice-button__spinner" />
    <slot>
      <DiceIcon class="dice-button__icon" />
    </slot>
  </button>
</template>

<script setup lang="ts">
import DiceIcon from '@renderer/assets/images/components/dice.svg?component'
const buttonType = computed(() => props.type as 'button' | 'submit' | 'reset')
const emit = defineEmits<{
  (e: 'click', event: MouseEvent): void
}>()

const props = defineProps({
  type: {
    type: String,
    default: 'button'
  },
  disabled: {
    type: Boolean,
    default: false
  },
  active: {
    type: Boolean,
    default: false
  },
  loading: {
    type: Boolean,
    default: false
  },
  width: {
    type: String,
    default: 'auto'
  }
})
</script>

<style scoped>
.dice-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  background: none;
  border: none;
  cursor: pointer;
  transition: opacity 0.2s;
}
.dice-button:hover:not(:disabled) .dice-button__icon {
  filter: drop-shadow(0 0 4px rgba(167, 73, 252, 0.5));
}
.dice-button:active:not(:disabled) {
  opacity: 0.7;
}
.dice-button--active {
  background: none;
}
.dice-button--active .dice-button__icon {
  filter: drop-shadow(0 0 4px #a749fc);
}
.dice-button--disabled,
.dice-button--loading {
  opacity: 0.5;
  cursor: not-allowed;
}
.dice-button__icon {
  width: 20px;
  height: 20px;
}
.dice-button__spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  flex-shrink: 0;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
