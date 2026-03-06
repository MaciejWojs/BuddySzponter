<template>
    <button
        :type="props.type as 'button' | 'submit' | 'reset'"
        :disabled="props.disabled || props.loading"
        class="sort-button"
        :class="{ 'sort-button--disabled': props.disabled, 'sort-button--loading': props.loading, 'sort-button--active': props.active }"
        :style="{ width: props.width }"
    >
        <span v-if="props.loading" class="sort-button__spinner" />
        <slot>
            <SortIcon class="sort-button__icon" />
        </slot>
    </button>
</template>

<script setup lang="ts">
import SortIcon from '@renderer/assets/images/components/sort.svg?component'

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
.sort-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 10px 12px;
    background-color: #000000;
    border: 1px solid #ffffff;
    border-radius: 10px;
    cursor: pointer;
    transition: background-color 0.2s, box-shadow 0.2s, opacity 0.2s;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
}
.sort-button:hover:not(:disabled) {
    background-color: #1a1a1a;
    box-shadow: 0 2px 16px rgba(255, 255, 255, 0.1);
}
.sort-button:active:not(:disabled) {
    background-color: #000000;
    box-shadow: 0 1px 6px rgba(0, 0, 0, 0.4);
}
.sort-button--active {
    background-color: #1a1a1a;
    border-color: #a749fc;
    box-shadow: 0 0 10px rgba(167, 73, 252, 0.5);
}
.sort-button--active .sort-button__icon {
    filter: drop-shadow(0 0 3px #a749fc);
}
.sort-button--disabled,
.sort-button--loading {
    opacity: 0.5;
    cursor: not-allowed;
}
.sort-button__icon {
    width: 20px;
    height: 20px;
}
.sort-button__spinner {
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
