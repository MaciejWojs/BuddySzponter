<template>
  <button
    :type="buttonType"
    :disabled="props.disabled || props.loading"
    class="select-button"
    :class="{
      'select-button--disabled': props.disabled,
      'select-button--loading': props.loading,
      'select-button--active': props.active
    }"
    @click="emit('click', $event)"
  >
    <span v-if="props.loading" class="select-button__spinner" />
    <span class="select-button__label"
      ><slot>{{ props.label }}</slot></span
    >
    <span class="select-button__arrow"><slot name="arrow"></slot></span>
  </button>
</template>

<script setup lang="ts">
const buttonType = computed(() => props.type as 'button' | 'submit' | 'reset')

const emit = defineEmits<{
  (e: 'click', event: MouseEvent): void
}>()

const props = defineProps({
  label: {
    type: String,
    default: 'Data'
  },
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
  }
})
</script>

<style scoped>
.select-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  font-family: 'jetbrains mono', monospace;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: color 0.2s;
}
.select-button:hover:not(:disabled) {
  color: #ffffff;
}
.select-button:hover:not(:disabled) .select-button__arrow {
  transform: translateX(3px);
}
.select-button:active:not(:disabled) {
  color: rgba(255, 255, 255, 0.4);
}
.select-button--active {
  color: #a749fc;
}
.select-button--active:hover:not(:disabled) {
  color: #bf7afd;
}
.select-button--disabled,
.select-button--loading {
  opacity: 0.5;
  cursor: not-allowed;
}
.select-button__arrow {
  font-size: 1.1rem;
  line-height: 1;
  transition: transform 0.2s;
}
.select-button__spinner {
  width: 12px;
  height: 12px;
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
