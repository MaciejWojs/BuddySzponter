<template>
    <button
        :type="props.type as 'button' | 'submit' | 'reset'"
        :disabled="props.disabled || props.loading"
        class="gray-button"
        :class="{ 'gray-button--disabled': props.disabled, 'gray-button--loading': props.loading }"
        :style="{ width: props.width }"
    >
        <span v-if="props.loading" class="gray-button__spinner" />
        <slot>{{ props.label }}</slot>
        <span class="gray-button__suffix">
            <slot name="suffix"></slot>
        </span>
    </button>
</template>

<script setup lang="ts">
const props = defineProps({
    label: {
        type: String,
        default: 'Dołącz do sesji'
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
.gray-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 10px 24px;
    background-color: #2a2a3a;
    color: #ffffff;
    border: none;
    border-radius: 10px;
    font-family: 'jetbrains mono', monospace;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s, box-shadow 0.2s, opacity 0.2s;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.4);
}
.gray-button:hover:not(:disabled) {
    background-color: #3a3a4e;
    box-shadow: 0 2px 18px rgba(0, 0, 0, 0.5);
}
.gray-button:active:not(:disabled) {
    background-color: #222230;
    box-shadow: 0 1px 6px rgba(0, 0, 0, 0.3);
}
.gray-button--disabled,
.gray-button--loading {
    opacity: 0.5;
    cursor: not-allowed;
}
.gray-button__suffix {
    display: flex;
    align-items: center;
    margin-left: 4px;
    font-size: 1rem;
    transition: transform 0.2s;
}
.gray-button:hover:not(:disabled) .gray-button__suffix {
    transform: translateX(3px);
}
.gray-button__spinner {
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
