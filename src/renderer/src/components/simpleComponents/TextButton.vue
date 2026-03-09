<template>
    <button
        :type="props.type as 'button' | 'submit' | 'reset'"
        :disabled="props.disabled || props.loading"
        class="text-button"
        :class="{ 'text-button--disabled': props.disabled, 'text-button--loading': props.loading, 'text-button--active': props.active }"
        @click="emit('click', $event)"
    >
        <span v-if="props.loading" class="text-button__spinner" />
        <slot>{{ props.label }}</slot>
    </button>
</template>

<script setup lang="ts">
const emit = defineEmits<{
    (e: 'click', event: MouseEvent): void
}>()

const props = defineProps({
    label: {
        type: String,
        default: 'Text Button'
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
.text-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
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
.text-button:hover:not(:disabled) {
    color: #ffffff;
}
.text-button:active:not(:disabled) {
    color: rgba(255, 255, 255, 0.4);
}
.text-button--active {
    color: #a749fc;
}
.text-button--active:hover:not(:disabled) {
    color: #bf7afd;
}
.text-button--disabled,
.text-button--loading {
    opacity: 0.5;
    cursor: not-allowed;
}
.text-button__spinner {
    width: 12px;
    height: 12px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: #ffffff;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    flex-shrink: 0;
    margin-right: 6px;
}
@keyframes spin {
    to { transform: rotate(360deg); }
}
</style>
