<template>
  <button
    :type="buttonType"
    :disabled="props.disabled || props.loading"
    class="settings-button"
    :class="{
      'settings-button--disabled': props.disabled,
      'settings-button--loading': props.loading,
      'settings-button--active': props.active
    }"
    :style="{ width: props.size + 'px', height: props.size + 'px' }"
  >
    <span v-if="props.loading" class="settings-button__spinner" />
    <slot v-else>
      <SettingsIcon class="settings-button__icon" />
    </slot>
  </button>
</template>

<script setup lang="ts">
import SettingsIcon from '@renderer/assets/images/ui/Setting.svg?component'

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
.settings-button {
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
.settings-button:hover:not(:disabled) {
  background-color: #1a0045;
  box-shadow: 0 2px 18px rgba(167, 73, 252, 0.25);
}
.settings-button:active:not(:disabled) {
  background-color: #2a0060;
  box-shadow: 0 0 14px rgba(167, 73, 252, 0.5);
}
.settings-button--active {
  background-color: #2a0060;
  box-shadow: 0 0 14px rgba(167, 73, 252, 0.5);
}
.settings-button--active .settings-button__icon {
  filter: drop-shadow(0 0 6px #a749fc);
}
.settings-button--disabled,
.settings-button--loading {
  opacity: 0.5;
  cursor: not-allowed;
}
.settings-button__icon {
  width: 60%;
  height: 60%;
}
.settings-button__spinner {
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
