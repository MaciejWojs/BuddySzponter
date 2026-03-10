<template>
  <button
    :type="buttonType"
    :disabled="props.disabled || props.loading"
    class="device-button"
    :class="{
      'device-button--disabled': props.disabled,
      'device-button--loading': props.loading,
      'device-button--active': props.active
    }"
    :style="{ width: props.size + 'px', height: props.size + 'px' }"
  >
    <span v-if="props.loading" class="device-button__spinner" />
    <slot v-else>
      <DeviceIcon class="device-button__icon" />
    </slot>
  </button>
</template>

<script setup lang="ts">
import DeviceIcon from '@renderer/assets/images/ui/devices.svg?component'

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
  size: {
    type: Number,
    default: 52
  }
})

const buttonType = computed(() => props.type as 'button' | 'submit' | 'reset')
</script>

<style scoped>
.device-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  background-color: #0a0028;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition:
    background-color 0.2s,
    box-shadow 0.2s,
    opacity 0.2s;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.4);
}
.device-button:hover:not(:disabled) {
  background-color: #1a0045;
  box-shadow: 0 2px 18px rgba(167, 73, 252, 0.25);
}
.device-button:active:not(:disabled) {
  background-color: #2a0060;
  box-shadow: 0 0 14px rgba(167, 73, 252, 0.5);
}
.device-button--active {
  background-color: #2a0060;
  box-shadow: 0 0 14px rgba(167, 73, 252, 0.5);
}
.device-button--active .device-button__icon {
  filter: drop-shadow(0 0 6px #a749fc);
}
.device-button--disabled,
.device-button--loading {
  opacity: 0.5;
  cursor: not-allowed;
}
.device-button__icon {
  width: 60%;
  height: 60%;
  object-fit: contain;
}
.device-button__spinner {
  width: 18px;
  height: 18px;
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
