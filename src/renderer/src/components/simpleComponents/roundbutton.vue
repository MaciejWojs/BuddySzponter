<template>
    <button
        :type="props.type as 'button' | 'submit' | 'reset'"
        :disabled="props.disabled || props.loading"
        class="round-button"
        :class="{ 'round-button--disabled': props.disabled, 'round-button--loading': props.loading }"
        :style="{ width: props.width }"
    >
        <span v-if="props.loading" class="round-button__spinner" />
        <slot>{{ props.label }}</slot>
    </button>
</template>

<script setup lang="ts">
const props = defineProps({
    label: {
        type: String,
        default: 'Przycisk'
    },
    type: {
        type: String,
        default: 'button'
    },
    disabled: {
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
.round-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 10px 24px;
    background: linear-gradient(135deg, #a749fc 12%, #37363f 100%);
    color: #ffffff;
    border: none;
    border-radius: 50px;
    font-family: 'jetbrains mono', monospace;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s, box-shadow 0.2s, opacity 0.2s;
    box-shadow: 0 2px 14px rgba(167, 73, 252, 0.2);
}
.round-button:hover:not(:disabled) {
    background: linear-gradient(135deg, rgba(167, 73, 252, 0.22) 0%, #44434e 100%);
    box-shadow: 0 2px 20px rgba(167, 73, 252, 0.35);
}
.round-button:active:not(:disabled) {
    background: linear-gradient(135deg, rgba(167, 73, 252, 0.08) 0%, #2e2d36 100%);
    box-shadow: 0 1px 8px rgba(167, 73, 252, 0.15);
}
.round-button--disabled,
.round-button--loading {
    opacity: 0.5;
    cursor: not-allowed;
}
.round-button__spinner {
    width: 14px;
    height: 14px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: #ffffff;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    flex-shrink: 0;
}
@keyframes spin {
    to { transform: rotate(360deg); }
}
</style>
