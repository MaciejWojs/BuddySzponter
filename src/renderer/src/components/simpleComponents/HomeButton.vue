<template>
    <button
        :type="props.type as 'button' | 'submit' | 'reset'"
        :disabled="props.disabled || props.loading"
        class="home-button"
        :class="{ 'home-button--disabled': props.disabled, 'home-button--loading': props.loading, 'home-button--active': props.active }"
        :style="{ width: props.width }"
    >
        <span v-if="props.loading" class="home-button__spinner" />
        <slot>
            <HomeIcon class="home-button__icon" />
        </slot>
    </button>
</template>

<script setup lang="ts">
import HomeIcon from '@renderer/assets/images/ui/home.svg?component'

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
.home-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 10px 12px;
    background-color: #06001f;
    border: none;
    border-radius: 10px;
    cursor: pointer;
    transition: background-color 0.2s, box-shadow 0.2s, opacity 0.2s;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.4);
}
.home-button:hover:not(:disabled) {
    background-color: #0d0035;
    box-shadow: 0 2px 18px rgba(167, 73, 252, 0.2);
}
.home-button:active:not(:disabled) {
    background-color: #04001a;
    box-shadow: 0 1px 6px rgba(0, 0, 0, 0.3);
}
.home-button--active {
    background-color: #0d0035;
    box-shadow: 0 0 12px rgba(167, 73, 252, 0.45);
}
.home-button--active .home-button__icon {
    filter: drop-shadow(0 0 4px #a749fc);
}
.home-button--disabled,
.home-button--loading {
    opacity: 0.5;
    cursor: not-allowed;
}
.home-button__icon {
    width: 20px;
    height: 20px;
}
.home-button__spinner {
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
